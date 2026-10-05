import { expect, type APIRequestContext, type Browser, type Page } from '@playwright/test';
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';

// Plumbing for tests/e2e/03-auth-and-editor.spec.ts that is not itself a test: the Operator steps, an in-memory PNG and (moved
// here by ticket 29) the Creator, Visitor and proxy drivers the spec's tests share. Not a
// spec file (Playwright's default testMatch skips it), so the Phase 3 suite stays one spec (docs/spec/phase-03-auth-and-editor.md,
// Testing Decisions).
// ASSUMPTION: a helper module beside the spec rather than more lines in it, though every other spec keeps its own plumbing
// (rung 5: the one spec file stays under 1000 lines without dropping a test). Overturned if helpers must live in the spec.
const ROOT = join(__dirname, '..', '..');

// Is the stack under test the local test stack that tests/stack.sh starts? The same predicate as the 02 specs: the Operator
// step needs PocketBase's loopback port, which only that stack publishes.
export const onLocalStack = () => !process.env.PLAYWRIGHT_BASE_URL || new URL(process.env.PLAYWRIGHT_BASE_URL).origin === 'http://localhost:4173';
const ENV: Record<string, string> = Object.fromEntries(
  readFileSync(join(ROOT, 'tests', 'e2e.env'), 'utf8')
    .split('\n')
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]),
);
const PB = `http://127.0.0.1:${ENV.PB_PORT}`;
async function superuserToken() {
  const res = await fetch(`${PB}/api/collections/_superusers/auth-with-password`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ identity: ENV.PB_SUPERUSER_EMAIL, password: ENV.PB_SUPERUSER_PASSWORD }),
  });
  expect(res.status).toBe(200);
  return (await res.json()).token as string;
}
const asSuperuser = async (token: string, path: string, init: RequestInit = {}) =>
  fetch(PB + path, { ...init, headers: { ...(init.headers as Record<string, string>), Authorization: token } });

const json = (method: string, body: object): RequestInit => ({ method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
// The one record of `collection` that `filter` finds, as the superuser reads it.
async function only(token: string, collection: string, filter: string) {
  const found = await (await asSuperuser(token, `/api/collections/${collection}/records?filter=${encodeURIComponent(filter)}`)).json();
  expect(found.items.length, `${collection} matching ${filter}`).toBe(1);
  return found.items[0];
}

// The Operator step: a superuser marks the account verified, as the Operator would in the admin UI.
export async function markVerified(email: string) {
  const token = await superuserToken();
  const user = await only(token, 'users', `email='${email}'`);
  expect((await asSuperuser(token, `/api/collections/users/records/${user.id}`, json('PATCH', { verified: true }))).status).toBe(200);
}

// Ticket 29's Operator steps for the hand-over (spec, Testing Decisions, Operator steps). A superuser creates an ownerless Profile
// with a display name and one Link, the way the v1 Import writes one (app/bin/import-v1, write()), and later sets its owner.
// ASSUMPTION: the throwaway Profile carries no v1Key, so it is born in v2 as far as the stack-import project's stale lines go
// (rung 1: app/bin/import-v1 names every v1-keyed Profile its input lacks; rung 5). Overturned if the hand-over must be proved on
// a v1-keyed Profile; the test then deletes it before the stack-import project runs, as 02-image-upload does.
export async function createOwnerlessProfile(username: string, displayName: string, link: { title: string; destination: string }) {
  const token = await superuserToken();
  const profile = await asSuperuser(token, '/api/collections/profiles/records', json('POST', { username, displayName, mode: 'escape_ig' }));
  expect(profile.status).toBe(200);
  const created = await asSuperuser(token, '/api/collections/links/records', json('POST', { ...link, profile: (await profile.json()).id, order: 0 }));
  expect(created.status).toBe(200);
}

export async function setOwner(username: string, email: string) {
  const token = await superuserToken();
  const [profile, user] = [await only(token, 'profiles', `username='${username}'`), await only(token, 'users', `email='${email}'`)];
  expect((await asSuperuser(token, `/api/collections/profiles/records/${profile.id}`, json('PATCH', { owner: user.id }))).status).toBe(200);
}

// A Profile's owner as the Operator sees it in the admin UI: a users record id, or '' for none.
// ASSUMPTION: read as the superuser at the loopback port, because no public read shows an owner and the Fixture is closed to
// every Creator (rung 3: the spec's Operator steps go there). Overturned if a public answer ever names an owner.
export async function ownerOf(username: string): Promise<string> {
  return (await only(await superuserToken(), 'profiles', `username='${username}'`)).owner;
}

// An in-memory PNG of one colour (spec, Testing Decisions, Images): no fixture file, and proof a non-webp input comes out webp.
const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function png(width: number, height: number, [r, g, b]: [number, number, number]) {
  const crc = (buf: Buffer) => {
    let c = 0xffffffff;
    for (const x of buf) c = CRC_TABLE[(c ^ x) & 255] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type: string, data: Buffer) => {
    const body = Buffer.concat([Buffer.from(type, 'latin1'), data]);
    const out = Buffer.alloc(body.length + 8);
    out.writeUInt32BE(data.length, 0);
    body.copy(out, 4);
    out.writeUInt32BE(crc(body), body.length + 4);
    return out;
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8 bits per channel
  ihdr[9] = 2; // RGB
  const row = Buffer.concat([Buffer.from([0]), Buffer.from(Array.from({ length: width }, () => [r, g, b]).flat())]);
  const pixels = Buffer.concat(Array.from({ length: height }, () => row));
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(pixels)), chunk('IEND', Buffer.alloc(0))]);
}
export const pngFile = (name: string, colour: [number, number, number]) => ({ name, mimeType: 'image/png', buffer: png(600, 400, colour) });
export const isWebp = (b: Buffer) => b.length >= 12 && b.toString('latin1', 0, 4) === 'RIFF' && b.toString('latin1', 8, 12) === 'WEBP';

// ---- The Creator, the Visitor and the proxy, as the spec drives them ----------------------------------------------------------

export const PHONE = { width: 390, height: 844 };
const TEST_SECRETS: Record<string, string> = JSON.parse(readFileSync(join(ROOT, 'tests', 'fixtures', 'netlify', 'functions', 'secrets.json'), 'utf8'));
export const holdsDestination = (body: string) => Object.values(TEST_SECRETS).some((d) => body.includes(d));

export type Creator = { email: string; password: string; username: string };
export const fresh = (): Creator => {
  const id = randomBytes(4).toString('hex');
  return { email: `signup_${id}@example.com`, password: `throwaway-${id}`, username: `signup_${id}` };
};

// The Editor's screens, found by their headings.
export const SIGN_UP = 'Create your page';
export const LOG_IN = 'Log in';
export const CLAIM = 'Claim your Username';
export const VERIFY = 'Verify your email';
export const heading = (page: Page, name: string) => page.getByRole('heading', { name, exact: true });

export async function signUp(page: Page, creator: Creator) {
  await page.goto('/edit/signup');
  await page.getByLabel('Email').fill(creator.email);
  await page.getByLabel('Password').fill(creator.password);
  await page.getByLabel('Username').fill(creator.username);
  await page.getByRole('button', { name: 'Create account' }).click();
}

export async function logIn(page: Page, creator: Creator) {
  await page.goto('/edit');
  await expect(heading(page, LOG_IN)).toBeVisible();
  await page.getByLabel('Email').fill(creator.email);
  await page.getByLabel('Password').fill(creator.password);
  await page.getByRole('button', { name: 'Log in' }).click();
}

// A fresh context at 390×844 with no Editor session, with an optional User-Agent. Given the stack's origin, it reaches only that
// host: every request elsewhere is aborted, so nothing leaves the machine.
export async function phoneContext(browser: Browser, { origin, userAgent }: { origin?: string; userAgent?: string } = {}) {
  const context = await browser.newContext({ viewport: PHONE, ...(userAgent ? { userAgent } : {}) });
  if (origin) await context.route((url) => url.host !== new URL(origin).host, (route) => route.abort('blockedbyclient'));
  return context;
}

export async function expectVerifyScreen(page: Page) {
  await expect(heading(page, VERIFY)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Resend email' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Continue' })).toBeVisible();
  await expect(page).toHaveURL(/\/edit\/verify-email$/);
}

// The proxy, called as the Editor calls it: JSON bodies, the token as the Authorization header.
export const proxy = (request: APIRequestContext, token?: string) => {
  const headers = token ? { Authorization: token } : {};
  return {
    get: (path: string) => request.get(`/api/collections/${path}`, { headers }),
    post: (path: string, data: object = {}) => request.post(`/api/collections/${path}`, { headers, data }),
    patch: (path: string, data: object = {}) => request.patch(`/api/collections/${path}`, { headers, data }),
  };
};

// An account made and signed in through the proxy: its token and record id.
export async function account(request: APIRequestContext, creator: Creator = fresh()) {
  const anonymous = proxy(request);
  const created = await anonymous.post('users/records', { email: creator.email, password: creator.password, passwordConfirm: creator.password });
  expect(created.status(), 'anonymous sign-up through the proxy').toBe(200);
  const auth = await anonymous.post('users/auth-with-password', { identity: creator.email, password: creator.password });
  expect(auth.status(), 'an unverified account signs in through the proxy').toBe(200);
  const { token, record } = await auth.json();
  expect(record.verified).toBe(false);
  return { creator, token: token as string, id: record.id as string };
}

// The 00-smoke In-App Browser User-Agent.
export const INSTAGRAM_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) ' +
  'Mobile/15E148 Instagram 300.0.0.0.0 (iPhone14,2; iOS 17_0; en_US; en-US; scale=3.00; 1170x2532; 0)';

// A verified Creator with a named Profile on Escape Mode and two Links, arranged through the proxy as the Creator would through
// the Editor; only the verification is the Operator's step. Links are [title, Mode] with '' for "Profile default", and their
// Destinations are test-only example.com addresses.
// ASSUMPTION: arranged as the Creator through the proxy, with only the verification as the Operator's step, so the describe
// skips off the local test stack (rung 3: ticket 26's markVerified and onLocalStack). Overturned when 31's mail catcher lands.
export async function verifiedCreator(request: APIRequestContext, links: [string, string][]) {
  const { token, id, creator } = await account(request);
  const as = proxy(request, token);
  const claimed = await as.post('profiles/records', { username: creator.username, owner: id, mode: 'escape_ig' });
  expect(claimed.status()).toBe(200);
  const profileId = (await claimed.json()).id as string;
  await markVerified(creator.email);
  const named = await as.patch(`profiles/records/${profileId}`, { displayName: 'Before Name', bio: 'Before bio.' });
  expect(named.status()).toBe(200);
  const linkIds: string[] = [];
  for (const [order, [title, mode]] of links.entries()) {
    const res = await as.post('links/records', { profile: profileId, title, order, mode, destination: `https://example.com/${creator.username}/${order}` });
    expect(res.status(), title).toBe(200);
    linkIds.push((await res.json()).id);
  }
  return { creator, token, profileId, linkIds };
}

export type Served = {
  profile: { displayName: string; bio: string; avatarUrl: string; mode: string };
  links: { title: string; mode: string; icon: string; backgroundImage: string; isAdult: boolean; tracking: boolean; default_tracknumber?: string }[];
};
export const servedProfile = async (request: APIRequestContext, username: string): Promise<Served> => {
  const res = await request.get(`/api/profiles/${username}.json`);
  expect(res.status()).toBe(200);
  const body = await res.text();
  expect(holdsDestination(body) || body.includes('https://example.com/'), 'a Destination in the Profile JSON').toBe(false);
  return JSON.parse(body);
};

// "Featured Links": one row per Link, its title the row's only text; Edit is the title, Up, Down and Delete are named buttons.
export const featured = (page: Page) => page.getByRole('list', { name: 'Links' }).getByRole('listitem');

// The next load of the public Profile, in a fresh context: its Link titles in the order Visitors see them.
export async function visitorSees(browser: Browser, origin: string, username: string, titles: string[]) {
  const context = await phoneContext(browser, { origin });
  const visitor = await context.newPage();
  const served = visitor.waitForResponse((res) => new URL(res.url()).pathname === `/api/profiles/${username}.json`);
  await visitor.goto(`/${username}`);
  await served;
  await expect(visitor.locator('.link-card .link-title')).toHaveText(titles);
  await context.close();
}
