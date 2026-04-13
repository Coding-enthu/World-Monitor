const app = require("./app");
const logger = require("./utils/logger");

const cron = require("node-cron");
const { runNewsPipeline } = require("./jobs/news.job");

const PORT = process.env.PORT || 5000;

// ---------- START SERVER ----------
const server = app.listen(PORT, () => {
	logger.info(`Server running on port ${PORT}`, "server");
});

// ---------- RUN FIRST TIME (IMPORTANT) ----------
(async () => {
	logger.info("Initial pipeline run...", "server");
	await runNewsPipeline();
})();

// ---------- CRON JOB (EVERY 5 MIN) ----------
cron.schedule("*/5 * * * *", async () => {
	logger.info("Cron triggered", "cron");
	await runNewsPipeline();
});

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
		logger.info("Server closed", "server");
		process.exit(0);
	});
});

process.on("SIGTERM", () => {
	logger.warn("SIGTERM received. Shutting down...", "server");
	server.close(() => {
		logger.info("Server closed", "server");
		process.exit(0);
	});
});
