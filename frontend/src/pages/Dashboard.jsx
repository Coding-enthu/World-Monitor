import React, { useEffect, useState, useCallback, useMemo, lazy, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchGeopoliticsData, fetchAvailableDates, fetchWeatherRegions, CATEGORY_LIST } from '../services/api';
import MapView from '../components/MapView';
import GlobalCounters from '../components/GlobalCounters';
import CategoryFilters from '../components/CategoryFilters';
import SearchBar from '../components/SearchBar';
import IntelPanel from '../components/IntelPanel';
import EventFeed from '../components/EventFeed';
import TimelineSlider from '../components/TimelineSlider';
import CountryIntelPanel from '../components/CountryIntelPanel';
import ChatBot from '../components/ChatBot';
import NewEventToast from '../components/NewEventToast';
import EventGraph from '../components/EventGraph';
import SimulationPanel from '../components/SimulationPanel';
import useWebSocket from '../hooks/useWebSocket';
import Preloader from '../components/Preloader';
import GlobalData from '../components/GlobalData';
import NaturalEvents from '../components/NaturalEvents';
import { fetchNaturalEvents } from '../services/api';
import { Map, Globe as GlobeIcon, GitBranch, Zap } from 'lucide-react';
import { useNavigate } from "react-router-dom";
import DataHubDashboard from './DataHubDashboard';
const GlobeView = lazy(() => import('../components/GlobeView'));

// ─── DraggableControl ────────────────────────────────────────────────────────
// Wraps motion.div with drag but suppresses phantom click events after a drag.
// IMPORTANT: never renders fixed-position children inside — fixed positioning
// inside a transformed element is broken by the browser spec. Use portals for
// any globally-fixed UI (TimelineSlider, toasts, etc.)
const DRAG_CLICK_THRESHOLD = 6;
const DRAG_CLICK_SUPPRESS_MS = 250;

function DraggableControl({ className = '', style = {}, children, ...props }) {
  const suppressClickUntilRef = React.useRef(0);

  return (
    <motion.div
      drag
      dragMomentum={false}
      onDragEnd={(_, info) => {
        const distance = Math.hypot(info.offset.x, info.offset.y);
        if (distance > DRAG_CLICK_THRESHOLD) {
          suppressClickUntilRef.current = Date.now() + DRAG_CLICK_SUPPRESS_MS;
        }
      }}
      onClickCapture={(e) => {
        if (Date.now() < suppressClickUntilRef.current) {
          e.preventDefault();
          e.stopPropagation();
        }
      }}
      className={`cursor-move ${className}`}
      style={style}
      {...props}
    >
      {children}
    </motion.div>
  );
}
 
export default function Dashboard() {
   const navigate = useNavigate();
  const [markers, setMarkers] = useState([]);
  const [events, setEvents] = useState([]);
  const [stats, setStats] = useState({
    total_events: 0, active_countries: 0, by_category: {}, recent_count: 0
  });
  const [selectedCategories, setSelectedCategories] = useState(
    CATEGORY_LIST.filter((cat) => cat.id !== 'all').map((cat) => cat.id)
  );
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [pipelineRunning, setPipelineRunning] = useState(false);
  const [timelineDate, setTimelineDate] = useState(null);
  const [availableDates, setAvailableDates] = useState([]);
  const [viewMode, setViewMode] = useState('2d');
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [isCountryPanelOpen, setIsCountryPanelOpen] = useState(false);
  const [newEventToast, setNewEventToast] = useState(null);
  const [isGraphOpen, setIsGraphOpen] = useState(false);
  const [isSimulationOpen, setIsSimulationOpen] = useState(false);
  const [weatherLayerEnabled, setWeatherLayerEnabled] = useState(false);
  const [weatherMarkers, setWeatherMarkers] = useState([]);
  const [mode, setMode] = useState('map'); // 'map' | 'datahub'
  const [isGlobalPanelOpen, setIsGlobalPanelOpen]   = useState(false);
  const [isNaturalPanelOpen, setIsNaturalPanelOpen] = useState(false);
  const [naturalLayerEnabled, setNaturalLayerEnabled] = useState(false);
  const [naturalEvents, setNaturalEvents]           = useState([]);
  const [naturalLoading, setNaturalLoading]         = useState(false);
  // ── WebSocket ──────────────────────────────────────────────────────────────
  const handleNewEvent = useCallback((eventData) => {
    if (eventData && !timelineDate) {
      setNewEventToast(eventData);
      setMarkers(prev => {
        if (prev.some(m => m.id === eventData.id)) return prev;
        return [eventData, ...prev];
      });
    }
  }, [timelineDate]);

  const handleStatsUpdate = useCallback((statsData) => {
    if (statsData?.total_events && !timelineDate) {
      setStats(prev => ({ ...prev, total_events: statsData.total_events }));
    }
  }, [timelineDate]);

  const { isConnected } = useWebSocket({ onNewEvent: handleNewEvent, onStatsUpdate: handleStatsUpdate });

  // ── Data fetching ──────────────────────────────────────────────────────────
  const fetchData = useCallback(async (targetDate = null) => {
    try {
      const data = await fetchGeopoliticsData(targetDate);
      setMarkers(data.markers);
      setEvents(data.events);
      setStats(data.stats);
      return data.events.length;
    } catch (e) { console.error('Fetch error:', e); return 0; }
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        const dates = await fetchAvailableDates();
        setAvailableDates(dates);
        const count = await fetchData();
        if (count === 0) setPipelineRunning(true);
      } catch (e) { console.error('Init error:', e); }
      setLoading(false);
    };
    init();
  }, [fetchData]);

  useEffect(() => {
    if (!loading) fetchData(timelineDate);
  }, [timelineDate, fetchData, loading]);

  useEffect(() => {
    const POLL_MS = pipelineRunning ? 15000 : 60000;
    const interval = setInterval(async () => {
      if (!timelineDate) {
        const count = await fetchData();
        if (count > 0 && pipelineRunning) {
          setPipelineRunning(false);
          const dates = await fetchAvailableDates();
          setAvailableDates(dates);
        }
      }
    }, POLL_MS);
    return () => clearInterval(interval);
  }, [fetchData, timelineDate, pipelineRunning]);

  useEffect(() => {
    let cancelled = false;
    let interval = null;

    const loadWeatherRegions = async () => {
      try {
        const regions = await fetchWeatherRegions();
        if (!cancelled) setWeatherMarkers(regions);
      } catch {
        if (!cancelled) setWeatherMarkers([]);
      }
    };

    if (weatherLayerEnabled) {
      loadWeatherRegions();
      interval = setInterval(loadWeatherRegions, 10 * 60 * 1000);
    } else {
      setWeatherMarkers([]);
    }

    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
    };
  }, [weatherLayerEnabled]);

  // ── Natural Events fetch ─ triggers when layer OR panel is first enabled ──
  useEffect(() => {
    const shouldFetch = naturalLayerEnabled || isNaturalPanelOpen;
    if (!shouldFetch) return;
    if (naturalEvents.length > 0) return; // already loaded
    let cancelled = false;
    const load = async () => {
      setNaturalLoading(true);
      try {
        const data = await fetchNaturalEvents();
        if (!cancelled) setNaturalEvents(data);
      } catch (e) {
        console.error('Natural events fetch error:', e);
      } finally {
        if (!cancelled) setNaturalLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [naturalLayerEnabled, isNaturalPanelOpen]); // eslint-disable-line react-hooks/exhaustive-deps
  // Events where country === 'Global' are kept OUT of the map markers so they
  // never appear as dots. They are only shown in the GlobalData panel.
  const globalEvents = useMemo(
    () => events.filter(e => e.country === 'Global'),
    [events],
  );

  const filteredMarkers = useMemo(() => {
    let result = markers
      .filter(e => e.country !== 'Global')           // exclude Global from map
      .filter(e => selectedCategories.includes(e.category));
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(e => e.title.toLowerCase().includes(q) || e.country.toLowerCase().includes(q));
    }
    return result;
  }, [markers, selectedCategories, searchQuery]);

  const filteredEvents = useMemo(() => {
    let result = events.filter(e => selectedCategories.includes(e.category));
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(e =>
        e.title.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        e.country.toLowerCase().includes(q)
      );
    }
    return result;
  }, [events, selectedCategories, searchQuery]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleEventClick = useCallback((event) => {
    setIsCountryPanelOpen(false);
    setSelectedEvent(event);
    setIsPanelOpen(true);
  }, []);

  const handleCountryClick = useCallback((countryName) => {
    setIsPanelOpen(false);
    setSelectedCountry(countryName);
    setIsCountryPanelOpen(true);
  }, []);

  // ── Loading screen ─────────────────────────────────────────────────────────
  if (loading) return <Preloader />;
if (mode === 'datahub') {
  return (
    <DataHubDashboard
      events={events}
      markers={filteredMarkers}
      filteredEvents={filteredEvents}
      onEventClick={handleEventClick}
      onCountryClick={handleCountryClick}
      onExit={() => setMode('map')}
    />
  );
}
  // ── Main render ────────────────────────────────────────────────────────────
  // The root element is intentionally plain `div` with no transform/filter/will-change.
  // This preserves the viewport stacking context so all `position: fixed` children
  // anchor correctly to the full viewport — not to any transformed ancestor.
  return (
    <div
      data-testid="dashboard"
      style={{
        position: 'relative',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        background: 'var(--bg-base)',
      }}
    >
      {/* ── Layer 0: Full-viewport map / globe ── */}
      {viewMode === '2d' ? (
        <MapView
          events={filteredMarkers}
          weatherMarkers={weatherMarkers}
          naturalEventMarkers={naturalLayerEnabled ? naturalEvents : []}
          onEventClick={handleEventClick}
          onCountryClick={handleCountryClick}
          selectedEvent={selectedEvent}
        />
      ) : (
        <Suspense fallback={<div style={{ position: 'absolute', inset: 0, background: 'var(--bg-base)' }} />}>
          <GlobeView
            events={filteredMarkers}
            weatherMarkers={weatherMarkers}
            onEventClick={handleEventClick}
            selectedEvent={selectedEvent}
          />
        </Suspense>
      )}

      {/* ── Layer 1: Fixed overlay UI ────────────────────────────────────────
          All overlays use `position: fixed` in their own CSS files.
          They are direct children of this non-transformed div so fixed
          positioning resolves to the actual viewport.
      ───────────────────────────────────────────────────────────────────── */}

     {/* 🔥 Data Hub Toggle Button */}
<button
  onClick={() => setMode(prev => prev === 'map' ? 'datahub' : 'map')}
  style={{
    position: 'fixed',
    top: '1rem',
    right: '1rem',
    zIndex: 100,
  }}
  className="glass-panel px-3 py-2 rounded-md text-xs font-mono hover:bg-[var(--bg-elevated)] transition"
>
  {mode === 'map' ? 'Data Hub' : 'Back to Map'}
</button>  {/* new dashboard button */}
        

      {/* Pipeline warming-up banner — top full-width strip */}
      {pipelineRunning && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 300,
          background: 'rgba(234, 179, 8, 0.15)',
          borderBottom: '1px solid rgba(234, 179, 8, 0.4)',
          color: '#fde68a',
          fontSize: '0.75rem',
          fontFamily: 'JetBrains Mono, monospace',
          textAlign: 'center',
          padding: '0.375rem 1rem',
          letterSpacing: '0.05em',
        }}>
          ⚡ News pipeline ingesting data — events will appear shortly. Checking every 15s…
        </div>
      )}

      {/* Top-center: Global Counters */}
      <GlobalCounters stats={stats} isConnected={isConnected} />

      {/* Top-left: Category Filters */}
      <CategoryFilters
        selectedCategories={selectedCategories}
        onSelectionChange={setSelectedCategories}
        stats={stats}
        weatherLayerEnabled={weatherLayerEnabled}
        onWeatherLayerChange={setWeatherLayerEnabled}
        globalPanelOpen={isGlobalPanelOpen}
        onGlobalClick={() => setIsGlobalPanelOpen(p => !p)}
        globalCount={globalEvents.length}
        naturalPanelOpen={isNaturalPanelOpen}
        onNaturalClick={() => setIsNaturalPanelOpen(p => !p)}
        naturalLayerEnabled={naturalLayerEnabled}
        onNaturalLayerChange={(val) => {
          setNaturalLayerEnabled(val);
          // Also open the panel when enabling so user sees the list
          if (val) setIsNaturalPanelOpen(true);
        }}
        naturalCount={naturalEvents.length}
      />

      {/* Top-right: Data Hub + controls column */}
      <div
        data-testid="controls-column"
        style={{
          position: 'fixed',
          top: '5rem',
          right: '1rem',
          zIndex: 30,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: '0.625rem',
        }}
      >
        

        {/* View toggle (2D / 3D) */}
        <DraggableControl
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel rounded-md"
          style={{ display: 'flex', padding: '0.25rem', gap: '0.25rem' }}
          data-testid="view-toggle"
        >
          <button
            onClick={() => setViewMode('2d')}
            style={{
              padding: '0.375rem 0.625rem',
              borderRadius: '0.25rem',
              background: viewMode === '2d' ? 'var(--cat-political)' : 'transparent',
              color: viewMode === '2d' ? '#fff' : 'var(--text-secondary)',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            data-testid="view-2d-btn"
          >
            <Map style={{ width: '1rem', height: '1rem' }} />
          </button>
          <button
            onClick={() => setViewMode('3d')}
            style={{
              padding: '0.375rem 0.625rem',
              borderRadius: '0.25rem',
              background: viewMode === '3d' ? 'var(--cat-political)' : 'transparent',
              color: viewMode === '3d' ? '#fff' : 'var(--text-secondary)',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            data-testid="view-3d-btn"
          >
            <GlobeIcon style={{ width: '1rem', height: '1rem' }} />
          </button>
        </DraggableControl>

        {/* Event Graph button */}
        <DraggableControl data-testid="graph-btn">
          <button
            onClick={() => setIsGraphOpen(true)}
            className="glass-panel rounded-md"
            style={{
              padding: '0.5rem 0.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.375rem',
              cursor: 'pointer',
              border: 'none',
              background: 'unset',
              color: 'inherit',
              transition: 'background 0.15s',
            }}
            onMouseOver={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
            onMouseOut={e => e.currentTarget.style.background = 'unset'}
          >
            <GitBranch style={{ width: '1rem', height: '1rem', color: 'var(--cat-political)' }} />
            <span style={{ fontSize: '10px', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-secondary)' }}
              className="hidden lg:block">Graph</span>
          </button>
        </DraggableControl>

        {/* Simulation button */}
        <DraggableControl data-testid="simulation-btn">
          <button
            onClick={() => setIsSimulationOpen(true)}
            className="glass-panel rounded-md"
            style={{
              padding: '0.5rem 0.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.375rem',
              cursor: 'pointer',
              border: 'none',
              background: 'unset',
              color: 'inherit',
              transition: 'background 0.15s',
            }}
            onMouseOver={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
            onMouseOut={e => e.currentTarget.style.background = 'unset'}
          >
            <Zap style={{ width: '1rem', height: '1rem', color: 'var(--cat-economic)' }} />
            <span style={{ fontSize: '10px', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-secondary)' }}
              className="hidden lg:block">Simulate</span>
          </button>
        </DraggableControl>

        {/* Search */}
        <DraggableControl>
          <SearchBar onSearch={setSearchQuery} />
        </DraggableControl>
      </div>

      {/* Bottom-left: Event Feed (draggable widget) */}
      <EventFeed
        events={filteredEvents}
        onEventClick={handleEventClick}
        onCountryClick={handleCountryClick}
      />

      {/* ── Layer 2: Global fixed UI via React Portal ────────────────────────
          These are rendered into document.body directly to guarantee they
          are NEVER inside a transformed ancestor — fixing fixed-position
          centering on all browsers.
      ───────────────────────────────────────────────────────────────────── */}
      {createPortal(
        <>
          {/* Bottom-center: Timeline Slider — always truly centered */}
          <TimelineSlider
            availableDates={availableDates}
            events={markers}
            onTimelineChange={setTimelineDate}
            activeDate={timelineDate}
          />

          {/* New Event Toast */}
          {newEventToast && (
            <NewEventToast
              event={newEventToast}
              onDismiss={() => setNewEventToast(null)}
              onClick={handleEventClick}
            />
          )}

          {/* AI Chatbot FAB */}
          <ChatBot />
        </>,
        document.body
      )}

      {/* ── Layer 3: Modals / full-screen overlays ───────────────────────── */}
      <IntelPanel
        event={selectedEvent}
        isOpen={isPanelOpen}
        onClose={() => { setIsPanelOpen(false); setSelectedEvent(null); }}
      />
      <CountryIntelPanel
        country={selectedCountry}
        isOpen={isCountryPanelOpen}
        onClose={() => setIsCountryPanelOpen(false)}
        allEvents={events}
      />
      <EventGraph
        isOpen={isGraphOpen}
        onClose={() => setIsGraphOpen(false)}
        allEvents={events}
      />
      <SimulationPanel
        isOpen={isSimulationOpen}
        onClose={() => setIsSimulationOpen(false)}
      />

      {/* ── Global Data floating panel ─────────────────────────────────── */}
      <AnimatePresence>
        {isGlobalPanelOpen && (
          <GlobalData
            events={globalEvents}
            onClose={() => setIsGlobalPanelOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ── Natural Events floating panel ───────────────────────────────── */}
      <AnimatePresence>
        {isNaturalPanelOpen && (
          <NaturalEvents
            events={naturalEvents}
            loading={naturalLoading}
            onClose={() => setIsNaturalPanelOpen(false)}
            onRefresh={async () => {
              setNaturalEvents([]);
              setNaturalLoading(true);
              try {
                const data = await fetchNaturalEvents();
                setNaturalEvents(data);
              } catch (e) {
                console.error('Refresh error:', e);
              } finally {
                setNaturalLoading(false);
              }
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
