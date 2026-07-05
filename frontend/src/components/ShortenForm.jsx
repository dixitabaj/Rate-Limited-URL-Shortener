import { useState, useEffect, useRef } from "react";
import { shortenUrl } from "../api/api";

/**
 * Form for submitting a long URL to be shortened.
 * Handles rate-limit errors by showing a countdown until the client can retry.
 */
export default function ShortenForm({ onShortened }) {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (countdown <= 0) return;

    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current); // clear on unmount or before the next countdown change re-runs this effect
  }, [countdown]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setResult(null);
    setCopied(false);

    if (!url.trim()) {
      setError("Please enter a URL.");
      return;
    }

    setLoading(true);
    try {
      const data = await shortenUrl(url.trim());
      setResult(data);
      setUrl("");
      onShortened?.();
    } catch (err) {
      if (err.isRateLimited) {
        setCountdown(Math.ceil(err.retryAfter)); // starts the countdown effect above
        setError("Rate limit exceeded.");
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!result?.short_url) return;
    try {
      await navigator.clipboard.writeText(result.short_url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy to clipboard.");
    }
  }

  const isDisabled = loading || countdown > 0; // block resubmission while rate-limited, not just while loading

  return (
    <div className="header-card">
      <h2>Shorten a URL</h2>
      <form onSubmit={handleSubmit} className="shorten-form">
        <input
          type="text"
          placeholder="https://example.com/some/long/path"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={isDisabled}
        />
        <button type="submit" disabled={isDisabled}>
          {loading ? "Shortening..." : "Shorten"}
        </button>
      </form>

      {countdown > 0 && (
        <p className="countdown">
          Too many requests. Try again in <strong>{countdown}s</strong>
        </p>
      )}

      {error && countdown === 0 && <p className="error">{error}</p>}

      {result && (
        <div className="result">
          <span className="result-label">Short URL</span>
          <div className="result-row">
            <a
              href={result.short_url}
              target="_blank"
              rel="noreferrer"
              className="result-link"
            >
              {result.short_url}
            </a>
            <button
              type="button"
              className="copy-btn"
              onClick={handleCopy}
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}