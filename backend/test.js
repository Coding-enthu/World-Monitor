const { aggregateNews } = require("./src/modules/news/news.aggregator");
const { preFilter } = require("./src/modules/news/news.preFilter");
const { llmFilter } = require("./src/modules/news/news.llmFilter");
const { transformEvents } = require("./src/modules/news/news.transformer");
const { deduplicateEvents } = require("./src/modules/news/news.deduplicator");

(async () => {
	const raw = await aggregateNews();
	const filtered = preFilter(raw);
	const llm = await llmFilter(filtered);
	const transformed = transformEvents(llm);
	const finalEvents = deduplicateEvents(transformed);

	console.log("\nFINAL EVENTS:", finalEvents.length);
	console.log("\nSample:");
	console.log(finalEvents.slice(0, 2));
})();
