import { test, expect } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { withoutBootstrap } from './domains-helpers';
import {
  account, CLAIM, createOwnerlessProfile, EDITOR, expectServedWebp, expectVerifyScreen, featured, forgotPassword, fresh, furnishedCreator,
  handOver, heading, holdsDestination, INSTAGRAM_UA, isWebp, LOG_IN, logIn, logInToHandedOver, mailedLink, mailedLinks, markVerified,
  onLocalStack, openProfile, openTracking, operator, ownerOf, passAgeGate, PHONE, phoneContext, pngFile, probe, proxy, reach, readBack,
  recordIds, refused, recordNavigations, servedProfile, SIGN_UP, signUp, upload, VERIFY, verifiedCreator, visitorSees, xSafari,
} from './helpers';

// Phase 3 (docs/spec/phase-03-auth-and-editor.md, Testing Decisions): one seam, the running v2 stack at Playwright's baseURL.
// Creator journeys run at 390×844, the Visitor and every second log-in in a fresh context; rule checks call the proxy over HTTP.
// Ticket 25: sign-up, the claim and its refusals, the verify screen, the landing page's button, and the proxy's allow-list.
// Ticket 26: the verified-email gate over HTTP, and Onboarding after verification to a live Profile like an imported one.
// Ticket 31: every verified Creator follows the verification link mailed to the local mail catcher (helpers.ts, mailedLink);
// marking an account verified as a superuser is left to the hand-over alone (spec, Testing Decisions, Mail).
// Every account is a throwaway with a fresh `signup_<hex>` email and Username; nothing is cleaned up, because the test stack
// is taken down with its data after the run (tests/stack.sh). Destinations are compared as booleans and never printed.
const ROOT = join(__dirname, '..', '..');

test.use({ viewport: PHONE });

test.describe('sign-up and the claim', () => {
  test('at 390×844 a stranger signs up with no invitation and lands signed in on "verify your email"; Continue keeps them there', async ({ page, request }) => {
    const creator = fresh();
    await signUp(page, creator);
    await expectVerifyScreen(page);
    await expect(page.getByRole('main')).toContainText(creator.email);
    // The claim made the Profile, so it is live at once.
    expect((await request.get(`/api/profiles/${creator.username}.json`)).status()).toBe(200);
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page.getByText('Your email is not verified yet.')).toBeVisible();
    await expectVerifyScreen(page);
    // Still signed in: opening the Editor again lands on the same step.
    await page.goto('/edit');
    await expectVerifyScreen(page);
  });

  test('"Julia" typed into the Username field shows as "julia"', async ({ page }) => {
    await page.goto('/edit/signup');
    const field = page.getByLabel('Username');
    await field.fill('Julia');
    await expect(field).toHaveValue('julia');
    await field.fill('');
    await field.pressSequentially('JuLia_99');
    await expect(field).toHaveValue('julia_99');
  });

  test('fixture, edit, ab and bad.name are refused with their reason on the claim step, then a valid Username is claimed', async ({ page }) => {
    const creator = fresh();
    await signUp(page, { ...creator, username: 'fixture' });
    await expect(heading(page, CLAIM)).toBeVisible();
    await expect(page).toHaveURL(/\/edit\/claim$/);
    const reason = page.getByRole('status');
    await expect(reason).toContainText('“fixture” is taken');
    await expect(reason).toContainText('the Operator hands over Usernames held on v1 at Cutover');
    // Signed in: a reload stays on the claim step.
    await page.reload();
    await expect(heading(page, CLAIM)).toBeVisible();
    const field = page.getByLabel('Username');
    const refusals: [string, string][] = [
      ['edit', '“edit” is reserved'],
      ['ab', 'Too short'],
      ['bad.name', 'Not allowed: a Username has only lowercase letters, digits and underscore'],
      ['a'.repeat(31), 'Too long'],
      ['fixture', 'is taken'],
    ];
    for (const [name, text] of refusals) {
      await field.fill(name);
      await page.getByRole('button', { name: 'Claim' }).click();
      await expect(reason, name).toContainText(text);
      await expect(heading(page, CLAIM), name).toBeVisible();
    }
    await field.fill(creator.username);
    await page.getByRole('button', { name: 'Claim' }).click();
    await expectVerifyScreen(page);
  });

  test('logging in again in a fresh context lands on the verify screen; after a failed claim, on the claim step', async ({ page, browser }) => {
    const claimed = fresh();
    await signUp(page, claimed);
    await expectVerifyScreen(page);
    const unclaimed = fresh();
    await signUp(page, { ...unclaimed, username: 'edit' });
    await expect(heading(page, CLAIM)).toBeVisible();

    for (const [creator, step] of [[claimed, VERIFY], [unclaimed, CLAIM]] as const) {
      const context = await phoneContext(browser);
      const second = await context.newPage();
      await logIn(second, creator);
      await expect(heading(second, step), creator.username).toBeVisible();
      await context.close();
    }
  });

  test('/edit with no session shows log-in, which links to sign-up', async ({ page }) => {
    await page.goto('/edit');
    await expect(page).toHaveURL(/\/edit\/login$/);
    await expect(heading(page, LOG_IN)).toBeVisible();
    await page.getByRole('link', { name: 'Sign up' }).click();
    await expect(heading(page, SIGN_UP)).toBeVisible();
    await expect(page).toHaveURL(/\/edit\/signup$/);
  });
});

test('in a fresh context the landing page\'s "Create your page" opens the sign-up screen, and no n8n Form link remains', async ({ page }) => {
  await page.goto('/landing.html');
  await expect(page.getByRole('heading', { name: 'One link for your bio', exact: true, level: 1 })).toBeVisible();
  const hrefs = await page.locator('a').evaluateAll((as) => as.map((a) => a.getAttribute('href') || ''));
  expect(hrefs.some((h) => h.includes('n8n'))).toBe(false);
  expect(hrefs.filter((h) => /n8n|netlify/i.test(h)), 'links to n8n or Netlify').toEqual([]);
  await expect(page.locator('body')).not.toContainText(/n8n/i);
  await page.getByRole('link', { name: 'Create your page', exact: true }).click();
  await expect(page).toHaveURL(/\/edit\/signup$/);
  await expect(heading(page, SIGN_UP)).toBeVisible();
  await expect(page.getByLabel('Username')).toBeVisible();
});

test.describe('rules and the proxy, over HTTP at the public origin', () => {
  test('every reserved name is refused as a claim, each top-level route of 3 or more characters the app serves included', async ({ request }) => {
    // The list comes from the app's routes; a name on it with no clause in the migration is claimed below and fails.
    const run = spawnSync('node', [join(ROOT, 'app', 'bin', 'reserved-usernames')], { encoding: 'utf8' });
    expect(run.stderr).toBe('');
    expect(run.status).toBe(0);
    const reserved: string[] = JSON.parse(run.stdout);
    expect(reserved).toEqual(expect.arrayContaining(['api', 'edit', 'images', 'internal', 'netlify']));
    const { token, id } = await account(request);
    const creator = proxy(request, token);
    for (const name of reserved) {
      const res = await creator.post('profiles/records', { username: name, owner: id, mode: 'escape_ig', slot: 1 });
      expect(res.status(), name).toBe(400);
      expect((await res.json()).data, name).toEqual({});
    }
    // The same account can still claim: the refusals were the names, not the account.
    const ok = await creator.post('profiles/records', { username: `signup_${randomBytes(4).toString('hex')}`, owner: id, mode: 'escape_ig', slot: 1 });
    expect(ok.status()).toBe(200);
  });

  test('the claim sets only Username, owner, default Mode and slot, for the Creator alone, and an unverified account claims one', async ({ request }) => {
    const first = await account(request);
    const other = await account(request);
    const as = proxy(request, first.token);
    const username = () => `signup_${randomBytes(4).toString('hex')}`;
    const refusedClaims: [string, object][] = [
      ['a display name', { username: username(), owner: first.id, slot: 1, displayName: 'x' }],
      ['the verified badge', { username: username(), owner: first.id, slot: 1, verified: true }],
      ['another owner', { username: username(), owner: other.id, slot: 1 }],
      ['no owner', { username: username(), slot: 1 }],
      ['no slot', { username: username(), owner: first.id, mode: 'escape_ig' }],
    ];
    for (const [name, body] of refusedClaims) expect((await as.post('profiles/records', body)).status(), name).toBe(400);
    expect((await proxy(request).post('profiles/records', { username: username(), owner: '', slot: 1 })).status(), 'anonymous claim').toBe(400);
    const claimed = await as.post('profiles/records', { username: username(), owner: first.id, mode: 'escape_ig', slot: 1 });
    expect(claimed.status()).toBe(200);
    expect((await claimed.json()).mode).toBe('escape_ig');
    // A second Profile needs a verified email (Phase 6; tests/e2e/07-sites.spec.ts holds the cap's other cases).
    const second = await as.post('profiles/records', { username: username(), owner: first.id, mode: 'escape_ig', slot: 2 });
    expect(second.status(), 'a second Profile while unverified').toBe(400);
    // A sign-up that sets anything but email and password is refused.
    const c = fresh();
    for (const extra of [{ verified: true }, { name: 'x' }, { emailVisibility: true }]) {
      const res = await proxy(request).post('users/records', { email: c.email, password: c.password, passwordConfirm: c.password, ...extra });
      expect(res.status(), JSON.stringify(extra)).toBe(400);
    }
  });

  test('_superusers and /api/realtime answer 404 at the public origin, while the same Creator\'s calls through the proxy succeed', async ({ request }) => {
    expect((await request.post('/api/collections/_superusers/auth-with-password', { data: { identity: 'a@example.com', password: 'x' } })).status()).toBe(404);
    expect((await request.get('/api/realtime')).status()).toBe(404);
    const { token, id, creator } = await account(request);
    const as = proxy(request, token);
    const claimed = await as.post('profiles/records', { username: creator.username, owner: id, mode: 'escape_ig', slot: 1 });
    expect(claimed.status()).toBe(200);
    expect((await as.post('users/auth-refresh')).status()).toBe(200);
    expect((await as.post('users/request-verification', { email: creator.email })).status()).toBe(204);
    const own = await as.get('users/records');
    expect(own.status()).toBe(200);
    expect((await own.json()).items.map((u: { id: string }) => u.id)).toEqual([id]);
    expect((await as.get(`users/records/${id}`)).status()).toBe(200);
    const profiles = await as.get('profiles/records');
    expect(profiles.status()).toBe(200);
    expect((await profiles.json()).items.map((p: { username: string }) => p.username)).toEqual([creator.username]);
    // With the Creator's token, too, everything outside the allow-list is the app's own 404: none of it reaches PocketBase. The
    // last path matches the allow-list's collection prefix, so only the proxy's encoded-slash guard keeps it from PocketBase.
    const closed: [string, string][] = [
      ['POST', '/api/collections/_superusers/auth-with-password'],
      ['GET', '/api/collections/_superusers/records'],
      ['GET', '/api/collections/events/records'],
      ['GET', '/api/collections/users'],
      ['GET', '/api/realtime'],
      ['POST', '/api/batch'],
      ['GET', '/api/settings'],
      ['GET', '/api/logs'],
      ['GET', '/api/health'],
      ['GET', '/api/collections/users/records%2F..%2F..%2F_superusers%2Frecords'],
    ];
    for (const [method, path] of closed) {
      const res = await request.fetch(path, { method, headers: { Authorization: token }, data: method === 'POST' ? {} : undefined });
      expect(res.status(), `${method} ${path}`).toBe(404);
      expect(await res.json(), `${method} ${path}`).toEqual({ error: 'Not found' });
    }
    // PocketBase's admin UI keeps Phase 2's answer: the Page Copy's index page (with ticket 39's bootstrap block), not the dashboard.
    expect(withoutBootstrap(await (await request.get('/_/')).text())).toBe(readFileSync(join(ROOT, 'app', 'public', 'index.html'), 'utf8'));
  });
});

// ---- Ticket 26: the verified-email gate, and Onboarding to a live Profile -------------------------------------------------

test.describe('the verified-email gate', () => {
  test('over HTTP an unverified Creator\'s token cannot update its Profile, add a Link or upload an avatar; the owner reads both back unchanged', async ({ request }) => {
    const { token, id, creator } = await account(request);
    const as = proxy(request, token);
    const claimed = await as.post('profiles/records', { username: creator.username, owner: id, mode: 'escape_ig', slot: 1 });
    expect(claimed.status()).toBe(200);
    const profileId = (await claimed.json()).id as string;
    const before = await readBack(request, { token, profileId });
    expect(before.links).toEqual([]);

    // PocketBase answers an update its rule refuses as a record it cannot find (404), and a refused create with a bare 400.
    const update = await as.patch(`profiles/records/${profileId}`, { displayName: 'Not yet', bio: 'not yet' });
    expect(update.status(), 'Profile update').toBe(404);
    const link = await as.post('links/records', { profile: profileId, title: 'Not yet', order: 0, destination: `https://example.com/${creator.username}` });
    expect(link.status(), 'Link create').toBe(400);
    // The upload endpoint writes with the caller's token, so PocketBase's refusal is its answer.
    const avatar = await upload(request, token, `profiles/${profileId}/avatar`);
    expect(avatar.status(), 'avatar upload').toBe(404);

    const after = await readBack(request, { token, profileId });
    expect(after).toEqual(before);
    expect(after.profile.displayName === '' && after.profile.bio === '' && after.profile.avatar === '').toBe(true);
  });
});

test.describe('Onboarding after verification', () => {
  test.skip(!onLocalStack(), 'the mail catcher and the Operator\'s PocketBase port are on the local test stack only');

  test('at 390×844 a verified Creator goes through Onboarding to a live Profile whose Links act like imported ones', async ({ page, browser, request, baseURL }) => {
    test.setTimeout(180_000);
    const creator = fresh();
    const origin = new URL(baseURL!).origin;
    const address = `${origin}/${creator.username}`;
    // Test-only Destinations on example.com: referenced by variable, still compared as booleans.
    const adultDestination = `https://example.com/${creator.username}`;
    const directDestination = `https://example.com/direct/${creator.username}`;
    const holdsEither = (body: string) => body.includes(adultDestination) || body.includes(directDestination);
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write'], { origin });

    await signUp(page, creator);
    await expectVerifyScreen(page);
    await page.goto(await mailedLink(creator.email, '/edit/verify'));
    await expect(heading(page, 'Email verified')).toBeVisible();
    await page.getByRole('button', { name: 'Continue' }).click();

    // The Profile step: no display name, no move.
    await expect(heading(page, 'Your Profile')).toBeVisible();
    await expect(page).toHaveURL(/\/edit\/profile$/);
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page.getByRole('status')).toHaveText('Enter a display name.');
    await expect(heading(page, 'Your Profile')).toBeVisible();
    await page.getByLabel('Display name').fill('Onboarding Creator');
    await page.getByLabel('Bio').fill('Made in the Editor.');
    await page.getByLabel('Profile picture').setInputFiles(pngFile('avatar.png', [200, 40, 40]));
    await page.getByRole('button', { name: 'Continue' }).click();

    // The first-Link step is the Link form.
    await expect(heading(page, 'Add your first Link')).toBeVisible();
    await expect(page).toHaveURL(/\/edit\/first-link$/);
    const mode = page.getByLabel('Mode');
    await expect(mode).toHaveValue('');
    await expect(mode.locator('option:checked')).toHaveText('Profile default (currently Escape)');
    await page.getByLabel('Title').fill('Adult card');
    await page.getByLabel('Destination').fill(adultDestination);
    await page.getByLabel('Icon').selectOption({ label: 'OnlyFans' });
    await page.getByLabel('Background image').setInputFiles(pngFile('background.png', [40, 40, 200]));
    await page.getByLabel('18+ Age Gate').check();
    await mode.selectOption({ label: 'Escape' });
    await openTracking(page);
    await page.getByLabel('OnlyFans tracking').check();
    await page.getByLabel('Default Tracking Code').fill('7');
    await page.getByRole('button', { name: 'Save link' }).click();

    // The live address, with Open and Copy.
    await expect(heading(page, 'Your page is live')).toBeVisible();
    await expect(page.getByText(address, { exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Open' })).toHaveAttribute('href', address);
    await page.getByRole('button', { name: 'Copy' }).click();
    await expect(page.getByRole('status')).toHaveText('Copied.');
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(address);

    // The Editor: the Links list, and "Add link" opening the same form.
    await page.getByRole('button', { name: 'Go to the Editor' }).click();
    await expect(heading(page, 'Edit Profile')).toBeVisible();
    const rows = page.getByRole('list', { name: 'Links' }).getByRole('listitem');
    await expect(rows).toHaveText(['Adult card']);
    await page.getByRole('button', { name: 'Add link' }).click();
    await expect(heading(page, 'Add link')).toBeVisible();
    await expect(page.getByLabel('Mode').locator('option:checked')).toHaveText('Profile default (currently Escape)');
    await page.getByLabel('Title').fill('Direct card');
    await page.getByLabel('Destination').fill(directDestination);
    await page.getByLabel('Mode').selectOption({ label: 'Direct' });
    await expect(page.getByLabel('18+ Age Gate')).not.toBeChecked();
    await page.getByRole('button', { name: 'Save link' }).click();
    await expect(heading(page, 'Edit Profile')).toBeVisible();
    await expect(rows).toHaveText(['Adult card', 'Direct card']);
    await page.screenshot({ path: join(ROOT, '.scratch', 'goal_ai', 'shots', '03-auth-and-editor.png'), fullPage: true });
    // Progress is derived: opening /edit again lands in the Editor.
    await page.goto('/edit');
    await expect(heading(page, 'Edit Profile')).toBeVisible();

    // The stored values (spec, Contracts, Stored values), read through the proxy with the Editor's own token, as booleans.
    const own = proxy(request, (await page.evaluate(() => localStorage.getItem('ofl.token')))!);
    const [profile] = (await (await own.get(`profiles/records?filter=${encodeURIComponent(`username='${creator.username}'`)}`)).json()).items;
    expect(profile.displayName === 'Onboarding Creator' && profile.bio === 'Made in the Editor.' && profile.avatar !== '' && profile.mode === 'escape_ig').toBe(true);
    const stored = (await (await own.get(`links/records?sort=order&filter=${encodeURIComponent(`profile='${profile.id}'`)}`)).json()).items;
    expect(stored.length).toBe(2);
    const [adult, direct] = stored;
    expect(adult.destination === adultDestination, 'the Adult Link\'s Destination as entered').toBe(true);
    expect([adult.order, adult.isAdult, adult.mode, adult.tracking, adult.defaultTrackingCode]).toEqual([0, true, 'escape_ig', true, '7']);
    expect(adult.icon !== '' && adult.backgroundImage !== '').toBe(true);
    expect(direct.destination === directDestination, 'the Direct Link\'s Destination as entered').toBe(true);
    expect([direct.order, direct.isAdult, direct.mode, direct.tracking, direct.defaultTrackingCode, direct.icon, direct.backgroundImage]).toEqual([1, false, 'direct', false, '', '', '']);
    for (const l of stored) expect(l.linkId).toMatch(/^[a-z0-9]{12}$/);

    // The Visitor, in a fresh context with no Editor session; nothing leaves the machine.
    const context = await phoneContext(browser, { origin });
    const visitor = await context.newPage();
    let pressed = false;
    const seen: Promise<{ url: string; type: string; body: Buffer }>[] = [];
    visitor.on('response', (res) => {
      if (pressed) return;
      seen.push(res.body().then((body) => ({ url: res.url(), type: res.headers()['content-type'] || '', body }), () => ({ url: res.url(), type: '', body: Buffer.alloc(0) })));
    });
    const profileJson = visitor.waitForResponse((res) => new URL(res.url()).pathname === `/api/profiles/${creator.username}.json`);
    await visitor.goto(`/${creator.username}`);
    const served: { profile: { avatarUrl: string }; links: { id: string; title: string; icon: string; backgroundImage: string; isAdult: boolean }[] } = await (await profileJson).json();
    await expect(visitor.locator('#displayName')).toHaveText('Onboarding Creator');
    await expect(visitor.locator('.link-card .link-title')).toHaveText(['Adult card', 'Direct card']);
    await expect(visitor.locator('#avatar')).toHaveAttribute('src', served.profile.avatarUrl);
    await visitor.waitForLoadState('networkidle');
    const responses = await Promise.all(seen);
    for (const url of [served.profile.avatarUrl, served.links[0].backgroundImage]) {
      expect(url.startsWith('/api/files/'), url).toBe(true);
      const hit = responses.find((r) => new URL(r.url).pathname === url);
      expect(hit, `the page loaded ${url}`).toBeTruthy();
      expect(hit!.type, url).toBe('image/webp');
      expect(isWebp(hit!.body), url).toBe(true);
    }
    // The stock icon the Visitor is served is the Page Copy's own WebP, byte for byte, as the v1 Import stores one.
    const icon = await (await request.get(served.links[0].icon)).body();
    expect(icon.equals(readFileSync(join(ROOT, 'app', 'public', 'images', 'onlyicon.webp'))), 'the stock icon as the Page Copy\'s').toBe(true);
    // Neither Destination before a press: not in the page's HTML, its Profile JSON or any of its network responses.
    expect(responses.some((r) => new URL(r.url).pathname === `/${creator.username}`)).toBe(true);
    expect(responses.some((r) => new URL(r.url).pathname === `/api/profiles/${creator.username}.json`)).toBe(true);
    expect(responses.filter((r) => holdsEither(r.body.toString('latin1'))).length, 'responses holding a Destination').toBe(0);
    expect(holdsEither(await (await request.get(`/${creator.username}`)).text()), 'a Destination in the HTML').toBe(false);
    expect(holdsEither(await (await request.get(`/api/profiles/${creator.username}.json`)).text()), 'a Destination in the Profile JSON').toBe(false);

    // The non-Adult Link's /r answers 302 to its Destination.
    const directId = served.links.find((l) => l.title === 'Direct card')!.id;
    const redirect = await request.get(`/r/${directId}`, { maxRedirects: 0 });
    expect(redirect.status()).toBe(302);
    expect(redirect.headers()['location'] === directDestination, 'the redirect goes to the Direct Link\'s Destination').toBe(true);

    // The Adult Link: Age Gate, then Reveal's real answer is the entered Destination followed by /c7 (helpers.ts, passAgeGate).
    const adultId = served.links.find((l) => l.title === 'Adult card')!.id;
    pressed = true;
    const expected = `${adultDestination}/c7`;
    const reveal = await passAgeGate(visitor, 'Adult card', expected);
    expect(reveal.url.searchParams.get('id') === adultId).toBe(true);
    expect(reveal.url.searchParams.get('trackingId')).toBe('7');
    expect(reveal.status).toBe(200);
    expect(reveal.realUrl === expected, 'Reveal answers the entered Destination followed by /c7').toBe(true);
    await context.close();
  });
});

// ---- Ticket 27: the Editor's Profile panel, Bio Link, avatar and default Mode ------------------------------------------------

test.describe('the Editor\'s Profile and default Mode', () => {
  test.skip(!onLocalStack(), 'the mail catcher and the Operator\'s PocketBase port are on the local test stack only');

  test('at 390×844 the Creator copies the Bio Link, edits display name and bio, replaces the avatar; Username read-only, no badge control', async ({ page, browser, request, baseURL }) => {
    test.setTimeout(120_000);
    const origin = new URL(baseURL!).origin;
    const { creator, token, profileId } = await verifiedCreator(request, [['First card', '']]);
    const address = `${origin}/${creator.username}`;
    // An avatar already in place, uploaded with the Creator's own token, so the Editor's is a replacement.
    const first = await upload(request, token, `profiles/${profileId}/avatar`, pngFile('first.png', [200, 40, 40]));
    expect(first.status()).toBe(200);
    const before = (await servedProfile(request, creator.username)).profile.avatarUrl;
    expect(before.startsWith('/api/files/')).toBe(true);

    await page.context().grantPermissions(['clipboard-read', 'clipboard-write'], { origin });
    await logIn(page, creator);
    await expect(heading(page, 'Edit Profile')).toBeVisible();
    await expect(page).toHaveURL(/\/edit\/home$/);

    // "Your Bio Link": the public address, and Copy puts it on the clipboard.
    const bioLink = page.locator('.bio-link');
    await expect(bioLink.locator('.label')).toHaveText('Your Bio Link');
    await expect(bioLink.locator('.value')).toHaveText(address);
    await page.getByRole('button', { name: 'Copy', exact: true }).click();
    await expect(page.getByText('Copied.', { exact: true })).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(address);

    // The @Username is shown read-only; there is no badge control anywhere on the Editor's home.
    const username = page.getByRole('textbox', { name: 'Username', exact: true });
    await expect(username).toHaveValue(creator.username);
    await expect(username).not.toBeEditable();
    await expect(page.getByRole('main')).not.toContainText(/badge|verified/i);
    const controls = await page.locator('main').locator('input, select, textarea, button').evaluateAll((nodes) =>
      nodes.map((n) => [n.getAttribute('name'), n.id, n.getAttribute('aria-label'), n.textContent].join(' ')));
    expect(controls.length).toBeGreaterThan(0);
    expect(controls.filter((c) => /badge|verif/i.test(c)), 'a badge control').toEqual([]);

    // The Profile panel saves on its own button and nothing else: an unsaved edit is gone after a reload.
    const displayName = page.getByLabel('Display name', { exact: true });
    const bio = page.getByLabel('Bio', { exact: true });
    await expect(displayName).toHaveValue('Before Name');
    await expect(bio).toHaveValue('Before bio.');
    await displayName.fill('Not saved');
    await page.reload();
    await expect(displayName).toHaveValue('Before Name');
    await displayName.fill('After Name');
    await bio.fill('After bio, from the Editor.');
    await page.getByRole('button', { name: 'Save profile' }).click();
    await expect(page.getByText('Profile saved.', { exact: true })).toBeVisible();

    // The next load of the public Profile shows both.
    const visitor = await openProfile(browser, origin, creator.username, ['First card']);
    await expect(visitor.locator('#displayName')).toHaveText('After Name');
    await expect(visitor.locator('#bio')).toHaveText('After bio, from the Editor.');
    await visitor.context().close();

    // "Change Profile Picture" is a field of the Profile panel: picking a file saves nothing until "Save profile", which
    // replaces the avatar through the upload endpoint; the public Profile then serves a new WebP.
    let uploads = 0;
    const countUpload = (req: { url(): string }) => { if (new URL(req.url()).pathname.startsWith('/api/upload/')) uploads += 1; };
    page.on('request', countUpload);
    await page.getByLabel('Change Profile Picture').setInputFiles(pngFile('second.png', [40, 200, 40]));
    expect((await servedProfile(request, creator.username)).profile.avatarUrl, 'no upload on pick').toBe(before);
    expect(uploads, 'upload requests sent on pick').toBe(0);
    await page.getByRole('button', { name: 'Save profile' }).click();
    await expect.poll(() => uploads, 'one upload request after Save').toBe(1);
    page.off('request', countUpload);
    // "Profile saved." still shows from the first save, so the new avatar URL is what is waited for.
    const avatarUrl = async () => (await servedProfile(request, creator.username)).profile.avatarUrl;
    await expect.poll(avatarUrl, 'a new avatar URL').not.toBe(before);
    const after = await avatarUrl();
    expect(after.startsWith('/api/files/'), after).toBe(true);
    await expect(page.getByText('Profile saved.', { exact: true })).toBeVisible();
    await expect(page.locator('img.avatar')).toHaveAttribute('src', after);
    await expectServedWebp(request, after);
    // Saving the picture saved the panel's display name and bio as they stood.
    await expect(displayName).toHaveValue('After Name');
    const saved = (await servedProfile(request, creator.username)).profile;
    expect([saved.displayName, saved.bio]).toEqual(['After Name', 'After bio, from the Editor.']);
  });

  test('the default Mode set in Quick Settings decides the Escape Overlay on open and moves only the Links left on "Profile default"', async ({ page, browser, request, baseURL }) => {
    test.setTimeout(120_000);
    const origin = new URL(baseURL!).origin;
    const { creator } = await verifiedCreator(request, [['Default card', ''], ['Escape card', 'escape_ig']]);
    const openAsInstagram = () => openProfile(browser, origin, creator.username, ['Default card', 'Escape card'], INSTAGRAM_UA);

    // While the default is Escape Mode, the Escape Overlay shows when the page opens in Instagram.
    let visitor = await openAsInstagram();
    await expect(visitor.locator('#igOverlay')).toBeVisible();
    await visitor.context().close();
    let served = await servedProfile(request, creator.username);
    expect([served.profile.mode, ...served.links.map((l) => l.mode)]).toEqual(['escape_ig', 'escape_ig', 'escape_ig']);

    // The Creator switches the default to Direct Mode in Quick Settings.
    await logIn(page, creator);
    await expect(heading(page, 'Edit Profile')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Quick Settings' })).toBeVisible();
    const mode = page.getByLabel('Default Mode');
    await expect(mode).toHaveValue('escape_ig');
    await expect(mode.locator('option')).toHaveText(['Direct', 'Escape', 'Deeplink on tap', 'Deeplink on tap (x-safari script)', 'Deeplink at open']);
    await mode.selectOption({ label: 'Direct' });
    await page.getByRole('button', { name: 'Save default Mode' }).click();
    await expect(page.getByText('Default Mode saved.', { exact: true })).toBeVisible();

    // A new Link's form starts on "Profile default" and names the new Mode, before and after a reload.
    await page.getByRole('button', { name: 'Add link' }).click();
    await expect(heading(page, 'Add link')).toBeVisible();
    await expect(page.getByLabel('Mode')).toHaveValue('');
    await expect(page.getByLabel('Mode').locator('option:checked')).toHaveText('Profile default (currently Direct)');
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(heading(page, 'Edit Profile')).toBeVisible();
    await expect(page.getByLabel('Default Mode')).toHaveValue('direct');
    await page.getByRole('button', { name: 'Add link' }).click();
    await expect(page.getByLabel('Mode').locator('option:checked')).toHaveText('Profile default (currently Direct)');

    // The next load: no Escape Overlay in Instagram; the Link on "Profile default" is Direct, the Escape one keeps Escape.
    visitor = await openAsInstagram();
    await expect(visitor.locator('#igOverlay')).toBeHidden();
    await visitor.context().close();
    served = await servedProfile(request, creator.username);
    expect(served.profile.mode).toBe('direct');
    expect(served.links.map((l) => [l.title, l.mode])).toEqual([['Default card', 'direct'], ['Escape card', 'escape_ig']]);
  });

  test('the default Mode offers "Deeplink on tap" and "Deeplink at open", a Link\'s Mode only "Deeplink on tap"; saved, deeplink_open is served and pops an Instagram Visitor out on open', async ({ page, browser, request, baseURL }) => {
    test.setTimeout(120_000);
    const origin = new URL(baseURL!).origin;
    const { creator, token, linkIds } = await verifiedCreator(request, [['Default card', ''], ['Own card', 'direct']]);
    // An Instagram Visitor's pop-outs on open, once the Profile has rendered.
    const popsOnOpen = async () => {
      const context = await phoneContext(browser, { origin, userAgent: INSTAGRAM_UA });
      const visitor = await context.newPage();
      const navigations = await recordNavigations(visitor);
      await visitor.goto(`/${creator.username}`);
      await expect(visitor.locator('.link-card .link-title')).toHaveText(['Default card', 'Own card']);
      await visitor.waitForLoadState('networkidle');
      const popped = xSafari(navigations);
      await context.close();
      return popped;
    };
    expect(await popsOnOpen()).toEqual([]);

    await logIn(page, creator);
    await expect(heading(page, 'Edit Profile')).toBeVisible();
    const mode = page.getByLabel('Default Mode');
    await expect(page.getByLabel('Pop out')).toHaveCount(0);
    await mode.selectOption({ label: 'Deeplink on tap' });
    await expect(page.locator('#default-mode-help')).toHaveText(/^Deeplink on tap /);
    await mode.selectOption({ label: 'Deeplink at open' });
    await expect(page.locator('#default-mode-help')).toHaveText(/^Deeplink at open /);
    await page.getByRole('button', { name: 'Save default Mode' }).click();
    await expect(page.getByText('Default Mode saved.', { exact: true })).toBeVisible();

    // Deeplink at open is a Profile default only: a Link refuses it, as it refuses any unknown Mode, and the Link form never
    // offers it; a Link on "Profile default" inherits it.
    const as = proxy(request, token);
    refused(await as.patch(`links/records/${linkIds[1]}`, { mode: 'sideways' }));
    refused(await as.patch(`links/records/${linkIds[1]}`, { mode: 'deeplink_open' }));
    const served = await servedProfile(request, creator.username);
    expect([served.profile.mode, ...served.links.map((l) => l.mode)]).toEqual(['deeplink_open', 'deeplink_open', 'direct']);
    expect(served.links[0].url, 'a Deeplink Link carries no url: its Destination comes by Reveal').toBe('');
    expect(served.profile).not.toHaveProperty('popOutTiming');
    await page.reload();
    await expect(page.getByLabel('Default Mode')).toHaveValue('deeplink_open');
    await page.getByRole('button', { name: 'Add link' }).click();
    await expect(page.getByLabel('Mode').locator('option'))
      .toHaveText(['Profile default (currently Deeplink at open)', 'Direct', 'Escape', 'Deeplink on tap', 'Deeplink on tap (x-safari script)']);
    expect(await popsOnOpen()).toEqual([`x-safari-https://${new URL(origin).host}/${creator.username}`]);

    // Deeplink on tap (x-safari script), the test variant kept to compare the two pop-outs on a phone, is a Link Mode too:
    // stored, served as it is, with no url.
    expect((await as.patch(`links/records/${linkIds[1]}`, { mode: 'deeplink_script' })).ok()).toBe(true);
    const scripted = await servedProfile(request, creator.username);
    expect(scripted.links.map((l) => [l.mode, l.url])).toEqual([['deeplink_open', ''], ['deeplink_script', '']]);
  });
});

// ---- Ticket 28: the Editor's Featured Links and the Link form ---------------------------------------------------------------

test.describe('the Editor\'s Links', () => {
  test.skip(!onLocalStack(), 'the mail catcher and the Operator\'s PocketBase port are on the local test stack only');

  test('at 390×844 a title edit, a background replaced then removed, a Link added then moved up, and a confirmed delete each show on the next load', async ({ page, browser, request, baseURL }) => {
    test.setTimeout(180_000);
    const origin = new URL(baseURL!).origin;
    const { creator, token, linkIds } = await verifiedCreator(request, [['First card', ''], ['Second card', '']]);
    // A background already in place, uploaded with the Creator's own token, so the Editor's is a replacement.
    const first = await upload(request, token, `links/${linkIds[0]}/backgroundImage`, pngFile('first.png', [200, 40, 40]));
    expect(first.status()).toBe(200);
    const backgroundOf = async (title: string) => {
      const link = (await servedProfile(request, creator.username)).links.find((l) => l.title === title);
      expect(link, title).toBeDefined();
      return link!;
    };
    const before = (await backgroundOf('First card')).backgroundImage;
    expect(before.startsWith('/api/files/')).toBe(true);

    await logIn(page, creator);
    await expect(heading(page, 'Edit Profile')).toBeVisible();
    await expect(featured(page)).toHaveText(['First card', 'Second card']);

    // Edit: the row opens the Link form with the Link's current values; the title changes.
    await page.getByRole('button', { name: 'First card', exact: true }).click();
    await expect(heading(page, 'Edit link')).toBeVisible();
    await expect(page.getByLabel('Title')).toHaveValue('First card');
    await page.getByLabel('Title').fill('Edited card');
    await page.getByRole('button', { name: 'Save link' }).click();
    await expect(heading(page, 'Edit Profile')).toBeVisible();
    await expect(featured(page)).toHaveText(['Edited card', 'Second card']);
    await visitorSees(browser, origin, creator.username, ['Edited card', 'Second card']);

    // The background is replaced through the upload endpoint: the public Profile serves a new WebP.
    await page.getByRole('button', { name: 'Edited card', exact: true }).click();
    await expect(heading(page, 'Edit link')).toBeVisible();
    await page.getByLabel('Background image').setInputFiles(pngFile('second.png', [40, 200, 40]));
    await page.getByRole('button', { name: 'Save link' }).click();
    await expect(heading(page, 'Edit Profile')).toBeVisible();
    const replaced = (await backgroundOf('Edited card')).backgroundImage;
    expect(replaced.startsWith('/api/files/') && replaced !== before, replaced).toBe(true);
    await expectServedWebp(request, replaced);

    // Then removed: the public Profile serves no background for it.
    await page.getByRole('button', { name: 'Edited card', exact: true }).click();
    await page.getByLabel('Remove background').check();
    await page.getByRole('button', { name: 'Save link' }).click();
    await expect(heading(page, 'Edit Profile')).toBeVisible();
    expect((await backgroundOf('Edited card')).backgroundImage).toBe('');
    await visitorSees(browser, origin, creator.username, ['Edited card', 'Second card']);

    // A Link added appears last; moved up, it swaps places with its neighbour, and the page's order follows.
    await page.getByRole('button', { name: 'Add link' }).click();
    await page.getByLabel('Title').fill('Third card');
    await page.getByLabel('Destination').fill(`https://example.com/${creator.username}/third`);
    await page.getByRole('button', { name: 'Save link' }).click();
    await expect(heading(page, 'Edit Profile')).toBeVisible();
    await expect(featured(page)).toHaveText(['Edited card', 'Second card', 'Third card']);
    await visitorSees(browser, origin, creator.username, ['Edited card', 'Second card', 'Third card']);
    await expect(page.getByRole('button', { name: 'Move Edited card up' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Move Third card down' })).toBeDisabled();
    await page.getByRole('button', { name: 'Move Third card up' }).click();
    await expect(featured(page)).toHaveText(['Edited card', 'Third card', 'Second card']);
    await visitorSees(browser, origin, creator.username, ['Edited card', 'Third card', 'Second card']);
    // The order is PocketBase's, not only the Editor's: a reload shows the same.
    await page.reload();
    await expect(featured(page)).toHaveText(['Edited card', 'Third card', 'Second card']);

    // Delete asks first, in the page's dialog naming the Link: "Keep it" keeps the Link, "Delete link" removes it.
    const asked = page.getByRole('alertdialog', { name: 'Delete this link?' });
    await page.getByRole('button', { name: 'Delete Second card' }).click();
    await expect(asked).toBeVisible();
    await expect(asked).toContainText('Second card');
    await asked.getByRole('button', { name: 'Keep it', exact: true }).click();
    await expect(asked).toBeHidden();
    await expect(featured(page)).toHaveText(['Edited card', 'Third card', 'Second card']);
    await visitorSees(browser, origin, creator.username, ['Edited card', 'Third card', 'Second card']);
    await page.getByRole('button', { name: 'Delete Second card' }).click();
    await expect(asked).toContainText('Second card');
    await asked.getByRole('button', { name: 'Delete link', exact: true }).click();
    await expect(asked).toBeHidden();
    await expect(featured(page)).toHaveText(['Edited card', 'Third card']);
    await visitorSees(browser, origin, creator.username, ['Edited card', 'Third card']);
  });

  test('a move whose second write fails shows the reason and reloads the list from PocketBase, matching the page\'s order', async ({ page, browser, request, baseURL }) => {
    test.setTimeout(120_000);
    const origin = new URL(baseURL!).origin;
    const { creator, token, linkIds } = await verifiedCreator(request, [['A card', ''], ['B card', '']]);
    await logIn(page, creator);
    await expect(featured(page)).toHaveText(['A card', 'B card']);
    // Elsewhere (another tab, say), B card is deleted, so the move's second write, to B card, fails.
    expect((await request.delete(`/api/collections/links/records/${linkIds[1]}`, { headers: { Authorization: token } })).status()).toBe(204);
    await page.getByRole('button', { name: 'Move A card down' }).click();
    await expect(page.getByText(/^The move failed: /)).toBeVisible();
    await expect(featured(page)).toHaveText(['A card']);
    await visitorSees(browser, origin, creator.username, ['A card']);
  });

  test('reopening a Link shows its current Destination, and after the Creator changes it Reveal answers the new one', async ({ page, browser, request, baseURL }) => {
    test.setTimeout(120_000);
    const origin = new URL(baseURL!).origin;
    const { creator, token, linkIds } = await verifiedCreator(request, [['Adult card', '']]);
    // An Adult Link, so the Visitor's press goes through the Age Gate to Reveal. Test-only example.com Destinations, compared as
    // booleans.
    expect((await proxy(request, token).patch(`links/records/${linkIds[0]}`, { isAdult: true })).status()).toBe(200);
    const current = `https://example.com/${creator.username}/0`;
    const changed = `https://example.com/${creator.username}/changed`;

    await logIn(page, creator);
    await page.getByRole('button', { name: 'Adult card', exact: true }).click();
    await expect(heading(page, 'Edit link')).toBeVisible();
    const destination = page.getByLabel('Destination');
    expect(await destination.inputValue() === current, 'the form shows the current Destination').toBe(true);
    await expect(page.getByLabel('18+ Age Gate')).toBeChecked();
    await destination.fill(changed);
    await page.getByRole('button', { name: 'Save link' }).click();
    await expect(heading(page, 'Edit Profile')).toBeVisible();
    await page.getByRole('button', { name: 'Adult card', exact: true }).click();
    expect(await page.getByLabel('Destination').inputValue() === changed, 'reopened, the form shows the new Destination').toBe(true);

    // The Visitor, in a fresh context: Age Gate, then Reveal's real answer is the new Destination; the navigation is intercepted.
    const visitor = await openProfile(browser, origin, creator.username, ['Adult card']);
    expect((await passAgeGate(visitor, 'Adult card', changed)).realUrl === changed, 'Reveal answers the new Destination').toBe(true);
    await visitor.context().close();
  });

  test('every field of an opened Link changes: an icon from no stock file stays, then stock icons, Adult flag, Mode, tracking and default Tracking Code reach the page', async ({ page, request }) => {
    test.setTimeout(120_000);
    const { creator, token, linkIds } = await verifiedCreator(request, [['Plain card', '']]);
    // An icon made from no stock file, uploaded with the Creator's own token.
    const uploaded = await upload(request, token, `links/${linkIds[0]}/icon`, pngFile('own.png', [40, 40, 200]));
    expect(uploaded.status()).toBe(200);
    const servedLink = async () => (await servedProfile(request, creator.username)).links[0];
    const ownIcon = (await servedLink()).icon;
    expect(ownIcon.startsWith('/api/files/')).toBe(true);
    const isStock = async (url: string, file: string) => (await (await request.get(url)).body()).equals(readFileSync(join(ROOT, 'app', 'public', 'images', file)));

    // Opened, it shows as "Current icon"; a save that changes every other field leaves it as it is.
    await logIn(page, creator);
    await page.getByRole('button', { name: 'Plain card', exact: true }).click();
    await expect(page.getByLabel('Icon').locator('option:checked')).toHaveText('Current icon');
    await page.getByLabel('18+ Age Gate').check();
    await page.getByLabel('Mode').selectOption({ label: 'Direct' });
    await openTracking(page);
    await page.getByLabel('OnlyFans tracking').check();
    await page.getByLabel('Default Tracking Code').fill('42');
    await page.getByRole('button', { name: 'Save link' }).click();
    await expect(heading(page, 'Edit Profile')).toBeVisible();
    let served = await servedLink();
    expect([served.icon, served.isAdult, served.mode, served.tracking, served.default_tracknumber]).toEqual([ownIcon, true, 'direct', true, '42']);

    // Reopened, the form shows what was saved; the icon goes to Instagram, then, reopened as Instagram, to none.
    await page.getByRole('button', { name: 'Plain card', exact: true }).click();
    await expect(page.getByLabel('Icon').locator('option:checked')).toHaveText('Current icon');
    await expect(page.getByLabel('18+ Age Gate')).toBeChecked();
    await expect(page.getByLabel('Mode').locator('option:checked')).toHaveText('Direct');
    await expect(page.getByLabel('OnlyFans tracking')).toBeChecked();
    await expect(page.getByLabel('Default Tracking Code')).toHaveValue('42');
    await page.getByLabel('Icon').selectOption({ label: 'Instagram' });
    await page.getByRole('button', { name: 'Save link' }).click();
    await expect(heading(page, 'Edit Profile')).toBeVisible();
    expect(await isStock((await servedLink()).icon, 'igicon.webp'), 'the Instagram stock icon').toBe(true);
    await page.getByRole('button', { name: 'Plain card', exact: true }).click();
    await expect(page.getByLabel('Icon').locator('option:checked')).toHaveText('Instagram');
    await page.getByLabel('Icon').selectOption({ label: 'None' });
    await page.getByLabel('18+ Age Gate').uncheck();
    await page.getByLabel('Mode').selectOption({ label: 'Profile default (currently Escape)' });
    await page.getByRole('button', { name: 'Save link' }).click();
    await expect(heading(page, 'Edit Profile')).toBeVisible();
    served = await servedLink();
    expect([served.icon, served.isAdult, served.mode]).toEqual(['', false, 'escape_ig']);
  });

  test('invalid Geo Rule JSON is refused and leaves the Link unchanged; a valid object saves and fills the textarea after a reload; emptying clears it', async ({ page, request }) => {
    test.setTimeout(120_000);
    const { creator, token, linkIds } = await verifiedCreator(request, [['Geo card', '']]);
    const own = proxy(request, token);
    const readLink = async () => {
      const res = await own.get(`links/records/${linkIds[0]}`);
      expect(res.status()).toBe(200);
      return res.json();
    };
    const before = await readLink();
    expect(before.geo).toBeNull();

    await logIn(page, creator);
    await page.getByRole('button', { name: 'Geo card', exact: true }).click();
    const geo = page.getByLabel('Geo Rule');
    await expect(geo).toHaveValue('');
    await openTracking(page);
    // Not JSON, and JSON that is not an object: each blocks the save with a message, and the Link is unchanged.
    for (const typed of ['{"US": "5",', '["US", "5"]', '"5"']) {
      await page.getByLabel('Title').fill('Not saved');
      await geo.fill(typed);
      await page.getByRole('button', { name: 'Save link' }).click();
      await expect(page.getByRole('status'), typed).toHaveText('Geo Rule: write a JSON object, such as {"US": "5"}, or leave it empty for no Geo Rule.');
      await expect(heading(page, 'Edit link')).toBeVisible();
      await expect(geo).toHaveValue(typed);
      expect(await readLink(), typed).toEqual(before);
    }

    // A valid object saves; after a reload the textarea holds it, pretty-printed.
    await page.getByLabel('Title').fill('Geo card');
    await geo.fill('{"US": {"CA": "3", "default": "4"}, "default": "9"}');
    await page.getByRole('button', { name: 'Save link' }).click();
    await expect(heading(page, 'Edit Profile')).toBeVisible();
    expect((await readLink()).geo).toEqual({ US: { CA: '3', default: '4' }, default: '9' });
    await page.reload();
    await page.getByRole('button', { name: 'Geo card', exact: true }).click();
    await expect(geo).toHaveValue('{\n  "US": {\n    "CA": "3",\n    "default": "4"\n  },\n  "default": "9"\n}');

    // Emptying the textarea clears the rule.
    await geo.fill('');
    await page.getByRole('button', { name: 'Save link' }).click();
    await expect(heading(page, 'Edit Profile')).toBeVisible();
    expect((await readLink()).geo).toBeNull();
    await page.getByRole('button', { name: 'Geo card', exact: true }).click();
    await expect(geo).toHaveValue('');
  });

  test('a Link saved with a javascript: Destination is refused by PocketBase; the Editor shows the reason and keeps every field as typed', async ({ page, request }) => {
    test.setTimeout(120_000);
    const { creator, token, profileId, linkIds } = await verifiedCreator(request, [['Safe card', '']]);
    const before = (await readBack(request, { token, profileId })).links;
    expect(before.length).toBe(1);
    const typed = { title: 'Typed title', destination: 'javascript:alert(document.cookie)', code: '12', geo: '{"US": "5"}' };
    const fillAll = async () => {
      await page.getByLabel('Title').fill(typed.title);
      await page.getByLabel('Destination').fill(typed.destination);
      await page.getByLabel('Icon').selectOption({ label: 'Twitch' });
      await page.getByLabel('18+ Age Gate').check();
      await page.getByLabel('Mode').selectOption({ label: 'Deeplink on tap' });
      await openTracking(page);
      await page.getByLabel('OnlyFans tracking').check();
      await page.getByLabel('Default Tracking Code').fill(typed.code);
      await page.getByLabel('Geo Rule').fill(typed.geo);
    };
    const expectKept = async (what: string) => {
      await expect(heading(page, what)).toBeVisible();
      await expect(page.getByRole('status')).toContainText('Destination');
      await expect(page.getByRole('status')).toContainText('https://, http:// or /');
      await expect(page.getByLabel('Title')).toHaveValue(typed.title);
      await expect(page.getByLabel('Destination')).toHaveValue(typed.destination);
      await expect(page.getByLabel('Icon').locator('option:checked')).toHaveText('Twitch');
      await expect(page.getByLabel('18+ Age Gate')).toBeChecked();
      await expect(page.getByLabel('Mode').locator('option:checked')).toHaveText('Deeplink on tap');
      await expect(page.getByLabel('OnlyFans tracking')).toBeChecked();
      await expect(page.getByLabel('Default Tracking Code')).toHaveValue(typed.code);
      await expect(page.getByLabel('Geo Rule')).toHaveValue(typed.geo);
      await expect(page.getByRole('button', { name: 'Save link' })).toBeEnabled();
      expect((await readBack(request, { token, profileId })).links, what).toEqual(before);
    };

    // An opened Link, changed.
    await logIn(page, creator);
    await page.getByRole('button', { name: 'Safe card', exact: true }).click();
    await fillAll();
    await page.getByRole('button', { name: 'Save link' }).click();
    await expectKept('Edit link');

    // A new Link.
    await page.getByRole('button', { name: 'Cancel' }).click();
    await page.getByRole('button', { name: 'Add link' }).click();
    await fillAll();
    await page.getByRole('button', { name: 'Save link' }).click();
    await expectKept('Add link');
  });
});

// ---- Ticket 30: only a Profile's owner and the Operator read or change it ---------------------------------------------------
// Creators A and B: each verified, with a Profile, an avatar and two Links with backgrounds. A non-owner's every call goes
// through `probe`, which fails on any answer holding the other Creator's Destinations or a Fixture Destination.
// ASSUMPTION: these probes replace ticket 25's anonymous-and-other-Creator read test, which they cover with Links in place, so
// off the local test stack no read probe runs (rung 5). Overturned if the probes must run against a deployed stack (needs 31's mail).

test.describe('owner rules, over HTTP at the public origin', () => {
  test.skip(!onLocalStack(), 'the mail catcher and the Operator\'s PocketBase port are on the local test stack only');

  test('another Creator cannot change, delete, add to or take from a Profile, nor replace its images; the owners read all back unchanged', async ({ request }) => {
    const [a, b] = [await furnishedCreator(request), await furnishedCreator(request)];
    const before = [await readBack(request, a), await readBack(request, b)];
    const [asA, asB] = [probe(request, a.token, b.secret), probe(request, b.token, a.secret)];
    refused(await asB.patch(`profiles/records/${a.profileId}`, { displayName: 'Taken' }));
    refused(await asB.delete(`profiles/records/${a.profileId}`));
    refused(await asB.patch(`links/records/${a.linkIds[0]}`, { title: 'Taken', destination: 'https://example.com/taken' }));
    refused(await asB.delete(`links/records/${a.linkIds[0]}`));
    refused(await asB.post('links/records', { profile: a.profileId, title: 'Planted', order: 9, destination: 'https://example.com/planted' }));
    refused(await asB.patch(`links/records/${b.linkIds[0]}`, { profile: a.profileId }));
    refused(await asA.patch(`links/records/${a.linkIds[0]}`, { profile: b.profileId }));
    refused(await asB.upload(`profiles/${a.profileId}/avatar`));
    refused(await asB.upload(`links/${a.linkIds[1]}/backgroundImage`));
    expect([await readBack(request, a), await readBack(request, b)]).toEqual(before);
  });

  test('another Creator and an anonymous caller read nothing of the first Creator\'s, and nobody reads the ownerless Fixture', async ({ request }) => {
    const [a, b, fixture] = [await furnishedCreator(request), await furnishedCreator(request), await recordIds('fixture')];
    expect((await (await proxy(request, a.token).get(`links/records/${a.linkIds[0]}`)).text()).includes(a.secret), 'the owner reads their Destination').toBe(true);
    const theirs = [a.creator.email, a.creator.username, a.id, a.profileId, ...a.linkIds, fixture.profileId, ...fixture.linkIds];
    const filter = (f: string) => `filter=${encodeURIComponent(f)}`;
    const callers: [string, string | undefined, string[]][] = [['anonymous', undefined, []], ['another Creator', b.token, [b.id, b.profileId, ...b.linkIds]]];
    for (const [who, token, own] of callers) {
      for (const path of [
        'users/records', `users/records/${a.id}`, 'profiles/records?expand=owner,links_via_profile', 'links/records?expand=profile',
        `profiles/records?${filter(`username='${a.creator.username}' || username='fixture'`)}`, `profiles/records?${filter("links_via_profile.destination != ''")}`,
        `links/records?${filter(`profile='${fixture.profileId}'`)}`,
        ...[a.profileId, fixture.profileId].flatMap((id) => [`profiles/records/${id}`, `profiles/records/${id}?expand=links_via_profile`]),
        ...[a.linkIds[0], fixture.linkIds[0]].flatMap((id) => [`links/records/${id}`, `links/records/${id}?expand=profile`]),
      ]) {
        const res = await probe(request, token, a.secret).get(path);
        const body = await res.text();
        expect(theirs.filter((t) => body.includes(t)), `${who}: ${path}`).toEqual([]);
        // A list answers 200 with the caller's own records only, none for an anonymous caller; a view of another's is a 404.
        if (res.status() !== 200) expect(res.status(), `${who}: ${path}`).toBe(404);
        else expect(JSON.parse(body).items.filter((r: { id: string }) => !own.includes(r.id)), `${who}: ${path}`).toEqual([]);
      }
    }
  });

  test('the owner cannot change their Username, owner, badge or slot, delete their Profile, add one on a taken slot or past the cap, choose a Link Id, upload a file directly or store a Destination outside https://, http:// and /', async ({ request }) => {
    const [a, b] = [await furnishedCreator(request), await furnishedCreator(request)];
    const before = await readBack(request, a);
    const as = probe(request, a.token, b.secret);
    const link = { profile: a.profileId, title: 'Probe', order: 9, destination: 'https://example.com/probe' };
    for (const change of [{ username: `${a.creator.username}x` }, { owner: b.id }, { verified: true }, { slot: 2 }]) refused(await as.patch(`profiles/records/${a.profileId}`, change));
    refused(await as.delete(`profiles/records/${a.profileId}`));
    for (const slot of [1, 4]) refused(await as.post('profiles/records', { username: `${a.creator.username}x`, owner: a.id, mode: 'escape_ig', slot }));
    for (const chosen of [{ id: 'chosenrecord123' }, { linkId: 'chosenlinkid' }]) refused(await as.post('links/records', { ...link, ...chosen }));
    refused(await as.patch(`links/records/${a.linkIds[0]}`, { linkId: 'chosenlinkid' }));
    refused(await as.patchFiles(`profiles/records/${a.profileId}`, { avatar: pngFile('direct.png', [0, 200, 0]) }));
    refused(await as.patchFiles(`links/records/${a.linkIds[0]}`, { backgroundImage: pngFile('direct.png', [0, 200, 0]) }));
    for (const destination of ['javascript:alert(1)', 'data:text/html,x', 'ftp://example.com/x', 'example.com/x', '//example.com/x']) {
      refused(await as.post('links/records', { ...link, destination }));
      refused(await as.patch(`links/records/${a.linkIds[0]}`, { destination }));
    }
    expect(await readBack(request, a)).toEqual(before);
  });

  test('the Operator edits a Creator\'s Profile, Link and account, then deletes the account and its Profile: the page lands on the landing page and log-in is refused', async ({ page, request }) => {
    const a = await furnishedCreator(request);
    const record = (collection: string, id: string) => `/api/collections/${collection}/records/${id}`;
    expect(await operator('PATCH', record('profiles', a.profileId), { displayName: 'Set by Operator', verified: true })).toBe(200);
    expect(await operator('PATCH', record('links', a.linkIds[0]), { title: 'Titled by Operator' })).toBe(200);
    expect(await operator('PATCH', record('users', a.id), { name: 'Named by Operator' })).toBe(200);
    const { profile, links } = await readBack(request, a);
    expect([profile.displayName, profile.verified, links[0].title]).toEqual(['Set by Operator', true, 'Titled by Operator']);
    expect((await (await proxy(request, a.token).get(`users/records/${a.id}`)).json()).name).toBe('Named by Operator');
    expect([await operator('DELETE', record('profiles', a.profileId)), await operator('DELETE', record('users', a.id))]).toEqual([204, 204]);
    await page.goto(`/${a.creator.username}`);
    await expect(page).toHaveURL(`${new URL(page.url()).origin}/landing.html`);
    const landed = await page.content();
    expect(holdsDestination(landed) || landed.includes(a.secret), 'a Destination on the page').toBe(false);
    refused(await probe(request, undefined, a.secret).post('users/auth-with-password', { identity: a.creator.email, password: a.creator.password }));
  });
});

// ---- Ticket 29: the session, where log-in lands, and the hand-over ----------------------------------------------------------
// The hand-over is proved on a throwaway ownerless Profile; no imported v1 Profile gets an owner in this Phase (ADR 0002).

test.describe('the session and where log-in lands', () => {
  test.skip(!onLocalStack(), 'the mail catcher and the Operator\'s PocketBase port are on the local test stack only');

  test('reopening the Editor in the same context still shows it; Log out shows log-in, and logging in again lands in the Editor', async ({ page, request }) => {
    const { creator } = await verifiedCreator(request, [['Session card', '']]);
    await logIn(page, creator);
    await expect(heading(page, EDITOR)).toBeVisible();
    // Reopened, in a new tab of the same context, without logging in.
    const reopened = await page.context().newPage();
    await reopened.goto('/edit');
    await expect(heading(reopened, EDITOR)).toBeVisible();
    await reopened.close();

    await page.getByRole('button', { name: 'Log out' }).click();
    await expect(heading(page, LOG_IN)).toBeVisible();
    await expect(page).toHaveURL(/\/edit\/login$/);
    // Ended on this device: opening the Editor again shows log-in.
    await page.goto('/edit/home');
    await expect(heading(page, LOG_IN)).toBeVisible();
    await logIn(page, creator);
    await expect(heading(page, EDITOR)).toBeVisible();
    await expect(featured(page)).toHaveText(['Session card']);
  });

  test('a Creator who logs in partway through Onboarding resumes at the claim step, the verify screen, the Profile step or the first-Link step', async ({ browser, request }) => {
    // Each stage arranged over HTTP as the Creator would reach it (helpers.ts, reach), the mailed verification link included.
    const stages: [string, RegExp][] = [[CLAIM, /\/edit\/claim$/], [VERIFY, /\/edit\/verify-email$/], ['Your Profile', /\/edit\/profile$/], ['Add your first Link', /\/edit\/first-link$/]];
    for (const [stage, url] of stages) {
      const creator = await reach(request, stage);
      const context = await phoneContext(browser);
      const resumed = await context.newPage();
      await logIn(resumed, creator);
      await expect(heading(resumed, stage)).toBeVisible();
      await expect(resumed, stage).toHaveURL(url);
      await context.close();
    }
  });

  test('with the stored token replaced by an invalid one, a save sends the Creator to log-in, and logging in returns them to the Editor', async ({ page, request }) => {
    const { creator } = await verifiedCreator(request, [['Session card', '']]);
    await logIn(page, creator);
    await expect(heading(page, EDITOR)).toBeVisible();
    await page.evaluate(() => localStorage.setItem('ofl.token', 'not-a-token'));
    await page.getByLabel('Display name').fill('Never saved');
    await page.getByRole('button', { name: 'Save profile' }).click();
    // Log-in with the way back, saying why: never a failed save.
    await expect(heading(page, LOG_IN)).toBeVisible();
    await expect(page).toHaveURL(/\/edit\/login\?next=%2Fedit%2Fhome$/);
    await expect(page.getByText('Your session has ended. Log in to carry on.')).toBeVisible();
    await page.getByLabel('Email').fill(creator.email);
    await page.getByLabel('Password').fill(creator.password);
    await page.getByRole('button', { name: 'Log in' }).click();
    await expect(heading(page, EDITOR)).toBeVisible();
    await expect(page).toHaveURL(/\/edit\/home$/);
    await expect(page.getByLabel('Display name')).toHaveValue('Before Name');
  });

  test('hand-over: an ownerless Profile\'s Username is refused with the Cutover message; once the Operator sets its owner, the Creator\'s next log-in lands in the Editor on it', async ({ page, browser, baseURL }) => {
    const origin = new URL(baseURL!).origin;
    const creator = fresh();
    await createOwnerlessProfile(creator.username, 'Handed Over', { title: 'Imported card', destination: `https://example.com/${creator.username}` });
    await signUp(page, creator);
    await expect(heading(page, CLAIM)).toBeVisible();
    await expect(page.getByRole('status')).toContainText('the Operator hands over Usernames held on v1 at Cutover');
    await page.reload();
    await expect(heading(page, CLAIM)).toBeVisible();

    expect(await handOver(creator.username, creator.email, 1), 'the Operator sets the owner and slot 1').toBe(200);
    await markVerified(creator.email);
    const editor = await logInToHandedOver(browser, origin, creator, creator.username, 'Handed Over', ['Imported card']);
    await editor.getByLabel('Display name').fill('Edited after hand-over');
    await editor.getByRole('button', { name: 'Save profile' }).click();
    await expect(editor.getByText('Profile saved.')).toBeVisible();
    await editor.context().close();
    // The public page, in a fresh context with no Editor session.
    const visitor = await openProfile(browser, origin, creator.username, ['Imported card']);
    await expect(visitor.locator('#displayName')).toHaveText('Edited after hand-over');
    await visitor.context().close();
  });

  test('a bad verification link says invalid or expired and offers a resend; "Resend email" delivers a verification email, and once its link is followed Continue opens the Profile step', async ({ page, request }) => {
    await page.goto('/edit/verify?token=not-a-token');
    await expect(heading(page, 'Link invalid or expired')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Resend email' })).toBeVisible();
    // Claimed over HTTP, so no verification email was ever asked for (helpers.ts, reach): the one that arrives is Resend's.
    const creator = await reach(request, VERIFY);
    await logIn(page, creator);
    await expectVerifyScreen(page);
    expect(await mailedLinks(creator.email, '/edit/verify')).toHaveLength(0);
    await page.getByRole('button', { name: 'Resend email' }).click();
    await expect(page.getByRole('status')).toContainText(`We asked for a new link to ${creator.email}.`);
    const tab = await page.context().newPage();
    await tab.goto(await mailedLink(creator.email, '/edit/verify'));
    await expect(heading(tab, 'Email verified')).toBeVisible();
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(heading(page, 'Your Profile')).toBeVisible();
  });

  test('"Forgot password" says the same for a known and an unknown address; a bad reset link offers a new one; the mailed one sets a password that lands in the Editor, the old one refused', async ({ page, request }) => {
    const { creator } = await verifiedCreator(request, [['Reset card', '']]);
    for (const email of [creator.email, fresh().email]) {
      await forgotPassword(page, email);
      await expect(page.getByRole('status')).toHaveText('If an account uses that address, we sent it a link. Check your inbox.');
    }
    const setPassword = async (link: string) => {
      await page.goto(link);
      await expect(heading(page, 'Set a new password')).toBeVisible();
      await page.getByLabel('New password').fill('throwaway-renewed');
      await page.getByRole('button', { name: 'Set password' }).click();
    };
    await setPassword('/edit/reset?token=not-a-token');
    await expect(heading(page, 'Link invalid or expired')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Send a new link' })).toBeVisible();
    await setPassword(await mailedLink(creator.email, '/edit/reset'));
    await expect(heading(page, 'Password changed')).toBeVisible();
    await page.getByRole('button', { name: 'Log in' }).click();
    await expect(heading(page, LOG_IN)).toBeVisible();
    await logIn(page, creator);
    await expect(page.getByRole('status')).toHaveText('Wrong email or password.');
    await logIn(page, { ...creator, password: 'throwaway-renewed' });
    await expect(heading(page, EDITOR)).toBeVisible();
  });

  // ASSUMPTION: "after the whole run" is the spec's last test, which runs after every other test of this file in its worker
  // (no fullyParallel in playwright.config.ts); no other spec writes the Fixture's owner (05-domains hands over only a throwaway
  // Profile), and the later v1 Import re-runs set none (rung 1: grep; app/bin/import-v1 sends owner on no write). Overturned if
  // another spec starts writing the Fixture's owner; the check then moves to the last project.
  test('after the run, the Fixture Profile still has no owner', async () => {
    // Operator-side guard, not a seam under test: the ticket's criterion has no public-origin answer (spec Testing Decisions name the loopback for arranging only).
    expect(await ownerOf('fixture')).toBe('');
  });
});
