import adapter from '@sveltejs/adapter-cloudflare';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    // Cloudflare Pages/Workers adapter. The static shell prerenders (see
    // src/routes/+layout.ts); widgets fetch their own data client-side from
    // /api routes, which are Pages Functions backed by KV.
    adapter: adapter()
  }
};

export default config;
