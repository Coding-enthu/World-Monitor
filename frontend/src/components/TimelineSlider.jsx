import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, RotateCcw } from 'lucide-react';

export default function TimelineSlider({ availableDates = [], onTimelineChange, activeDate }) {
  const [hoveredDate, setHoveredDate] = useState(null);

  const dates = availableDates.length ? [...availableDates].sort() : [];
  const minDate = dates.length ? dates[0] : null;
  const maxDate = dates.length ? dates[dates.length - 1] : null;

  const handleSliderChange = (e) => {
    const idx = parseInt(e.target.value);
    if (idx >= 0 && idx < dates.length) {
      const date = dates[idx];
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
      // Make it strict local date parsing so it doesn't shift by timezone
      const localDate = new Date(d.getTime() + Math.abs(d.getTimezoneOffset() * 60000));
      return localDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const currentIdx = activeDate ? dates.indexOf(activeDate) : dates.length - 1;

  if (dates.length < 2) return null;

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
            {formatDate(hoveredDate || activeDate || maxDate)}
          </span>
        </div>
      </div>
      
      {/* Slider */}
      <div className="relative">
        <input
          type="range"
          min={0}
          max={dates.length - 1}
          value={currentIdx >= 0 ? currentIdx : dates.length - 1}
          onChange={handleSliderChange}
          className="timeline-range w-full"
          data-testid="timeline-range-input"
        />
        <div className="flex justify-between mt-1">
          <span className="text-[10px] font-mono text-[var(--text-muted)]">{formatDate(minDate)}</span>
          <span className="text-[10px] font-mono text-[var(--text-muted)]">{formatDate(maxDate)}</span>
        </div>
      </div>
    </motion.div>
  );
}
