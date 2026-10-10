import { test, expect, type APIRequestContext, type APIResponse } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { callsTo429, ENV } from './helpers';

// Ticket 22 (spec, Testing Decisions, 02-reveal-guard; Reveal hardening (D8)): Reveal answers only v2's own origin, and holds a
// per-client limit (the `/r` redirector is gone, so Reveal is the only door). Runs in the last project (playwright.config.ts),
// after every other spec, because it uses up the window. It uses the Fixture Profile alone, whose Test Secrets are all on
// example.com; ids are read from the served Profile JSON. Destinations are compared as booleans and never printed.
// Every call from this process reaches Caddy from one peer address. Caddy, trusting no proxy, drops a client-set
// X-Forwarded-For and writes that peer address alone (observed: with a temporary log of the entry count, every call of this
// spec, the two-entry ones included, reached the app with one entry). So the X-Forwarded-For check proves at the stack that a
// client-set header neither resets nor escapes the limit; it cannot tell the app's last-entry rule from a first-entry one.
// Against a stack that does not serve the Fixture Profile (the VPS), beforeAll fails before any Reveal or `/r` call, so the
// spec never uses up a remote window.
const ROOT = join(__dirname, '..', '..');
const FIXTURES = join(ROOT, 'tests', 'fixtures');
const PROFILE_JSON = '/api/profiles/fixture.json';
const REVEAL_PATH = '/.netlify/functions/reveal';

const LIMIT = Number(ENV.REVEAL_LIMIT_PER_MINUTE);

type FixtureLink = { id: string; title: string; url: string; mode?: string };
type ServedLink = { id: string; title: string; isAdult: boolean; mode: string };
const fixtureLinks: FixtureLink[] = JSON.parse(readFileSync(join(FIXTURES, 'api', 'profiles', 'fixture.json'), 'utf8')).links;
const TEST_SECRETS: Record<string, string> = JSON.parse(readFileSync(join(FIXTURES, 'netlify', 'functions', 'secrets.json'), 'utf8'));
const destinationOf = (link: { title: string }) => TEST_SECRETS[fixtureLinks.find((l) => l.title === link.title)!.id];
// Every Fixture Destination: the Test Secrets and the file's own card urls.
const DESTINATIONS = [...Object.values(TEST_SECRETS), ...fixtureLinks.map((l) => l.url)].filter(Boolean);
const holdsDestination = (text: string) => DESTINATIONS.some((d) => text.includes(d));
const noCors = (res: APIResponse) => !Object.keys(res.headers()).some((h) => h.startsWith('access-control-'));

let links: ServedLink[];
let origin: string;
// A plain non-Adult Link (the Fixture's old "Deeplink Link", now just a Link with no Mode of its own): any non-Adult Link
// Reveals its Destination, so it stands in for the limit and origin checks.
const plain = () => links.find((l) => !l.isAdult && !fixtureLinks.find((f) => f.title === l.title)!.mode)!;

test.beforeAll(async ({ playwright }) => {
  const baseURL = test.info().project.use.baseURL!;
  origin = new URL(baseURL).origin;
  const api = await playwright.request.newContext({ baseURL });
  const res = await api.get(PROFILE_JSON);
  if (!res.ok()) throw new Error(`Fixture Profile not served at ${PROFILE_JSON} (status ${res.status()})`);
  links = (await res.json()).links;
  await api.dispose();
});

// The checks build on each other: the origin checks need a window that is not yet used up, and the limit checks use it up.
test.describe.configure({ mode: 'serial' });

const reveal = (request: APIRequestContext, headers: Record<string, string> = {}, id = plain().id) =>
  request.get(REVEAL_PATH, { params: { id, user: 'fixture' }, headers, maxRedirects: 0 });

// A refused answer: the status, no-store, no CORS header, a fixed JSON body holding no Destination, and no Location.
async function expectRefused(res: APIResponse, status: number, label: string) {
  expect(res.status(), label).toBe(status);
  expect(res.headers()['cache-control'], label).toBe('no-store');
  expect(noCors(res), `${label}: no CORS header`).toBe(true);
  expect('location' in res.headers(), `${label}: a Location`).toBe(false);
  const body = await res.text();
  expect(holdsDestination(body), `${label}: a Destination in the body`).toBe(false);
  expect(JSON.parse(body).realUrl, `${label}: a realUrl`).toBeUndefined();
}

test.describe('Reveal answers only its own origin', () => {
  test('a foreign Origin gets 403 with no Destination', async ({ request }) => {
    await expectRefused(await reveal(request, { Origin: 'https://harvester.example' }), 403, 'foreign Origin');
    // the same host on another scheme or port is another origin too
    const { host, hostname } = new URL(origin);
    await expectRefused(await reveal(request, { Origin: `${origin.startsWith('https') ? 'http' : 'https'}://${host}` }), 403, 'other scheme');
    await expectRefused(await reveal(request, { Origin: `${new URL(origin).protocol}//${hostname}:1` }), 403, 'other port');
    await expectRefused(await reveal(request, { Origin: 'null' }), 403, 'Origin: null');
  });

  for (const site of ['cross-site', 'same-site']) {
    test(`Sec-Fetch-Site: ${site} gets 403 with no Destination, even with the page's own Origin`, async ({ request }) => {
      await expectRefused(await reveal(request, { 'Sec-Fetch-Site': site }), 403, site);
      await expectRefused(await reveal(request, { 'Sec-Fetch-Site': site, Origin: origin }), 403, `${site} with own Origin`);
    });
  }

  test('the page\'s own Origin, Sec-Fetch-Site same-origin or none, and a request with neither header pass', async ({ request }) => {
    const sent: Record<string, Record<string, string>> = {
      'own Origin': { Origin: origin },
      'own Origin, same-origin': { Origin: origin, 'Sec-Fetch-Site': 'same-origin' },
      'Sec-Fetch-Site: none': { 'Sec-Fetch-Site': 'none' },
      'neither header': {},
    };
    for (const [label, headers] of Object.entries(sent)) {
      const res = await reveal(request, headers);
      expect(res.status(), label).toBe(200);
      expect(res.headers()['cache-control'], label).toBe('no-store');
      expect(noCors(res), `${label}: no CORS header`).toBe(true);
      expect((await res.json()).realUrl === destinationOf(plain()), `${label}: its Test Secrets Destination`).toBe(true);
    }
  });

  test('a 404 Reveal carries no CORS header either', async ({ request }) => {
    const res = await reveal(request, { Origin: origin }, 'zzzzzzzzzzzz');
    expect(res.status()).toBe(404);
    expect(noCors(res)).toBe(true);
  });
});

test.describe('Reveal\'s per-client limit', () => {
  test(`repeated Reveal calls reach 429 within ${LIMIT} + 1, and no 429 holds a Destination`, async ({ request }) => {
    expect(LIMIT, 'REVEAL_LIMIT_PER_MINUTE in tests/e2e.env').toBeGreaterThan(0);
    const calls = await callsTo429(() => reveal(request, { Origin: origin }), [200]);
    expect(calls, '429 within the limit plus one').toBeGreaterThan(0);
    // Now over the limit, with fixed bodies and no Location.
    await expectRefused(await reveal(request, { Origin: origin }), 429, 'Reveal over the limit');
    await expectRefused(await reveal(request), 429, 'Reveal over the limit, no header');
    expect(await (await reveal(request, { Origin: origin })).json()).toEqual({ error: 'Too many requests' });
  });

  test('a client-set first X-Forwarded-For entry neither resets nor escapes the limit', async ({ request }) => {
    const forwardedAs = (i: number) => ({ 'X-Forwarded-For': `203.0.113.${i % 250}, 198.51.100.${i % 200}` });
    // Each call claims a fresh address of its own; counted by any of them, every call would pass.
    const calls = await callsTo429((i) => reveal(request, forwardedAs(i)), [200]);
    expect(calls, '429 within the limit plus one, whatever the first entry').toBeGreaterThan(0);
    // Once refused, a new claimed address does not start a fresh count.
    for (let i = 1; i <= 5; i++) {
      await expectRefused(await reveal(request, forwardedAs(1000 + i)), 429, `Reveal claiming address ${i}`);
    }
  });
});
