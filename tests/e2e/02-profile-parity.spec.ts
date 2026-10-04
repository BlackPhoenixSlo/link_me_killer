import { test, expect, devices, type APIRequestContext, type Page, type Request } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

// Phase 2 parity (docs/spec/phase-02-vps-foundation.md, Testing Decisions, 02-profile-parity): the Fixture Profile half, and
// the v1 Snapshot half below (ticket 17: pages, Profile JSON, paths, leaks; ticket 18 adds /r and Reveal). Every id is read from the served Profile JSON. A Link's Test Secrets
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
  test('an unknown Username lands on the landing page', async ({ page }) => {
    await page.goto('/nosuchcreator404');
    await expect(page).toHaveURL(`${origin}/landing.html`);
  });

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
  id: string; title: string; url?: string; isAdult?: boolean; tracking?: boolean;
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
            const reveal = page.waitForRequest((req) => new URL(req.url()).pathname === REVEAL_PATH);
            await page.locator('.link-card').nth(i).click();
            await page.locator('#continueBtn').click();
            const params = new URL((await reveal).url()).searchParams;
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
    const usernames = [...V1_FILES.map((f) => f.username), 'Jaka', 'JakaJaka', 'weiWEi', 'fixture'];
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

  // Ticket 18: `/r` (302 to each non-Adult card's v1 url), Reveal against v1's own handler (Geo Rule cases included), the
  // journeys and the old ids join this group, reading V1_FILES and v1.secrets above.
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
