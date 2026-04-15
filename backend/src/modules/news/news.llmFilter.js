const logger = require("../../utils/logger");
const { queryLLM } = require("../../config/llm");

// ---------- EXPANDED EVENT TYPES ----------
const ALLOWED_TYPES = [
	// Armed conflict
	"airstrike",
	"attack",
	"battle",
	"conflict",
	"military",
	"war",
	"clash",
	"bombing",
	"shelling",
	"invasion",
	"siege",
	"insurgency",
	"assassination",
	"ambush",
	"hostage",

	// Geopolitics & diplomacy
	"sanction",
	"diplomacy",
	"negotiation",
	"threat",
	"operation",
	"tension",
	"summit",
	"treaty",
	"alliance",
	"embargo",
	"blockade",
	"espionage",

	// Political events
	"coup",
	"election",
	"protest",
	"uprising",
	"riot",
	"crackdown",
	"referendum",
	"regime change",

	// Humanitarian
	"crisis",
	"humanitarian",
	"refugee",
	"displacement",
	"famine",
	"evacuation",

	// Cyber & intelligence
	"cyberattack",
	"hacking",
	"surveillance",

	// Trade & economic
	"tradewar",
	"tariff",
	"armsdeal",
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
		"invasion",
		"crisis",
		"coup",
		"bomb",
		"killed",
		"dead",
		"explosion",
		"shoot",
		"terror",
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

	return `You are a geopolitical intelligence classifier. Your job is to identify articles related to:
- Armed conflicts, wars, military operations, airstrikes, bombings
- Diplomacy, sanctions, treaties, summits, negotiations
- Political instability: coups, protests, uprisings, elections, crackdowns
- Humanitarian crises, refugee movements, famines
- Terrorism, insurgency, espionage, cyber attacks
- Trade wars, arms deals, embargoes, blockades

Be INCLUSIVE — if an article has ANY geopolitical relevance, mark it as relevant.

Return EXACTLY ${articles.length} JSON objects in an array (same order as input).

Each object:
{
  "relevant": true/false,
  "event_type": "string (e.g. attack, diplomacy, protest, sanction, conflict, crisis, election, coup, tension, military, war, humanitarian, cyberattack, tariff)",
  "country": "string (primary country involved)",
  "severity": 1-5,
  "confidence": 0.0-1.0
}

Rules:
- Return ONLY the JSON array, no explanation
- Do not skip any article
- Do not reorder articles
- If not geopolitically relevant → { "relevant": false }
- When in doubt, mark as relevant with lower confidence

Articles:
${formatted}`;
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

const normalizeEventType = (type) =>
	type.toLowerCase().replace(/[\s_-]+/g, "");

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

				if (!item || !item.relevant || !item.event_type) {
					return;
				}

				// Lower threshold: only skip non-major events with very low confidence
				if (!isMajorEvent(original.title) && item.confidence < 0.35) {
					return;
				}

				const type = normalizeEventType(item.event_type);

				// Accept the event even if type isn't in our list — use LLM's type as-is
				const finalType = ALLOWED_TYPES.includes(type) ? type : type;

				results.push({
					event_type: finalType,
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
