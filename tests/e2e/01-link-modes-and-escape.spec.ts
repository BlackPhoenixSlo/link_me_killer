import { test, expect, devices, type Browser, type Page, type Response } from '@playwright/test';
import { join } from 'node:path';
import { escapeOverlay, intents, recordNavigations, UA, xSafari, type Navigation } from './helpers';

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
// The iOS Instagram Escape Overlay, opened by an Escape Mode tap, left for the human on every run (plan section 7, step 2).
const SCREENSHOT = join(__dirname, '..', '..', '.scratch', 'goal_ai', 'shots', '01-link-modes-and-escape.png');

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
async function fenceNetwork(page: Page) {
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
}
test.beforeEach(async ({ page }) => {
  revealAnswers.clear();
  await fenceNetwork(page);
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
// The url v2 serves for a Link that carries no Deeplink mode: its Click route on the host under test.
const rUrlOf = (link: Link) => `${new URL(test.info().project.use.baseURL!).origin}/r/${link.id}`;

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

// Navigation recorder (helpers.ts, recordNavigations), shared with 05-domains: every Navigation API navigate event.
// On v2 a Link's url is `/r/{Link Id}`, which redirects to the Destination, so "lands on its url" reads the address the
// page navigated to from this recorder, not the final address (ticket 16, second ASSUMPTION).

const closeButton = (page: Page) => escapeOverlay(page).getByRole('button', { name: 'Close' });

// Pop-outs, per platform, with the address forced to https as v1's performBounce forced it: the load-time one (v1's Android
// intent, no fallback) and a tap's (on Android the https address as fallback, for a phone without Chrome).
type Platform = 'ios' | 'android';
const strip = (url: string) => url.replace(/^https?:\/\//, '');
const onLoadPop = (platform: Platform, url: string) => (platform === 'ios'
  ? `x-safari-https://${strip(url)}`
  : `intent://${strip(url)}#Intent;scheme=https;package=com.android.chrome;end`);
const tapPop = (platform: Platform, url: string) => (platform === 'ios'
  ? `x-safari-https://${strip(url)}`
  : `intent://${strip(url)}#Intent;scheme=https;package=com.android.chrome;` +
    `S.browser_fallback_url=${encodeURIComponent(`https://${strip(url)}`)};end`);
const popOuts = (navigations: Navigation[]) => [...xSafari(navigations), ...intents(navigations)];

async function openProfile(page: Page, path = `/${username}`) {
  await page.goto(path);
  await expect(page.locator('#displayName')).toHaveText(served.profile.displayName);
}
const card = (page: Page, link: Link) => page.locator('.link-card', { hasText: link.title });

const directDefault = (json: ProfileJson) => { json.profile.mode = 'direct'; };

// From /{username}/{code} with a Direct default, a tap on the Link (the Escape Link unless given); the escape target as the spec spells it.
async function tapEscapeFromCode(page: Page, link: Link = byMode.escape_ig, edit: (json: ProfileJson) => void = directDefault) {
  await serveVariant(page, edit);
  const navigations = await recordNavigations(page);
  const reveals = watchReveals(page);
  await openProfile(page, `/${username}/${TC}`);
  const target = `https://${new URL(page.url()).host}/${username}/${TC}?link=${link.id}`;
  await card(page, link).click();
  return { navigations, reveals, target };
}

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
      const navigations = await recordNavigations(page);
      const reveals = watchReveals(page);
      await openProfile(page);
      await card(page, link).click();
      await expect.poll(() => navigations.at(-1)?.url).toBe(link.url);
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
    const url = rUrlOf(link); // the url v2 serves for a Link without a Deeplink mode (ticket 16, second ASSUMPTION)
    await serveVariant(page, (json) => {
      delete json.profile.mode;
      json.links.forEach((l) => delete l.mode);
      linkIn(json, link.id).url = url;
    });
    const navigations = await recordNavigations(page);
    const reveals = watchReveals(page);
    await openProfile(page);
    await card(page, link).click();
    await expect.poll(() => navigations.at(-1)?.url).toBe(url);
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

  test('/{username}/{code}?link={Adult Link Id}, with tracking on, reveals with that id and the code, with no Age Gate, and lands on the answer', async ({ page }) => {
    await serveVariant(page, (json) => { linkIn(json, adult.id).tracking = true; });
    const reveals = watchReveals(page);
    const reveal = nextReveal(page);
    await page.goto(`/${username}/${TC}?link=${adult.id}`);
    const destination = await realUrlOf(await reveal);
    await expect(page).toHaveURL(destination);
    expect(reveals).toHaveLength(1);
    expect(reveals[0].searchParams.get('id')).toBe(adult.id);
    expect(reveals[0].searchParams.get('user')).toBe(username);
    expect(reveals[0].searchParams.get('trackingId')).toBe(TC);
    expect(destination.endsWith(`/c${TC}`)).toBe(true); // Reveal appends /c{code}
  });

  test('/{username}/{code}?link={Escape Link Id} lands where a tap on that Link would: its url, with no Reveal', async ({ page }) => {
    const link = byMode.escape_ig;
    const navigations = await recordNavigations(page);
    const reveals = watchReveals(page);
    await page.goto(`/${username}/${TC}?link=${link.id}`);
    await expect.poll(() => navigations.at(-1)?.url).toBe(link.url);
    expect(reveals).toHaveLength(0);
  });

  test('/{username}?link={an id not on the Profile} loads the Profile, with no Reveal request and no navigation', async ({ page }) => {
    const notOnProfile = 'notOnThisProfile0';
    expect(served.links.map((l) => l.id)).not.toContain(notOnProfile);
    const navigations = await recordNavigations(page);
    const reveals = watchReveals(page);
    await openProfile(page, `/${username}?link=${notOnProfile}`);
    await page.waitForLoadState('networkidle');
    expect(reveals).toHaveLength(0);
    expect(navigations).toEqual([]);
    await expect(page).toHaveURL(`/${username}?link=${notOnProfile}`);
  });

  test('the network fence answers every host other than localhost', async ({ page }) => {
    const offHost: Response[] = [];
    page.on('response', (res) => { if (new URL(res.url()).hostname !== 'localhost') offHost.push(res); });
    const navigations = await recordNavigations(page);
    await openProfile(page);
    await card(page, byMode.direct).click();
    await expect.poll(() => navigations.at(-1)?.url).toBe(byMode.direct.url);
    // The stylesheet CDN and the verified badge's image host. On v2 the Destination is the hop after `/r`'s 302, which the
    // network guard in playwright.config.ts fails before any response, so it is not among these.
    expect(offHost.length).toBeGreaterThan(1);
    expect(offHost.filter((res) => res.headers()[FENCE_HEADER] !== '1').map((res) => res.url())).toEqual([]);
  });
});

// In-App Browsers (plan section 7): User-Agents per describe, from helpers.ts (UA), which 05-domains shares.

for (const [app, userAgent] of [
  ['Instagram', UA.androidInstagram],
  ['FBAN', UA.fban],
  ['TikTok', UA.tiktok],
] as const) {
  test.describe(`In-App Browser (${app})`, () => {
    test.use({ userAgent });

    test('with every mode stripped, the Escape Overlay shows on open at /{username}/{code}, with no Close', async ({ page }) => {
      await serveVariant(page, (json) => {
        delete json.profile.mode;
        json.links.forEach((l) => delete l.mode);
      });
      await openProfile(page, `/${username}/${TC}`);
      await expect(escapeOverlay(page)).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Open in System Browser' })).toBeVisible();
      await expect(page).toHaveURL(`/${username}/${TC}`);
      await expect(closeButton(page)).toHaveCount(0);
    });
  });
}

for (const [browser, userAgent] of [
  ['iOS Safari', UA.iosSafari],
  ['Android Chrome', UA.androidChrome],
] as const) {
  test.describe(`System Browser (${browser})`, () => {
    test.use({ userAgent });

    test('no Escape Overlay shows, and a tap on the Escape Link navigates plainly', async ({ page }) => {
      const link = byMode.escape_ig;
      const navigations = await recordNavigations(page);
      await openProfile(page);
      await expect(escapeOverlay(page)).toBeHidden();
      await card(page, link).click();
      await expect.poll(() => navigations.at(-1)?.url).toBe(link.url);
      expect(navigations.map(({ url }) => url).filter((url) => !url.startsWith('http'))).toEqual([]);
    });
  });
}

test.describe('In-App Browser (iOS Instagram)', () => {
  test.use({ userAgent: UA.iosInstagram });

  test('Direct default: no Escape Overlay on open, the address keeps its code, and the Direct Link navigates plainly', async ({ page }) => {
    const link = byMode.direct;
    await serveVariant(page, directDefault);
    const navigations = await recordNavigations(page);
    await openProfile(page, `/${username}/${TC}`);
    await expect(escapeOverlay(page)).toBeHidden();
    await expect(page).toHaveURL(`/${username}/${TC}`);

    await card(page, link).click();
    await expect.poll(() => navigations.at(-1)?.url).toBe(link.url);
    expect(xSafari(navigations)).toEqual([]);
  });

  test('a tap on the Deeplink Link makes a Reveal request, then pops out to the answer through x-safari-, as v1 did', async ({ page }) => {
    const link = byMode.deeplink;
    await serveVariant(page, directDefault);
    const navigations = await recordNavigations(page);
    const reveals = watchReveals(page);
    await openProfile(page);

    const reveal = nextReveal(page);
    await card(page, link).click();
    const destination = await realUrlOf(await reveal);
    expect(destination.startsWith('https://')).toBe(true);
    await expect.poll(() => xSafari(navigations)).toEqual([`x-safari-${destination}`]);
    expect(reveals.map((url) => url.searchParams.get('id'))).toEqual([link.id]);
  });

  test('the Adult Link set to Direct shows the Age Gate, then Continue (18+) reveals and navigates plainly', async ({ page }) => {
    await serveVariant(page, (json) => { directDefault(json); linkIn(json, adult.id).mode = 'direct'; });
    const navigations = await recordNavigations(page);
    const reveals = watchReveals(page);
    await openProfile(page);

    await card(page, adult).click();
    await expect(page.getByRole('heading', { name: 'Mature Content Disclaimer' })).toBeVisible();
    expect(reveals).toHaveLength(0);

    const reveal = nextReveal(page);
    await page.getByRole('button', { name: 'Continue (18+)' }).click();
    const destination = await realUrlOf(await reveal);
    await expect(page).toHaveURL(destination);
    expect(reveals.map((url) => url.searchParams.get('id'))).toEqual([adult.id]);
    expect(navigations.at(-1)?.url).toBe(destination);
    expect(xSafari(navigations)).toEqual([]);
  });

  for (const profileMode of ['escape_ig', 'sideways']) {
    test(`a default of ${profileMode} on a Profile that holds the Direct and Deeplink Links pops out and shows the Escape Overlay on open, with Close`, async ({ page }) => {
      const link = byMode.direct;
      await serveVariant(page, (json) => { json.profile.mode = profileMode; });
      const navigations = await recordNavigations(page);
      await openProfile(page);
      await expect(escapeOverlay(page)).toBeVisible();
      const onOpen = `x-safari-https://${new URL(page.url()).host}/${username}`; // the pop-out on open, v1's "at start"
      await expect.poll(() => xSafari(navigations)).toEqual([onOpen]);
      expect(await page.evaluate(() => getComputedStyle(document.body).overflow)).toBe('hidden'); // blocks scrolling

      await closeButton(page).click();
      await expect(escapeOverlay(page)).toBeHidden();
      expect(await page.evaluate(() => getComputedStyle(document.body).overflow)).not.toBe('hidden');

      await card(page, link).click();
      await expect.poll(() => navigations.at(-1)?.url).toBe(link.url);
      expect(xSafari(navigations)).toEqual([onOpen]);
    });
  }

  test('every Link set to Escape Mode with an escape_ig default shows the Escape Overlay on open, with no Close', async ({ page }) => {
    await serveVariant(page, (json) => {
      json.profile.mode = 'escape_ig';
      json.links.forEach((l) => { l.mode = 'escape_ig'; });
    });
    await openProfile(page);
    await expect(escapeOverlay(page)).toBeVisible();
    await expect(closeButton(page)).toHaveCount(0);
  });

  test('a default of deeplink pops out on open to the Profile, with no Escape Overlay', async ({ page }) => {
    await serveVariant(page, (json) => { json.profile.mode = 'deeplink'; });
    const navigations = await recordNavigations(page);
    await openProfile(page);
    await expect.poll(() => xSafari(navigations)).toEqual([`x-safari-https://${new URL(page.url()).host}/${username}`]);
    await expect(escapeOverlay(page)).toBeHidden();
  });

  for (const [variant, edit] of [
    ['an unrecognised mode', (l: Link) => { l.mode = 'sideways'; }],
    ['its mode removed', (l: Link) => { delete l.mode; }],
  ] as const) {
    test(`Direct default: the Deeplink Link with ${variant} navigates plainly to its url, with no Reveal and nothing x-safari- recorded`, async ({ page }) => {
      const link = byMode.deeplink;
      const url = rUrlOf(link); // the url v2 serves for a Link without a Deeplink mode (ticket 16, second ASSUMPTION)
      await serveVariant(page, (json) => { directDefault(json); edit(linkIn(json, link.id)); linkIn(json, link.id).url = url; });
      const navigations = await recordNavigations(page);
      const reveals = watchReveals(page);
      await openProfile(page);
      await card(page, link).click();
      await expect.poll(() => navigations.at(-1)?.url).toBe(url);
      expect(reveals).toHaveLength(0);
      expect(xSafari(navigations)).toEqual([]);
    });
  }

  test('Direct default: from /{username}/{code}, a tap on the Escape Link fires x-safari- to the escape target in the tap\'s own task', async ({ page }) => {
    const link = byMode.escape_ig;
    const { navigations, target } = await tapEscapeFromCode(page);
    const escapeLink = `x-safari-${target}`;

    await expect.poll(() => xSafari(navigations)).toEqual([escapeLink]);
    expect(navigations).toContainEqual({ url: escapeLink, inTapTask: true });
    await expect(page).toHaveURL(`/${username}/${TC}?link=${link.id}`);
  });

  test('after the Escape tap, the Escape Overlay shows every way out aimed at the escape target, and no Reveal is made', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const { reveals, target } = await tapEscapeFromCode(page);
    await expect(escapeOverlay(page)).toBeVisible();
    await expect(escapeOverlay(page).getByRole('link', { name: 'Open in browser' })).toHaveAttribute('href', `x-safari-${target}`);
    await expect(escapeOverlay(page).getByRole('link', { name: 'Try another way' }))
      .toHaveAttribute('href', `instagram://extbrowser/?url=${encodeURIComponent(target)}`);
    await expect(escapeOverlay(page).getByText(target, { exact: true })).toBeVisible();
    await expect(escapeOverlay(page).getByRole('button', { name: 'Copy link' })).toBeVisible();
    await expect(escapeOverlay(page).getByText('Open in External Browser')).toBeVisible(); // the app-menu instruction
    await expect(closeButton(page)).toBeVisible();
    expect(reveals).toHaveLength(0);
    await page.screenshot({ path: SCREENSHOT, animations: 'disabled' });
  });

  test('tapping "Open in browser", then "Try another way", records each one\'s href as a navigation', async ({ page }) => {
    const { navigations, target } = await tapEscapeFromCode(page);
    const openInBrowser = `x-safari-${target}`;
    const tryAnotherWay = `instagram://extbrowser/?url=${encodeURIComponent(target)}`;
    await expect.poll(() => xSafari(navigations)).toEqual([openInBrowser]); // the tap's own Escape

    await escapeOverlay(page).getByRole('link', { name: 'Open in browser' }).click();
    await expect.poll(() => xSafari(navigations)).toEqual([openInBrowser, openInBrowser]);
    await escapeOverlay(page).getByRole('link', { name: 'Try another way' }).click();
    await expect.poll(() => navigations.at(-1)?.url).toBe(tryAnotherWay);
  });

  test('"Close" hides the Escape Overlay and puts the address back to /{username}/{code}', async ({ page }) => {
    const link = byMode.escape_ig;
    await tapEscapeFromCode(page);
    await expect(page).toHaveURL(`/${username}/${TC}?link=${link.id}`);
    await closeButton(page).click();
    await expect(escapeOverlay(page)).toBeHidden();
    await expect(page).toHaveURL(`/${username}/${TC}`);
  });

  test('/{username}/{code}?link={Escape Link Id} reveals, then bounces straight to the Destination through x-safari-, as v1\'s ?link= did, with the Escape Overlay aimed at that address, with Close', async ({ page }) => {
    const link = byMode.escape_ig;
    await serveVariant(page, directDefault);
    const navigations = await recordNavigations(page);
    const reveals = watchReveals(page);
    const address = `/${username}/${TC}?link=${link.id}`;
    const reveal = nextReveal(page);
    await openProfile(page, address);
    const target = `https://${new URL(page.url()).host}${address}`;
    const destination = await realUrlOf(await reveal);

    await expect(escapeOverlay(page)).toBeVisible();
    await expect(escapeOverlay(page).getByRole('link', { name: 'Open in browser' })).toHaveAttribute('href', `x-safari-${target}`);
    await expect(escapeOverlay(page).getByText(target, { exact: true })).toBeVisible();
    await expect(closeButton(page)).toBeVisible();
    await expect(page).toHaveURL(address);
    await expect.poll(() => xSafari(navigations)).toEqual([`x-safari-https://${strip(destination)}`]);
    expect(reveals.map((url) => url.searchParams.get('id'))).toEqual([link.id]);
  });

  test('after an earlier visit to /{username}/{code}, a tap on the Escape Link from /{username} carries the code in the target and the address', async ({ page }) => {
    const link = byMode.escape_ig;
    await serveVariant(page, directDefault);
    const navigations = await recordNavigations(page);
    await openProfile(page, `/${username}/${TC}`);
    await openProfile(page, `/${username}`);
    const host = new URL(page.url()).host;

    await card(page, link).click();
    await expect.poll(() => xSafari(navigations)).toEqual([`x-safari-https://${host}/${username}/${TC}?link=${link.id}`]);
    await expect(page).toHaveURL(`/${username}/${TC}?link=${link.id}`);
  });

  test('after an earlier visit to /{username}/{code}, the overlay on open with an escape_ig default points the address and "Open in browser" at the code; Close puts /{username} back', async ({ page }) => {
    await serveVariant(page, (json) => { json.profile.mode = 'escape_ig'; });
    await openProfile(page, `/${username}/${TC}`);
    await openProfile(page, `/${username}`);
    const host = new URL(page.url()).host;

    await expect(escapeOverlay(page)).toBeVisible();
    await expect(page).toHaveURL(`/${username}/${TC}`);
    await expect(escapeOverlay(page).getByRole('link', { name: 'Open in browser' }))
      .toHaveAttribute('href', `x-safari-https://${host}/${username}/${TC}`);
    await closeButton(page).click();
    await expect(page).toHaveURL(`/${username}`);
  });

  test.describe('with clipboard permission on the localhost origin', () => {
    test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

    test('"Copy link" puts the https escape target on the clipboard', async ({ page }) => {
      const { target } = await tapEscapeFromCode(page);
      await escapeOverlay(page).getByRole('button', { name: 'Copy link' }).click();
      await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(target);
    });
  });

  const adultEscape = (json: ProfileJson) => { directDefault(json); linkIn(json, adult.id).mode = 'escape_ig'; };
  const ageGate = (page: Page) => page.getByRole('heading', { name: 'Mature Content Disclaimer' });

  test('the Adult Link set to Escape Mode shows the Age Gate, then Continue (18+) fires x-safari- to the escape target in its own task, with no Reveal', async ({ page }) => {
    const { navigations, reveals, target } = await tapEscapeFromCode(page, adult, adultEscape);
    await expect(ageGate(page)).toBeVisible();
    const escapeLink = `x-safari-${target}`;
    expect(xSafari(navigations)).toEqual([]);

    await page.getByRole('button', { name: 'Continue (18+)' }).click();
    await expect.poll(() => xSafari(navigations)).toEqual([escapeLink]);
    expect(navigations).toContainEqual({ url: escapeLink, inTapTask: true });
    await expect(escapeOverlay(page)).toBeVisible();
    await expect(escapeOverlay(page).getByRole('link', { name: 'Open in browser' })).toHaveAttribute('href', escapeLink);
    await expect(page).toHaveURL(`/${username}/${TC}?link=${adult.id}`);
    expect(reveals).toHaveLength(0);
  });

  test('the Adult Link set to Escape Mode: closing the Age Gate instead records no navigation and makes no Reveal request', async ({ page }) => {
    const { navigations, reveals } = await tapEscapeFromCode(page, adult, adultEscape);
    await expect(ageGate(page)).toBeVisible();
    const before = navigations.length;

    await page.locator('#closeOverlayBtn').click(); // the Age Gate's close button, an icon with no accessible name
    await expect(ageGate(page)).toBeHidden();
    await expect(escapeOverlay(page)).toBeHidden();
    expect(navigations).toHaveLength(before);
    expect(reveals).toHaveLength(0);
    await expect(page).toHaveURL(`/${username}/${TC}`);
  });

  // The hop: the recorded target, x-safari- stripped, opened in a fresh browser context with a desktop User-Agent
  // (fresh storage, as in a System Browser). The stand-in is plain http, so the target's https path and query are
  // opened on the stand-in, once the target is checked to be https on the host that served the page.
  // The fresh context serves the same Profile edit as the In-App page, so both browsers see one Profile.
  async function hop(browser: Browser, inApp: Page, recorded: string, edit: (json: ProfileJson) => void) {
    expect(recorded.startsWith('x-safari-')).toBe(true);
    const target = new URL(recorded.slice('x-safari-'.length));
    expect(target.protocol).toBe('https:');
    expect(target.host).toBe(new URL(inApp.url()).host);
    const context = await browser.newContext({ userAgent: devices['Desktop Chrome'].userAgent, baseURL: test.info().project.use.baseURL });
    const page = await context.newPage();
    await fenceNetwork(page);
    await serveVariant(page, edit);
    return { page, path: target.pathname + target.search };
  }

  test('the hop: the target recorded from an Escape Link tap opens in a fresh desktop browser context and lands where a tap on that Link would', async ({ page, browser }) => {
    const link = byMode.escape_ig;
    const { navigations } = await tapEscapeFromCode(page, link, directDefault);
    await expect.poll(() => xSafari(navigations)).toHaveLength(1);

    const fresh = await hop(browser, page, xSafari(navigations)[0], directDefault);
    const landed = await recordNavigations(fresh.page);
    const reveals = watchReveals(fresh.page);
    await fresh.page.goto(fresh.path);
    await expect.poll(() => landed.at(-1)?.url).toBe(link.url); // where a desktop tap on the Escape Link lands
    expect(reveals).toHaveLength(0);
    await fresh.page.context().close();
  });

  test('the hop: for the Adult Link set to Escape Mode with tracking on, the fresh desktop browser context reveals with the code and lands on the answer', async ({ page, browser }) => {
    const edit = (json: ProfileJson) => {
      adultEscape(json);
      linkIn(json, adult.id).tracking = true;
    };
    const { navigations } = await tapEscapeFromCode(page, adult, edit);
    await page.getByRole('button', { name: 'Continue (18+)' }).click();
    await expect.poll(() => xSafari(navigations)).toHaveLength(1);

    const fresh = await hop(browser, page, xSafari(navigations)[0], edit);
    const reveals = watchReveals(fresh.page);
    const reveal = nextReveal(fresh.page);
    await fresh.page.goto(fresh.path);
    const destination = await realUrlOf(await reveal);
    await expect(fresh.page).toHaveURL(destination);
    expect(reveals.map((url) => url.searchParams.get('id'))).toEqual([adult.id]);
    expect(reveals[0].searchParams.get('trackingId')).toBe(TC);
    expect(destination.endsWith(`/c${TC}`)).toBe(true); // Reveal appends /c{code}
    await fresh.page.context().close();
  });

  test('Deeplink default: a Link with its mode removed makes a Reveal request, then pops out to the answer', async ({ page }) => {
    const link = byMode.escape_ig;
    await serveVariant(page, (json) => { json.profile.mode = 'deeplink'; delete linkIn(json, link.id).mode; });
    const navigations = await recordNavigations(page);
    const reveals = watchReveals(page);
    await openProfile(page);
    const reveal = nextReveal(page);
    await card(page, link).click();
    const destination = await realUrlOf(await reveal);
    await expect.poll(() => xSafari(navigations).at(-1)).toBe(`x-safari-${destination}`);
    expect(reveals.map((url) => url.searchParams.get('id'))).toEqual([link.id]);
  });
});

test.describe('In-App Browser (Android Instagram)', () => {
  test.use({ userAgent: UA.androidInstagram });

  test('from /{username}/{code}, a tap on the Escape Link fires the Chrome intent with the plain target as fallback, in the tap\'s own task; "Open in browser" carries it; no "Try another way"', async ({ page }) => {
    const link = byMode.escape_ig;
    const { navigations } = await tapEscapeFromCode(page);
    const host = new URL(page.url()).host;
    // The spec's Android escape link, spelled out: the fallback is the https escape target, percent-encoded.
    const intent = `intent://${host}/${username}/${TC}?link=${link.id}` +
      `#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=` +
      `https%3A%2F%2F${host.replace(':', '%3A')}%2F${username}%2F${TC}%3Flink%3D${link.id};end`;

    await expect.poll(() => intents(navigations)).toEqual([intent]);
    expect(navigations).toContainEqual({ url: intent, inTapTask: true });
    await expect(escapeOverlay(page)).toBeVisible();
    const openInBrowser = escapeOverlay(page).getByRole('link', { name: 'Open in browser' });
    await expect(openInBrowser).toHaveAttribute('href', intent);
    await expect(escapeOverlay(page).getByRole('link', { name: 'Try another way' })).toHaveCount(0);

    await openInBrowser.click();
    await expect.poll(() => intents(navigations)).toEqual([intent, intent]);
  });

  // The Chrome intent for a Reveal answer after a tap in an In-App Browser: v1's performBounce intent, with the Destination as
  // fallback for a phone without Chrome.
  const deeplinkIntent = (destination: string) => tapPop('android', destination);

  test('a tap on the Deeplink Link makes a Reveal request, then fires v1\'s Chrome intent for the answer', async ({ page }) => {
    const link = byMode.deeplink;
    await serveVariant(page, directDefault);
    const navigations = await recordNavigations(page);
    const reveals = watchReveals(page);
    await openProfile(page);

    const reveal = nextReveal(page);
    await card(page, link).click();
    const destination = await realUrlOf(await reveal);
    expect(destination.startsWith('https://')).toBe(true);
    await expect.poll(() => intents(navigations)).toEqual([deeplinkIntent(destination)]);
    expect(reveals.map((url) => url.searchParams.get('id'))).toEqual([link.id]);
  });

  test('the Adult Link set to Deeplink shows the Age Gate, then Continue (18+) reveals and fires v1\'s Chrome intent for the answer', async ({ page }) => {
    await serveVariant(page, (json) => { directDefault(json); linkIn(json, adult.id).mode = 'deeplink'; });
    const navigations = await recordNavigations(page);
    const reveals = watchReveals(page);
    await openProfile(page);

    await card(page, adult).click();
    await expect(page.getByRole('heading', { name: 'Mature Content Disclaimer' })).toBeVisible();
    expect(reveals).toHaveLength(0);

    const reveal = nextReveal(page);
    await page.getByRole('button', { name: 'Continue (18+)' }).click();
    const destination = await realUrlOf(await reveal);
    expect(destination.startsWith('https://')).toBe(true);
    await expect.poll(() => intents(navigations)).toEqual([deeplinkIntent(destination)]);
    expect(reveals.map((url) => url.searchParams.get('id'))).toEqual([adult.id]);
  });
});

// Pop-out to Safari/Chrome (real-device report, 2026-10): Escape and Deeplink Modes leave the In-App Browser with v1's links
// (linkme_clone3/script.js, performBounce): on open, once per tab, for an Escape or Deeplink default and for a Link Shortcut
// (v1's "at start"), and on a tap (v1's "after the click"). v1 bounced only Instagram; TikTok is v2's extension of it. iOS
// Instagram is covered above, Android Instagram's taps too, so only what is left is run for Instagram here.
for (const [app, platform, userAgent, withTaps] of [
  ['Instagram', 'android', UA.androidInstagram, false],
  ['TikTok', 'ios', UA.iosTiktok, true],
  ['TikTok', 'android', UA.tiktok, true],
] as const) {
  test.describe(`Pop-out to Safari/Chrome (${platform} ${app})`, () => {
    test.use({ userAgent });

    test('Escape default: the page pops out on open to the Profile with its code, and shows the Escape Overlay', async ({ page }) => {
      await serveVariant(page, (json) => { json.profile.mode = 'escape_ig'; });
      const navigations = await recordNavigations(page);
      await openProfile(page, `/${username}/${TC}`);
      const host = new URL(page.url()).host;
      await expect.poll(() => popOuts(navigations)).toEqual([onLoadPop(platform, `https://${host}/${username}/${TC}`)]);
      await expect(escapeOverlay(page)).toBeVisible();
    });

    test('a second load in the same tab does not pop out again', async ({ page }) => {
      await serveVariant(page, (json) => { json.profile.mode = 'escape_ig'; });
      const navigations = await recordNavigations(page);
      await openProfile(page);
      await expect.poll(() => popOuts(navigations)).toHaveLength(1);
      await page.reload();
      await expect(page.locator('#displayName')).toHaveText(served.profile.displayName);
      await expect(escapeOverlay(page)).toBeVisible(); // the fallback still shows
      await page.waitForLoadState('networkidle');
      expect(popOuts(navigations)).toHaveLength(1);
    });

    test('?link={Escape Link Id} reveals on open, then bounces straight to the Destination', async ({ page }) => {
      const link = byMode.escape_ig;
      await serveVariant(page, directDefault);
      const navigations = await recordNavigations(page);
      const reveal = nextReveal(page);
      await openProfile(page, `/${username}/${TC}?link=${link.id}`);
      const destination = await realUrlOf(await reveal);
      await expect.poll(() => popOuts(navigations)).toEqual([onLoadPop(platform, destination)]);
    });

    test('Deeplink default: the page pops out on open to the Profile, with no Escape Overlay', async ({ page }) => {
      await serveVariant(page, (json) => { json.profile.mode = 'deeplink'; });
      const navigations = await recordNavigations(page);
      await openProfile(page);
      const host = new URL(page.url()).host;
      await expect.poll(() => popOuts(navigations)).toEqual([onLoadPop(platform, `https://${host}/${username}`)]);
      await expect(escapeOverlay(page)).toBeHidden();
    });

    if (withTaps) {
      test('Direct default: a tap on the Escape Link pops out to that Link from the tap itself, with no Reveal', async ({ page }) => {
        const { navigations, reveals, target } = await tapEscapeFromCode(page);
        const href = tapPop(platform, target);
        await expect.poll(() => popOuts(navigations)).toEqual([href]);
        expect(navigations).toContainEqual({ url: href, inTapTask: true });
        expect(reveals).toHaveLength(0);
      });

      test('Direct default: a tap on the Deeplink Link reveals, then pops out to the Destination', async ({ page }) => {
        const link = byMode.deeplink;
        await serveVariant(page, directDefault);
        const navigations = await recordNavigations(page);
        await openProfile(page);
        const reveal = nextReveal(page);
        await card(page, link).click();
        const destination = await realUrlOf(await reveal);
        await expect.poll(() => popOuts(navigations)).toEqual([tapPop(platform, destination)]);
      });
    }
  });
}

// The load-time pop-out is the In-App Browser's alone: a System Browser under either popping default records none.
for (const [browser, userAgent] of [
  ['iOS Safari', UA.iosSafari],
  ['Android Chrome', UA.androidChrome],
] as const) {
  for (const profileMode of ['escape_ig', 'deeplink']) {
    test(`System Browser (${browser}), ${profileMode} default: nothing pops out on open`, async ({ page }) => {
      await serveVariant(page, (json) => { json.profile.mode = profileMode; });
      const navigations = await recordNavigations(page);
      await openProfile(page, `/${username}/${TC}`);
      await page.waitForLoadState('networkidle');
      expect(popOuts(navigations)).toEqual([]);
      await expect(escapeOverlay(page)).toBeHidden();
    });
  }
}

test.describe('In-App Browser on neither iOS nor Android (desktop UA carrying "Instagram")', () => {
  test.use({ userAgent: UA.desktopInstagram });

  test('a tap on the Escape Link records no navigation and shows the Escape Overlay, whose "Open in browser" carries the plain https target; no "Try another way"', async ({ page }) => {
    const { navigations, target } = await tapEscapeFromCode(page);
    await expect(escapeOverlay(page)).toBeVisible();
    await expect(escapeOverlay(page).getByRole('link', { name: 'Open in browser' })).toHaveAttribute('href', target);
    await expect(escapeOverlay(page).getByRole('link', { name: 'Try another way' })).toHaveCount(0);
    // The only entry is the address-bar rewrite the spec requires on an Escape Mode tap (a same-document replace);
    // no navigation leaves the page.
    const address = `/${username}/${TC}?link=${byMode.escape_ig.id}`;
    await expect(page).toHaveURL(address);
    expect(navigations.map(({ url }) => url)).toEqual([new URL(address, page.url()).href]);
  });
});
