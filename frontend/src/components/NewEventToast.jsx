import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle } from 'lucide-react';
import { CATEGORY_COLORS } from '../services/api';

export default function NewEventToast({ event, onDismiss, onClick }) {
  if (!event) return null;
  const color = CATEGORY_COLORS[event.category] || '#3B82F6';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 300, scale: 0.95 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, x: 300, scale: 0.95 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed top-20 right-6 z-40 w-[320px] glass-panel rounded-xl overflow-hidden cursor-pointer"
        onClick={() => onClick?.(event)}
        data-testid="new-event-toast"
      >
        <div className="px-4 py-3 flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <div className="w-8 h-8 rounded-md flex items-center justify-center" style={{ backgroundColor: `${color}20` }}>
              <AlertTriangle className="w-4 h-4" style={{ color }} />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[9px] uppercase tracking-[0.2em] font-mono" style={{ color }}>New Event</span>
              <span className="text-[9px] uppercase tracking-[0.2em] font-mono text-[var(--text-muted)]">{event.category}</span>
            </div>
            <p className="text-xs font-medium leading-snug line-clamp-2">{event.title}</p>
            <p className="text-[10px] text-[var(--text-muted)] mt-1">{event.country}</p>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onDismiss?.(); }}
            className="flex-shrink-0 p-1 hover:bg-[var(--bg-elevated)] rounded transition-colors"
            data-testid="toast-dismiss-btn"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
        {/* Progress bar */}
        <motion.div
          initial={{ width: '100%' }}
          animate={{ width: '0%' }}
          transition={{ duration: 8, ease: 'linear' }}
          className="h-0.5"
          style={{ backgroundColor: color }}
          onAnimationComplete={onDismiss}
        />
      </motion.div>
    </AnimatePresence>
  );
}
