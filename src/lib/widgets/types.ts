// The spine of the dashboard: every widget is a self-contained tile described
// by a WidgetDef and renders one of a fixed set of states via WidgetFrame.
// Decided in eng review (widget module system) + design review (states).

/** Discriminated union of everything a widget tile can be showing. */
export type WidgetState<T> =
  | { status: 'loading' }
  | { status: 'ok'; data: T; stale: boolean }
  | { status: 'empty' }
  | { status: 'error'; message: string }
  | { status: 'auth-expired' };

export interface WidgetDef {
  /** Stable id, also used as the KV/cache key prefix. */
  id: string;
  /** Pane title, shown as `~/<title>`. */
  title: string;
  /** CSS grid-area this widget occupies (see dashboard.config + app.css). */
  area: string;
  /**
   * Poll interval in ms, or null for widgets that need no /api polling
   * (e.g. the clock ticks locally). The cache TTL lives server-side in the
   * /api route; this is just how often the client re-asks.
   */
  refreshIntervalMs: number | null;
  /** /api endpoint for data-backed widgets. Absent for client-only widgets. */
  endpoint?: string;
}
