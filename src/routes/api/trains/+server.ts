import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getStore } from '$lib/server/store';
import { cachedProxy, type CtxLike } from '$lib/server/cachedProxy';
import type { TrainBoard, TrainService, TrainStatus, TrainsData } from '$lib/trains-schema';

export const prerender = false;

// Route is configured via env vars (kept out of git). Defaults are neutral
// placeholders — set TRAIN_FROM/TRAIN_TO (CRS codes) + *_NAME in your
// Cloudflare Pages environment to point at your own stations.
const BASE = 'https://data.rtt.io';

const hm = (iso: string | undefined): string => (iso ? iso.slice(11, 16) : '');

function statusOf(std: string, real: string, cancelled: boolean): TrainStatus {
  if (cancelled) return 'cancelled';
  if (real && real !== std) return 'delayed';
  return 'ontime';
}

function parseBoard(j: any, fromName: string, toName: string): TrainBoard {
  const services: TrainService[] = (j?.services ?? [])
    .filter((s: any) => s?.temporalData?.departure?.scheduleAdvertised)
    .map((s: any) => {
      const dep = s.temporalData.departure;
      const std = hm(dep.scheduleAdvertised);
      const real = hm(dep.realtimeForecast);
      const cancelled =
        !!dep.isCancelled || String(s.temporalData.displayAs ?? '').toUpperCase().includes('CANCEL');
      const status = statusOf(std, real, cancelled);
      const plat = s.locationMetadata?.platform?.forecast ?? s.locationMetadata?.platform?.planned;
      return {
        std,
        etd: cancelled ? 'Cancelled' : status === 'delayed' ? real : 'On time',
        status,
        platform: plat ?? null,
        operator: s.scheduleMetadata?.operator?.name ?? '',
        destination: s.destination?.[0]?.location?.description ?? toName
      } satisfies TrainService;
    });
  return { from: fromName, to: toName, services };
}

async function getAccessToken(refresh: string): Promise<string> {
  const res = await fetch(`${BASE}/api/get_access_token`, {
    headers: { authorization: `Bearer ${refresh}`, accept: 'application/json' }
  });
  if (!res.ok) throw new Error(`token exchange ${res.status}`);
  const j = (await res.json()) as { token?: string };
  if (!j.token) throw new Error('no access token returned');
  return j.token;
}

async function fetchBoard(access: string, code: string, filterTo: string) {
  const res = await fetch(
    `${BASE}/gb-nr/location?code=${code}&filterTo=${filterTo}&timeWindow=180`,
    { headers: { authorization: `Bearer ${access}`, accept: 'application/json' } }
  );
  if (!res.ok) throw new Error(`board ${code}->${filterTo} ${res.status}`);
  return res.json();
}

function disruptions(dir: string, b: TrainBoard): string[] {
  return b.services
    .filter((s) => s.status !== 'ontime')
    .map((s) =>
      s.status === 'cancelled'
        ? `${dir} ${s.std}: cancelled`
        : `${dir} ${s.std}: delayed, expected ${s.etd}`
    );
}

export const GET: RequestHandler = async ({ platform }) => {
  const refresh = platform?.env?.RTT_TOKEN as string | undefined;
  const FROM = (platform?.env?.TRAIN_FROM as string | undefined) ?? 'AAA';
  const TO = (platform?.env?.TRAIN_TO as string | undefined) ?? 'BBB';
  const FROM_NAME = (platform?.env?.TRAIN_FROM_NAME as string | undefined) ?? 'Origin';
  const TO_NAME = (platform?.env?.TRAIN_TO_NAME as string | undefined) ?? 'Destination';

  if (!refresh) {
    const data: TrainsData = {
      fromCode: FROM,
      toCode: TO,
      outbound: { from: FROM_NAME, to: TO_NAME, services: [] },
      inbound: { from: TO_NAME, to: FROM_NAME, services: [] },
      alerts: ['Train data not configured — add the RTT_TOKEN secret.'],
      configured: false
    };
    return json(data);
  }

  const kv = getStore(platform);
  const ctx: CtxLike = platform?.context ?? { waitUntil: () => {} };
  return cachedProxy<TrainsData>({
    kv,
    ctx,
    key: 'trains',
    ttlMs: 180_000, // 3 min
    fetchUpstream: async () => {
      const access = await getAccessToken(refresh);
      const [out, inn] = await Promise.all([
        fetchBoard(access, FROM, TO),
        fetchBoard(access, TO, FROM)
      ]);
      const outbound = parseBoard(out, FROM_NAME, TO_NAME);
      const inbound = parseBoard(inn, TO_NAME, FROM_NAME);
      const alerts = [
        ...disruptions(`${FROM}→${TO}`, outbound),
        ...disruptions(`${TO}→${FROM}`, inbound)
      ].slice(0, 5);
      return { fromCode: FROM, toCode: TO, outbound, inbound, alerts, configured: true } satisfies TrainsData;
    }
  });
};
