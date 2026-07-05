import { useState, useEffect, useCallback } from "react";
import { Line } from "react-chartjs-2";
import { fetchAnalytics } from "../api/api";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const BRAND = "#E8843A";
const BRAND_FILL = "rgba(232, 132, 58, 0.15)";

/**
 * Line chart showing click history for a given short URL alias.
 * Fetches its own data on mount and whenever `alias` changes.
 */
export default function AnalyticsChart({ alias }) {
  const [series, setSeries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadAnalytics = useCallback(async () => {
    if (!alias) return;
    setLoading(true);
    setError("");
    try {
      const data = await fetchAnalytics(alias);
      setSeries(data.series ?? []);
    } catch (err) {
      setError(err?.message || "Failed to load analytics.");
    } finally {
      setLoading(false);
    }
  }, [alias]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]); // re-fetch whenever alias changes, since loadAnalytics is recreated

  if (!alias) {
    return (
      <div className="card">
        <h2>Analytics</h2>
        <p>Select a URL from the list to see its click history.</p>
      </div>
    );
  }

  const chartData = {
    labels: series.map((point) => point.date),
    datasets: [
      {
        label: `Clicks for /${alias}`,
        data: series.map((point) => point.clicks),
        borderColor: BRAND,
        backgroundColor: BRAND_FILL,
        pointBackgroundColor: BRAND,
        pointBorderColor: "#fff",
        borderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        tension: 0.3,
        fill: true,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false, // hides the clickable legend/toggle box
      },
      title: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: "Clicks",
          color: "#7A6E65",
          font: { weight: 600 },
        },
        ticks: {
          stepSize: 1,
          color: "#7A6E65",
        },
        grid: {
          color: "#EDE8DF",
        },
      },
      x: {
        ticks: {
          color: "#7A6E65",
          maxRotation: 45,
          minRotation: 45,
        },
        grid: {
          color: "#F7F5EF",
        },
      },
    },
  };

  return (
    <div className="card">
      <div className="list-header">
        <h2>Clicks — Last 7 Days (/{alias})</h2>
        <button onClick={loadAnalytics} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {error && <p className="error">{error}</p>}
      {!error && (
        <div style={{ height: "350px" }}>
          <Line data={chartData} options={chartOptions} />
        </div>
      )}
    </div>
  );
}