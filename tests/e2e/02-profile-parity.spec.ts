import { test, expect, devices, type APIRequestContext, type Page, type Request } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import { appendFileSync, existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { withoutBootstrap } from './domains-helpers';

// Phase 2 parity (docs/spec/phase-02-vps-foundation.md, Testing Decisions, 02-profile-parity): the Fixture Profile half, and
// the v1 Snapshot half below (ticket 17: pages, Profile JSON, paths, leaks; ticket 18: /r, Reveal, journeys, old ids). Every id is read from the served Profile JSON. A Link's Test Secrets
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

// v1's Reveal handler, loaded in this process from a v1-shaped site's netlify/functions/ (the Fixture site's verbatim copy, or
// the v1 Snapshot's own); it reads the secrets file beside it, and its Geo Rule lookup reads that site's Profile files. Netlify
// hands it lower-cased request headers. Its console lines (Geo lookups) are kept out of the run's output.
type V1Answer = { statusCode: number; realUrl?: string };
async function runV1Reveal(functionsDir: string, query: Record<string, string>, headers: Record<string, string> = {}): Promise<V1Answer> {
  const { handler } = require(join(functionsDir, 'reveal.js'));
  const { log, error } = console;
  console.log = console.error = () => {};
  try {
    const res = await handler({ queryStringParameters: query, headers }, {});
    return { statusCode: res.statusCode, realUrl: JSON.parse(res.body).realUrl };
  } finally {
    console.log = log;
    console.error = error;
  }
}
const queryWith = (query: Record<string, string>, trackingId?: string | null) =>
  trackingId === undefined || trackingId === null ? query : { ...query, trackingId };
const v1Reveal = (v1Id: string, trackingId?: string) =>
  runV1Reveal(join(FIXTURES, 'netlify', 'functions'), queryWith({ id: v1Id, user: 'fixture' }, trackingId));

// The paced helper (spec, Testing Decisions, Reveal pacing): every Reveal and `/r` call this spec makes takes a slot here first,
// whether the request fixture sends it (clickCall) or a page does (clickSlot, taken just before the tap or load that sends it).
// Against a remote host (PLAYWRIGHT_BASE_URL) slots are 1.25 s apart, so no 60 s window holds more than 49 calls, and the run
// is one worker (playwright.config.ts); locally they are unpaced. A 429 fails the call, locally as remotely. With
// PARITY_PACE_LOG naming a file, each slot's time (ms) is appended to it, to measure the rate.
// ASSUMPTION: the slot clock lives in the worker's memory, so a worker restarted after a failure starts a fresh clock (rung 5).
// Overturned if a VPS run meets 429s after a failure; the clock then moves to a file the restarted worker reads.
const REMOTE = !!process.env.PLAYWRIGHT_BASE_URL;
const PACE_GAP_MS = REMOTE ? 1250 : 0;
let lastSlot = 0;
async function clickSlot() {
  const wait = lastSlot + PACE_GAP_MS - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastSlot = Date.now();
  if (process.env.PARITY_PACE_LOG) appendFileSync(process.env.PARITY_PACE_LOG, `${lastSlot}\n`);
}
async function clickCall(request: APIRequestContext, path: string, options: { params?: Record<string, string>; headers?: Record<string, string> } = {}) {
  await clickSlot();
  const res = await request.get(path, { ...options, maxRedirects: 0 });
  expect(res.status(), 'rate limited').not.toBe(429);
  return res;
}
const reveal = (request: APIRequestContext, query: Record<string, string>, headers?: Record<string, string>) =>
  clickCall(request, REVEAL_PATH, { params: query, headers });

let served: Served | undefined;
let origin: string;
const linkBy = (pick: (l: ServedLink) => boolean) => served!.links.find(pick)!;
const onlyFixture = () => test.beforeEach(() => test.skip(!served, `${PROFILE_JSON} is not served here: a VPS run`));
const direct = () => linkBy((l) => !l.isAdult && l.mode === 'direct');
const deeplink = () => linkBy((l) => !l.isAdult && l.mode === 'deeplink');
const adult = () => linkBy((l) => l.isAdult);

test.beforeAll(async ({ playwright }) => {
  const baseURL = test.info().project.use.baseURL!;
  origin = new URL(baseURL).origin;
  const api = await playwright.request.newContext({ baseURL });
  const res = await api.get(PROFILE_JSON);
  // A VPS run (PLAYWRIGHT_BASE_URL) serves the v1 Snapshot only: the Fixture Profile answers 404 there, and the three
  // Fixture-only blocks below skip (onlyFixture). The test stack must serve it.
  if (res.status() === 404 && process.env.PLAYWRIGHT_BASE_URL) { await api.dispose(); return; }
  if (!res.ok()) throw new Error(`Fixture Profile not served at ${PROFILE_JSON} (status ${res.status()})`);
  served = await res.json();
  await api.dispose();
});

test.describe('Fixture Profile journeys (desktop Chrome)', () => {
  onlyFixture();
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
    await expect(page.locator('.link-card .link-title')).toHaveCount(served!.links.length);
    const hop = hopFrom(page, link.id);
    await clickSlot();
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
    await expect(page.locator('.link-card .link-title')).toHaveCount(served!.links.length);
    const reveal = page.waitForRequest((req) => new URL(req.url()).pathname === REVEAL_PATH);
    const landed = page.waitForRequest((req) => req.url() === destination);
    await clickSlot();
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
    await clickSlot();
    await page.goto(`/fixture?link=${link.id}`);
    const request = await hop;
    expect(request.url() === destinationOf(link)).toBe(true);
    expect(paths.filter((p) => p === REVEAL_PATH)).toEqual([]);
  });
});

test.describe('Profile JSON', () => {
  onlyFixture();
  test('carries fresh Link Ids, the url rule, effective Modes and nothing private', async ({ request }) => {
    const res = await request.get(PROFILE_JSON);
    expect(res.status()).toBe(200);
    expect(res.headers()['cache-control']).toBe(MUST_REVALIDATE);
    const text = await res.text();
    const json: Served = JSON.parse(text);
    // `id` is the Profile's record id, added by Phase 4 as its per-Profile Tracking Code key (Phase 2 spec, Contracts).
    expect(Object.keys(json.profile).sort()).toEqual(['avatarUrl', 'bio', 'displayName', 'id', 'mode', 'username', 'verified']);
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
    expect((await res.json()).links.map((l: ServedLink) => l.id)).toEqual(served!.links.map((l) => l.id));
  });

  test('an unknown Username answers 404 with the contract\'s body', async ({ request }) => {
    const res = await request.get('/api/profiles/nosuchprofile.json');
    expect(res.status()).toBe(404);
    expect(await res.json()).toEqual({ error: 'Profile not found' });
  });

  test('every image URL returns the Fixture site\'s bytes with the immutable cache header', async ({ request }) => {
    const images: [string, string | undefined][] = [[served!.profile.avatarUrl, fixture.profile.avatarUrl]];
    for (const link of served!.links) {
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
    const res = await request.get(served!.profile.avatarUrl.replace(/\/[^/]+$/, '/not_the_current_file.webp'));
    expect(res.status()).toBe(404);
  });

  test('a file path whose record id climbs out of the file route answers 404, not a PocketBase record', async ({ request }) => {
    // Without the record id check, this reads the Fixture Profile's own record as the superuser.
    const recordId = served!.profile.avatarUrl.split('/')[4];
    const res = await request.get(`/api/files/profiles/..%2F..%2Fcollections%2Fprofiles%2Frecords/${recordId}`);
    expect(res.status()).toBe(404);
    expect((await res.text()).includes('v1Key')).toBe(false);
  });
});

test.describe('Reveal and /r', () => {
  onlyFixture();
  const noCors = (headers: Record<string, string>) => !Object.keys(headers).some((h) => h.startsWith('access-control-'));

  for (const trackingId of [undefined, '4242', 'junk']) {
    test(`Reveal for the Adult Link with ${trackingId === undefined ? 'no Tracking Code' : `trackingId=${trackingId}`} answers what v1's handler answers`, async ({ request }) => {
      const link = adult();
      const res = await reveal(request, queryWith({ id: link.id, user: 'fixture' }, trackingId));
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
    const res = await reveal(request, { id: link.id, user: 'fixture' });
    expect(res.status()).toBe(200);
    expect(noCors(res.headers())).toBe(true);
    expect((await res.json()).realUrl === destinationOf(link)).toBe(true);
  });

  test('Reveal for an unknown Link Id, or the Fixture file\'s v1 id, answers 404 with no-store and no CORS header', async ({ request }) => {
    for (const id of ['zzzzzzzzzzzz', fileCard(adult()).id]) {
      const res = await reveal(request, { id, user: 'fixture' });
      expect(res.status()).toBe(404);
      expect(res.headers()['cache-control']).toBe('no-store');
      expect(noCors(res.headers())).toBe(true);
      expect(await res.json()).toEqual({ error: 'Link not found' });
    }
  });

  for (const pick of ['Direct', 'Adult'] as const) {
    test(`/r/{${pick} Link Id} answers 302 to its Destination with no-store`, async ({ request }) => {
      const link = pick === 'Direct' ? direct() : adult();
      const res = await clickCall(request, `/r/${link.id}`);
      expect(res.status()).toBe(302);
      expect(res.headers()['cache-control']).toBe('no-store');
      expect(res.headers()['location'] === destinationOf(link)).toBe(true); // /r appends no Tracking Code
    });
  }

  test('/r for an unknown Link Id answers 404 with no-store', async ({ request }) => {
    const res = await clickCall(request, '/r/zzzzzzzzzzzz');
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
  test('an unknown Username lands on the landing page', async ({ page }) => {
    await page.goto('/nosuchcreator404');
    await expect(page).toHaveURL(`${origin}/landing.html`);
  });

  // From ticket 39 on the index page carries the Profile page bootstrap block (Phase 5), which 05-domains checks; the rest of
  // the answer is still the Page Copy's index.html byte for byte.
  for (const path of ['/no/such/path', '/secrets.json', '/fixture', ...NOT_SERVED]) {
    test(`${path} gives the index page with 200`, async ({ request }) => {
      const res = await request.get(path);
      expect(res.status()).toBe(200);
      expect(withoutBootstrap(await res.text())).toBe(pageCopy('index.html').toString('utf8'));
    });
  }
});

test('no Test Secrets value is in any Profile JSON, page or secrets path', async ({ request }) => {
  const bodies = await Promise.all(
    [PROFILE_JSON, '/fixture', '/netlify/functions/secrets.json', '/secrets.json'].map(async (p) => (await request.get(p)).text()),
  );
  expect(bodies.map((b) => Object.values(TEST_SECRETS).some((d) => b.includes(d)))).toEqual([false, false, false, false]);
});

// ---- The v1 Snapshot half ----
// The oracle is the v1 Snapshot itself, read here at test time. V1_SNAPSHOT names it (default linkme_clone3/, beside this
// repo's root); set empty, or naming no directory, the Snapshot is absent and every v1 case skips. tests/stack.sh reads the
// same variable, so `V1_SNAPSHOT= ./check.sh` runs the fresh-clone path without moving linkme_clone3/.
// Destinations (secrets values and absolute file urls) are only ever compared as booleans; failure messages name a Username
// and card position. Nothing here prints a file url, a secrets value or a v1 Link Id.
const V1_SNAPSHOT = process.env.V1_SNAPSHOT ?? 'linkme_clone3';
const SNAPSHOT = V1_SNAPSHOT ? resolve(ROOT, V1_SNAPSHOT) : '';
// A directory, as tests/stack.sh's `[ -d ]` asks; the same guard in 02-v1-import.
const isDirectory = (path: string) => {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
};
const SNAPSHOT_PRESENT = SNAPSHOT !== '' && isDirectory(SNAPSHOT);
const SCREENSHOT = join(ROOT, '.scratch', 'goal_ai', 'shots', '02-vps-foundation.png');

type V1Link = {
  id: string; title: string; url?: string; isAdult?: boolean; tracking?: boolean; geo?: unknown;
  icon?: string | null; backgroundImage?: string | null; default_tracknumber?: string | null;
};
type V1File = { username: string; profile: { displayName?: string; bio?: string; avatarUrl?: string | null; verified?: boolean }; links: V1Link[] };

// Every lower-case Profile file (a capitalised one is a case twin, covered by the Paths cases), split into the files that
// parse as they are and the ones that need the import's trailing-comma repair (weiwei, left to 02-v1-import).
function readSnapshot() {
  const asIs: V1File[] = [];
  const repaired: V1File[] = [];
  if (!SNAPSHOT_PRESENT) return { asIs, repaired, secrets: {} as Record<string, string> };
  const dir = join(SNAPSHOT, 'api', 'profiles');
  const names = readdirSync(dir).filter((n) => n.endsWith('.json'));
  for (const name of names.sort()) {
    const username = name.slice(0, -'.json'.length).toLowerCase();
    if (name !== name.toLowerCase() && names.includes(name.toLowerCase())) continue;
    const text = readFileSync(join(dir, name), 'utf8');
    try {
      asIs.push({ ...JSON.parse(text), username }); // the file's name, never its `username` key
    } catch {
      repaired.push({ ...JSON.parse(text.replace(/,(\s*[}\]])/g, '$1')), username });
    }
  }
  const secrets: Record<string, string> = JSON.parse(readFileSync(join(SNAPSHOT, 'netlify', 'functions', 'secrets.json'), 'utf8'));
  return { asIs, repaired, secrets };
}
const v1 = readSnapshot();
const V1_FILES = [...v1.asIs, ...v1.repaired];
// Every absolute Destination the Snapshot holds: secrets values and file urls (the Acceptance scan's needles).
const V1_DESTINATIONS = [...new Set([...Object.values(v1.secrets), ...V1_FILES.flatMap((f) => f.links.map((l) => l.url))])]
  .filter((u): u is string => typeof u === 'string' && /^https?:\/\/\S/.test(u));
const holdsV1Destination = (text: string) => V1_DESTINATIONS.some((d) => text.includes(d));
// Every v1 Link Id and secrets key: none may come back as a v2 Link Id.
const V1_IDS = new Set([...V1_FILES.flatMap((f) => f.links.map((l) => l.id)), ...Object.keys(v1.secrets)]);
const v1Image = (path: string | null | undefined) => (typeof path === 'string' && path !== '' ? join(SNAPSHOT, path) : '');
const v1ImageExists = (path: string | null | undefined) => v1Image(path) !== '' && existsSync(v1Image(path));
// The display name a Visitor sees: the file's, except the import's n8n-expression repair (jaka7q), which shows the Username.
const shownName = (f: V1File) => {
  const name = typeof f.profile.displayName === 'string' ? f.profile.displayName : '';
  return /\$\(|\{\{/.test(name) ? f.username : name;
};
// document.title strips and collapses ASCII whitespace, in v1 as in v2.
const asTitle = (s: string) => s.replace(/[\t\n\f\r ]+/g, ' ').trim();

async function sameBytes(request: APIRequestContext, url: string | null, v1Path: string | null | undefined) {
  if (!url || !url.startsWith('/api/files/')) return false;
  const res = await request.get(url);
  return res.status() === 200 && (await res.body()).equals(readFileSync(v1Image(v1Path)));
}
// An image shows only where v1's file exists, with its bytes; otherwise it is empty, or has no element (null).
async function expectImage(request: APIRequestContext, servedUrl: string | null, v1Path: string | null | undefined, label: string) {
  if (v1ImageExists(v1Path)) expect(await sameBytes(request, servedUrl, v1Path), `${label} bytes`).toBe(true);
  else expect(servedUrl ?? '', label).toBe('');
}

test.describe('v1 Snapshot', () => {
  test.skip(!SNAPSHOT_PRESENT, 'v1 Snapshot absent');

  for (const file of v1.asIs) {
    const { username } = file;

    test.describe(`/${username}`, () => {
      test('the page shows the file\'s title, display name, bio, verified badge, avatar and cards', async ({ page, request }) => {
        await page.goto(`/${username}`);
        const cards = page.locator('.link-card');
        // Rendered, then checked for a Destination before any assertion that could print page text.
        await expect.poll(async () => (await page.locator('#displayName').textContent()) === shownName(file), 'display name').toBe(true);
        await expect(cards).toHaveCount(file.links.length);
        expect(holdsV1Destination(await page.content()), 'a Destination in the page HTML').toBe(false);
        expect(await page.title()).toBe(asTitle(shownName(file)));
        expect(await page.locator('#bio').textContent()).toBe(typeof file.profile.bio === 'string' ? file.profile.bio : '');
        const badgeShown = await page.locator('#verifiedBadge').evaluate((el) => getComputedStyle(el).display !== 'none');
        expect(badgeShown, 'verified badge').toBe(file.profile.verified === true);

        // The avatar shows only where v1's image file exists, with its bytes.
        await expectImage(request, await page.locator('#avatar').getAttribute('src'), file.profile.avatarUrl, 'avatar');

        for (const [i, link] of file.links.entries()) {
          const card = cards.nth(i);
          const at = `card ${i + 1}`;
          expect(await card.locator('.link-title').textContent(), `${at} title`).toBe(link.title);
          await expect(card.locator('.lock-icon-small'), `${at} lock icon`).toHaveCount(link.isAdult ? 1 : 0);
          const background = await card.evaluate((el) => (el as HTMLElement).style.backgroundImage.match(/^url\("?(.*?)"?\)$/)?.[1] ?? '');
          await expectImage(request, background, link.backgroundImage, `${at} background`);
          // v1 shows an icon only on a card with a background image (script.js renderLinks).
          const icon = card.locator('.link-icon');
          const backgroundShown = v1ImageExists(link.backgroundImage);
          await expect(icon, `${at} icon`).toHaveCount(backgroundShown && v1ImageExists(link.icon) ? 1 : 0);
          if (backgroundShown) await expectImage(request, (await icon.count()) ? await icon.getAttribute('src') : null, link.icon, `${at} icon`);
        }
      });

      test('the Profile JSON carries fresh Link Ids, the url rule, Escape Mode, the default Tracking Codes and nothing private', async ({ request }) => {
        const res = await request.get(`/api/profiles/${username}.json`);
        expect(res.status()).toBe(200);
        const text = await res.text();
        expect(holdsV1Destination(text), 'a Destination in the Profile JSON').toBe(false);
        const keys: string[] = [];
        const json: Served = JSON.parse(text, (key, value) => { keys.push(key); return value; });
        for (const key of ['destination', 'geo', 'owner', 'v1Key']) expect(keys.includes(key), key).toBe(false);
        expect(json.profile.username).toBe(username);
        expect(json.profile.mode).toBe('escape_ig');
        expect(json.links.length).toBe(file.links.length);
        for (const [i, link] of json.links.entries()) {
          const v1Link = file.links[i];
          const at = `card ${i + 1}`;
          expect(link.title, `${at} title`).toBe(v1Link.title);
          expect(link.isAdult, `${at} Adult`).toBe(v1Link.isAdult === true);
          expect(/^[a-z0-9]{12}$/.test(link.id), `${at} Link Id shape`).toBe(true);
          expect(V1_IDS.has(link.id), `${at} Link Id is a v1 id or secrets key`).toBe(false);
          expect(link.id.includes(username), `${at} Link Id holds the Username`).toBe(false);
          expect(link.url === (link.isAdult ? '' : `${origin}/r/${link.id}`), `${at} url`).toBe(true);
          expect(link.mode, `${at} mode`).toBe('escape_ig');
          const code = typeof v1Link.default_tracknumber === 'string' && v1Link.default_tracknumber !== '' ? v1Link.default_tracknumber : undefined;
          expect(link.default_tracknumber, `${at} default Tracking Code`).toBe(code);
          expect('default_tracknumber' in link, `${at} default Tracking Code present`).toBe(code !== undefined);
        }
      });

      // The page uses a card's default Tracking Code when the address carries none (script.js revealUrl): the Age Gate's
      // Reveal asks for it. v2's own Reveal answers; the navigation to the Destination after it is failed locally by the
      // network guard (playwright.config.ts). Each card gets its own page, closed before the next, so no navigation is left
      // in flight.
      const withCode = file.links.flatMap((l, i) => (l.isAdult && l.tracking && typeof l.default_tracknumber === 'string' && l.default_tracknumber ? [i] : []));
      if (withCode.length) {
        test('with no Tracking Code in the address, the Age Gate\'s Reveal carries the card\'s default Tracking Code', async ({ context, request }) => {
          const json: Served = await (await request.get(`/api/profiles/${username}.json`)).json();
          for (const i of withCode) {
            const at = `card ${i + 1}`;
            const page = await context.newPage();
            await page.goto(`/${username}`);
            await expect(page.locator('.link-card')).toHaveCount(file.links.length);
            const answer = page.waitForResponse((res) => new URL(res.url()).pathname === REVEAL_PATH);
            await page.locator('.link-card').nth(i).click();
            await clickSlot();
            await page.locator('#continueBtn').click();
            const res = await answer;
            expect(res.status(), `${at} Reveal`).toBe(200);
            const params = new URL(res.url()).searchParams;
            expect(params.get('id') === json.links[i].id, `${at} Reveal carries its Link Id`).toBe(true);
            expect(params.get('trackingId'), `${at} Reveal's Tracking Code`).toBe(file.links[i].default_tracknumber);
            await page.close();
          }
        });
      }
    });
  }

  test.describe('Paths', () => {
    for (const [twin, lower] of [['Jaka', 'jaka'], ['JakaJaka', 'jakajaka'], ['weiWEi', 'weiwei']]) {
      test(`/${twin} serves the same Profile JSON as /${lower}`, async ({ request }) => {
        const [a, b] = await Promise.all([twin, lower].map((u) => request.get(`/api/profiles/${u}.json`)));
        expect([a.status(), b.status()]).toEqual([200, 200]);
        expect((await a.text()) === (await b.text())).toBe(true);
      });
    }
  });

  test('no Destination is in any Profile JSON, the twins\' pages, /netlify/functions/secrets.json (404) or /secrets.json', async ({ page, request }) => {
    const usernames = [...V1_FILES.map((f) => f.username), 'Jaka', 'JakaJaka', 'weiWEi', ...(served ? ['fixture'] : [])]; // the Fixture only where it is served
    const leaking: string[] = [];
    for (const u of usernames) {
      const res = await request.get(`/api/profiles/${u}.json`);
      expect(res.status(), u).toBe(200);
      if (holdsV1Destination(await res.text())) leaking.push(`${u} Profile JSON`);
    }
    // Every as-is Profile's page is checked in its own case above; here, the repaired one and the case twins.
    for (const path of ['/weiwei', '/weiWEi', '/Jaka', '/JakaJaka']) {
      await page.goto(path);
      await expect(page.locator('.link-card').first()).toBeVisible();
      if (holdsV1Destination(await page.content())) leaking.push(`${path} page`);
    }
    const secrets = await request.get('/netlify/functions/secrets.json');
    expect(secrets.status()).toBe(404);
    if (holdsV1Destination(await secrets.text())) leaking.push('/netlify/functions/secrets.json');
    if (holdsV1Destination(await (await request.get('/secrets.json')).text())) leaking.push('/secrets.json');
    expect(leaking).toEqual([]);
  });

  // ---- Clicks (ticket 18) ----
  // Every Click on a v1 Link against v1's own Reveal handler, loaded from the Snapshot in this process (runV1Reveal), with the
  // same Username and the card's v1 id; v2 is asked with the card's served Link Id. Over the files that parse as they are.
  // Every Reveal and `/r` call takes a paced slot. Destinations are compared as booleans; messages name a Username and card.
  test.describe('Clicks', () => {
    const SNAPSHOT_FUNCTIONS = join(SNAPSHOT, 'netlify', 'functions');
    const snapshotReveal = (file: V1File, link: V1Link, trackingId?: string | null, headers?: Record<string, string>) =>
      runV1Reveal(SNAPSHOT_FUNCTIONS, queryWith({ id: link.id, user: file.username }, trackingId), headers);
    const hasEntry = (link: V1Link) => Object.hasOwn(v1.secrets, link.id);
    // A Geo Rule: a non-empty object under the card's `geo` (an empty one picks no Tracking Code in v1 or v2).
    const hasGeoRule = (link: V1Link) => typeof link.geo === 'object' && link.geo !== null && Object.keys(link.geo).length > 0;
    // The import's rule for a relative url (app/bin/import-v1, rootRelative): resolved against the site root.
    const rootRelative = (url: string) => {
      if (/^[a-z][a-z0-9+.-]*:/i.test(url) || url.startsWith('/')) return url;
      const u = new URL(url, 'http://v1.invalid/');
      return u.pathname + u.search + u.hash;
    };
    const cards = (pick: (l: V1Link) => boolean) =>
      v1.asIs.flatMap((file) => file.links.flatMap((link, i) => (pick(link) ? [{ file, link, i, at: `${file.username} card ${i + 1}` }] : [])));
    const nonAdult = cards((l) => l.isAdult !== true);
    const adultWithEntry = cards((l) => l.isAdult === true && hasEntry(l));
    const adultWithoutEntry = cards((l) => l.isAdult === true && !hasEntry(l));
    const withGeoRule = adultWithEntry.filter(({ link }) => hasGeoRule(link));

    // Each Profile's served Link Ids, by card position (the Profile JSON test above proves the order).
    const servedIds = new Map<string, string[]>();
    test.beforeAll(async ({ playwright }) => {
      const api = await playwright.request.newContext({ baseURL: test.info().project.use.baseURL! });
      for (const file of v1.asIs) {
        const res = await api.get(`/api/profiles/${file.username}.json`);
        if (!res.ok()) throw new Error(`/${file.username} Profile JSON not served (status ${res.status()})`);
        servedIds.set(file.username, (await res.json() as Served).links.map((l) => l.id));
      }
      await api.dispose();
    });
    const v2Id = (file: V1File, i: number) => servedIds.get(file.username)![i];

    for (const { file, link, i, at } of nonAdult) {
      test(`/r for ${at} (non-Adult) answers 302 to the card's v1 url`, async ({ request }) => {
        const res = await clickCall(request, `/r/${v2Id(file, i)}`);
        expect(res.status(), at).toBe(302);
        expect(res.headers()['cache-control'], at).toBe('no-store');
        expect(res.headers()['location'] === rootRelative(link.url!), `${at} Location is its v1 url`).toBe(true);
      });
    }

    // No location header is sent here: `geo` takes v1's US fallback on both sides.
    for (const { file, link, i, at } of adultWithEntry) {
      test(`Reveal for ${at} (Adult) with no code, digits, geo and junk answers what v1's handler answers`, async ({ request }) => {
        for (const trackingId of [undefined, '4242', 'geo', 'junk']) {
          const label = `${at} trackingId=${trackingId ?? '(none)'}`;
          const res = await reveal(request, queryWith({ id: v2Id(file, i), user: file.username }, trackingId));
          const oracle = await snapshotReveal(file, link, trackingId);
          expect(oracle.statusCode, `${label} v1`).toBe(200);
          expect(res.status(), label).toBe(200);
          expect(res.headers()['cache-control'], label).toBe('no-store');
          expect((await res.json()).realUrl === oracle.realUrl, `${label} realUrl matches v1's`).toBe(true);
        }
      });
    }

    // Location headers, v1's names (what Netlify sends) and Cloudflare's (plan §11's country source). v1's handler reads only
    // its own names, so a case that sends Cloudflare's is put to it as `v1`, the v1 headers the spec's Visitor location reads
    // them as; otherwise v1 is sent what v2 is.
    type Headers = Record<string, string>;
    type Location = { label: string; sent: Headers; v1?: Headers };
    type GuardedLocation = Location & { without: Headers };
    const FIXED_LOCATIONS: Location[] = [
      { label: 'x-country=US x-region=NJ', sent: { 'x-country': 'US', 'x-region': 'NJ' } },
      { label: 'x-country=US x-region=CA', sent: { 'x-country': 'US', 'x-region': 'CA' } },
      { label: 'x-country=US x-nf-subdivision-code=TX', sent: { 'x-country': 'US', 'x-nf-subdivision-code': 'TX' } },
      { label: 'x-country=US x-region=ZZ (no such state)', sent: { 'x-country': 'US', 'x-region': 'ZZ' } },
      { label: 'x-country=US and no region', sent: { 'x-country': 'US' } },
      { label: 'x-country=SI', sent: { 'x-country': 'SI' } },
      { label: 'x-region=NJ and no country (US fallback)', sent: { 'x-region': 'NJ' } },
    ];
    // The Cloudflare and precedence cases take their countries and US states from the Link's own Geo Rule keys, picked by v1's
    // answers (choosing inputs, not re-implementing the rule), so that the header under test changes v1's answer. `without` is
    // the same request to v1 with that header dropped, or the precedence swapped; the guard test below fails a case whose
    // `without` answer equals its own on every Geo Rule Link, so no case can pass while its header goes unread.
    async function derivedLocations(file: V1File, link: V1Link): Promise<GuardedLocation[]> {
      const geo = link.geo as Record<string, unknown>;
      const answer = async (headers: Headers) => (await snapshotReveal(file, link, 'geo', headers)).realUrl;
      const first = async (keys: string[], differs: (key: string) => Promise<boolean>) => {
        for (const key of keys) if (await differs(key)) return key;
        return keys[0] ?? 'ZZ'; // none differs: the guard test fails the cases built on it
      };
      const us = (headers: Headers) => ({ 'x-country': 'US', ...headers });
      const countries = Object.keys(geo).filter((k) => k !== 'US' && k !== 'default');
      const states = typeof geo.US === 'object' && geo.US !== null ? Object.keys(geo.US).filter((k) => k !== 'default') : [];
      const noRegion = await answer(us({}));
      const state = await first(states, async (s) => (await answer(us({ 'x-region': s }))) !== noRegion);
      const stateAnswer = await answer(us({ 'x-region': state }));
      // Another region with another answer: a state, else ZZ, which no rule has (in the v1 Snapshot every state of a rule
      // shares one code, so this is ZZ, answered with the US entry's `default`).
      const otherRegion = await first([...states, 'ZZ'], async (s) => (await answer(us({ 'x-region': s }))) !== stateAnswer);
      const fallback = await answer({});
      const country = await first(countries, async (c) => ![fallback, stateAnswer].includes(await answer({ 'x-country': c })));
      const countryAnswer = await answer({ 'x-country': country });
      const otherCountry = await first(countries, async (c) => (await answer({ 'x-country': c })) !== countryAnswer);
      const noEntry = ['JP', 'XX', 'ZZ'].find((c) => !Object.hasOwn(geo, c))!;
      return [
        { label: 'x-country={rule country} x-region={state}', sent: { 'x-country': country, 'x-region': state }, without: { 'x-region': state } },
        { label: 'x-country={no entry} x-region={state}', sent: { 'x-country': noEntry, 'x-region': state }, without: { 'x-region': state } },
        { label: 'x-nf-subdivision-code={state} over x-region={other region}', sent: us({ 'x-nf-subdivision-code': state, 'x-region': otherRegion }), without: us({ 'x-region': otherRegion }) },
        { label: 'cf-ipcountry={rule country}', sent: { 'cf-ipcountry': country }, v1: { 'x-country': country }, without: {} },
        { label: 'cf-ipcountry=US cf-region-code={state}', sent: { 'cf-ipcountry': 'US', 'cf-region-code': state }, v1: us({ 'x-region': state }), without: us({}) },
        { label: 'x-country={rule country} over cf-ipcountry={other rule country}', sent: { 'x-country': country, 'cf-ipcountry': otherCountry }, v1: { 'x-country': country }, without: { 'x-country': otherCountry } },
        { label: 'x-region={state} over cf-region-code={other region}', sent: us({ 'x-region': state, 'cf-region-code': otherRegion }), v1: us({ 'x-region': state }), without: us({ 'x-region': otherRegion }) },
      ];
    }
    for (const { file, link, i, at } of withGeoRule) {
      test(`Geo Rule: Reveal for ${at} with trackingId=geo answers what v1's handler answers for each location header pair`, async ({ request }) => {
        for (const { label, sent, v1: v1Headers } of [...FIXED_LOCATIONS, ...(await derivedLocations(file, link))]) {
          const res = await reveal(request, { id: v2Id(file, i), user: file.username, trackingId: 'geo' }, sent);
          const oracle = await snapshotReveal(file, link, 'geo', v1Headers ?? sent);
          expect(oracle.statusCode, `${at} ${label} v1`).toBe(200);
          expect(res.status(), `${at} ${label}`).toBe(200);
          expect((await res.json()).realUrl === oracle.realUrl, `${at} ${label} realUrl matches v1's`).toBe(true);
        }
      });
    }
    // Oracle only: no request reaches v2, so no location header is sent and the title carries no `Geo Rule`.
    test('every derived location case changes v1\'s answer on some Link once its header is dropped or its precedence swapped', async () => {
      const labels = new Set<string>();
      const biting = new Set<string>();
      for (const { file, link } of withGeoRule) {
        for (const { label, sent, v1: v1Headers, without } of await derivedLocations(file, link)) {
          labels.add(label);
          const own = await snapshotReveal(file, link, 'geo', v1Headers ?? sent);
          if (own.realUrl !== (await snapshotReveal(file, link, 'geo', without)).realUrl) biting.add(label);
        }
      }
      expect(labels.size, 'derived location cases').toBeGreaterThan(0);
      expect([...labels].filter((l) => !biting.has(l)), 'cases v1 answers the same without their header').toEqual([]);
    });

    for (const { file, link, i, at } of adultWithoutEntry) {
      test(`${at}, an Adult Link without a secrets entry, answers 404 from Reveal as v1's handler does, and from /r`, async ({ request }) => {
        expect((await snapshotReveal(file, link)).statusCode, `${at} v1`).toBe(404);
        const res = await reveal(request, { id: v2Id(file, i), user: file.username });
        expect(res.status(), at).toBe(404);
        expect((await res.json()).error === 'Link not found', `${at} Reveal's error`).toBe(true);
        expect((await clickCall(request, `/r/${v2Id(file, i)}`)).status(), `${at} /r`).toBe(404);
      });
    }

    test('every v1 Link Id and every secrets key answers 404 from Reveal and from /r', async ({ request }) => {
      test.setTimeout(30_000 + V1_IDS.size * 2 * PACE_GAP_MS);
      // Named by Username and card, or by the secrets key's position; never by the id itself.
      const owners = new Map<string, string>();
      for (const f of V1_FILES) f.links.forEach((l, i) => owners.has(l.id) || owners.set(l.id, `${f.username} card ${i + 1}'s v1 id`));
      const keys = Object.keys(v1.secrets);
      const failing: string[] = [];
      for (const id of V1_IDS) {
        const name = owners.get(id) ?? `secrets key ${keys.indexOf(id) + 1}`;
        if ((await reveal(request, { id })).status() !== 404) failing.push(`${name}: Reveal`);
        if ((await clickCall(request, `/r/${encodeURIComponent(id)}`)).status() !== 404) failing.push(`${name}: /r`);
      }
      expect(failing).toEqual([]);
    });

    test.describe('Journeys', () => {
      // Every host but the one under test is answered with an empty page (the Destination's host on a page navigation);
      // the hop after `/r`'s 302 is not routed by Playwright and is failed by the network guard (playwright.config.ts) when
      // it leaves the host. Either way it is observed as the browser's request.
      let host: string;
      test.beforeEach(async ({ page }) => {
        host = new URL(origin).host;
        await page.route((url) => url.host !== host, (route) => route.fulfill({ status: 200, contentType: 'text/html', body: '' }));
      });
      const offHostNavigation = (page: Page) =>
        page.waitForRequest((req) => req.isNavigationRequest() && new URL(req.url()).host !== host);
      const revealAnswer = (page: Page) => page.waitForResponse((res) => new URL(res.url()).pathname === REVEAL_PATH);

      for (const { file, link, i, at } of nonAdult) {
        test(`${at} (non-Adult) goes through /r/{Link Id} to its v1 url`, async ({ page }) => {
          const id = v2Id(file, i);
          await page.goto(`/${file.username}`);
          await expect(page.locator('.link-card')).toHaveCount(file.links.length);
          const hop = page.waitForRequest((req) => req.redirectedFrom()?.url() === `${origin}/r/${id}`);
          await clickSlot();
          await page.locator('.link-card').nth(i).click();
          const request = await hop;
          expect((await request.redirectedFrom()!.response())?.status(), `${at} /r`).toBe(302);
          expect(request.url() === new URL(rootRelative(link.url!), origin).href, `${at} lands on its v1 url`).toBe(true);
        });
      }

      const DIGITS = '7319';
      for (const { file, link, i, at } of adultWithEntry) {
        test(`/${file.username}/{digits}, then the Age Gate on card ${i + 1}, sends Reveal with those digits and lands where v1 sends that code`, async ({ page }) => {
          await page.goto(`/${file.username}/${DIGITS}`);
          await expect(page.locator('.link-card')).toHaveCount(file.links.length);
          await page.locator('.link-card').nth(i).click();
          const answer = revealAnswer(page);
          const landed = offHostNavigation(page);
          await clickSlot();
          await page.locator('#continueBtn').click();
          const res = await answer;
          expect(res.status(), `${at} Reveal`).toBe(200);
          const params = new URL(res.url()).searchParams;
          expect(params.get('id') === v2Id(file, i), `${at} Reveal carries its Link Id`).toBe(true);
          expect(params.get('trackingId'), `${at} Reveal's Tracking Code`).toBe(link.tracking ? DIGITS : null);
          const oracle = await snapshotReveal(file, link, params.get('trackingId'));
          expect((await landed).url() === new URL(oracle.realUrl!).href, `${at} lands where v1 sends that code`).toBe(true);
        });

        test(`/${file.username}?link={card ${i + 1}'s Link Id} (Adult) reveals on load and lands where v1 sends it`, async ({ page }) => {
          const id = v2Id(file, i);
          const answer = revealAnswer(page);
          const landed = offHostNavigation(page);
          await clickSlot();
          await page.goto(`/${file.username}?link=${id}`);
          const res = await answer;
          expect(res.status(), `${at} Reveal`).toBe(200);
          const params = new URL(res.url()).searchParams;
          expect(params.get('id') === id, `${at} Reveal carries its Link Id`).toBe(true);
          const oracle = await snapshotReveal(file, link, params.get('trackingId'));
          expect((await landed).url() === new URL(oracle.realUrl!).href, `${at} lands where v1 sends it`).toBe(true);
        });
      }
    });
  });
});

// Every run leaves a phone-sized shot of a v1 Profile page served by v2 for the human (ticket 17 ASSUMPTION): juliafilippo_,
// or the Fixture Profile when the v1 Snapshot is absent. Playwright empties its output folder first, so it is written anew.
test('a phone-sized screenshot of a Profile page served by v2 is saved', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(SNAPSHOT_PRESENT ? '/juliafilippo_' : '/fixture');
  await expect(page.locator('.link-card').first()).toBeVisible();
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: SCREENSHOT, fullPage: true });
  expect(statSync(SCREENSHOT).size).toBeGreaterThan(0);
});

// Is the stack under test the local test stack that tests/stack.sh starts? The same predicate, by the same name, in
// 02-v1-import and 02-profile-parity.
const onLocalStack = () => !process.env.PLAYWRIGHT_BASE_URL || new URL(process.env.PLAYWRIGHT_BASE_URL).origin === 'http://localhost:4173';

// Runs after this file's Clicks: nothing the stack's running containers printed holds a Test Secrets value or, with the v1
// Snapshot, a v1 Destination. The seed runs through `docker compose run --rm`, whose output never reaches `docker compose
// logs`; the seed's lines are covered by 02-v1-import's stackcheck run, which checks the printed lines of the same import on
// the same Fixture site.
test('nothing the test stack has printed holds a Test Secrets value or a v1 Destination', () => {
  test.skip(!onLocalStack(), 'the stack under test is not the local test stack');
  const logs = spawnSync('docker', ['compose', '--env-file', 'tests/e2e.env', 'logs', '--no-color'], { cwd: ROOT, encoding: 'utf8' });
  expect(logs.status).toBe(0);
  const printed = `${logs.stdout}${logs.stderr}`;
  expect(printed.length).toBeGreaterThan(0);
  expect(Object.values(TEST_SECRETS).some((d) => printed.includes(d))).toBe(false);
  expect(holdsV1Destination(printed), 'a v1 Destination in the stack\'s output').toBe(false);
});
