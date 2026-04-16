import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, BarChart3 } from 'lucide-react';

/**
 * FinanceCorrelation — Demo stub.
 * The current backend has no /api/finance/correlations endpoint.
 * Shows static placeholder market data so the UI panel renders
 * without making failed network requests.
 */

const DEMO_DATA = {
  oil: { symbol: 'CL', current_price: 82.45, change_pct: 2.3, color: '#F59E0B' },
  gold: { symbol: 'GC', current_price: 2341.80, change_pct: 0.8, color: '#F59E0B' },
  sp500: { symbol: 'SPX', current_price: 5214.08, change_pct: -0.6, color: '#3B82F6' },
};

export default function FinanceCorrelation() {
  const [isExpanded, setIsExpanded] = useState(false);

  const entries = Object.entries(DEMO_DATA);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className={`fixed top-24 right-4 z-30 glass-panel rounded-xl overflow-hidden transition-all ${isExpanded ? 'w-[260px]' : 'w-auto'}`}
      data-testid="finance-panel"
    >
      {!isExpanded ? (
        <button
          onClick={() => setIsExpanded(true)}
          className="p-3 hover:bg-[var(--bg-elevated)] transition-colors flex items-center gap-2"
          data-testid="finance-toggle-btn"
        >
          <BarChart3 className="w-4 h-4 text-[var(--cat-economic)]" />
          <span className="text-[10px] font-mono text-[var(--text-secondary)]">Markets</span>
        </button>
      ) : (
        <div>
          <div className="px-4 py-3 border-b border-[var(--border-default)] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-3 h-3 text-[var(--cat-economic)]" />
              <span className="text-[10px] uppercase tracking-[0.2em] font-mono text-[var(--text-secondary)]">Market Correlation</span>
            </div>
            <button onClick={() => setIsExpanded(false)} className="text-[10px] text-[var(--text-muted)] hover:text-white">
              Collapse
            </button>
          </div>
          <div className="p-3 space-y-2">
            {entries.map(([key, item]) => {
              const isUp = item.change_pct > 0;
              const isDown = item.change_pct < 0;
              const Icon = isUp ? TrendingUp : isDown ? TrendingDown : Minus;
              const changeColor = isUp ? '#22C55E' : isDown ? '#FF3B30' : '#94A3B8';

              return (
                <div key={key} className="flex items-center gap-2 py-1.5" data-testid={`finance-${key}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono font-bold">{item.symbol}</span>
                      <Icon className="w-3 h-3" style={{ color: changeColor }} />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono">${item.current_price?.toFixed(2)}</span>
                      <span className="text-[10px] font-mono" style={{ color: changeColor }}>
                        {isUp ? '+' : ''}{item.change_pct?.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
            <div className="pt-1 border-t border-[var(--border-default)]">
              <span className="text-[9px] font-mono text-[var(--text-muted)]">Demo data — connect finance API</span>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
