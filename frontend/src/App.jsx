import { useState } from "react";
import ShortenForm from "./components/ShortenForm";
import UrlList from "./components/UrlList";
import AnalyticsChart from "./components/Analytics";
import "./App.css";

/** Top-level layout: shorten form, URL list, and analytics for the selected alias. */
export default function App() {
  const [selectedAlias, setSelectedAlias] = useState(null);
  const [refreshSignal, setRefreshSignal] = useState(0);

  // Called after a successful shorten - bumps refreshSignal so UrlList refetches.
  function handleShortened() {
    setRefreshSignal((prev) => prev + 1);
  }

  return (
    <div className="app">
      <h1>Rate-Limited URL Shortener</h1>

      <ShortenForm onShortened={handleShortened} />

      <div className="dashboard">
        <UrlList
          onSelect={setSelectedAlias}
          selectedAlias={selectedAlias}
          refreshSignal={refreshSignal}
        />
        <AnalyticsChart alias={selectedAlias} />
      </div>
    </div>
  );
}