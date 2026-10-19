export const WEATHER_REFRESH_MS = 15 * 60 * 1000;
export const OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast";

const snowCodes = new Set([71, 73, 75, 77, 85, 86]);
const rainCodes = new Set([
  51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 97, 99,
]);
const weatherCodes = new Set([0, 1, 2, 3, 45, 48, ...snowCodes, ...rainCodes]);

export function weatherCoordinates({ latitude, longitude }) {
  if (
    !Number.isFinite(latitude) ||
    Math.abs(latitude) > 90 ||
    !Number.isFinite(longitude) ||
    Math.abs(longitude) > 180
  )
    throw new Error("Localização inválida.");
  // About 1 km precision is enough for the weather model. Never persist GPS data.
  return { latitude: latitude.toFixed(2), longitude: longitude.toFixed(2) };
}

export function parseWeather(data, now = Date.now()) {
  const current = data?.current;
  if (
    !current ||
    !weatherCodes.has(current.weather_code) ||
    !Number.isFinite(current.time) ||
    Math.abs(now - current.time * 1000) > 90 * 60 * 1000 ||
    ["rain", "showers", "snowfall"].some(
      (key) => !Number.isFinite(current[key]) || current[key] < 0,
    )
  )
    throw new Error("Dados meteorológicos indisponíveis ou desatualizados.");
  const type =
    current.snowfall > 0 || snowCodes.has(current.weather_code)
      ? "snow"
      : current.rain + current.showers > 0 ||
          rainCodes.has(current.weather_code)
        ? "rain"
        : "none";
  return { type, observedAt: current.time * 1000 };
}

export async function fetchWeather(
  coordinates,
  {
    signal,
    fetchImpl = fetch,
    endpoint = import.meta.env?.VITE_WEATHER_API_URL || OPEN_METEO_URL,
  } = {},
) {
  const url = new URL(endpoint);
  for (const [key, value] of Object.entries(coordinates))
    url.searchParams.set(key, value);
  url.searchParams.set("current", "weather_code,rain,showers,snowfall");
  url.searchParams.set("timeformat", "unixtime");
  url.searchParams.set("forecast_days", "1");
  const response = await fetchImpl(url, { signal, credentials: "omit" });
  if (!response.ok) throw new Error("Não foi possível consultar o clima.");
  return parseWeather(await response.json());
}
