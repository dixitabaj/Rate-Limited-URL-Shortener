# API Documentation

Base URL: `http://localhost:5001`

---

## POST /api/shorten

Create a short alias for a long URL. Rate-limited to 5 requests per minute per IP. If the submitted URL has already been shortened before, the existing alias is returned instead of creating a duplicate.

**Request**
```json
{
  "url": "https://example.com/some/long/path"
}
```

**Response — 201 Created**
```json
{
  "alias": "b0a954",
  "short_url": "http://localhost:5001/b0a954",
  "long_url": "https://example.com/some/long/path"
}
```

**Response — 400 Bad Request** (missing URL)
```json
{ "error": "Missing 'url' field" }
```

**Response — 400 Bad Request** (invalid shape, too long, or self-referential)
```json
{ "error": "Invalid URL. Must be http:// or https://, under 2048 characters, and not point back to this shortener." }
```

**Response — 429 Too Many Requests**
```json
{
  "error": "Too Many Requests",
  "retry_after_seconds": 42
}
```
Header: `Retry-After: 42`

---

## GET /{alias}

Redirects to the original long URL and logs a click (with timestamp) against the alias.

**Response — 302 Found**
Redirects to the stored `long_url`.

**Response — 404 Not Found**
```json
{ "error": "Short URL not found" }
```

---

## GET /api/urls

List all shortened URLs with their total click counts, sorted newest first by creation time.

**Response — 200 OK**
```json
[
  {
    "alias": "b0a954",
    "long_url": "https://example.com/some/long/path",
    "created_at": "2026-07-04 10:15:32",
    "total_clicks": 12
  },
  {
    "alias": "2c10c2",
    "long_url": "https://www.linkedin.com/company/example/",
    "created_at": "2026-07-03 09:02:11",
    "total_clicks": 4
  }
]
```

---

## GET /api/analytics/{alias}

Return the last 7 days of click counts for a given alias, one entry per day (including zero-click days).

**Response — 200 OK**
```json
{
  "alias": "b0a954",
  "series": [
    { "date": "2026-06-28", "clicks": 0 },
    { "date": "2026-06-29", "clicks": 0 },
    { "date": "2026-06-30", "clicks": 1 },
    { "date": "2026-07-01", "clicks": 3 },
    { "date": "2026-07-02", "clicks": 0 },
    { "date": "2026-07-03", "clicks": 2 },
    { "date": "2026-07-04", "clicks": 4 }
  ]
}
```