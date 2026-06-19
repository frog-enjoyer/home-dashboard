import type { WidgetDef } from '$lib/widgets/types';

// Fixed layout, configured here (decided in design review: no runtime drag-edit
// in v1). Order + `area` map onto the grid-template-areas in app.css.
// Cache TTLs live server-side in each /api route; refreshIntervalMs is how often
// the client re-polls.
export const widgets: WidgetDef[] = [
  { id: 'clock', title: 'clock', area: 'clock', refreshIntervalMs: null },
  { id: 'weather', title: 'weather', area: 'weather', refreshIntervalMs: 600_000, endpoint: '/api/weather' },
  { id: 'agenda', title: 'agenda', area: 'cal', refreshIntervalMs: 900_000, endpoint: '/api/calendar' },
  { id: 'todo', title: 'todo', area: 'todo', refreshIntervalMs: null, endpoint: '/api/todos' },
  { id: 'habits', title: 'habits', area: 'habit', refreshIntervalMs: null, endpoint: '/api/todos' },
  { id: 'feed', title: 'feed', area: 'feed', refreshIntervalMs: 900_000, endpoint: '/api/news' },
  // 3-min refresh keeps KV writes well under the free-tier 1,000/day even with
  // the dashboard open all day. The server-side cache TTL in /api/finance (T8)
  // must also be >= 180_000 — the TTL is what actually gates KV writes; this
  // interval just controls how often the client re-asks.
  { id: 'markets', title: 'markets', area: 'mkt', refreshIntervalMs: 180_000, endpoint: '/api/finance' }
];

// Designed empty-state hints (terminal idiom) for widgets not yet wired.
export const emptyHints: Record<string, string> = {
  weather: 'set a location in dashboard.config',
  agenda: 'add an .ics URL in config',
  todo: 'press [n] to add a task',
  habits: 'define habits in config',
  feed: 'add RSS sources in config',
  markets: 'add tickers in config'
};
