import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getStore } from '$lib/server/store';
import { mergeConfig, type DashConfig } from '$lib/config-schema';

// API routes are dynamic — opt out of the global prerender (set in +layout.ts).
export const prerender = false;

const KEY = 'config';

export const GET: RequestHandler = async ({ platform }) => {
  const kv = getStore(platform);
  const raw = await kv.get(KEY);
  const cfg = mergeConfig(raw ? (JSON.parse(raw) as Partial<DashConfig>) : null);
  return json(cfg);
};

export const PUT: RequestHandler = async ({ request, platform }) => {
  const kv = getStore(platform);
  const body = (await request.json()) as Partial<DashConfig>;
  // Merge over defaults so a partial write can't corrupt the shape.
  const cfg = mergeConfig(body);
  await kv.put(KEY, JSON.stringify(cfg));
  return json(cfg);
};
