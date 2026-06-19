import type { RequestHandler } from './$types';
import { getStore } from '$lib/server/store';
import { cachedProxy, type CtxLike } from '$lib/server/cachedProxy';
import { mergeConfig, type DashConfig } from '$lib/config-schema';
import type { RainData, RainStep } from '$lib/rain-schema';

export const prerender = false;

const hm = (iso: string): string => (iso.length >= 16 ? iso.slice(11, 16) : iso);

async function fetchRain(lat: number, lon: number): Promise<RainData> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&minutely_15=precipitation,precipitation_probability&forecast_days=1&timezone=auto`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`open-meteo rain ${res.status}`);
  const j = (await res.json()) as any;

  const times: string[] = j.minutely_15?.time ?? [];
  const precip: number[] = j.minutely_15?.precipitation ?? [];
  const prob: number[] = j.minutely_15?.precipitation_probability ?? [];

  // Start at the first step >= now, take the next 8 (~2 hours).
  const now = Date.now();
  let start = times.findIndex((t) => new Date(t).getTime() >= now);
  if (start < 0) start = 0;
  const series: RainStep[] = [];
  for (let i = start; i < Math.min(start + 8, times.length); i++) {
    series.push({ t: hm(times[i]), mm: precip[i] ?? 0, prob: prob[i] ?? 0 });
  }

  const firstWet = series.find((s) => s.mm > 0);
  const firstWetIdx = series.findIndex((s) => s.mm > 0);
  return {
    currentlyRaining: (series[0]?.mm ?? 0) > 0,
    nextRainAt: firstWet ? firstWet.t : null,
    nextRainMinsFromIso: firstWet ? times[start + firstWetIdx] : null,
    maxProb: series.reduce((m, s) => Math.max(m, s.prob), 0),
    series
  };
}

export const GET: RequestHandler = async ({ platform }) => {
  const kv = getStore(platform);
  const raw = await kv.get('config');
  const cfg = mergeConfig(raw ? (JSON.parse(raw) as Partial<DashConfig>) : null);
  const { lat, lon } = cfg.settings.weatherLocation;
  const ctx: CtxLike = platform?.context ?? { waitUntil: () => {} };
  return cachedProxy<RainData>({
    kv,
    ctx,
    key: `rain:${lat.toFixed(3)}:${lon.toFixed(3)}`,
    ttlMs: 900_000, // 15 min — forecast updates ~quarter-hourly; times are absolute
    fetchUpstream: () => fetchRain(lat, lon)
  });
};
