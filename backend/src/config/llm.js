const OpenAI = require("openai");
const axios  = require("axios");
const config = require("./env.js");
const logger = require("../utils/logger.js");

// ---------- GROQ CLIENT POOL ----------
// Read keys from comma-separated GROQ_API_KEYS or fallback to singular
const rawKeys = process.env.GROQ_API_KEYS || process.env.GROQ_API_KEY || "";
const GROQ_KEYS = rawKeys.split(",").map(k => k.trim()).filter(Boolean);

if (GROQ_KEYS.length === 0) {
    logger.warn("No GROQ API keys configured!", "llm.groq");
}

let currentKeyIndex = 0;

const createClient = () => {
    return new OpenAI({
    	apiKey:   GROQ_KEYS[currentKeyIndex],
    	baseURL:  process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1",
    	timeout:  Number(config.LLM.TIMEOUT) || 60000,
    });
};

let client = createClient();

// ---------- LANGCACHE CONFIG ----------
const LANGCACHE_API_KEY   = process.env.LANGCACHE_API_KEY;
const LANGCACHE_ID        = process.env.LANGCACHE_ID;
const LANGCACHE_BASE      = "https://langcache.redis.io/v1";
const LANGCACHE_THRESHOLD = Number(process.env.LANGCACHE_SIMILARITY_THRESHOLD || 0.90);
const LANGCACHE_ENABLED   = Boolean(
	LANGCACHE_API_KEY && 
	LANGCACHE_ID && 
	LANGCACHE_API_KEY !== "undefined" && 
	LANGCACHE_ID !== "undefined" &&
	LANGCACHE_API_KEY.length > 5
);

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

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ---------- DIRECT GROQ CALL ----------
const callGroq = async (prompt, retries = GROQ_KEYS.length + 1) => {
	logger.info(`Groq LLM request initiated (Key #${currentKeyIndex + 1})`, "llm.groq");
	
	let attempt = 0;
	while (attempt <= retries) {
		try {
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
		} catch (error) {
			attempt++;
			
			const isRateLimit = error.status === 429 || (error.message && error.message.toLowerCase().includes("rate limit"));
			const isTimeout = error.code === "ETIMEDOUT" || (error.message && error.message.toLowerCase().includes("timed out"));
			
			if ((isRateLimit || isTimeout) && attempt <= retries) {
				if (isRateLimit && GROQ_KEYS.length > 1) {
					currentKeyIndex = (currentKeyIndex + 1) % GROQ_KEYS.length;
					client = createClient();
					logger.warn(`Groq rate limit hit. Instantly switching to API key #${currentKeyIndex + 1}...`, "llm.groq");
					// Small buffer to let sockets close calmly
					await sleep(500); 
					continue;
				}

				const waitMs = isRateLimit ? 5000 * attempt : 2000;
				logger.warn(`Groq retryable error (Attempt ${attempt}/${retries}). Waiting ${waitMs}ms before retry...`, "llm.groq");
				await sleep(waitMs);
			} else {
				throw error;
			}
		}
	}
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
