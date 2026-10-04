import { defineConfig, devices } from '@playwright/test';

// From Phase 2 on the suite runs against v2's test stack (tests/stack.sh), or against PLAYWRIGHT_BASE_URL with nothing started.
const target = process.env.PLAYWRIGHT_BASE_URL;
const baseURL = target || 'http://localhost:4173';

// Network guard: Chromium resolves no host but the one under test, so nothing a page does leaves the machine.
// Playwright's routes never see a redirect's next hop ("The handler will only be called for the first url if the response
// is a redirect", Playwright 1.58 page.route docs; observed for `route.continue` and for a fulfilled 302), so a Click
// through `/r/{Link Id}` would otherwise fetch its Destination for real.
// ASSUMPTION: a Chromium host-resolver rule, rather than a proxy or a fence change in each spec, keeps that hop local
// (rung 5: one line covers every spec; the hop still shows as a failed request to the Destination). Overturned if
// Playwright starts routing redirect hops; the specs' own page.route fences then answer them.
const resolverRule = `--host-resolver-rules=MAP * ~NOTFOUND , EXCLUDE ${new URL(baseURL).hostname}`;

export default defineConfig({
  testDir: 'tests/e2e',
  outputDir: '.scratch/goal_ai/shots',
  use: { baseURL, screenshot: 'only-on-failure', launchOptions: { args: [resolverRule] } },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] }, testIgnore: '**/02-v1-import.spec.ts' },
    // The last project (spec, Testing Decisions, Spec order): the import spec writes to the stack that the others read.
    { name: 'stack-import', use: { ...devices['Desktop Chrome'] }, testMatch: '**/02-v1-import.spec.ts', dependencies: ['chromium'] },
  ],
  webServer: target
    ? undefined
    : {
        command: 'tests/stack.sh',
        // The Fixture Profile's JSON answers only after the seed's last write (tests/stack.sh).
        url: `${baseURL}/api/profiles/fixture.json`,
        reuseExistingServer: false,
        stdout: 'pipe', // the seed's lines and the stack's logs show in the run, where a leak would be seen
        timeout: 300_000,
        gracefulShutdown: { signal: 'SIGTERM', timeout: 120_000 },
      },
});
