import { test, expect } from '@playwright/test';

// Proves the local loop end to end against the juliafilippo_ profile in linkme_clone3.
const PROFILE = '/juliafilippo_';
const ADULT_LINK = { id: 'juliafilippo_juliafilippo_juliafilippo_name1', title: 'ExampleOnlyFans' };
const REVEAL = /\/\.netlify\/functions\/reveal\?/;
const INSTAGRAM_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) ' +
  'Mobile/15E148 Instagram 300.0.0.0.0 (iPhone14,2; iOS 17_0; en_US; en-US; scale=3.00; 1170x2532; 0)';

test('profile page renders the display name and link cards', async ({ page }) => {
  await page.goto(PROFILE);
  await expect(page.locator('#displayName')).toHaveText('Example Site');
  await expect(page.locator('.link-card').first()).toBeVisible();
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
  await expect(page.locator('#displayName')).toHaveText('Example Site');
  await expect(page.locator('#igOverlay')).toBeHidden();
});

test('adult link shows the 18+ gate and Continue calls reveal', async ({ page }) => {
  let revealStatus = 0;
  await page.route(REVEAL, async (route) => {
    revealStatus = (await route.fetch()).status(); // the local reveal function really answered
    await route.fulfill({ json: { realUrl: '/landing.html' } }); // never follow the real URL
  });

  await page.goto(PROFILE);
  await page.locator('.link-card', { hasText: ADULT_LINK.title }).click();
  await expect(page.locator('#overlay')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Mature Content Disclaimer' })).toBeVisible();

  const revealRequest = page.waitForRequest(REVEAL);
  await page.getByRole('button', { name: 'Continue (18+)' }).click();
  const params = new URL((await revealRequest).url()).searchParams;
  expect(params.get('id')).toBe(ADULT_LINK.id);
  expect(params.get('user')).toBe('juliafilippo_');

  await expect(page).toHaveURL(/\/landing\.html$/);
  expect(revealStatus).toBe(200);
});
