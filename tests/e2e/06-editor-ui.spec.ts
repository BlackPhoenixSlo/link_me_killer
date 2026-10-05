import { test, expect, type APIRequestContext } from '@playwright/test';
import { account, featured, fresh, heading, logIn, mailedLink, onLocalStack, PHONE, proxy, servedProfile, trackingAndGeo, verifiedCreator } from './helpers';

// The Editor's redesign (docs/spec/editor-redesign.md, section 11's rulings) at its seams, at 390×844: the in-page delete dialog,
// the "Tracking and Geo Rule" disclosure, the Default Mode helper, the Creator nav, the Sections jump chips and the landing page.
// Every Creator is a throwaway (helpers.ts, verifiedCreator), taken down with the test stack.

test.use({ viewport: PHONE });

// The Link titles the next load of the public Profile shows.
const titles = async (request: APIRequestContext, username: string) =>
  (await servedProfile(request, username)).links.map((l) => l.title);

test.describe('the Editor\'s home and Link form', () => {
  test.skip(!onLocalStack(), 'the mail catcher and the Operator\'s PocketBase port are on the local test stack only');

  test('Delete asks in the page: "Keep it" and Esc keep the Link and hand focus back, "Delete link" removes it', async ({ page, request }) => {
    const { creator } = await verifiedCreator(request, [['Kept card', ''], ['Gone card', '']]);
    await logIn(page, creator);
    await expect(featured(page)).toHaveText(['Kept card', 'Gone card']);
    const remove = page.getByRole('button', { name: 'Delete Gone card' });
    const dialog = page.getByRole('alertdialog', { name: 'Delete this link?' });

    await remove.click();
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('Gone card');
    await expect(dialog.getByRole('button', { name: 'Keep it', exact: true })).toBeFocused();
    await dialog.getByRole('button', { name: 'Keep it', exact: true }).click();
    await expect(dialog).toBeHidden();
    await expect(remove).toBeFocused();

    await remove.click();
    await expect(dialog).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(remove).toBeFocused();
    await expect(featured(page)).toHaveText(['Kept card', 'Gone card']);
    expect(await titles(request, creator.username)).toEqual(['Kept card', 'Gone card']);

    await remove.click();
    await dialog.getByRole('button', { name: 'Delete link', exact: true }).click();
    await expect(featured(page)).toHaveText(['Kept card']);
    await expect(page.getByRole('button', { name: 'Kept card', exact: true })).toBeFocused();
    expect(await titles(request, creator.username)).toEqual(['Kept card']);
  });

  test('"Tracking and Geo Rule" is closed on a new Link and on one with none set, and open on a stored Link with a Tracking Code', async ({ page, request }) => {
    const { creator, token, linkIds } = await verifiedCreator(request, [['Plain card', ''], ['Tracked card', '']]);
    expect((await proxy(request, token).patch(`links/records/${linkIds[1]}`, { defaultTrackingCode: '7' })).status()).toBe(200);
    await logIn(page, creator);
    const code = page.getByLabel('Default Tracking Code');

    await page.getByRole('button', { name: 'Add link' }).click();
    await expect(heading(page, 'Add link')).toBeVisible();
    await expect(trackingAndGeo(page)).not.toHaveAttribute('open');
    await expect(code).toBeHidden();
    await page.getByText('Tracking and Geo Rule', { exact: true }).click();
    await expect(code).toBeVisible();
    await page.getByRole('button', { name: 'Cancel' }).click();

    await page.getByRole('button', { name: 'Plain card', exact: true }).click();
    await expect(heading(page, 'Edit link')).toBeVisible();
    await expect(trackingAndGeo(page)).not.toHaveAttribute('open');
    await expect(code).toBeHidden();
    await page.getByRole('button', { name: 'Cancel' }).click();

    await page.getByRole('button', { name: 'Tracked card', exact: true }).click();
    await expect(heading(page, 'Edit link')).toBeVisible();
    await expect(trackingAndGeo(page)).toHaveAttribute('open');
    await expect(code).toBeVisible();
    await expect(code).toHaveValue('7');
  });

  test('the Default Mode helper follows the select, and "Default Mode saved." shows only once Save is pressed', async ({ page, request }) => {
    const { creator } = await verifiedCreator(request, [['Mode card', '']]);
    await logIn(page, creator);
    await expect(heading(page, 'Edit Profile')).toBeVisible();
    const mode = page.getByLabel('Default Mode');
    const help = page.locator('[data-test="default-mode-help"]');
    const saved = page.getByText('Default Mode saved.', { exact: true });

    await expect(mode).toHaveValue('escape_ig');
    await expect(help).toHaveText(/^Escape /);
    await mode.selectOption({ label: 'Direct' });
    await expect(help).toHaveText(/^Direct /);
    await expect(saved).toHaveCount(0);
    expect((await servedProfile(request, creator.username)).profile.mode, 'nothing saved on change').toBe('escape_ig');

    await page.getByRole('button', { name: 'Save default Mode' }).click();
    await expect(saved).toBeVisible();
    expect((await servedProfile(request, creator.username)).profile.mode).toBe('direct');
    // A choice changed after the save is not saved yet, so the message goes.
    await mode.selectOption({ label: 'Deeplink' });
    await expect(help).toHaveText(/^Deeplink /);
    await expect(saved).toHaveCount(0);
  });

  test('the Creator nav holds exactly "Editor" and "Stats", the screen shown marked aria-current="page"', async ({ page, request }) => {
    const { creator } = await verifiedCreator(request, [['Nav card', '']]);
    await logIn(page, creator);
    await expect(heading(page, 'Edit Profile')).toBeVisible();
    const nav = page.getByRole('navigation', { name: 'Creator' });
    await expect(nav.getByRole('link')).toHaveText(['Editor', 'Stats']);
    await expect(nav.getByRole('link', { name: 'Editor', exact: true })).toHaveAttribute('aria-current', 'page');
    await expect(nav.getByRole('link', { name: 'Stats', exact: true })).not.toHaveAttribute('aria-current');

    await nav.getByRole('link', { name: 'Stats', exact: true }).click();
    await expect(heading(page, 'Stats')).toBeVisible();
    await expect(nav.getByRole('link')).toHaveText(['Editor', 'Stats']);
    await expect(nav.getByRole('link', { name: 'Stats', exact: true })).toHaveAttribute('aria-current', 'page');
    await expect(nav.getByRole('link', { name: 'Editor', exact: true })).not.toHaveAttribute('aria-current');

    await nav.getByRole('link', { name: 'Editor', exact: true }).click();
    await expect(heading(page, 'Edit Profile')).toBeVisible();
  });

  test('a Sections jump chip scrolls to its card and keeps what was typed in Display name', async ({ page, request }) => {
    const { creator } = await verifiedCreator(request, [['Jump card', '']]);
    await logIn(page, creator);
    await expect(heading(page, 'Edit Profile')).toBeVisible();
    const chips = page.getByRole('navigation', { name: 'Sections' });
    await expect(chips.getByRole('link')).toHaveText(['Links', 'Profile', 'Modes']);
    const displayName = page.getByLabel('Display name');
    await displayName.fill('Typed, not saved');

    await chips.getByRole('link', { name: 'Modes', exact: true }).click();
    await expect(page).toHaveURL(/\/edit\/home#modes$/);
    await expect(page.getByRole('heading', { name: 'Quick Settings' })).toBeInViewport();
    await expect(heading(page, 'Edit Profile')).toBeAttached();
    await expect(displayName).toHaveValue('Typed, not saved');

    await chips.getByRole('link', { name: 'Profile', exact: true }).click();
    await expect(displayName).toBeInViewport();
    await expect(displayName).toHaveValue('Typed, not saved');
    expect((await servedProfile(request, creator.username)).profile.displayName, 'nothing saved by a jump').toBe('Before Name');
  });
});

test('the landing page has one h1, one "Create your page" and one "Log in" link, the not-found note in the first screen, and no script', async ({ page }) => {
  await page.goto('/landing.html');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(['One link for your bio']);
  const create = page.getByRole('link', { name: 'Create your page', exact: true });
  await expect(create).toHaveCount(1);
  await expect(create).toHaveAttribute('href', '/edit/signup');
  const logInLink = page.getByRole('link', { name: 'Log in', exact: true });
  await expect(logInLink).toHaveCount(1);
  await expect(logInLink).toHaveAttribute('href', '/edit/login');
  await expect(page.getByText('Followed a link here? That page doesn\'t exist.')).toBeInViewport();
  await expect(page.locator('script')).toHaveCount(0);
});

// The demo Creator: the Operator claims the Username `demo` on the VPS, and the landing's "See a demo" opens that Profile. Here
// a throwaway Creator signs up as `demo` (not a reserved name) and is verified, named and given one Link through the proxy, as
// verifiedCreator arranges its Creators.
test.describe('the landing page\'s demo', () => {
  test.skip(!onLocalStack(), 'the mail catcher is on the local test stack only');

  test('"See a demo" on / opens the Profile at /demo, which shows the demo Creator\'s display name and Link', async ({ page, request }) => {
    const { creator, token, id } = await account(request, { ...fresh(), username: 'demo' });
    const as = proxy(request, token);
    const claimed = await as.post('profiles/records', { username: creator.username, owner: id, mode: 'escape_ig' });
    expect(claimed.status()).toBe(200);
    const profileId = (await claimed.json()).id as string;
    expect((await proxy(request).post('users/request-verification', { email: creator.email })).status()).toBe(204);
    const verification = new URL(await mailedLink(creator.email, '/edit/verify')).searchParams.get('token');
    expect((await proxy(request).post('users/confirm-verification', { token: verification })).status()).toBe(204);
    expect((await as.patch(`profiles/records/${profileId}`, { displayName: 'Demo Creator' })).status()).toBe(200);
    const link = { profile: profileId, title: 'Demo card', order: 0, mode: '', destination: 'https://example.com/demo/0' };
    expect((await as.post('links/records', link)).status()).toBe(200);

    await page.goto('/');
    await page.getByRole('link', { name: 'See a demo', exact: true }).click();
    await expect(page).toHaveURL(/\/demo$/);
    await expect(page.locator('#displayName')).toHaveText('Demo Creator');
    await expect(page.locator('.link-card .link-title')).toHaveText(['Demo card']);
  });
});
