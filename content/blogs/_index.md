---
title: "Blogs"
date: 2025-11-09T09:00:00+05:45
draft: false
---

<nav style="margin-bottom:18px;">
  <a href="/" style="color:#58a6ff; text-decoration:none; margin-right:18px;">Home</a>
  <a href="/blogs/" style="color:#58a6ff; text-decoration:none;">Blogs</a>
</nav>

{{ range .Pages }}
  <article style="margin-bottom:28px;">
    <h2 style="margin:0 0 6px 0;"><a href="{{ .RelPermalink }}" style="color:#58a6ff; text-decoration:none;">{{ .Title }}</a></h2>
    <div style="color:#9fb7d6; margin-bottom:6px;">{{ .Date.Format "Jan 2, 2006" }}</div>
    <p style="color:#b0b8c2; margin:0 0 6px 0;">{{ .Summary }}</p>
    <a href="{{ .RelPermalink }}" style="color:#58a6ff; text-decoration:none;">Read</a>
  </article>
{{ end }}
