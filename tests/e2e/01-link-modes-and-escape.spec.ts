import { test, expect, devices, type Page, type Response } from '@playwright/test';

// Phase 1: every Link travels by its own Mode (docs/spec/phase-01-link-modes-and-escape.md, Testing Decisions).
// Link Ids, Modes and the Username come from the Fixture Profile the stand-in serves, never from a literal.
// Destinations are taken from the fixture's urls or from Reveal's own answer; no Test Secret is read here.

type Mode = 'direct' | 'escape_ig' | 'deeplink';
type Link = { id: string; title: string; url?: string; isAdult?: boolean; tracking?: boolean; mode?: string };
type ProfileJson = { profile: { username: string; displayName: string; mode?: string }; links: Link[] };

const PROFILE_JSON = '/api/profiles/fixture.json'; // where the stand-in serves the Fixture Profile
const MODES: Mode[] = ['direct', 'escape_ig', 'deeplink'];
const REVEAL_PATH = '/.netlify/functions/reveal';
const FENCE_HEADER = 'x-network-fence';
const TC = '4242'; // a numeric Tracking Code in the path

// Fixture read: fails fast, naming what is missing, if no Link has one of the three Modes or no Link is Adult.
let served: ProfileJson;
let username: string;
let byMode: Record<Mode, Link>;
let adult: Link;

test.beforeAll(async ({ playwright }) => {
  const api = await playwright.request.newContext({ baseURL: test.info().project.use.baseURL });
  const res = await api.get(PROFILE_JSON);
  if (!res.ok()) throw new Error(`Fixture Profile not served at ${PROFILE_JSON} (status ${res.status()})`);
  served = await res.json();
  await api.dispose();

  username = served.profile?.username;
  if (!username) throw new Error('Fixture Profile has no profile.username');
  const missing: string[] = [];
  byMode = {} as Record<Mode, Link>;
  for (const mode of MODES) {
    const link = served.links.find((l) => !l.isAdult && l.mode === mode);
    if (link) byMode[mode] = link;
    else missing.push(`a non-Adult Link with mode "${mode}"`);
  }
  const adultLink = served.links.find((l) => l.isAdult);
  if (adultLink) adult = adultLink;
  else missing.push('an Adult Link');
  if (missing.length) throw new Error(`Fixture Profile is missing: ${missing.join(', ')}`);
});

// Network fence: localhost passes through; every other host gets an empty page, so Destinations land
// where toHaveURL can assert them and nothing leaves the machine.
// Reveal answers pass through unchanged; each body is kept here because the onward navigation discards it.
const revealAnswers = new Map<string, string>();
test.beforeEach(async ({ page }) => {
  revealAnswers.clear();
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.hostname !== 'localhost') {
      return route.fulfill({ status: 200, contentType: 'text/html', headers: { [FENCE_HEADER]: '1' }, body: '' });
    }
    if (url.pathname !== REVEAL_PATH) return route.continue();
    const response = await route.fetch();
    const body = await response.text();
    revealAnswers.set(url.href, body);
    await route.fulfill({ response, body });
  });
});

// Profile variants: the served Profile JSON, changed in flight.
async function serveVariant(page: Page, edit: (json: ProfileJson) => void) {
  await page.route(`**${PROFILE_JSON}`, async (route) => {
    const response = await route.fetch();
    const json: ProfileJson = await response.json();
    edit(json);
    await route.fulfill({ response, json });
  });
}

const linkIn = (json: ProfileJson, id: string) => json.links.find((l) => l.id === id)!;

// Reveal watch: every Reveal request the page makes, and the next Reveal answer.
function watchReveals(page: Page) {
  const requests: URL[] = [];
  page.on('request', (req) => {
    const url = new URL(req.url());
    if (url.pathname === REVEAL_PATH) requests.push(url);
  });
  return requests;
}
const nextReveal = (page: Page) => page.waitForResponse((res) => new URL(res.url()).pathname === REVEAL_PATH);
async function realUrlOf(reveal: Response): Promise<string> {
  expect(reveal.status()).toBe(200);
  const { realUrl } = JSON.parse(revealAnswers.get(reveal.url()) ?? '{}');
  expect(typeof realUrl).toBe('string');
  return realUrl;
}

async function openProfile(page: Page, path = `/${username}`) {
  await page.goto(path);
  await expect(page.locator('#displayName')).toHaveText(served.profile.displayName);
}
const card = (page: Page, link: Link) => page.locator('.link-card', { hasText: link.title });

test.describe('System Browser (desktop Chrome)', () => {
  test.use({ userAgent: devices['Desktop Chrome'].userAgent });

  test('the Deeplink Link makes a Reveal request even though it carries a url, then lands on the answer', async ({ page }) => {
    const deeplink = byMode.deeplink;
    // The url is set apart from the Destination, so landing on Reveal's answer proves the url was not followed.
    await serveVariant(page, (json) => { linkIn(json, deeplink.id).url = 'https://example.net/not-the-destination'; });
    const reveals = watchReveals(page);
    await openProfile(page);

    const reveal = nextReveal(page);
    await card(page, deeplink).click();
    const destination = await realUrlOf(await reveal);
    await expect(page).toHaveURL(destination);
    expect(reveals).toHaveLength(1);
    expect(reveals[0].searchParams.get('id')).toBe(deeplink.id);
    expect(reveals[0].searchParams.get('user')).toBe(username);
  });

  for (const mode of ['direct', 'escape_ig'] as const) {
    test(`a tap on the ${mode} Link lands on its url and makes no Reveal request`, async ({ page }) => {
      const link = byMode[mode];
      const reveals = watchReveals(page);
      await openProfile(page);
      await card(page, link).click();
      await expect(page).toHaveURL(link.url!);
      expect(reveals).toHaveLength(0);
    });

    for (const [variant, edit] of [
      ['absent', (l: Link) => { delete l.url; }],
      ['empty', (l: Link) => { l.url = ''; }],
    ] as const) {
      test(`with the ${mode} Link's url ${variant}, a tap reveals and lands on exactly what Reveal answered`, async ({ page }) => {
        const link = byMode[mode];
        await serveVariant(page, (json) => edit(linkIn(json, link.id)));
        const reveals = watchReveals(page);
        await openProfile(page);

        const reveal = nextReveal(page);
        await card(page, link).click();
        const destination = await realUrlOf(await reveal);
        await expect(page).toHaveURL(destination);
        expect(reveals).toHaveLength(1);
        expect(reveals[0].searchParams.get('id')).toBe(link.id);
        expect(reveals[0].searchParams.get('user')).toBe(username);
      });
    }
  }

  test('a Link with tracking on and no url reveals with the Tracking Code from the path', async ({ page }) => {
    const link = byMode.direct;
    await serveVariant(page, (json) => Object.assign(linkIn(json, link.id), { url: '', tracking: true }));
    const reveals = watchReveals(page);
    await openProfile(page, `/${username}/${TC}`);

    const reveal = nextReveal(page);
    await card(page, link).click();
    const destination = await realUrlOf(await reveal);
    await expect(page).toHaveURL(destination);
    expect(reveals.map((url) => url.searchParams.get('trackingId'))).toEqual([TC]);
    expect(destination.endsWith(`/c${TC}`)).toBe(true); // Reveal appends /c{code}
  });

  for (const mode of MODES) {
    test(`a Profile default of ${mode} shows no Escape Overlay`, async ({ page }) => {
      await serveVariant(page, (json) => { json.profile.mode = mode; });
      await openProfile(page);
      await expect(page.locator('#igOverlay')).toBeHidden();
    });
  }

  test('a Link with its mode removed follows a deeplink default and reveals', async ({ page }) => {
    const link = byMode.direct;
    await serveVariant(page, (json) => { json.profile.mode = 'deeplink'; delete linkIn(json, link.id).mode; });
    const reveals = watchReveals(page);
    await openProfile(page);
    const reveal = nextReveal(page);
    await card(page, link).click();
    await expect(page).toHaveURL(await realUrlOf(await reveal));
    expect(reveals).toHaveLength(1);
  });

  test('a Link with an unrecognised mode follows a deeplink default and reveals', async ({ page }) => {
    const link = byMode.direct;
    await serveVariant(page, (json) => { json.profile.mode = 'deeplink'; linkIn(json, link.id).mode = 'sideways'; });
    const reveals = watchReveals(page);
    await openProfile(page);
    const reveal = nextReveal(page);
    await card(page, link).click();
    await expect(page).toHaveURL(await realUrlOf(await reveal));
    expect(reveals).toHaveLength(1);
  });

  test('with every mode stripped, the Deeplink Link falls back to Escape Mode and lands on its url with no Reveal', async ({ page }) => {
    const link = byMode.deeplink;
    await serveVariant(page, (json) => {
      delete json.profile.mode;
      json.links.forEach((l) => delete l.mode);
    });
    const reveals = watchReveals(page);
    await openProfile(page);
    await card(page, link).click();
    await expect(page).toHaveURL(link.url!);
    expect(reveals).toHaveLength(0);
  });

  for (const mode of MODES) {
    test(`the Adult Link in ${mode} Mode shows the Age Gate, then Continue (18+) reveals and lands on the answer`, async ({ page }) => {
      await serveVariant(page, (json) => Object.assign(linkIn(json, adult.id), { mode, tracking: true }));
      const reveals = watchReveals(page);
      await openProfile(page, `/${username}/${TC}`);

      await card(page, adult).click();
      await expect(page.getByRole('heading', { name: 'Mature Content Disclaimer' })).toBeVisible();
      expect(reveals).toHaveLength(0);

      const reveal = nextReveal(page);
      await page.getByRole('button', { name: 'Continue (18+)' }).click();
      const destination = await realUrlOf(await reveal);
      await expect(page).toHaveURL(destination);
      expect(reveals).toHaveLength(1);
      expect(reveals[0].searchParams.get('id')).toBe(adult.id);
      expect(reveals[0].searchParams.get('user')).toBe(username);
      expect(reveals[0].searchParams.get('trackingId')).toBe(TC);
    });
  }

  test('/{username}/{code} is cleaned to /{username}', async ({ page }) => {
    await openProfile(page, `/${username}/${TC}`);
    await expect(page).toHaveURL(`/${username}`);
  });

  test('the network fence answers every host other than localhost', async ({ page }) => {
    const offHost: Response[] = [];
    page.on('response', (res) => { if (new URL(res.url()).hostname !== 'localhost') offHost.push(res); });
    await openProfile(page);
    await card(page, byMode.direct).click();
    await expect(page).toHaveURL(byMode.direct.url!);
    expect(offHost.length).toBeGreaterThan(1); // the stylesheet CDN, and the Destination itself
    expect(offHost.filter((res) => res.headers()[FENCE_HEADER] !== '1').map((res) => res.url())).toEqual([]);
  });
});
