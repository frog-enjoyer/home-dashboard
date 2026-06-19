import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
  test: {
    // Unit tests run in node by default; component tests opt into jsdom via
    // a // @vitest-environment jsdom comment at the top of the file.
    include: ['src/**/*.{test,spec}.{js,ts}']
  }
});
