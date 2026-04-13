const logger = require("../../utils/logger");

const COUNTRY_MAP = {
	us: "United States",
	usa: "United States",
	uk: "United Kingdom",
	iran: "Iran",
	israel: "Israel",
	lebanon: "Lebanon",
	russia: "Russia",
	china: "China",
	gaza: "Gaza",
};

const COORDS_MAP = {
	"United States": [37.1, -95.7],
	"United Kingdom": [55.3, -3.4],
	Iran: [32.4, 53.7],
	Israel: [31.0, 35.0],
	Lebanon: [33.8, 35.8],
	Gaza: [31.5, 34.4],
	Russia: [61.5, 105.3],
	China: [35.8, 104.1],
};

const normalizeCountry = (country) => {
	if (!country) return "Global";
	return COUNTRY_MAP[country.toLowerCase()] || country;
};

exports.transformEvents = (events = []) => {
	logger.info("Transforming events...", "news.transformer");

	const transformed = events
		.map((e, i) => {
			const country = normalizeCountry(e.country);
			const coords = COORDS_MAP[country] || null;

			return {
				id: `evt_${Date.now()}_${i}`,

				type: e.event_type,
				country,
				coords,

				severity: e.severity,
				confidence: e.confidence,
				timestamp: e.timestamp,

				title: e.title,
				description: e.description,

				sources: [
					{
						name: e.source,
						url: e.url,
					},
				],
			};
		})
		.filter(Boolean);

	logger.info(
		`Transformed ${events.length} → ${transformed.length}`,
		"news.transformer",
	);

	return transformed;
};
