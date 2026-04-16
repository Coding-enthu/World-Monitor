import React from 'react';
import { motion } from 'framer-motion';
import { Globe, Activity } from 'lucide-react';

export default function GlobalCounters({ stats, isConnected }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 md:gap-4 glass-panel rounded-xl px-3 md:px-5 py-2 max-w-[90vw] overflow-x-auto scrollbar-hide"
      data-testid="global-counters"
    >
      {/* Logo/Brand */}
      <div className="flex items-center gap-1.5 pr-3 md:pr-4 border-r border-[var(--border-default)]">
        <Globe className="w-3.5 h-3.5 text-[var(--cat-political)]" />
        <span className="text-xs font-bold tracking-tight hidden md:block" style={{ fontFamily: 'Chivo, sans-serif' }}>
          Global Tracker
        </span>
        <span className="text-[9px] font-mono px-1 py-0.5 rounded-sm bg-[var(--cat-political)] text-white hidden md:block">
          AI
        </span>
      </div>

      {/* Counters */}
      <div className="flex items-center gap-1.5">
        <span className="text-[9px] uppercase tracking-widest text-[var(--text-secondary)] font-mono hidden sm:block">Events</span>
        <span className="text-lg md:text-xl font-mono font-bold tracking-tighter" data-testid="total-events-count">
          {stats.total_events.toLocaleString()}
        </span>
      </div>

      <div className="w-px h-5 bg-[var(--border-default)]"></div>

      <div className="flex items-center gap-1.5">
        <span className="text-[9px] uppercase tracking-widest text-[var(--text-secondary)] font-mono hidden sm:block">Countries</span>
        <span className="text-lg md:text-xl font-mono font-bold tracking-tighter" data-testid="active-countries-count">
          {stats.active_countries}
        </span>
      </div>

      <div className="w-px h-5 bg-[var(--border-default)]"></div>

      <div className="flex items-center gap-1.5">
        <Activity className="w-2.5 h-2.5 text-[var(--cat-disaster)] animate-pulse-glow" />
        <span className="text-[9px] uppercase tracking-widest text-[var(--text-secondary)] font-mono hidden sm:block">24h</span>
        <span className="text-lg md:text-xl font-mono font-bold tracking-tighter text-[var(--cat-disaster)]" data-testid="recent-events-count">
          {stats.recent_count}
        </span>
      </div>
    </motion.div>
  );
}
