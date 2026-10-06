export const read = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key));
  } catch {
    return null;
  }
};
export const save = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* Private browsing / quota: clock still works. */
  }
};
export const cacheKey = (loc) =>
  `utsuroi-weather:${loc.latitude}:${loc.longitude}`;
export async function getJSON(url, signal) {
  const response = await fetch(url, {
    signal: signal ?? AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}
export async function forecast(loc, signal) {
  const query = new URLSearchParams({
    latitude: loc.latitude,
    longitude: loc.longitude,
    timezone: loc.timezone,
    timeformat: "unixtime",
    forecast_days: "3",
    past_days: "1",
    current: "temperature_2m,relative_humidity_2m,pressure_msl,weather_code,is_day",
    hourly: "temperature_2m,pressure_msl,weather_code,precipitation_probability,is_day",
    daily: "sunrise,sunset,temperature_2m_max,temperature_2m_min",
  });
  const data = await getJSON(
    `https://api.open-meteo.com/v1/forecast?${query}`,
    signal,
  );
  if (
    !data.current ||
    !Array.isArray(data.hourly?.time) ||
    !Array.isArray(data.daily?.time)
  )
    throw new Error("Invalid weather response");
  return data;
}
export async function searchCities(name) {
  const data = await getJSON(
    `https://geocoding-api.open-meteo.com/v1/search?${new URLSearchParams({ name, count: "6", language: "ja", format: "json" })}`,
  );
  return (data.results ?? [])
    .filter((x) => x.timezone)
    .map((x) => ({
      name: x.name,
      latitude: x.latitude,
      longitude: x.longitude,
      timezone: x.timezone,
      detail: [x.admin1, x.country].filter(Boolean).join("・"),
    }));
}
