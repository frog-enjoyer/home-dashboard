import { DEFAULT_CONFIG, mergeConfig, type DashConfig } from '$lib/config-schema';

// Shared reactive config, loaded from /api/config on mount and written back on
// save. Single instance for the whole app (single user).
export const configState = $state<{ cfg: DashConfig; loaded: boolean }>({
  cfg: structuredClone(DEFAULT_CONFIG),
  loaded: false
});

export async function loadConfig(): Promise<void> {
  try {
    const r = await fetch('/api/config', { headers: { accept: 'application/json' } });
    if (r.ok && (r.headers.get('content-type') ?? '').includes('application/json')) {
      configState.cfg = mergeConfig(await r.json());
    }
  } catch {
    /* keep defaults */
  }
  configState.loaded = true;
}

export async function saveConfig(next: DashConfig): Promise<boolean> {
  const prev = configState.cfg;
  configState.cfg = next; // optimistic
  try {
    const r = await fetch('/api/config', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(next)
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    configState.cfg = mergeConfig(await r.json());
    return true;
  } catch {
    configState.cfg = prev; // revert on failure
    return false;
  }
}
