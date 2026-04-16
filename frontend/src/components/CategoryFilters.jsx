import React from 'react';
import { motion } from 'framer-motion';
import { CATEGORY_LIST } from '../services/api';

export default function CategoryFilters({ activeCategory, onCategoryChange, stats }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="fixed top-24 left-4 z-30 flex flex-col gap-1.5"
      data-testid="category-filters"
    >
      {CATEGORY_LIST.map((cat) => {
        const isActive = activeCategory === cat.id;
        const count = cat.id === 'all' ? stats.total_events : (stats.by_category[cat.id] || 0);

        return (
          <motion.button
            key={cat.id}
            onClick={() => onCategoryChange(cat.id)}
            whileHover={{ scale: 1.03, x: 2 }}
            whileTap={{ scale: 0.97 }}
            data-testid={`category-filter-${cat.id}`}
            className="glass-panel rounded-md px-3.5 py-2.5 text-left transition-all min-w-[120px]"
            style={{
              borderColor: isActive ? `${cat.color}60` : undefined,
              backgroundColor: isActive ? `${cat.color}10` : undefined,
            }}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{
                    backgroundColor: cat.color,
                    boxShadow: isActive ? `0 0 8px ${cat.color}80` : 'none'
                  }}
                />
                <span
                  className="text-xs font-medium"
                  style={{ color: isActive ? cat.color : 'var(--text-primary)' }}
                >
                  {cat.label}
                </span>
              </div>
              <span className="font-mono text-[10px] text-[var(--text-muted)]">
                {count}
              </span>
            </div>
          </motion.button>
        );
      })}
    </motion.div>
  );
}
