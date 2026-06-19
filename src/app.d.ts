// See https://svelte.dev/docs/kit/types#app.d.ts
declare global {
  namespace App {
    interface Platform {
      env: {
        /** KV: /api response cache (SWR) + todos JSON store. */
        DASH: KVNamespace;
        /** Realtime Trains NG API refresh token (data.rtt.io via api-portal). */
        RTT_TOKEN?: string;
        /** Optional TfL Unified API app key (raises rate limits; keyless works). */
        TFL_APP_KEY?: string;
        /** Trains route (CRS codes + display names). Kept out of git. */
        TRAIN_FROM?: string;
        TRAIN_TO?: string;
        TRAIN_FROM_NAME?: string;
        TRAIN_TO_NAME?: string;
        /** Football teams (TheSportsDB ids + display names). Kept out of git. */
        FOOTBALL_TEAM_A?: string;
        FOOTBALL_TEAM_B?: string;
        FOOTBALL_TEAM_A_NAME?: string;
        FOOTBALL_TEAM_B_NAME?: string;
      };
      context: { waitUntil(promise: Promise<unknown>): void };
      caches: CacheStorage & { default: Cache };
    }
  }
}

export {};
