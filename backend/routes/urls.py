from datetime import datetime

from flask import Blueprint, request, jsonify, redirect

from database.database import get_db
from middleware.rate_limiter import rate_limit
from utils.utils import generate_alias, is_valid_url

api = Blueprint("urls_api", __name__)


@api.route("/api/shorten", methods=["POST"])
@rate_limit
def shorten_url():
    """Create a short alias for a given long URL.

    Expects JSON body: {"url": "<long_url>"}.
    If the URL was already shortened before, returns the existing alias
    instead of creating a duplicate — this keeps click counts consolidated
    under one alias per destination URL rather than split across several.
    """
    data = request.get_json(silent=True) or {}
    long_url = data.get("url", "").strip()

    # Reject empty submissions before touching the database
    if not long_url:
        return jsonify({"error": "Missing 'url' field"}), 400

    # Reject anything that isn't a well-formed http(s) URL, is too long,
    # or points back at this same shortener (which would create a redirect loop)
    if not is_valid_url(long_url, request_host=request.host):
        return jsonify({
            "error": "Invalid URL. Must be http:// or https://, under 2048 characters, "
                     "and not point back to this shortener."
        }), 400

    conn = get_db()

    # Dedup check: reuse an existing alias if this exact URL was already shortened,
    # so clicks for the same destination stay consolidated under one alias
    existing = conn.execute(
        "SELECT alias FROM urls WHERE long_url = ?", (long_url,)
    ).fetchone()

    if existing:
        alias = existing["alias"]
    else:
        # New URL — generate a fresh alias
        alias = generate_alias(long_url)

        # Retry on the rare chance the generated alias collides with a
        # different existing URL's alias (up to 5 attempts)
        for _ in range(5):
            clash = conn.execute(
                "SELECT 1 FROM urls WHERE alias = ?", (alias,)
            ).fetchone()
            if not clash:
                break
            alias = generate_alias(long_url)

        # created_at is filled in automatically by the column's DEFAULT
        conn.execute(
            "INSERT INTO urls (alias, long_url) VALUES (?, ?)", (alias, long_url)
        )
        conn.commit()

    conn.close()

    return jsonify({
        "alias": alias,
        "short_url": request.host_url + alias,
        "long_url": long_url
    }), 201


@api.route("/<alias>", methods=["GET"])
def redirect_to_original(alias):
    """Redirect a short alias to its original long URL, logging a click."""
    conn = get_db()

    # Look up the destination URL for this alias
    row = conn.execute("SELECT long_url FROM urls WHERE alias = ?", (alias,)).fetchone()

    if row is None:
        conn.close()
        return jsonify({"error": "Short URL not found"}), 404

    # Record this visit with a timestamp, used later for the 7-day analytics chart
    conn.execute("INSERT INTO clicks (alias, clicked_at) VALUES (?, ?)",
                 (alias, datetime.utcnow().isoformat()))
    conn.commit()
    conn.close()

    return redirect(row["long_url"])


@api.route("/api/urls", methods=["GET"])
def list_urls():
    """List all shortened URLs with their total click counts, newest first."""
    conn = get_db()

    # LEFT JOIN so URLs with zero clicks still show up (COUNT(c.id) = 0 for them),
    # instead of being excluded like an INNER JOIN would
    rows = conn.execute("""
        SELECT u.alias, u.long_url, u.created_at,
               COUNT(c.id) AS total_clicks
        FROM urls u
        LEFT JOIN clicks c ON u.alias = c.alias
        GROUP BY u.alias
        ORDER BY u.created_at DESC
    """).fetchall()
    conn.close()
    return jsonify([dict(row) for row in rows])