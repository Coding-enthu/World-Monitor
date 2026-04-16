const OpenAI = require("openai");
const config = require("./env.js");
const logger = require("../utils/logger.js");

const client = new OpenAI({
	apiKey: process.env.GROQ_API_KEY,
	baseURL: process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1",
	timeout: Number(config.LLM.TIMEOUT) || 30000,
});

exports.queryLLM = async (prompt) => {
	try {
		logger.info(`LLM request initiated`, "llm.js");
		const response = await client.responses.create({
			model: config.LLM.MODEL,
			input: prompt,
			temperature: 0.2,
		});

		return response.output_text || "";
	} catch (err) {
		logger.error(`LLM request failed: ${err.message}`, "llm");
		throw err;
	}
};
