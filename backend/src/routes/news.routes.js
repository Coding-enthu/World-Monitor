const express = require("express");
const router = express.Router();

const logger = require("../utils/logger");

const { getGeopoliticalEvents } = require("../modules/news/news.service");

// ---------- CATEGORY MAPPING ----------
const CATEGORY_MAP = {
	// Armed Conflict
	war: "Armed Conflict",
	attack: "Armed Conflict",
	airstrike: "Armed Conflict",
	battle: "Armed Conflict",
	conflict: "Armed Conflict",
	clash: "Armed Conflict",
	bombing: "Armed Conflict",
	shelling: "Armed Conflict",
	invasion: "Armed Conflict",
	siege: "Armed Conflict",
	insurgency: "Armed Conflict",
	ambush: "Armed Conflict",
	military: "Armed Conflict",
	hostage: "Armed Conflict",

	// Politics
	policy: "Politics",
	legislation: "Politics",
	reform: "Politics",
	law: "Politics",
	election: "Politics",
	coup: "Politics",
	protest: "Politics",
	uprising: "Politics",
	riot: "Politics",
	crackdown: "Politics",
	referendum: "Politics",
	"regime change": "Politics",

	// Diplomacy
	diplomacy: "Diplomacy",
	negotiation: "Diplomacy",
	summit: "Diplomacy",
	treaty: "Diplomacy",
	alliance: "Diplomacy",
	sanction: "Diplomacy & Sanctions",
	embargo: "Diplomacy & Sanctions",
	blockade: "Diplomacy & Sanctions",
	tension: "Diplomacy",
	threat: "Diplomacy",

	// Terrorism & Security
	assassination: "Terrorism & Security",
	espionage: "Terrorism & Security",
	cyberattack: "Terrorism & Security",
	hacking: "Terrorism & Security",
	surveillance: "Terrorism & Security",
	operation: "Terrorism & Security",

	// Humanitarian
	crisis: "Humanitarian",
	humanitarian: "Humanitarian",
	refugee: "Humanitarian",
	displacement: "Humanitarian",
	famine: "Humanitarian",
	evacuation: "Humanitarian",

	// Economic & Trade
	tradewar: "Economic & Trade",
	tariff: "Economic & Trade",
	armsdeal: "Economic & Trade",
};

// Fallback category ordering for display
const CATEGORY_ORDER = [
	"Armed Conflict",
	"Terrorism & Security",
	"Politics",
	"Diplomacy",
	"Diplomacy & Sanctions",
	"Humanitarian",
	"Economic & Trade",
	"Other",
];

const categorizeEvents = (events) => {
	const grouped = {};

	for (const event of events) {
		const category =
			CATEGORY_MAP[event.type] || CATEGORY_MAP[event.event_type] || "Other";

		if (!grouped[category]) {
			grouped[category] = [];
		}

		grouped[category].push(event);
	}

	// Return ordered object
	const result = {};
	for (const cat of CATEGORY_ORDER) {
		if (grouped[cat]) {
			result[cat] = grouped[cat];
		}
	}

	return result;
};

// GET /api/geopolitics
router.get("/geopolitics", async (req, res) => {
	const start = Date.now();

	try {
		logger.info("GET /api/geopolitics", "routes");

		const events = await getGeopoliticalEvents();
		const data = categorizeEvents(events);

		const duration = Date.now() - start;

		logger.info(
			`Response sent (${events.length} events) in ${duration}ms`,
			"routes",
		);

		res.status(200).json({
			success: true,
			count: events.length,
			data,
		});
	} catch (err) {
		logger.error(`Route error: ${err.message}`, "routes");

		res.status(500).json({
			success: false,
			error: "Internal Server Error",
		});
	}
});

module.exports = router;
