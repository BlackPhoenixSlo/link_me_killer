import { test, expect, devices, type Page, type Response } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { escapeOverlay, intents, recordNavigations, UA, type Navigation } from './helpers';

// Phase 1, as amended 2026-10-06: the only Modes are Direct and Escape, the Deeplink Modes are gone, and the iOS/Instagram
// escape is passive — only Android fires a native scheme (the Chrome intent). Every Link's served url is empty, so every Link
// Reveals on click and then navigates; there is no `/r/{Link Id}` redirector. Link Ids, Modes and the Username come from the
// Fixture Profile the stand-in serves. Destinations are taken from the fixture file's urls or from Reveal's own answer.

type Mode = 'direct' | 'escape_ig';
type Link = { id: string; title: string; url?: string; isAdult?: boolean; tracking?: boolean; mode?: string };
type ProfileJson = { profile: { username: string; displayName: string; mode?: string }; links: Link[] };

const PROFILE_JSON = '/api/profiles/fixture.json'; // where the stand-in serves the Fixture Profile
const MODES: Mode[] = ['direct', 'escape_ig'];
const REVEAL_PATH = '/.netlify/functions/reveal';
const FENCE_HEADER = 'x-network-fence';
const TC = '4242'; // a numeric Tracking Code in the path
// The iOS Instagram Escape Overlay, left for the human on every run (plan section 7, step 2).
const SCREENSHOT = join(__dirname, '..', '..', '.scratch', 'goal_ai', 'shots', '01-link-modes-and-escape.png');
const FIXTURE_FILE: { links: { title: string; url: string; mode?: string }[] } = JSON.parse(
  readFileSync(join(__dirname, '..', 'fixtures', 'api', 'profiles', 'fixture.json'), 'utf8'),
);
// A non-Adult Link's Destination: the Fixture file's url for the card of the same title (the served url is always empty).
const destinationOf = (link: Link) => FIXTURE_FILE.links.find((l) => l.title === link.title)!.url;
// The Mode a Fixture Link carries of its own in the Fixture file, if any.
const ownMode = (link: Link) => FIXTURE_FILE.links.find((l) => l.title === link.title)?.mode;

// Fixture read: fails fast, naming what is missing, if no non-Adult Link has one of the two Modes, no non-Adult Link inherits
// the Profile default (the one with no Mode of its own), or no Link is Adult.
let served: ProfileJson;
let username: string;
let byMode: Record<Mode, Link>;
let inherits: Link; // the non-Adult Link with no Mode of its own, so its effective Mode is the Profile default
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
    const link = served.links.find((l) => !l.isAdult && ownMode(l) === mode && l.mode === mode);
    if (link) byMode[mode] = link;
    else missing.push(`a non-Adult Link with mode "${mode}"`);
  }
  const inheritsLink = served.links.find((l) => !l.isAdult && !ownMode(l));
  if (inheritsLink) inherits = inheritsLink;
  else missing.push('a non-Adult Link with no Mode of its own');
  const adultLink = served.links.find((l) => l.isAdult);
  if (adultLink) adult = adultLink;
  else missing.push('an Adult Link');
  if (missing.length) throw new Error(`Fixture Profile is missing: ${missing.join(', ')}`);
});

// Network fence: localhost passes through; every other host gets an empty page, so Destinations land where toHaveURL can assert
// them and nothing leaves the machine. Reveal answers pass through unchanged; each body is kept because the onward navigation
// discards it.
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

const closeButton = (page: Page) => escapeOverlay(page).getByRole('button', { name: 'Close' });

// Android's Chrome intent for an https address, as v1's performBounce spelled it: the only native escape scheme the page fires.
const strip = (url: string) => url.replace(/^https?:\/\//, '');
const chromeIntent = (url: string) => `intent://${strip(url)}#Intent;scheme=https;package=com.android.chrome;end`;

// A Profile default as the app serves it: the Profile's mode, and the inheriting Link's served `mode`, which is the effective one.
const withDefault = (mode: string) => (json: ProfileJson) => {
  json.profile.mode = mode;
  linkIn(json, inherits.id).mode = mode;
};
const directDefault = withDefault('direct');
const escapeDefault = withDefault('escape_ig');

async function openProfile(page: Page, path = `/${username}`) {
  await page.goto(path);
  await expect(page.locator('#displayName')).toHaveText(served.profile.displayName);
}
const card = (page: Page, link: Link) => page.locator('.link-card', { hasText: link.title });

// From /{username}/{code} with a Direct default (no Escape Overlay on open), a tap on the Link (the Escape Link unless given);
// the escape target as the spec spells it: the page's own https address with the code and ?link=.
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

  // Every Link's served url is empty, so every non-Adult Link Reveals on click and lands on Reveal's answer.
  for (const kind of ['direct', 'escape_ig', 'inherits'] as const) {
    test(`a tap on the ${kind} Link reveals with its id and lands on the answer`, async ({ page }) => {
      const link = kind === 'inherits' ? inherits : byMode[kind];
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

  test('a Link with tracking on reveals with the Tracking Code from the path', async ({ page }) => {
    const link = byMode.direct;
    await serveVariant(page, (json) => Object.assign(linkIn(json, link.id), { tracking: true }));
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
      await serveVariant(page, withDefault(mode));
      await openProfile(page);
      await expect(escapeOverlay(page)).toBeHidden();
    });
  }

  for (const [variant, edit] of [
    ['its mode removed', (l: Link) => { delete l.mode; }],
    ['an unrecognised mode', (l: Link) => { l.mode = 'sideways'; }],
  ] as const) {
    test(`a Link with ${variant} falls back to the Profile default and still reveals`, async ({ page }) => {
      const link = byMode.direct;
      await serveVariant(page, (json) => { escapeDefault(json); edit(linkIn(json, link.id)); });
      const reveals = watchReveals(page);
      await openProfile(page);
      const reveal = nextReveal(page);
      await card(page, link).click();
      await expect(page).toHaveURL(await realUrlOf(await reveal));
      expect(reveals).toHaveLength(1);
    });
  }

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

  test('/{username}/{code}?link={Escape Link Id} reveals on load and lands on the answer (no In-App Browser, so no Escape)', async ({ page }) => {
    const link = byMode.escape_ig;
    const reveals = watchReveals(page);
    const reveal = nextReveal(page);
    await page.goto(`/${username}/${TC}?link=${link.id}`);
    await expect(page).toHaveURL(await realUrlOf(await reveal));
    expect(reveals.map((url) => url.searchParams.get('id'))).toEqual([link.id]);
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
    const reveals = watchReveals(page);
    await openProfile(page);
    const reveal = nextReveal(page);
    await card(page, byMode.direct).click();
    await expect(page).toHaveURL(await realUrlOf(await reveal));
    // The stylesheet CDN and the verified badge's image host, plus the Destination the Click revealed.
    expect(offHost.length).toBeGreaterThan(1);
    expect(offHost.filter((res) => res.headers()[FENCE_HEADER] !== '1').map((res) => res.url())).toEqual([]);
    expect(reveals).toHaveLength(1);
  });
});

// No scheme fired or linked: an iOS page is passive, so no instagram:, x-safari- or intent: anchor exists and no such navigation
// is recorded. Shared by the iOS In-App and the System Browser describes below.
const SCHEME_ANCHORS = 'a[href^="instagram:"], a[href^="x-safari-"], a[href^="intent:"]';
const schemeNavigations = (navigations: Navigation[]) =>
  navigations.map(({ url }) => url).filter((url) => /^(instagram:|x-safari-|intent:)/.test(url));

// In-App Browsers on iOS (Instagram, Facebook, TikTok): passive. The Escape Overlay carries the manual instructions and an
// "Open in browser" link whose href is the page's own https address (same domain), never a native scheme and never the raw
// Destination. Nothing pops out by itself.
for (const [app, userAgent] of [
  ['iOS Instagram', UA.iosInstagram],
  ['iOS Facebook', UA.fban],
  ['iOS TikTok', UA.iosTiktok],
] as const) {
  test.describe(`In-App Browser (${app})`, () => {
    test.use({ userAgent });

    test('Escape default: the Escape Overlay shows on open, aimed at the page\'s own https address, with no scheme fired', async ({ page }) => {
      await serveVariant(page, escapeDefault);
      const navigations = await recordNavigations(page);
      await openProfile(page, `/${username}/${TC}`);
      await expect(escapeOverlay(page)).toBeVisible();
      const target = `https://${new URL(page.url()).host}/${username}/${TC}`;
      await expect(escapeOverlay(page).getByRole('link', { name: 'Open in browser' })).toHaveAttribute('href', target);
      await expect(escapeOverlay(page).getByText(target, { exact: true })).toBeVisible();
      await page.waitForLoadState('networkidle');
      expect(schemeNavigations(navigations)).toEqual([]);
      await expect(page.locator(SCHEME_ANCHORS)).toHaveCount(0);
    });

    test('Direct default: no Escape Overlay on open, and the Direct Link reveals and navigates plainly', async ({ page }) => {
      await serveVariant(page, directDefault);
      const navigations = await recordNavigations(page);
      const reveals = watchReveals(page);
      await openProfile(page, `/${username}/${TC}`);
      await expect(escapeOverlay(page)).toBeHidden();
      const reveal = nextReveal(page);
      await card(page, byMode.direct).click();
      await expect(page).toHaveURL(await realUrlOf(await reveal));
      expect(reveals).toHaveLength(1);
      expect(schemeNavigations(navigations)).toEqual([]);
    });

    test('a tap on the Escape Link shows the Escape Overlay aimed at the escape target, with no scheme and no Reveal', async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      const link = byMode.escape_ig;
      const { navigations, reveals, target } = await tapEscapeFromCode(page, link);
      await expect(escapeOverlay(page)).toBeVisible();
      await expect(page).toHaveURL(`/${username}/${TC}?link=${link.id}`);
      await expect(escapeOverlay(page).getByRole('link', { name: 'Open in browser' })).toHaveAttribute('href', target);
      await expect(escapeOverlay(page).getByText(target, { exact: true })).toBeVisible();
      await expect(escapeOverlay(page).getByRole('button', { name: 'Copy link' })).toBeVisible();
      await expect(escapeOverlay(page).getByText('Open in External Browser')).toBeVisible(); // the app-menu instruction
      await expect(closeButton(page)).toBeVisible();
      await expect(page.locator(SCHEME_ANCHORS)).toHaveCount(0);
      expect(schemeNavigations(navigations)).toEqual([]);
      expect(reveals).toHaveLength(0);
      if (app === 'iOS Instagram') await page.screenshot({ path: SCREENSHOT, animations: 'disabled' });
    });

    test('"Close" hides the Escape Overlay and puts the address back to /{username}/{code}', async ({ page }) => {
      const link = byMode.escape_ig;
      await tapEscapeFromCode(page, link);
      await expect(page).toHaveURL(`/${username}/${TC}?link=${link.id}`);
      await closeButton(page).click();
      await expect(escapeOverlay(page)).toBeHidden();
      await expect(page).toHaveURL(`/${username}/${TC}`);
    });

    test('the Adult Link set to Escape Mode: the Age Gate, then Continue (18+) shows the Escape Overlay, with no scheme and no Reveal', async ({ page }) => {
      const adultEscape = (json: ProfileJson) => { directDefault(json); linkIn(json, adult.id).mode = 'escape_ig'; };
      const { navigations, reveals } = await tapEscapeFromCode(page, adult, adultEscape);
      await expect(page.getByRole('heading', { name: 'Mature Content Disclaimer' })).toBeVisible();

      await page.getByRole('button', { name: 'Continue (18+)' }).click();
      await expect(escapeOverlay(page)).toBeVisible();
      await expect(escapeOverlay(page).getByRole('link', { name: 'Open in browser' }))
        .toHaveAttribute('href', `https://${new URL(page.url()).host}/${username}/${TC}?link=${adult.id}`);
      await expect(page).toHaveURL(`/${username}/${TC}?link=${adult.id}`);
      await expect(page.locator(SCHEME_ANCHORS)).toHaveCount(0);
      expect(schemeNavigations(navigations)).toEqual([]);
      expect(reveals).toHaveLength(0);
    });

    test('?link={Escape Link Id} on load shows the Escape Overlay, with no scheme and no Reveal (iOS is passive on load)', async ({ page }) => {
      const link = byMode.escape_ig;
      await serveVariant(page, directDefault);
      const navigations = await recordNavigations(page);
      const reveals = watchReveals(page);
      await openProfile(page, `/${username}/${TC}?link=${link.id}`);
      await expect(escapeOverlay(page)).toBeVisible();
      await expect(closeButton(page)).toBeVisible();
      await expect(page).toHaveURL(`/${username}/${TC}?link=${link.id}`);
      await page.waitForLoadState('networkidle');
      expect(reveals).toHaveLength(0);
      expect(schemeNavigations(navigations)).toEqual([]);
      await expect(page.locator(SCHEME_ANCHORS)).toHaveCount(0);
    });

    test.describe('with clipboard permission on the localhost origin', () => {
      test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

      test('"Copy link" puts the https escape target on the clipboard', async ({ page }) => {
        const { target } = await tapEscapeFromCode(page);
        await escapeOverlay(page).getByRole('button', { name: 'Copy link' }).click();
        await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(target);
      });
    });
  });
}

// In-App Browsers on Android (Instagram, TikTok): only here does the page fire a native scheme, v1's Chrome intent, from the
// Visitor's own tap (to the escape target) or on an Escape Mode Link Shortcut at load (to the Destination). Nothing pops out on
// open; the Escape Overlay waits for the tap.
for (const [app, userAgent] of [
  ['Android Instagram', UA.androidInstagram],
  ['Android TikTok', UA.tiktok],
] as const) {
  test.describe(`In-App Browser (${app})`, () => {
    test.use({ userAgent });

    test('Escape default: the Escape Overlay shows on open and nothing is fired', async ({ page }) => {
      await serveVariant(page, escapeDefault);
      const navigations = await recordNavigations(page);
      await openProfile(page, `/${username}/${TC}`);
      await expect(escapeOverlay(page)).toBeVisible();
      await page.waitForLoadState('networkidle');
      expect(intents(navigations)).toEqual([]);
    });

    test('a tap on the Escape Link fires the Chrome intent to the escape target, in the tap\'s own task; "Open in browser" carries it; no Reveal', async ({ page }) => {
      const link = byMode.escape_ig;
      const { navigations, reveals, target } = await tapEscapeFromCode(page, link);
      const intent = chromeIntent(target);
      await expect.poll(() => intents(navigations)).toEqual([intent]);
      expect(navigations).toContainEqual({ url: intent, inTapTask: true });
      await expect(escapeOverlay(page)).toBeVisible();
      await expect(escapeOverlay(page).getByRole('link', { name: 'Open in browser' })).toHaveAttribute('href', intent);
      await expect(escapeOverlay(page).getByRole('link', { name: 'Try another way' })).toHaveCount(0);
      expect(reveals).toHaveLength(0);
    });

    test('a tap on the Direct Link reveals and navigates plainly, with nothing fired', async ({ page }) => {
      await serveVariant(page, directDefault);
      const navigations = await recordNavigations(page);
      const reveals = watchReveals(page);
      await openProfile(page, `/${username}/${TC}`);
      const reveal = nextReveal(page);
      await card(page, byMode.direct).click();
      await expect(page).toHaveURL(await realUrlOf(await reveal));
      expect(reveals).toHaveLength(1);
      expect(intents(navigations)).toEqual([]);
    });

    test('the Adult Link set to Escape Mode: the Age Gate, then Continue (18+) fires the Chrome intent to the escape target, with no Reveal', async ({ page }) => {
      const adultEscape = (json: ProfileJson) => { directDefault(json); linkIn(json, adult.id).mode = 'escape_ig'; };
      const { navigations, reveals } = await tapEscapeFromCode(page, adult, adultEscape);
      await expect(page.getByRole('heading', { name: 'Mature Content Disclaimer' })).toBeVisible();
      expect(intents(navigations)).toEqual([]);

      const intent = chromeIntent(`https://${new URL(page.url()).host}/${username}/${TC}?link=${adult.id}`);
      await page.getByRole('button', { name: 'Continue (18+)' }).click();
      await expect.poll(() => intents(navigations)).toEqual([intent]);
      expect(navigations).toContainEqual({ url: intent, inTapTask: true });
      await expect(escapeOverlay(page)).toBeVisible();
      expect(reveals).toHaveLength(0);
    });

    test('?link={Escape Link Id} on load reveals, then fires the Chrome intent straight to the Destination, with the Escape Overlay aimed at the page address', async ({ page }) => {
      const link = byMode.escape_ig;
      await serveVariant(page, directDefault);
      const navigations = await recordNavigations(page);
      const reveals = watchReveals(page);
      const address = `/${username}/${TC}?link=${link.id}`;
      const reveal = nextReveal(page);
      await openProfile(page, address);
      const destination = await realUrlOf(await reveal);
      const target = `https://${new URL(page.url()).host}${address}`;
      await expect(escapeOverlay(page)).toBeVisible();
      await expect(escapeOverlay(page).getByText(target, { exact: true })).toBeVisible();
      await expect(closeButton(page)).toBeVisible();
      await expect(page).toHaveURL(address);
      await expect.poll(() => intents(navigations)).toEqual([chromeIntent(destination)]);
      expect(reveals.map((url) => url.searchParams.get('id'))).toEqual([link.id]);
    });
  });
}

// System Browsers and the webviews the page treats as System Browsers (Snapchat, bare WKWebView, Android WebView, and Chrome's
// own iOS/Android builds): never an Escape Overlay, and an Escape Mode Link reveals and navigates plainly, with no scheme.
for (const [browser, userAgent] of [
  ['iOS Safari', UA.iosSafari],
  ['iOS Chrome', UA.iosChrome],
  ['Android Chrome', UA.androidChrome],
  ['iOS Snapchat', UA.iosSnapchat],
  ['bare iOS WKWebView', UA.iosWebView],
  ['Android WebView', UA.androidWebView],
] as const) {
  test.describe(`System Browser (${browser})`, () => {
    test.use({ userAgent });

    test('an Escape default shows no Escape Overlay, and the Escape Link reveals and navigates plainly', async ({ page }) => {
      await serveVariant(page, escapeDefault);
      const navigations = await recordNavigations(page);
      const reveals = watchReveals(page);
      await openProfile(page);
      await expect(escapeOverlay(page)).toBeHidden();
      const reveal = nextReveal(page);
      await card(page, byMode.escape_ig).click();
      await expect(page).toHaveURL(await realUrlOf(await reveal));
      expect(reveals).toHaveLength(1);
      expect(schemeNavigations(navigations)).toEqual([]);
      expect(intents(navigations)).toEqual([]);
    });
  });
}

test.describe('the Escape Overlay reads as v1\'s in Instagram', () => {
  test.use({ userAgent: UA.iosInstagram });

  test('the Instagram icon shows and the copy names Instagram', async ({ page }) => {
    await serveVariant(page, escapeDefault);
    await openProfile(page);
    await expect(escapeOverlay(page)).toBeVisible();
    await expect(escapeOverlay(page).getByText('Instagram restricts some links.', { exact: false })).toBeVisible();
    expect(await page.locator('#igIcon').evaluate((el) => (el as HTMLElement).style.display)).not.toBe('none');
  });
});

test.describe('the Escape Overlay outside Instagram (TikTok, v2\'s extension)', () => {
  test.use({ userAgent: UA.tiktok });

  test('reads "This app restricts some links", with no Instagram icon', async ({ page }) => {
    await serveVariant(page, escapeDefault);
    await openProfile(page);
    await expect(escapeOverlay(page).getByText('This app restricts some links.', { exact: false })).toBeVisible();
    expect(await page.locator('#igIcon').evaluate((el) => (el as HTMLElement).style.display)).toBe('none');
  });
});

test.describe('In-App Browser on neither iOS nor Android (desktop UA carrying "Instagram")', () => {
  test.use({ userAgent: UA.desktopInstagram });

  test('a tap on the Escape Link records no scheme navigation and shows the Escape Overlay, whose "Open in browser" carries the plain https target', async ({ page }) => {
    const { navigations, target } = await tapEscapeFromCode(page);
    await expect(escapeOverlay(page)).toBeVisible();
    await expect(escapeOverlay(page).getByRole('link', { name: 'Open in browser' })).toHaveAttribute('href', target);
    await expect(escapeOverlay(page).getByRole('link', { name: 'Try another way' })).toHaveCount(0);
    expect(schemeNavigations(navigations)).toEqual([]);
    await expect(page).toHaveURL(`/${username}/${TC}?link=${byMode.escape_ig.id}`);
  });
});
