import { devices, expect, test, type APIRequestContext, type Browser, type Page } from '@playwright/test';
import { join } from 'node:path';
import { CREATORS } from '../stats-seed';
import {
  asSuperuser, createOwnerlessProfile, ENV, heading, INSTAGRAM_UA, logIn, only, onLocalStack, operator, phoneContext, proxy, recordIds, superuserToken,
} from './helpers';

// Phase 4 (docs/spec/phase-04-stats.md, Testing Decisions): one seam, the running v2 stack at Playwright's baseURL. Every Visitor
// is a fresh browser context with its country sent as `CF-IPCountry`; `/r` is sent on for real without following its redirect
// and fulfilled with a local stub page (throughR, below). The Stats Creator reads Stats at 390×844, by role.
// The tests share the seeded Profiles (tests/stats-seed.js), which only this spec visits, so they run serially and count by
// delta, each one also making traffic its assertion must leave out. It runs in the chromium project, so before the
// reveal-guard project (playwright.config.ts) whose used-up window would refuse its `/r` calls.
// Ticket 33: test 1, test 6, and the Page View Ping's unknown Username and GET.
// Ticket 34: tests 2, 3 and 5, and test 4's first Visitor; a Destination handed out by Reveal is a fresh navigation, fulfilled
// with the same stub page (throughReveal, below).
// Ticket 35: the Profile JSON's `profile.id` and test 8.
// A run that straddles 00:00 UTC can fail a daily-row assertion; rerun it.
const SCREENSHOT = join(__dirname, '..', '..', '.scratch', 'goal_ai', 'shots', '04-stats.png');
const today = () => new Date().toISOString().slice(0, 10); // the UTC day
const DAY_MS = 86_400_000;
// The `n` UTC days ending on `last` ("YYYY-MM-DD"), oldest first.
function daysEnding(last: string, n: number) {
  return Array.from({ length: n }, (_, i) => {
    const day = new Date(`${last}T00:00:00Z`);
    day.setUTCDate(day.getUTCDate() - (n - 1 - i));
    return day.toISOString().slice(0, 10);
  });
}

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

// `act` sends the Visitor to `/r`. Its request is sent on for real without following the redirect, which must be a 302 to
// `destination`, and the navigation is fulfilled with a local stub page, so no browser looks up a `.test` host.
const STUB = '<!DOCTYPE html><title>Stub</title><h1>Stub Destination</h1>';
const landedOnStub = (visitor: Page) => expect(visitor.getByRole('heading', { name: 'Stub Destination' })).toBeVisible();
async function throughR(visitor: Page, destination: string, act: () => Promise<unknown>) {
  let answer: { status: number; location?: string } | undefined;
  await visitor.route('**/r/*', async (route) => {
    const res = await route.fetch({ maxRedirects: 0 });
    answer = { status: res.status(), location: res.headers().location };
    await route.fulfill({ status: 200, contentType: 'text/html', body: STUB });
  });
  await act();
  await landedOnStub(visitor);
  expect(answer, `/r to ${destination}`).toEqual({ status: 302, location: destination });
}
const linkCard = (visitor: Page, title: string) => visitor.locator('.link-card', { hasText: title });
// The Visitor clicks the Link titled `title`, which goes through `/r`.
const followThroughR = (visitor: Page, title: string, destination: string) => throughR(visitor, destination, () => linkCard(visitor, title).click());

// `act` makes the page Reveal a Link. The spec waits for Reveal's 200, and the page's onward navigation off `origin`, a fresh
// navigation to the Destination Reveal handed out, is fulfilled with the stub page and must be at `destination`. Returns the
// Tracking Code the Reveal request carried, or null for none.
async function throughReveal(visitor: Page, origin: string, destination: string, act: () => Promise<unknown>) {
  await visitor.route((url) => url.origin !== origin, (route) => route.fulfill({ status: 200, contentType: 'text/html', body: STUB }));
  const reveal = visitor.waitForResponse((res) => new URL(res.url()).pathname === '/.netlify/functions/reveal');
  await act();
  expect((await reveal).status(), `Reveal for ${destination}`).toBe(200);
  await landedOnStub(visitor);
  expect(visitor.url()).toBe(destination);
  return new URL((await reveal).url()).searchParams.get('trackingId');
}
// The Visitor clicks the Adult Link titled `title` and passes the Age Gate with "Continue (18+)", which Reveals it. Returns the
// Tracking Code that Reveal request carried, or null for none.
const passGateToStub = (visitor: Page, origin: string, title: string, destination: string) =>
  throughReveal(visitor, origin, destination, async () => {
    await linkCard(visitor, title).click();
    await expect(visitor.getByRole('heading', { name: 'Mature Content Disclaimer' })).toBeVisible();
    await visitor.getByRole('button', { name: 'Continue (18+)' }).click();
  });

// The Link Id of the Link titled `title`, as the public Profile JSON serves it.
async function servedLinkId(request: APIRequestContext, username: string, title: string) {
  const served: { links: { id: string; title: string }[] } = await (await request.get(`/api/profiles/${username}.json`)).json();
  return served.links.find((l) => l.title === title)?.id;
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

// The Stats Creator signed in at 390×844 and on the Stats page, with every request the page sends to the events collection
// (it must send none: spec, Testing Decisions) and every `dailyStats` list request it sends, in order.
// `timezoneId` and `time` (ms since the epoch) set the browser's time zone and fix its clock before the Creator logs in.
async function statsCreatorOnStats(browser: Browser, origin: string, { timezoneId, time }: { timezoneId?: string; time?: number } = {}) {
  const page = await (await phoneContext(browser, { origin, timezoneId })).newPage();
  if (time !== undefined) await page.clock.setFixedTime(time);
  const events = watchEvents(page);
  const statsRequests: URL[] = [];
  page.on('request', (req) => {
    const url = new URL(req.url());
    if (url.pathname === '/api/collections/dailyStats/records') statsRequests.push(url);
  });
  await logIn(page, stats);
  await expect(heading(page, 'Edit Profile')).toBeVisible();
  await openStats(page);
  return { page, events, statsRequests };
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

// What the Stats page shows under the Link and Country filters, each chosen by its option's label.
const ALL_COUNTRIES = 'All countries';
async function readFiltered(page: Page, link: string, country: string) {
  await page.getByRole('combobox', { name: 'Link', exact: true }).selectOption({ label: link });
  await page.getByRole('combobox', { name: 'Country', exact: true }).selectOption({ label: country });
  return readStats(page);
}

// A number as Stats shows it; a row the page does not list reads 0.
const count = (text: string | undefined) => Number(text || 0);
// How much each named number rose from `was` to `now`.
const rise = (was: Record<string, number>, now: Record<string, number>) => Object.fromEntries(Object.entries(now).map(([name, n]) => [name, n - was[name]]));

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
  const { page, events, statsRequests } = await statsCreatorOnStats(browser, origin);
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
  expect(rise(tracked(before), tracked(after))).toEqual({
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
  const pageSizes = statsRequests.map((url) => url.searchParams.get('perPage'));
  expect(pageSizes.length > 0 && pageSizes.every((size) => size === '500'), 'every dailyStats page asked for 500 rows').toBe(true);

  // Reloaded with every dailyStats page cut to one row, the page asks for more pages and reads the same.
  await page.route('**/api/collections/dailyStats/records?*', (route) => {
    const url = new URL(route.request().url());
    url.searchParams.set('perPage', '1');
    return route.continue({ url: url.toString() });
  });
  const asked = statsRequests.length;
  await page.reload();
  expect(await readStats(page)).toEqual(after);
  expect(statsRequests.length - asked, 'dailyStats pages requested at one row each').toBeGreaterThan(1);

  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), 'no horizontal overflow').toBe(true);
  await page.screenshot({ path: SCREENSHOT, fullPage: true });
  expect(events, 'requests to the events collection').toEqual([]);
  await page.context().close();
});

// The Stats Creator's `dailyStats` rows for one Link, country and day, listed through the proxy with their own token, as the
// Stats page lists them.
async function dailyRows(request: APIRequestContext, linkTitle: string, country: string, day: string) {
  const auth = await proxy(request).post('users/auth-with-password', { identity: stats.email, password: stats.password });
  expect(auth.status(), 'the Stats Creator signs in').toBe(200);
  const as = proxy(request, (await auth.json()).token);
  const links = await (await as.get(`links/records?fields=id&filter=${encodeURIComponent(`title='${linkTitle}'`)}`)).json();
  expect(links.items.length, linkTitle).toBe(1);
  const filter = encodeURIComponent(`link='${links.items[0].id}' && country='${country}' && day='${day}'`);
  const res = await as.get(`dailyStats/records?perPage=500&filter=${filter}`);
  expect(res.status()).toBe(200);
  const listed: { items: { views: number; clicks: number }[] } = await res.json();
  return listed.items;
}

test('2. Adult Link Clicks through the Age Gate count, and the Link and Country filters narrow every panel', async ({ browser, baseURL, request }) => {
  const origin = new URL(baseURL!).origin;
  const { page, events } = await statsCreatorOnStats(browser, origin);
  const day = today();
  const before = await readStats(page);
  const beforeAdult = await readFiltered(page, stats.adult.title, ALL_COUNTRIES);
  // The Country filter offers SI before this test's Visitors only because test 1 made SI traffic earlier.
  const beforeAdultSI = await readFiltered(page, stats.adult.title, 'SI');
  const rowsBefore = await dailyRows(request, stats.direct.title, 'SI', day);

  const adultSI = await countedVisit(browser, origin, stats.username, { country: 'SI' });
  await passGateToStub(adultSI, origin, stats.adult.title, stats.adult.destination);
  await adultSI.context().close();
  const directSI = await countedVisit(browser, origin, stats.username, { country: 'SI' });
  await followThroughR(directSI, stats.direct.title, stats.direct.destination);
  await directSI.context().close();
  const adultDE = await countedVisit(browser, origin, stats.username, { country: 'DE' });
  await passGateToStub(adultDE, origin, stats.adult.title, stats.adult.destination);
  await adultDE.context().close();

  await page.reload();
  const after = await readStats(page);
  const afterAdult = await readFiltered(page, stats.adult.title, ALL_COUNTRIES);
  const afterAdultSI = await readFiltered(page, stats.adult.title, 'SI');
  const cards = (read: StatsRead) => ({ 'Page Views': count(read.cards['Page Views']), Clicks: count(read.cards.Clicks) });
  expect(rise(cards(before), cards(after)), 'no filter').toEqual({ 'Page Views': 3, Clicks: 3 });
  // Page Views belong to the Profile, so a Link filter leaves them Profile-wide.
  expect(rise(cards(beforeAdult), cards(afterAdult)), 'Link = Adult Link').toEqual({ 'Page Views': 3, Clicks: 2 });
  const narrowed = (read: StatsRead) => ({
    ...cards(read),
    'today\'s Clicks': count(read.daily[day]?.Clicks),
    'the Adult Link\'s Clicks': count(read.links[stats.adult.title]?.Clicks),
    'SI Page Views': count(read.countries.SI?.['Page Views']),
    'SI Clicks': count(read.countries.SI?.Clicks),
  });
  expect(rise(narrowed(beforeAdultSI), narrowed(afterAdultSI)), 'Link = Adult Link and Country = SI').toEqual({
    'Page Views': 2,
    Clicks: 1,
    'today\'s Clicks': 1,
    'the Adult Link\'s Clicks': 1,
    'SI Page Views': 2,
    'SI Clicks': 1,
  });
  expect(Object.keys(afterAdultSI.links), 'Links listed under Link = Adult Link and Country = SI').toEqual([stats.adult.title]);
  expect(Object.keys(afterAdultSI.countries), 'Countries listed under Link = Adult Link and Country = SI').toEqual(['SI']);
  for (const read of [before, beforeAdult, beforeAdultSI, after, afterAdult, afterAdultSI]) expectCtrs(read);

  // Grouped before they reach the page: one row for (Direct Mode Link, SI, today), whose Clicks rose by the one SI Click.
  const rowsAfter = await dailyRows(request, stats.direct.title, 'SI', day);
  expect(rowsAfter.length, 'dailyStats rows for (Direct Mode Link, SI, today)').toBe(1);
  expect(rowsAfter[0].clicks - (rowsBefore[0]?.clicks || 0), 'its Clicks').toBe(1);
  expect(events, 'requests to the events collection').toEqual([]);
  await page.context().close();
});

test('3. Link Shortcuts count through /r and through Reveal; an unknown Link Id and a refused Reveal count nothing', async ({ browser, baseURL, request }) => {
  const origin = new URL(baseURL!).origin;
  const { page, events } = await statsCreatorOnStats(browser, origin);
  const before = await readStats(page);
  const directId = await servedLinkId(request, stats.username, stats.direct.title);
  const adultId = await servedLinkId(request, stats.username, stats.adult.title);

  // A non-Adult Link's Shortcut follows its `/r` url. An Adult Link's Shortcut Reveals on load; a Link Shortcut has no Age Gate
  // (app/public/script.js), so none shows to pass. Each load is committed only: the page leaves it for the Destination at once.
  const viaR = await (await phoneContext(browser, { origin })).newPage();
  await throughR(viaR, stats.direct.destination, () => viaR.goto(`/${stats.username}?link=${directId}`, { waitUntil: 'commit' }));
  await viaR.context().close();
  const viaReveal = await (await phoneContext(browser, { origin })).newPage();
  await throughReveal(viaReveal, origin, stats.adult.destination, () => viaReveal.goto(`/${stats.username}?link=${adultId}`, { waitUntil: 'commit' }));
  await viaReveal.context().close();

  // Left out: an unknown Link Id on `/r` and on Reveal, and a Reveal for the Adult Link from another origin.
  const unknownId = '000000000000';
  expect((await request.get(`/r/${unknownId}`, { maxRedirects: 0 })).status(), '/r for an unknown Link Id').toBe(404);
  expect((await request.get(`/.netlify/functions/reveal?id=${unknownId}&user=${stats.username}`)).status(), 'Reveal for an unknown Link Id').toBe(404);
  const foreign = await request.get(`/.netlify/functions/reveal?id=${adultId}&user=${stats.username}`, { headers: { Origin: 'https://elsewhere.test' } });
  expect(foreign.status(), 'a foreign-Origin Reveal for the Adult Link').toBe(403);

  await page.reload();
  const after = await readStats(page);
  const clicks = (read: StatsRead) => ({
    'Clicks card': count(read.cards.Clicks),
    'the Direct Mode Link\'s Clicks': count(read.links[stats.direct.title]?.Clicks),
    'the Adult Link\'s Clicks': count(read.links[stats.adult.title]?.Clicks),
  });
  expect(rise(clicks(before), clicks(after))).toEqual({ 'Clicks card': 2, 'the Direct Mode Link\'s Clicks': 1, 'the Adult Link\'s Clicks': 1 });
  expect(events, 'requests to the events collection').toEqual([]);
  await page.context().close();
});

// Test 4's first Visitor only. Its other three, each with a country header, wait for the production country source (ticket 37).
test('4. a Visitor with no country header counts as "Unknown", never as US, in the Countries table and the Country filter', async ({ browser, baseURL }) => {
  const origin = new URL(baseURL!).origin;
  const { page, events } = await statsCreatorOnStats(browser, origin);
  const before = await readStats(page);
  await (await countedVisit(browser, origin, stats.username)).context().close();
  await page.reload();
  const after = await readStats(page);
  const views = (read: StatsRead) => ({ Unknown: count(read.countries.Unknown?.['Page Views']), US: count(read.countries.US?.['Page Views']) });
  expect(rise(views(before), views(after)), 'Countries: Page Views').toEqual({ Unknown: 1, US: 0 });
  const offered = await page.getByRole('combobox', { name: 'Country', exact: true }).getByRole('option').allTextContents();
  expect(offered.includes('Unknown') && !offered.includes('XX'), `the Country filter offers "Unknown", not XX: ${offered}`).toBe(true);
  expect(events, 'requests to the events collection').toEqual([]);
  await page.context().close();
});

test('5. Today, 7D and 30D read their own UTC days from the browser\'s clock, and a range with no rows says so', async ({ browser, baseURL }) => {
  const origin = new URL(baseURL!).origin;
  // The browser at noon UTC in UTC+14, where the local date is already tomorrow, so a page counting local days shows the wrong span.
  const day = today();
  const noon = Date.parse(`${day}T12:00:00Z`);
  const { page, events, statsRequests } = await statsCreatorOnStats(browser, origin, { timezoneId: 'Pacific/Kiritimati', time: noon });
  const tab = async (name: string) => {
    await page.getByRole('button', { name, exact: true }).click();
    await expect(page.getByRole('button', { name, exact: true })).toHaveAttribute('aria-pressed', 'true');
    return readStats(page);
  };
  const span = (days: string[]) => page.getByText(days.length === 1 ? `${days[0]} (UTC)` : `${days[0]} – ${days[days.length - 1]} (UTC)`, { exact: true });

  // Each tab shows its span and one daily row per day, and every dailyStats request it sends names the span's first day as the
  // filter's lower bound, so a page that fetched all history would fail although no stored Event is old enough to show it.
  let todayShowed: Record<string, string> = {};
  const tabs: [string, number][] = [['Today', 1], ['7D', 7], ['30D', 30]];
  for (const [name, n] of tabs) {
    const sent = statsRequests.length;
    const read = await tab(name);
    const days = daysEnding(day, n);
    await expect(span(days), `${name}: its date span`).toBeVisible();
    expect(Object.keys(read.daily), `${name}: its daily rows`).toEqual(days);
    const filters = statsRequests.slice(sent).map((url) => url.searchParams.get('filter') || '');
    expect(filters.length, `${name}: dailyStats requests`).toBeGreaterThan(0);
    for (const filter of filters) expect(filter, `${name}: a dailyStats filter`).toMatch(new RegExp(`day\\s*>=\\s*'${days[0]}'`));
    if (name === 'Today') todayShowed = { 'Page Views': read.cards['Page Views'], Clicks: read.cards.Clicks };
  }
  expect(count(todayShowed['Page Views']), 'Page Views today, from the earlier tests').toBeGreaterThan(0);

  // The browser a day ahead, the server's clock untouched: Today is a day with no rows, and 7D and 30D still hold the real today.
  await page.clock.setFixedTime(noon + DAY_MS);
  await page.reload();
  const tomorrow = new Date(Date.parse(`${day}T00:00:00Z`) + DAY_MS).toISOString().slice(0, 10);
  await tab('Today');
  await expect(span([tomorrow]), 'Today a day ahead: its date span').toBeVisible();
  await expect(page.getByText('No Page Views or Clicks in this range yet.', { exact: true })).toBeVisible();
  for (const name of ['7D', '30D']) {
    const row = (await tab(name)).daily[day];
    expect({ 'Page Views': row?.['Page Views'], Clicks: row?.Clicks }, `${name} a day ahead: the real today's row`).toEqual(todayShowed);
  }
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

test('the Stats Profile\'s and the Other Profile\'s JSON each carry profile.id, their record id, and no private key', async ({ request }) => {
  for (const { username } of [stats, other]) {
    const res = await request.get(`/api/profiles/${username}.json`);
    expect(res.status(), username).toBe(200);
    const keys: string[] = [];
    const json = JSON.parse(await res.text(), (key, value) => { keys.push(key); return value; });
    expect(json.profile.id, `${username}: profile.id`).toBe((await recordIds(username)).profileId);
    for (const key of ['destination', 'geo', 'owner', 'v1Key']) expect(keys.includes(key), `${username}: ${key}`).toBe(false);
  }
});

// v1's global Tracking Code key as a Visitor's browser may still hold it at Cutover, here with 999 (spec, Contracts, Tracking
// Code storage): the starting storage of a Visitor's context on the stack's origin.
const v1GlobalCode = (origin: string) => ({ cookies: [], origins: [{ origin, localStorage: [{ name: 'linkme_tracking_id', value: '999' }] }] });
// The Operator deletes the Profile at `username`; its Links and Events go with it (cascade).
const deleteProfile = async (username: string) =>
  expect(await operator('DELETE', `/api/collections/profiles/records/${(await recordIds(username)).profileId}`), `delete ${username}`).toBe(204);

test('8. a Tracking Code stays with the Profile it arrived on: never v1\'s global code, another Profile\'s, or a reused Username\'s', async ({ browser, baseURL, request }) => {
  const origin = new URL(baseURL!).origin;
  const visitor = await phoneContext(browser, { origin, storageState: v1GlobalCode(origin) });
  // The code arrives on the Other Profile, and that Profile's Adult Link carries it.
  const onOther = await visitor.newPage();
  await onOther.goto(`/${other.username}/123`);
  const toOther = new URL('c123', other.adult.destination).href;
  expect(await passGateToStub(onOther, origin, other.adult.title, toOther), 'the Other Profile\'s Reveal').toBe('123');
  // On the Stats Profile neither the Other Profile's 123 nor v1's 999 is sent, by a tap or by a Link Shortcut, and v1's global
  // key still holds 999: the code that arrived on the Other Profile did not rewrite it.
  const onStats = await visitor.newPage();
  await onStats.goto(`/${stats.username}`);
  expect(await onStats.evaluate(() => localStorage.getItem('linkme_tracking_id')), 'v1\'s global key').toBe('999');
  expect(await passGateToStub(onStats, origin, stats.adult.title, stats.adult.destination), 'the Stats Profile\'s Reveal after a tap').toBeNull();
  const viaShortcut = await visitor.newPage();
  const adultId = await servedLinkId(request, stats.username, stats.adult.title);
  const shortcut = () => viaShortcut.goto(`/${stats.username}?link=${adultId}`, { waitUntil: 'commit' });
  expect(await throughReveal(viaShortcut, origin, stats.adult.destination, shortcut), 'the Stats Profile\'s Reveal from a Link Shortcut').toBeNull();
  await visitor.close();

  // In Instagram the Escape Overlay shows on open and the address bar is the escape target (Phase 1): on the Other Profile it
  // keeps the code that arrived there, and on the Stats Profile it carries neither that code nor v1's.
  const inApp = await phoneContext(browser, { origin, userAgent: INSTAGRAM_UA, storageState: v1GlobalCode(origin) });
  const igOther = await inApp.newPage();
  await igOther.goto(`/${other.username}/123`);
  await expect(igOther.locator('#igOverlay')).toBeVisible();
  expect(new URL(igOther.url()).pathname, 'the Other Profile\'s escape target').toBe(`/${other.username}/123`);
  const igStats = await inApp.newPage();
  await igStats.goto(`/${stats.username}`);
  await expect(igStats.locator('#igOverlay')).toBeVisible();
  expect(new URL(igStats.url()).pathname, 'the Stats Profile\'s escape target').toBe(`/${stats.username}`);
  await inApp.close();

  // Username reuse: a code that arrived on a deleted Profile does not reach the new Profile under the same Username. The first
  // Profile's own Reveal shows the code did arrive.
  const reused = `reuse_${Date.now().toString(36)}`;
  const adult = { title: 'Reuse Adult', destination: 'https://reuse-adult.test/', isAdult: true, tracking: true };
  await createOwnerlessProfile(reused, 'Reuse Profile', adult);
  const third = await phoneContext(browser, { origin });
  const onFirst = await third.newPage();
  await onFirst.goto(`/${reused}/777`);
  expect(await passGateToStub(onFirst, origin, adult.title, new URL('c777', adult.destination).href), 'the first Profile\'s Reveal').toBe('777');
  await deleteProfile(reused);
  await createOwnerlessProfile(reused, 'Reuse Profile', adult);
  const onSecond = await third.newPage();
  await onSecond.goto(`/${reused}`);
  expect(await passGateToStub(onSecond, origin, adult.title, adult.destination), 'the new Profile\'s Reveal').toBeNull();
  await third.close();
  await deleteProfile(reused);
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
