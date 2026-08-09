import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { playwright } from '@vitest/browser-playwright';

// Two projects: `client` mounts individual Svelte components in a real
// browser (via Vitest browser mode + the Playwright provider) — this is
// what gives component-level tests real click/drag/popover/CSS fidelity
// without loading the whole app/router. `server` runs plain Node-side
// unit tests for pure functions (e.g. generateId()) that don't need a
// DOM at all. Full-page behavior (App.svelte-level routing, multi-page
// integration) stays out of this file entirely — see playwright.config.ts
// and tests/, kept to the minimum that genuinely needs a real page.
export default defineConfig({
  plugins: [svelte()],
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'client',
          include: ['src/**/*.browser.{test,spec}.ts'],
          setupFiles: ['./src/vitest-setup-client.ts'],
          browser: {
            enabled: true,
            provider: playwright(),
            // Headless by default so a Chromium window doesn't pop up on
            // every test run — pass --browser.headless=false to watch a
            // failure visually when debugging.
            headless: true,
            instances: [{ browser: 'chromium' }],
          },
        },
      },
      {
        extends: true,
        test: {
          name: 'server',
          environment: 'node',
          include: ['src/**/*.{test,spec}.ts'],
          exclude: ['src/**/*.browser.{test,spec}.ts'],
        },
      },
    ],
  },
});
