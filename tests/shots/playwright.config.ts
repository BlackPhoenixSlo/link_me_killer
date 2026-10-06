import { defineConfig, devices } from '@playwright/test';
import { join } from 'node:path';
import root from '../../playwright.config';

// The landing page's screenshots (docs/spec/editor-redesign.md, section 6 and ruling 11): the root config's stack, base URL and
// network guard, with this directory's one spec. Run from the repo root: npx playwright test -c tests/shots/playwright.config.ts
// The webServer's command is relative to the repo root, not to this file's directory (Playwright's default cwd).
// The stack is seeded with the Fixture site alone (V1_SNAPSHOT empty): the demo Creator needs no v1 Profile, and none can hold
// its Username.
const REPO = join(__dirname, '..', '..');
const server = Array.isArray(root.webServer) ? root.webServer[0] : root.webServer;

export default defineConfig({
  ...root,
  testDir: __dirname,
  outputDir: join(REPO, '.scratch', 'editor-ui', 'shots-run'),
  workers: 1,
  projects: [{ name: 'shots', use: { ...devices['Desktop Chrome'] } }],
  webServer: server && { ...server, cwd: REPO, env: { V1_SNAPSHOT: '' } },
});
