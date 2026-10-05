import { test, expect, type APIRequestContext, type Browser, type Page } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';

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
const PHONE = { width: 390, height: 844 };
const TEST_SECRETS: Record<string, string> = JSON.parse(readFileSync(join(ROOT, 'tests', 'fixtures', 'netlify', 'functions', 'secrets.json'), 'utf8'));
const holdsDestination = (body: string) => Object.values(TEST_SECRETS).some((d) => body.includes(d));

test.use({ viewport: PHONE });

type Creator = { email: string; password: string; username: string };
const fresh = (): Creator => {
  const id = randomBytes(4).toString('hex');
  return { email: `signup_${id}@example.com`, password: `throwaway-${id}`, username: `signup_${id}` };
};

// The Editor's screens, found by their headings.
const SIGN_UP = 'Create your page';
const LOG_IN = 'Log in';
const CLAIM = 'Claim your Username';
const VERIFY = 'Verify your email';
const heading = (page: Page, name: string) => page.getByRole('heading', { name, exact: true });

async function signUp(page: Page, creator: Creator) {
  await page.goto('/edit/signup');
  await page.getByLabel('Email').fill(creator.email);
  await page.getByLabel('Password').fill(creator.password);
  await page.getByLabel('Username').fill(creator.username);
  await page.getByRole('button', { name: 'Create account' }).click();
}

async function logIn(page: Page, creator: Creator) {
  await page.goto('/edit');
  await expect(heading(page, LOG_IN)).toBeVisible();
  await page.getByLabel('Email').fill(creator.email);
  await page.getByLabel('Password').fill(creator.password);
  await page.getByRole('button', { name: 'Log in' }).click();
}

// A fresh context at 390×844 with no Editor session, with an optional User-Agent. Given the stack's origin, it reaches only that
// host: every request elsewhere is aborted, so nothing leaves the machine.
async function phoneContext(browser: Browser, { origin, userAgent }: { origin?: string; userAgent?: string } = {}) {
  const context = await browser.newContext({ viewport: PHONE, ...(userAgent ? { userAgent } : {}) });
  if (origin) await context.route((url) => url.host !== new URL(origin).host, (route) => route.abort('blockedbyclient'));
  return context;
}

async function expectVerifyScreen(page: Page) {
  await expect(heading(page, VERIFY)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Resend email' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Continue' })).toBeVisible();
  await expect(page).toHaveURL(/\/edit\/verify-email$/);
}

// The proxy, called as the Editor calls it: JSON bodies, the token as the Authorization header.
const proxy = (request: APIRequestContext, token?: string) => {
  const headers = token ? { Authorization: token } : {};
  return {
    get: (path: string) => request.get(`/api/collections/${path}`, { headers }),
    post: (path: string, data: object = {}) => request.post(`/api/collections/${path}`, { headers, data }),
    patch: (path: string, data: object = {}) => request.patch(`/api/collections/${path}`, { headers, data }),
  };
};

// An account made and signed in through the proxy: its token and record id.
async function account(request: APIRequestContext, creator: Creator = fresh()) {
  const anonymous = proxy(request);
  const created = await anonymous.post('users/records', { email: creator.email, password: creator.password, passwordConfirm: creator.password });
  expect(created.status(), 'anonymous sign-up through the proxy').toBe(200);
  const auth = await anonymous.post('users/auth-with-password', { identity: creator.email, password: creator.password });
  expect(auth.status(), 'an unverified account signs in through the proxy').toBe(200);
  const { token, record } = await auth.json();
  expect(record.verified).toBe(false);
  return { creator, token: token as string, id: record.id as string };
}

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

// Is the stack under test the local test stack that tests/stack.sh starts? The same predicate as the 02 specs: the Operator
// step needs PocketBase's loopback port, which only that stack publishes.
const onLocalStack = () => !process.env.PLAYWRIGHT_BASE_URL || new URL(process.env.PLAYWRIGHT_BASE_URL).origin === 'http://localhost:4173';
const ENV: Record<string, string> = Object.fromEntries(
  readFileSync(join(ROOT, 'tests', 'e2e.env'), 'utf8')
    .split('\n')
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]),
);
const PB = `http://127.0.0.1:${ENV.PB_PORT}`;
async function superuserToken() {
  const res = await fetch(`${PB}/api/collections/_superusers/auth-with-password`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ identity: ENV.PB_SUPERUSER_EMAIL, password: ENV.PB_SUPERUSER_PASSWORD }),
  });
  expect(res.status).toBe(200);
  return (await res.json()).token as string;
}
const asSuperuser = async (token: string, path: string, init: RequestInit = {}) =>
  fetch(PB + path, { ...init, headers: { ...(init.headers as Record<string, string>), Authorization: token } });

// The Operator step: a superuser marks the account verified, as the Operator would in the admin UI.
async function markVerified(email: string) {
  const token = await superuserToken();
  const found = await (await asSuperuser(token, `/api/collections/users/records?filter=${encodeURIComponent(`email='${email}'`)}`)).json();
  expect(found.items.length).toBe(1);
  const res = await asSuperuser(token, `/api/collections/users/records/${found.items[0].id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ verified: true }),
  });
  expect(res.status).toBe(200);
}

// An in-memory PNG of one colour (spec, Testing Decisions, Images): no fixture file, and proof a non-webp input comes out webp.
const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function png(width: number, height: number, [r, g, b]: [number, number, number]) {
  const crc = (buf: Buffer) => {
    let c = 0xffffffff;
    for (const x of buf) c = CRC_TABLE[(c ^ x) & 255] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type: string, data: Buffer) => {
    const body = Buffer.concat([Buffer.from(type, 'latin1'), data]);
    const out = Buffer.alloc(body.length + 8);
    out.writeUInt32BE(data.length, 0);
    body.copy(out, 4);
    out.writeUInt32BE(crc(body), body.length + 4);
    return out;
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8 bits per channel
  ihdr[9] = 2; // RGB
  const row = Buffer.concat([Buffer.from([0]), Buffer.from(Array.from({ length: width }, () => [r, g, b]).flat())]);
  const pixels = Buffer.concat(Array.from({ length: height }, () => row));
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(pixels)), chunk('IEND', Buffer.alloc(0))]);
}
const pngFile = (name: string, colour: [number, number, number]) => ({ name, mimeType: 'image/png', buffer: png(600, 400, colour) });
const isWebp = (b: Buffer) => b.length >= 12 && b.toString('latin1', 0, 4) === 'RIFF' && b.toString('latin1', 8, 12) === 'WEBP';

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

// The 00-smoke In-App Browser User-Agent.
const INSTAGRAM_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) ' +
  'Mobile/15E148 Instagram 300.0.0.0.0 (iPhone14,2; iOS 17_0; en_US; en-US; scale=3.00; 1170x2532; 0)';

// A verified Creator with a named Profile on Escape Mode and two Links, arranged through the proxy as the Creator would through
// the Editor; only the verification is the Operator's step. Links are [title, Mode] with '' for "Profile default", and their
// Destinations are test-only example.com addresses.
// ASSUMPTION: arranged as the Creator through the proxy, with only the verification as the Operator's step, so the describe
// skips off the local test stack (rung 3: ticket 26's markVerified and onLocalStack). Overturned when 31's mail catcher lands.
async function verifiedCreator(request: APIRequestContext, links: [string, string][]) {
  const { token, id, creator } = await account(request);
  const as = proxy(request, token);
  const claimed = await as.post('profiles/records', { username: creator.username, owner: id, mode: 'escape_ig' });
  expect(claimed.status()).toBe(200);
  const profileId = (await claimed.json()).id as string;
  await markVerified(creator.email);
  const named = await as.patch(`profiles/records/${profileId}`, { displayName: 'Before Name', bio: 'Before bio.' });
  expect(named.status()).toBe(200);
  for (const [order, [title, mode]] of links.entries()) {
    const res = await as.post('links/records', { profile: profileId, title, order, mode, destination: `https://example.com/${creator.username}/${order}` });
    expect(res.status(), title).toBe(200);
  }
  return { creator, token, profileId };
}

type Served = { profile: { displayName: string; bio: string; avatarUrl: string; mode: string }; links: { title: string; mode: string }[] };
const servedProfile = async (request: APIRequestContext, username: string): Promise<Served> => {
  const res = await request.get(`/api/profiles/${username}.json`);
  expect(res.status()).toBe(200);
  const body = await res.text();
  expect(holdsDestination(body) || body.includes('https://example.com/'), 'a Destination in the Profile JSON').toBe(false);
  return JSON.parse(body);
};

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
