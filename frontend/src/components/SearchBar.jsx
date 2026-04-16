import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, X } from 'lucide-react';

export default function SearchBar({ onSearch }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [query, setQuery] = useState('');

  const handleSearch = (e) => {
    if (e) e.preventDefault();
    onSearch(query);
  };

  const handleClear = () => {
    setQuery('');
    onSearch('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setIsExpanded(false);
      handleClear();
    }
  };

  return (
    <div data-testid="search-bar">
      {!isExpanded ? (
        <button
          onClick={() => setIsExpanded(true)}
          className="glass-panel rounded-md p-2.5 hover:bg-[var(--bg-elevated)] transition-colors"
          data-testid="search-toggle-btn"
        >
          <Search className="w-4 h-4" />
        </button>
      ) : (
        <motion.form
          initial={{ width: 40 }}
          animate={{ width: 280 }}
          onSubmit={handleSearch}
          className="glass-panel rounded-md px-3 py-2 flex items-center gap-2"
        >
          <Search className="w-3.5 h-3.5 text-[var(--text-secondary)] flex-shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); onSearch(e.target.value); }}
            onKeyDown={handleKeyDown}
            placeholder="Search events, countries..."
            className="flex-1 bg-transparent border-none outline-none text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] min-w-0"
            autoFocus
            data-testid="search-input"
          />
          {query && (
            <button type="button" onClick={handleClear} className="p-0.5 hover:bg-[var(--bg-elevated)] rounded" data-testid="search-clear-btn">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => { setIsExpanded(false); handleClear(); }}
            className="text-[10px] text-[var(--text-muted)] hover:text-white flex-shrink-0"
            data-testid="search-close-btn"
          >
            ESC
          </button>
        </motion.form>
      )}
    </div>
  );
}
