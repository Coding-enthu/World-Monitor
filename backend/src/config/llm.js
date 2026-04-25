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

// ---------- PUBLIC: queryLLM ----------
exports.queryLLM = async (prompt) => {
	try {
		return await callGroq(prompt);
	} catch (err) {
		logger.error(`LLM request failed: ${err.message}`, "llm");
		throw err;
	}
};
