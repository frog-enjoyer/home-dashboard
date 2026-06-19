# command-center

A personal home dashboard / browser new-tab page, built as a dense
developer-terminal command center. SvelteKit on Cloudflare Pages, behind
Cloudflare Access.

![status: personal project](https://img.shields.io/badge/status-personal-blue)

## Stack

- **SvelteKit** + `@sveltejs/adapter-cloudflare` — prerendered shell, widgets fetch client-side
- **Cloudflare Pages** (hosting) + **Pages Functions** (the `/api/*` proxy layer)
- **Cloudflare KV** (`DASH`) — `/api` response cache (stale-while-revalidate) + todos JSON store
- **Cloudflare Access** — auth wall, no app-level login
- **GridStack** — draggable/resizable widget layout (persisted to KV)

## Widgets

clock · weather (Open-Meteo, keyless) · next-rain (Open-Meteo minutely) ·
markets (quotes + sparklines) · TfL line status · trains (Realtime Trains) ·
news feed (RSS) · todos · quick links · football (TheSportsDB) ·
photo-of-the-day (Bing) · dev utilities.

The `/api/*` routes proxy upstream sources through `cachedProxy()` (SWR over KV),
so the browser never holds API keys and rate limits stay low.

## Local dev

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # vitest: cachedProxy + fetchWidgetData
npm run check    # svelte-check / types
```

In local dev there is no Cloudflare platform binding, so KV falls back to an
in-memory store and keyed/personalized sources use their neutral defaults.

## Configuration

This repo ships **neutral placeholders** — all personal details are runtime
configuration and never committed.

**Secrets** (`npx wrangler pages secret put <NAME>`):

| Secret | Used by |
|---|---|
| `RTT_TOKEN` | trains (realtimetrains.io NG API) |
| `NEWS_API_KEY`, `FINANCE_API_KEY` | optional keyed news/finance sources |

**Personalization** — set as plain environment variables in the Cloudflare
Pages dashboard (Settings → Environment variables):

| Variable | Meaning |
|---|---|
| `TRAIN_FROM` / `TRAIN_TO` | CRS station codes (e.g. `KGX` / `YRK`) |
| `TRAIN_FROM_NAME` / `TRAIN_TO_NAME` | display names |
| `FOOTBALL_TEAM_A` / `FOOTBALL_TEAM_B` | TheSportsDB team ids |
| `FOOTBALL_TEAM_A_NAME` / `FOOTBALL_TEAM_B_NAME` | display names |

The **owner name** (clock greeting / status bar), weather location, RSS feeds,
tickers and quick links are edited in-app via the Settings panel and stored in
KV — also never committed.

## Deploy

```bash
# 1. Create the KV namespace and paste its id into wrangler.toml (binding DASH)
npx wrangler kv namespace create DASH

# 2. Build + deploy to Cloudflare Pages
npm run deploy     # build + wrangler pages deploy .svelte-kit/cloudflare

# 3. Cloudflare dashboard → Zero Trust → Access → Applications:
#    add a self-hosted app for your Pages hostname, policy = allow only your email.

# 4. Set the secrets + personalization vars (see Configuration above).
```

## License

Personal project — no warranty. Use the code freely.
