import { test, expect, type APIRequestContext, type Browser, type Page } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Phase 3 (docs/spec/phase-03-auth-and-editor.md, Testing Decisions): one seam, the running v2 stack at Playwright's baseURL,
// the public origin. Creator journeys run in the browser at 390×844; the Visitor side and every second log-in run in a fresh
// context with no Editor session; rule and proxy checks use the `request` fixture at the same origin, calling the proxy
// exactly as the Editor does.
// Ticket 25: sign-up, the claim and its refusals, the verify screen, the landing page's button, and the proxy's allow-list.
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

const phoneContext = (browser: Browser) => browser.newContext({ viewport: PHONE });

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
    // The owner, too, reaches no Link through the Profile while links rules are null: the back-relation does not expand, and a
    // filter on it is refused.
    const own = proxy(request, first.token);
    const expanded = await own.get('profiles/records?expand=links_via_profile');
    const expandedBody = await expanded.text();
    expect(holdsDestination(expandedBody), 'a Destination in the owner\'s expand').toBe(false);
    expect(expanded.status()).toBe(200);
    const items: { username: string; expand?: Record<string, unknown> }[] = JSON.parse(expandedBody).items;
    expect(items.map((p) => p.username)).toEqual([first.creator.username]);
    expect(items.every((p) => !p.expand || !('links_via_profile' in p.expand)), 'links expanded for the owner').toBe(true);
    const filtered = await own.get(`profiles/records?filter=${encodeURIComponent("links_via_profile.destination != ''")}`);
    const filteredBody = await filtered.text();
    expect(holdsDestination(filteredBody), 'a Destination in the answer to a filter on links').toBe(false);
    expect(filtered.status(), 'a filter on links refused').toBe(400);
  });
});
