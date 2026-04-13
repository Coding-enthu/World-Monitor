const logger = require("../../utils/logger.js");

// Sources
const { fetchFromNewsAPI } = require("./sources/newsapi/fetcher.js");
const { normalizeNewsAPI } = require("./sources/newsapi/normalizer.js");

// Future:
// const { fetchFromGDELT } = require("./sources/gdelt/fetcher");

exports.aggregateNews = async () => {
	logger.info("Starting news aggregation...", "news.aggregator");

	let allArticles = [];

	// ---------- NewsAPI ----------
	try {
		const raw = await fetchFromNewsAPI();
		const normalized = normalizeNewsAPI(raw);

		allArticles.push(...normalized);
	} catch (err) {
		logger.error("NewsAPI pipeline failed", "news.aggregator");
	}

	// ---------- Future sources ----------
	// Add here later safely

	logger.info(
		`Total aggregated articles: ${allArticles.length}`,
		"news.aggregator",
	);

	return allArticles;
};
