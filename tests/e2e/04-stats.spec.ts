import { devices, expect, test, type Browser, type Page } from '@playwright/test';
import { join } from 'node:path';
import { CREATORS } from '../stats-seed';
import { asSuperuser, ENV, heading, INSTAGRAM_UA, logIn, only, onLocalStack, phoneContext, superuserToken } from './helpers';

// Phase 4 (docs/spec/phase-04-stats.md, Testing Decisions): one seam, the running v2 stack at Playwright's baseURL. Every Visitor
// is a fresh browser context with its country sent as `CF-IPCountry`; `/r` is sent on for real without following its redirect
// and fulfilled with a local stub page (followThroughR, below). The Stats Creator reads Stats at 390×844, by role.
// The tests share the seeded Profiles (tests/stats-seed.js), which only this spec visits, so they run serially and count by
// delta, each one also making traffic its assertion must leave out. It runs in the chromium project, so before the
// reveal-guard project (playwright.config.ts) whose used-up window would refuse its `/r` calls.
// Ticket 33: test 1, test 6, and the Page View Ping's unknown Username and GET.
// A run that straddles 00:00 UTC can fail a daily-row assertion; rerun it.
const SCREENSHOT = join(__dirname, '..', '..', '.scratch', 'goal_ai', 'shots', '04-stats.png');
const today = () => new Date().toISOString().slice(0, 10); // the UTC day

// The seeded Stats Creator and Other Creator (tests/stats-seed.js), each with its password from the test stack's environment.
const withPassword = <C extends { passwordVar: string }>(c: C) => ({ ...c, password: ENV[c.passwordVar] });
const stats = withPassword(CREATORS.stats);
const other = withPassword(CREATORS.other);

// A Visitor in a fresh phone context loads `/{username}`, with `country` sent as `CF-IPCountry` and an optional User-Agent, and
// the spec waits for the Page View Ping's 204 before the Visitor acts. The caller closes the page's context.
async function countedVisit(browser: Browser, origin: string, username: string, { country, userAgent }: { country?: string; userAgent?: string } = {}) {
  const context = await phoneContext(browser, { origin, userAgent, headers: country ? { 'CF-IPCountry': country } : undefined });
  const visitor = await context.newPage();
  const ping = visitor.waitForResponse((res) => res.request().method() === 'POST' && new URL(res.url()).pathname === `/v/${username}`);
  await visitor.goto(`/${username}`);
  expect((await ping).status(), `the Page View Ping for ${username}`).toBe(204);
  return visitor;
}

// The Visitor clicks the Link titled `title`. Its `/r` request is sent on for real without following the redirect, which must be
// a 302 to `destination`, and the navigation is fulfilled with a local stub page, so no browser looks up a `.test` host.
const STUB = '<!DOCTYPE html><title>Stub</title><h1>Stub Destination</h1>';
async function followThroughR(visitor: Page, title: string, destination: string) {
  let answer: { status: number; location?: string } | undefined;
  await visitor.route('**/r/*', async (route) => {
    const res = await route.fetch({ maxRedirects: 0 });
    answer = { status: res.status(), location: res.headers().location };
    await route.fulfill({ status: 200, contentType: 'text/html', body: STUB });
  });
  await visitor.locator('.link-card', { hasText: title }).click();
  await expect(visitor.getByRole('heading', { name: 'Stub Destination' })).toBeVisible();
  expect(answer, `/r for ${title}`).toEqual({ status: 302, location: destination });
}

// Every request the page sends to the events collection: a Stats page must send none (spec, Testing Decisions).
function watchEvents(page: Page) {
  const sent: string[] = [];
  page.on('request', (req) => {
    if (new URL(req.url()).pathname.startsWith('/api/collections/events')) sent.push(req.url());
  });
  return sent;
}

// The Stats page from the Editor's navigation, once it shows.
async function openStats(page: Page) {
  await page.getByRole('navigation', { name: 'Creator' }).getByRole('link', { name: 'Stats' }).click();
  await expect(heading(page, 'Stats')).toBeVisible();
}

// What the Stats page shows, read by role: each card's number under its name, and each table as rows keyed by their row header,
// each row's cells keyed by their column header.
type StatsTable = Record<string, Record<string, string>>;
type StatsRead = { cards: Record<string, string>; daily: StatsTable; links: StatsTable; countries: StatsTable };
async function readStats(page: Page): Promise<StatsRead> {
  await expect(heading(page, 'Stats')).toBeVisible();
  const card = async (name: string) => (await page.getByRole('region', { name, exact: true }).getByRole('paragraph').textContent()) || '';
  const table = async (name: string) => {
    const shown = page.getByRole('table', { name, exact: true });
    const columns = await shown.getByRole('columnheader').allTextContents();
    const rows: StatsTable = {};
    for (const row of await shown.getByRole('row').all()) {
      if (!(await row.getByRole('rowheader').count())) continue; // the header row
      const cells = [await row.getByRole('rowheader').textContent(), ...(await row.getByRole('cell').allTextContents())];
      rows[cells[0] || ''] = Object.fromEntries(columns.map((column, i) => [column, cells[i] || '']));
    }
    return rows;
  };
  return {
    cards: { 'Page Views': await card('Page Views'), Clicks: await card('Clicks'), CTR: await card('CTR') },
    daily: await table('Daily'),
    links: await table('Links'),
    countries: await table('Countries'),
  };
}

// A number as Stats shows it; a row the page does not list reads 0.
const count = (text: string | undefined) => Number(text || 0);

// CTR as the spec defines it: Clicks ÷ Page Views as a percentage with one decimal, or "—" with no Page Views.
const ctr = (clicks: number, views: number) => (views ? `${((clicks / views) * 100).toFixed(1)}%` : '—');

// The Operator in PocketBase's admin UI: the newest Event of the Profile at `username`, a count of Events, and the events
// collection's field names.
// An Event holds no Destination (spec, Schema), so its record may reach the test.
async function newestEvent(username: string) {
  const token = await superuserToken();
  const profile = await only(token, 'profiles', `username='${username}'`);
  const query = `perPage=1&sort=-created&filter=${encodeURIComponent(`profile='${profile.id}'`)}`;
  return (await (await asSuperuser(token, `/api/collections/events/records?${query}`)).json()).items[0];
}
// How many Events `filter` finds, as the Operator reads them.
async function eventCount(filter: string): Promise<number> {
  const query = `perPage=1&filter=${encodeURIComponent(filter)}`;
  return (await (await asSuperuser(await superuserToken(), `/api/collections/events/records?${query}`)).json()).totalItems;
}
async function eventFields(): Promise<string[]> {
  const events = await (await asSuperuser(await superuserToken(), '/api/collections/events')).json();
  return events.fields.map((f: { name: string }) => f.name);
}

test.describe.configure({ mode: 'serial' });
test.skip(!onLocalStack(), 'the seeded Creators and the Operator\'s PocketBase port are on the local test stack only');

// Every CTR the page shows equals Clicks ÷ Page Views as displayed. A Link's Page Views are its Profile's (spec, Stats page).
function expectCtrs(read: StatsRead) {
  const views = count(read.cards['Page Views']);
  expect(read.cards.CTR, 'CTR card').toBe(ctr(count(read.cards.Clicks), views));
  for (const [name, row] of Object.entries(read.links)) expect(row.CTR, `Links: ${name}`).toBe(ctr(count(row.Clicks), views));
  for (const [name, row] of Object.entries(read.countries)) expect(row.CTR, `Countries: ${name}`).toBe(ctr(count(row.Clicks), count(row['Page Views'])));
}

test('1. a Page View and a Click through /r reach the Stats page, paged at any size, with no horizontal overflow at 390×844', async ({ browser, baseURL }) => {
  const origin = new URL(baseURL!).origin;
  const page = await (await phoneContext(browser, { origin })).newPage();
  const events = watchEvents(page);
  const pageSizes: string[] = [];
  page.on('request', (req) => {
    const url = new URL(req.url());
    if (url.pathname === '/api/collections/dailyStats/records') pageSizes.push(url.searchParams.get('perPage') || '');
  });
  await logIn(page, stats);
  await expect(heading(page, 'Edit Profile')).toBeVisible();
  await openStats(page);
  const before = await readStats(page);

  // Left out of the Stats Creator's numbers: the Other Profile's own Page View and Click, from the same country.
  const elsewhere = await countedVisit(browser, origin, other.username, { country: 'SI' });
  await followThroughR(elsewhere, other.direct.title, other.direct.destination);
  await elsewhere.context().close();
  const visitor = await countedVisit(browser, origin, stats.username, { country: 'SI' });
  await followThroughR(visitor, stats.direct.title, stats.direct.destination);
  await visitor.context().close();

  await page.reload();
  const after = await readStats(page);
  const day = today();
  const tracked = (read: StatsRead) => ({
    'Page Views card': count(read.cards['Page Views']),
    'Clicks card': count(read.cards.Clicks),
    'today\'s Page Views': count(read.daily[day]?.['Page Views']),
    'today\'s Clicks': count(read.daily[day]?.Clicks),
    'the Direct Mode Link\'s Clicks': count(read.links[stats.direct.title]?.Clicks),
    'SI Page Views': count(read.countries.SI?.['Page Views']),
    'SI Clicks': count(read.countries.SI?.Clicks),
  });
  const [was, now] = [tracked(before), tracked(after)];
  expect(Object.fromEntries(Object.entries(now).map(([name, n]) => [name, n - was[name as keyof typeof was]]))).toEqual({
    'Page Views card': 1,
    'Clicks card': 1,
    'today\'s Page Views': 1,
    'today\'s Clicks': 1,
    'the Direct Mode Link\'s Clicks': 1,
    'SI Page Views': 1,
    'SI Clicks': 1,
  });
  expectCtrs(before);
  expectCtrs(after);
  expect(pageSizes.length > 0 && pageSizes.every((size) => size === '500'), 'every dailyStats page asked for 500 rows').toBe(true);

  // Reloaded with every dailyStats page cut to one row, the page asks for more pages and reads the same.
  await page.route('**/api/collections/dailyStats/records?*', (route) => {
    const url = new URL(route.request().url());
    url.searchParams.set('perPage', '1');
    return route.continue({ url: url.toString() });
  });
  const asked = pageSizes.length;
  await page.reload();
  expect(await readStats(page)).toEqual(after);
  expect(pageSizes.length - asked, 'dailyStats pages requested at one row each').toBeGreaterThan(1);

  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), 'no horizontal overflow').toBe(true);
  await page.screenshot({ path: SCREENSHOT, fullPage: true });
  expect(events, 'requests to the events collection').toEqual([]);
  await page.context().close();
});

// In-App Browsers (plan section 4's patterns), beside 00-smoke's Instagram one in helpers.ts. The Threads User-Agent also says
// Instagram, so it reads threads only if Threads is checked first (spec, Contracts, In-App Browser).
const UA = {
  facebook:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) ' +
    'Mobile/15E148 [FBAN/FBIOS;FBAV/440.0.0.0;FBBV/1;FBDV/iPhone14,2;FBMD/iPhone;FBSN/iOS;FBSV/17.0;FBSS/3;FBLC/en_US]',
  threads:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) ' +
    'Mobile/15E148 Threads 300.0.0.0 Instagram 300.0.0.0.0 (iPhone14,2; iOS 17_0; en_US; en-US; scale=3.00; 1170x2532; 0)',
  tiktok:
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 ' +
    'Chrome/120.0.0.0 Mobile Safari/537.36 TikTok 33.0.0 BytedanceWebview/d8a21c6',
};

test('6. each load records its In-App Browser, and an Event holds nothing but its seven fields', async ({ browser, baseURL }) => {
  const origin = new URL(baseURL!).origin;
  const loads: [string, string][] = [
    [INSTAGRAM_UA, 'instagram'],
    [UA.facebook, 'facebook'],
    [UA.threads, 'threads'],
    [UA.tiktok, 'tiktok'],
    [devices['Desktop Chrome'].userAgent, ''],
  ];
  for (const [userAgent, inAppBrowser] of loads) {
    await (await countedVisit(browser, origin, stats.username, { country: 'SI', userAgent })).context().close();
    const event = await newestEvent(stats.username);
    expect({ kind: event.kind, inAppBrowser: event.inAppBrowser }, userAgent).toEqual({ kind: 'page_view', inAppBrowser });
  }
  expect((await eventFields()).sort()).toEqual(['country', 'created', 'id', 'inAppBrowser', 'kind', 'link', 'profile']);
});

test('the Page View Ping: an unknown Username is 404 and records nothing, and a GET under /v/ reaches the Profile route', async ({ request }) => {
  // A country no other request sends, so an Event recorded for this ping, on any Profile, would carry it.
  const marker = 'ZQ';
  const ping = await request.post(`/v/nobody_${Date.now().toString(36)}`, { headers: { 'CF-IPCountry': marker } });
  expect(ping.status()).toBe(404);
  expect(await eventCount(`country='${marker}'`), 'Events recorded for the unknown Username').toBe(0);

  const viaV = await request.get(`/v/${stats.username}`);
  const profile = await request.get(`/${stats.username}`);
  expect(viaV.status()).toBe(200);
  expect(viaV.headers()['content-type']).toBe(profile.headers()['content-type']);
  expect(await viaV.text(), 'the Profile route\'s page').toBe(await profile.text());
});
