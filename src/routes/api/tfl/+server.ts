import type { RequestHandler } from './$types';
import { getStore } from '$lib/server/store';
import { cachedProxy, type CtxLike } from '$lib/server/cachedProxy';
import type { TflData, TflLine } from '$lib/tfl-schema';

export const prerender = false;

// TfL Unified API is free + keyless for personal volumes. An optional app key
// (TFL_APP_KEY) raises rate limits if ever needed.
const MODES = 'tube,elizabeth-line,dlr,overground';

async function fetchStatus(appKey?: string): Promise<TflData> {
  const url =
    `https://api.tfl.gov.uk/Line/Mode/${MODES}/Status` + (appKey ? `?app_key=${appKey}` : '');
  const res = await fetch(url, { headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(`TfL ${res.status}`);
  const arr = (await res.json()) as any[];
  const lines: TflLine[] = arr.map((l) => {
    // Pick the worst status for the line.
    const statuses = (l.lineStatuses ?? []) as any[];
    const worst = statuses.reduce(
      (a, b) => (b.statusSeverity < a.statusSeverity ? b : a),
      statuses[0] ?? { statusSeverity: 10, statusSeverityDescription: 'Good Service' }
    );
    return {
      name: l.name,
      severity: worst.statusSeverity ?? 10,
      status: worst.statusSeverityDescription ?? 'Good Service',
      reason: worst.reason ?? ''
    };
  });
  // Disrupted lines first, then alphabetical.
  lines.sort((a, b) => a.severity - b.severity || a.name.localeCompare(b.name));
  return { lines };
}

export const GET: RequestHandler = async ({ platform }) => {
  const kv = getStore(platform);
  const ctx: CtxLike = platform?.context ?? { waitUntil: () => {} };
  const appKey = platform?.env?.TFL_APP_KEY as string | undefined;
  return cachedProxy<TflData>({
    kv,
    ctx,
    key: 'tfl',
    ttlMs: 300_000, // 5 min — line status changes slowly; stays cheap on KV
    fetchUpstream: () => fetchStatus(appKey)
  });
};
