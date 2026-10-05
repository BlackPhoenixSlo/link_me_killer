import { expect, test, type APIRequestContext, type Browser, type Page } from '@playwright/test';
import { join } from 'node:path';
import {
  account, asSuperuser, createOwnerlessProfile, fresh, only, onLocalStack, operator, phoneContext, proxy, recordIds, superuserToken, verifiedCreator,
} from './helpers';

// Phase 5 (docs/spec/phase-05-cutover-and-domains.md, Testing Decisions): one seam, this spec against the local stack at the
// baseURL. Chromium maps `*.test` to loopback, so host-routing checks go through `page` with real `creator.test:4173` and
// `spare.test:4173` Host headers over plain HTTP; TLS Ask checks go through `request` at the baseURL with `?domain=`.
// Ticket 39: Host Resolution, the paths per host, the TLS Ask, the Profile page bootstrap and the Domains schema.
// Set-up, not a second seam: `beforeAll` gives the Fixture Profile the Custom Domain `creator.test` and lists the Spare Domain
// `spare.test` as a superuser through PocketBase's REST API; `afterAll` removes both. `unknown.test` is never added, and the
// seed is unchanged.
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

// The Operator's admin-UI edits (helpers.ts's operator: a superuser's call, status only): a Profile's Custom Domain ('' clears
// it), and one Spare Domain listed or removed.
const setCustomDomain = async (username: string, domain: string) =>
  operator('PATCH', `/api/collections/profiles/records/${(await recordIds(username)).profileId}`, { customDomain: domain });
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
  expect(await setCustomDomain('fixture', ''), 'the Fixture Profile\'s Custom Domain cleared').toBe(200);
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

// The Creator's writes go through the same-origin proxy, as the Editor sends them (Phase 3); the stored value is read as the
// Operator reads it. PocketBase 0.40.4 drops the hidden `customDomain` from a Creator's body before its rules run, so both writes
// answer 200 and store no Custom Domain: 1791140008_domains.js's ASSUMPTION reads "refused" as never stored. A migration that
// drops `hidden` turns both into refusals, and this test changes with it.
test('a Creator can neither create a Profile with a Custom Domain nor set one on their own Profile', async ({ request }) => {
  const token = await superuserToken();
  const storedDomains = async (username: string) => {
    const found = await (await asSuperuser(token, `/api/collections/profiles/records?filter=${encodeURIComponent(`username='${username}'`)}`)).json();
    return found.items.map((p: { customDomain: string }) => p.customDomain);
  };
  const unclaimed = await account(request);
  const claim = { username: unclaimed.creator.username, owner: unclaimed.id, mode: 'escape_ig', customDomain: 'mine.test' };
  const created = await proxy(request, unclaimed.token).post('profiles/records', claim);
  expect(created.status(), 'a claim naming a Custom Domain').toBe(200);
  expect((await storedDomains(claim.username)).filter(Boolean), `a Custom Domain stored on ${claim.username}`).toEqual([]);

  const owner = await verifiedCreator(request, []);
  const as = proxy(request, owner.token);
  const updated = await as.patch(`profiles/records/${owner.profileId}`, { customDomain: 'mine.test' });
  expect(updated.status(), 'the owner setting a Custom Domain').toBe(200);
  expect(await storedDomains(owner.creator.username), `${owner.creator.username}'s stored Custom Domain`).toEqual(['']);
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
  for (const path of ['profiles/records', `profiles/records/${fixtureId}`, 'spareDomains/records']) {
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
