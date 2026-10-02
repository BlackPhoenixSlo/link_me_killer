import { defineConfig, devices } from '@playwright/test';

const baseURL = 'http://localhost:4173';

export default defineConfig({
  testDir: 'tests/e2e',
  outputDir: '.scratch/goal_ai/shots',
  use: { baseURL, screenshot: 'only-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'node tests/dev-server.mjs',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
  },
});
