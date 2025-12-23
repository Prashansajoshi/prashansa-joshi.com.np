---
title: "CUDOS Dashboard"
date: 2025-11-09T10:00:00+05:45
draft: false
tags: ["DevOps", "AWS"]
thumbnail: "images/thumbnail.png"   
summary: "CUDOS Dashboard (Implementation and walkthrough)"
---

In today's cloud landscape, managing AWS costs is key to efficiency and cutting waste. The CUDOS Dashboard (Cost and Usage Dashboard Operations Solution) is an open-source tool in AWS Cloud Intelligence Dashboards. It uses AWS Cost and Usage Reports (CUR) to offer detailed insights, recommendations, and visuals to optimize costs. This blog guides you through deploying CUDOS, its architecture, core services, and customizing it with user-defined tags, based on practical use and official AWS resources.

## Introduction to CUDOS
CUDOS transforms raw CUR data into actionable intelligence using services like AWS Glue for data integration, Athena for querying, and QuickSight for visualizations. It offers high-level overviews alongside deep dives into usage patterns, supporting multi-account setups in AWS Organizations. Key benefits include ML-driven recommendations for rightsizing, reservations, and AWS Marketplace spend analysis.

The CUR provides comprehensive metadata on services, pricing, Reserved Instances, and Savings Plans, making it the foundation for CUDOS. AWS Glue prepares this data, Athena analyzes it, and QuickSight delivers interactive dashboards.

## Prerequisites
Before diving in, ensure you have:

* Permissions: Admin access in your Management/Payer Account for CloudFormation, CUR, Athena, Glue, IAM, Lambda, QuickSight, and S3.   All roles and policies are managed via templates.
* AWS Setup: Enable CUR with Athena integration. For multi-payer environments, prepare a Data Collection Account.
* Tools: Terraform for deployment (optional but recommended for automation), or use CloudFormation directly.
* Time Considerations: CUR reports take up to 24 hours to generate; dashboard data appears shortly after.

No costs beyond standard AWS usage apply. QuickSight's SPICE engine efficiently handles queries.

## Architecture Overview
* CUDOS architecture centers on CUR data flowing through a serverless pipeline:
* CUR reports are delivered to an S3 bucket.
* Glue crawlers index the data, creating tables in the Glue Data Catalog.
* Athena runs predefined queries to generate views.
* QuickSight datasets pull from these views for dashboard

![CUDOS Architecture](images/1.png)

fig: Architecture of the CUDOS dashboard implementation
For multi-account scenarios, replicate CUR data from the Payer Account to the Data Collection Account using S3 replication rules.

## Deployment Workflow
Deployment is streamlined via Terraform wrappers around CloudFormation, ensuring reproducibility.

__Step 1: Set Up CUR in the Payer Account__

Create an S3 bucket and CUR report:

```
 module "cur_payer" {
  source = "../../modules/cur-source"
}
```

This provisions the bucket with necessary permissions for multi-payer support.

**Step 2: Deploy CUDOS in the Data Collection Account**

Use the CID module:

```
module "cid_dashboard" {
  source          = "../../modules/cudos-dashboard"
  stack_name      = "CUDOS-STACK"
  template_bucket = "your-template-bucket" #Must exist
  stack_parameters = {
    "PrerequisitesQuickSight"            = "yes"
    "PrerequisitesQuickSightPermissions" = "yes"
    "QuickSightUser"                     = "your-quicksight-user"
    "DeployCUDOSv5"                      = "yes"
    "DeployCostIntelligenceDashboard"    = "no"
    "DeployKPIDashboard"                 = "no"
    "CURBucketPath"                      = "s3://your-cur-bucket/path"
  }
}
```

This deploys Glue crawlers, Athena views, Lambda functions, and QuickSight dashboards. Wait 24 hours for initial data population. Schedules for crawlers and datasets ensure regular updates.

Post-deployment, access QuickSight, select the "CUDOS Dashboard v5," and explore visualizations. Avoid paginated reports to control costs.

### Validate Deployment

```
# Check outputs
terraform output
# In QuickSight
- Search: "CUDOS Dashboard v5"
- Open → Verify data in visuals
# In Athena
SELECT bill_payer_account_id, line_item_usage_account_id, sum(line_item_unblended_cost) as cost
FROM summary_view
GROUP BY 1, 2
LIMIT 10;
```
![CUDOS Dashboard](images/2.png)

fig: CUDOS Dashboard (Executive Summary View)

## Services Under the Hood
CUDOS orchestrates several AWS services seamlessly. Here's a walkthrough:

### AWS QuickSight

* Dashboards: Access "CUDOS Dashboard v5" for visuals.
* Datasets: Sourced from Athena views; scheduled refreshes ensure freshness. Manually refresh if needed.
* Data Sources: Connected to Athena workgroup "CID."


![CUDOS Dashboard](images/3.png)

fig: CUDOS Dashboard v5

### AWS Athena

* Workgroup: "CID" with tables and views (e.g., summary_view). Avoid deleting views.
* Queries: Run SQL to explore CUR data.

![AWS Athena](images/4.png)

fig: Athena Overview

![AWS Athena](images/5.png)


### AWS Glue

* Databases: Contains CUR tables.
* Crawlers: Scheduled to index S3 data; view IAM roles and run history.
* Tables: Check schemas for partitioned data.

![AWS Glue](images/6.png)

![AWS Glue](images/7.png)

a. Database: In the left panel, click Database. You will see the database name; if you followed the steps, it will be your database. Otherwise, you will see your input. Click it to check for tables.

![AWS Glue](images/8.png)

fig: Select the Glue Database

![AWS Glue](images/9.png)

fig: Glue Database Overview

c. Crawlers: Navigate to left panel and click on Crawlers.

![AWS Glue](images/10.png)

fig: AWS Glue Crawler

To view the details of the crawler, click on the crawler.

![AWS Glue](images/11.png)

fig: Glue Crawler Overview

Here you can see the IAM roles it is using and other details like crawler run, schedule and many more.

### AWS Lambda
* Functions: Handle automation, like dashboard creation via cid-cmd.

fig: Search Lambda
a. Function: Navigate to left panel and click on function and you will see the list of the functions.

![AWS Lambda](images/12.png)

fig: Select the function

 For more detailed view click on the function and you will see the details of it.

![AWS Lambda](images/13.png)

fig: Lambda Function Overview

### AWS S3
* Buckets: Store CUR files (e.g., cid-account-number-local). Directories include manifests, partitions, and status files.

![AWS S3](images/14.png)

fig: Search S3 Bucket

a. Bucket: Navigate to the left panel and click on buckets and search your local

_Note: If you followed along you will see your bucket name as cid-account-number-local  and aws-athena-query-results-cid-account-id-region_

![AWS S3](images/15.png)

fig: S3 Bucket

b. bucket directories: Click on object and click the directory to get to the

![AWS S3](images/16.png)

fig: S3 Bucket Directories Overview

### AWS CloudFormation
* Stacks: Manage resources; view events for deployment history. Update via Terraform to avoid conflicts.

![AWS CloudFormation](images/17.png)

fig: Search Cloudformation

![AWS CloudFormation](images/18.png)

fig: CloudFormation Stack Overview

![AWS CloudFormation](images/18.png)

fig: CloudFormation Stack Overview

![AWS CloudFormation](images/19.png)

fig: CloudFormation Events

![AWS CloudFormation](images/20.png)


### AWS Billing and Cost Management
* Data Exports: Configure CUR reports; view details for delivery settings.

![AWS Billing](images/21.png)

fig: Go to Billing and Cost Management feature

a. Data export: In the left panel, click Data Export and select the report. If you deployed via Terraform with default values, the report name remains the same; otherwise, select your custom name.

![AWS Billing](images/22.png)

fig: CUR Report

b. Click on the report name to see the details of the report.

![AWS Billing](images/23.png)

fig: CUR Report Details
These services integrate to provide end-to-end data flow without manual intervention.

## Adding User-Defined Tags
Customize CUDOS by incorporating tags for grouping (e.g., by application or business unit) using cost allocation tags or categories.

### Prerequisites
* Access to AWS Organizations.
* Enable tags in Cost Explorer.
* Activate AWS/user-generated tags.

Changes reflect in CUR after 24 hours.

#### Step-by-Step Guide
__Add Cost Categories__

In Billing and Cost Management:

1. Navigate to Cost Categories > Create.
2. Define rules (e.g., by account or tag values).
3. Set lookback periods if needed.
4. Review and create.

__Modify Queries in Athena__

1. Select AwsDataCatalog and your database.
2. Edit views (e.g., summary_view): Add tag columns (e.g., lineitem_resourcetags_user_silo AS silo).
3. Update GROUP BY clauses.

```
-- Add new column
line_item_resource_tags_user_team AS team,
-- Update GROUP BY
GROUP BY 1,2,3,..., team
```

4. Run and verify.

Repeat for hourly_view and resource_view.

__Modify Datasets in QuickSight__
1. Edit dataset (e.g., summary_view).
2. Confirm new fields.
3. Save & Publish; monitor refresh.

__Modify QuickSight Analysis__
1. Save dashboard as analysis.
2. Add fields to visuals (drag to Group By).
3. Create parameters and controls for filtering.
4. Add filters linking to parameters.
5. Publish updates.

This enables tag-based filtering, enhancing chargeback and optimization.

## Exploring the CUDOS Dashboard
Once deployed, dive into CUDOS Dashboard v5 in QuickSight. Organized into interactive sheets, it provides granular, recommendation-driven analysis of CUR data. Use global filters (top-right) for time ranges, accounts, regions, or tags. Here's a hands-on tour of key sheets and features:

* Start with Executive Billing Summary to instantly view your total AWS spend, top services, and budget versus actual in one clear dashboard. Click any number to drill down into accounts or regions.

![CUDOS Dashboard](images/24.png)

fig: Billing Summary

* Go to compute to filter by instance type, compare CPU idle against cost, and access one-click rightsizing or Spot/Graviton recommendations.

![CUDOS Dashboard](images/25.png)

fig: Compute Summary

* Move to storage to identify old backups or unused EBS volumes and apply lifecycle policies to save immediately.

![CUDOS Dashboard](images/26.png)

fig: Storage Summary
 

* Cost Monitoring on the based of regions

![CUDOS Dashboard](images/27.png)

fig: Cost by Regions
 

* Monitoring based on the account

![CUDOS Dashboard](images/28.png)

fig: Cost occurred by account
 

* Cost according to resource tags

![CUDOS Dashboard](images/29.png)

fig: Select TAGsplorer

![CUDOS Dashboard](images/30.png)

fig: Primary Tags

## Best Practices and Troubleshooting
* Tagging: Consistently tag resources for accurate breakdowns.
* Monitoring: Schedule reviews; integrate with SSO for security.
* Upgrades: Keep to v5+ for features like DynamoDB simulations.
* Common Issues: If tags don't appear, verify Athena views and QuickSight refreshes. CUR delays are normal.

Organizations using CUDOS often achieve 15-25% cost savings through insights.

## Conclusion
Implementing CUDOS provides a robust tool for AWS cost management. From deployment with Terraform to custom tagging, this guide covers the essentials to start. Beyond visibility, CUDOS converts raw CUR data into actionable intelligence, offering ML-powered savings recommendations, resource-level insights, and accurate forecasting.