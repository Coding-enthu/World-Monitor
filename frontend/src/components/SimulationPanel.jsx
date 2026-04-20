import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, Zap, TrendingUp, TrendingDown, Minus, AlertTriangle, Clock, Globe } from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

/**
 * SimulationPanel — AI-powered geopolitical scenario simulator.
 * Calls /api/simulate with multi-provider LLM failover (Groq → Gemini).
 */

const SEVERITY_COLORS = ['#22C55E', '#22C55E', '#84CC16', '#F59E0B', '#F59E0B', '#FF8A00', '#FF8A00', '#FF3B30', '#FF3B30', '#DC2626', '#DC2626'];
const MARKET_ICONS = { up: TrendingUp, down: TrendingDown, stable: Minus };

const presets = [
  "If the Strait of Hormuz closes, what happens globally?",
  "If NATO deploys forces to Eastern Europe, what are the consequences?",
  "If a major earthquake hits Tokyo, what's the global economic impact?",
  "If oil prices spike to $200/barrel, what happens?",
  "If the US-China trade war escalates with full tariffs, what happens?",
];

export default function SimulationPanel({ isOpen, onClose }) {
  const [scenario, setScenario] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [provider, setProvider] = useState(null);
  const [error, setError] = useState(null);

  const runSimulation = async (text) => {
    const input = text || scenario;
    if (!input.trim() || loading) return;
    setLoading(true);
    setResult(null);
    setError(null);
    setProvider(null);

    try {
      const res = await axios.post(`${BACKEND_URL}/api/simulate`, {
        scenario: input,
      }, { timeout: 45000 });

      setResult(res.data.simulation);
      setProvider(res.data.provider);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Unknown error';
      setError(`Simulation failed: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="fixed inset-8 z-50 glass-panel rounded-xl overflow-hidden flex flex-col"
          data-testid="simulation-panel"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-[var(--border-default)] flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <Zap className="w-5 h-5 text-[var(--cat-economic)]" />
              <h2 className="text-lg font-bold tracking-tight" style={{ fontFamily: 'Chivo' }}>Predictive Simulation</h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-sm bg-[var(--cat-economic)]/20 text-[var(--cat-economic)]">AI</span>
            </div>
            <button onClick={onClose} className="p-2 glass-light rounded-md hover:bg-[var(--bg-elevated)]" data-testid="simulation-close-btn">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Input */}
            <div className="space-y-3">
              <label className="text-[10px] uppercase tracking-[0.2em] font-mono text-[var(--text-secondary)]">Scenario Input</label>
              <div className="flex gap-2">
                <input
                  value={scenario}
                  onChange={(e) => setScenario(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && runSimulation()}
                  placeholder="What if..."
                  className="flex-1 bg-[var(--bg-elevated)] rounded-md px-4 py-3 text-sm border border-[var(--border-default)] outline-none focus:border-[var(--cat-economic)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                  data-testid="simulation-input"
                />
                <button
                  onClick={() => runSimulation()}
                  disabled={loading || !scenario.trim()}
                  className="px-5 py-3 rounded-md bg-[var(--cat-economic)] text-black font-medium text-sm disabled:opacity-40 hover:brightness-110 transition-all"
                  data-testid="simulation-run-btn"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Simulate'}
                </button>
              </div>
              {/* Presets */}
              <div className="flex flex-wrap gap-2">
                {presets.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => { setScenario(p); runSimulation(p); }}
                    className="text-[10px] px-3 py-1.5 glass-light rounded-md hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-white transition-colors"
                    data-testid={`preset-${i}`}
                  >
                    {p.substring(0, 50)}...
                  </button>
                ))}
              </div>
            </div>

            {/* Results */}
            {loading && (
              <div className="flex items-center justify-center py-16">
                <div className="text-center space-y-3">
                  <Loader2 className="w-8 h-8 animate-spin text-[var(--cat-economic)] mx-auto" />
                  <p className="text-sm text-[var(--text-secondary)] font-mono">Running geopolitical simulation...</p>
                </div>
              </div>
            )}

            {error && (
              <div className="glass-light rounded-lg p-4 border border-red-500/30">
                <div className="flex items-center gap-2 text-red-400 text-sm">
                  <AlertTriangle className="w-4 h-4" />
                  <span>{error}</span>
                </div>
              </div>
            )}

            {result && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                {/* Summary */}
                <div className="glass-light rounded-lg p-5">
                  <p className="text-sm leading-relaxed" data-testid="simulation-summary">{result.summary}</p>
                  {provider && (
                    <p className="text-[9px] font-mono text-[var(--text-muted)] mt-2 opacity-60">Analysis by {provider}</p>
                  )}
                </div>

                {/* Metrics Row */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="glass-light rounded-lg p-4 text-center">
                    <span className="text-[10px] uppercase tracking-widest font-mono text-[var(--text-muted)]">Probability</span>
                    <p className="text-2xl font-mono font-bold mt-1" style={{ color: SEVERITY_COLORS[Math.round((result.probability || 0) * 10)] }}>
                      {Math.round((result.probability || 0) * 100)}%
                    </p>
                  </div>
                  <div className="glass-light rounded-lg p-4 text-center">
                    <span className="text-[10px] uppercase tracking-widest font-mono text-[var(--text-muted)]">Severity</span>
                    <p className="text-2xl font-mono font-bold mt-1" style={{ color: SEVERITY_COLORS[result.severity || 5] }}>
                      {result.severity || '?'}/10
                    </p>
                  </div>
                  <div className="glass-light rounded-lg p-4 text-center">
                    <span className="text-[10px] uppercase tracking-widest font-mono text-[var(--text-muted)]">Timeline</span>
                    <p className="text-sm font-mono font-bold mt-2 flex items-center justify-center gap-1">
                      <Clock className="w-3 h-3" />
                      {(result.timeline || '').replace('_', ' ')}
                    </p>
                  </div>
                </div>

                {/* Chain Reactions */}
                {result.chain_reactions && result.chain_reactions.length > 0 && (
                  <div className="space-y-3">
                    <span className="text-[10px] uppercase tracking-[0.2em] font-mono text-[var(--text-secondary)]">Chain Reactions</span>
                    <div className="space-y-2">
                      {result.chain_reactions.map((chain, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.1 }}
                          className="glass-light rounded-md px-4 py-3 flex items-start gap-3"
                          data-testid={`chain-${i}`}
                        >
                          <div className="w-6 h-6 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-[10px] font-mono font-bold">{chain.step || i + 1}</span>
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium">{chain.event}</p>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase">{chain.category}</span>
                              <span className="text-[10px] font-mono text-[var(--text-muted)]">{chain.delay}</span>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Market Impact */}
                {result.market_impact && (
                  <div className="space-y-3">
                    <span className="text-[10px] uppercase tracking-[0.2em] font-mono text-[var(--text-secondary)]">Market Impact</span>
                    <div className="grid grid-cols-3 gap-3">
                      {['oil', 'gold', 'stocks'].map(key => {
                        const dir = result.market_impact[key] || 'stable';
                        const Icon = MARKET_ICONS[dir] || Minus;
                        const color = dir === 'up' ? '#22C55E' : dir === 'down' ? '#FF3B30' : '#94A3B8';
                        return (
                          <div key={key} className="glass-light rounded-md p-3 flex items-center gap-2">
                            <Icon className="w-4 h-4" style={{ color }} />
                            <span className="text-xs font-mono uppercase">{key}</span>
                            <span className="text-xs font-mono ml-auto" style={{ color }}>{dir}</span>
                          </div>
                        );
                      })}
                    </div>
                    {result.market_impact.description && (
                      <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{result.market_impact.description}</p>
                    )}
                  </div>
                )}

                {/* Affected Regions */}
                {result.affected_regions && result.affected_regions.length > 0 && (
                  <div className="space-y-3">
                    <span className="text-[10px] uppercase tracking-[0.2em] font-mono text-[var(--text-secondary)]">Affected Regions</span>
                    <div className="grid grid-cols-2 gap-2">
                      {result.affected_regions.map((r, i) => (
                        <div key={i} className="glass-light rounded-md p-3" data-testid={`region-${i}`}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium flex items-center gap-1"><Globe className="w-3 h-3" /> {r.region}</span>
                            <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded-sm ${r.impact === 'high' ? 'bg-red-500/20 text-red-400' : r.impact === 'medium' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400'}`}>
                              {r.impact}
                            </span>
                          </div>
                          <p className="text-[10px] text-[var(--text-muted)] leading-relaxed">{r.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
