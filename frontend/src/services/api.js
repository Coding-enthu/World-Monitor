import axios from 'axios';

// Backend URL — single endpoint
const API_URL = 'http://localhost:5000/api/geopolitics';

/**
 * Category color palette matching the backend's CATEGORY_ORDER.
 * Exported so components can import it instead of duplicating.
 */
export const CATEGORY_COLORS = {
  'Armed Conflict':        '#FF3B30',
  'Terrorism & Security':  '#DC2626',
  'Cyber & Tech':          '#10B981',
  'Politics':              '#3B82F6',
  'Diplomacy':             '#22C55E',
  'Diplomacy & Sanctions': '#F59E0B',
  'Global Economy':        '#A855F7',
  'Health & Disaster':     '#EC4899',
  'Environment & Climate': '#14B8A6',
  'Other':                 '#94A3B8',
};

/**
 * Ordered list of categories (mirrors backend CATEGORY_ORDER).
 * Used by CategoryFilters to render in consistent order.
 */
export const CATEGORY_LIST = [
  { id: 'all',                     label: 'All',                color: '#FFFFFF' },
  { id: 'Armed Conflict',          label: 'Armed Conflict',     color: '#FF3B30' },
  { id: 'Terrorism & Security',    label: 'Terror / Security',  color: '#DC2626' },
  { id: 'Cyber & Tech',            label: 'Cyber & Tech',       color: '#10B981' },
  { id: 'Politics',                label: 'Politics',           color: '#3B82F6' },
  { id: 'Diplomacy',               label: 'Diplomacy',          color: '#22C55E' },
  { id: 'Diplomacy & Sanctions',   label: 'Sanctions',          color: '#F59E0B' },
  { id: 'Global Economy',          label: 'Global Economy',     color: '#A855F7' },
  { id: 'Health & Disaster',       label: 'Health & Disaster',  color: '#EC4899' },
  { id: 'Environment & Climate',   label: 'Climate / Env',      color: '#14B8A6' },
  { id: 'Other',                   label: 'Other',              color: '#94A3B8' },
];

/**
 * Fetch, flatten and normalise the backend payload so every component
 * can keep working with the shape it already expects.
 *
 * Backend shape:
 *   { success, count, data: { "Armed Conflict": [evt, …], … } }
 *
 * Each event looks like:
 *   { id, type, country, coords:[lat,lng]|null, severity, confidence,
 *     timestamp, title, description, sources:[{name,url}], score }
 *
 * We return:
 *   { events: [...], markers: [...], stats: {...} }
 */
export const fetchAvailableDates = async () => {
  try {
    const res = await axios.get(`${API_URL}/dates`, { timeout: 10000 });
    return res.data.dates || [];
  } catch (err) {
    console.error("Failed to fetch available dates:", err);
    return [];
  }
};

export const fetchGeopoliticsData = async (date = null) => {
  const endpoint = date ? `${API_URL}?date=${date}` : API_URL;
  const res = await axios.get(endpoint, { timeout: 15000 });
  const { success, count, data } = res.data;

  if (!success) {
    throw new Error('API returned success=false');
  }

  const allEvents = [];
  const byCategory = {};
  const countries = new Set();

  Object.entries(data).forEach(([category, categoryEvents]) => {
    byCategory[category] = categoryEvents.length;

    categoryEvents.forEach(evt => {
      if (evt.country) countries.add(evt.country);

      allEvents.push({
        // pass through every original field
        ...evt,
        // --- normalised fields the UI already reads ---
        category,
        published_at: evt.timestamp,
        intensity:    evt.severity,            // 1-5 scale used by markers
        location:     evt.coords && evt.coords.length === 2
                        ? { lat: evt.coords[0], lng: evt.coords[1] }
                        : null,
        // convenience: first source link / name for IntelPanel
        source_url:   evt.sources?.[0]?.url  || null,
        source_name:  evt.sources?.[0]?.name || null,
      });
    });
  });

  // Sort newest-first
  allEvents.sort((a, b) => new Date(b.published_at) - new Date(a.published_at));

  return {
    events:  allEvents,
    markers: allEvents.filter(e => e.location !== null),
    stats: {
      total_events:     count || allEvents.length,
      active_countries: countries.size,
      by_category:      byCategory,
      recent_count:     count || allEvents.length,
    },
  };
};
