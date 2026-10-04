import { test, expect, devices, type Page, type Response } from '@playwright/test';
import { join } from 'node:path';

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

// Navigation recorder: the destination of every Navigation API navigate event, x-safari- and other app
// schemes included. The page stays put on those schemes, so nothing leaves the machine.
// Same-task mark: a capture-phase click listener sets a flag that a zero-delay timer clears, so a navigation
// started after any request or other wait following the tap is not marked (story 15).
type Navigation = { url: string; inTapTask: boolean };
async function recordNavigations(page: Page) {
  const destinations: Navigation[] = [];
  await page.exposeFunction('__recordNavigation', (url: string, inTapTask: boolean) => {
    destinations.push({ url, inTapTask });
  });
  await page.addInitScript(() => {
    const w = window as unknown as { navigation: EventTarget; __recordNavigation: (url: string, inTapTask: boolean) => void };
    let inTapTask = false;
    w.addEventListener('click', () => {
      inTapTask = true;
      setTimeout(() => { inTapTask = false; }, 0);
    }, true);
    w.navigation.addEventListener('navigate', (event) => {
      w.__recordNavigation((event as unknown as { destination: { url: string } }).destination.url, inTapTask);
    });
  });
  return destinations;
}
const xSafari = (destinations: Navigation[]) => destinations.map(({ url }) => url).filter((url) => url.startsWith('x-safari-'));

const escapeOverlay = (page: Page) => page.locator('#igOverlay');
const closeButton = (page: Page) => escapeOverlay(page).getByRole('button', { name: 'Close' });

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

// In-App Browsers (plan section 7): User-Agents per describe.
const UA = {
  iosInstagram:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) ' +
    'Mobile/15E148 Instagram 300.0.0.0.0 (iPhone14,2; iOS 17_0; en_US; en-US; scale=3.00; 1170x2532; 0)',
  androidInstagram:
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 ' +
    'Chrome/120.0.0.0 Mobile Safari/537.36 Instagram 300.0.0.0.0 Android (34/14; 420dpi; 1080x2400; Google; Pixel 8)',
  fban:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) ' +
    'Mobile/15E148 [FBAN/FBIOS;FBAV/440.0.0.0;FBBV/1;FBDV/iPhone14,2;FBMD/iPhone;FBSN/iOS;FBSV/17.0;FBSS/3;FBCR/;FBID/phone;FBLC/en_US;FBOP/5]',
  tiktok:
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 ' +
    'Chrome/120.0.0.0 Mobile Safari/537.36 TikTok 33.0.0 BytedanceWebview/d8a21c6',
  iosSafari:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) ' +
    'Version/17.0 Mobile/15E148 Safari/604.1',
  androidChrome:
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) ' +
    'Chrome/120.0.0.0 Mobile Safari/537.36',
};

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
      await expect(page).toHaveURL(link.url!);
      expect(navigations.at(-1)?.url).toBe(link.url);
      expect(navigations.map(({ url }) => url).filter((url) => !url.startsWith('http'))).toEqual([]);
    });
  });
}

test.describe('In-App Browser (iOS Instagram)', () => {
  test.use({ userAgent: UA.iosInstagram });
  const directDefault = (json: ProfileJson) => { json.profile.mode = 'direct'; };

  test('Direct default: no Escape Overlay on open, the address keeps its code, and the Direct Link navigates plainly', async ({ page }) => {
    const link = byMode.direct;
    await serveVariant(page, directDefault);
    const navigations = await recordNavigations(page);
    await openProfile(page, `/${username}/${TC}`);
    await expect(escapeOverlay(page)).toBeHidden();
    await expect(page).toHaveURL(`/${username}/${TC}`);

    await card(page, link).click();
    await expect(page).toHaveURL(link.url!);
    expect(navigations.at(-1)?.url).toBe(link.url);
    expect(xSafari(navigations)).toEqual([]);
  });

  test('a tap on the Deeplink Link makes a Reveal request, then navigates plainly to the answer', async ({ page }) => {
    const link = byMode.deeplink;
    await serveVariant(page, directDefault);
    const navigations = await recordNavigations(page);
    const reveals = watchReveals(page);
    await openProfile(page);

    const reveal = nextReveal(page);
    await card(page, link).click();
    const destination = await realUrlOf(await reveal);
    await expect(page).toHaveURL(destination);
    expect(reveals.map((url) => url.searchParams.get('id'))).toEqual([link.id]);
    expect(navigations.at(-1)?.url).toBe(destination);
    expect(xSafari(navigations)).toEqual([]);
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
    test(`a default of ${profileMode} on a Profile that holds the Direct and Deeplink Links shows the Escape Overlay on open, with Close`, async ({ page }) => {
      const link = byMode.direct;
      await serveVariant(page, (json) => { json.profile.mode = profileMode; });
      const navigations = await recordNavigations(page);
      await openProfile(page);
      await expect(escapeOverlay(page)).toBeVisible();
      expect(await page.evaluate(() => getComputedStyle(document.body).overflow)).toBe('hidden'); // blocks scrolling

      await closeButton(page).click();
      await expect(escapeOverlay(page)).toBeHidden();
      expect(await page.evaluate(() => getComputedStyle(document.body).overflow)).not.toBe('hidden');

      await card(page, link).click();
      await expect(page).toHaveURL(link.url!);
      expect(navigations.at(-1)?.url).toBe(link.url);
      expect(xSafari(navigations)).toEqual([]);
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

  test('a default of deeplink shows no Escape Overlay on open', async ({ page }) => {
    await serveVariant(page, (json) => { json.profile.mode = 'deeplink'; });
    await openProfile(page);
    await expect(escapeOverlay(page)).toBeHidden();
  });

  for (const [variant, edit] of [
    ['an unrecognised mode', (l: Link) => { l.mode = 'sideways'; }],
    ['its mode removed', (l: Link) => { delete l.mode; }],
  ] as const) {
    test(`Direct default: the Deeplink Link with ${variant} navigates plainly to its url, with no Reveal and nothing x-safari- recorded`, async ({ page }) => {
      const link = byMode.deeplink;
      await serveVariant(page, (json) => { directDefault(json); edit(linkIn(json, link.id)); });
      const navigations = await recordNavigations(page);
      const reveals = watchReveals(page);
      await openProfile(page);
      await card(page, link).click();
      await expect(page).toHaveURL(link.url!);
      expect(reveals).toHaveLength(0);
      expect(navigations.at(-1)?.url).toBe(link.url);
      expect(xSafari(navigations)).toEqual([]);
    });
  }

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

  test('Deeplink default: a Link with its mode removed makes a Reveal request', async ({ page }) => {
    const link = byMode.escape_ig;
    await serveVariant(page, (json) => { json.profile.mode = 'deeplink'; delete linkIn(json, link.id).mode; });
    const reveals = watchReveals(page);
    await openProfile(page);
    const reveal = nextReveal(page);
    await card(page, link).click();
    await expect(page).toHaveURL(await realUrlOf(await reveal));
    expect(reveals.map((url) => url.searchParams.get('id'))).toEqual([link.id]);
  });
});
