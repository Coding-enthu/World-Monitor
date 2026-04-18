const logger = require("../../utils/logger.js");

// Sources
const { fetchFromNewsAPI } = require("./sources/newsapi/fetcher.js");
const { normalizeNewsAPI } = require("./sources/newsapi/normalizer.js");

const { fetchFromGDELT } = require("./sources/gdelt/fetcher.js");
const { normalizeGDELT } = require("./sources/gdelt/normalizer.js");

const { fetchFromGuardian } = require("./sources/guardian/fetcher.js");
const { normalizeGuardian } = require("./sources/guardian/normalizer.js");

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

	// ---------- GDELT ----------
	try {
		const raw = await fetchFromGDELT();
		const normalized = normalizeGDELT(raw);
		allArticles.push(...normalized);
	} catch (err) {
		logger.error("GDELT pipeline failed", "news.aggregator");
	}

	// ---------- The Guardian ----------
	try {
		const raw = await fetchFromGuardian();
		const normalized = normalizeGuardian(raw);
		allArticles.push(...normalized);
	} catch (err) {
		logger.error("Guardian pipeline failed", "news.aggregator");
	}

	logger.info(
		`Total aggregated articles: ${allArticles.length}`,
		"news.aggregator",
	);

	return allArticles;
};
