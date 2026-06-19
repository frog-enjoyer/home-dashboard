// KV access with a dev fallback. In production `platform.env.DASH` is the
// Cloudflare KV namespace; under `npm run dev` (plain vite) there's no binding,
// so we use an in-memory Map on globalThis (persists for the dev session).

export interface KVLike {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
}

const MEM = Symbol.for('command-center.dev-kv');

function memStore(): KVLike {
  const g = globalThis as unknown as { [MEM]?: Map<string, string> };
  const m = g[MEM] ?? (g[MEM] = new Map<string, string>());
  return {
    get: async (k) => m.get(k) ?? null,
    put: async (k, v) => void m.set(k, v)
  };
}

export function getStore(platform: App.Platform | undefined): KVLike {
  const kv = platform?.env?.DASH as unknown as KVLike | undefined;
  return kv ?? memStore();
}
