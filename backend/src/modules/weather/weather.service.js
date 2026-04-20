const axios = require("axios");
const logger = require("../../utils/logger");

const OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast";
const CACHE_TTL_MS = 10 * 60 * 1000;

const cache = new Map();

const WORLD_REGIONS = [
	{ id: "new-york", name: "New York", country: "United States", latitude: 40.7128, longitude: -74.006 },
	{ id: "london", name: "London", country: "United Kingdom", latitude: 51.5074, longitude: -0.1278 },
	{ id: "berlin", name: "Berlin", country: "Germany", latitude: 52.52, longitude: 13.41 },
	{ id: "dubai", name: "Dubai", country: "United Arab Emirates", latitude: 25.2048, longitude: 55.2708 },
	{ id: "delhi", name: "Delhi", country: "India", latitude: 28.6139, longitude: 77.209 },
	{ id: "singapore", name: "Singapore", country: "Singapore", latitude: 1.3521, longitude: 103.8198 },
	{ id: "tokyo", name: "Tokyo", country: "Japan", latitude: 35.6762, longitude: 139.6503 },
	{ id: "sydney", name: "Sydney", country: "Australia", latitude: -33.8688, longitude: 151.2093 },
	{ id: "lagos", name: "Lagos", country: "Nigeria", latitude: 6.5244, longitude: 3.3792 },
	{ id: "sao-paulo", name: "Sao Paulo", country: "Brazil", latitude: -23.5505, longitude: -46.6333 },
	{ id: "cape-town", name: "Cape Town", country: "South Africa", latitude: -33.9249, longitude: 18.4241 },
	{ id: "buenos-aires", name: "Buenos Aires", country: "Argentina", latitude: -34.6037, longitude: -58.3816 },
];

const getCached = (key) => {
	const hit = cache.get(key);
	if (!hit) return null;
	if (Date.now() - hit.timestamp > CACHE_TTL_MS) {
		cache.delete(key);
		return null;
	}
	return hit.value;
};

const setCached = (key, value) => {
	cache.set(key, { value, timestamp: Date.now() });
};

const buildForecastParams = ({ latitude, longitude, days = 7, hourly = "temperature_2m" }) => {
	const boundedDays = Math.max(1, Math.min(7, Number(days) || 7));
	const hourlyFields = String(hourly || "temperature_2m")
		.split(",")
		.map((entry) => entry.trim())
		.filter(Boolean)
		.join(",");

	return {
		latitude: Number(latitude),
		longitude: Number(longitude),
		hourly: hourlyFields || "temperature_2m",
		past_days: 0,
		forecast_days: boundedDays,
		current: "temperature_2m,wind_speed_10m,precipitation_probability",
		timezone: "UTC",
	};
};

exports.getWeatherForecast = async (params) => {
	const requestParams = buildForecastParams(params);
	const key = `forecast:${JSON.stringify(requestParams)}`;
	const cached = getCached(key);
	if (cached) return cached;

	const { data } = await axios.get(OPEN_METEO_URL, {
		params: requestParams,
		timeout: 10000,
	});

	const normalized = {
		location: {
			latitude: data.latitude,
			longitude: data.longitude,
			timezone: data.timezone,
		},
		current: data.current || null,
		hourly: data.hourly || {},
		hourly_units: data.hourly_units || {},
	};

	setCached(key, normalized);
	return normalized;
};

const buildRegionSnapshot = async (region) => {
	const forecast = await exports.getWeatherForecast({
		latitude: region.latitude,
		longitude: region.longitude,
		days: 1,
		hourly: "temperature_2m,wind_speed_10m,precipitation_probability",
	});

	const temperatures = forecast.hourly?.temperature_2m || [];
	const maxTemp = temperatures.length > 0 ? Math.max(...temperatures) : null;
	const minTemp = temperatures.length > 0 ? Math.min(...temperatures) : null;

	return {
		...region,
		current: forecast.current,
		summary: {
			min_temp_24h: minTemp,
			max_temp_24h: maxTemp,
		},
	};
};

exports.getWeatherRegions = async () => {
	try {
		const key = "regions:snapshot";
		const cached = getCached(key);
		if (cached) return cached;

		const snapshots = await Promise.all(
			WORLD_REGIONS.map(async (region) => {
				try {
					return await buildRegionSnapshot(region);
				} catch (err) {
					logger.warn(
						`Weather region fetch failed for ${region.name}: ${err.message}`,
						"weather.service",
					);
					return null;
				}
			}),
		);

		const regions = snapshots.filter(Boolean);
		setCached(key, regions);
		return regions;
	} catch (err) {
		logger.error(`Weather regions fetch failed: ${err.message}`, "weather.service");
		return [];
	}
};
