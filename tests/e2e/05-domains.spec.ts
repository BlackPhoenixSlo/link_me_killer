import { expect, test, type APIRequestContext, type Browser, type Page, type Request } from '@playwright/test';
import { join } from 'node:path';
import {
  account, asSuperuser, createOwnerlessProfile, EDITOR, escapeOverlay, eventCount, featured, fresh, handOver, heading, intents, logIn, only,
  onLocalStack, operator, ownerOf, phoneContext, proxy, recordIds, recordNavigations, superuserToken, UA, verifiedCreator, xSafari,
} from './helpers';

// Phase 5 (docs/spec/phase-05-cutover-and-domains.md, Testing Decisions): one seam, this spec against the local stack at the
// baseURL. Chromium maps `*.test` to loopback, so host-routing checks go through `page` with real `creator.test:4173` and
// `spare.test:4173` Host headers over plain HTTP; TLS Ask checks go through `request` at the baseURL with `?domain=`.
// Ticket 39: Host Resolution, the paths per host, the TLS Ask, the Profile page bootstrap and the Domains schema.
// Ticket 40: on every host each Mode, the Age Gate, Reveal, Escape and the Escape Overlay behave as on the baseURL, Events are
// credited to the resolved Profile, nothing is requested from another of ofl.ink's hosts, and Reveal refuses another origin.
// Ticket 41: the hand-over order of the Cutover runbook's step 12, on a throwaway Profile (the last test).
// Escapes are captured with Phase 1's navigation recorder and User-Agents (helpers.ts); a Destination a page navigates
// to is fulfilled with a harmless page, and a redirect hop after `/r`, which no route sees, is stopped by the network guard.
// Set-up, not a second seam: `beforeAll` gives the Fixture Profile the Custom Domain `creator.test` and lists the Spare Domain
// `spare.test` as a superuser through PocketBase's REST API; `afterAll` removes both. `unknown.test` is never added, and the
// seed is unchanged.
// Phase 6 (docs/spec/phase-06-sites-and-domains.md, ticket 4): a Custom Domain is a `customDomains` record, and only a live one
// gets a certificate or a Profile. The Operator's path stays, a superuser's live record made without the DNS proof, so the
// set-up makes one; the Creator's self-service path and its DNS check are 07-domains'.
const CUSTOM = 'creator.test';
const SPARE = 'spare.test';
const UNKNOWN = 'unknown.test';
const PORT = 4173; // the baseURL's port (playwright.config.ts), which Caddy's plain-HTTP listener answers for every Host
const at = (host: string) => `http://${host}:${PORT}`;
const FIXTURE_NAME = 'Fixture Profile';
const FIXTURE_TITLES = ['Adult Link', 'Direct Link', 'Escape Link', 'Deeplink Link']; // tests/fixtures/api/profiles/fixture.json
const SCREENSHOT = join(__dirname, '..', '..', '.scratch', 'goal_ai', 'shots', '05-domains.png');

// The local stack's network guard (playwright.config.ts) with the `.test` names mapped to loopback in front of it: the first
// MAP that matches wins, and EXCLUDE keeps localhost resolving as it does in every other spec.
test.use({ launchOptions: { args: ['--host-resolver-rules=MAP *.test 127.0.0.1 , MAP * ~NOTFOUND , EXCLUDE localhost'] } });
test.skip(!onLocalStack(), 'the domain set-up needs the local stack\'s PocketBase port');

// The Operator's admin-UI edits (helpers.ts's operator: a superuser's call, status only): a Profile's Custom Domain, as its one
// `customDomains` record (any record it had is deleted first; `status` '' leaves the new one pending), removed, and one Spare
// Domain listed or removed.
async function removeCustomDomain(username: string) {
  const { profileId } = await recordIds(username);
  const found = await (await asSuperuser(await superuserToken(), `/api/collections/customDomains/records?filter=${encodeURIComponent(`profile='${profileId}'`)}`)).json();
  const statuses: number[] = [];
  for (const { id } of found.items) statuses.push(await operator('DELETE', `/api/collections/customDomains/records/${id}`));
  return statuses;
}
async function setCustomDomain(username: string, domain: string, status = 'live') {
  expect(await removeCustomDomain(username), `${username}'s earlier Custom Domain removed`).not.toContain(404);
  return operator('POST', '/api/collections/customDomains/records', { profile: (await recordIds(username)).profileId, domain, status });
}
const listSpareDomain = (domain: string) => operator('POST', '/api/collections/spareDomains/records', { domain });
const unlistSpareDomain = async (domain: string) =>
  operator('DELETE', `/api/collections/spareDomains/records/${(await only(await superuserToken(), 'spareDomains', `domain='${domain}'`)).id}`);

const tlsAsk = (request: APIRequestContext, domain?: string) =>
  request.get('/internal/tls-ask', domain === undefined ? {} : { params: { domain } });

test.beforeAll(async () => {
  expect(await setCustomDomain('fixture', CUSTOM), `the Fixture Profile's Custom Domain ${CUSTOM}`).toBe(200);
  expect(await listSpareDomain(SPARE), `the Spare Domain ${SPARE}`).toBe(200);
});

// Tear-down removes both, and the TLS Ask then refuses them: nothing this spec added outlives it.
test.afterAll(async ({ request }) => {
  expect(await removeCustomDomain('fixture'), 'the Fixture Profile\'s Custom Domain removed').toEqual([204]);
  expect(await unlistSpareDomain(SPARE), `the Spare Domain ${SPARE} removed`).toBe(204);
  for (const domain of [CUSTOM, SPARE]) expect((await tlsAsk(request, domain)).status(), `the TLS Ask for ${domain} after tear-down`).toBe(404);
});

test('the TLS Ask answers an empty 200 for a Custom Domain, a Spare Domain and a primary host, 404 for an unknown host, 400 without a domain', async ({ request }) => {
  for (const domain of [CUSTOM, SPARE, 'localhost']) {
    const res = await tlsAsk(request, domain);
    expect(res.status(), `the TLS Ask for ${domain}`).toBe(200);
    expect(await res.text(), `the TLS Ask's body for ${domain}`).toBe('');
  }
  expect((await tlsAsk(request, UNKNOWN)).status(), `the TLS Ask for ${UNKNOWN}`).toBe(404);
  expect((await tlsAsk(request)).status(), 'the TLS Ask with no domain').toBe(400);
  expect((await tlsAsk(request, 'not a hostname')).status(), 'the TLS Ask for a value that is not a hostname').toBe(400);
});

test('a pending Custom Domain gets no certificate and shows no Profile; set live, it gets both', async ({ browser, request }) => {
  const PENDING = 'pending.test';
  const owner = fresh().username; // a throwaway Profile made here as the Operator would, and deleted in `finally`
  await createOwnerlessProfile(owner, 'Pending Domain Profile', { title: 'Pending card', destination: 'https://example.com/domains-pending' });
  try {
    expect(await setCustomDomain(owner, PENDING, ''), `${PENDING} pending on ${owner}`).toBe(200);
    expect((await tlsAsk(request, PENDING)).status(), `the TLS Ask for the pending ${PENDING}`).toBe(404);
    const landing = await visit(browser, at(PENDING), '/');
    await expect(landing.locator('#displayName'), `a Profile on the pending ${PENDING}`).toHaveCount(0);
    await landing.context().close();
    expect(await setCustomDomain(owner, PENDING), `${PENDING} live on ${owner}`).toBe(200);
    expect((await tlsAsk(request, PENDING)).status(), `the TLS Ask for the live ${PENDING}`).toBe(200);
    const page = await visit(browser, at(PENDING), '/');
    await expect(page.locator('#displayName'), `the Profile on the live ${PENDING}`).toHaveText('Pending Domain Profile');
    await page.context().close();
  } finally {
    expect(await operator('DELETE', `/api/collections/profiles/records/${(await recordIds(owner)).profileId}`), `the Profile ${owner} deleted`).toBe(204);
  }
  expect((await tlsAsk(request, PENDING)).status(), `the TLS Ask for ${PENDING} once its Profile is deleted (cascade)`).toBe(404);
});

// A Visitor on `origin`, in a fresh 390×844 context that reaches no other host, opens `path`. The caller closes the context.
async function visit(browser: Browser, origin: string, path: string) {
  const context = await phoneContext(browser, { origin });
  const visitor = await context.newPage();
  await visitor.goto(origin + path);
  return visitor;
}

// The page shows the Fixture Profile: its display name and its Link cards in order.
async function showsFixture(visitor: Page, where: string) {
  await expect(visitor.locator('#displayName'), `the display name on ${where}`).toHaveText(FIXTURE_NAME);
  await expect(visitor.locator('.link-card .link-title'), `the Link cards on ${where}`).toHaveText(FIXTURE_TITLES);
}

// The Link Id of the Fixture's Link titled `title`, from the Profile JSON a page on the baseURL is served.
async function fixtureLinkId(request: APIRequestContext, title: string) {
  const res = await request.get('/api/profiles/fixture.json');
  expect(res.status()).toBe(200);
  const link = (await res.json()).links.find((l: { title: string }) => l.title === title);
  expect(link, `the Fixture's ${title}`).toBeTruthy();
  return link.id as string;
}

// A Link Shortcut opened on `origin` + `path`: the Reveal the page sends on load (its URL and status) and the navigation that
// followed it, which the context's fence stops. Playwright's own requests cannot resolve `.test` names, so the Reveal is
// observed as the page receives it, not re-sent. Callers compare `onward` and never print it: it is a Destination.
async function shortcutReveal(browser: Browser, origin: string, path: string) {
  const context = await phoneContext(browser, { origin });
  const visitor = await context.newPage();
  const reveal = visitor.waitForResponse((res) => new URL(res.url()).pathname === '/.netlify/functions/reveal');
  const onward = visitor.waitForEvent('requestfailed', (req) => req.isNavigationRequest() && new URL(req.url()).origin !== origin);
  await visitor.goto(origin + path);
  const [revealed, stopped] = [await reveal, await onward];
  await context.close();
  return { url: new URL(revealed.url()), status: revealed.status(), onward: stopped.url() };
}

test('on a Custom Domain, / and /{code} show its Profile, ?link= reveals that Link on load as on the baseURL, and a deeper path lands on the landing page', async ({ browser, request }) => {
  const custom = at(CUSTOM);
  const root = await visit(browser, custom, '/');
  await showsFixture(root, `${CUSTOM}/`);
  await root.screenshot({ path: SCREENSHOT, fullPage: true });
  await root.context().close();

  // The Tracking Code is read from the path's one segment, and the address bar is cleaned to the Profile path, `/`.
  const coded = await visit(browser, custom, '/111');
  await showsFixture(coded, `${CUSTOM}/111`);
  await expect(coded).toHaveURL(`${custom}/`);
  await coded.context().close();

  const linkId = await fixtureLinkId(request, 'Adult Link');
  const onCustom = await shortcutReveal(browser, custom, `/?link=${linkId}`);
  const onBase = await shortcutReveal(browser, at('localhost'), `/fixture?link=${linkId}`);
  expect(onCustom.url.origin, `the Reveal for Link ${linkId} on ${CUSTOM}`).toBe(custom);
  expect(onCustom.url.searchParams.get('id'), `the Reveal's Link Id on ${CUSTOM}`).toBe(linkId);
  expect([onCustom.status, onBase.status], `the Reveal answers for Link ${linkId} on ${CUSTOM} and the baseURL`).toEqual([200, 200]);
  expect(onCustom.onward === onBase.onward, `the page went on to Link ${linkId}'s Destination on ${CUSTOM} as on the baseURL`).toBe(true);

  const deeper = await visit(browser, custom, '/111/extra');
  await expect(deeper).toHaveURL(`${custom}/landing.html`);
  await deeper.context().close();
});

test('on a Spare Domain, /{username} shows that Profile and /{username}?link= reveals that Link on load', async ({ browser, request }) => {
  const spare = at(SPARE);
  const page = await visit(browser, spare, '/fixture');
  await showsFixture(page, `${SPARE}/fixture`);
  await page.context().close();

  const linkId = await fixtureLinkId(request, 'Adult Link');
  const onSpare = await shortcutReveal(browser, spare, `/fixture?link=${linkId}`);
  const onBase = await shortcutReveal(browser, at('localhost'), `/fixture?link=${linkId}`);
  expect(onSpare.url.origin, `the Reveal for Link ${linkId} on ${SPARE}`).toBe(spare);
  expect(onSpare.url.searchParams.get('id'), `the Reveal's Link Id on ${SPARE}`).toBe(linkId);
  expect([onSpare.status, onBase.status], `the Reveal answers for Link ${linkId} on ${SPARE} and the baseURL`).toEqual([200, 200]);
  expect(onSpare.onward === onBase.onward, `the page went on to Link ${linkId}'s Destination on ${SPARE} as on the baseURL`).toBe(true);
});

test('a changed Custom Domain serves on the next load with no restart, and the TLS Ask follows it', async ({ browser, request }) => {
  const NEXT = 'creator2.test';
  try {
    expect(await setCustomDomain('fixture', NEXT), `the Fixture Profile's Custom Domain ${NEXT}`).toBe(200);
    const page = await visit(browser, at(NEXT), '/');
    await showsFixture(page, `${NEXT}/`);
    await page.context().close();
    expect((await tlsAsk(request, NEXT)).status(), `the TLS Ask for ${NEXT}`).toBe(200);
    expect((await tlsAsk(request, CUSTOM)).status(), `the TLS Ask for ${CUSTOM} once it is no Profile's`).toBe(404);
  } finally {
    expect(await setCustomDomain('fixture', CUSTOM), `the Fixture Profile's Custom Domain back to ${CUSTOM}`).toBe(200);
  }
});

test('a Custom Domain belongs to one Profile, and a Spare Domain outranks a Custom Domain of the same name', async ({ browser }) => {
  const second = fresh().username; // a throwaway Profile made here as the Operator would, and deleted in `finally`
  await createOwnerlessProfile(second, 'Second Domain Profile', { title: 'Second card', destination: 'https://example.com/domains-second' });
  try {
    expect(await setCustomDomain(second, CUSTOM), `${CUSTOM} given to a second Profile`).toBe(400);
    expect(await setCustomDomain(second, SPARE), `the second Profile's Custom Domain ${SPARE}`).toBe(200);
    const page = await visit(browser, at(SPARE), '/fixture');
    await showsFixture(page, `${SPARE}/fixture with ${SPARE} also a Custom Domain`);
    await page.context().close();
  } finally {
    expect(await operator('DELETE', `/api/collections/profiles/records/${(await recordIds(second)).profileId}`), `the second Profile ${second} deleted`).toBe(204);
  }
});

// The Creator's writes go through the same-origin proxy, as the Editor sends them (Phase 3); what is stored is read as the
// Operator reads it. From Phase 6 on Profiles have no Custom Domain field (1791140012_custom_domains.js): PocketBase 0.40.4
// ignores a body field the collection does not have, so both writes answer 200 and no Custom Domain comes of them. A Creator's
// own Custom Domain is a `customDomains` record, live only through the DNS check (07-domains).
test('a Creator can neither create a Profile with a Custom Domain nor set one on their own Profile', async ({ request }) => {
  const token = await superuserToken();
  const storedDomains = async () =>
    (await (await asSuperuser(token, `/api/collections/customDomains/records?filter=${encodeURIComponent("domain='mine.test'")}`)).json()).items;
  const unclaimed = await account(request);
  const claim = { username: unclaimed.creator.username, owner: unclaimed.id, mode: 'escape_ig', slot: 1, customDomain: 'mine.test' };
  const created = await proxy(request, unclaimed.token).post('profiles/records', claim);
  expect(created.status(), 'a claim naming a Custom Domain').toBe(200);
  expect(await storedDomains(), `a Custom Domain stored for ${claim.username}`).toEqual([]);

  const owner = await verifiedCreator(request, []);
  const as = proxy(request, owner.token);
  const updated = await as.patch(`profiles/records/${owner.profileId}`, { customDomain: 'mine.test' });
  expect(updated.status(), 'the owner setting a Custom Domain').toBe(200);
  expect(await storedDomains(), `a Custom Domain stored for ${owner.creator.username}`).toEqual([]);
  const own = await (await as.get(`profiles/records/${owner.profileId}`)).json();
  expect('customDomain' in own, 'the Custom Domain field in the owner\'s own read').toBe(false);
});

test('the domains stay out of every public answer: the baseURL page and the records API without a token', async ({ browser, request }) => {
  const context = await phoneContext(browser, { origin: at('localhost') });
  const visitor = await context.newPage();
  const bodies: Promise<{ url: string; text: string }>[] = [];
  visitor.on('response', (res) => bodies.push(res.body().then((b) => ({ url: res.url(), text: b.toString('latin1') }), () => ({ url: res.url(), text: '' }))));
  await visitor.goto(`${at('localhost')}/fixture`);
  await showsFixture(visitor, 'localhost/fixture');
  await visitor.waitForLoadState('networkidle');
  for (const { url, text } of await Promise.all(bodies)) expect(text.includes(CUSTOM), `${CUSTOM} in the answer to ${url}`).toBe(false);
  await context.close();

  const fixtureId = (await only(await superuserToken(), 'profiles', "username='fixture'")).id;
  for (const path of ['profiles/records', `profiles/records/${fixtureId}`, 'spareDomains/records', 'customDomains/records']) {
    const text = await (await request.get(`/api/collections/${path}`)).text();
    for (const domain of [CUSTOM, SPARE]) expect(text.includes(domain), `${domain} in the anonymous answer to ${path}`).toBe(false);
  }
});

// The page's bootstrap block at `origin` + `path`, parsed as the page parses it. The page script is held back, so an unknown
// Username's trip to the landing page cannot take the page away before the block is read.
async function bootstrapAt(browser: Browser, origin: string, path: string) {
  const context = await phoneContext(browser, { origin });
  await context.route(`${origin}/script.js`, (route) => route.abort('blockedbyclient'));
  const visitor = await context.newPage();
  await visitor.goto(origin + path);
  const text = await visitor.locator('#profile-bootstrap').textContent();
  await context.close();
  return JSON.parse(text ?? '');
}

test('the Profile page bootstrap carries the path\'s segments literally, `$` patterns included', async ({ browser }) => {
  expect(await bootstrapAt(browser, at('localhost'), "/$'x/$$"), 'the block on localhost').toEqual({ username: "$'x", trackingCode: '$$', profilePath: "/$'x" });
  expect(await bootstrapAt(browser, at(CUSTOM), "/$'$$"), `the block on ${CUSTOM}`).toEqual({ username: 'fixture', trackingCode: "$'$$", profilePath: '/' });
});

// ---- Ticket 40: every host behaves as the baseURL ---------------------------------------------------------------------------

const REVEAL = '/.netlify/functions/reveal';
const CODES = ['111', '222'];
const HOSTS = [CUSTOM, SPARE, 'localhost'];
// The Fixture Profile with Tracking Code `code` on `host`: `/{code}` on its Custom Domain, `/{username}/{code}` elsewhere.
const codedPath = (host: string, code: string) => (host === CUSTOM ? `/${code}` : `/fixture/${code}`);
const card = (visitor: Page, title: string) => visitor.locator('.link-card', { hasText: title });
const STUB = '<!DOCTYPE html><title>Stub</title><h1>Stub Destination</h1>';

// `act` sends the page off `origin` to a Destination. A fresh navigation there (after a Reveal) is fulfilled with a harmless page;
// a redirect hop after `/r`, which no route sees, is stopped by the network guard. Returns that navigation's request: callers
// compare its URL, a Destination, and never print it.
async function onward(visitor: Page, origin: string, act: () => Promise<unknown>) {
  await visitor.route((url) => url.origin !== origin, (route) => route.fulfill({ status: 200, contentType: 'text/html', body: STUB }));
  const left = visitor.waitForEvent('request', (req) => req.isNavigationRequest() && new URL(req.url()).origin !== origin);
  await act();
  return left;
}

// The Visitor taps the Adult Link, sees the Age Gate and taps "Continue (18+)". helpers.ts's passAgeGate does not fit here: it
// needs the Destination up front and re-sends Reveal from Playwright, whose own requests cannot resolve `.test` names.
async function tapThroughAgeGate(visitor: Page, where: string) {
  await card(visitor, 'Adult Link').click();
  await expect(visitor.getByRole('heading', { name: 'Mature Content Disclaimer' }), `the Age Gate for ${where}`).toBeVisible();
  await visitor.getByRole('button', { name: 'Continue (18+)' }).click();
}
const revealAnswer = (visitor: Page) => visitor.waitForResponse((res) => new URL(res.url()).pathname === REVEAL);

test('with Tracking Codes 111 and 222 on every host, the Adult Link\'s Age Gate sends Reveal to the page\'s own host, which answers 200 with a Destination ending in /c{code}', async ({ browser, request }) => {
  test.setTimeout(120_000); // six page loads
  const linkId = await fixtureLinkId(request, 'Adult Link');
  for (const code of CODES) {
    for (const host of HOSTS) {
      const origin = at(host);
      const where = `Link ${linkId} on ${host}${codedPath(host, code)}`;
      const visitor = await visit(browser, origin, codedPath(host, code));
      await showsFixture(visitor, where);
      const reveal = revealAnswer(visitor);
      const destination = await onward(visitor, origin, () => tapThroughAgeGate(visitor, where));
      const answered = await reveal;
      expect(new URL(answered.url()).origin, `the host the Reveal for ${where} went to`).toBe(origin);
      expect(new URL(answered.url()).searchParams.get('trackingId'), `the Tracking Code the Reveal for ${where} carried`).toBe(code);
      expect(answered.status(), `the Reveal for ${where}`).toBe(200);
      expect(destination.url().endsWith(`/c${code}`), `the Destination for ${where} ends in /c${code}`).toBe(true);
      await visitor.context().close();
    }
  }
});

// The Fixture Link with public Link Id `linkId` as the Operator reads it: its record id and stored Mode, and nothing else, so no
// Destination reaches the test.
async function storedLink(linkId: string): Promise<{ id: string; mode: string }> {
  const query = `fields=id,mode&filter=${encodeURIComponent(`linkId='${linkId}'`)}`;
  const found = await (await asSuperuser(await superuserToken(), `/api/collections/links/records?${query}`)).json();
  expect(found.items, `the stored Link ${linkId}`).toHaveLength(1);
  return found.items[0];
}

// The Deeplink Link's Mode is set to Deeplink Mode as the Operator would in the admin UI, and restored in `finally`.
// ASSUMPTION: the seed already stores the Deeplink Link in Deeplink Mode (01-link-modes-and-escape finds it served so), so the
// set-up writes the value it holds and changes nothing other specs read while they run (rung 2: the ticket sets the Mode in the
// REST set-up; rung 4: no shared Link changes Mode mid-run). Overturned if the seed stops storing it; the write then matters.
test('on every host the Direct Mode Link and the Deeplink Mode Link each end at the same Destination, through `/r` and Reveal on the page\'s own host', async ({ browser, request }) => {
  test.setTimeout(120_000); // six page loads
  const deeplink = await fixtureLinkId(request, 'Deeplink Link');
  const stored = await storedLink(deeplink);
  try {
    expect(await operator('PATCH', `/api/collections/links/records/${stored.id}`, { mode: 'deeplink' }), `Link ${deeplink} set to Deeplink Mode`).toBe(200);
    for (const title of ['Direct Link', 'Deeplink Link']) {
      const linkId = await fixtureLinkId(request, title);
      const ends: string[] = [];
      for (const host of HOSTS) {
        const origin = at(host);
        const where = `Link ${linkId} on ${host}${codedPath(host, '111')}`;
        const visitor = await visit(browser, origin, codedPath(host, '111'));
        await showsFixture(visitor, where);
        const reveals: URL[] = [];
        visitor.on('request', (req) => { if (new URL(req.url()).pathname === REVEAL) reveals.push(new URL(req.url())); });
        const left = await onward(visitor, origin, () => card(visitor, title).click());
        // Direct Mode reaches its Destination through `/r` on the page's own host; Deeplink Mode through Reveal there.
        if (title === 'Direct Link') {
          expect(left.redirectedFrom()?.url(), `the Click route ${where} went through`).toBe(`${origin}/r/${linkId}`);
          expect(reveals, `Reveal requests for ${where}`).toEqual([]);
        } else {
          expect(reveals.map((url) => `${url.origin} ${url.searchParams.get('id')}`), `the Reveal for ${where}`).toEqual([`${origin} ${linkId}`]);
        }
        ends.push(left.url());
        await visitor.context().close();
      }
      expect(ends.every((end) => end === ends[0]), `Link ${linkId} ends at one Destination on ${HOSTS.join(', ')}`).toBe(true);
      expect(HOSTS.some((host) => new URL(ends[0]).host === `${host}:${PORT}`), `Link ${linkId}'s Destination on one of ofl.ink's hosts`).toBe(false);
    }
  } finally {
    expect(await operator('PATCH', `/api/collections/links/records/${stored.id}`, { mode: stored.mode }), `Link ${deeplink}'s Mode restored`).toBe(200);
  }
});

// Is the Escape Overlay showing once the Fixture Profile's Links have rendered at `origin` + `path` with an iOS Instagram
// User-Agent? `mode`, when given, replaces the Profile's default Mode in the Profile JSON the page receives, as the app serves
// it for that host (fetched at the baseURL under that host's Host header, which Caddy passes on; observed to give that host's
// `/r` urls; the ASSUMPTION above the cross-origin Reveal test covers this use of `request`), so the page sees the other default
// without any shared record changing.
// ASSUMPTION: "exactly when" is proven both ways, shown with the stored Escape Mode default and hidden with a Direct one, the
// second through an in-flight Profile JSON as Phase 1's serveVariant does (rung 3), not by changing the Fixture's stored default,
// which specs running beside this one read (rung 4). Overturned if the parity must be shown on stored data; the default is then
// changed in REST set-up and restored in `finally`, with the specs that read it kept apart.
async function overlayShows(browser: Browser, request: APIRequestContext, origin: string, path: string, mode?: string) {
  const context = await phoneContext(browser, { origin, userAgent: UA.iosInstagram });
  const visitor = await context.newPage();
  if (mode) {
    const served = await (await request.get('/api/profiles/fixture.json', { headers: { host: new URL(origin).host } })).json();
    served.profile.mode = mode;
    await visitor.route(`${origin}/api/profiles/fixture.json`, (route) => route.fulfill({ json: served }));
  }
  await visitor.goto(origin + path);
  await showsFixture(visitor, `${origin}${path}`);
  const shows = await escapeOverlay(visitor).isVisible();
  await context.close();
  return shows;
}

test('with an iOS Instagram User-Agent, creator.test/ shows the Escape Overlay exactly when localhost/{username} does', async ({ browser, request }) => {
  const shown: boolean[] = [];
  for (const mode of [undefined, 'direct']) {
    const onCustom = await overlayShows(browser, request, at(CUSTOM), '/', mode);
    const onBase = await overlayShows(browser, request, at('localhost'), '/fixture', mode);
    expect(onCustom, `the Escape Overlay on ${CUSTOM}/ beside localhost/fixture, Profile default ${mode ?? 'as stored'}`).toBe(onBase);
    shown.push(onBase);
  }
  // Both outcomes occur, so the parity above is not vacuous: shown with the stored Escape Mode default, hidden with Direct.
  expect(shown, 'the Escape Overlay with the stored default, then with Direct Mode').toEqual([true, false]);
});

// The Escapes fired at `origin` + `path` with `userAgent`, each an `x-safari-` or `intent://` URL as Phase 1 captures it. The
// Fixture's Escape Mode default pops nothing out on open; after closing the Escape Overlay it shows, a tap on the Escape Link
// fires the one Escape.
async function escapesFired(browser: Browser, origin: string, path: string, userAgent: string) {
  const context = await phoneContext(browser, { origin, userAgent });
  const visitor = await context.newPage();
  const navigations = await recordNavigations(visitor);
  const fired = () => [...xSafari(navigations), ...intents(navigations)];
  await visitor.goto(origin + path);
  await showsFixture(visitor, `${origin}${path}`);
  await escapeOverlay(visitor).getByRole('button', { name: 'Close' }).click();
  await card(visitor, 'Escape Link').click();
  await expect.poll(fired, `the Escapes fired on ${origin}${path}`).toHaveLength(1);
  await context.close();
  return fired();
}

test('an Escape from creator.test/{code} targets creator.test and /{code}, with no Username segment, on iOS and as the Android intent', async ({ browser, request }) => {
  const linkId = await fixtureLinkId(request, 'Escape Link');
  const target = `https://${CUSTOM}:${PORT}/111?link=${linkId}`; // the escape target, spelled out as the Phase 1 spec spells it
  expect(await escapesFired(browser, at(CUSTOM), '/111', UA.iosInstagram), `the iOS Escape for Link ${linkId} on ${CUSTOM}/111`)
    .toEqual([`x-safari-${target}`]);
  expect(await escapesFired(browser, at(CUSTOM), '/111', UA.androidInstagram), `the Android Escape for Link ${linkId} on ${CUSTOM}/111`)
    .toEqual([`intent://${CUSTOM}:${PORT}/111?link=${linkId}#Intent;scheme=https;package=com.android.chrome;end`]);
});

test('an Escape from spare.test/{username}/{code} keeps /{username}/{code}', async ({ browser, request }) => {
  const linkId = await fixtureLinkId(request, 'Escape Link');
  expect(await escapesFired(browser, at(SPARE), '/fixture/222', UA.iosInstagram), `the iOS Escape for Link ${linkId} on ${SPARE}/fixture/222`)
    .toEqual([`x-safari-https://${SPARE}:${PORT}/fixture/222?link=${linkId}`]);
});

// Events this spec's Visitors make carry their own country, which no other spec sends, so other workers' Fixture traffic is left
// out of the counts.
const MARKER = 'ZD';

test('loading creator.test/ adds one Page View Event, and the Adult Link\'s Reveal on creator.test/{code} one Click Event, both for the Fixture Profile', async ({ browser, request }) => {
  const { profileId } = await recordIds('fixture');
  const linkId = await fixtureLinkId(request, 'Adult Link');
  const adult = await storedLink(linkId);
  const views = () => eventCount(`profile='${profileId}' && kind='page_view' && country='${MARKER}'`);
  const clicks = () => eventCount(`profile='${profileId}' && kind='click' && link='${adult.id}' && country='${MARKER}'`);
  const custom = at(CUSTOM);
  const countedVisit = async (path: string) => {
    const context = await phoneContext(browser, { origin: custom, headers: { 'CF-IPCountry': MARKER } });
    const visitor = await context.newPage();
    const ping = visitor.waitForRequest((req) => req.method() === 'POST' && new URL(req.url()).pathname === '/v/fixture');
    await visitor.goto(custom + path);
    const pinged = await ping;
    expect(new URL(pinged.url()).origin, `the host the Page View Ping on ${CUSTOM}${path} went to`).toBe(custom);
    expect((await pinged.response())?.status(), `the Page View Ping on ${CUSTOM}${path}`).toBe(204);
    return visitor;
  };

  const viewsBefore = await views();
  await (await countedVisit('/')).context().close();
  await expect.poll(views, `the Fixture Profile's Page View Events after loading ${CUSTOM}/`).toBe(viewsBefore + 1);

  const clicksBefore = await clicks();
  const visitor = await countedVisit('/111');
  const where = `Link ${linkId} on ${CUSTOM}/111`;
  const reveal = revealAnswer(visitor);
  await onward(visitor, custom, () => tapThroughAgeGate(visitor, where));
  expect((await reveal).status(), `the Reveal for ${where}`).toBe(200);
  await visitor.context().close();
  await expect.poll(clicks, `the Fixture Profile's Click Events for ${where}`).toBe(clicksBefore + 1);
});

test('on creator.test and spare.test the page requests nothing from another of ofl.ink\'s hosts, and no request URL names ofl.ink', async ({ browser, request }) => {
  const linkId = await fixtureLinkId(request, 'Adult Link');
  const cases: [string, string, string[]][] = [
    [CUSTOM, '/111', [`localhost:${PORT}`, `${SPARE}:${PORT}`]],
    [SPARE, '/fixture/111', [`localhost:${PORT}`, `${CUSTOM}:${PORT}`]],
  ];
  for (const [host, path, others] of cases) {
    const origin = at(host);
    const where = `Link ${linkId} on ${host}${path}`;
    const context = await phoneContext(browser, { origin });
    const sent: Request[] = [];
    context.on('request', (req) => sent.push(req));
    const visitor = await context.newPage();
    await visitor.goto(origin + path);
    await showsFixture(visitor, where);
    await visitor.waitForLoadState('networkidle'); // the Page View Ping, sent once the Links render, is among the requests
    const reveal = revealAnswer(visitor);
    const destination = await onward(visitor, origin, () => tapThroughAgeGate(visitor, where));
    expect((await reveal).status(), `the Reveal for ${where}`).toBe(200);
    await context.close();
    // The Destination the Reveal handed out is the Creator's, not one of ofl.ink's hosts, and is left out so no message prints it.
    const urls = sent.filter((req) => req !== destination).map((req) => new URL(req.url()));
    const ownPaths = urls.filter((url) => url.origin === origin).map((url) => url.pathname);
    expect(urls.filter((url) => others.includes(url.host)).map(String), `requests to another of ofl.ink's hosts for ${where}`).toEqual([]);
    expect(urls.filter((url) => url.href.includes('ofl.ink')).map(String), `request URLs naming ofl.ink for ${where}`).toEqual([]);
    // The page's own calls are all there, so the two checks above looked at a page that did its work.
    expect(ownPaths, `the page's own requests for ${where}`).toEqual(expect.arrayContaining([path, '/script.js', '/api/profiles/fixture.json', '/v/fixture', REVEAL]));
  }
});

// The page's `fetch` of Reveal on spare.test, once in its default CORS mode and once as `no-cors`: the first is refused (Reveal
// sends no CORS header, and answers the call's foreign Origin 403 besides, checked below with that Origin sent at the baseURL under
// spare.test's Host, since Playwright's own requests cannot resolve `.test` names), the second comes back opaque, and that opaque
// answer is what shows the call reached spare.test: a no-cors fetch that gets no response rejects with TypeError instead.
// Observed: spare.test answers that no-cors call 200, so over plain HTTP Chromium sent it with neither a foreign Origin nor a
// cross-site Sec-Fetch-Site, the Click guard's "neither header: true" (app/src/click-guard.js, ticket 22) let it through and
// Reveal recorded a Click; the page still reads nothing. Over HTTPS, Fetch Metadata has the browser send `Sec-Fetch-Site:
// cross-site`, which the guard answers 403 (not observable here: the local loop has no TLS).
// ASSUMPTION: "cannot be read by the page" is the bar, met by both modes, and the header-less no-cors call is ticket 22's guard as
// it stands on every host, not this ticket's to close (rung 2: box 8's wording; rung 4: no change to the shared guard). Overturned
// if Reveal must refuse a header-less cross-origin call; the guard then needs another signal, such as Referer.
// ASSUMPTION: the refusal of spare.test's Reveal to creator.test's Origin is checked through `request` at the baseURL with a
// `.test` Host header, and overlayShows fetches its variant Profile JSON the same way; both depart from Testing Decisions' "host-
// routing checks go through page" (rung 1: the page cannot see the status of a CORS-refused call, observed as Playwright's
// requestfailed `net::ERR_FAILED` with no response and no response event; route.fetch cannot resolve `.test`). Overturned if
// Playwright starts reporting a CORS-refused response to the page; the 403 is then asserted on the page's own call.
test('a fetch from a page on creator.test to Reveal on spare.test cannot be read by the page', async ({ browser, request }) => {
  const linkId = await fixtureLinkId(request, 'Adult Link');
  // No fence: the page must reach spare.test. The network guard still keeps every other host off the machine.
  const context = await phoneContext(browser);
  const visitor = await context.newPage();
  await visitor.goto(`${at(CUSTOM)}/`);
  await showsFixture(visitor, `${CUSTOM}/`);
  const target = `${at(SPARE)}${REVEAL}?id=${linkId}&user=fixture&trackingId=111`;
  // Only what the page could read comes back: the error's name, or the answer's type, status and body length, never a body,
  // which could hold a Destination.
  const pageReads = (mode: 'cors' | 'no-cors') => visitor.evaluate(async ([url, m]) => {
    try {
      const res = await fetch(url, { mode: m });
      return `${res.type} ${res.status} ${(await res.text()).length}`;
    } catch (error) {
      return `refused: ${(error as Error).name}`;
    }
  }, [target, mode] as const);
  const where = `the page on ${CUSTOM} reading Reveal on ${SPARE} for Link ${linkId}`;
  expect(await pageReads('cors'), `${where}, in CORS mode`).toBe('refused: TypeError');
  expect(await pageReads('no-cors'), `${where}, as no-cors`).toBe('opaque 0 0');
  const foreign = await request.get(`${REVEAL}?id=${linkId}&user=fixture`, { headers: { host: `${SPARE}:${PORT}`, origin: at(CUSTOM) } });
  expect(foreign.status(), `${SPARE}'s answer to Reveal for Link ${linkId} with Origin ${at(CUSTOM)}`).toBe(403);
  await context.close();
});

// Ticket 41, as Phase 6 changes it (docs/spec/phase-06-sites-and-domains.md, § 2 Option A): the Cutover runbook's step 12
// (RUN.md, ## Cutover). A v1 Creator who claimed another Username before the hand-over owns that bare Profile in slot 1; the
// unique index on (owner, slot) (pocketbase/pb_migrations/1791140011_several_profiles.js) refuses the imported Profile in a
// taken slot even to a superuser, and takes it in a free one with the bare Profile kept. The imported Profile is a throwaway
// made as the v1 Import makes one (helpers.ts, createOwnerlessProfile); the Operator's step is helpers.ts's handOver, as in the
// admin UI. Nothing shared is changed.
// ASSUMPTION: here rather than beside 03's hand-over case (rung 2: Phase 5's one seam is this spec, Phase 3's suite is one spec,
// and 03-auth-and-editor.spec.ts may not grow past its 1000-line limit). Overturned if 03 gains room; the case then moves
// beside its hand-over case.
test('step 12\'s hand-over: the owner with a taken slot is refused; with a free slot it is set beside the bare Profile, and the Creator switches to the handed-over Profile in the Editor and finds its Links', async ({ browser, request, baseURL }) => {
  const origin = new URL(baseURL!).origin;
  const { creator, id } = await verifiedCreator(request, [['Bare card', '']]);
  const imported = fresh().username;
  await createOwnerlessProfile(imported, 'Handed Over', { title: 'Imported card', destination: `https://example.com/${imported}` });
  expect(await handOver(imported, creator.email, 1), 'the owner with the bare Profile\'s slot').toBe(400);
  expect(await ownerOf(imported), 'the imported Profile\'s owner after the refusal').toBe('');
  expect(await handOver(imported, creator.email, 2), 'the owner with a free slot').toBe(200);
  const owned = await (await asSuperuser(await superuserToken(), `/api/collections/profiles/records?sort=slot&filter=${encodeURIComponent(`owner='${id}'`)}`)).json();
  expect(owned.items.map((p: { username: string; slot: number }) => [p.username, p.slot]), 'the Profiles the Creator owns').toEqual([[creator.username, 1], [imported, 2]]);

  const editor = await (await phoneContext(browser)).newPage();
  await logIn(editor, creator);
  await expect(heading(editor, EDITOR)).toBeVisible();
  await expect(featured(editor)).toHaveText(['Bare card']);
  await editor.getByLabel('Profile', { exact: true }).selectOption({ label: `@${imported}` });
  await expect(editor.getByText(`${origin}/${imported}`, { exact: true })).toBeVisible();
  await expect(editor.getByLabel('Display name')).toHaveValue('Handed Over');
  await expect(featured(editor)).toHaveText(['Imported card']);
  await editor.context().close();
});
