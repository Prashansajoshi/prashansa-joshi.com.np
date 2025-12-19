---
title: "Velero Backup"
date: 2025-11-19T10:00:00+05:45
draft: false
tags: ["DevOps", "AWS"]
thumbnail: "thumbnail.png"   
summary: "Velero Backup on Amazon EKS with Pod Identity"
---

# Introduction

Data protection is a critical part of Kubernetes operations. In Amazon EKS, Velero is a popular open-source tool that provides backup and restore, disaster recovery, and migration capabilities for Kubernetes clusters. This blog will walk through how to set up Velero backups on Amazon EKS using Pod Identity, eliminating the need for long-lived credentials.

# Why Velero?

Velero provides:

* Backup and restore of Kubernetes objects and persistent volumes.
* Disaster recovery for your workloads.
* Migration between clusters and even across cloud providers.

In AWS, Velero integrates seamlessly with Amazon S3 for backup storage and IAM roles for secure access.

# Architecture Overview

1. **Velero Server** Pod runs in the velero namespace.
2. **Amazon S3 bucket** stores the backup data.
3. **EKS Pod Identity** assigns an IAM role to Velero’s ServiceAccount.
4. **IAM Policy** grants Velero permissions to read and write to the S3 bucket.

# Prerequisites

* An EKS cluster (1.24+ recommended).
* AWS CLI configured.
* kubectl installed and pointing to your EKS cluster.
* Helm installed.
* Terraform installed (for infrastructure setup).

## Step 1: Create an S3 Backup Bucket

We’ll use Terraform to create the bucket and configure versioning:

```
module "backup_eks" {
  source = "../modules/terraform-aws-s3-module"
  bucket        = "test-ue1-agf-d-s3-backup-bucket"
  force_destroy = true
  versioning = {
    enabled = true
  }
  server_side_encryption_configuration = {
    rule = {
      apply_server_side_encryption_by_default = {
        sse_algorithm = "AES256"
      }
    }
  }
  tags = {
    Environment = "prod"
    Project     = "test"
  }
}
```

This bucket will store all Velero backups.

## Step 2: Create IAM Role and Policy for Velero

Velero needs S3 access. With Pod Identity, we bind a Kubernetes ServiceAccount to an IAM role.

```
resource "aws_iam_policy" "velero_identity_policy" {
  name        = "test-ue1-agf-d-policy-velero"
  description = "IAM policy for Velero Pod to access S3"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:ListBucket",
          "s3:PutObject",
          "s3:DeleteObject",
        ]
        Resource = [
          "arn:aws:s3:::${module.backup_eks.s3_bucket_id}",
          "arn:aws:s3:::${module.backup_eks.s3_bucket_id}/*"
        ]
      }
    ]
  })
}
resource "aws_iam_role" "velero_identity_role" {
  name               = "test-ue1-agf-d-role-velero"
  assume_role_policy = data.aws_iam_policy_document.this.json
}
resource "aws_iam_role_policy_attachment" "attach_velero_policy" {
  policy_arn = aws_iam_policy.velero_identity_policy.arn
  role       = aws_iam_role.velero_identity_role.name
}
```

The assume role policy should allow Pod Identity service to assume the role:


```
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "pods.eks.amazonaws.com"
      },
      "Action": ["sts:TagSession", "sts:AssumeRole"]
    }
  ]
}
```

## Step 3: Deploy Velero via Helm

We’ll use the official Helm chart:

```
helm repo add vmware-tanzu https://vmware-tanzu.github.io/helm-charts
helm repo update
```

Then deploy with:

```
helm upgrade --install test-velero vmware-tanzu/velero \
  --version 10.1.2 \
  -f values.yaml \
  --namespace velero --create-namespace
```

## Step 4: Velero Helm Values (values.yaml)

Here’s our production-ready configuration:

```
fullnameOverride: test-prod-velero
image:
  repository: velero/velero
  tag: v1.15.2
  pullPolicy: IfNotPresent

# Health checks
livenessProbe:
  httpGet:
    path: /metrics
    port: http-monitoring
    scheme: HTTP
  initialDelaySeconds: 10
  periodSeconds: 30
  timeoutSeconds: 5
  successThreshold: 1
  failureThreshold: 5
readinessProbe:
  httpGet:
    path: /metrics
    port: http-monitoring
    scheme: HTTP
  initialDelaySeconds: 10
  periodSeconds: 30
  timeoutSeconds: 5
  successThreshold: 1
  failureThreshold: 5

# AWS plugin
initContainers:
  - name: velero-plugin-for-aws
    image: velero/velero-plugin-for-aws:v1.10.0
    imagePullPolicy: IfNotPresent
    volumeMounts:
      - mountPath: /target
        name: plugins

# Backup storage location
configuration:
  backupStorageLocation:
  - name: test-prod-velero-backup-storage
    provider: aws
    bucket: test-ue1-agf-d-s3-backup-bucket
    accessMode: ReadWrite
    config:
     region: us-east-1
  volumeSnapshotLocation: []

# Service account (bound via Pod Identity)
serviceAccount:
  server:
    create: true
    name: test-prod-velero-serviceaccount

# No static creds
credentials:
  useSecret: false

# Scheduled backups
schedules:
  mybackup:
    disabled: false
    labels:
      owner: prashansa.joshi
      application: velero
      environment: prod
      project: test
    schedule: "0 0 * * *"   # Daily at midnight
    useOwnerReferencesInBackup: false
    paused: false
    skipImmediately: false
    template:
      ttl: "168h"            # Keep backups for 7 days
      storageLocation: test-prod-velero-backup-storage
      includedNamespaces:
      - prod
```
 

* BackupStorageLocation → Defines where backups are stored (AWS S3 in our case).
* VolumeSnapshotLocation → Defines where persistent volume snapshots are stored.
* ServiceAccount → Provides Velero the right permissions via Pod Identity.
* Schedules → Automates recurring backups with retention policies.

## Key Highlights (Step 4)

* Pod Identity is used (credentials.useSecret=false + ServiceAccount binding).
* S3 bucket stores all backups.
* Daily backup schedule (0 0 * * *).
* Retention policy (ttl: 168h = 7 days).
* Namespace filtering (only prod namespace).

## Step 5: Verify Backup

* Check that Velero is running:


`kubectl get pods -n velero`

* Trigger a manual backup:

`velero backup create test-manual-backup --include-namespaces test`

* Check backup status:

`velero backup get`

* Verify in S3:

`aws s3 ls s3://test-ue1-agf-d-s3-backup-bucket/backups/`

## Step 6: Restore from Backup

* To restore from a backup:

`velero restore create --from-backup test-manual-backup`

* Monitor restore status:

`velero restore get`

## Best Practices

* Secure the S3 Bucket: Enable bucket encryption and restrict public access.
* Least Privilege: Limit the IAM policy to only necessary permissions.
* Monitor Backups: Use Velero’s Prometheus metrics (/metrics) for monitoring.
* Test Restores: Periodically test restores to ensure backups are valid.
* Version Control: Store values.yaml and Terraform files in a Git repository.

## Troubleshooting

* Pod Identity Issues: Verify the Pod Identity association using aws eks describe-pod-identity-association.
* S3 Access Errors: Check IAM role permissions and bucket policies.
* Backup Failures: Use velero backup describe <backup-name> for detailed logs.

# Conclusion

With Velero and EKS Pod Identity, you can securely back up your Kubernetes cluster without managing AWS credentials manually. This setup provides:

* Automated backups.
* Secure IAM integration via Pod Identity.
* Disaster recovery capabilities for your workloads.

Velero makes backup and restore operations simple, portable, and secure in Kubernetes environments.