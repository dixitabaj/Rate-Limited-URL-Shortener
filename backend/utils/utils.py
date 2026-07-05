import hashlib
import time
from urllib.parse import urlparse

MAX_URL_LENGTH = 2048  # matches the de facto max URL length most browsers support


def generate_alias(long_url: str) -> str:
    """Generate a 6-character alias by hashing the URL + current time."""
    raw = f"{long_url}-{time.time()}".encode("utf-8")  # timestamp adds entropy so different URLs are unlikely to collide on the same 6-char prefix
    return hashlib.sha256(raw).hexdigest()[:6]


def is_valid_url(value: str, request_host: str = None) -> bool:
    """Check that a string is a well-formed http(s) URL within reasonable length,
    and (if request_host is given) isn't pointing back at this same shortener
    service, which would otherwise allow a short link to redirect to itself
    or to another short link, creating a redirect loop.
    """
    if not value or len(value) > MAX_URL_LENGTH:
        return False

    try:
        result = urlparse(value)
    except (ValueError, AttributeError):
        return False

    if result.scheme not in ("http", "https"):
        return False

    if not result.netloc or not result.netloc.strip():
        return False

    # Block self-referential URLs (e.g. shortening a link back to this same
    # service), which would otherwise let a short URL redirect to itself
    if request_host and result.netloc.lower() == request_host.lower():
        return False

    return True