const axios = require("axios");
const config = require("../../../../config/env.js");
const logger = require("../../../../utils/logger.js");

const NEWS_URL = "https://newsapi.org/v2/everything";

exports.fetchFromNewsAPI = async () => {
	try {
		logger.info("Fetching from NewsAPI...", "newsapi.fetcher");

		const res = await axios.get(NEWS_URL, {
			params: {
				q: "war OR military OR conflict OR sanctions OR troops OR attack",
				language: "en",
				sortBy: "publishedAt",
				pageSize: 50,
				apiKey: config.NEWS_API_KEY,
			},
		});

		const articles = res.data.articles || [];

		logger.info(
			`NewsAPI returned ${articles.length} articles`,
			"newsapi.fetcher",
		);

		return articles;
	} catch (err) {
		logger.error(`NewsAPI fetch failed: ${err.message}`, "newsapi.fetcher");

		return []; // fail gracefully
	}
};
