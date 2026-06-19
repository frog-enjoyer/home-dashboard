// Shared client fetch wrapper. Single place that detects a Cloudflare Access
// session expiry (decided in eng review) so every widget shows a recoverable
// re-auth state instead of crashing on res.json() of login HTML.

export class AuthExpiredError extends Error {
  constructor() {
    super('auth-expired');
    this.name = 'AuthExpiredError';
  }
}

export interface WidgetFetchResult<T> {
  data: T;
  /** True when the server served a stale-while-revalidate cache hit. */
  stale: boolean;
}

/**
 * Fetch JSON from a same-origin /api endpoint behind Cloudflare Access.
 *
 * Access expiry signals (any one => AuthExpiredError):
 *   - the response was redirected (to the IdP login)
 *   - status 401 / 403
 *   - content-type is not JSON (we got the login HTML page)
 *
 * fetchFn is injectable for tests.
 */
export async function fetchWidgetData<T>(
  endpoint: string,
  fetchFn: typeof fetch = fetch
): Promise<WidgetFetchResult<T>> {
  const res = await fetchFn(endpoint, { headers: { accept: 'application/json' } });

  if (res.redirected || res.status === 401 || res.status === 403) {
    throw new AuthExpiredError();
  }

  const contentType = res.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    // Behind Access, an expired session returns the login HTML, not JSON.
    throw new AuthExpiredError();
  }

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  const stale = res.headers.get('x-cache') === 'STALE';
  const data = (await res.json()) as T;
  return { data, stale };
}
