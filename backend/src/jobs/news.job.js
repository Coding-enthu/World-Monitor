const logger = require("../utils/logger");

const {
  aggregateNews
} = require("../modules/news/news.aggregator");
const { preFilter } = require("../modules/news/news.preFilter");
const { llmFilter } = require("../modules/news/news.llmFilter");
const { transformEvents } = require("../modules/news/news.transformer");
const { deduplicateEvents } = require("../modules/news/news.deduplicator");
const { scoreEvents } = require("../modules/news/news.scorer");

const { mergeAndSetCache } = require("../cache/cache.service");

exports.runNewsPipeline = async () => {
  logger.info("Running scheduled news pipeline...", "job");

  try {
    const raw = await aggregateNews();
    const filtered = preFilter(raw);
    const llm = await llmFilter(filtered);
    const transformed = transformEvents(llm);
    const deduped = deduplicateEvents(transformed);
    const scored = scoreEvents(deduped);

    await mergeAndSetCache(scored);

    logger.info("News pipeline completed successfully", "job");
  } catch (err) {
    logger.error(`Job failed: ${err.message}`, "job");
  }
};