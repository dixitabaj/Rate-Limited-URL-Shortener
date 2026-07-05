import { useState, useEffect, useMemo } from "react";
import { fetchUrls } from "../api/api";

const BASE_URL = "http://localhost:5001";

const SORT_OPTIONS = [
  { value: "created_at_desc", label: "Newest first" },
  { value: "created_at_asc", label: "Oldest first" },
  { value: "total_clicks_desc", label: "Most clicks" },
  { value: "total_clicks_asc", label: "Fewest clicks" },
];

/**
 * Table of all shortened URLs with click counts.
 * Refreshes on mount, when `refreshSignal` changes, and every 5s in the background.
 */
export default function UrlList({ onSelect, selectedAlias, refreshSignal }) {
  const [urls, setUrls] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sortBy, setSortBy] = useState("created_at_desc");

  async function loadUrls() {
    setLoading(true);
    setError("");
    try {
      const data = await fetchUrls();
      setUrls(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Parent bumps refreshSignal after a new URL is shortened, to force a reload here
  useEffect(() => {
    loadUrls();
  }, [refreshSignal]);

  // Also refresh on mount, and every 5 seconds thereafter
  useEffect(() => {
    const intervalId = setInterval(() => {
      loadUrls();
    }, 5000);
    return () => clearInterval(intervalId);
  }, []);

  // Sort a copy of the fetched URLs based on the selected dropdown option
  const sortedUrls = useMemo(() => {
  const [field, dir] = [
    sortBy.replace(/_asc$|_desc$/, ""),
    sortBy.endsWith("_asc") ? "asc" : "desc",
  ];

  const copy = [...urls];
  copy.sort((a, b) => {
    const cmp =
      field === "total_clicks"
        ? (a.total_clicks ?? 0) - (b.total_clicks ?? 0)
        : new Date(a.created_at) - new Date(b.created_at);
    return dir === "asc" ? cmp : -cmp;
  });
  return copy;
}, [urls, sortBy]);

  return (
    <div className="url-card">
      <div className="list-header">
        <h2>Top Shortened Links</h2>
        <select
          className="sort-select"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              Sort by: {opt.label}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="error">{error}</p>}

      {urls.length === 0 && !loading && <p>No URLs shortened yet.</p>}

      {urls.length > 0 && (
        <div className="url-table-wrap">
          <table className="url-table">
            <colgroup>
              <col className="col-short-link" />
              <col className="col-destination" />
              <col className="col-clicks" />
              <col className="col-actions" />
            </colgroup>
            <thead>
              <tr>
                <th>Short Link</th>
                <th>Destination</th>
                <th className="col-clicks">Clicks</th>
                <th className="col-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedUrls.map((u) => (
                <tr
                  key={u.alias}
                  className={u.alias === selectedAlias ? "selected" : ""}
                  onClick={() => onSelect(u.alias)}
                >
                  <td className="col-short-link">
                    <span className="short-link">/{u.alias}</span>
                  </td>
                  <td className="destination">{u.long_url}</td>
                  <td className="col-clicks">
                    {(u.total_clicks ?? 0).toLocaleString()}
                  </td>
                  <td className="col-actions">
                    <button
                      className="visit-link-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(`${BASE_URL}/${u.alias}`, "_blank");
                      }}
                    >
                      Visit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}