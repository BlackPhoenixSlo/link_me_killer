import { test, expect, type APIRequestContext } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Ticket 20 (spec, Testing Decisions, 02-live-edit): an edit made through PocketBase's REST API on its loopback port, as the
// admin UI makes it, shows on the next page load with no build and no restart, and PocketBase's API stays closed to anyone
// but a superuser. The spec arranges a throwaway Profile of its own under a fresh Username and deletes it in afterAll, so it
// is safe beside the other specs of the chromium project. Destinations are compared as booleans and never printed; the
// throwaway Links' Destinations are on example.com.
// ASSUMPTION: the whole spec skips when the stack under test is not the local test stack, not only its anonymous calls,
// because every edit is arranged through PocketBase's loopback port, which only the local test stack publishes here (rung 3:
// 02-v1-import's stack block skips the same way). Overturned if the spec must run against the VPS through an SSH tunnel; the
// loopback origin then comes from the environment.
const ROOT = join(__dirname, '..', '..');

// Is the stack under test the local test stack that tests/stack.sh starts? The same predicate, by the same name, in
// 02-v1-import and 02-profile-parity.
const onLocalStack = () => !process.env.PLAYWRIGHT_BASE_URL || new URL(process.env.PLAYWRIGHT_BASE_URL).origin === 'http://localhost:4173';

const ENV: Record<string, string> = Object.fromEntries(
  readFileSync(join(ROOT, 'tests', 'e2e.env'), 'utf8')
    .split('\n')
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]),
);
const PB = `http://127.0.0.1:${ENV.PB_PORT}`;
const TEST_SECRETS: Record<string, string> = JSON.parse(readFileSync(join(ROOT, 'tests', 'fixtures', 'netlify', 'functions', 'secrets.json'), 'utf8'));
const MODES = ['direct', 'escape_ig', 'deeplink'] as const;
// A Link's own Modes: the Deeplink Modes are Profile defaults only (ADR 0003, amended 2026-10-06).
const LINK_MODES = ['direct', 'escape_ig'] as const;

const pb = (pathname: string, { token, ...init }: RequestInit & { token?: string } = {}) =>
  fetch(PB + pathname, { ...init, headers: { ...(init.headers as Record<string, string>), ...(token ? { Authorization: token } : {}) } });
const send = (method: string, body: object) => ({ method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

test.describe('live edits through PocketBase\'s API', () => {
  test.skip(!onLocalStack(), 'the stack under test is not the local test stack');
  // One throwaway Profile, edited step by step: each test starts from the state the one before it left.
  test.describe.configure({ mode: 'serial' });

  let token: string;
  let username: string;
  let profileId = '';
  const links: Record<string, { id: string; linkId: string }> = {};
  // Every Destination this spec writes, plus the Test Secrets: no response body may hold one.
  const destinations: string[] = Object.values(TEST_SECRETS);
  const holdsDestination = (body: string) => destinations.some((d) => body.includes(d));

  const createLink = async (key: string, title: string, order: number) => {
    const destination = `https://example.com/${username}/${key}`;
    destinations.push(destination);
    const res = await pb('/api/collections/links/records', { ...send('POST', { profile: profileId, title, order, destination }), token });
    expect(res.status, `create ${key}`).toBe(200);
    links[key] = await res.json();
  };
  const patch = async (collection: string, id: string, body: object) => {
    const res = await pb(`/api/collections/${collection}/records/${id}`, { ...send('PATCH', body), token });
    expect(res.status, `patch ${collection}`).toBe(200);
  };
  type Served = { profile: { displayName: string; mode: string }; links: { id: string; title: string; mode: string; url: string }[] };
  const served = async (request: APIRequestContext) => {
    const res = await request.get(`/api/profiles/${username}.json`);
    const body = await res.text();
    expect(holdsDestination(body), 'a Destination in the Profile JSON').toBe(false);
    expect(res.status()).toBe(200);
    return JSON.parse(body) as Served;
  };
  // The app container's start time: unchanged across the edits means no restart.
  const appStartedAt = () => {
    const id = spawnSync('docker', ['compose', '--env-file', 'tests/e2e.env', 'ps', '-q', 'app'], { cwd: ROOT, encoding: 'utf8' }).stdout.trim();
    return spawnSync('docker', ['inspect', '--format', '{{.State.StartedAt}}', id], { encoding: 'utf8' }).stdout.trim();
  };
  let startedAt: string;

  test.beforeAll(async () => {
    const auth = await pb('/api/collections/_superusers/auth-with-password', send('POST', { identity: ENV.PB_SUPERUSER_EMAIL, password: ENV.PB_SUPERUSER_PASSWORD }));
    expect(auth.status).toBe(200);
    token = (await auth.json()).token;
    username = `liveedit_${randomBytes(4).toString('hex')}`;
    startedAt = appStartedAt();
    expect(startedAt).not.toBe('');
  });
  test.afterAll(async () => {
    // Even after a failure: the Profile goes, and its Links with it (cascade delete). 404 when the delete test already ran.
    if (profileId) await pb(`/api/collections/profiles/records/${profileId}`, { method: 'DELETE', token });
  });

  test('a Profile and Link created through the API show on the page', async ({ page }) => {
    const res = await pb('/api/collections/profiles/records', { ...send('POST', { username, displayName: 'Live Edit', bio: 'throwaway' }), token });
    expect(res.status).toBe(200);
    profileId = (await res.json()).id;
    await createLink('first', 'First Link', 1);
    await page.goto(`/${username}`);
    await expect(page.locator('#displayName')).toHaveText('Live Edit');
    await expect(page.locator('.link-card .link-title')).toHaveText(['First Link']);
  });

  test('renaming the Profile shows on the next load', async ({ page }) => {
    await patch('profiles', profileId, { displayName: 'Renamed Live Edit' });
    await page.goto(`/${username}`);
    await expect(page.locator('#displayName')).toHaveText('Renamed Live Edit');
  });

  test('retitling a Link shows on the next load', async ({ page }) => {
    await patch('links', links.first.id, { title: 'Retitled Link' });
    await page.goto(`/${username}`);
    await expect(page.locator('.link-card .link-title')).toHaveText(['Retitled Link']);
  });

  test('adding a Link shows on the next load', async ({ page }) => {
    await createLink('second', 'Second Link', 2);
    await page.goto(`/${username}`);
    await expect(page.locator('.link-card .link-title')).toHaveText(['Retitled Link', 'Second Link']);
  });

  test('reordering the Links shows on the next load', async ({ page, request }) => {
    await patch('links', links.second.id, { order: 0 });
    await page.goto(`/${username}`);
    await expect(page.locator('.link-card .link-title')).toHaveText(['Second Link', 'Retitled Link']);
    expect((await served(request)).links.map((l) => l.id)).toEqual([links.second.linkId, links.first.linkId]);
  });

  test('deleting a Link shows on the next load', async ({ page }) => {
    const res = await pb(`/api/collections/links/records/${links.first.id}`, { method: 'DELETE', token });
    expect(res.status).toBe(204);
    await page.goto(`/${username}`);
    await expect(page.locator('.link-card .link-title')).toHaveText(['Second Link']);
  });

  test('the Profile\'s Mode and a Link\'s Mode show as the effective Mode; a Deeplink Link\'s url is empty', async ({ request, baseURL }) => {
    const origin = new URL(baseURL!).origin;
    for (const profileMode of ['', ...MODES]) {
      for (const linkMode of ['', ...LINK_MODES]) {
        const at = `Profile Mode '${profileMode}', Link Mode '${linkMode}'`;
        await patch('profiles', profileId, { mode: profileMode });
        await patch('links', links.second.id, { mode: linkMode });
        const json = await served(request);
        const effective = linkMode || profileMode || 'escape_ig';
        expect(json.profile.mode, at).toBe(profileMode || 'escape_ig');
        expect(json.links.length, at).toBe(1);
        expect(json.links[0].mode, at).toBe(effective);
        expect(json.links[0].url, at).toBe(effective === 'deeplink' ? '' : `${origin}/r/${links.second.linkId}`);
      }
    }
  });

  // Amended by ticket 25 (Phase 3), only where it opens a rule: an anonymous sign-up now succeeds, and an anonymous list or
  // view of profiles returns no record (an empty list or a refusal both pass). Every other call is still refused.
  // Amended by ticket 26, only where it opens a rule: links reads are open to the owner of a Link's Profile, so an anonymous
  // list or view of links returns no record too.
  test('anonymous calls to PocketBase: sign-up succeeds, profiles and links show no record, the rest are refused, and no answer holds a Destination', async () => {
    type Expected = 'refused' | 'no record' | 'created';
    const calls: [string, string, Expected, RequestInit?][] = [
      ['list profiles', '/api/collections/profiles/records', 'no record'],
      ['view a profile', `/api/collections/profiles/records/${profileId}`, 'no record'],
      ['list links', '/api/collections/links/records', 'no record'],
      ['view a link', `/api/collections/links/records/${links.second.id}`, 'no record'],
      ['list events', '/api/collections/events/records', 'refused'],
      // A well-formed record id stands in for an Event's; this test does not look one up.
      ['view an event', '/api/collections/events/records/aaaaaaaaaaaaaaa', 'refused'],
      ['create a users record', '/api/collections/users/records', 'created', send('POST', { email: `${username}@example.com`, password: 'signup-check-1', passwordConfirm: 'signup-check-1' })],
    ];
    for (const [name, path, expected, init] of calls) {
      const res = await pb(path, init);
      const body = await res.text();
      expect(holdsDestination(body), `a Destination in the answer to: ${name}`).toBe(false);
      if (expected === 'refused') expect(res.status, name).toBe(403);
      if (expected === 'created') expect(res.status, name).toBe(200);
      if (expected === 'no record') {
        const empty = res.status === 200 && Array.isArray(JSON.parse(body).items) && JSON.parse(body).items.length === 0;
        expect(empty || [403, 404].includes(res.status), name).toBe(true);
      }
    }
  });

  test('deleting the Profile sends its page to the landing page, all with no restart', async ({ page, request }) => {
    const res = await pb(`/api/collections/profiles/records/${profileId}`, { method: 'DELETE', token });
    expect(res.status).toBe(204);
    expect((await request.get(`/api/profiles/${username}.json`)).status()).toBe(404);
    await page.goto(`/${username}`);
    await expect(page).toHaveURL(`${new URL(page.url()).origin}/landing.html`);
    expect(appStartedAt()).toBe(startedAt);
  });
});

