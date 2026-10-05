import { test, expect, type APIRequestContext, type Browser, type Page } from '@playwright/test';
import { account, CLAIM, EDITOR, featured, fresh, heading, logIn, onLocalStack, phoneContext, proxy, readBack, refused, verifiedCreator } from './helpers';

// Phase 6, tickets 1 to 3 (docs/spec/phase-06-sites-and-domains.md, § 2 Option A): an account owns up to three Profiles, one per
// slot. Rule checks call the proxy over HTTP as 03 does; the Editor and Stats run at 375px wide. Every Creator is a throwaway
// (helpers.ts, verifiedCreator), taken down with the test stack; Destinations are test-only example.com addresses.

const NARROW = { width: 375, height: 812 };
test.use({ viewport: NARROW });
test.skip(!onLocalStack(), 'the mail catcher is on the local test stack only');

const username = () => fresh().username;
const claim = (request: APIRequestContext, token: string, id: string, slot: unknown, name = username()) =>
  proxy(request, token).post('profiles/records', { username: name, owner: id, mode: 'escape_ig', slot });

// A further Profile of a verified Creator, claimed in `slot`, named and given one Link, as the Editor's Onboarding leaves it.
async function onboardedProfile(request: APIRequestContext, token: string, id: string, slot: number, title: string) {
  const name = username();
  const claimed = await claim(request, token, id, slot, name);
  expect(claimed.status(), `slot ${slot}`).toBe(200);
  const profileId = (await claimed.json()).id as string;
  const as = proxy(request, token);
  expect((await as.patch(`profiles/records/${profileId}`, { displayName: `${title} Profile` })).status()).toBe(200);
  const link = await as.post('links/records', { profile: profileId, title, order: 0, mode: '', destination: `https://example.com/${name}/0` });
  expect(link.status(), title).toBe(200);
  return { username: name, profileId };
}

// A fresh 375px context for the Creator; the caller closes it.
const narrowPage = async (browser: Browser) => (await browser.newContext({ viewport: NARROW })).newPage();
const profileSelect = (page: Page) => page.getByLabel('Profile', { exact: true });

test.describe('the cap, over HTTP at the public origin', () => {
  test('a verified account claims slots 2 and 3; slot 4, slot 0, no slot and a taken slot are refused', async ({ request }) => {
    const { token, id, creator } = await verifiedCreator(request, []);
    expect((await claim(request, token, id, 4)).status(), 'slot 4').toBe(400);
    expect((await claim(request, token, id, 0)).status(), 'slot 0').toBe(400);
    expect((await proxy(request, token).post('profiles/records', { username: username(), owner: id, mode: 'escape_ig' })).status(), 'no slot').toBe(400);
    expect((await claim(request, token, id, 1)).status(), 'slot 1, taken').toBe(400);
    expect((await claim(request, token, id, 2)).status(), 'slot 2').toBe(200);
    expect((await claim(request, token, id, 2)).status(), 'slot 2, taken').toBe(400);
    expect((await claim(request, token, id, 3)).status(), 'slot 3').toBe(200);
    expect((await claim(request, token, id, 4)).status(), 'slot 4 with every slot taken').toBe(400);
    const owned = await (await proxy(request, token).get('profiles/records?sort=slot')).json();
    expect(owned.items.map((p: { slot: number }) => p.slot), 'the slots the account holds').toEqual([1, 2, 3]);
    expect(owned.items[0].username).toBe(creator.username);
    // Another account's slot 1 is its own.
    const other = await verifiedCreator(request, []);
    expect((await claim(request, other.token, other.id, 2)).status(), 'another account\'s slot 2').toBe(200);
  });

  test('an unverified account claims slot 1 only', async ({ request }) => {
    const { token, id } = await account(request);
    expect((await claim(request, token, id, 2)).status(), 'slot 2 before any').toBe(400);
    expect((await claim(request, token, id, 1)).status(), 'slot 1').toBe(200);
    expect((await claim(request, token, id, 2)).status(), 'slot 2 after slot 1').toBe(400);
  });

  test('the owner of a second Profile cannot change its slot, Username, owner or badge', async ({ request }) => {
    const a = await verifiedCreator(request, []);
    const b = await verifiedCreator(request, []);
    const second = await onboardedProfile(request, a.token, a.id, 2, 'Second card');
    const before = await readBack(request, { token: a.token, profileId: second.profileId });
    const as = proxy(request, a.token);
    for (const change of [{ slot: 3 }, { slot: 1 }, { username: `${second.username}x` }, { owner: b.id }, { verified: true }]) {
      refused(await as.patch(`profiles/records/${second.profileId}`, change));
    }
    expect(await readBack(request, { token: a.token, profileId: second.profileId })).toEqual(before);
  });
});

test.describe('the Editor and Stats with several Profiles, at 375px', () => {
  test('"Add a Profile" opens /edit/new, the claim and Onboarding make the second Profile current, and the "Profile" select switches back, remembered on reload', async ({ browser, request, baseURL }) => {
    const origin = new URL(baseURL!).origin;
    const { creator } = await verifiedCreator(request, [['First card', '']]);
    const page = await narrowPage(browser);
    await logIn(page, creator);
    await expect(heading(page, EDITOR)).toBeVisible();
    await expect(profileSelect(page)).toHaveCount(0);

    await page.getByRole('link', { name: 'Add a Profile', exact: true }).click();
    await expect(page).toHaveURL(/\/edit\/new$/);
    await expect(heading(page, CLAIM)).toBeVisible();
    const second = username();
    await page.getByLabel('Username').fill(second);
    await page.getByRole('button', { name: 'Claim' }).click();

    // The same derived Onboarding, for the new Profile: no verify step, since the email is verified.
    await expect(heading(page, 'Your Profile')).toBeVisible();
    await page.getByLabel('Display name').fill('Second Profile');
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(heading(page, 'Add your first Link')).toBeVisible();
    await page.getByLabel('Title').fill('Second card');
    await page.getByLabel('Destination').fill(`https://example.com/${second}/0`);
    await page.getByRole('button', { name: 'Save link' }).click();
    await expect(heading(page, 'Your page is live')).toBeVisible();
    await expect(page.getByText(`${origin}/${second}`, { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Go to the Editor' }).click();

    await expect(heading(page, EDITOR)).toBeVisible();
    await expect(page.locator('[data-test="bio-link-value"]')).toHaveText(`${origin}/${second}`);
    await expect(featured(page)).toHaveText(['Second card']);
    await expect(profileSelect(page).locator('option')).toHaveText([`@${creator.username}`, `@${second}`]);
    await expect(profileSelect(page).locator('option:checked')).toHaveText(`@${second}`);
    await expect(page.getByRole('link', { name: 'Add a Profile', exact: true })).toBeVisible();

    await profileSelect(page).selectOption({ label: `@${creator.username}` });
    await expect(page.locator('[data-test="bio-link-value"]')).toHaveText(`${origin}/${creator.username}`);
    await expect(featured(page)).toHaveText(['First card']);
    await expect(page.getByLabel('Display name')).toHaveValue('Before Name');
    await page.reload();
    await expect(heading(page, EDITOR)).toBeVisible();
    await expect(featured(page)).toHaveText(['First card']);
    await expect(profileSelect(page).locator('option:checked')).toHaveText(`@${creator.username}`);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), 'no horizontal overflow').toBe(true);
    await page.context().close();
  });

  test('with every slot taken there is no "Add a Profile", and /edit/new opens the Editor', async ({ browser, request }) => {
    const { creator, token, id } = await verifiedCreator(request, [['Only card', '']]);
    for (const slot of [2, 3]) expect((await claim(request, token, id, slot)).status(), `slot ${slot}`).toBe(200);
    const page = await narrowPage(browser);
    await logIn(page, creator);
    await expect(heading(page, EDITOR)).toBeVisible();
    await expect(profileSelect(page).locator('option')).toHaveCount(3);
    await expect(page.getByRole('link', { name: 'Add a Profile', exact: true })).toHaveCount(0);
    await page.goto('/edit/new');
    await expect(heading(page, EDITOR)).toBeVisible();
    await expect(page).toHaveURL(/\/edit\/home$/);
    await page.context().close();
  });

  test('Stats counts the current Profile only, and the "Profile" select on Stats switches to the other', async ({ browser, request, baseURL }) => {
    const origin = new URL(baseURL!).origin;
    const { creator, token, id } = await verifiedCreator(request, [['First card', '']]);
    const second = await onboardedProfile(request, token, id, 2, 'Second card');
    // Two Page Views on the first Profile and one on the second, each counted once its ping is answered.
    for (const name of [creator.username, creator.username, second.username]) {
      const context = await phoneContext(browser, { origin });
      const visitor = await context.newPage();
      const ping = visitor.waitForResponse((res) => res.request().method() === 'POST' && new URL(res.url()).pathname === `/v/${name}`);
      await visitor.goto(`/${name}`);
      expect((await ping).status(), `the Page View Ping for ${name}`).toBe(204);
      await context.close();
    }

    const page = await narrowPage(browser);
    const filters: string[] = [];
    page.on('request', (req) => {
      const url = new URL(req.url());
      if (url.pathname === '/api/collections/dailyStats/records') filters.push(url.searchParams.get('filter') || '');
    });
    await logIn(page, creator);
    await expect(heading(page, EDITOR)).toBeVisible();
    await page.getByRole('navigation', { name: 'Creator' }).getByRole('link', { name: 'Stats', exact: true }).click();
    await expect(heading(page, 'Stats')).toBeVisible();
    const views = page.getByRole('region', { name: 'Page Views', exact: true }).getByRole('paragraph');
    const linkRows = page.getByRole('table', { name: 'Links', exact: true }).getByRole('rowheader');
    await expect(views).toHaveText('2');
    await expect(linkRows).toHaveText(['First card']);
    expect(filters.length).toBeGreaterThan(0);
    for (const filter of filters) expect(filter).toContain(`profile='`);
    const firstFilters = filters.length;

    await profileSelect(page).selectOption({ label: `@${second.username}` });
    await expect(page).toHaveURL(/\/edit\/stats$/);
    await expect(heading(page, 'Stats')).toBeVisible();
    await expect(linkRows).toHaveText(['Second card']);
    await expect(views).toHaveText('1');
    expect(filters.slice(firstFilters).every((f) => f.includes(`profile='${second.profileId}'`)), 'the second Profile\'s filter').toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), 'no horizontal overflow').toBe(true);
    await page.context().close();
  });
});
