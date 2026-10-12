# Rate-Limited URL Shortener with Analytics

A full-stack web application that allows users to shorten long URLs, redirect using short aliases, and displays shorten URLSs click analytics for the last 7 day.

## Features

### Backend (Flask)

* Generate a unique 6-character alias for long URLs.
* Reuse the existing alias if a URL has already been shortened, so click counts stay consolidated under one alias per destination instead of being split across duplicates.
* Redirect short URLs to their original destination.
* Track every redirect by storing a timestamp for each click.
* Custom Fixed Window rate limiter (5 URL shortening requests per IP per minute), with stale entries pruned automatically to avoid unbounded memory growth.
* RESTful API with JSON responses.
* SQLite database using Python's built-in `sqlite3` module.

### Frontend (React)

* Create shortened URLs.
* Display a countdown timer when the rate limit is exceeded (HTTP 429).
* View all shortened URLs, with a "Visit" button per row that opens the real short URL (this is what actually triggers the redirect and click tracking).
* Display a line chart showing clicks over the last 7 days for a selected URL.
* Sort the URL list by newest/oldest or most/fewest clicks via a dropdown.
* Refresh analytics without reloading the page.

---

## Technologies Used

### Backend

* Python 3
* Flask
* Flask-CORS
* Gunicorn (production WSGI server, used in the Docker image)
* SQLite (`sqlite3`)

### Frontend

* React
* Chart.js (via `react-chartjs-2`)

---

## Project Structure

```text
backend/
├── app.py
├── requirements.txt
├── Dockerfile
├── middleware/
│   └── rate_limiter.py
├── database/
│   └── database.py
├── utils/
│   └── utils.py
└── routes/
    ├── urls.py
    └── analytics.py

frontend/
├── Dockerfile
├── package.json
└── src/
    ├── App.jsx
    ├── api/
    │   └── api.js
    └── components/
        ├── ShortenForm.jsx
        ├── UrlList.jsx
        └── Analytics.jsx

docker-compose.yml
.github/
└── workflows/
    └── docker-build-check.yml
```

---

## Running the App

### Option A — Docker (recommended)

From the repo root:

```bash
docker compose up --build
```

This builds and starts both services together:

* Backend → `http://localhost:5001`
* Frontend → `http://localhost:5173` (check `docker-compose.yml` for the exact host port mapped to the frontend container)

Note: the SQLite database lives inside the backend container's filesystem and resets on rebuild unless a volume is mounted for it (see the commented note in `docker-compose.yml`).

### Option B — Running locally without Docker

**Backend**

```bash
cd backend
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

Runs on `http://localhost:5001`. The SQLite database file (`shortener.db`) is created automatically on first run.

**Frontend**

```bash
cd frontend
npm install
npm run dev
```

Runs on whatever port your dev server reports (typically `http://localhost:5173` or `http://localhost:5174`) and talks to the backend at `http://localhost:5001`.

---

## Rate Limiter

The application implements a custom **Fixed Window Rate Limiter** as a Flask decorator, without using third-party rate-limiting libraries.

* Each client IP can shorten **up to 5 URLs within a 60-second window**.
* When the limit is exceeded, the server returns `HTTP 429 Too Many Requests` with a `Retry-After` header and the following JSON body:

```json
{
  "error": "Too Many Requests",
  "retry_after_seconds": 24
}
```

The frontend uses `retry_after_seconds` to display a countdown timer before allowing another request.

**Memory management:** stale IP entries (whose window has already expired) are pruned automatically at the start of each request, so the store's size stays proportional to recent traffic rather than growing unbounded over the app's lifetime.

**Known limitation (by design, given assessment scope):** the rate-limit store is in-memory i.e. not shared across multiple worker processes or app instances and it resets on restart. A production version would back this with SQLite or Redis so state persists and is shared across processes.

---

## Alias Generation & Deduplication

Aliases are the first 6 hex characters of a SHA-256 hash of the long URL plus a timestamp, which adds enough entropy that different URLs are unlikely to collide on the same 6-char prefix.

Before generating a new alias, `/api/shorten` checks whether the submitted URL has already been shortened. If so, the existing alias is returned instead of creating a duplicate. If the URL is new, an alias is generated and, in the rare case of a collision with an existing alias, regenerated (up to 5 attempts) before being inserted.

---
 
## URL Validation
 
Submitted URLs are checked for:
 
* **Presence** — the `url` field must not be empty.
* **Shape** — must be a well-formed `http://` or `https://` URL (valid scheme + host). This checks structure only, not whether the destination actually resolves or is reachable — the same behavior as most real-world URL shorteners.
* **Length** — must be under 2048 characters, the practical limit most browsers and servers support.
* **No self-reference** — a URL pointing back at this same shortener (e.g. `http://localhost:5001/abc123`) is rejected, to prevent redirect loops.
Failing any of these returns `400 Bad Request` with a descriptive error message.
 
---

## API Endpoints

See [`API.md`](./API.md) for the full list of endpoints with example request/response bodies.
---

## Database

The application uses two SQLite tables:

### `urls`

* `alias` (primary key)
* `long_url`
* `created_at` — timestamp set automatically on insert; used to sort the URL list

### `clicks`

* `id`
* `alias`
* `clicked_at`

Each redirect creates a new record in the `clicks` table, allowing click data to be aggregated by date for analytics.

---

## CI

A GitHub Action (`.github/workflows/docker-build-check.yml`) runs `docker compose build` on every push and pull request to `main`, to verify the Docker setup stays buildable.

---

## Notes

* The rate limiter is implemented using a custom Flask decorator, not a third-party library.
* URL aliases are generated using Python's standard library (`hashlib`, `time`).
* Click analytics are generated using SQL aggregation queries.
