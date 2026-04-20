import React, { useEffect, useState, useCallback, useMemo, lazy, Suspense } from 'react';
import { motion } from 'framer-motion';
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
import FinanceCorrelation from '../components/FinanceCorrelation';
import TopRightDataHub from '../components/TopRightDataHub';
import useWebSocket from '../hooks/useWebSocket';
import { Map, Globe as GlobeIcon, GitBranch, Zap } from 'lucide-react';

const GlobeView = lazy(() => import('../components/GlobeView'));
const DRAG_CLICK_THRESHOLD = 6;
const DRAG_CLICK_SUPPRESS_MS = 250;

function DraggableControl({ className = '', children, ...props }) {
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
      {...props}
    >
      {children}
    </motion.div>
  );
}

export default function Dashboard() {
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

  // WebSocket
  const handleNewEvent = useCallback((eventData) => {
    // Only append real-time web-socket events if we are viewing today's default board (timelineDate is null)
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

  // Data fetching — returns event count so callers can detect empty pipeline
  const fetchData = useCallback(async (targetDate = null) => {
    try {
      const data = await fetchGeopoliticsData(targetDate);
      setMarkers(data.markers);
      setEvents(data.events);
      setStats(data.stats);
      return data.events.length;
    } catch (e) { console.error('Fetch error:', e); return 0; }
  }, []);

  // Initialization
  useEffect(() => {
    const init = async () => {
      try {
        const dates = await fetchAvailableDates();
        setAvailableDates(dates);
        const count = await fetchData();
        // If the pipeline hasn't finished yet (0 events), let the user know
        if (count === 0) setPipelineRunning(true);
      }
      catch (e) { console.error('Init error:', e); }
      setLoading(false);
    };
    init();
  }, [fetchData]);

  // Handle timeline shifts
  useEffect(() => {
    // Re-fetch data whenever the user commits to a new timeline date
    if (!loading) {
      fetchData(timelineDate);
    }
  }, [timelineDate, fetchData, loading]);

  // Background Polling:
  // - Every 15s while pipeline is warming up (events === 0)
  // - Every 60s normally (WebSocket handles real-time, polling is just a safety net)
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
        if (!cancelled) {
          setWeatherMarkers(regions);
        }
      } catch (error) {
        if (!cancelled) {
          setWeatherMarkers([]);
        }
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

  // Filtering (No timeline filtering needed, API serves exact day dataset)
  const filteredMarkers = useMemo(() => {
    let result = markers;
    result = result.filter(e => selectedCategories.includes(e.category));
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(e => e.title.toLowerCase().includes(q) || e.country.toLowerCase().includes(q));
    }
    return result;
  }, [markers, selectedCategories, searchQuery]);

  const filteredEvents = useMemo(() => {
    let result = events;
    result = result.filter(e => selectedCategories.includes(e.category));
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(e => e.title.toLowerCase().includes(q) || e.description.toLowerCase().includes(q) || e.country.toLowerCase().includes(q));
    }
    return result;
  }, [events, selectedCategories, searchQuery]);

  // Handlers
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

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[var(--bg-base)]" data-testid="loading-screen">
        <div className="text-center space-y-4">
          <div className="relative w-16 h-16 mx-auto">
            <div className="absolute inset-0 border-4 border-[var(--cat-political)] border-t-transparent rounded-full animate-spin"></div>
            <div className="absolute inset-2 border-4 border-[var(--cat-war)] border-b-transparent rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '0.8s' }}></div>
          </div>
          <p className="text-[var(--text-secondary)] font-mono text-sm tracking-widest uppercase">Initializing Global Tracker AI</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden" data-testid="dashboard">
      {/* Pipeline warming-up banner */}
      {pipelineRunning && (
        <div className="fixed top-0 inset-x-0 z-50 bg-yellow-500/20 border-b border-yellow-500/40 text-yellow-300 text-xs font-mono text-center py-1.5 tracking-wider">
          ⚡ News pipeline ingesting data — events will appear shortly. Checking every 15s…
        </div>
      )}

      {/* Map / Globe Layer */}
      {viewMode === '2d' ? (
        <MapView
          events={filteredMarkers}
          weatherMarkers={weatherMarkers}
          onEventClick={handleEventClick}
          onCountryClick={handleCountryClick}
          selectedEvent={selectedEvent}
        />
      ) : (
        <Suspense fallback={<div className="absolute inset-0 bg-[var(--bg-base)]" />}>
          <GlobeView
            events={filteredMarkers}
            weatherMarkers={weatherMarkers}
            onEventClick={handleEventClick}
            selectedEvent={selectedEvent}
          />
        </Suspense>
      )}

      {/* Top: Global Counters */}
      <GlobalCounters stats={stats} isConnected={isConnected} />

      {/* Left: Category Filters */}
      <CategoryFilters
        selectedCategories={selectedCategories}
        onSelectionChange={setSelectedCategories}
        stats={stats}
        weatherLayerEnabled={weatherLayerEnabled}
        onWeatherLayerChange={setWeatherLayerEnabled}
      />

      {/* Right Column Controls: Search & Toggles */}
      <div className="fixed top-20 right-4 z-30 flex flex-col items-end gap-2.5" data-testid="controls-column">
        <TopRightDataHub />

        {/* View Toggle */}
        <DraggableControl
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex gap-1 glass-panel rounded-md p-1"
          data-testid="view-toggle"
        >
          <button
            onClick={() => setViewMode('2d')}
            className={`px-2.5 py-1.5 rounded-sm transition-all ${viewMode === '2d' ? 'bg-[var(--cat-political)] text-white' : 'text-[var(--text-secondary)] hover:text-white'}`}
            data-testid="view-2d-btn"
          >
            <Map className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('3d')}
            className={`px-2.5 py-1.5 rounded-sm transition-all ${viewMode === '3d' ? 'bg-[var(--cat-political)] text-white' : 'text-[var(--text-secondary)] hover:text-white'}`}
            data-testid="view-3d-btn"
          >
            <GlobeIcon className="w-4 h-4" />
          </button>
        </DraggableControl>

        {/* Graph Button */}
        <DraggableControl data-testid="graph-btn">
          <button
            onClick={() => setIsGraphOpen(true)}
            className="glass-panel rounded-md px-3 py-2 flex items-center gap-1.5 hover:bg-[var(--bg-elevated)] transition-colors"
          >
            <GitBranch className="w-4 h-4 text-[var(--cat-political)]" />
            <span className="text-[10px] font-mono text-[var(--text-secondary)] hidden lg:block">Graph</span>
          </button>
        </DraggableControl>

        {/* Simulation Button */}
        <DraggableControl data-testid="simulation-btn">
          <button
            onClick={() => setIsSimulationOpen(true)}
            className="glass-panel rounded-md px-3 py-2 flex items-center gap-1.5 hover:bg-[var(--bg-elevated)] transition-colors"
          >
            <Zap className="w-4 h-4 text-[var(--cat-economic)]" />
            <span className="text-[10px] font-mono text-[var(--text-secondary)] hidden lg:block">Simulate</span>
          </button>
        </DraggableControl>

        {/* Search */}
        <DraggableControl>
          <SearchBar onSearch={setSearchQuery} />
        </DraggableControl>

        {/* Finance Correlation (moved inside flex so it doesn't overlap toggles) */}
        <DraggableControl>
          <FinanceCorrelation events={events} />
        </DraggableControl>
      </div>

      {/* Bottom Left: Event Feed */}
      <EventFeed events={filteredEvents} onEventClick={handleEventClick} onCountryClick={handleCountryClick} />

      {/* Bottom Center: Timeline */}
      <TimelineSlider availableDates={availableDates} events={markers} onTimelineChange={setTimelineDate} activeDate={timelineDate} />

      {/* Panels */}
      <IntelPanel
        event={selectedEvent}
        isOpen={isPanelOpen}
        onClose={() => {
          setIsPanelOpen(false);
          setSelectedEvent(null);
        }}
      />
      <CountryIntelPanel country={selectedCountry} isOpen={isCountryPanelOpen} onClose={() => setIsCountryPanelOpen(false)} allEvents={events} />
      <EventGraph isOpen={isGraphOpen} onClose={() => setIsGraphOpen(false)} allEvents={events} />
      <SimulationPanel isOpen={isSimulationOpen} onClose={() => setIsSimulationOpen(false)} />

      {/* New Event Toast */}
      {newEventToast && (
        <NewEventToast event={newEventToast} onDismiss={() => setNewEventToast(null)} onClick={handleEventClick} />
      )}

      {/* AI Chatbot */}
      <ChatBot />

      {/* Status Indicator */}
      <div className="fixed bottom-6 right-20 z-30 glass-panel rounded-md px-4 py-2 flex items-center gap-2" data-testid="status-indicator">
        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-[var(--cat-policy)] animate-pulse-glow' : 'bg-[var(--cat-war)]'}`} />
        <span className="text-xs font-mono text-[var(--text-secondary)]">
          {filteredMarkers.length} events {isConnected ? '(Live)' : '(Offline)'}
        </span>
      </div>
    </div>
  );
}
