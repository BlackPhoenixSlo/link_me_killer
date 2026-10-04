import { test, expect } from '@playwright/test';
import { join } from 'node:path';

// Proves the local loop end to end against the Fixture Profile (tests/fixtures/api/profiles/fixture.json).
// Link cards are found by their visible title; no v1 Profile or Link Id appears here.
const PROFILE = '/fixture';
const LINK_TITLES = ['Adult Link', 'Direct Link', 'Escape Link', 'Deeplink Link'];
const SCREENSHOT = join(__dirname, '..', '..', '.scratch', 'goal_ai', 'shots', '00-smoke.png');
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

// Stops at the Age Gate: the Reveal on fixture data arrives with ticket 04.
test('tapping the adult link shows the age gate', async ({ page }) => {
  await page.goto(PROFILE);
  await page.locator('.link-card', { hasText: 'Adult Link' }).click();
  await expect(page.locator('#overlay')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Mature Content Disclaimer' })).toBeVisible();
});
