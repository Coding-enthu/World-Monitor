import React from 'react';
import { motion } from 'framer-motion';
import { Globe, Activity } from 'lucide-react';
import './component-css/GlobalCounters.css';

export default function GlobalCounters({ stats, isConnected }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="gc-root glass-panel"
      data-testid="global-counters"
    >
      {/* Logo / Brand */}
      <div className="gc-brand">
        <Globe style={{ width: '0.875rem', height: '0.875rem', color: 'var(--cat-political)', flexShrink: 0 }} />
        <span className="gc-brand-name">Global Tracker</span>
        <span className="gc-brand-badge">AI</span>
      </div>

      {/* Events counter */}
      <div className="gc-counter">
        <span className="gc-counter-label">Events</span>
        <span className="gc-counter-value" data-testid="total-events-count">
          {stats.total_events.toLocaleString()}
        </span>
      </div>

      <div className="gc-divider" />

      {/* Countries counter */}
      <div className="gc-counter">
        <span className="gc-counter-label">Countries</span>
        <span className="gc-counter-value" data-testid="active-countries-count">
          {stats.active_countries}
        </span>
      </div>

      <div className="gc-divider" />

      {/* 24h counter */}
      <div className="gc-counter">
        <Activity className="animate-pulse-glow" style={{ width: '0.625rem', height: '0.625rem', color: 'var(--cat-disaster)', flexShrink: 0 }} />
        <span className="gc-counter-label">24h</span>
        <span className="gc-counter-value gc-counter-value--accent" data-testid="recent-events-count">
          {stats.recent_count}
        </span>
      </div>
    </motion.div>
  );
}
