const BASE_URL = "http://localhost:5001";

/**
 * Request a short alias for a long URL.
 * Throws an error with `isRateLimited` and `retryAfter` set if the
 * client has exceeded the rate limit, so callers can handle it separately.
 */
export async function shortenUrl(longUrl) {
  const response = await fetch(`${BASE_URL}/api/shorten`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: longUrl }),
  });

  const data = await response.json();

  if (response.status === 429) {
    const err = new Error("Rate limited"); // special error shape so the caller can distinguish this from other failures
    err.isRateLimited = true;
    err.retryAfter = data.retry_after_seconds;
    throw err;
  }

  if (!response.ok) {
    throw new Error(data.error || "Failed to shorten URL");
  }

  return data;
}

/** Fetch all shortened URLs with their click totals. */
export async function fetchUrls() {
  const response = await fetch(`${BASE_URL}/api/urls`);
  if (!response.ok) throw new Error("Failed to fetch URLs");
  return response.json();
}

/** Fetch the last 7 days of click data for a given alias. */
export async function fetchAnalytics(alias) {
  const response = await fetch(`${BASE_URL}/api/analytics/${alias}`);
  if (!response.ok) throw new Error("Failed to fetch analytics");
  return response.json();
}