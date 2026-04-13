const logger = require("../../utils/logger");
const { queryLLM } = require("../../config/llm");

// ---------- EXPANDED EVENT TYPES ----------
const ALLOWED_TYPES = [
	// Hard events
	"airstrike",
	"attack",
	"battle",
	"conflict",
	"military",

	// Soft geopolitics
	"war",
	"tension",
	"clash",
	"sanction",
	"diplomacy",
	"negotiation",
	"threat",
	"operation",
];

// ---------- MAJOR EVENT DETECTOR ----------
const isMajorEvent = (title = "") => {
	const keywords = [
		"war",
		"blockade",
		"nuclear",
		"sanction",
		"military",
		"attack",
		"strike",
		"ceasefire",
		"troops",
		"missile",
	];

	const lower = title.toLowerCase();
	return keywords.some((k) => lower.includes(k));
};

// ---------- PROMPT ----------
const buildPrompt = (articles) => {
	const formatted = articles
		.map((a, i) => {
			return `ARTICLE ${i}:
TITLE: ${a.title}
DESCRIPTION: ${a.description}`;
		})
		.join("\n\n");

	return `
You are a geopolitical intelligence system.

Return EXACTLY N JSON objects in an array (same order).

Each:
{
  "relevant": true/false,
  "event_type": "string",
  "country": "string",
  "severity": 1-5,
  "confidence": 0-1
}

Rules:
- No explanation
- No skipping
- No reordering
- If not relevant → { "relevant": false }

Articles:
${formatted}
`;
};

// ---------- JSON EXTRACTION ----------
const extractJSON = (text) => {
	try {
		const match = text.match(/\[[\s\S]*\]/);
		if (!match) return null;
		return JSON.parse(match[0]);
	} catch {
		return null;
	}
};

const normalizeEventType = (type) => type.toLowerCase().replace(/\s+/g, "");

const cleanCountry = (country) => {
	if (!country) return "Global";

	const cleaned = country.split(/[;,]/)[0].trim();
	return cleaned || "Global";
};

// ---------- MAIN ----------
exports.llmFilter = async (articles = []) => {
	logger.info("Running LLM filter...", "news.llmFilter");

	const BATCH_SIZE = 5;
	const results = [];

	for (let i = 0; i < articles.length; i += BATCH_SIZE) {
		const batch = articles.slice(i, i + BATCH_SIZE);

		try {
			const prompt = buildPrompt(batch);

			let raw = await queryLLM(prompt);
			let parsed = extractJSON(raw);

			if (!parsed) {
				raw = await queryLLM(prompt);
				parsed = extractJSON(raw);
			}

			if (!parsed || !Array.isArray(parsed)) {
				throw new Error("Invalid LLM response");
			}

			batch.forEach((original, idx) => {
				const item = parsed[idx];

				if (
					!item ||
					!item.relevant ||
					(!isMajorEvent(original.title) && item.confidence < 0.55) ||
					!item.event_type
				) {
					return;
				}

				const type = normalizeEventType(item.event_type);

				if (!ALLOWED_TYPES.includes(type)) return;

				results.push({
					event_type: type,
					country: cleanCountry(item.country),
					severity: Math.min(Math.max(item.severity || 2, 1), 5),
					confidence: Math.min(
						Math.max(item.confidence || 0.6, 0),
						1,
					),

					title: original.title,
					description: original.description,
					source: original.source,
					url: original.url,
					timestamp: new Date(original.publishedAt).toISOString(),
				});
			});
		} catch (err) {
			logger.error("LLM batch failed", "news.llmFilter");
		}
	}

	logger.info(
		`LLM processed ${articles.length} → ${results.length}`,
		"news.llmFilter",
	);

	return results;
};
