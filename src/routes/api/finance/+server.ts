import type { RequestHandler } from './$types';
import { getStore } from '$lib/server/store';
import { cachedProxy, type CtxLike } from '$lib/server/cachedProxy';
import { mergeConfig, type DashConfig, type Ticker } from '$lib/config-schema';
import type { FinanceRow } from '$lib/finance-schema';

export const prerender = false;

async function fetchQuote(t: Ticker): Promise<FinanceRow> {
  const base: FinanceRow = {
    symbol: t.symbol,
    label: t.label,
    ok: false,
    price: 0,
    changePct: 0,
    currency: '',
    spark: []
  };
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
      t.symbol
    )}?range=1mo&interval=1d`;
    const res = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 command-center' } });
    if (!res.ok) return base;
    const j = (await res.json()) as any;
    const r = j?.chart?.result?.[0];
    if (!r) return base;
    const meta = r.meta;
    const closes = (r.indicators?.quote?.[0]?.close ?? []).filter(
      (n: number | null) => typeof n === 'number'
    ) as number[];
    // Daily change: current price vs the prior day's close. The closes array is
    // daily (interval=1d), so closes[-2] is yesterday's close (closes[-1] is
    // today, which moves intraday). chartPreviousClose would give a ~1-month
    // baseline here, which is wrong.
    const price = meta.regularMarketPrice ?? closes[closes.length - 1] ?? 0;
    const prev =
      closes.length >= 2 ? closes[closes.length - 2] : (meta.chartPreviousClose ?? price);
    return {
      symbol: t.symbol,
      label: t.label,
      ok: true,
      price,
      changePct: prev ? ((price - prev) / prev) * 100 : 0,
      currency: meta.currency ?? '',
      spark: closes.slice(-20)
    };
  } catch {
    return base;
  }
}

async function aggregate(kv: { get(k: string): Promise<string | null> }): Promise<FinanceRow[]> {
  const raw = await kv.get('config');
  const cfg = mergeConfig(raw ? (JSON.parse(raw) as Partial<DashConfig>) : null);
  return Promise.all(cfg.settings.tickers.map(fetchQuote));
}

export const GET: RequestHandler = async ({ platform }) => {
  const kv = getStore(platform);
  const ctx: CtxLike = platform?.context ?? { waitUntil: () => {} };
  return cachedProxy<FinanceRow[]>({
    kv,
    ctx,
    key: 'finance',
    ttlMs: 180_000, // 3 min — stays under the KV free-tier write limit
    fetchUpstream: () => aggregate(kv)
  });
};
