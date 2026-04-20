import React from 'react';
import { motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { CATEGORY_LIST } from '../services/api';

const selectableCategories = CATEGORY_LIST.filter((cat) => cat.id !== 'all');

export default function CategoryFilters({
  selectedCategories,
  onSelectionChange,
  stats,
  weatherLayerEnabled = false,
  onWeatherLayerChange,
}) {
  const [isOpen, setIsOpen] = React.useState(false);
  const allSelected = selectedCategories.length === selectableCategories.length;
  const someSelected = selectedCategories.length > 0 && !allSelected;

  const toggleCategory = (categoryId) => {
    if (selectedCategories.includes(categoryId)) {
      onSelectionChange(selectedCategories.filter((id) => id !== categoryId));
      return;
    }
    onSelectionChange([...selectedCategories, categoryId]);
  };

  const toggleAll = () => {
    if (allSelected) {
      onSelectionChange([]);
      return;
    }
    onSelectionChange(selectableCategories.map((cat) => cat.id));
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="fixed top-24 left-4 z-30 flex flex-col gap-2 min-w-[220px]"
      data-testid="category-filters"
    >
      <motion.button
        onClick={() => setIsOpen((prev) => !prev)}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="glass-panel rounded-md px-3.5 py-2.5 text-left transition-all"
        data-testid="category-filters-toggle"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold tracking-widest uppercase text-[var(--text-primary)]">
              Filters
            </span>
            <span className="font-mono text-[10px] text-[var(--text-muted)]">
              {selectedCategories.length}/{selectableCategories.length}
            </span>
          </div>
          <ChevronDown className={`w-4 h-4 text-[var(--text-secondary)] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </motion.button>

      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel rounded-md p-2 flex flex-col gap-1.5"
        >
          <button
            onClick={toggleAll}
            className="rounded-md px-2.5 py-2 text-left transition-all hover:bg-[var(--bg-elevated)]"
            data-testid="category-filter-all"
            style={{ border: someSelected ? '1px solid rgba(245,158,11,0.4)' : undefined }}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  readOnly
                  checked={allSelected}
                  className="h-3.5 w-3.5 accent-[var(--cat-political)] cursor-pointer"
                />
                <span className="text-xs font-medium text-[var(--text-primary)]">All Categories</span>
              </div>
              <span className="font-mono text-[10px] text-[var(--text-muted)]">{stats.total_events}</span>
            </div>
          </button>

          {selectableCategories.map((cat) => {
            const isActive = selectedCategories.includes(cat.id);
            const count = stats.by_category[cat.id] || 0;

            return (
              <button
                key={cat.id}
                onClick={() => toggleCategory(cat.id)}
                data-testid={`category-filter-${cat.id}`}
                className="rounded-md px-2.5 py-2 text-left transition-all hover:bg-[var(--bg-elevated)]"
                style={{
                  borderColor: isActive ? `${cat.color}60` : undefined,
                  backgroundColor: isActive ? `${cat.color}10` : undefined,
                }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      readOnly
                      checked={isActive}
                      className="h-3.5 w-3.5 cursor-pointer"
                      style={{ accentColor: cat.color }}
                    />
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
              </button>
            );
          })}

          <div className="border-t border-[var(--border-default)] mt-1 pt-2">
            <button
              onClick={() => onWeatherLayerChange?.(!weatherLayerEnabled)}
              className="w-full rounded-md px-2.5 py-2 text-left transition-all hover:bg-[var(--bg-elevated)]"
              data-testid="weather-layer-toggle"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    readOnly
                    checked={weatherLayerEnabled}
                    className="h-3.5 w-3.5 accent-[var(--cat-environment)] cursor-pointer"
                  />
                  <span className="text-xs font-medium text-[var(--text-primary)]">
                    Weather Broadcast Markers
                  </span>
                </div>
                <span className="font-mono text-[10px] text-[var(--cat-environment)]">
                  Layer
                </span>
              </div>
            </button>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
