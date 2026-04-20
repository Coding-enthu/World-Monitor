/**
 * llm-pool.js — Multi-provider LLM with automatic failover
 *
 * Supports Groq (OpenAI-compatible) and Google Gemini.
 * Tries the primary provider first; on quota/rate-limit errors,
 * automatically falls back to the secondary provider.
 * Tracks cooldown periods so exhausted providers aren't retried
 * until their quota resets.
 */

const OpenAI = require("openai");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const logger = require("../utils/logger");

// ---------- PROVIDER CONFIG ----------
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GROQ_MODEL = process.env.LLM_MODEL || "llama-3.3-70b-versatile";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";
const LLM_TIMEOUT = Number(process.env.LLM_TIMEOUT || 30000);

// Cooldown: how long (ms) to skip a provider after a quota error
const QUOTA_COOLDOWN_MS = Number(process.env.LLM_QUOTA_COOLDOWN_MS || 60000);

// ---------- CLIENTS ----------
let groqClient = null;
let geminiClient = null;

if (GROQ_API_KEY) {
	groqClient = new OpenAI({
		apiKey: GROQ_API_KEY,
		baseURL: process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1",
		timeout: LLM_TIMEOUT,
	});
}

if (GEMINI_API_KEY) {
	geminiClient = new GoogleGenerativeAI(GEMINI_API_KEY);
}

// ---------- QUOTA STATE ----------
const providerState = {
	groq: { cooldownUntil: 0 },
	gemini: { cooldownUntil: 0 },
};

const isAvailable = (name) => {
	if (name === "groq" && !groqClient) return false;
	if (name === "gemini" && !geminiClient) return false;
	return Date.now() >= providerState[name].cooldownUntil;
};

const markQuotaExhausted = (name) => {
	providerState[name].cooldownUntil = Date.now() + QUOTA_COOLDOWN_MS;
	logger.warn(
		`LLM provider "${name}" quota exhausted — cooldown for ${QUOTA_COOLDOWN_MS / 1000}s`,
		"llm-pool"
	);
};

const isQuotaError = (err) => {
	const status = err?.status || err?.response?.status || err?.code;
	const msg = (err?.message || "").toLowerCase();
	return (
		status === 429 ||
		status === 503 ||
		msg.includes("rate limit") ||
		msg.includes("quota") ||
		msg.includes("resource exhausted") ||
		msg.includes("too many requests")
	);
};

// ---------- GROQ CALL ----------
const callGroq = async (messages, { maxTokens = 2048, temperature = 0.3 } = {}) => {
	const response = await groqClient.chat.completions.create({
		model: GROQ_MODEL,
		messages,
		max_tokens: maxTokens,
		temperature,
	});
	const choice = response.choices?.[0]?.message;
	return {
		content: choice?.content || choice?.reasoning || "",
		provider: "groq",
		model: GROQ_MODEL,
		usage: response.usage,
	};
};

// ---------- GEMINI CALL ----------
const callGemini = async (messages, { maxTokens = 2048, temperature = 0.3 } = {}) => {
	const model = geminiClient.getGenerativeModel({
		model: GEMINI_MODEL,
		generationConfig: {
			maxOutputTokens: maxTokens,
			temperature,
		},
	});

	// Convert OpenAI-style messages to Gemini format
	// Gemini uses "user" and "model" roles, and a system instruction
	const systemMsg = messages.find((m) => m.role === "system");
	const chatMessages = messages
		.filter((m) => m.role !== "system")
		.map((m) => ({
			role: m.role === "assistant" ? "model" : "user",
			parts: [{ text: m.content }],
		}));

	const chat = model.startChat({
		history: chatMessages.slice(0, -1),
		systemInstruction: systemMsg ? { parts: [{ text: systemMsg.content }] } : undefined,
	});

	const lastMsg = chatMessages[chatMessages.length - 1];
	const result = await chat.sendMessage(lastMsg.parts[0].text);
	const text = result.response.text();

	return {
		content: text || "",
		provider: "gemini",
		model: GEMINI_MODEL,
		usage: { prompt_tokens: 0, completion_tokens: 0 }, // Gemini doesn't expose token counts like OpenAI
	};
};

// ---------- MAIN ENTRY POINT ----------
/**
 * Send a chat completion request with automatic provider failover.
 *
 * @param {Array<{role: string, content: string}>} messages - OpenAI-format messages
 * @param {Object} opts - { maxTokens, temperature }
 * @returns {Promise<{content: string, provider: string, model: string}>}
 */
exports.chat = async (messages, opts = {}) => {
	const providers = [
		{ name: "groq", fn: callGroq },
		{ name: "gemini", fn: callGemini },
	];

	const errors = [];

	for (const { name, fn } of providers) {
		if (!isAvailable(name)) {
			logger.info(`LLM pool: skipping "${name}" (cooldown active)`, "llm-pool");
			continue;
		}

		try {
			logger.info(`LLM pool: trying "${name}"`, "llm-pool");
			const result = await fn(messages, opts);
			logger.info(
				`LLM pool: "${name}" responded (${result.content.length} chars)`,
				"llm-pool"
			);
			return result;
		} catch (err) {
			logger.error(`LLM pool: "${name}" failed — ${err.message}`, "llm-pool");
			if (isQuotaError(err)) {
				markQuotaExhausted(name);
			}
			errors.push({ name, error: err.message });
		}
	}

	// All providers failed
	const msg = errors.map((e) => `${e.name}: ${e.error}`).join("; ");
	throw new Error(`All LLM providers failed — ${msg}`);
};

/**
 * Get the status of all providers.
 */
exports.getProviderStatus = () => {
	return {
		groq: {
			configured: !!GROQ_API_KEY,
			available: isAvailable("groq"),
			model: GROQ_MODEL,
			cooldownUntil: providerState.groq.cooldownUntil,
		},
		gemini: {
			configured: !!GEMINI_API_KEY,
			available: isAvailable("gemini"),
			model: GEMINI_MODEL,
			cooldownUntil: providerState.gemini.cooldownUntil,
		},
	};
};
