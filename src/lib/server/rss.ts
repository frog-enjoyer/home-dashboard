import { XMLParser } from 'fast-xml-parser';
import type { NewsItem } from '$lib/news-schema';

export type { NewsItem };

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });

function asArray<T>(v: T | T[] | undefined): T[] {
  if (v === undefined || v === null) return [];
  return Array.isArray(v) ? v : [v];
}

function textOf(v: unknown): string {
  if (typeof v === 'string') return v.trim();
  if (v && typeof v === 'object' && '#text' in v) return String((v as any)['#text']).trim();
  return '';
}

function parseTs(v: unknown): number {
  const s = textOf(v);
  if (!s) return 0;
  const t = Date.parse(s);
  return Number.isNaN(t) ? 0 : t;
}

/** Parse an RSS or Atom feed into normalized NewsItems. */
export function parseFeed(xml: string, source: string): NewsItem[] {
  let doc: any;
  try {
    doc = parser.parse(xml);
  } catch {
    return [];
  }

  // RSS 2.0
  if (doc?.rss?.channel) {
    return asArray(doc.rss.channel.item).map((it: any) => ({
      title: textOf(it.title),
      link: textOf(it.link) || textOf(it.guid),
      source,
      ts: parseTs(it.pubDate ?? it['dc:date'])
    }));
  }

  // Atom (e.g. Reddit)
  if (doc?.feed?.entry) {
    return asArray(doc.feed.entry).map((e: any) => {
      const links = asArray(e.link);
      const alt = links.find((l: any) => l?.['@_rel'] === 'alternate') ?? links[0];
      const href = alt?.['@_href'] ?? textOf(e.link);
      return {
        title: textOf(e.title),
        link: href ?? '',
        source,
        ts: parseTs(e.updated ?? e.published)
      };
    });
  }

  return [];
}

/** Fetch + parse one feed; never throws (returns [] on failure). */
export async function fetchFeed(feed: { label: string; url: string }): Promise<NewsItem[]> {
  try {
    const res = await fetch(feed.url, {
      headers: {
        // Reddit and some hosts reject default/empty UAs.
        'user-agent': 'command-center-dashboard/1.0 (personal)',
        accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml'
      }
    });
    if (!res.ok) return [];
    const xml = await res.text();
    return parseFeed(xml, feed.label);
  } catch {
    return [];
  }
}
