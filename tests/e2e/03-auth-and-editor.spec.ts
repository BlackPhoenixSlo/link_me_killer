import { test, expect } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  account, CLAIM, createOwnerlessProfile, expectVerifyScreen, featured, fresh, heading, holdsDestination, INSTAGRAM_UA, isWebp, LOG_IN,
  logIn, markVerified, onLocalStack, ownerOf, PHONE, phoneContext, pngFile, proxy, servedProfile, setOwner, SIGN_UP, signUp, VERIFY,
  verifiedCreator, visitorSees,
} from './helpers';

// Phase 3 (docs/spec/phase-03-auth-and-editor.md, Testing Decisions): one seam, the running v2 stack at Playwright's baseURL,
// the public origin. Creator journeys run in the browser at 390×844; the Visitor side and every second log-in run in a fresh
// context with no Editor session; rule and proxy checks use the `request` fixture at the same origin, calling the proxy
// exactly as the Editor does.
// Ticket 25: sign-up, the claim and its refusals, the verify screen, the landing page's button, and the proxy's allow-list.
// Ticket 26: the verified-email gate over HTTP, and Onboarding after verification to a live Profile whose Links act like
// imported ones. Its one Operator step, marking the account verified, goes to PocketBase as a superuser at the loopback port the
// test stack publishes (spec, Testing Decisions, Operator steps; the ticket's ASSUMPTION until 31 brings mail).
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

test('in a fresh context the landing page\'s "Create Your Own Page" opens the sign-up screen, and no n8n Form link remains', async ({ page }) => {
  await page.goto('/landing.html');
  const hrefs = await page.locator('a').evaluateAll((as) => as.map((a) => a.getAttribute('href') || ''));
  expect(hrefs.some((h) => h.includes('n8n'))).toBe(false);
  await expect(page.getByText('Powered by n8n & Git & Netlify')).toBeVisible();
  await page.getByRole('link', { name: /Create Your Own Page/ }).click();
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
      const res = await creator.post('profiles/records', { username: name, owner: id, mode: 'escape_ig' });
      expect(res.status(), name).toBe(400);
      expect((await res.json()).data, name).toEqual({});
    }
    // The same account can still claim: the refusals were the names, not the account.
    const ok = await creator.post('profiles/records', { username: `signup_${randomBytes(4).toString('hex')}`, owner: id, mode: 'escape_ig' });
    expect(ok.status()).toBe(200);
  });

  test('the claim sets only Username, owner and default Mode, for the Creator alone, once', async ({ request }) => {
    const first = await account(request);
    const other = await account(request);
    const as = proxy(request, first.token);
    const username = () => `signup_${randomBytes(4).toString('hex')}`;
    const refused: [string, object][] = [
      ['a display name', { username: username(), owner: first.id, displayName: 'x' }],
      ['the verified badge', { username: username(), owner: first.id, verified: true }],
      ['another owner', { username: username(), owner: other.id }],
      ['no owner', { username: username() }],
    ];
    for (const [name, body] of refused) expect((await as.post('profiles/records', body)).status(), name).toBe(400);
    expect((await proxy(request).post('profiles/records', { username: username(), owner: '' })).status(), 'anonymous claim').toBe(400);
    const claimed = await as.post('profiles/records', { username: username(), owner: first.id, mode: 'escape_ig' });
    expect(claimed.status()).toBe(200);
    expect((await claimed.json()).mode).toBe('escape_ig');
    const second = await as.post('profiles/records', { username: username(), owner: first.id });
    expect(second.status(), 'a second Profile').toBe(400);
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
    const claimed = await as.post('profiles/records', { username: creator.username, owner: id, mode: 'escape_ig' });
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
    // PocketBase's admin UI keeps Phase 2's answer: the Page Copy's index page, not the dashboard.
    const admin = await request.get('/_/');
    expect((await admin.body()).equals(readFileSync(join(ROOT, 'app', 'public', 'index.html')))).toBe(true);
  });

  test('no proxied answer holds a Destination or another Creator\'s record, for an anonymous caller or a Creator', async ({ request }) => {
    const first = await account(request);
    expect((await proxy(request, first.token).post('profiles/records', { username: first.creator.username, owner: first.id })).status()).toBe(200);
    const other = await account(request);
    for (const [who, token] of [['anonymous', undefined], ['another Creator', other.token]] as const) {
      const as = proxy(request, token);
      const reads = [
        'profiles/records',
        `profiles/records?filter=${encodeURIComponent("username='fixture'")}`,
        `profiles/records?filter=${encodeURIComponent(`username='${first.creator.username}'`)}`,
        'profiles/records?expand=owner',
        'users/records',
        `users/records/${first.id}`,
        'links/records',
        'links/records?expand=profile',
      ];
      for (const path of reads) {
        const res = await as.get(path);
        const body = await res.text();
        expect(holdsDestination(body), `a Destination in the answer to ${who}: ${path}`).toBe(false);
        expect(body.includes(first.creator.email) || body.includes(first.creator.username), `the first Creator's record in the answer to ${who}: ${path}`).toBe(false);
        if (res.status() === 200) {
          // Another Creator lists only their own account; nobody lists the first Creator's records or the ownerless Fixture.
          const items: { id: string; owner?: string; username?: string }[] = JSON.parse(body).items;
          expect(items.every((r) => r.id !== first.id && r.owner !== first.id && r.username !== 'fixture'), `${who}: ${path}`).toBe(true);
          expect(items.length, `${who}: ${path}`).toBe(token && path === 'users/records' ? 1 : 0);
        } else {
          expect([403, 404], `${who}: ${path}`).toContain(res.status());
        }
      }
    }
    // The owner reaches no other Profile's Link through their own Profile: since ticket 26 the links read rule is open to the
    // owner of a Link's Profile, so the back-relation may expand and a filter on it runs, but this owner has no Link and gets
    // nothing of anyone else's. Another Creator's or an anonymous expand of a Profile that has Links is ticket 30's.
    const own = proxy(request, first.token);
    const expanded = await own.get('profiles/records?expand=links_via_profile');
    const expandedBody = await expanded.text();
    expect(holdsDestination(expandedBody), 'a Destination in the owner\'s expand').toBe(false);
    expect(expanded.status()).toBe(200);
    const items: { username: string; expand?: Record<string, unknown> }[] = JSON.parse(expandedBody).items;
    expect(items.map((p) => p.username)).toEqual([first.creator.username]);
    expect(items.every((p) => !p.expand || !('links_via_profile' in p.expand)), 'links expanded for an owner with none').toBe(true);
    const filtered = await own.get(`profiles/records?filter=${encodeURIComponent("links_via_profile.destination != ''")}`);
    const filteredBody = await filtered.text();
    expect(holdsDestination(filteredBody), 'a Destination in the answer to a filter on links').toBe(false);
    expect(filtered.status()).toBe(200);
    expect(JSON.parse(filteredBody).items, 'a filter on links finds nothing for an owner with no Link').toEqual([]);
  });
});

// ---- Ticket 26: the verified-email gate, and Onboarding to a live Profile -------------------------------------------------

test.describe('the verified-email gate', () => {
  test('over HTTP an unverified Creator\'s token cannot update its Profile, add a Link or upload an avatar; the owner reads both back unchanged', async ({ request }) => {
    const { token, id, creator } = await account(request);
    const as = proxy(request, token);
    const claimed = await as.post('profiles/records', { username: creator.username, owner: id, mode: 'escape_ig' });
    expect(claimed.status()).toBe(200);
    const profileId = (await claimed.json()).id as string;
    const readBack = async () => {
      const profile = await as.get(`profiles/records/${profileId}`);
      expect(profile.status()).toBe(200);
      const links = await as.get(`links/records?filter=${encodeURIComponent(`profile='${profileId}'`)}`);
      expect(links.status()).toBe(200);
      return { profile: await profile.json(), links: (await links.json()).items };
    };
    const before = await readBack();
    expect(before.links).toEqual([]);

    // PocketBase answers an update its rule refuses as a record it cannot find (404), and a refused create with a bare 400.
    const update = await as.patch(`profiles/records/${profileId}`, { displayName: 'Not yet', bio: 'not yet' });
    expect(update.status(), 'Profile update').toBe(404);
    const link = await as.post('links/records', { profile: profileId, title: 'Not yet', order: 0, destination: `https://example.com/${creator.username}` });
    expect(link.status(), 'Link create').toBe(400);
    // The upload endpoint writes with the caller's token, so PocketBase's refusal is its answer.
    const avatar = await request.post(`/api/upload/profiles/${profileId}/avatar`, { headers: { Authorization: token }, multipart: { file: pngFile('avatar.png', [200, 40, 40]) } });
    expect(avatar.status(), 'avatar upload').toBe(404);

    const after = await readBack();
    expect(after).toEqual(before);
    expect(after.profile.displayName === '' && after.profile.bio === '' && after.profile.avatar === '').toBe(true);
  });

});

test.describe('Onboarding after verification', () => {
  test.skip(!onLocalStack(), 'the Operator step needs the local test stack\'s PocketBase port');

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
    await markVerified(creator.email);
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

    // The stored values (spec, Contracts, Stored values), as the Creator reads them through the proxy with the Editor's own
    // token. Destinations compared as booleans.
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

    // The Adult Link: Age Gate, then Reveal's real answer is the entered Destination followed by /c7; the navigation is
    // intercepted, as in 00-smoke.
    const adultId = served.links.find((l) => l.title === 'Adult card')!.id;
    pressed = true;
    await visitor.locator('.link-card', { hasText: 'Adult card' }).click();
    await expect(visitor.locator('#overlay')).toBeVisible();
    await expect(visitor.getByRole('heading', { name: 'Mature Content Disclaimer' })).toBeVisible();
    let reveal: { url: URL; status: number; realUrl: unknown } | undefined;
    await visitor.route('**/.netlify/functions/reveal?*', async (route) => {
      const response = await route.fetch();
      reveal = { url: new URL(route.request().url()), status: response.status(), realUrl: (await response.json()).realUrl };
      await route.fulfill({ response });
    });
    const expected = `${adultDestination}/c7`;
    const onward = visitor.waitForEvent('requestfailed', (req) => req.url() === expected);
    await visitor.getByRole('button', { name: 'Continue (18+)' }).click();
    expect((await onward).failure()?.errorText).toBe('net::ERR_BLOCKED_BY_CLIENT');
    if (!reveal) throw new Error('no Reveal was observed before the onward navigation');
    expect(reveal.url.searchParams.get('id') === adultId).toBe(true);
    expect(reveal.url.searchParams.get('trackingId')).toBe('7');
    expect(reveal.status).toBe(200);
    expect(reveal.realUrl === expected, 'Reveal answers the entered Destination followed by /c7').toBe(true);
    await context.close();
  });
});

// ---- Ticket 27: the Editor's Profile panel, Bio Link, avatar and default Mode ------------------------------------------------

test.describe('the Editor\'s Profile and default Mode', () => {
  test.skip(!onLocalStack(), 'the Operator step needs the local test stack\'s PocketBase port');

  test('at 390×844 the Creator copies the Bio Link, edits display name and bio, replaces the avatar; Username read-only, no badge control', async ({ page, browser, request, baseURL }) => {
    test.setTimeout(120_000);
    const origin = new URL(baseURL!).origin;
    const { creator, token, profileId } = await verifiedCreator(request, [['First card', '']]);
    const address = `${origin}/${creator.username}`;
    // An avatar already in place, uploaded with the Creator's own token, so the Editor's is a replacement.
    const first = await request.post(`/api/upload/profiles/${profileId}/avatar`, { headers: { Authorization: token }, multipart: { file: pngFile('first.png', [200, 40, 40]) } });
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
    const context = await phoneContext(browser, { origin });
    const visitor = await context.newPage();
    await visitor.goto(`/${creator.username}`);
    await expect(visitor.locator('#displayName')).toHaveText('After Name');
    await expect(visitor.locator('#bio')).toHaveText('After bio, from the Editor.');
    await context.close();

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
    const image = await request.get(after);
    expect(image.status()).toBe(200);
    expect(image.headers()['content-type']).toBe('image/webp');
    expect(isWebp(await image.body())).toBe(true);
    // Saving the picture saved the panel's display name and bio as they stood.
    await expect(displayName).toHaveValue('After Name');
    const saved = (await servedProfile(request, creator.username)).profile;
    expect([saved.displayName, saved.bio]).toEqual(['After Name', 'After bio, from the Editor.']);
  });

  test('the default Mode set in Quick Settings decides the Escape Overlay on open and moves only the Links left on "Profile default"', async ({ page, browser, request, baseURL }) => {
    test.setTimeout(120_000);
    const origin = new URL(baseURL!).origin;
    const { creator } = await verifiedCreator(request, [['Default card', ''], ['Escape card', 'escape_ig']]);
    const openAsInstagram = async () => {
      const context = await phoneContext(browser, { origin, userAgent: INSTAGRAM_UA });
      const visitor = await context.newPage();
      const served = visitor.waitForResponse((res) => new URL(res.url()).pathname === `/api/profiles/${creator.username}.json`);
      await visitor.goto(`/${creator.username}`);
      await served;
      await expect(visitor.locator('.link-card .link-title')).toHaveText(['Default card', 'Escape card']);
      return visitor;
    };

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
    await expect(mode.locator('option')).toHaveText(['Direct', 'Escape', 'Deeplink']);
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
});

// ---- Ticket 28: the Editor's Featured Links and the Link form ---------------------------------------------------------------

test.describe('the Editor\'s Links', () => {
  test.skip(!onLocalStack(), 'the Operator step needs the local test stack\'s PocketBase port');

  test('at 390×844 a title edit, a background replaced then removed, a Link added then moved up, and a confirmed delete each show on the next load', async ({ page, browser, request, baseURL }) => {
    test.setTimeout(180_000);
    const origin = new URL(baseURL!).origin;
    const { creator, token, linkIds } = await verifiedCreator(request, [['First card', ''], ['Second card', '']]);
    // A background already in place, uploaded with the Creator's own token, so the Editor's is a replacement.
    const first = await request.post(`/api/upload/links/${linkIds[0]}/backgroundImage`, { headers: { Authorization: token }, multipart: { file: pngFile('first.png', [200, 40, 40]) } });
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
    const image = await request.get(replaced);
    expect(image.status()).toBe(200);
    expect(image.headers()['content-type']).toBe('image/webp');
    expect(isWebp(await image.body())).toBe(true);

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

    // Delete asks first: cancelling keeps the Link, confirming removes it.
    const asked: string[] = [];
    page.once('dialog', (dialog) => {
      asked.push(dialog.message());
      return dialog.dismiss();
    });
    await page.getByRole('button', { name: 'Delete Second card' }).click();
    await expect.poll(() => asked.length).toBe(1);
    expect(asked[0]).toContain('Second card');
    await expect(featured(page)).toHaveText(['Edited card', 'Third card', 'Second card']);
    await visitorSees(browser, origin, creator.username, ['Edited card', 'Third card', 'Second card']);
    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: 'Delete Second card' }).click();
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
    const context = await phoneContext(browser, { origin });
    const visitor = await context.newPage();
    await visitor.goto(`/${creator.username}`);
    await visitor.locator('.link-card', { hasText: 'Adult card' }).click();
    await expect(visitor.getByRole('heading', { name: 'Mature Content Disclaimer' })).toBeVisible();
    let realUrl: unknown;
    await visitor.route('**/.netlify/functions/reveal?*', async (route) => {
      const response = await route.fetch();
      realUrl = (await response.json()).realUrl;
      await route.fulfill({ response });
    });
    const onward = visitor.waitForEvent('requestfailed', (req) => req.url() === changed);
    await visitor.getByRole('button', { name: 'Continue (18+)' }).click();
    expect((await onward).failure()?.errorText).toBe('net::ERR_BLOCKED_BY_CLIENT');
    expect(realUrl === changed, 'Reveal answers the new Destination').toBe(true);
    await context.close();
  });

  test('every field of an opened Link changes: an icon from no stock file stays, then stock icons, Adult flag, Mode, tracking and default Tracking Code reach the page', async ({ page, request }) => {
    test.setTimeout(120_000);
    const { creator, token, linkIds } = await verifiedCreator(request, [['Plain card', '']]);
    // An icon made from no stock file, uploaded with the Creator's own token.
    const uploaded = await request.post(`/api/upload/links/${linkIds[0]}/icon`, { headers: { Authorization: token }, multipart: { file: pngFile('own.png', [40, 40, 200]) } });
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
    const readBack = async () => {
      const res = await own.get(`links/records/${linkIds[0]}`);
      expect(res.status()).toBe(200);
      return res.json();
    };
    const before = await readBack();
    expect(before.geo).toBeNull();

    await logIn(page, creator);
    await page.getByRole('button', { name: 'Geo card', exact: true }).click();
    const geo = page.getByLabel('Geo Rule');
    await expect(geo).toHaveValue('');
    // Not JSON, and JSON that is not an object: each blocks the save with a message, and the Link is unchanged.
    for (const typed of ['{"US": "5",', '["US", "5"]', '"5"']) {
      await page.getByLabel('Title').fill('Not saved');
      await geo.fill(typed);
      await page.getByRole('button', { name: 'Save link' }).click();
      await expect(page.getByRole('status'), typed).toHaveText('Geo Rule: write a JSON object, such as {"US": "5"}, or leave it empty for no Geo Rule.');
      await expect(heading(page, 'Edit link')).toBeVisible();
      await expect(geo).toHaveValue(typed);
      expect(await readBack(), typed).toEqual(before);
    }

    // A valid object saves; after a reload the textarea holds it, pretty-printed.
    await page.getByLabel('Title').fill('Geo card');
    await geo.fill('{"US": {"CA": "3", "default": "4"}, "default": "9"}');
    await page.getByRole('button', { name: 'Save link' }).click();
    await expect(heading(page, 'Edit Profile')).toBeVisible();
    expect((await readBack()).geo).toEqual({ US: { CA: '3', default: '4' }, default: '9' });
    await page.reload();
    await page.getByRole('button', { name: 'Geo card', exact: true }).click();
    await expect(geo).toHaveValue('{\n  "US": {\n    "CA": "3",\n    "default": "4"\n  },\n  "default": "9"\n}');

    // Emptying the textarea clears the rule.
    await geo.fill('');
    await page.getByRole('button', { name: 'Save link' }).click();
    await expect(heading(page, 'Edit Profile')).toBeVisible();
    expect((await readBack()).geo).toBeNull();
    await page.getByRole('button', { name: 'Geo card', exact: true }).click();
    await expect(geo).toHaveValue('');
  });

  test('a Link saved with a javascript: Destination is refused by PocketBase; the Editor shows the reason and keeps every field as typed', async ({ page, request }) => {
    test.setTimeout(120_000);
    const { creator, token, profileId, linkIds } = await verifiedCreator(request, [['Safe card', '']]);
    const own = proxy(request, token);
    const readBack = async () => (await (await own.get(`links/records?sort=order&filter=${encodeURIComponent(`profile='${profileId}'`)}`)).json()).items;
    const before = await readBack();
    expect(before.length).toBe(1);
    const typed = { title: 'Typed title', destination: 'javascript:alert(document.cookie)', code: '12', geo: '{"US": "5"}' };
    const fillAll = async () => {
      await page.getByLabel('Title').fill(typed.title);
      await page.getByLabel('Destination').fill(typed.destination);
      await page.getByLabel('Icon').selectOption({ label: 'Twitch' });
      await page.getByLabel('18+ Age Gate').check();
      await page.getByLabel('Mode').selectOption({ label: 'Deeplink' });
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
      await expect(page.getByLabel('Mode').locator('option:checked')).toHaveText('Deeplink');
      await expect(page.getByLabel('OnlyFans tracking')).toBeChecked();
      await expect(page.getByLabel('Default Tracking Code')).toHaveValue(typed.code);
      await expect(page.getByLabel('Geo Rule')).toHaveValue(typed.geo);
      await expect(page.getByRole('button', { name: 'Save link' })).toBeEnabled();
      expect(await readBack(), what).toEqual(before);
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

// ---- Ticket 29: the session, where log-in lands, and the hand-over ----------------------------------------------------------
// The hand-over is proved on a throwaway ownerless Profile; no imported v1 Profile gets an owner in this Phase (ADR 0002).

const EDITOR = 'Edit Profile';

test.describe('the session and where log-in lands', () => {
  test.skip(!onLocalStack(), 'the Operator step needs the local test stack\'s PocketBase port');

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
    // Each stage arranged over HTTP as the Creator would reach it; only the verification is the Operator's step.
    const reach = async (stage: string) => {
      const { creator, token, id } = await account(request);
      const as = proxy(request, token);
      const claimed = await as.post('profiles/records', { username: stage === CLAIM ? 'edit' : creator.username, owner: id, mode: 'escape_ig' });
      expect(claimed.status(), stage).toBe(stage === CLAIM ? 400 : 200);
      if (stage === CLAIM || stage === VERIFY) return creator;
      await markVerified(creator.email);
      if (stage === 'Add your first Link') expect((await as.patch(`profiles/records/${(await claimed.json()).id}`, { displayName: 'Half way' })).status()).toBe(200);
      return creator;
    };
    const stages: [string, RegExp][] = [[CLAIM, /\/edit\/claim$/], [VERIFY, /\/edit\/verify-email$/], ['Your Profile', /\/edit\/profile$/], ['Add your first Link', /\/edit\/first-link$/]];
    for (const [stage, url] of stages) {
      const creator = await reach(stage);
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

    await setOwner(creator.username, creator.email);
    await markVerified(creator.email);
    const context = await phoneContext(browser);
    const editor = await context.newPage();
    await logIn(editor, creator);
    await expect(heading(editor, EDITOR)).toBeVisible();
    await expect(editor.getByText(`${origin}/${creator.username}`, { exact: true })).toBeVisible();
    await expect(editor.getByLabel('Display name')).toHaveValue('Handed Over');
    await expect(featured(editor)).toHaveText(['Imported card']);
    await editor.getByLabel('Display name').fill('Edited after hand-over');
    await editor.getByRole('button', { name: 'Save profile' }).click();
    await expect(editor.getByText('Profile saved.')).toBeVisible();
    await context.close();
    // The public page, in a fresh context with no Editor session.
    const visit = await phoneContext(browser, { origin });
    const visitor = await visit.newPage();
    await visitor.goto(`/${creator.username}`);
    await expect(visitor.locator('#displayName')).toHaveText('Edited after hand-over');
    await expect(visitor.locator('.link-card .link-title')).toHaveText(['Imported card']);
    await visit.close();
  });

  // ASSUMPTION: "after the whole run" is the spec's last test, which runs after every other test of this file in its worker
  // (no fullyParallel in playwright.config.ts); no other spec writes an owner, and the later v1 Import re-runs set none (rung 1:
  // grep; app/bin/import-v1 sends owner on no write). Overturned if another spec starts writing owners; the check then moves to
  // the last project.
  test('after the run, the Fixture Profile still has no owner', async () => {
    // Operator-side guard, not a seam under test: the ticket's criterion has no public-origin answer (spec Testing Decisions name the loopback for arranging only).
    expect(await ownerOf('fixture')).toBe('');
  });
});
