const Redis = require("ioredis");
const logger = require("../utils/logger.js");

const redis = new Redis({
	host: process.env.REDIS_HOST || "127.0.0.1",
	port: process.env.REDIS_PORT || 6379,
});

redis.on("connect", () => {
	logger.info("Redis connected", "redis");
});

redis.on("error", (err) => {
	logger.error(`Redis error: ${err.message}`, "redis");
});

module.exports = redis;
