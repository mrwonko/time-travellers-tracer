import { defineConfig } from '@playwright/test';

// Tests exercise real behavior (popover dismiss, toast stacking, etc.)
// against the actual dev server rather than a component-test harness —
// consistent with how this project has been manually verified all along
// (see .claude/skills/screenshot).
export default defineConfig({
  testDir: './tests',
  use: {
    baseURL: 'http://localhost:8080',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:8080',
    reuseExistingServer: true,
  },
});
