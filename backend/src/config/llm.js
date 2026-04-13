const axios = require("axios");
const config = require("./env.js");
const logger = require("../utils/logger.js");

const client = axios.create({
	baseURL: config.LLM.URL,
	timeout: config.LLM.TIMEOUT,
});

exports.queryLLM = async (prompt) => {
	try {
		logger.info(`LLM request initiated`, "llm.js");
		const res = await client.post("", {
			model: config.LLM.MODEL,
			prompt,
			stream: false,
			options: {
				temperature: 0.2,
			},
		});

		return res.data?.response || "";
	} catch (err) {
		logger.error(`LLM request failed: ${err.message}`, "llm");
		throw err;
	}
};
