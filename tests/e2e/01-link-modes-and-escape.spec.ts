import { test, expect, devices, type Browser, type Page, type Response } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { escapeOverlay, extBrowser, IG_EXT_BROWSER, igExt, intents, recordNavigations, UA, xSafari, type Navigation } from './helpers';

// Phase 1: every Link travels by its own Mode (docs/spec/phase-01-link-modes-and-escape.md, Testing Decisions).
// Link Ids, Modes and the Username come from the Fixture Profile the stand-in serves, never from a literal.
// Destinations are taken from the fixture's urls or from Reveal's own answer; no Test Secret is read here.
// The Fixture Profile file is read only for a non-Adult Link's Destination, where `/r/{Link Id}` redirects (its v1 `url`).

type Mode = 'direct' | 'escape_ig' | 'deeplink';
type Link = { id: string; title: string; url?: string; isAdult?: boolean; tracking?: boolean; mode?: string };
type ProfileJson = { profile: { username: string; displayName: string; mode?: string }; links: Link[] };

const PROFILE_JSON = '/api/profiles/fixture.json'; // where the stand-in serves the Fixture Profile
const MODES: Mode[] = ['direct', 'escape_ig', 'deeplink'];
// Every Mode a Profile may hold: the Fixture's three, and Deeplink at open, which no Fixture Link holds.
const ALL_MODES = [...MODES, 'deeplink_open'];
const REVEAL_PATH = '/.netlify/functions/reveal';
const FENCE_HEADER = 'x-network-fence';
const TC = '4242'; // a numeric Tracking Code in the path
// The iOS Instagram Escape Overlay, opened by an Escape Mode tap, left for the human on every run (plan section 7, step 2).
const SCREENSHOT = join(__dirname, '..', '..', '.scratch', 'goal_ai', 'shots', '01-link-modes-and-escape.png');
const FIXTURE_FILE: { links: { title: string; url: string; mode?: string }[] } = JSON.parse(
  readFileSync(join(__dirname, '..', 'fixtures', 'api', 'profiles', 'fixture.json'), 'utf8'),
);
// Where `/r/{Link Id}` sends a non-Adult Link: its Destination, the Fixture file's v1 `url` for the card of the same title.
const destinationOf = (link: Link) => FIXTURE_FILE.links.find((l) => l.title === link.title)!.url;

// The Mode a Fixture Link carries of its own in the Fixture file, if any.
const ownMode = (link: Link) => FIXTURE_FILE.links.find((l) => l.title === link.title)?.mode;

// Fixture read: fails fast, naming what is missing, if no Link has one of the three Modes or no Link is Adult. The Deeplink
// Modes are Profile defaults only (ADR 0003, amended 2026-10-06), so the "deeplink" Link is the one with no Mode of its own:
// it inherits the Profile default, and travels as Deeplink under a Deeplink default (withDefault).
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
    const link = served.links.find((l) => !l.isAdult && (mode === 'deeplink' ? !ownMode(l) : ownMode(l) === mode && l.mode === mode));
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

// Pop-outs, per platform and app, with the address forced to https as v1 forced it, on open and on a tap alike: in iOS
// Instagram, Instagram's own open-in-browser link (a real iPhone, 2026-10-06, showed Instagram drops x-safari-); elsewhere
// v1's performBounce strings (linkme_clone3/script.js), x-safari-https:// on iOS and the Chrome intent with no fallback on
// Android.
const strip = (url: string) => url.replace(/^https?:\/\//, '');
const popTo = (userAgent: string, url: string) => {
  if (/Android/.test(userAgent)) return `intent://${strip(url)}#Intent;scheme=https;package=com.android.chrome;end`;
  if (/Instagram/.test(userAgent)) return igExt(`https://${strip(url)}`);
  return `x-safari-https://${strip(url)}`;
};
const popOuts = (navigations: Navigation[]) => [...xSafari(navigations), ...extBrowser(navigations), ...intents(navigations)];
// The https address a recorded pop-out hands Safari or Chrome.
const poppedTo = (recorded: string) => {
  if (recorded.startsWith('x-safari-')) return recorded.slice('x-safari-'.length);
  if (recorded.startsWith(IG_EXT_BROWSER)) return decodeURIComponent(recorded.slice(IG_EXT_BROWSER.length));
  return `https://${recorded.slice('intent://'.length, recorded.indexOf('#Intent;'))}`;
};
// A Profile default as the app serves it: the Profile's mode, and the Link with no Mode of its own (byMode.deeplink), whose
// served `mode` is the effective one, inheriting it.
const withDefault = (mode: string) => (json: ProfileJson) => {
  json.profile.mode = mode;
  linkIn(json, byMode.deeplink.id).mode = mode;
};
// Deeplink on tap as the Profile's default Mode.
const deeplinkDefault = withDefault('deeplink');
// Deeplink at open as the Profile's default Mode: pops out on open, once per tab.
const deeplinkAtOpen = withDefault('deeplink_open');
// This tab has popped out on open before: the page's once-per-tab guard for the Profile (app/public/script.js, popOutOnLoad)
// is already set.
const alreadyPoppedOut = (page: Page) => page.addInitScript((key) => sessionStorage.setItem(key, '1'), `popOut:/${username}`);
// How long a Deeplink tap waits before its fallback (app/public/script.js, POP_OUT_WAIT_MS).
const FALLBACK_WAIT_MS = 2500;

async function openProfile(page: Page, path = `/${username}`) {
  await page.goto(path);
  await expect(page.locator('#displayName')).toHaveText(served.profile.displayName);
}
const card = (page: Page, link: Link) => page.locator('.link-card', { hasText: link.title });

const directDefault = withDefault('direct');
// The default under which byMode[mode] travels by `mode`: Deeplink for the Link that inherits it, Direct for the others.
const defaultFor = (mode: Mode) => (mode === 'deeplink' ? deeplinkDefault : directDefault);

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
    await serveVariant(page, (json) => { deeplinkDefault(json); linkIn(json, deeplink.id).url = 'https://example.net/not-the-destination'; });
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

  for (const mode of ALL_MODES) {
    test(`a Profile default of ${mode} shows no Escape Overlay`, async ({ page }) => {
      await serveVariant(page, (json) => { withDefault(mode)(json); });
      await openProfile(page);
      await expect(page.locator('#igOverlay')).toBeHidden();
    });
  }

  test('a Link with its mode removed follows a deeplink default and reveals', async ({ page }) => {
    const link = byMode.direct;
    await serveVariant(page, (json) => { withDefault('deeplink')(json); delete linkIn(json, link.id).mode; });
    const reveals = watchReveals(page);
    await openProfile(page);
    const reveal = nextReveal(page);
    await card(page, link).click();
    await expect(page).toHaveURL(await realUrlOf(await reveal));
    expect(reveals).toHaveLength(1);
  });

  test('a Link with an unrecognised mode follows a deeplink default and reveals', async ({ page }) => {
    const link = byMode.direct;
    await serveVariant(page, (json) => { withDefault('deeplink')(json); linkIn(json, link.id).mode = 'sideways'; });
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
    expect(popOuts(navigations)).toEqual([]);
  });

  test('a tap on the Deeplink Link pops out through instagram://extbrowser/ to its Link Shortcut in the tap\'s own task, with no Reveal before it and no Escape Overlay', async ({ page }) => {
    const link = byMode.deeplink;
    await serveVariant(page, deeplinkDefault);
    const navigations = await recordNavigations(page);
    const reveals = watchReveals(page);
    await openProfile(page);
    const href = igExt(`https://${new URL(page.url()).host}/${username}?link=${link.id}`);
    expect(new URL(poppedTo(href)).searchParams.get('link')).toBe(link.id); // ?link= survives the encoding

    // The card is a real anchor to the escape link, as "Open in browser" is: the pop-out is the anchor tap itself
    await expect(card(page, link)).toHaveAttribute('href', href);
    await card(page, link).click();
    await expect.poll(() => popOuts(navigations)).toEqual([href]);
    expect(reveals).toHaveLength(0); // before the fallback's wait is up
    expect(navigations).toContainEqual({ url: href, inTapTask: true });
    await expect(escapeOverlay(page)).toBeHidden();
  });

  test('a Deeplink tap whose pop-out does not take (the page still showing after the wait) reveals and lands on the answer in the app', async ({ page }) => {
    const link = byMode.deeplink;
    await serveVariant(page, deeplinkDefault);
    const navigations = await recordNavigations(page);
    const reveals = watchReveals(page);
    await openProfile(page);

    const reveal = nextReveal(page);
    await card(page, link).click();
    await expect.poll(() => popOuts(navigations)).toHaveLength(1);
    const destination = await realUrlOf(await reveal);
    await expect(page).toHaveURL(destination);
    expect(reveals.map((url) => url.searchParams.get('id'))).toEqual([link.id]);
    expect(popOuts(navigations)).toHaveLength(1); // the fallback navigates plainly, with no second pop-out
  });

  for (const [left, leave] of [
    ['goes hidden', () => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
      document.dispatchEvent(new Event('visibilitychange'));
    }],
    ['loses focus', () => { window.dispatchEvent(new Event('blur')); }],
  ] as const) {
    test(`a Deeplink tap whose page ${left} before the wait is up (Safari took over) makes no Reveal`, async ({ page }) => {
      const link = byMode.deeplink;
      await serveVariant(page, deeplinkDefault);
      const navigations = await recordNavigations(page);
      const reveals = watchReveals(page);
      await openProfile(page);

      await card(page, link).click();
      await expect.poll(() => popOuts(navigations)).toHaveLength(1);
      await page.evaluate(leave);
      await page.waitForTimeout(FALLBACK_WAIT_MS + 1000);
      expect(reveals).toHaveLength(0);
      await expect(page).toHaveURL(`/${username}`);
    });
  }

  test('the Adult Link set to Direct shows the Age Gate, then Continue (18+) reveals and navigates plainly', async ({ page }) => {
    await serveVariant(page, (json) => { directDefault(json); linkIn(json, adult.id).mode = 'direct'; });
    const navigations = await recordNavigations(page);
    const reveals = watchReveals(page);
    await openProfile(page);

    await card(page, adult).click();
    await expect(page.getByRole('heading', { name: 'Mature Content Disclaimer' })).toBeVisible();
    expect(reveals).toHaveLength(0);
    await expect(page.locator('#continueBtn')).not.toHaveAttribute('href'); // no anchor tap: Continue Reveals

    const reveal = nextReveal(page);
    await page.getByRole('button', { name: 'Continue (18+)' }).click();
    const destination = await realUrlOf(await reveal);
    await expect(page).toHaveURL(destination);
    expect(reveals.map((url) => url.searchParams.get('id'))).toEqual([adult.id]);
    expect(navigations.at(-1)?.url).toBe(destination);
    expect(popOuts(navigations)).toEqual([]);
  });

  for (const profileMode of ['escape_ig', 'sideways']) {
    test(`a default of ${profileMode}, on a Profile that holds the Direct and Deeplink Links, shows the Escape Overlay on open, with Close, and pops nothing out`, async ({ page }) => {
      const link = byMode.direct;
      await serveVariant(page, (json) => { withDefault(profileMode)(json); });
      const navigations = await recordNavigations(page);
      await openProfile(page);
      await expect(escapeOverlay(page)).toBeVisible();
      expect(await page.evaluate(() => getComputedStyle(document.body).overflow)).toBe('hidden'); // blocks scrolling

      await closeButton(page).click();
      await expect(escapeOverlay(page)).toBeHidden();
      expect(await page.evaluate(() => getComputedStyle(document.body).overflow)).not.toBe('hidden');

      await card(page, link).click();
      await expect.poll(() => navigations.at(-1)?.url).toBe(link.url);
      expect(popOuts(navigations)).toEqual([]);
    });
  }

  test('every Link set to Escape Mode with an escape_ig default shows the Escape Overlay on open, with no Close', async ({ page }) => {
    await serveVariant(page, (json) => {
      withDefault('escape_ig')(json);
      json.links.forEach((l) => { l.mode = 'escape_ig'; });
    });
    await openProfile(page);
    await expect(escapeOverlay(page)).toBeVisible();
    await expect(closeButton(page)).toHaveCount(0);
  });

  test('a default of deeplink_open pops out on open to the Profile, with no Escape Overlay', async ({ page }) => {
    await serveVariant(page, deeplinkAtOpen);
    const navigations = await recordNavigations(page);
    await openProfile(page);
    await expect.poll(() => popOuts(navigations)).toEqual([igExt(`https://${new URL(page.url()).host}/${username}`)]);
    await expect(escapeOverlay(page)).toBeHidden();
  });

  for (const [variant, edit] of [
    ['an unrecognised mode', (l: Link) => { l.mode = 'sideways'; }],
    ['its mode removed', (l: Link) => { delete l.mode; }],
  ] as const) {
    test(`Direct default: the Deeplink Link with ${variant} navigates plainly to its url, with no Reveal and nothing popped out`, async ({ page }) => {
      const link = byMode.deeplink;
      const url = rUrlOf(link); // the url v2 serves for a Link without a Deeplink mode (ticket 16, second ASSUMPTION)
      await serveVariant(page, (json) => { directDefault(json); edit(linkIn(json, link.id)); linkIn(json, link.id).url = url; });
      const navigations = await recordNavigations(page);
      const reveals = watchReveals(page);
      await openProfile(page);
      await card(page, link).click();
      await expect.poll(() => navigations.at(-1)?.url).toBe(url);
      expect(reveals).toHaveLength(0);
      expect(popOuts(navigations)).toEqual([]);
    });
  }

  test('Direct default: from /{username}/{code}, a tap on the Escape Link fires instagram://extbrowser/ to the escape target in the tap\'s own task', async ({ page }) => {
    const link = byMode.escape_ig;
    const { navigations, target } = await tapEscapeFromCode(page);
    const escapeLink = igExt(target);

    await expect.poll(() => popOuts(navigations)).toEqual([escapeLink]);
    expect(navigations).toContainEqual({ url: escapeLink, inTapTask: true });
    await expect(page).toHaveURL(`/${username}/${TC}?link=${link.id}`);
  });

  test('after the Escape tap, the Escape Overlay shows every way out aimed at the escape target, and no Reveal is made', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const { reveals, target } = await tapEscapeFromCode(page);
    await expect(escapeOverlay(page)).toBeVisible();
    await expect(escapeOverlay(page).getByRole('link', { name: 'Open in browser' })).toHaveAttribute('href', igExt(target));
    // No "Try another way", and no x-safari- link anywhere: Instagram drops it (a real iPhone, 2026-10-06)
    await expect(escapeOverlay(page).getByRole('link', { name: 'Try another way' })).toHaveCount(0);
    await expect(page.locator('a[href^="x-safari-"]')).toHaveCount(0);
    await expect(escapeOverlay(page).getByText(target, { exact: true })).toBeVisible();
    await expect(escapeOverlay(page).getByRole('button', { name: 'Copy link' })).toBeVisible();
    await expect(escapeOverlay(page).getByText('Open in External Browser')).toBeVisible(); // the app-menu instruction
    await expect(closeButton(page)).toBeVisible();
    expect(reveals).toHaveLength(0);
    await page.screenshot({ path: SCREENSHOT, animations: 'disabled' });
  });

  test('tapping "Open in browser" records its href as a navigation', async ({ page }) => {
    const { navigations, target } = await tapEscapeFromCode(page);
    const openInBrowser = igExt(target);
    await expect.poll(() => popOuts(navigations)).toEqual([openInBrowser]); // the tap's own Escape

    await escapeOverlay(page).getByRole('link', { name: 'Open in browser' }).click();
    await expect.poll(() => popOuts(navigations)).toEqual([openInBrowser, openInBrowser]);
  });

  test('"Close" hides the Escape Overlay and puts the address back to /{username}/{code}', async ({ page }) => {
    const link = byMode.escape_ig;
    await tapEscapeFromCode(page);
    await expect(page).toHaveURL(`/${username}/${TC}?link=${link.id}`);
    await closeButton(page).click();
    await expect(escapeOverlay(page)).toBeHidden();
    await expect(page).toHaveURL(`/${username}/${TC}`);
  });

  test('/{username}/{code}?link={Escape Link Id} reveals, then bounces straight to the Destination through instagram://extbrowser/, as v1\'s ?link= did, with the Escape Overlay aimed at that address, with Close', async ({ page }) => {
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
    await expect(escapeOverlay(page).getByRole('link', { name: 'Open in browser' })).toHaveAttribute('href', igExt(target));
    await expect(escapeOverlay(page).getByText(target, { exact: true })).toBeVisible();
    await expect(closeButton(page)).toBeVisible();
    await expect(page).toHaveURL(address);
    await expect.poll(() => popOuts(navigations)).toEqual([igExt(`https://${strip(destination)}`)]);
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
    await expect.poll(() => popOuts(navigations)).toEqual([igExt(`https://${host}/${username}/${TC}?link=${link.id}`)]);
    await expect(page).toHaveURL(`/${username}/${TC}?link=${link.id}`);
  });

  test('after an earlier visit to /{username}/{code}, the overlay on open with an escape_ig default points the address and "Open in browser" at the code; Close puts /{username} back', async ({ page }) => {
    await serveVariant(page, (json) => { withDefault('escape_ig')(json); });
    await openProfile(page, `/${username}/${TC}`);
    await openProfile(page, `/${username}`);
    const host = new URL(page.url()).host;

    await expect(escapeOverlay(page)).toBeVisible();
    await expect(page).toHaveURL(`/${username}/${TC}`);
    await expect(escapeOverlay(page).getByRole('link', { name: 'Open in browser' }))
      .toHaveAttribute('href', igExt(`https://${host}/${username}/${TC}`));
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

  test('the Adult Link set to Escape Mode shows the Age Gate, then Continue (18+) fires instagram://extbrowser/ to the escape target in its own task, with no Reveal', async ({ page }) => {
    const { navigations, reveals, target } = await tapEscapeFromCode(page, adult, adultEscape);
    await expect(ageGate(page)).toBeVisible();
    const escapeLink = igExt(target);
    expect(popOuts(navigations)).toEqual([]);

    await page.getByRole('button', { name: 'Continue (18+)' }).click();
    await expect.poll(() => popOuts(navigations)).toEqual([escapeLink]);
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

  // The hop: the recorded target, decoded from Instagram's extbrowser link, opened in a fresh browser context with a desktop User-Agent
  // (fresh storage, as in a System Browser). The stand-in is plain http, so the target's https path and query are
  // opened on the stand-in, once the target is checked to be https on the host that served the page.
  // The fresh context serves the same Profile edit as the In-App page, so both browsers see one Profile.
  async function hop(browser: Browser, inApp: Page, recorded: string, edit: (json: ProfileJson) => void) {
    expect(recorded.startsWith(IG_EXT_BROWSER)).toBe(true);
    const target = new URL(poppedTo(recorded));
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
    await expect.poll(() => popOuts(navigations)).toHaveLength(1);

    const fresh = await hop(browser, page, popOuts(navigations)[0], directDefault);
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
    await expect.poll(() => popOuts(navigations)).toHaveLength(1);

    const fresh = await hop(browser, page, popOuts(navigations)[0], edit);
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

  test('Deeplink default: a Link with its mode removed pops out to its Link Shortcut from the tap, with no Reveal before it', async ({ page }) => {
    const link = byMode.escape_ig;
    await serveVariant(page, (json) => { withDefault('deeplink')(json); delete linkIn(json, link.id).mode; });
    const navigations = await recordNavigations(page);
    const reveals = watchReveals(page);
    await openProfile(page);
    const href = igExt(`https://${new URL(page.url()).host}/${username}?link=${link.id}`);
    await card(page, link).click();
    await expect.poll(() => popOuts(navigations)).toEqual([href]);
    expect(navigations).toContainEqual({ url: href, inTapTask: true });
    expect(reveals).toHaveLength(0);
  });
});

test.describe('In-App Browser (Android Instagram)', () => {
  test.use({ userAgent: UA.androidInstagram });

  test('from /{username}/{code}, a tap on the Escape Link fires v1\'s Chrome intent, in the tap\'s own task; "Open in browser" carries it; no "Try another way"', async ({ page }) => {
    const link = byMode.escape_ig;
    const { navigations } = await tapEscapeFromCode(page);
    const host = new URL(page.url()).host;
    // The spec's Android escape link, spelled out: v1's performBounce intent, with no fallback.
    const intent = `intent://${host}/${username}/${TC}?link=${link.id}#Intent;scheme=https;package=com.android.chrome;end`;

    await expect.poll(() => intents(navigations)).toEqual([intent]);
    expect(navigations).toContainEqual({ url: intent, inTapTask: true });
    await expect(escapeOverlay(page)).toBeVisible();
    const openInBrowser = escapeOverlay(page).getByRole('link', { name: 'Open in browser' });
    await expect(openInBrowser).toHaveAttribute('href', intent);
    await expect(escapeOverlay(page).getByRole('link', { name: 'Try another way' })).toHaveCount(0);

    await openInBrowser.click();
    await expect.poll(() => intents(navigations)).toEqual([intent, intent]);
  });

  // The Chrome intent for a Link's Link Shortcut on the page's host: v1's performBounce intent.
  const deeplinkIntent = (page: Page, link: Link) => popTo(UA.androidInstagram, `https://${new URL(page.url()).host}/${username}?link=${link.id}`);

  test('a tap on the Deeplink Link fires v1\'s Chrome intent for its Link Shortcut in the tap\'s own task, with no Reveal before it', async ({ page }) => {
    const link = byMode.deeplink;
    await serveVariant(page, deeplinkDefault);
    const navigations = await recordNavigations(page);
    const reveals = watchReveals(page);
    await openProfile(page);

    const intent = deeplinkIntent(page, link);
    await expect(card(page, link)).toHaveAttribute('href', intent); // a real anchor tap, as "Open in browser" is
    await card(page, link).click();
    await expect.poll(() => intents(navigations)).toEqual([intent]);
    expect(navigations).toContainEqual({ url: intent, inTapTask: true });
    expect(reveals).toHaveLength(0);
  });

  for (const [variant, edit] of [
    ['inheriting a deeplink default', (json: ProfileJson) => { deeplinkDefault(json); linkIn(json, adult.id).mode = 'deeplink'; }],
    ['on a deeplink_open default', (json: ProfileJson) => { deeplinkAtOpen(json); delete linkIn(json, adult.id).mode; }],
  ] as const) {
    test(`the Adult Link ${variant} shows the Age Gate, then Continue (18+) fires v1's Chrome intent for its Link Shortcut in its own task, with no Reveal before it`, async ({ page }) => {
      await serveVariant(page, edit);
      const navigations = await recordNavigations(page);
      const reveals = watchReveals(page);
      await alreadyPoppedOut(page); // so a deeplink_open default's pop-out on open is not in the way of the tap's
      await openProfile(page);

      await card(page, adult).click();
      await expect(page.getByRole('heading', { name: 'Mature Content Disclaimer' })).toBeVisible();
      expect(reveals).toHaveLength(0);

      const intent = deeplinkIntent(page, adult);
      await expect(page.locator('#continueBtn')).toHaveAttribute('href', intent); // a real anchor tap, as "Open in browser" is
      await page.getByRole('button', { name: 'Continue (18+)' }).click();
      await expect.poll(() => intents(navigations)).toEqual([intent]);
      expect(navigations).toContainEqual({ url: intent, inTapTask: true });
      expect(reveals).toHaveLength(0);
    });
  }
});

// Pop-out to Safari/Chrome (real-device report, 2026-10-06): an In-App Browser drops a pop-out that follows a request, so
// Escape and Deeplink Modes leave it with v1's links (linkme_clone3/script.js, performBounce) only from the Visitor's own tap or
// at load, never after a Reveal: on open, once per tab, for Deeplink at open; at load, once per tab, for a Link Shortcut (to
// the page's own address, where Safari or Chrome Reveals); and on a tap. v1 bounced only Instagram; TikTok is v2's extension
// of it. iOS Instagram is covered above, Android Instagram's taps too, so only what is left is run for Instagram here.
for (const [app, platform, userAgent, withTaps] of [
  ['Instagram', 'android', UA.androidInstagram, false],
  ['TikTok', 'ios', UA.iosTiktok, true],
  ['TikTok', 'android', UA.tiktok, true],
] as const) {
  test.describe(`Pop-out to Safari/Chrome (${platform} ${app})`, () => {
    test.use({ userAgent });

    test('Escape default: the Escape Overlay shows on open, and nothing pops out', async ({ page }) => {
      await serveVariant(page, (json) => { withDefault('escape_ig')(json); });
      const navigations = await recordNavigations(page);
      await openProfile(page, `/${username}/${TC}`);
      await expect(escapeOverlay(page)).toBeVisible();
      await page.waitForLoadState('networkidle');
      expect(popOuts(navigations)).toEqual([]);
    });

    test('Deeplink at open: the page pops out on open to the Profile with its code, with no Escape Overlay', async ({ page }) => {
      await serveVariant(page, deeplinkAtOpen);
      const navigations = await recordNavigations(page);
      await openProfile(page, `/${username}/${TC}`);
      const host = new URL(page.url()).host;
      await expect.poll(() => popOuts(navigations)).toEqual([popTo(userAgent, `https://${host}/${username}/${TC}`)]);
      await expect(escapeOverlay(page)).toBeHidden();
    });

    test('Deeplink at open: a second load in the same tab does not pop out again', async ({ page }) => {
      await serveVariant(page, deeplinkAtOpen);
      const navigations = await recordNavigations(page);
      await openProfile(page);
      await expect.poll(() => popOuts(navigations)).toHaveLength(1);
      await page.reload();
      await expect(page.locator('#displayName')).toHaveText(served.profile.displayName);
      await page.waitForLoadState('networkidle');
      expect(popOuts(navigations)).toHaveLength(1);
    });

    for (const mode of ['escape_ig', 'deeplink'] as const) {
      test(`?link={${mode} Link Id} reveals on open, then bounces straight to the Destination, as v1's \`?link=\` did`, async ({ page }) => {
        const link = byMode[mode];
        await serveVariant(page, defaultFor(mode));
        const navigations = await recordNavigations(page);
        const reveal = nextReveal(page);
        await openProfile(page, `/${username}/${TC}?link=${link.id}`);
        const destination = await realUrlOf(await reveal);
        await expect.poll(() => popOuts(navigations)).toEqual([popTo(userAgent, destination)]);
      });

      test(`?link={${mode} Link Id} bounces again on a second load in the same tab, as v1's \`?link=\` did`, async ({ page }) => {
        const link = byMode[mode];
        await serveVariant(page, defaultFor(mode));
        const navigations = await recordNavigations(page);
        const first = nextReveal(page);
        await openProfile(page, `/${username}?link=${link.id}`);
        const destination = await realUrlOf(await first);
        await expect.poll(() => popOuts(navigations)).toEqual([popTo(userAgent, destination)]);
        const second = nextReveal(page);
        await page.reload();
        await realUrlOf(await second);
        await expect.poll(() => popOuts(navigations)).toEqual([popTo(userAgent, destination), popTo(userAgent, destination)]);
      });
    }

    if (withTaps) {
      test('Direct default: a tap on the Escape Link pops out to that Link from the tap itself, with no Reveal', async ({ page }) => {
        const { navigations, reveals, target } = await tapEscapeFromCode(page);
        const href = popTo(userAgent, target);
        await expect.poll(() => popOuts(navigations)).toEqual([href]);
        expect(navigations).toContainEqual({ url: href, inTapTask: true });
        expect(reveals).toHaveLength(0);
      });

      test('Deeplink default: a tap on the Deeplink Link pops out to that Link from the tap itself, with no Reveal before it', async ({ page }) => {
        const { navigations, reveals, target } = await tapEscapeFromCode(page, byMode.deeplink, deeplinkDefault);
        const href = popTo(userAgent, target);
        await expect.poll(() => popOuts(navigations)).toEqual([href]);
        expect(navigations).toContainEqual({ url: href, inTapTask: true });
        expect(reveals).toHaveLength(0);
      });
    }
  });
}

// Any app's webview is an In-App Browser: by an app token beyond Instagram, Facebook and TikTok (Snapchat), or by its shape
// alone (a bare iOS WKWebView, an Android `; wv)` WebView). A Deeplink tap there pops out from the tap.
for (const [name, platform, userAgent] of [
  ['iOS Snapchat', 'ios', UA.iosSnapchat],
  ['bare iOS WKWebView', 'ios', UA.iosWebView],
  ['Android WebView', 'android', UA.androidWebView],
] as const) {
  test(`In-App Browser (${name}): a tap on the Deeplink Link pops out from the tap, with no Reveal before it`, async ({ browser }) => {
    const context = await browser.newContext({ userAgent, baseURL: test.info().project.use.baseURL });
    const page = await context.newPage();
    await fenceNetwork(page);
    const { navigations, reveals, target } = await tapEscapeFromCode(page, byMode.deeplink, deeplinkDefault);
    const href = popTo(userAgent, target);
    await expect.poll(() => popOuts(navigations)).toEqual([href]);
    expect(navigations).toContainEqual({ url: href, inTapTask: true });
    expect(reveals).toHaveLength(0);
    await context.close();
  });
}

// Escape Mode keeps the plan's narrower pattern, unchanged: in a Snapchat or bare webview there is no Escape Overlay on open,
// and the Escape Link navigates plainly.
for (const [name, userAgent] of [
  ['iOS Snapchat', UA.iosSnapchat],
  ['bare iOS WKWebView', UA.iosWebView],
  ['Android WebView', UA.androidWebView],
] as const) {
  test(`${name}: an Escape default shows no Escape Overlay, and the Escape Link navigates plainly`, async ({ browser }) => {
    const context = await browser.newContext({ userAgent, baseURL: test.info().project.use.baseURL });
    const page = await context.newPage();
    await fenceNetwork(page);
    await serveVariant(page, (json) => { withDefault('escape_ig')(json); });
    const navigations = await recordNavigations(page);
    await openProfile(page);
    await expect(escapeOverlay(page)).toBeHidden();
    await card(page, byMode.escape_ig).click();
    await expect.poll(() => navigations.at(-1)?.url).toBe(byMode.escape_ig.url);
    expect(popOuts(navigations)).toEqual([]);
    await context.close();
  });
}

// The System Browsers never pop out: not on open under any default, not on a tap, not on a Link Shortcut. A Deeplink Link
// there reveals and lands on the answer, as on a desktop.
for (const [browser, userAgent] of [
  ['desktop Chrome', devices['Desktop Chrome'].userAgent],
  ['iOS Safari', UA.iosSafari],
  ['iOS Chrome', UA.iosChrome],
  ['Android Chrome', UA.androidChrome],
] as const) {
  test.describe(`System Browser (${browser}), never popping out`, () => {
    test.use({ userAgent });

    for (const profileMode of ['escape_ig', 'deeplink', 'deeplink_open']) {
      test(`${profileMode} default: nothing pops out on open and no Escape Overlay shows`, async ({ page }) => {
        await serveVariant(page, (json) => { withDefault(profileMode)(json); });
        const navigations = await recordNavigations(page);
        await openProfile(page, `/${username}/${TC}`);
        await page.waitForLoadState('networkidle');
        expect(popOuts(navigations)).toEqual([]);
        await expect(escapeOverlay(page)).toBeHidden();
      });
    }

    // On Android, a Deeplink Destination is handed to the app that owns it by the package-less app-link intent, with the web
    // page as its fallback; elsewhere the page lands on it.
    const landsOn = async (page: Page, navigations: Navigation[], destination: string) => {
      if (browser === 'Android Chrome') {
        await expect.poll(() => intents(navigations))
          .toEqual([`intent://${strip(destination)}#Intent;scheme=https;S.browser_fallback_url=${encodeURIComponent(destination)};end`]);
      } else {
        await expect(page).toHaveURL(destination);
        expect(intents(navigations)).toEqual([]);
      }
      expect(xSafari(navigations)).toEqual([]);
      expect(intents(navigations).filter((url) => url.includes('package=com.android.chrome'))).toEqual([]);
    };

    test('deeplink_open default: a tap on the Deeplink Link reveals, then lands on the answer, with no pop-out to Safari or Chrome', async ({ page }) => {
      await serveVariant(page, deeplinkAtOpen);
      const navigations = await recordNavigations(page);
      await openProfile(page);
      const reveal = nextReveal(page);
      await card(page, byMode.deeplink).click();
      await landsOn(page, navigations, await realUrlOf(await reveal));
    });

    test('deeplink default: no card and no Age Gate Continue is an anchor to Safari or Chrome', async ({ page }) => {
      await serveVariant(page, (json) => { withDefault('deeplink')(json); delete linkIn(json, adult.id).mode; });
      await openProfile(page, `/${username}/${TC}`);
      await card(page, adult).click();
      await expect(page.getByRole('heading', { name: 'Mature Content Disclaimer' })).toBeVisible();
      await expect(page.locator('#continueBtn')).not.toHaveAttribute('href');
      await expect(page.locator('a[href^="x-safari-"], a[href^="instagram:"], a[href^="intent:"]')).toHaveCount(0);
    });

    test('?link={Deeplink Link Id} reveals on load, then lands on the answer, with no pop-out to Safari or Chrome', async ({ page }) => {
      await serveVariant(page, deeplinkDefault);
      const navigations = await recordNavigations(page);
      const reveals = watchReveals(page);
      const reveal = nextReveal(page);
      await page.goto(`/${username}/${TC}?link=${byMode.deeplink.id}`);
      await landsOn(page, navigations, await realUrlOf(await reveal));
      expect(reveals.map((url) => url.searchParams.get('id'))).toEqual([byMode.deeplink.id]);
    });
  });
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

// Deeplink on tap and Deeplink at open, on Instagram, where v1 shows the Escape Overlay on open: an Escape default shows the
// overlay on open and pops out only from the Visitor's tap, as v1's overlay waits for the Visitor; a Deeplink on tap default
// pops out only from a tap; Deeplink at open, as the default or any Link's Mode, pops out on open, once per tab.
for (const [platform, userAgent] of [
  ['ios', UA.iosInstagram],
  ['android', UA.androidInstagram],
] as const) {
  test.describe(`Deeplink on tap and at open (${platform} Instagram)`, () => {
    test.use({ userAgent });

    test('Escape default: the Escape Overlay shows on open with nothing popped out, and "Open in browser" pops out to the Profile from the tap', async ({ page }) => {
      await serveVariant(page, (json) => { withDefault('escape_ig')(json); });
      const navigations = await recordNavigations(page);
      await openProfile(page, `/${username}/${TC}`);
      await expect(escapeOverlay(page)).toBeVisible();
      await page.waitForLoadState('networkidle');
      expect(popOuts(navigations)).toEqual([]);

      const href = popTo(userAgent, `https://${new URL(page.url()).host}/${username}/${TC}`);
      await escapeOverlay(page).getByRole('link', { name: 'Open in browser' }).click();
      await expect.poll(() => popOuts(navigations)).toEqual([href]);
      expect(navigations).toContainEqual({ url: href, inTapTask: true });
    });

    test('Escape default: a tap on the Escape Link, once the overlay is closed, pops out to that Link', async ({ page }) => {
      const link = byMode.escape_ig;
      await serveVariant(page, (json) => { withDefault('escape_ig')(json); });
      const navigations = await recordNavigations(page);
      await openProfile(page, `/${username}/${TC}`);
      await closeButton(page).click();
      await card(page, link).click();
      const href = popTo(userAgent, `https://${new URL(page.url()).host}/${username}/${TC}?link=${link.id}`);
      await expect.poll(() => popOuts(navigations)).toEqual([href]);
      expect(navigations).toContainEqual({ url: href, inTapTask: true });
    });

    test('Deeplink on tap default: nothing pops out on open and no Escape Overlay shows', async ({ page }) => {
      await serveVariant(page, (json) => { withDefault('deeplink')(json); });
      const navigations = await recordNavigations(page);
      await openProfile(page);
      await page.waitForLoadState('networkidle');
      expect(popOuts(navigations)).toEqual([]);
      await expect(escapeOverlay(page)).toBeHidden();
    });

    test('Deeplink at open default: the page pops out on open to the Profile, with no Escape Overlay', async ({ page }) => {
      await serveVariant(page, deeplinkAtOpen);
      const navigations = await recordNavigations(page);
      await openProfile(page);
      await expect.poll(() => popOuts(navigations)).toEqual([popTo(userAgent, `https://${new URL(page.url()).host}/${username}`)]);
      await expect(escapeOverlay(page)).toBeHidden();
    });

    test('Direct default with a Link carrying deeplink_open (a Profile default only): nothing pops out on open', async ({ page }) => {
      await serveVariant(page, (json) => { directDefault(json); linkIn(json, byMode.deeplink.id).mode = 'deeplink_open'; });
      const navigations = await recordNavigations(page);
      await openProfile(page);
      await page.waitForLoadState('networkidle');
      expect(popOuts(navigations)).toEqual([]);
    });

    test('Deeplink at open default, once the tab has popped out: a tap on a Link pops out to that Link from the tap, as Deeplink on tap does', async ({ page }) => {
      const link = byMode.direct;
      await serveVariant(page, (json) => { deeplinkAtOpen(json); delete linkIn(json, link.id).mode; });
      await alreadyPoppedOut(page);
      const navigations = await recordNavigations(page);
      const reveals = watchReveals(page);
      await openProfile(page);
      await page.waitForLoadState('networkidle');
      expect(popOuts(navigations)).toEqual([]);
      await card(page, link).click();
      const href = popTo(userAgent, `https://${new URL(page.url()).host}/${username}?link=${link.id}`);
      await expect.poll(() => popOuts(navigations)).toEqual([href]);
      expect(navigations).toContainEqual({ url: href, inTapTask: true });
      expect(reveals).toHaveLength(0);
    });

    test('Direct default: nothing pops out on open', async ({ page }) => {
      await serveVariant(page, directDefault);
      const navigations = await recordNavigations(page);
      await openProfile(page);
      await page.waitForLoadState('networkidle');
      expect(popOuts(navigations)).toEqual([]);
      await expect(escapeOverlay(page)).toBeHidden();
    });

    for (const profileMode of ['escape_ig', 'deeplink_open']) {
      for (const mode of ['escape_ig', 'deeplink'] as const) {
        test(`${profileMode} default: ?link={${mode} Link Id} still reveals on load and bounces straight to the Destination, with no pop-out to the Profile`, async ({ page }) => {
          const link = byMode[mode];
          await serveVariant(page, (json) => { withDefault(profileMode)(json); });
          const navigations = await recordNavigations(page);
          const reveal = nextReveal(page);
          await openProfile(page, `/${username}/${TC}?link=${link.id}`);
          const destination = await realUrlOf(await reveal);
          await expect.poll(() => popOuts(navigations)).toEqual([popTo(userAgent, destination)]);
        });
      }
    }

    test('the Escape Overlay reads as v1\'s does in Instagram: the Instagram icon and "Instagram restricts some links"', async ({ page }) => {
      await serveVariant(page, (json) => { withDefault('escape_ig')(json); });
      await openProfile(page);
      await expect(escapeOverlay(page)).toBeVisible();
      await expect(escapeOverlay(page).getByText('Instagram restricts some links.', { exact: false })).toBeVisible();
      expect(await page.locator('#igIcon').evaluate((el) => (el as HTMLElement).style.display)).not.toBe('none');
    });
  });
}

test.describe('the Escape Overlay outside Instagram (TikTok, v2\'s extension)', () => {
  test.use({ userAgent: UA.tiktok });

  test('reads "This app restricts some links", with no Instagram icon', async ({ page }) => {
    await serveVariant(page, (json) => { withDefault('escape_ig')(json); });
    await openProfile(page);
    await expect(escapeOverlay(page).getByText('This app restricts some links.', { exact: false })).toBeVisible();
    expect(await page.locator('#igIcon').evaluate((el) => (el as HTMLElement).style.display)).toBe('none');
  });
});

// The redirect paths end to end: each pop-out hands Safari or Chrome an https address; that address is opened in a fresh
// System Browser context (fresh storage, the platform's own browser User-Agent) and followed to the external Destination,
// through Reveal or through `/r/{Link Id}`'s redirect. The stack is plain http, so a target on the host under test is opened
// at its path and query; an external Destination is answered by the network fence. `/r`'s redirect hop is never routed
// (playwright.config.ts): it shows as the failed request to the Destination, redirected from `/r/{Link Id}`.
for (const [platform, inAppUA, systemUA] of [
  ['ios', UA.iosInstagram, UA.iosSafari],
  ['android', UA.androidInstagram, UA.androidChrome],
] as const) {
  test.describe(`Redirect paths (${platform} Instagram, then ${platform === 'ios' ? 'Safari' : 'Chrome'})`, () => {
    test.use({ userAgent: inAppUA });

    async function systemBrowser(browser: Browser, edit: (json: ProfileJson) => void) {
      const context = await browser.newContext({ userAgent: systemUA, baseURL: test.info().project.use.baseURL });
      const page = await context.newPage();
      await fenceNetwork(page);
      await serveVariant(page, edit);
      return page;
    }
    // A target on the host under test, as the path and query the stack serves.
    const onStack = (inApp: Page, url: string) => {
      const target = new URL(url);
      expect(target.protocol).toBe('https:');
      expect(target.host).toBe(new URL(inApp.url()).host);
      return target.pathname + target.search;
    };
    const redirectHop = (page: Page, link: Link) => page.waitForEvent('requestfailed', (req) => req.redirectedFrom()?.url() === link.url);

    test('(a) a Deeplink tap in the app pops out to its Link Shortcut, where the System Browser reveals and lands on the Destination', async ({ page, browser }) => {
      const link = byMode.deeplink;
      await serveVariant(page, deeplinkDefault);
      const navigations = await recordNavigations(page);
      await openProfile(page);
      await card(page, link).click();
      await expect.poll(() => popOuts(navigations)).toEqual([popTo(inAppUA, `https://${new URL(page.url()).host}/${username}?link=${link.id}`)]);

      const system = await systemBrowser(browser, deeplinkDefault);
      const systemNavigations = await recordNavigations(system);
      const reveal = nextReveal(system);
      await system.goto(onStack(page, poppedTo(popOuts(navigations)[0])));
      const destination = await realUrlOf(await reveal);
      expect(destination).toBe(destinationOf(link));
      // Chrome on Android hands a Deeplink Destination to the app that owns it, the web page as the fallback; Safari lands on it
      if (platform === 'android') {
        await expect.poll(() => intents(systemNavigations))
          .toEqual([`intent://${strip(destination)}#Intent;scheme=https;S.browser_fallback_url=${encodeURIComponent(destination)};end`]);
      } else {
        await expect(system).toHaveURL(destination);
      }
      await system.context().close();
    });

    for (const mode of ['escape_ig', 'deeplink'] as const) {
      test(`(b) ?link={${mode} Link Id} in the app reveals, then pops out to exactly the Destination, which the System Browser lands on`, async ({ page, browser }) => {
        const link = byMode[mode];
        await serveVariant(page, defaultFor(mode));
        const navigations = await recordNavigations(page);
        const reveal = nextReveal(page);
        await openProfile(page, `/${username}/${TC}?link=${link.id}`);
        const destination = await realUrlOf(await reveal);
        expect(destination).toBe(destinationOf(link)); // a non-Adult Link's Destination, untouched by the Tracking Code
        await expect.poll(() => popOuts(navigations)).toEqual([popTo(inAppUA, destination)]);

        const system = await systemBrowser(browser, defaultFor(mode));
        await system.goto(poppedTo(popOuts(navigations)[0]));
        await expect(system).toHaveURL(destination);
        await system.context().close();
      });
    }

    test('(c) Deeplink at open: the app pops out to the Profile, where a tap on the Escape Link goes through /r to its Destination', async ({ page, browser }) => {
      const link = byMode.escape_ig;
      await serveVariant(page, deeplinkAtOpen);
      const navigations = await recordNavigations(page);
      await openProfile(page, `/${username}/${TC}`);
      await expect.poll(() => popOuts(navigations)).toHaveLength(1);

      const system = await systemBrowser(browser, deeplinkAtOpen);
      const reveals = watchReveals(system);
      const systemPops = await recordNavigations(system);
      await openProfile(system, onStack(page, poppedTo(popOuts(navigations)[0])));
      await expect(escapeOverlay(system)).toBeHidden(); // no Escape Overlay in a System Browser
      const hop = redirectHop(system, link);
      await card(system, link).click();
      expect((await hop).url()).toBe(destinationOf(link));
      expect(popOuts(systemPops)).toEqual([]);
      expect(reveals).toHaveLength(0);
      await system.context().close();
    });

    test('(d) a Direct Link navigates plainly in the app, through /r to its Destination, with nothing popped out', async ({ page }) => {
      const link = byMode.direct;
      await serveVariant(page, (json) => { withDefault('escape_ig')(json); });
      const navigations = await recordNavigations(page);
      await openProfile(page);
      await closeButton(page).click();
      const hop = redirectHop(page, link);
      await card(page, link).click();
      expect((await hop).url()).toBe(destinationOf(link));
      expect(popOuts(navigations)).toEqual([]);
    });

    test('(e) the Adult Link hits the Age Gate in the app, and again in the System Browser after the pop-out, where Continue (18+) reveals and lands', async ({ page, browser }) => {
      await serveVariant(page, deeplinkAtOpen);
      const navigations = await recordNavigations(page);
      await openProfile(page, `/${username}/${TC}`);
      await expect.poll(() => popOuts(navigations)).toHaveLength(1);
      await card(page, adult).click();
      await expect(page.getByRole('heading', { name: 'Mature Content Disclaimer' })).toBeVisible();

      const system = await systemBrowser(browser, deeplinkAtOpen);
      await openProfile(system, onStack(page, poppedTo(popOuts(navigations)[0])));
      await card(system, adult).click();
      await expect(system.getByRole('heading', { name: 'Mature Content Disclaimer' })).toBeVisible();
      const reveal = nextReveal(system);
      await system.getByRole('button', { name: 'Continue (18+)' }).click();
      const destination = await realUrlOf(await reveal);
      await expect(system).toHaveURL(destination);
      await system.context().close();
    });
  });
}
