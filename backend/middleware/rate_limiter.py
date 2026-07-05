import time
from functools import wraps
from flask import request, jsonify

WINDOW_SECONDS = 60
MAX_REQUESTS = 5

rate_limit_store = {}


def _prune_expired(now):
    """Drop entries whose window has expired so the store doesn't grow forever.

    Runs on every call, but only ever touches IPs seen in the last
    WINDOW_SECONDS, so the cost stays proportional to recent traffic
    rather than to total requests served since startup.
    """
    stale_ips = [
        ip for ip, client in rate_limit_store.items()
        if now - client["window_start"] >= WINDOW_SECONDS
    ]
    for ip in stale_ips:
        del rate_limit_store[ip]


def rate_limit(func):
    """Limit requests per client IP within a time window.

    Returns 429 with a Retry-After header if the client exceeds
    MAX_REQUESTS within WINDOW_SECONDS.
    """

    @wraps(func)
    def wrapper(*args, **kwargs):
        ip = request.headers.get("X-Forwarded-For", request.remote_addr)

        if "," in ip:
            ip = ip.split(",")[0].strip()  # X-Forwarded-For can be a chain; take the original client

        now = time.time()

        _prune_expired(now)

        client = rate_limit_store.get(ip)

        if client is None or (now - client["window_start"]) >= WINDOW_SECONDS:
            # New client, or their window has expired — start a fresh window
            rate_limit_store[ip] = {
                "count": 1,
                "window_start": now
            }
            return func(*args, **kwargs)

        if client["count"] < MAX_REQUESTS:
            client["count"] += 1
            return func(*args, **kwargs)

        # Client is over the limit — tell them how long until the window resets
        retry_after = max(
            0,
            int(WINDOW_SECONDS - (now - client["window_start"]))
        )
        response = jsonify({
            "error": "Too Many Requests",
            "retry_after_seconds": retry_after
        })
        response.headers["Retry-After"] = str(retry_after)
        return response, 429

    return wrapper