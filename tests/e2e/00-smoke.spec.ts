import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Proves the local loop end to end against the Fixture Profile (tests/fixtures/api/profiles/fixture.json).
// Link cards are found by their visible title; no v1 Profile or Link Id appears here.
const PROFILE = '/fixture';
const LINK_TITLES = ['Adult Link', 'Direct Link', 'Escape Link', 'Deeplink Link'];
const SCREENSHOT = join(__dirname, '..', '..', '.scratch', 'goal_ai', 'shots', '00-smoke.png');
// Test Secrets: { linkId: Destination }, every Destination on example.com.
const TEST_SECRETS: Record<string, string> = JSON.parse(
  readFileSync(join(__dirname, '..', 'fixtures', 'netlify', 'functions', 'secrets.json'), 'utf8'),
);
// The Fixture Profile file, read only to key the Test Secrets by its v1 ids.
const FIXTURE: { links: { id: string; title: string }[] } = JSON.parse(
  readFileSync(join(__dirname, '..', 'fixtures', 'api', 'profiles', 'fixture.json'), 'utf8'),
);
const SECRETS_PATHS = ['/netlify/functions/secrets.json', '/tests/fixtures/netlify/functions/secrets.json'];
const INSTAGRAM_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) ' +
  'Mobile/15E148 Instagram 300.0.0.0.0 (iPhone14,2; iOS 17_0; en_US; en-US; scale=3.00; 1170x2532; 0)';

// Nothing leaves the machine: every request to a host other than the stand-in's is aborted.
test.beforeEach(async ({ page, baseURL }) => {
  const host = new URL(baseURL!).host;
  await page.route((url) => url.host !== host, (route) => route.abort('blockedbyclient'));
});

test('profile page renders the display name and the four link cards', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(PROFILE);
  await expect(page.locator('#displayName')).toHaveText('Fixture Profile');
  await expect(page.locator('.link-card .link-title')).toHaveText(LINK_TITLES);
  await page.screenshot({ path: SCREENSHOT, fullPage: true });
});

test.describe('inside the Instagram in-app browser', () => {
  test.use({ userAgent: INSTAGRAM_UA });

  test('shows the open-in-system-browser overlay', async ({ page }) => {
    await page.goto(PROFILE);
    await expect(page.locator('#igOverlay')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Open in System Browser' })).toBeVisible();
  });
});

test('a normal browser does not see the Instagram overlay', async ({ page }) => {
  await page.goto(PROFILE);
  await expect(page.locator('#displayName')).toHaveText('Fixture Profile');
  await expect(page.locator('#igOverlay')).toBeHidden();
});

// The root is the landing page, served at `/` itself rather than through the Profile page's not-found redirect; a Username
// path still shows its Profile.
test('/ answers 200 with the landing page and its one "See a demo" link to /demo, and /fixture still shows the Fixture Profile', async ({ page }) => {
  const root = await page.goto('/');
  expect(root!.status()).toBe(200);
  await expect(page.getByRole('heading', { level: 1, name: 'One link for your bio', exact: true })).toBeVisible();
  expect(new URL(page.url()).pathname, 'the landing page at / itself, not reached through a redirect').toBe('/');
  const demo = page.getByRole('link', { name: 'See a demo', exact: true });
  await expect(demo).toHaveCount(1);
  await expect(demo).toHaveAttribute('href', '/demo');

  await page.goto(PROFILE);
  await expect(page.locator('#displayName')).toHaveText('Fixture Profile');
});

// The Reveal id comes from the page's own served Profile JSON, never the fixture file or a literal.
// Phase 2 (ticket 16): served ids are fresh on v2, so the Test Secret is found through the fixture file's card of the same title.
// Destinations are compared as booleans so a failure never prints one.
test('tapping the adult link shows the age gate, then continue reveals and follows the destination', async ({ page }) => {
  const profileResponse = page.waitForResponse((res) => new URL(res.url()).pathname === '/api/profiles/fixture.json');
  await page.goto(PROFILE);
  const served: { links: { id: string; title: string }[] } = await (await profileResponse).json();
  const adultId = served.links.find((link) => link.title === 'Adult Link')!.id;
  const fileAdultId = FIXTURE.links.find((link) => link.title === 'Adult Link')!.id;
  const destination = TEST_SECRETS[fileAdultId];
  expect(typeof destination).toBe('string');

  await page.locator('.link-card', { hasText: 'Adult Link' }).click();
  await expect(page.locator('#overlay')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Mature Content Disclaimer' })).toBeVisible();

  // The Reveal passes through unchanged; its body is read here because the onward navigation discards it.
  let reveal: { url: URL; status: number; realUrl: unknown } | undefined;
  await page.route('**/.netlify/functions/reveal?*', async (route) => {
    const response = await route.fetch();
    reveal = { url: new URL(route.request().url()), status: response.status(), realUrl: (await response.json()).realUrl };
    await route.fulfill({ response });
  });
  const onward = page.waitForEvent('requestfailed', (req) => req.url() === destination);
  await page.getByRole('button', { name: 'Continue (18+)' }).click();

  // The off-machine guard aborts the onward navigation, so it surfaces as a failed request; the Reveal ran before it.
  expect((await onward).failure()?.errorText).toBe('net::ERR_BLOCKED_BY_CLIENT');
  if (!reveal) throw new Error('no Reveal was observed before the onward navigation');
  expect(reveal.url.pathname).toBe('/.netlify/functions/reveal');
  expect(reveal.url.searchParams.get('id') === adultId).toBe(true);
  expect(reveal.url.searchParams.get('user')).toBe('fixture');
  expect(reveal.status).toBe(200);
  expect(reveal.realUrl === destination).toBe(true);
});

// The status is not asserted: the stand-in answers its 200 catch-all, Phase 2's app a 404 with the landing page.
// Bodies are checked as booleans so a failure never prints a Destination.
for (const path of SECRETS_PATHS) {
  test(`${path} does not hand out the Test Secrets`, async ({ request }) => {
    const body = await (await request.get(path)).text();
    expect(body.includes('<html')).toBe(true);
    expect(Object.values(TEST_SECRETS).some((destination) => body.includes(destination))).toBe(false);
  });
}
