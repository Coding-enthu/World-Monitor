const redis = require("../config/redis.js");
const logger = require("../utils/logger.js");
const stringSimilarity = require("string-similarity");

const ARCHIVE_INDEX = "geopolitics_archive_dates";

// Returns today's date as "YYYY-MM-DD" in local time.
const todayString = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm   = String(d.getMonth() + 1).padStart(2, "0");
  const dd   = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

// Compute dynamic key
const getDailyKey = (dateStr) => `geopolitics_events:${dateStr}`;

// ---------- INTERNAL: read raw envelope { date, events } ----------
const _readEnvelope = async (key) => {
  const raw = await redis.get(key);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return { date: key.split(':')[1] || todayString(), events: parsed };
    if (parsed && Array.isArray(parsed.events)) return parsed;
    return null;
  } catch {
    return null;
  }
};

// ---------- INTERNAL: deduplicate across two event lists ----------
const _isSameEvent = (a, b) => {
  if (!a.title || !b.title) return false;

  const sameCountry = (a.country || "") === (b.country || "");
  const sameType    = (a.type   || "") === (b.type   || "");

  const timeDiff =
    Math.abs(new Date(a.timestamp) - new Date(b.timestamp)) / (1000 * 60 * 60);

  const similarity = stringSimilarity.compareTwoStrings(
    a.title.toLowerCase(),
    b.title.toLowerCase()
  );

  return sameCountry && sameType && timeDiff < 24 && similarity > 0.7;
};

const _mergeDedup = (existing, incoming) => {
  const merged = existing.map(e => ({ ...e }));

  for (const evt of incoming) {
    const match = merged.find(m => _isSameEvent(m, evt));
    if (match) {
      const existingUrls = new Set((match.sources || []).map(s => s.url));
      for (const src of (evt.sources || [])) {
        if (!existingUrls.has(src.url)) {
          match.sources.push(src);
          existingUrls.add(src.url);
        }
      }
      match.severity   = Math.max(match.severity, evt.severity);
      match.confidence = (match.confidence + evt.confidence) / 2;
    } else {
      merged.push({ ...evt });
    }
  }

  return merged;
};

// ---------- INTERNAL: write envelope to target date key & index ----------
const _writeEnvelope = async (envelope) => {
  const dateStr = envelope.date || todayString();
  const key = getDailyKey(dateStr);
  const json = JSON.stringify(envelope);

  // Instead of deleting at midnight, we persist it. (Could add EX 30 days if desired later)
  await redis.set(key, json);
  await redis.sadd(ARCHIVE_INDEX, dateStr);

  logger.info(
    `Cache written mapped to date: ${dateStr} — ${envelope.events.length} events archived`,
    "cache"
  );
};

// ---------- PUBLIC: list all archived dates ----------
exports.getAvailableDates = async () => {
  try {
    const dates = await redis.smembers(ARCHIVE_INDEX);
    if (!dates || dates.length === 0) return [todayString()];
    return dates.sort(); // ascending order e.g ["2026-04-18", "2026-04-19"]
  } catch (err) {
    logger.error(`Redis SMEMBERS error: ${err.message}`, "cache");
    return [todayString()];
  }
};

// ---------- PUBLIC: get (accept optional specific YYYY-MM-DD parameter) ----------
exports.getCache = async (targetDate) => {
  try {
    const dateStr = targetDate || todayString();
    const key = getDailyKey(dateStr);
    
    logger.info(`Checking Redis cache for target date: ${dateStr}...`, "cache");

    let envelope = await _readEnvelope(key);
    
    if (envelope) {
      logger.info(`Cache hit (${dateStr}) — ${envelope.events.length} events`, "cache");
      return envelope.events;
    }

    // Attempt cold-start fallback (try finding ANY data if strictly looking for today)
    if (!targetDate || targetDate === todayString()) {
      logger.warn(`No DB records exactly matching ${dateStr}. Searching fallback index.`, "cache");
      const availableDates = await exports.getAvailableDates();
      if (availableDates.length > 0) {
        const fallbackKey = getDailyKey(availableDates[availableDates.length - 1]);
        const fallbackEnvelope = await _readEnvelope(fallbackKey);
        if (fallbackEnvelope && fallbackEnvelope.events) return fallbackEnvelope.events;
      }
    }

    logger.warn(`No valid cache available for date ${dateStr}`, "cache");
    return null;
  } catch (err) {
    logger.error(`Redis GET error: ${err.message}`, "cache");
    return null;
  }
};

// ---------- PUBLIC: merge new events with existing ones, then save ----------
exports.mergeAndSetCache = async (newEvents = []) => {
  try {
    logger.info(
      `mergeAndSetCache called with ${newEvents.length} new events`,
      "cache"
    );

    const today = todayString();

    // Read what is already cached for today
    let existingEvents = [];
    const todayKey = getDailyKey(today);
    const envelope = await _readEnvelope(todayKey);

    if (envelope && envelope.date === today) {
      // Same day — accumulate
      existingEvents = envelope.events || [];
      logger.info(
        `Merging with ${existingEvents.length} existing events from today`,
        "cache"
      );
    } else if (envelope) {
      // Different day — should not happen with dynamic keys, but just in case
      logger.info("New day detected — starting fresh accumulation", "cache");
    }

    // Merge + deduplicate
    const merged = _mergeDedup(existingEvents, newEvents);

    // Sort by score descending (same ordering as news.scorer)
    merged.sort((a, b) => (b.score || 0) - (a.score || 0));

    logger.info(
      `Merged: ${existingEvents.length} existing + ${newEvents.length} new → ${merged.length} unique events`,
      "cache"
    );

    await _writeEnvelope({ date: today, events: merged });
  } catch (err) {
    logger.error(`mergeAndSetCache error: ${err.message}`, "cache");
  }
};

// ---------- PUBLIC: full overwrite (kept for manual use / testing) ----------
exports.setCache = async (data) => {
  try {
    logger.info("setCache (full overwrite) called", "cache");
    await _writeEnvelope({ date: todayString(), events: data });
  } catch (err) {
    logger.error(`setCache error: ${err.message}`, "cache");
  }
};