import React, { useEffect, useState, useCallback, useMemo, lazy, Suspense } from 'react';
import { fetchGeopoliticsData } from '../services/api';
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
import useWebSocket from '../hooks/useWebSocket';
import { Map, Globe as GlobeIcon, GitBranch, Zap } from 'lucide-react';

const GlobeView = lazy(() => import('../components/GlobeView'));

export default function Dashboard() {
  const [markers, setMarkers] = useState([]);
  const [events, setEvents] = useState([]);
  const [stats, setStats] = useState({
    total_events: 0, active_countries: 0, by_category: {}, recent_count: 0
  });
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [timelineDate, setTimelineDate] = useState(null);
  const [viewMode, setViewMode] = useState('2d');
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [isCountryPanelOpen, setIsCountryPanelOpen] = useState(false);
  const [newEventToast, setNewEventToast] = useState(null);
  const [isGraphOpen, setIsGraphOpen] = useState(false);
  const [isSimulationOpen, setIsSimulationOpen] = useState(false);

  // WebSocket
  const handleNewEvent = useCallback((eventData) => {
    if (eventData) {
      setNewEventToast(eventData);
      setMarkers(prev => {
        if (prev.some(m => m.id === eventData.id)) return prev;
        return [eventData, ...prev];
      });
    }
  }, []);

  const handleStatsUpdate = useCallback((statsData) => {
    if (statsData?.total_events) {
      setStats(prev => ({ ...prev, total_events: statsData.total_events }));
    }
  }, []);

  const { isConnected } = useWebSocket({ onNewEvent: handleNewEvent, onStatsUpdate: handleStatsUpdate });

  // Data fetching
  const fetchData = useCallback(async () => {
    try {
      const data = await fetchGeopoliticsData();
      setMarkers(data.markers);
      setEvents(data.events);
      setStats(data.stats);
    } catch (e) { console.error('Fetch error:', e); }
  }, []);

  useEffect(() => {
    const init = async () => {
      try { await fetchData(); }
      catch (e) { console.error('Init error:', e); }
      setLoading(false);
    };
    init();
    const interval = setInterval(() => { fetchData(); }, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Filtering
  const filteredMarkers = useMemo(() => {
    let result = markers;
    if (activeCategory !== 'all') result = result.filter(e => e.category === activeCategory);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(e => e.title.toLowerCase().includes(q) || e.country.toLowerCase().includes(q));
    }
    if (timelineDate) {
      const td = new Date(timelineDate);
      result = result.filter(e => new Date(e.published_at).toDateString() === td.toDateString());
    }
    return result;
  }, [markers, activeCategory, searchQuery, timelineDate]);

  const filteredEvents = useMemo(() => {
    let result = events;
    if (activeCategory !== 'all') result = result.filter(e => e.category === activeCategory);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(e => e.title.toLowerCase().includes(q) || e.description.toLowerCase().includes(q) || e.country.toLowerCase().includes(q));
    }
    if (timelineDate) {
      const td = new Date(timelineDate);
      result = result.filter(e => new Date(e.published_at).toDateString() === td.toDateString());
    }
    return result;
  }, [events, activeCategory, searchQuery, timelineDate]);

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
      {/* Map / Globe Layer */}
      {viewMode === '2d' ? (
        <MapView events={filteredMarkers} onEventClick={handleEventClick} onCountryClick={handleCountryClick} selectedEvent={selectedEvent} />
      ) : (
        <Suspense fallback={<div className="absolute inset-0 bg-[var(--bg-base)]" />}>
          <GlobeView events={filteredMarkers} onEventClick={handleEventClick} selectedEvent={selectedEvent} />
        </Suspense>
      )}

      {/* Top: Global Counters */}
      <GlobalCounters stats={stats} isConnected={isConnected} />

      {/* Left: Category Filters */}
      <CategoryFilters activeCategory={activeCategory} onCategoryChange={setActiveCategory} stats={stats} />

      {/* Right Column Controls: Search & Toggles */}
      <div className="fixed top-24 right-4 z-30 flex flex-col items-end gap-2.5" data-testid="controls-column">
        {/* View Toggle */}
        <div className="flex gap-1 glass-panel rounded-md p-1" data-testid="view-toggle">
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
        </div>

        {/* Graph Button */}
        <button
          onClick={() => setIsGraphOpen(true)}
          className="glass-panel rounded-md px-3 py-2 flex items-center gap-1.5 hover:bg-[var(--bg-elevated)] transition-colors"
          data-testid="graph-btn"
        >
          <GitBranch className="w-4 h-4 text-[var(--cat-political)]" />
          <span className="text-[10px] font-mono text-[var(--text-secondary)] hidden lg:block">Graph</span>
        </button>

        {/* Simulation Button */}
        <button
          onClick={() => setIsSimulationOpen(true)}
          className="glass-panel rounded-md px-3 py-2 flex items-center gap-1.5 hover:bg-[var(--bg-elevated)] transition-colors"
          data-testid="simulation-btn"
        >
          <Zap className="w-4 h-4 text-[var(--cat-economic)]" />
          <span className="text-[10px] font-mono text-[var(--text-secondary)] hidden lg:block">Simulate</span>
        </button>

        {/* Search */}
        <SearchBar onSearch={setSearchQuery} />
      </div>

      {/* Right: Finance Correlation */}
      <FinanceCorrelation />

      {/* Bottom Left: Event Feed */}
      <EventFeed events={filteredEvents} onEventClick={handleEventClick} onCountryClick={handleCountryClick} />

      {/* Bottom Center: Timeline */}
      <TimelineSlider events={markers} onTimelineChange={setTimelineDate} activeDate={timelineDate} />

      {/* Panels */}
      <IntelPanel event={selectedEvent} isOpen={isPanelOpen} onClose={() => setIsPanelOpen(false)} />
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
