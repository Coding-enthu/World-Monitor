const logger = require("../../utils/logger");
const { getCache } = require("../../cache/weatherCache.service");

exports.getWeatherEvents = async (targetDate) => {
	logger.info(`Request received: weather${targetDate ? ` (Date: ${targetDate})` : ''}`, "weather.service");

	const cached = await getCache(targetDate);

	if (cached) {
		logger.info("Returning cached data", "weather.service");
		return cached;
	}

	// No cache available (rare case)
	logger.warn("No cache available yet", "weather.service");

	return [];
};
