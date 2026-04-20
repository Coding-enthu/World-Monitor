require("dotenv").config();

const app = require("./app");
const logger = require("./utils/logger");

const cron = require("node-cron");
const { runNewsPipeline } = require("./jobs/news.job");
const {
	connectEventsRepository,
	closeEventsRepository,
	isDatabaseEnabled,
} = require("./db/events.repository");

const PORT = process.env.PORT || 5000;
const PIPELINE_INTERVAL_MINUTES = Number(process.env.PIPELINE_INTERVAL_MINUTES || 15);
const CRON_PATTERN = `*/${Math.max(1, PIPELINE_INTERVAL_MINUTES)} * * * *`;

// When running under cluster.js, PIPELINE_ENABLED=true on only ONE worker.
// When running standalone (node server.js), pipeline always starts.
const PIPELINE_ENABLED = process.env.PIPELINE_ENABLED !== "false";

// ---------- START SERVER ----------
const server = app.listen(PORT, () => {
	logger.info(`Server running on port ${PORT}`, "server");
});

// ---------- DB CONNECT ----------
(async () => {
	if (!isDatabaseEnabled()) {
		logger.warn("MongoDB is disabled (MONGODB_URI not set). Running cache-only mode.", "server");
		return;
	}

	try {
		await connectEventsRepository();
	} catch (err) {
		logger.error(`MongoDB unavailable, continuing in cache-only mode: ${err.message}`, "server");
	}
})();

// ---------- PIPELINE (only on designated worker) ----------
if (PIPELINE_ENABLED) {
	logger.info(
		`Pipeline enabled on PID ${process.pid} — schedule every ${PIPELINE_INTERVAL_MINUTES} min (cron: "${CRON_PATTERN}")`,
		"server"
	);
	logger.info(
		"Between pipeline runs, all API requests are served from Redis cache / MongoDB only — no external fetching.",
		"server"
	);

	// Run immediately on startup so the cache is populated ASAP
	(async () => {
		logger.info("Initial pipeline run starting...", "server");
		await runNewsPipeline();
		logger.info(`Initial pipeline complete. Next scheduled run in ${PIPELINE_INTERVAL_MINUTES} min.`, "server");
	})();

	cron.schedule(CRON_PATTERN, async () => {
		logger.info(`Cron fired — running pipeline (every ${PIPELINE_INTERVAL_MINUTES} min)`, "cron");
		await runNewsPipeline();
		logger.info("Cron pipeline run complete. Cache + DB updated.", "cron");
	});
} else {
	logger.info(`Pipeline disabled on PID ${process.pid} — API-only worker (reads cache/DB only)`, "server");
}


// ---------- ERROR HANDLING ----------
process.on("unhandledRejection", (err) => {
	logger.error(`Unhandled Rejection: ${err.message}`, "server");
	server.close(() => process.exit(1));
});

process.on("uncaughtException", (err) => {
	logger.error(`Uncaught Exception: ${err.message}`, "server");
	process.exit(1);
});

// ---------- GRACEFUL SHUTDOWN ----------
process.on("SIGINT", () => {
	logger.warn("SIGINT received. Shutting down...", "server");
	server.close(() => {
		closeEventsRepository()
			.then(() => {
				logger.info("Server closed", "server");
				process.exit(0);
			})
			.catch(() => process.exit(1));
	});
});

process.on("SIGTERM", () => {
	logger.warn("SIGTERM received. Shutting down...", "server");
	server.close(() => {
		closeEventsRepository()
			.then(() => {
				logger.info("Server closed", "server");
				process.exit(0);
			})
			.catch(() => process.exit(1));
	});
});
