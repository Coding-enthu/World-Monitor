import React from 'react';
import { motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { CATEGORY_LIST } from '../services/api';
import './component-css/CategoryFilters.css';
import { X } from 'lucide-react';
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
    if (allSelected) { onSelectionChange([]); return; }
    onSelectionChange(selectableCategories.map((cat) => cat.id));
  };

  return (
  <motion.div className="cf-root">

  {/* 🔘 Filters Button (hidden when open) */}
  {!isOpen && (
    <button
      onClick={() => setIsOpen(true)}
      className="cf-trigger glass-panel"
    >
      Filters
    </button>
  )}

  {/* 📂 Sliding Panel */}
  <motion.div
    initial={false}
    animate={{ x: isOpen ? 0 : -260 }}
    transition={{ type: 'spring', stiffness: 260, damping: 25 }}
    className={`cf-panel glass-panel ${isOpen ? 'cf-panel--open' : ''}`}
  >
    {/* ❌ Close Button */}
    <button
      onClick={() => setIsOpen(false)}
      className="cf-close-btn"
    >
      <X size={16} />
    </button>

    {/* Header */}
    <div className="cf-toggle-inner" style={{ paddingRight: '1.5rem' }}>
      <span className="cf-toggle-label">Filters</span>
      <span className="cf-toggle-count">
        {selectedCategories.length}/{selectableCategories.length}
      </span>
    </div>

    {/* Scrollable content */}
    <div className="cf-dropdown">

      {/* All categories */}
      <button onClick={toggleAll} className="cf-all-btn">
        <div className="cf-row">
          <div className="cf-row-left">
            <input type="checkbox" readOnly checked={allSelected} className="cf-checkbox" />
            <span className="cf-all-label">All Categories</span>
          </div>
          <span className="cf-count-badge">{stats.total_events}</span>
        </div>
      </button>

      {/* Categories */}
      {selectableCategories.map((cat) => {
        const isActive = selectedCategories.includes(cat.id);
        const count = stats.by_category[cat.id] || 0;

        return (
          <button
            key={cat.id}
            onClick={() => toggleCategory(cat.id)}
            className="cf-cat-btn"
            style={{
              borderColor: isActive ? `${cat.color}60` : 'transparent',
              backgroundColor: isActive ? `${cat.color}10` : undefined,
            }}
          >
            <div className="cf-row">
              <div className="cf-row-left">
                <input type="checkbox" readOnly checked={isActive} className="cf-checkbox" />
                <div className="cf-cat-dot" style={{ backgroundColor: cat.color }} />
                <span className="cf-cat-label">{cat.label}</span>
              </div>
              <span className="cf-count-badge">{count}</span>
            </div>
          </button>
        );
      })}

      {/* Weather */}
      <div className="cf-weather-divider">
        <button onClick={() => onWeatherLayerChange?.(!weatherLayerEnabled)} className="cf-weather-btn">
          <div className="cf-row">
            <div className="cf-row-left">
              <input type="checkbox" readOnly checked={weatherLayerEnabled} className="cf-checkbox" />
              <span className="cf-weather-label">Weather</span>
            </div>
            <span className="cf-weather-tag">Layer</span>
          </div>
        </button>
      </div>

    </div>
  </motion.div>
</motion.div>
  );
}
