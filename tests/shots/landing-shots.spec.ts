import { test, expect, type Browser, type BrowserContextOptions, type Page } from '@playwright/test';
import { mkdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { type Creator, featured, heading, mailedLink, onLocalStack, signUp, VERIFY } from '../e2e/helpers';

// The landing page's four screenshots (docs/spec/editor-redesign.md, section 6, Screenshot slots): a demo Creator, Mia, signed up
// through the Editor on the local test stack, with three non-adult Links on example.com and stock icons; her Editor, her public
// Profile and her Stats after a few local Visitors. Each shot is a PNG in .scratch/editor-ui/shots-run/png/, converted to WebP
// with app/'s own sharp into app/public/images/landing/, at the width and height its <img> in landing.html declares.
// Ruling 11: before each shot every local origin in the page's text reads https://ofl.ink, so no localhost reaches the landing.
// Every context is fenced to the stack's host, and the root config's resolver rule keeps a /r redirect's next hop local.
const ROOT = join(__dirname, '..', '..');
const PNG_DIR = join(ROOT, '.scratch', 'editor-ui', 'shots-run', 'png');
const OUT = join(ROOT, 'app', 'public', 'images', 'landing');
const LANDING = readFileSync(join(ROOT, 'app', 'public', 'landing.html'), 'utf8');
const sharp = createRequire(join(ROOT, 'app', 'package.json'))('sharp');
const MAX_BYTES = 200_000; // the brief: WebP at q80, each 200 KB or less
const PUBLIC = { origin: 'https://ofl.ink', host: 'ofl.ink' };
const PHONE: BrowserContextOptions = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 };
const DESKTOP: BrowserContextOptions = { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 };

const MIA: Creator = { email: 'mia@example.com', password: 'throwaway-mia-shots', username: 'mia' };
const LINKS = [
  { title: 'New video every Friday', destination: 'https://example.com/videos', icon: 'Twitch' },
  { title: 'My shop', destination: 'https://example.com/shop', icon: 'Link' },
  { title: 'Photos on Instagram', destination: 'https://example.com/photos', icon: 'Instagram' },
];
// The local Visitors behind the Stats shot: a country, sent as CF-IPCountry, and the Link each taps, or none.
const VISITS: [string, string | null][] = [
  ['US', LINKS[0].title], ['US', LINKS[1].title], ['GB', LINKS[0].title], ['DE', null],
  ['US', null], ['SI', LINKS[2].title], ['CA', LINKS[0].title], ['GB', null],
];
const STUB = '<!DOCTYPE html><title>Stub</title><h1>Stub Destination</h1>';

// A fresh context that reaches only the stack's host; every other request is aborted.
async function fenced(browser: Browser, origin: string, options: BrowserContextOptions) {
  const context = await browser.newContext(options);
  await context.route((url) => url.host !== new URL(origin).host, (route) => route.abort('blockedbyclient'));
  return context;
}


async function fillLink(page: Page, link: (typeof LINKS)[number]) {
  await page.getByLabel('Title').fill(link.title);
  await page.getByLabel('Destination').fill(link.destination);
  await page.getByLabel('Icon').selectOption({ label: link.icon });
  await page.getByRole('button', { name: 'Save link' }).click();
}

// Settled for a shot: network idle, fonts loaded, every image on screen decoded; then the local origin rewritten (ruling 11).
async function settle(page: Page, origin: string) {
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => [...document.images]
    .filter((img) => { const r = img.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.top < innerHeight; })
    .every((img) => img.complete && img.naturalWidth > 0));
  const local = { origin, host: new URL(origin).host };
  await page.evaluate(({ local, to }) => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      node.nodeValue = node.nodeValue!.split(local.origin).join(to.origin).split(local.host).join(to.host);
    }
  }, { local, to: PUBLIC });
  expect(await page.evaluate(() => document.body.innerText), 'the local origin in the shot').not.toContain(local.host);
}

// A full-viewport shot.
async function shoot(page: Page, origin: string, name: string) {
  await settle(page, origin);
  const png = join(PNG_DIR, `${name}.png`);
  await page.screenshot({ path: png, animations: 'disabled' });
  await toWebp(png, name);
}

// A cropped shot: `clip` is in CSS pixels, measured after settle() by the caller, so the overlay's dead black band is left out.
async function shootClip(page: Page, origin: string, name: string, clip: (p: Page) => Promise<{ x: number; y: number; width: number; height: number }>) {
  await settle(page, origin);
  const png = join(PNG_DIR, `${name}.png`);
  await page.screenshot({ path: png, animations: 'disabled', clip: await clip(page) });
  await toWebp(png, name);
}


// The PNG as WebP at q80, stepping the quality down until it fits MAX_BYTES, at exactly its <img>'s width and height.
async function toWebp(png: string, name: string) {
  const slot = LANDING.match(new RegExp(`src="/images/landing/${name}\\.webp" width="(\\d+)" height="(\\d+)"`));
  expect(slot, `the ${name} slot in landing.html`).not.toBeNull();
  const out = join(OUT, `${name}.webp`);
  let quality = 80;
  let info = await sharp(png).webp({ quality }).toFile(out);
  while (info.size > MAX_BYTES && quality > 50) info = await sharp(png).webp({ quality: (quality -= 5) }).toFile(out);
  const { width, height } = await sharp(out).metadata();
  console.log(`${name}.webp ${width}x${height} ${info.size} bytes (q${quality})`);
  expect([width, height]).toEqual([Number(slot![1]), Number(slot![2])]);
  expect(info.size).toBeLessThanOrEqual(MAX_BYTES);
}

test('the landing\'s four screenshots of a demo Creator', async ({ browser, baseURL }) => {
  test.skip(!onLocalStack(), 'the demo Creator is made on the local test stack, with its mail catcher');
  test.setTimeout(300_000);
  mkdirSync(PNG_DIR, { recursive: true });
  mkdirSync(OUT, { recursive: true });
  const origin = new URL(baseURL!).origin;

  // Mia signs up, verifies by the mailed link, fills in her Profile and adds her Links, as Onboarding asks.
  const phone = await fenced(browser, origin, PHONE);
  const page = await phone.newPage();
  await signUp(page, MIA);
  await expect(heading(page, VERIFY)).toBeVisible();
  await page.goto(await mailedLink(MIA.email, '/edit/verify'));
  await expect(heading(page, 'Email verified')).toBeVisible();
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(heading(page, 'Your Profile')).toBeVisible();
  await page.getByLabel('Display name').fill('Mia');
  await page.getByLabel('Bio').fill('Home baker sharing recipes, videos and my little shop.');
  await page.getByLabel('Profile picture').setInputFiles(join(ROOT, 'tests', 'images', 'photo.jpg'));
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(heading(page, 'Add your first Link')).toBeVisible();
  await fillLink(page, LINKS[0]);
  await expect(heading(page, 'Your page is live')).toBeVisible();
  await page.getByRole('button', { name: 'Go to the Editor' }).click();
  for (const link of LINKS.slice(1)) {
    await expect(heading(page, 'Edit Profile')).toBeVisible();
    await page.getByRole('button', { name: 'Add link' }).click();
    await expect(heading(page, 'Add link')).toBeVisible();
    await fillLink(page, link);
  }
  await expect(heading(page, 'Edit Profile')).toBeVisible();
  await expect(featured(page)).toHaveText(LINKS.map((l) => l.title));

  // The Editor's home on a phone, from the top, and on a laptop.
  await page.goto('/edit/home');
  await expect(featured(page)).toHaveText(LINKS.map((l) => l.title));
  await shoot(page, origin, 'editor-links-mobile');
  const laptop = await fenced(browser, origin, { ...DESKTOP, storageState: await phone.storageState() });
  const desk = await laptop.newPage();
  await desk.goto('/edit/home');
  await expect(featured(desk)).toHaveText(LINKS.map((l) => l.title));
  await shoot(desk, origin, 'editor-desktop');
  await laptop.close();

  // Mia's public Profile, as a Visitor sees it.
  const visitorPhone = await fenced(browser, origin, PHONE);
  const profile = await visitorPhone.newPage();
  await profile.goto(`/${MIA.username}`);
  await expect(profile.locator('.link-card .link-title')).toHaveText(LINKS.map((l) => l.title));
  await shoot(profile, origin, 'profile-mobile');
  await visitorPhone.close();

  // The Escape Overlay, the screen Escape Mode shows a Visitor inside the Instagram in-app browser: its UA (an `Instagram` token
  // script.js matches) makes her Escape Mode Profile show the on-load screen. Its up-arrow (to the ··· menu) and Instagram mark
  // are inline SVG in index.html, so they render under the strict fence with no webfont to wait on. The shot is cropped to the
  // content (top of frame down to the "Copy link" button) so the overlay's top-aligned dead black band is left out. Her
  // example.com Links keep any Destination out of the shot, and the escape target shown is her own Profile URL, rewritten to
  // https://ofl.ink by settle().
  const IG_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 300.0.0.0.0 (iPhone14,3; iOS 17_0; en_US; en-US; scale=3.00; 1170x2532; 000000000)';
  const igPhone = await fenced(browser, origin, { ...PHONE, userAgent: IG_UA });
  const ig = await igPhone.newPage();
  await ig.goto(`/${MIA.username}`);
  await expect(ig.locator('#igOverlay')).toBeVisible();
  await expect(ig.locator('#igCopyBtn')).toBeVisible();
  await shootClip(ig, origin, 'escape-overlay-mobile', async (p) => {
    const bottom = await p.locator('#igCopyBtn').evaluate((node) => node.getBoundingClientRect().bottom);
    return { x: 0, y: 0, width: 390, height: Math.ceil(bottom + 24) };
  });
  await igPhone.close();

  // Local Visitors: a Page View each, and a Click through Reveal for those that tap, its onward navigation fulfilled with a stub.
  for (const [country, title] of VISITS) {
    const context = await fenced(browser, origin, { ...PHONE, extraHTTPHeaders: { 'CF-IPCountry': country } });
    const visitor = await context.newPage();
    const ping = visitor.waitForResponse((res) => res.request().method() === 'POST' && new URL(res.url()).pathname === `/v/${MIA.username}`);
    await visitor.goto(`/${MIA.username}`);
    expect((await ping).status(), 'the Page View Ping').toBe(204);
    if (title) {
      await visitor.route((url) => url.origin !== origin, (route) => route.fulfill({ status: 200, contentType: 'text/html', body: STUB }));
      const reveal = visitor.waitForResponse((res) => new URL(res.url()).pathname === '/.netlify/functions/reveal');
      await visitor.locator('.link-card', { hasText: title }).click();
      expect((await reveal).status(), `Reveal for ${title}`).toBe(200);
      await expect(visitor.getByRole('heading', { name: 'Stub Destination' })).toBeVisible();
    }
    await context.close();
  }

  // Her Stats on the default 7D range.
  await page.goto('/edit/stats');
  await expect(heading(page, 'Stats')).toBeVisible();
  await expect(page.getByRole('button', { name: '7D', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await shoot(page, origin, 'editor-stats-mobile');

  // One adult Link, added now so profile-mobile (shot earlier) is unchanged, to trigger the 18+ Age Gate.
  await page.goto('/edit/home');
  await page.getByRole('button', { name: 'Add link' }).click();
  await expect(heading(page, 'Add link')).toBeVisible();
  await page.getByLabel('Title').fill('Backstage');
  await page.getByLabel('Destination').fill('https://example.com/backstage');
  await page.getByLabel('Icon').selectOption({ label: 'Link' });
  await page.getByLabel('18+ Age Gate').check();
  await page.getByRole('button', { name: 'Save link' }).click();
  await expect(heading(page, 'Edit Profile')).toBeVisible();
  await phone.close();

  // The 18+ Age Gate (#overlay, the Mature Content Disclaimer), as a Visitor sees it on tapping the adult Link. A plain phone
  // (not an in-app browser) so the tap opens the overlay in place. Cropped to the card. (Its lock/close glyphs are FontAwesome,
  // blocked by the fence, so they stay blank rather than render as tofu; the card still reads as the 18+ check.)
  const agePhone = await fenced(browser, origin, PHONE);
  const ageView = await agePhone.newPage();
  await ageView.goto(`/${MIA.username}`);
  await ageView.locator('.link-card', { hasText: 'Backstage' }).click();
  await expect(ageView.locator('#overlay')).toBeVisible();
  await expect(ageView.locator('#overlay .overlay-content')).toBeVisible();
  await shootClip(ageView, origin, 'age-gate-mobile', async (p) => {
    const box = await p.locator('#overlay .overlay-content').evaluate((node) => {
      const r = node.getBoundingClientRect();
      return { top: r.top, bottom: r.bottom };
    });
    return { x: 0, y: Math.max(0, Math.floor(box.top - 40)), width: 390, height: Math.ceil(box.bottom - box.top + 80) };
  });
  await agePhone.close();
});
