import type { RequestHandler } from './$types';
import { getStore } from '$lib/server/store';
import { cachedProxy, type CtxLike } from '$lib/server/cachedProxy';
import type { PhotoData } from '$lib/photo-schema';

export const prerender = false;

async function fetchPhoto(): Promise<PhotoData> {
  const res = await fetch(
    'https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1&mkt=en-GB',
    { headers: { accept: 'application/json' } }
  );
  if (!res.ok) throw new Error(`bing ${res.status}`);
  const j = (await res.json()) as any;
  const img = j.images?.[0];
  if (!img) throw new Error('no image');
  return {
    url: `https://www.bing.com${img.url}`,
    title: img.title ?? '',
    copyright: img.copyright ?? ''
  };
}

export const GET: RequestHandler = async ({ platform }) => {
  const kv = getStore(platform);
  const ctx: CtxLike = platform?.context ?? { waitUntil: () => {} };
  return cachedProxy<PhotoData>({
    kv,
    ctx,
    key: 'photo',
    ttlMs: 21_600_000, // 6 h (image changes daily)
    fetchUpstream: fetchPhoto
  });
};
