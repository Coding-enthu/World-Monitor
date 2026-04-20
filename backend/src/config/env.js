require("dotenv").config();

const requiredEnv = [
	"PORT",
	"NEWS_API_KEY",
	"LLM_MODEL",
	"GROQ_API_KEY",
];

requiredEnv.forEach((key) => {
	if (!process.env[key]) {
		console.error(`Missing required env variable: ${key}`);
		process.exit(1);
	}
});

module.exports = {
	PORT: process.env.PORT,
	NEWS_API_KEY: process.env.NEWS_API_KEY,

	LLM: {
		MODEL: process.env.LLM_MODEL,
		TIMEOUT: process.env.LLM_TIMEOUT || 30000,
	},

	CACHE: {
		MAX_EVENTS: parseInt(process.env.MAX_EVENTS) || 100,
	},
};
