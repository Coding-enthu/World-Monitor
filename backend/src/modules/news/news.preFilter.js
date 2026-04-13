const logger = require("../../utils/logger.js");

// Strong keywords (must match at least one)
const WHITELIST = [
	"war",
	"military",
	"conflict",
	"attack",
	"bombing",
	"troops",
	"sanctions",
	"invasion",
	"coup",
	"protest",
	"missile",
	"drone",
	"airstrike",
	"ceasefire",
	"nuclear",
	"terror",
	"violence",
	"clashes",
    "opinion"
];

// Weak keywords (must NOT match)
const BLACKLIST = [
	"stock",
	"market",
	"celebrity",
	"movie",
	"film",
	"sports",
	"recipe",
	"entertainment",
	"fashion",
	"review",
	"opinion",
	"interview",
];

// Normalize text safely
const normalizeText = (text) => {
	return (text || "").toLowerCase();
};

// Keyword match helper
const containsKeyword = (text, keywords) => {
	return keywords.some((keyword) => text.includes(keyword));
};

// Main pre-filter function
exports.preFilter = (articles = []) => {
	logger.info("Running pre-filter...", "news.preFilter");

	if (!Array.isArray(articles) || articles.length === 0) {
		logger.warn("No articles received for filtering", "news.preFilter");
		return [];
	}

	const filtered = articles.filter((article) => {
		// ❌ Reject invalid structure early
		if (!article || !article.title || !article.description) {
			return false;
		}

		const title = normalizeText(article.title);
		const description = normalizeText(article.description);

		const combinedText = `${title} ${description}`;

		const hasWhitelist = containsKeyword(combinedText, WHITELIST);
		const hasBlacklist = containsKeyword(combinedText, BLACKLIST);

		// Final decision
		return hasWhitelist && !hasBlacklist;
	});

	logger.info(
		`Filtered ${articles.length} → ${filtered.length}`,
		"news.preFilter",
	);

	// Optional debug (uncomment if needed)
	/*
  logger.debug(
    `Sample filtered titles:\n${filtered
      .slice(0, 3)
      .map(a => "- " + a.title)
      .join("\n")}`,
    "news.preFilter"
  );
  */

	return filtered;
};
