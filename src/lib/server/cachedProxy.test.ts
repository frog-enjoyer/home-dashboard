import { describe, it, expect, vi } from 'vitest';
import { cachedProxy, type KVLike, type CtxLike } from './cachedProxy';

function fakeKV(initial: Record<string, string> = {}): KVLike & { store: Record<string, string> } {
  const store = { ...initial };
  return {
    store,
    get: async (k) => (k in store ? store[k] : null),
    put: async (k, v) => {
      store[k] = v;
    }
  };
}

function fakeCtx(): CtxLike & { pending: Promise<unknown>[] } {
  const pending: Promise<unknown>[] = [];
  return { pending, waitUntil: (p) => pending.push(p) };
}

describe('cachedProxy', () => {
  it('fresh hit: returns cached, x-cache HIT, no upstream call', async () => {
    const kv = fakeKV({ k: JSON.stringify({ at: 1000, data: { v: 1 } }) });
    const ctx = fakeCtx();
    const upstream = vi.fn();
    const res = await cachedProxy({ kv, ctx, key: 'k', ttlMs: 5000, fetchUpstream: upstream, now: () => 2000 });
    expect(res.headers.get('x-cache')).toBe('HIT');
    expect(await res.json()).toEqual({ v: 1 });
    expect(upstream).not.toHaveBeenCalled();
  });

  it('stale hit: serves cached immediately + schedules background refresh', async () => {
    const kv = fakeKV({ k: JSON.stringify({ at: 1000, data: { v: 1 } }) });
    const ctx = fakeCtx();
    const upstream = vi.fn().mockResolvedValue({ v: 2 });
    const res = await cachedProxy({ kv, ctx, key: 'k', ttlMs: 5000, fetchUpstream: upstream, now: () => 9999 });
    expect(res.headers.get('x-cache')).toBe('STALE');
    expect(await res.json()).toEqual({ v: 1 }); // old value served now
    expect(ctx.pending).toHaveLength(1);
    await Promise.all(ctx.pending); // let the bg refresh run
    expect(upstream).toHaveBeenCalledOnce();
    expect(JSON.parse(kv.store.k).data).toEqual({ v: 2 }); // cache updated
  });

  it('cold miss: fetches upstream, writes KV, x-cache MISS', async () => {
    const kv = fakeKV();
    const ctx = fakeCtx();
    const upstream = vi.fn().mockResolvedValue({ v: 3 });
    const res = await cachedProxy({ kv, ctx, key: 'k', ttlMs: 5000, fetchUpstream: upstream, now: () => 1 });
    expect(res.headers.get('x-cache')).toBe('MISS');
    expect(await res.json()).toEqual({ v: 3 });
    expect(JSON.parse(kv.store.k).data).toEqual({ v: 3 });
  });

  it('cold miss + upstream error: 502, nothing cached', async () => {
    const kv = fakeKV();
    const ctx = fakeCtx();
    const upstream = vi.fn().mockRejectedValue(new Error('timeout'));
    const res = await cachedProxy({ kv, ctx, key: 'k', ttlMs: 5000, fetchUpstream: upstream, now: () => 1 });
    expect(res.status).toBe(502);
    expect(kv.store.k).toBeUndefined();
  });

  it('stale hit + background refresh fails: keeps serving stale, no throw', async () => {
    const kv = fakeKV({ k: JSON.stringify({ at: 1000, data: { v: 1 } }) });
    const ctx = fakeCtx();
    const upstream = vi.fn().mockRejectedValue(new Error('down'));
    const res = await cachedProxy({ kv, ctx, key: 'k', ttlMs: 1, fetchUpstream: upstream, now: () => 5000 });
    expect(res.headers.get('x-cache')).toBe('STALE');
    await expect(Promise.all(ctx.pending)).resolves.toBeDefined(); // refresh swallowed
    expect(JSON.parse(kv.store.k).data).toEqual({ v: 1 }); // unchanged
  });
});
