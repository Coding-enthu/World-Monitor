const redis = require("../config/redis.js");
const logger = require("../utils/logger.js");
const stringSimilarity = require("string-similarity");

const MAIN_KEY  = "geopolitics_events";
const BACKUP_KEY = "geopolitics_events_backup";

// Main cache lives until midnight of the current day.
// We compute seconds remaining until 00:00 local time.
const secondsUntilMidnight = () => {
  const now = new Date();
  const midnight = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1, // next calendar day
    0, 0, 0, 0
  );
  return Math.max(Math.floor((midnight - now) / 1000), 1);
};

// Returns today's date as "YYYY-MM-DD" in local time.
const todayString = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm   = String(d.getMonth() + 1).padStart(2, "0");
  const dd   = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

// ---------- INTERNAL: read raw envelope { date, events } ----------
const _readEnvelope = async (key) => {
  const raw = await redis.get(key);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    // Support both old format (bare array) and new format ({ date, events })
    if (Array.isArray(parsed)) return { date: todayString(), events: parsed };
    if (parsed && Array.isArray(parsed.events)) return parsed;
    return null;
  } catch {
    return null;
  }
};

// ---------- INTERNAL: deduplicate across two event lists ----------
// Uses the same criteria as news.deduplicator but with a wider time window
// (up to 24 h) so cross-run duplicates within the same day are caught.
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

  // Same country + type + within 24 h + title similarity > 0.3
  return sameCountry && sameType && timeDiff < 24 && similarity > 0.3;
};

const _mergeDedup = (existing, incoming) => {
  const merged = existing.map(e => ({ ...e })); // shallow-clone existing

  for (const evt of incoming) {
    const match = merged.find(m => _isSameEvent(m, evt));
    if (match) {
      // Merge sources (deduplicate by URL)
      const existingUrls = new Set((match.sources || []).map(s => s.url));
      for (const src of (evt.sources || [])) {
        if (!existingUrls.has(src.url)) {
          match.sources.push(src);
          existingUrls.add(src.url);
        }
      }
      // Keep higher severity & average confidence
      match.severity   = Math.max(match.severity, evt.severity);
      match.confidence = (match.confidence + evt.confidence) / 2;
      // Re-score inline so the score stays consistent after merge
    } else {
      merged.push({ ...evt });
    }
  }

  return merged;
};

// ---------- INTERNAL: write envelope to both keys ----------
const _writeEnvelope = async (envelope) => {
  const json = JSON.stringify(envelope);
  const ttl  = secondsUntilMidnight();

  // Main key: expires at midnight
  await redis.set(MAIN_KEY, json, "EX", ttl);

  // Backup key: no expiry (serves as cold-start fallback)
  await redis.set(BACKUP_KEY, json);

  logger.info(
    `Cache written — ${envelope.events.length} events, TTL ${ttl}s (expires at midnight)`,
    "cache"
  );
};

// ---------- PUBLIC: get (returns bare event array for backward compat) ----------
exports.getCache = async () => {
  try {
    logger.info("Checking Redis cache...", "cache");

    let envelope = await _readEnvelope(MAIN_KEY);
    if (envelope) {
      // Discard if it somehow survived past midnight
      if (envelope.date === todayString()) {
        logger.info(`Cache hit (main) — ${envelope.events.length} events`, "cache");
        return envelope.events;
      }
      logger.warn("Stale main cache (different day) — discarding", "cache");
    }

    logger.warn("Main cache miss, checking backup...", "cache");
    envelope = await _readEnvelope(BACKUP_KEY);
    if (envelope) {
      if (envelope.date === todayString()) {
        logger.warn(`Serving backup cache — ${envelope.events.length} events`, "cache");
        return envelope.events;
      }
      logger.warn("Stale backup cache (different day) — discarding", "cache");
    }

    logger.warn("No valid cache available", "cache");
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

    // Read what is already cached
    let existingEvents = [];
    const envelope = await _readEnvelope(MAIN_KEY)
                  || await _readEnvelope(BACKUP_KEY);

    if (envelope && envelope.date === today) {
      // Same day — accumulate
      existingEvents = envelope.events;
      logger.info(
        `Merging with ${existingEvents.length} existing events from today`,
        "cache"
      );
    } else if (envelope) {
      // Different day — reset
      logger.info("New day detected — resetting accumulated events", "cache");
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