import React from 'react';
import { motion } from 'framer-motion';
import { Globe, Activity } from 'lucide-react';

export default function GlobalCounters({ stats, isConnected }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-4 md:gap-6 glass-panel rounded-xl px-4 md:px-8 py-3"
      data-testid="global-counters"
    >
      {/* Logo/Brand */}
      <div className="flex items-center gap-2 pr-4 md:pr-6 border-r border-[var(--border-default)]">
        <Globe className="w-4 h-4 text-[var(--cat-political)]" />
        <span className="text-sm font-bold tracking-tight hidden md:block" style={{ fontFamily: 'Chivo, sans-serif' }}>
          Global Tracker
        </span>
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-sm bg-[var(--cat-political)] text-white hidden md:block">
          AI
        </span>
      </div>

      {/* Counters */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] uppercase tracking-widest text-[var(--text-secondary)] font-mono hidden sm:block">Events</span>
        <span className="text-2xl md:text-3xl font-mono font-bold tracking-tighter" data-testid="total-events-count">
          {stats.total_events.toLocaleString()}
        </span>
      </div>

      <div className="w-px h-6 bg-[var(--border-default)]"></div>

      <div className="flex items-center gap-2">
        <span className="text-[10px] uppercase tracking-widest text-[var(--text-secondary)] font-mono hidden sm:block">Countries</span>
        <span className="text-2xl md:text-3xl font-mono font-bold tracking-tighter" data-testid="active-countries-count">
          {stats.active_countries}
        </span>
      </div>

      <div className="w-px h-6 bg-[var(--border-default)]"></div>

      <div className="flex items-center gap-2">
        <Activity className="w-3 h-3 text-[var(--cat-disaster)] animate-pulse-glow" />
        <span className="text-[10px] uppercase tracking-widest text-[var(--text-secondary)] font-mono hidden sm:block">24h</span>
        <span className="text-2xl md:text-3xl font-mono font-bold tracking-tighter text-[var(--cat-disaster)]" data-testid="recent-events-count">
          {stats.recent_count}
        </span>
      </div>
    </motion.div>
  );
}
