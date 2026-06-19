// Single source of truth for runtime-editable config (stored in KV under
// `config`). Edited in-app via the settings menu + layout editor.

export interface WeatherLocation {
  name: string;
  lat: number;
  lon: number;
}

export interface RssFeed {
  label: string;
  url: string;
}

export interface Ticker {
  symbol: string; // exchange symbol, e.g. VWRL.L
  label: string; // human label, e.g. Global
}

export interface QuickLink {
  label: string;
  url: string;
}

export interface WidgetSettings {
  owner: string; // name shown in the clock greeting + status bar (kept out of git; lives in KV)
  weatherLocation: WeatherLocation;
  rssFeeds: RssFeed[];
  tickers: Ticker[];
  links: QuickLink[];
}

/** GridStack-compatible position: 12-column grid, h in row units. */
export interface LayoutItem {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface DashConfig {
  settings: WidgetSettings;
  layout: LayoutItem[];
  enabled: string[];
}

export const ALL_WIDGET_IDS = [
  'clock',
  'weather',
  'todo',
  'feed',
  'markets',
  'trains',
  'links',
  'tfl',
  'rain',
  'football',
  'photo',
  'devtools'
] as const;

export const DEFAULT_CONFIG: DashConfig = {
  settings: {
    owner: 'operator',
    weatherLocation: { name: 'London', lat: 51.5072, lon: -0.1276 },
    rssFeeds: [
      { label: 'BBC', url: 'https://feeds.bbci.co.uk/news/rss.xml' },
      { label: 'HN', url: 'https://hnrss.org/frontpage' },
      { label: 'RDT', url: 'https://www.reddit.com/r/popular/.rss' },
      { label: 'SEC', url: 'https://feeds.feedburner.com/TheHackersNews' }
    ],
    tickers: [
      { symbol: 'VWRL.L', label: 'Vanguard Global Fund' }, // FTSE All-World UCITS ETF
      { symbol: 'VFEM.L', label: 'Vanguard Emerging Markets' } // FTSE EM UCITS ETF
    ],
    links: [
      { label: 'GitHub', url: 'https://github.com' },
      { label: 'Cloudflare', url: 'https://dash.cloudflare.com' },
      { label: 'Gmail', url: 'https://mail.google.com' },
      { label: 'RTT', url: 'https://www.realtimetrains.co.uk' }
    ]
  },
  layout: [
    { id: 'clock', x: 0, y: 0, w: 3, h: 2 },
    { id: 'weather', x: 3, y: 0, w: 3, h: 2 },
    { id: 'markets', x: 6, y: 0, w: 3, h: 2 },
    { id: 'tfl', x: 9, y: 0, w: 3, h: 2 },
    { id: 'trains', x: 0, y: 2, w: 4, h: 6 },
    { id: 'feed', x: 4, y: 2, w: 5, h: 6 },
    { id: 'todo', x: 9, y: 2, w: 3, h: 4 },
    { id: 'links', x: 9, y: 6, w: 3, h: 2 },
    { id: 'rain', x: 0, y: 8, w: 4, h: 2 },
    { id: 'football', x: 0, y: 10, w: 4, h: 4 },
    { id: 'photo', x: 4, y: 8, w: 5, h: 3 },
    { id: 'devtools', x: 9, y: 8, w: 3, h: 4 }
  ],
  enabled: [
    'clock', 'weather', 'rain', 'markets', 'tfl', 'trains', 'feed', 'todo',
    'links', 'football', 'photo', 'devtools'
  ]
};

/** Merge a stored (possibly partial/older/wrong-shape) config over defaults.
 * Defensive: filters out malformed feeds/tickers (e.g. old string tickers from
 * a previous schema) so stale data can never break the widgets. */
export function mergeConfig(stored: Partial<DashConfig> | null | undefined): DashConfig {
  if (!stored) return structuredClone(DEFAULT_CONFIG);
  const s: Partial<WidgetSettings> = stored.settings ?? {};

  const feeds = Array.isArray(s.rssFeeds)
    ? s.rssFeeds.filter(
        (f): f is RssFeed => !!f && typeof (f as any).url === 'string' && (f as any).url.length > 0
      )
    : [];
  const tickers = Array.isArray(s.tickers)
    ? s.tickers.filter(
        (t): t is Ticker =>
          !!t && typeof (t as any).symbol === 'string' && (t as any).symbol.length > 0
      )
    : [];
  const links = Array.isArray(s.links)
    ? s.links.filter(
        (l): l is QuickLink =>
          !!l && typeof (l as any).url === 'string' && (l as any).url.length > 0
      )
    : [];
  const loc = s.weatherLocation;
  const validLoc =
    loc && typeof loc.lat === 'number' && typeof loc.lon === 'number'
      ? loc
      : DEFAULT_CONFIG.settings.weatherLocation;

  return {
    settings: {
      owner: typeof s.owner === 'string' && s.owner.trim() ? s.owner : DEFAULT_CONFIG.settings.owner,
      weatherLocation: validLoc,
      rssFeeds: feeds.length ? feeds : DEFAULT_CONFIG.settings.rssFeeds,
      tickers: tickers.length ? tickers : DEFAULT_CONFIG.settings.tickers,
      links: links.length ? links : DEFAULT_CONFIG.settings.links
    },
    layout: stored.layout?.length ? stored.layout : DEFAULT_CONFIG.layout,
    // Union with defaults so newly-added widgets (e.g. trains) appear even when
    // an older config was saved. (No disable-widget UI yet, so this is safe.)
    enabled: stored.enabled?.length
      ? Array.from(new Set([...DEFAULT_CONFIG.enabled, ...stored.enabled]))
      : DEFAULT_CONFIG.enabled
  };
}
