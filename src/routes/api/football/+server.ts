import type { RequestHandler } from './$types';
import { getStore } from '$lib/server/store';
import { cachedProxy, type CtxLike } from '$lib/server/cachedProxy';
import type { FootballData, FootballMatch, FootballTeam } from '$lib/football-schema';

export const prerender = false;

// TheSportsDB free tier (test key "3"). Teams are configured via env vars
// (kept out of git) — set FOOTBALL_TEAM_A/B (TheSportsDB ids) + *_NAME in your
// Cloudflare Pages environment. Defaults are neutral, well-known teams.
const KEY = '3';
const API = `https://www.thesportsdb.com/api/v1/json/${KEY}`;

const hm = (t: string | undefined): string => (t ? t.slice(0, 5) : '');
const num = (v: any): number | null => (v === null || v === undefined || v === '' ? null : Number(v));

function toMatch(e: any, played: boolean): FootballMatch {
  return {
    event: e.strEvent ?? '',
    date: e.dateEvent ?? '',
    time: hm(e.strTime),
    league: e.strLeague ?? '',
    home: e.strHomeTeam ?? '',
    away: e.strAwayTeam ?? '',
    homeScore: played ? num(e.intHomeScore) : null,
    awayScore: played ? num(e.intAwayScore) : null,
    played
  };
}

async function teamData(id: string, name: string): Promise<FootballTeam> {
  const [nextRes, lastRes] = await Promise.all([
    fetch(`${API}/eventsnext.php?id=${id}`).then((r) => (r.ok ? r.json() : { events: [] })),
    fetch(`${API}/eventslast.php?id=${id}`).then((r) => (r.ok ? r.json() : { results: [] }))
  ]);
  const next = ((nextRes as any).events ?? []).slice(0, 3).map((e: any) => toMatch(e, false));
  const last = (((lastRes as any).results ?? (lastRes as any).events) ?? [])
    .slice(0, 3)
    .map((e: any) => toMatch(e, true));
  return { name, next, last };
}

export const GET: RequestHandler = async ({ platform }) => {
  const TEAM_A = (platform?.env?.FOOTBALL_TEAM_A as string | undefined) ?? '133602';
  const TEAM_B = (platform?.env?.FOOTBALL_TEAM_B as string | undefined) ?? '133914';
  const TEAM_A_NAME = (platform?.env?.FOOTBALL_TEAM_A_NAME as string | undefined) ?? 'Arsenal';
  const TEAM_B_NAME = (platform?.env?.FOOTBALL_TEAM_B_NAME as string | undefined) ?? 'England';

  const kv = getStore(platform);
  const ctx: CtxLike = platform?.context ?? { waitUntil: () => {} };
  return cachedProxy<FootballData>({
    kv,
    ctx,
    key: 'football',
    ttlMs: 1_800_000, // 30 min
    fetchUpstream: async () => {
      const [primary, secondary] = await Promise.all([
        teamData(TEAM_A, TEAM_A_NAME),
        teamData(TEAM_B, TEAM_B_NAME)
      ]);
      return { primary, secondary } satisfies FootballData;
    }
  });
};
