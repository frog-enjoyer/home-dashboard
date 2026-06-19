// Shared /api proxy with stale-while-revalidate over Cloudflare KV.
// Decided in eng review: one helper behind every /api route (DRY), SWR so the
// user never waits on a slow upstream, and the heavy work (e.g. .ics RRULE
// expansion) happens inside fetchUpstream during the background refresh.
//
//   request ──▶ KV.get(key)
//                 ├─ fresh (age ≤ ttl) ──────────────▶ 200  x-cache: HIT
//                 ├─ stale (age > ttl) ─┬─ return now ▶ 200  x-cache: STALE
//                 │                     └─ ctx.waitUntil(refresh)
//                 └─ miss ─┬─ fetchUpstream ok ───────▶ 200  x-cache: MISS
//                          └─ fetchUpstream throws ───▶ 502  {error}

export interface KVLike {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
}
export interface CtxLike {
  waitUntil(p: Promise<unknown>): void;
}

interface Entry<T> {
  at: number;
  data: T;
}

function jsonResponse(data: unknown, cache: 'HIT' | 'STALE' | 'MISS'): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'content-type': 'application/json', 'x-cache': cache }
  });
}

async function writeThrough<T>(
  kv: KVLike,
  key: string,
  fetchUpstream: () => Promise<T>
): Promise<T> {
  const data = await fetchUpstream();
  await kv.put(key, JSON.stringify({ at: Date.now(), data } satisfies Entry<T>));
  return data;
}

export async function cachedProxy<T>(opts: {
  kv: KVLike;
  ctx: CtxLike;
  key: string;
  ttlMs: number;
  fetchUpstream: () => Promise<T>;
  /** Injectable clock for tests. */
  now?: () => number;
}): Promise<Response> {
  const { kv, ctx, key, ttlMs, fetchUpstream } = opts;
  const now = opts.now ?? Date.now;

  const raw = await kv.get(key);
  if (raw) {
    const entry = JSON.parse(raw) as Entry<T>;
    const age = now() - entry.at;
    if (age <= ttlMs) {
      return jsonResponse(entry.data, 'HIT');
    }
    // Stale: serve immediately, refresh in the background. A failed refresh
    // must not surface — we keep serving the last good value.
    ctx.waitUntil(writeThrough(kv, key, fetchUpstream).catch(() => undefined));
    return jsonResponse(entry.data, 'STALE');
  }

  // Cold miss: nothing cached, we have to fetch now.
  try {
    const data = await writeThrough(kv, key, fetchUpstream);
    return jsonResponse(data, 'MISS');
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 502,
      headers: { 'content-type': 'application/json' }
    });
  }
}
