const OpenAI = require("openai");
const axios  = require("axios");
const config = require("./env.js");
const logger = require("../utils/logger.js");

// ---------- GROQ CLIENT ----------
const client = new OpenAI({
	apiKey:   process.env.GROQ_API_KEY,
	baseURL:  process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1",
	timeout:  Number(config.LLM.TIMEOUT) || 60000,
});

// ---------- LANGCACHE CONFIG ----------
const LANGCACHE_API_KEY   = process.env.LANGCACHE_API_KEY;
const LANGCACHE_ID        = process.env.LANGCACHE_ID;
const LANGCACHE_BASE      = "https://langcache.redis.io/v1";
const LANGCACHE_THRESHOLD = Number(process.env.LANGCACHE_SIMILARITY_THRESHOLD || 0.90);
const LANGCACHE_ENABLED   = Boolean(LANGCACHE_API_KEY && LANGCACHE_ID);

const langcacheHeaders = () => ({
	"Authorization": `Bearer ${LANGCACHE_API_KEY}`,
	"Content-Type":  "application/json",
});

// ---------- LANGCACHE: semantic search (check before calling LLM) ----------
const langcacheSearch = async (prompt) => {
	if (!LANGCACHE_ENABLED) return null;
	try {
		const res = await axios.post(
			`${LANGCACHE_BASE}/${LANGCACHE_ID}/search`,
			{ prompt, threshold: LANGCACHE_THRESHOLD },
			{ headers: langcacheHeaders(), timeout: 5000 }
		);
		const hit = res.data?.results?.[0];
		if (hit?.response) {
			logger.info(
				`LangCache HIT (similarity: ${(hit.score || 0).toFixed(3)}) — skipping Groq call`,
				"llm.langcache"
			);
			return hit.response;
		}
		return null;
	} catch (err) {
		// Non-fatal: log and fall through to Groq
		logger.warn(`LangCache search failed (will call Groq): ${err.message}`, "llm.langcache");
		return null;
	}
};

// ---------- LANGCACHE: store response after successful Groq call ----------
const langcacheStore = async (prompt, response) => {
	if (!LANGCACHE_ENABLED) return;
	try {
		await axios.post(
			`${LANGCACHE_BASE}/${LANGCACHE_ID}/cache`,
			{ prompt, response },
			{ headers: langcacheHeaders(), timeout: 5000 }
		);
		logger.info("LangCache STORE — response saved for future semantic hits", "llm.langcache");
	} catch (err) {
		// Non-fatal: the response was already returned to caller
		logger.warn(`LangCache store failed (non-fatal): ${err.message}`, "llm.langcache");
	}
};

// ---------- DIRECT GROQ CALL ----------
const callGroq = async (prompt) => {
	logger.info("Groq LLM request initiated", "llm.groq");
	const response = await client.chat.completions.create({
		model: config.LLM.MODEL,
		messages: [
			{
				role: "system",
				content: "You are a geopolitical news classifier. Return only valid JSON arrays as instructed.",
			},
			{
				role: "user",
				content: prompt,
			},
		],
		temperature: 0.2,
		max_tokens:  4096,
	});
	const choice = response.choices?.[0]?.message;
	return choice?.content || choice?.reasoning || "";
};

// ---------- PUBLIC: queryLLM (LangCache → Groq → store) ----------
exports.queryLLM = async (prompt) => {
	// 1. Check semantic cache first
	const cached = await langcacheSearch(prompt);
	if (cached) return cached;

	// 2. Cache miss — call Groq
	try {
		const result = await callGroq(prompt);

		// 3. Persist to LangCache for future similar prompts (fire-and-forget)
		if (result) langcacheStore(prompt, result);

		return result;
	} catch (err) {
		logger.error(`LLM request failed: ${err.message}`, "llm");
		throw err;
	}
};
