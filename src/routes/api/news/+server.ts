import type { RequestHandler } from './$types';
import { getStore } from '$lib/server/store';
import { cachedProxy, type CtxLike } from '$lib/server/cachedProxy';
import { fetchFeed, type NewsItem } from '$lib/server/rss';
import { mergeConfig, type DashConfig } from '$lib/config-schema';

export const prerender = false;

const PER_SOURCE = 15; // newest N kept per feed, so each source tab is full

async function aggregate(kv: { get(k: string): Promise<string | null> }): Promise<NewsItem[]> {
  const raw = await kv.get('config');
  const cfg = mergeConfig(raw ? (JSON.parse(raw) as Partial<DashConfig>) : null);
  const results = await Promise.all(cfg.settings.rssFeeds.map(fetchFeed));
  // Keep the newest PER_SOURCE from EACH feed (feeds arrive newest-first), then
  // merge newest-first for the 'all' tab. Source tabs filter this same pool.
  const perSource = results.flatMap((items) => items.filter((i) => i.title).slice(0, PER_SOURCE));
  return perSource.sort((a, b) => b.ts - a.ts);
}

export const GET: RequestHandler = async ({ platform }) => {
  const kv = getStore(platform);
  const ctx: CtxLike = platform?.context ?? { waitUntil: () => {} };
  return cachedProxy<NewsItem[]>({
    kv,
    ctx,
    key: 'news',
    ttlMs: 900_000, // 15 min
    fetchUpstream: () => aggregate(kv)
  });
};
