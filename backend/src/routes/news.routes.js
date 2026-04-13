const express = require("express");
const router = express.Router();

const logger = require("../utils/logger");

const { getGeopoliticalEvents } = require("../modules/news/news.service");

// GET /api/geopolitics
router.get("/geopolitics", async (req, res) => {
	const start = Date.now();

	try {
		logger.info("GET /api/geopolitics", "routes");

		const events = await getGeopoliticalEvents();

		const duration = Date.now() - start;

		logger.info(
			`Response sent (${events.length} events) in ${duration}ms`,
			"routes",
		);

		res.status(200).json({
			success: true,
			count: events.length,
			data: events,
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
