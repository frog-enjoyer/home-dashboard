import { describe, it, expect, vi } from 'vitest';
import { fetchWidgetData, AuthExpiredError } from './fetchWidgetData';

function mockResponse(opts: {
  ok?: boolean;
  status?: number;
  redirected?: boolean;
  contentType?: string;
  body?: unknown;
  xcache?: string;
}): Response {
  const headers = new Headers();
  if (opts.contentType) headers.set('content-type', opts.contentType);
  if (opts.xcache) headers.set('x-cache', opts.xcache);
  return {
    ok: opts.ok ?? true,
    status: opts.status ?? 200,
    redirected: opts.redirected ?? false,
    headers,
    json: async () => opts.body
  } as unknown as Response;
}

describe('fetchWidgetData', () => {
  it('returns data on ok JSON', async () => {
    const f = vi.fn().mockResolvedValue(
      mockResponse({ contentType: 'application/json', body: { temp: 18 } })
    );
    const { data, stale } = await fetchWidgetData<{ temp: number }>('/api/weather', f);
    expect(data.temp).toBe(18);
    expect(stale).toBe(false);
  });

  it('flags stale when x-cache: STALE', async () => {
    const f = vi.fn().mockResolvedValue(
      mockResponse({ contentType: 'application/json', body: {}, xcache: 'STALE' })
    );
    const { stale } = await fetchWidgetData('/api/news', f);
    expect(stale).toBe(true);
  });

  it('throws AuthExpiredError on redirect', async () => {
    const f = vi.fn().mockResolvedValue(mockResponse({ redirected: true }));
    await expect(fetchWidgetData('/api/x', f)).rejects.toBeInstanceOf(AuthExpiredError);
  });

  it('throws AuthExpiredError on non-JSON content-type (login HTML)', async () => {
    const f = vi.fn().mockResolvedValue(mockResponse({ contentType: 'text/html' }));
    await expect(fetchWidgetData('/api/x', f)).rejects.toBeInstanceOf(AuthExpiredError);
  });

  it('throws AuthExpiredError on 401', async () => {
    const f = vi.fn().mockResolvedValue(mockResponse({ status: 401, ok: false }));
    await expect(fetchWidgetData('/api/x', f)).rejects.toBeInstanceOf(AuthExpiredError);
  });

  it('throws AuthExpiredError on 403', async () => {
    const f = vi.fn().mockResolvedValue(mockResponse({ status: 403, ok: false }));
    await expect(fetchWidgetData('/api/x', f)).rejects.toBeInstanceOf(AuthExpiredError);
  });

  it('throws generic Error on other non-ok JSON', async () => {
    const f = vi.fn().mockResolvedValue(
      mockResponse({ status: 500, ok: false, contentType: 'application/json' })
    );
    await expect(fetchWidgetData('/api/x', f)).rejects.toThrow('HTTP 500');
  });
});
