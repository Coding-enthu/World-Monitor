const logger = require("../../utils/logger");
const { getCache } = require("../../cache/cache.service");

exports.getGeopoliticalEvents = async () => {
	logger.info("Request received: geopolitics", "news.service");

	const cached = await getCache();

	if (cached) {
		logger.info("Returning cached data", "news.service");
		return cached;
	}

	// No cache available (rare case)
	logger.warn("No cache available yet", "news.service");

	return [];
};
