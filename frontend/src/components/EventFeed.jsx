import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, Clock } from 'lucide-react';
import { CATEGORY_COLORS } from '../services/api';

const formatTime = (dateStr) => {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  } catch {
    return '';
  }
};

export default function EventFeed({ events, onEventClick, onCountryClick }) {
  const recentEvents = events.slice(0, 8);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed bottom-20 left-6 z-30 w-[340px] max-h-[320px] glass-panel rounded-xl overflow-hidden"
      data-testid="event-feed"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--border-default)] flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-[0.2em] font-mono text-[var(--text-secondary)]">
          Live Intel Feed
        </span>
        <span className="text-[10px] font-mono text-[var(--text-muted)]">
          {events.length} events
        </span>
      </div>

      {/* Event List */}
      <div className="overflow-y-auto max-h-[268px] scrollbar-thin">
        {recentEvents.length === 0 ? (
          <div className="p-4 text-center text-sm text-[var(--text-muted)]">
            No events found
          </div>
        ) : (
          recentEvents.map((event, idx) => {
            const color = CATEGORY_COLORS[event.category] || '#3B82F6';
            return (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                onClick={() => onEventClick(event)}
                className="px-4 py-3 border-b border-[var(--border-default)] cursor-pointer hover:bg-[var(--bg-elevated)] transition-all group"
                data-testid={`feed-event-${idx}`}
              >
                <div className="flex items-start gap-3">
                  {/* Category dot */}
                  <div className="mt-1.5 flex-shrink-0">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}60` }}
                    />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-snug line-clamp-2 group-hover:text-white transition-colors">
                      {event.title}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span
                        className="flex items-center gap-1 text-[10px] text-[var(--text-muted)] hover:text-[var(--cat-political)] cursor-pointer transition-colors"
                        onClick={(e) => { e.stopPropagation(); onCountryClick?.(event.country); }}
                      >
                        <MapPin className="w-3 h-3" />
                        {event.country}
                      </span>
                      <span className="flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
                        <Clock className="w-3 h-3" />
                        {formatTime(event.published_at)}
                      </span>
                    </div>
                  </div>

                  {/* Severity badge */}
                  <div className="flex-shrink-0">
                    <span
                      className="text-[10px] font-mono px-1.5 py-0.5 rounded-sm"
                      style={{
                        backgroundColor: `${color}15`,
                        color: color,
                        border: `1px solid ${color}30`
                      }}
                    >
                      {event.severity}
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </motion.div>
  );
}
