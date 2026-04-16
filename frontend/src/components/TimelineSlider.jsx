import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, RotateCcw } from 'lucide-react';

export default function TimelineSlider({ events, onTimelineChange, activeDate }) {
  const [hoveredDate, setHoveredDate] = useState(null);

  // Get unique dates from events
  const dateRange = useMemo(() => {
    if (!events.length) return { dates: [], min: null, max: null };
    
    const dates = new Set();
    events.forEach(e => {
      try {
        const d = new Date(e.published_at);
        dates.add(d.toISOString().split('T')[0]);
      } catch {}
    });
    
    const sortedDates = Array.from(dates).sort();
    return {
      dates: sortedDates,
      min: sortedDates[0],
      max: sortedDates[sortedDates.length - 1]
    };
  }, [events]);

  const handleSliderChange = (e) => {
    const idx = parseInt(e.target.value);
    if (idx >= 0 && idx < dateRange.dates.length) {
      const date = dateRange.dates[idx];
      onTimelineChange(date);
      setHoveredDate(date);
    }
  };

  const handleReset = () => {
    onTimelineChange(null);
    setHoveredDate(null);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const currentIdx = activeDate ? dateRange.dates.indexOf(activeDate) : dateRange.dates.length - 1;

  if (dateRange.dates.length < 2) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 glass-panel rounded-xl px-6 py-4 w-[480px]"
      data-testid="timeline-slider"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Clock className="w-3 h-3 text-[var(--text-secondary)]" />
          <span className="text-[10px] uppercase tracking-[0.2em] font-mono text-[var(--text-secondary)]">
            Timeline
          </span>
        </div>
        <div className="flex items-center gap-3">
          {activeDate && (
            <button
              onClick={handleReset}
              className="flex items-center gap-1 text-[10px] font-mono text-[var(--cat-political)] hover:text-white transition-colors"
              data-testid="timeline-reset-btn"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
          )}
          <span className="text-sm font-mono font-medium text-white" data-testid="timeline-active-date">
            {formatDate(hoveredDate || activeDate || dateRange.max)}
          </span>
        </div>
      </div>
      
      {/* Slider */}
      <div className="relative">
        <input
          type="range"
          min={0}
          max={dateRange.dates.length - 1}
          value={currentIdx >= 0 ? currentIdx : dateRange.dates.length - 1}
          onChange={handleSliderChange}
          className="timeline-range w-full"
          data-testid="timeline-range-input"
        />
        <div className="flex justify-between mt-1">
          <span className="text-[10px] font-mono text-[var(--text-muted)]">{formatDate(dateRange.min)}</span>
          <span className="text-[10px] font-mono text-[var(--text-muted)]">{formatDate(dateRange.max)}</span>
        </div>
      </div>
    </motion.div>
  );
}
