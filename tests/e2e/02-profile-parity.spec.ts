import { test, expect, devices, type Page, type Request } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Phase 2 parity, Fixture Profile half (docs/spec/phase-02-vps-foundation.md, Testing Decisions, 02-profile-parity).
// The v1 Snapshot cases join in tickets 17 and 18. Every id is read from the served Profile JSON. A Link's Test Secrets
// Destination is found through the Fixture Profile file's card of the same title. Destinations are compared as booleans
// and never printed. The Tracking Code oracle is v1's own Reveal handler (the Fixture site's verbatim copy), run in this
// process with the Fixture's own v1 ids.
const ROOT = join(__dirname, '..', '..');
const FIXTURES = join(ROOT, 'tests', 'fixtures');
const PAGE_COPY = join(ROOT, 'app', 'public');
const PROFILE_JSON = '/api/profiles/fixture.json';
const REVEAL_PATH = '/.netlify/functions/reveal';
const MUST_REVALIDATE = 'public, max-age=0, must-revalidate';
const IMMUTABLE = 'public, max-age=31536000, immutable';
const MODES = ['direct', 'escape_ig', 'deeplink'];

type FixtureLink = { id: string; title: string; url: string; isAdult: boolean; mode: string; icon?: string; backgroundImage?: string; default_tracknumber?: string };
type ServedLink = { id: string; title: string; url: string; isAdult: boolean; tracking: boolean; mode: string; icon: string; backgroundImage: string; default_tracknumber?: string };
type Served = { profile: Record<string, unknown> & { username: string; mode: string; avatarUrl: string }; links: ServedLink[] };

const fixture: { profile: { avatarUrl: string; mode: string }; links: FixtureLink[] } = JSON.parse(
  readFileSync(join(FIXTURES, 'api', 'profiles', 'fixture.json'), 'utf8'),
);
const TEST_SECRETS: Record<string, string> = JSON.parse(readFileSync(join(FIXTURES, 'netlify', 'functions', 'secrets.json'), 'utf8'));
const pageCopy = (file: string) => readFileSync(join(PAGE_COPY, file));
const fileCard = (link: { title: string }) => fixture.links.find((l) => l.title === link.title)!;
const destinationOf = (link: { title: string }) => TEST_SECRETS[fileCard(link).id];
const stockIcon = (v1Path: string) => readFileSync(join(PAGE_COPY, v1Path.replace(/^\//, '')));

// v1's Reveal handler, loaded from the Fixture site in this process; it reads the Test Secrets beside it.
async function v1Reveal(v1Id: string, trackingId?: string): Promise<{ statusCode: number; realUrl?: string }> {
  const { handler } = require(join(FIXTURES, 'netlify', 'functions', 'reveal.js'));
  const query: Record<string, string> = { id: v1Id, user: 'fixture' };
  if (trackingId !== undefined) query.trackingId = trackingId;
  const res = await handler({ queryStringParameters: query, headers: {} }, {});
  return { statusCode: res.statusCode, realUrl: JSON.parse(res.body).realUrl };
}

let served: Served;
let origin: string;
const linkBy = (pick: (l: ServedLink) => boolean) => served.links.find(pick)!;
const direct = () => linkBy((l) => !l.isAdult && l.mode === 'direct');
const deeplink = () => linkBy((l) => !l.isAdult && l.mode === 'deeplink');
const adult = () => linkBy((l) => l.isAdult);

test.beforeAll(async ({ playwright }) => {
  const baseURL = test.info().project.use.baseURL!;
  origin = new URL(baseURL).origin;
  const api = await playwright.request.newContext({ baseURL });
  const res = await api.get(PROFILE_JSON);
  if (!res.ok()) throw new Error(`Fixture Profile not served at ${PROFILE_JSON} (status ${res.status()})`);
  served = await res.json();
  await api.dispose();
});

test.describe('Fixture Profile journeys (desktop Chrome)', () => {
  test.use({ userAgent: devices['Desktop Chrome'].userAgent });

  // Every host but the one under test is answered here with an empty page; the requests are kept to be compared.
  let offHost: Request[];
  let paths: string[];
  test.beforeEach(async ({ page }) => {
    offHost = [];
    paths = [];
    const host = new URL(origin).host;
    page.on('request', (req) => {
      const url = new URL(req.url());
      if (url.host === host) paths.push(url.pathname);
    });
    await page.route((url) => url.host !== host, (route) => {
      offHost.push(route.request());
      return route.fulfill({ status: 200, contentType: 'text/html', body: '' });
    });
  });

  // The hop after `/r/{id}`'s 302 is the browser's own request to the Location. Playwright's routes never see a redirect
  // hop, so the network guard in playwright.config.ts fails it locally, and it is observed as that failed request.
  // ASSUMPTION: "ends at its Test Secrets Destination" is proven by the browser's request redirected from `/r/{id}`, not by
  // page.route answering it, because Playwright routes no redirect hop (rung 1: Playwright 1.58 page.route docs, and a probe
  // run for this ticket). Overturned if Playwright starts routing redirect hops; the hop is then answered like the others.
  const hopFrom = (page: Page, id: string) =>
    page.waitForEvent('requestfailed', (req) => req.redirectedFrom()?.url() === `${origin}/r/${id}`);

  test('the Direct Link\'s Click goes through /r/{Link Id} and ends at its Test Secrets Destination', async ({ page }) => {
    const link = direct();
    await page.goto('/fixture');
    await expect(page.locator('.link-card .link-title')).toHaveCount(served.links.length);
    const hop = hopFrom(page, link.id);
    await page.locator('.link-card', { hasText: link.title }).click();
    const request = await hop;
    expect(request.url() === destinationOf(link)).toBe(true);
    expect(request.failure()?.errorText).toBe('net::ERR_NAME_NOT_RESOLVED'); // the network guard, never the network
    expect(paths.filter((p) => p === REVEAL_PATH)).toEqual([]);
  });

  test('the Deeplink Link\'s Click sends Reveal with its id, never requests /r, then requests its Test Secrets Destination', async ({ page }) => {
    const link = deeplink();
    const destination = destinationOf(link);
    await page.goto('/fixture');
    await expect(page.locator('.link-card .link-title')).toHaveCount(served.links.length);
    const reveal = page.waitForRequest((req) => new URL(req.url()).pathname === REVEAL_PATH);
    const landed = page.waitForRequest((req) => req.url() === destination);
    await page.locator('.link-card', { hasText: link.title }).click();
    expect(new URL((await reveal).url()).searchParams.get('id')).toBe(link.id);
    const request = await landed;
    expect(request.redirectedFrom()).toBeNull();
    await expect.poll(() => offHost.some((r) => r.url() === destination)).toBe(true); // answered by this spec's page.route
    expect(paths.filter((p) => p.startsWith('/r/'))).toEqual([]);
  });

  test('/fixture?link={Direct Link\'s id} ends at the Direct Link\'s Test Secrets Destination', async ({ page }) => {
    const link = direct();
    const hop = hopFrom(page, link.id);
    await page.goto(`/fixture?link=${link.id}`);
    const request = await hop;
    expect(request.url() === destinationOf(link)).toBe(true);
    expect(paths.filter((p) => p === REVEAL_PATH)).toEqual([]);
  });
});

test.describe('Profile JSON', () => {
  test('carries fresh Link Ids, the url rule, effective Modes and nothing private', async ({ request }) => {
    const res = await request.get(PROFILE_JSON);
    expect(res.status()).toBe(200);
    expect(res.headers()['cache-control']).toBe(MUST_REVALIDATE);
    const text = await res.text();
    const json: Served = JSON.parse(text);
    expect(Object.keys(json.profile).sort()).toEqual(['avatarUrl', 'bio', 'displayName', 'mode', 'username', 'verified']);
    expect(json.profile.username).toBe('fixture');
    expect(json.links.map((l) => l.title)).toEqual(fixture.links.map((l) => l.title)); // in order
    for (const [i, link] of json.links.entries()) {
      const card = `card ${i + 1}`;
      expect(link.id, card).toMatch(/^[a-z0-9]{12}$/);
      expect(link.id === fileCard(link).id, card).toBe(false);
      const expectedUrl = !link.isAdult && link.mode !== 'deeplink' ? `${origin}/r/${link.id}` : '';
      expect(link.url === expectedUrl, `${card} url`).toBe(true);
      expect(link.mode, card).toBe(fileCard(link).mode); // the Fixture's Links each carry their own Mode
      expect('default_tracknumber' in link, card).toBe(fileCard(link).default_tracknumber !== undefined);
    }
    expect(new Set(json.links.map((l) => l.id)).size).toBe(json.links.length);
    expect(MODES).toContain(json.profile.mode);
    expect(json.profile.mode).toBe(fixture.profile.mode);
    // No private key anywhere in the document.
    const keys: string[] = [];
    JSON.parse(text, (key, value) => { keys.push(key); return value; });
    for (const key of ['destination', 'geo', 'owner', 'v1Key']) expect(keys.includes(key), key).toBe(false);
    expect(Object.values(TEST_SECRETS).some((d) => text.includes(d))).toBe(false);
  });

  test('the Username is matched lower-cased', async ({ request }) => {
    const res = await request.get('/api/profiles/FixTure.json');
    expect(res.status()).toBe(200);
    expect((await res.json()).links.map((l: ServedLink) => l.id)).toEqual(served.links.map((l) => l.id));
  });

  test('an unknown Username answers 404 with the contract\'s body', async ({ request }) => {
    const res = await request.get('/api/profiles/nosuchprofile.json');
    expect(res.status()).toBe(404);
    expect(await res.json()).toEqual({ error: 'Profile not found' });
  });

  test('every image URL returns the Fixture site\'s bytes with the immutable cache header', async ({ request }) => {
    const images: [string, string | undefined][] = [[served.profile.avatarUrl, fixture.profile.avatarUrl]];
    for (const link of served.links) {
      images.push([link.icon, fileCard(link).icon], [link.backgroundImage, fileCard(link).backgroundImage]);
    }
    for (const [i, [url, v1Path]] of images.entries()) {
      if (!v1Path) {
        expect(url, `image ${i}`).toBe('');
        continue;
      }
      expect(url, `image ${i}`).toMatch(/^\/api\/files\/(profiles|links)\/[a-z0-9]+\/[^/]+$/);
      const res = await request.get(url);
      expect(res.status(), `image ${i}`).toBe(200);
      expect(res.headers()['cache-control'], `image ${i}`).toBe(IMMUTABLE);
      expect((await res.body()).equals(stockIcon(v1Path)), `image ${i}`).toBe(true);
    }
  });

  test('a file name that is not its record\'s current file answers 404', async ({ request }) => {
    const res = await request.get(served.profile.avatarUrl.replace(/\/[^/]+$/, '/not_the_current_file.webp'));
    expect(res.status()).toBe(404);
  });

  test('a file path whose record id climbs out of the file route answers 404, not a PocketBase record', async ({ request }) => {
    // Without the record id check, this reads the Fixture Profile's own record as the superuser.
    const recordId = served.profile.avatarUrl.split('/')[4];
    const res = await request.get(`/api/files/profiles/..%2F..%2Fcollections%2Fprofiles%2Frecords/${recordId}`);
    expect(res.status()).toBe(404);
    expect((await res.text()).includes('v1Key')).toBe(false);
  });
});

test.describe('Reveal and /r', () => {
  const noCors = (headers: Record<string, string>) => !Object.keys(headers).some((h) => h.startsWith('access-control-'));
  const reveal = (request: import('@playwright/test').APIRequestContext, id: string, trackingId?: string) =>
    request.get(REVEAL_PATH, { params: { id, user: 'fixture', ...(trackingId === undefined ? {} : { trackingId }) } });

  for (const trackingId of [undefined, '4242', 'junk']) {
    test(`Reveal for the Adult Link with ${trackingId === undefined ? 'no Tracking Code' : `trackingId=${trackingId}`} answers what v1's handler answers`, async ({ request }) => {
      const link = adult();
      const res = await reveal(request, link.id, trackingId);
      expect(res.status()).toBe(200);
      expect(res.headers()['cache-control']).toBe('no-store');
      expect(noCors(res.headers())).toBe(true);
      const oracle = await v1Reveal(fileCard(link).id, trackingId);
      expect(oracle.statusCode).toBe(200);
      expect((await res.json()).realUrl === oracle.realUrl).toBe(true);
    });
  }

  test('Reveal answers for a non-Adult Link too: the Deeplink Link gets its Destination', async ({ request }) => {
    const link = deeplink();
    const res = await reveal(request, link.id);
    expect(res.status()).toBe(200);
    expect(noCors(res.headers())).toBe(true);
    expect((await res.json()).realUrl === destinationOf(link)).toBe(true);
  });

  test('Reveal for an unknown Link Id, or the Fixture file\'s v1 id, answers 404 with no-store and no CORS header', async ({ request }) => {
    for (const id of ['zzzzzzzzzzzz', fileCard(adult()).id]) {
      const res = await reveal(request, id);
      expect(res.status()).toBe(404);
      expect(res.headers()['cache-control']).toBe('no-store');
      expect(noCors(res.headers())).toBe(true);
      expect(await res.json()).toEqual({ error: 'Link not found' });
    }
  });

  for (const pick of ['Direct', 'Adult'] as const) {
    test(`/r/{${pick} Link Id} answers 302 to its Destination with no-store`, async ({ request }) => {
      const link = pick === 'Direct' ? direct() : adult();
      const res = await request.get(`/r/${link.id}`, { maxRedirects: 0 });
      expect(res.status()).toBe(302);
      expect(res.headers()['cache-control']).toBe('no-store');
      expect(res.headers()['location'] === destinationOf(link)).toBe(true); // /r appends no Tracking Code
    });
  }

  test('/r for an unknown Link Id answers 404 with no-store', async ({ request }) => {
    const res = await request.get('/r/zzzzzzzzzzzz', { maxRedirects: 0 });
    expect(res.status()).toBe(404);
    expect(res.headers()['cache-control']).toBe('no-store');
  });
});

test.describe('Other paths', () => {
  test('/netlify/functions/secrets.json answers 404 with the landing page as its body', async ({ request }) => {
    const res = await request.get('/netlify/functions/secrets.json');
    expect(res.status()).toBe(404);
    expect((await res.body()).equals(pageCopy('landing.html'))).toBe(true);
  });

  for (const file of ['landing.html', 'style.css', 'script.js']) {
    test(`/${file} comes back byte-identical to the Page Copy`, async ({ request }) => {
      const res = await request.get(`/${file}`);
      expect(res.status()).toBe(200);
      expect((await res.body()).equals(pageCopy(file))).toBe(true);
    });
  }

  // Ticket 01's not-served paths (its stand-in-only spec is deleted) answer the index page on v2 as well.
  const NOT_SERVED = [
    '/linkme_clone3/netlify/functions/secrets.json',
    '/..%2f..%2flinkme_clone3/netlify/functions/secrets.json',
    '/README.md',
    '/images/face.webp', // a Creator photo: v1 Snapshot only
  ];
  for (const path of ['/no/such/path', '/secrets.json', '/fixture', ...NOT_SERVED]) {
    test(`${path} gives the index page with 200`, async ({ request }) => {
      const res = await request.get(path);
      expect(res.status()).toBe(200);
      expect((await res.body()).equals(pageCopy('index.html'))).toBe(true);
    });
  }
});

test('no Test Secrets value is in any Profile JSON, page or secrets path', async ({ request }) => {
  const bodies = await Promise.all(
    [PROFILE_JSON, '/fixture', '/netlify/functions/secrets.json', '/secrets.json'].map(async (p) => (await request.get(p)).text()),
  );
  expect(bodies.map((b) => Object.values(TEST_SECRETS).some((d) => b.includes(d)))).toEqual([false, false, false, false]);
});

// Is the stack under test the local test stack that tests/stack.sh starts? The same predicate, by the same name, in
// 02-v1-import and 02-profile-parity.
const onLocalStack = () => !process.env.PLAYWRIGHT_BASE_URL || new URL(process.env.PLAYWRIGHT_BASE_URL).origin === 'http://localhost:4173';

// Runs after this file's Clicks: nothing the stack's running containers printed holds a Test Secrets value. The seed runs
// through `docker compose run --rm`, whose output never reaches `docker compose logs`; the seed's lines are covered by
// 02-v1-import's stackcheck run, which checks the printed lines of the same import on the same Fixture site.
test('nothing the test stack has printed holds a Test Secrets value', () => {
  test.skip(!onLocalStack(), 'the stack under test is not the local test stack');
  const logs = spawnSync('docker', ['compose', '--env-file', 'tests/e2e.env', 'logs', '--no-color'], { cwd: ROOT, encoding: 'utf8' });
  expect(logs.status).toBe(0);
  expect(`${logs.stdout}${logs.stderr}`.length).toBeGreaterThan(0);
  expect(Object.values(TEST_SECRETS).some((d) => `${logs.stdout}${logs.stderr}`.includes(d))).toBe(false);
});
