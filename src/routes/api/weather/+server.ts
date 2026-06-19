import type { RequestHandler } from './$types';
import { getStore } from '$lib/server/store';
import { cachedProxy, type CtxLike } from '$lib/server/cachedProxy';
import type { WeatherData } from '$lib/weather-schema';

export const prerender = false;

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

async function fetchOpenMeteo(lat: number, lon: number): Promise<WeatherData> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,apparent_temperature,weather_code` +
    `&hourly=temperature_2m&forecast_hours=12` +
    `&daily=temperature_2m_max,temperature_2m_min,weather_code&forecast_days=4&timezone=auto`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`open-meteo ${res.status}`);
  const j = (await res.json()) as any;
  return {
    tempC: Math.round(j.current.temperature_2m),
    apparentC: Math.round(j.current.apparent_temperature),
    code: j.current.weather_code,
    hi: Math.round(j.daily.temperature_2m_max[0]),
    lo: Math.round(j.daily.temperature_2m_min[0]),
    hourly: (j.hourly.temperature_2m as number[]).slice(0, 12),
    daily: (j.daily.time as string[]).slice(1, 4).map((t: string, i: number) => ({
      day: DAYS[new Date(t).getDay()],
      hi: Math.round(j.daily.temperature_2m_max[i + 1]),
      lo: Math.round(j.daily.temperature_2m_min[i + 1])
    }))
  };
}

export const GET: RequestHandler = async ({ url, platform }) => {
  const lat = Number(url.searchParams.get('lat') ?? '51.5072');
  const lon = Number(url.searchParams.get('lon') ?? '-0.1276');
  const kv = getStore(platform);
  const ctx: CtxLike = platform?.context ?? { waitUntil: () => {} };
  return cachedProxy<WeatherData>({
    kv,
    ctx,
    key: `weather:${lat.toFixed(3)}:${lon.toFixed(3)}`,
    ttlMs: 600_000, // 10 min
    fetchUpstream: () => fetchOpenMeteo(lat, lon)
  });
};
