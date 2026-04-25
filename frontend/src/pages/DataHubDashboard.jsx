import React, { useEffect, useState } from "react";
import "./dashboard.css";

import MapView from "../components/MapView";
import EventFeed from "../components/EventFeed";

import {
  fetchStockQuotes,
  fetchTrendingArticles,
  fetchWeatherForecast,
  fetchWeatherRegions,
} from "../services/api";

/* ---------------- LIVE CHANNELS ---------------- */

const LIVE_CHANNELS = [
  { name: "BBC", url: "https://www.youtube.com/embed/gCNeDWCI0vo" },
  { name: "CNN", url: "https://www.youtube.com/embed/1fueZCTYkpA" },
  { name: "Al Jazeera", url: "https://www.youtube.com/embed/bNyUyrR0PHo" },
];

/* ---------------- COMPONENT ---------------- */

export default function DataHubDashboard({
  events = [],
  markers = [],
  filteredEvents = [],
  onEventClick,
  onCountryClick,
  onExit,
}) {
  /* ---------------- STATE ---------------- */

  const [articles, setArticles] = useState([]);
  const [stocks, setStocks] = useState([]);
  const [weather, setWeather] = useState(null);
  const [region, setRegion] = useState(null);

  /* ---------------- LOAD ALL DATA ---------------- */

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    try {
      // ARTICLES
      const art = await fetchTrendingArticles({ limit: 10, days: 2 });
      setArticles(art);

      // STOCKS
      const stockRes = await fetchStockQuotes();
      setStocks(stockRes.data);

      // WEATHER
      const regions = await fetchWeatherRegions();
      const r = regions[0];
      setRegion(r);

      if (r) {
        const forecast = await fetchWeatherForecast({
          latitude: r.latitude,
          longitude: r.longitude,
        });
        setWeather(forecast);
      }
    } catch (err) {
      console.error("DataHub error:", err);
    }
  };

  /* ---------------- UI ---------------- */

  return (
    <div className="db-root">
      {/* HEADER */}
      <div className="db-header glass-panel">
        <h2>🌐 DATA HUB</h2>
        <button onClick={onExit}>Exit</button>
      </div>

      {/* MAIN GRID */}
      <div className="db-grid">

        {/* LEFT COLUMN */}
        <div className="db-left">

          {/* LIVE NEWS */}
          <div className="glass-panel db-card">
            <h3>🔴 Live News</h3>

            {LIVE_CHANNELS.map((c, i) => (
              <div key={i} className="db-video-card">
                <iframe
                  src={`${c.url}?autoplay&mute=1`}
                  title={c.name}
                  className="db-video"
                />
                <p>{c.name}</p>
              </div>
            ))}
          </div>

          {/* ARTICLES */}
          <div className="glass-panel db-card">
            <h3>🔥 Trending Articles</h3>

            {articles.map((a) => (
              <a key={a.id} href={a.url} target="_blank" rel="noreferrer">
                <div className="db-item">
                  <p>{a.title}</p>
                  <small>{a.source || "Unknown"}</small>
                </div>
              </a>
            ))}
          </div>

        </div>

        {/* CENTER MAP */}
        <div className="glass-panel db-center">
          <MapView
            events={markers}
            onEventClick={onEventClick}
            onCountryClick={onCountryClick}
          />
        </div>

        {/* RIGHT COLUMN */}
        <div className="db-right">

          {/* MARKETS */}
          <div className="glass-panel db-card">
            <h3>📈 Markets</h3>

            {stocks.map((s) => (
              <div key={s.symbol} className="db-item">
                <p>{s.symbol}</p>
                <small
                  style={{
                    color:
                      s.changePct > 0
                        ? "lime"
                        : s.changePct < 0
                        ? "red"
                        : "gray",
                  }}
                >
                  {s.changePct > 0 ? "+" : ""}
                  {s.changePct?.toFixed(2)}%
                </small>
              </div>
            ))}
          </div>

          {/* WEATHER */}
          <div className="glass-panel db-card">
            <h3>🌦 Weather</h3>

            {weather?.current ? (
              <>
                <p className="db-temp">
                  {weather.current.temperature_2m}°C
                </p>
                <small>{region?.name}</small>

                <div className="db-weather-info">
                  <p>Wind: {weather.current.wind_speed_10m} km/h</p>
                  <p>
                    Rain: {weather.current.precipitation_probability}%
                  </p>
                </div>
              </>
            ) : (
              <p>Loading...</p>
            )}
          </div>

        </div>
      </div>

      {/* BOTTOM FEED */}
      <div className="db-bottom glass-panel">
        <EventFeed
          events={filteredEvents}
          onEventClick={onEventClick}
          onCountryClick={onCountryClick}
        />
      </div>
    </div>
  );
}