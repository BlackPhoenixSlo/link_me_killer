import { test, expect } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

// Ticket 14: the v1 Import CLI, run as a process with this machine's Node and no PocketBase reachable.
// Observed only through its printed lines and exit code. Destinations are compared as booleans and never printed.
const ROOT = join(__dirname, '..', '..');
const CLI = join(ROOT, 'app', 'bin', 'import-v1');
// The v1 Snapshot: V1_SNAPSHOT names it (default linkme_clone3/); set empty, or naming no directory, it is absent, as on a fresh
// clone, and its cases skip. The same variable as 02-profile-parity and tests/stack.sh.
const V1_SNAPSHOT = process.env.V1_SNAPSHOT ?? 'linkme_clone3';
const SNAPSHOT = V1_SNAPSHOT ? resolve(ROOT, V1_SNAPSHOT) : '';
// A directory, as tests/stack.sh's `[ -d ]` asks; the same guard in 02-profile-parity.
const isDirectory = (path: string) => {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
};
const SNAPSHOT_PRESENT = SNAPSHOT !== '' && isDirectory(SNAPSHOT);
// The broken tree sits at tests/v1-broken/, not under tests/fixtures/, whose exact file list Phase 0 pins (phase-00-new-repo-ground.md:149; rung 1, recorded in the Phase 2 spec's Refusal case).
const BROKEN = join(ROOT, 'tests', 'v1-broken');

const tempDirs: string[] = [];
const tempDir = (prefix: string) => {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
};
test.afterAll(() => tempDirs.forEach((dir) => rmSync(dir, { recursive: true, force: true })));

function runImport(sites: string[]) {
  const r = spawnSync(process.execPath, [CLI, ...sites.flatMap((s) => ['--site', s])], { encoding: 'utf8' });
  const lines = `${r.stdout}${r.stderr}`.split('\n').filter(Boolean);
  return { status: r.status, lines };
}

// The Fixture site as the seed will see it: a temporary copy of tests/fixtures with the Page Copy's stock icons as images/.
function fixtureSite() {
  const dir = tempDir('v1-fixture-');
  cpSync(join(ROOT, 'tests', 'fixtures'), dir, { recursive: true });
  cpSync(join(ROOT, 'app', 'public', 'images'), join(dir, 'images'), { recursive: true });
  return dir;
}

// Every url and secrets value of the given sites, read raw so that a file the import refuses still counts.
function destinationsIn(sites: string[]) {
  const values: string[] = [];
  for (const site of sites) {
    const profiles = join(site, 'api', 'profiles');
    for (const f of readdirSync(profiles).filter((n) => n.endsWith('.json') && statSync(join(profiles, n)).isFile())) {
      for (const m of readFileSync(join(profiles, f), 'utf8').matchAll(/"url"\s*:\s*"([^"]*)"/g)) values.push(m[1]);
    }
    const secrets = JSON.parse(readFileSync(join(site, 'netlify', 'functions', 'secrets.json'), 'utf8'));
    values.push(...Object.values(secrets).filter((v): v is string => typeof v === 'string'));
  }
  return values.filter(Boolean);
}

// Prints only a boolean: does any printed line hold a Destination from the input?
const holdsDestination = (lines: string[], sites: string[]) => {
  const needles = destinationsIn(sites);
  return lines.some((l) => needles.some((n) => l.includes(n)));
};

const startsWith = (lines: string[], prefix: string) => lines.filter((l) => l.startsWith(prefix));

// Is the stack under test the local test stack that tests/stack.sh starts? The same predicate, by the same name, in
// 02-v1-import and 02-profile-parity.
const onLocalStack = () => !process.env.PLAYWRIGHT_BASE_URL || new URL(process.env.PLAYWRIGHT_BASE_URL).origin === 'http://localhost:4173';

// Kept beside the compose-run refusal in 're-runs': this one runs with this machine's Node and no stack, the off-stack path.
test('the broken tree is refused with one line per bad file, before any write', () => {
  const { status, lines } = runImport([BROKEN]);
  expect(status).toBe(1);
  const invalid = startsWith(lines, 'invalid v1 file: ');
  expect(invalid.length).toBe(lines.length); // nothing else: no repair lines and no write
  expect(invalid.filter((l) => l.includes('importcheck_badjson.json: ')).length).toBe(1);
  expect(invalid.filter((l) => l.includes('importcheck_nolinks.json: ')).length).toBe(1);
  expect(invalid.length).toBe(2);
  expect(lines.some((l) => l.includes('importcheck_ok'))).toBe(false);
  expect(holdsDestination(lines, [BROKEN])).toBe(false);
});

test('a bad Username and bad Destinations are refused, one line per problem', () => {
  const site = tempDir('v1-refuse-');
  mkdirSync(join(site, 'api', 'profiles'), { recursive: true });
  mkdirSync(join(site, 'netlify', 'functions'), { recursive: true });
  const profile = (links: object[]) => JSON.stringify({ profile: { displayName: 'R', avatarUrl: '', bio: '', verified: false }, links });
  writeFileSync(join(site, 'api', 'profiles', 'Bad-Name.json'), profile([]));
  writeFileSync(
    join(site, 'api', 'profiles', 'refusecheck.json'),
    profile([
      { id: 'refusecheck_1', title: 'Adult', isAdult: true, url: '', tracking: false },
      { id: 'refusecheck_2', title: 'Plain', isAdult: false, url: '//example.com/protocol-relative', tracking: false },
      { id: 'refusecheck_3', title: 'Fine', isAdult: false, url: 'https://example.com/fine', tracking: false },
    ]),
  );
  writeFileSync(join(site, 'netlify', 'functions', 'secrets.json'), JSON.stringify({ refusecheck_1: 'ftp://example.com/not-http' }));
  const { status, lines } = runImport([site]);
  expect(status).toBe(1);
  const invalid = startsWith(lines, 'invalid v1 file: ');
  expect(invalid.length).toBe(lines.length);
  expect(invalid.filter((l) => l.includes('Bad-Name.json: ')).length).toBe(1);
  expect(invalid.filter((l) => l.includes('refusecheck.json: ') && l.includes('card 1')).length).toBe(1);
  expect(invalid.filter((l) => l.includes('refusecheck.json: ') && l.includes('card 2')).length).toBe(1);
  expect(invalid.length).toBe(3);
  expect(holdsDestination(lines, [site])).toBe(false);
});

// A throwaway v1-shaped site; each profile is written as given, so a test can hand in any url.
function throwawaySite(prefix: string, profiles: Record<string, object>, secrets: object = {}) {
  const site = tempDir(prefix);
  mkdirSync(join(site, 'api', 'profiles'), { recursive: true });
  mkdirSync(join(site, 'netlify', 'functions'), { recursive: true });
  for (const [name, links] of Object.entries(profiles)) {
    writeFileSync(join(site, 'api', 'profiles', name), JSON.stringify({ profile: { displayName: 'T', avatarUrl: '', bio: '', verified: false }, links }));
  }
  writeFileSync(join(site, 'netlify', 'functions', 'secrets.json'), JSON.stringify(secrets));
  return site;
}

test('a relative url the URL parser rejects is refused by its fixed reason and never printed', () => {
  // Backslashes turn into an authority the WHATWG parser rejects; the token marks the value in any printed form.
  const url = '\\\\[urltoken7q';
  const site = throwawaySite('v1-badurl-', {
    'badurl.json': [{ id: 'badurl_1', title: 'Plain', isAdult: false, url, tracking: false }],
  });
  const { status, lines } = runImport([site]);
  expect(status).toBe(1);
  const invalid = startsWith(lines, 'invalid v1 file: ');
  expect(invalid.length).toBe(lines.length);
  expect(invalid.length).toBe(1);
  expect(invalid[0].includes('badurl.json: card 1')).toBe(true);
  expect(lines.some((l) => l.includes('urltoken7q'))).toBe(false);
  expect(holdsDestination(lines, [site])).toBe(false);
});

test('a root-relative url whose backslash a browser reads as a second slash is refused and never printed', () => {
  // `/\host.example` would leave v2's origin in a browser, which reads `\` as `/`.
  const site = throwawaySite('v1-backslash-', {
    'backslash.json': [{ id: 'backslash_1', title: 'Plain', isAdult: false, url: '/\\host.example', tracking: false }],
  });
  const { status, lines } = runImport([site]);
  expect(status).toBe(1);
  const invalid = startsWith(lines, 'invalid v1 file: ');
  expect(invalid.length).toBe(lines.length);
  expect(invalid.length).toBe(1);
  expect(invalid[0].includes('backslash.json: card 1')).toBe(true);
  expect(holdsDestination(lines, [site])).toBe(false);
});

// `\\host/x`: a browser reads both backslashes as slashes, a protocol-relative url to another host (review note from
// ticket 15); it must not be rewritten into the root-relative `/x`. So must `\/host/x`, and `\\host/x` behind a leading
// tab, which the URL parser strips (review notes from ticket 19). The token marks the value in any printed form.
for (const [name, url] of [
  ['a url beginning with two backslashes, which a browser sends off-site, is refused and never printed', '\\\\urltoken9q.example/x'],
  ['a url beginning with a backslash and a slash, which a browser sends off-site, is refused and never printed', '\\/urltoken9q.example/x'],
  ['a url beginning with a tab and two backslashes, which a browser sends off-site, is refused and never printed', '\t\\\\urltoken9q.example/x'],
]) {
  test(name, () => {
    const site = throwawaySite('v1-twobackslash-', {
      'twobackslash.json': [{ id: 'twobackslash_1', title: 'Plain', isAdult: false, url, tracking: false }],
    });
    const { status, lines } = runImport([site]);
    expect(status).toBe(1);
    const invalid = startsWith(lines, 'invalid v1 file: ');
    expect(invalid.length).toBe(lines.length);
    expect(invalid.length).toBe(1);
    expect(invalid[0].includes('twobackslash.json: card 1')).toBe(true);
    expect(lines.some((l) => l.includes('urltoken9q'))).toBe(false);
    expect(holdsDestination(lines, [site])).toBe(false);
  });
}

test('a .json entry or an image path that is a directory is refused as unreadable, not a crash', () => {
  const site = throwawaySite('v1-dirs-', {});
  mkdirSync(join(site, 'api', 'profiles', 'dirprofile.json'));
  mkdirSync(join(site, 'images', 'sub'), { recursive: true });
  writeFileSync(
    join(site, 'api', 'profiles', 'dirimage.json'),
    JSON.stringify({ profile: { displayName: 'D', avatarUrl: '/images/sub', bio: '', verified: false }, links: [] }),
  );
  const { status, lines } = runImport([site]);
  expect(status).toBe(1);
  const invalid = startsWith(lines, 'invalid v1 file: ');
  expect(invalid.length).toBe(lines.length);
  expect(invalid.filter((l) => l.includes('dirprofile.json: ')).length).toBe(1);
  expect(invalid.filter((l) => l.includes('dirimage.json: avatarUrl')).length).toBe(1);
  expect(invalid.length).toBe(2);
  expect(holdsDestination(lines, [site])).toBe(false);
});

test('a Profile file holding JSON null gets its own refusal line next to another bad file', () => {
  const site = throwawaySite('v1-null-', {});
  writeFileSync(join(site, 'api', 'profiles', 'nullprofile.json'), 'null');
  writeFileSync(join(site, 'api', 'profiles', 'nolinksnull.json'), JSON.stringify({ profile: { displayName: 'N', avatarUrl: '', bio: '', verified: false } }));
  const { status, lines } = runImport([site]);
  expect(status).toBe(1);
  const invalid = startsWith(lines, 'invalid v1 file: ');
  expect(invalid.length).toBe(lines.length);
  expect(invalid.filter((l) => l.includes('nullprofile.json: ')).length).toBe(1);
  expect(invalid.filter((l) => l.includes('nolinksnull.json: ')).length).toBe(1);
  expect(invalid.length).toBe(2);
  expect(holdsDestination(lines, [site])).toBe(false);
});

test('one Username in two sites refuses the run', () => {
  const a = fixtureSite();
  const b = fixtureSite();
  const { status, lines } = runImport([a, b]);
  expect(status).toBe(1);
  const invalid = startsWith(lines, 'invalid v1 file: ');
  expect(invalid.length).toBe(lines.length);
  expect(invalid.length).toBe(1);
  expect(invalid[0].startsWith(`invalid v1 file: ${join(b, 'api', 'profiles', 'fixture.json')}: `)).toBe(true);
  expect(holdsDestination(lines, [a, b])).toBe(false);
});

test('the Fixture site alone plans three dropped entries and stops at its first write', () => {
  const site = fixtureSite();
  const { status, lines } = runImport([site]);
  expect(status).toBe(2);
  expect(startsWith(lines, 'invalid v1 file: ').length).toBe(0);
  const dropped = startsWith(lines, 'dropped: ');
  expect(dropped.length).toBe(3);
  expect(dropped.every((l) => l.startsWith('dropped: fixture card '))).toBe(true);
  expect(startsWith(lines, 'repaired: ').length).toBe(0);
  expect(startsWith(lines, 'missing image: ').length).toBe(0);
  expect(startsWith(lines, 'no destination: ').length).toBe(0);
  expect(lines[lines.length - 1].startsWith('write failed: ')).toBe(true);
  expect(holdsDestination(lines, [site])).toBe(false);
});

test('the v1 Snapshot then the Fixture site: every file repaired or kept, then the first write', () => {
  test.skip(!SNAPSHOT_PRESENT, 'v1 Snapshot absent');
  const fixture = fixtureSite();
  const { status, lines } = runImport([SNAPSHOT, fixture]);

  expect(startsWith(lines, 'invalid v1 file: ').length).toBe(0);
  const repairedFiles = startsWith(lines, 'repaired: ').map((l) => l.match(/\/([^/]+\.json): /)?.[1]);
  expect(repairedFiles.sort()).toEqual(['jaka7q.json', 'weiwei.json']);

  const orphanKeys = lines.map((l) => l.match(/^dropped: secrets entry (\S+) has no Link$/)?.[1]).filter(Boolean);
  expect(orphanKeys.length).toBe(10);
  expect(new Set(orphanKeys).size).toBe(10);
  const entryDropped = lines.map((l) => l.match(/^dropped: (\S+) card \d+: /)?.[1]).filter(Boolean);
  expect(entryDropped.filter((u) => u !== 'fixture').length).toBe(4);
  expect(entryDropped.filter((u) => u === 'fixture').length).toBe(3);
  expect(startsWith(lines, 'dropped: ').length).toBe(10 + 4 + 3);

  const missing = startsWith(lines, 'missing image: ');
  expect(missing.length).toBe(6);
  expect(missing.every((l) => l.endsWith(': avatarUrl'))).toBe(true);
  expect(missing.map((l) => l.match(/\/([^/]+)\.json: /)?.[1]).sort()).toEqual(['bnjmklk', 'ja123', 'jaka', 'jaka5', 'jaka6q', 'jaka7q']);

  expect(startsWith(lines, 'no destination: ').length).toBe(8);

  expect(lines[lines.length - 1].startsWith('write failed: ')).toBe(true);
  expect(status).toBe(2);
  expect(holdsDestination(lines, [SNAPSHOT, fixture])).toBe(false);

  const snapshotStatus = spawnSync('git', ['-C', SNAPSHOT, 'status', '--porcelain'], { encoding: 'utf8' });
  expect(snapshotStatus.status).toBe(0);
  expect(snapshotStatus.stdout).toBe('');
});

// Ticket 17: the import's repairs, seen over HTTP on the stack that tests/stack.sh seeded with the v1 Snapshot first and the
// Fixture site last (spec, Testing Decisions, 02-v1-import, Repairs). The Snapshot's files are the oracle, read here with the
// import's own parse (as they are, else with the trailing commas removed). Destinations are compared as booleans; failure
// messages name a Username and card position.
test.describe('repairs, seen over HTTP on the seeded stack', () => {
  test.skip(!SNAPSHOT_PRESENT, 'v1 Snapshot absent');

  type V1Link = { id: string; title: string; url?: string; isAdult?: boolean };
  type V1File = { profile: { displayName?: string; avatarUrl?: string | null }; links: V1Link[] };
  type ServedLink = { id: string; title: string; isAdult: boolean };
  const PROFILES = join(SNAPSHOT, 'api', 'profiles');
  const v1File = (username: string): V1File => {
    const text = readFileSync(join(PROFILES, `${username}.json`), 'utf8');
    try {
      return JSON.parse(text);
    } catch {
      return JSON.parse(text.replace(/,(\s*[}\]])/g, '$1'));
    }
  };
  // Lower-case Profile files only: a capitalised one is a case twin the import skips.
  const usernames = () => readdirSync(PROFILES)
    .filter((n) => n.endsWith('.json') && n === n.toLowerCase())
    .map((n) => n.slice(0, -'.json'.length));
  const served = async (request: import('@playwright/test').APIRequestContext, username: string) => {
    const res = await request.get(`/api/profiles/${username}.json`);
    expect(res.status(), username).toBe(200);
    return (await res.json()) as { profile: { displayName: string; avatarUrl: string }; links: ServedLink[] };
  };
  // A relative url is stored root-relative, as v1's page at /{username} resolved it (the import's rule).
  const rootRelative = (url: string) => {
    if (url.startsWith('/') || /^[a-z][a-z0-9+.-]*:/i.test(url)) return url;
    const u = new URL(url, 'http://v1.invalid/');
    return u.pathname + u.search + u.hash;
  };
  const showsCards = async (page: import('@playwright/test').Page, file: V1File) => {
    const cards = page.locator('.link-card');
    await expect(cards).toHaveCount(file.links.length);
    for (const [i, link] of file.links.entries()) {
      expect(await cards.nth(i).locator('.link-title').textContent(), `card ${i + 1} title`).toBe(link.title);
      await expect(cards.nth(i).locator('.lock-icon-small'), `card ${i + 1} lock icon`).toHaveCount(link.isAdult ? 1 : 0);
    }
  };

  for (const path of ['/weiwei', '/weiWEi']) {
    test(`${path} shows the repaired file's display name and cards`, async ({ page }) => {
      const file = v1File('weiwei');
      await page.goto(path);
      await expect.poll(() => page.locator('#displayName').textContent()).toBe(file.profile.displayName);
      await showsCards(page, file);
    });
  }

  test('jaka7q\'s display name is jaka7q', async ({ page, request }) => {
    expect((await served(request, 'jaka7q')).profile.displayName).toBe('jaka7q');
    await page.goto('/jaka7q');
    await expect.poll(() => page.locator('#displayName').textContent()).toBe('jaka7q');
    expect(await page.title()).toBe('jaka7q');
  });

  for (const username of ['juliafilippo_', 'jaka6q', 'jaka7q']) {
    test(`${username} shows every card, each with a distinct Link Id`, async ({ page, request }) => {
      const file = v1File(username);
      expect(new Set(file.links.map((l) => l.id)).size < file.links.length, 'the file repeats a v1 Link Id').toBe(true);
      const json = await served(request, username);
      expect(json.links.map((l) => l.title)).toEqual(file.links.map((l) => l.title));
      expect(new Set(json.links.map((l) => l.id)).size).toBe(file.links.length);
      await page.goto(`/${username}`);
      await showsCards(page, file);
    });
  }

  test('the six Profiles whose avatar file is missing serve an empty avatar', async ({ page, request }) => {
    const missing = usernames().filter((u) => {
      const avatar = v1File(u).profile.avatarUrl;
      return typeof avatar === 'string' && avatar !== '' && !existsSync(join(SNAPSHOT, avatar));
    });
    expect(missing.sort()).toEqual(['bnjmklk', 'ja123', 'jaka', 'jaka5', 'jaka6q', 'jaka7q']);
    for (const username of missing) {
      expect((await served(request, username)).profile.avatarUrl, username).toBe('');
      await page.goto(`/${username}`);
      await expect(page.locator('.link-card')).toHaveCount(v1File(username).links.length);
      expect(await page.locator('#avatar').getAttribute('src'), username).toBe('');
    }
  });

  test('the four non-Adult Links that had a secrets entry reach their file\'s url through /r', async ({ request }) => {
    const secrets: Record<string, string> = JSON.parse(readFileSync(join(SNAPSHOT, 'netlify', 'functions', 'secrets.json'), 'utf8'));
    const cards = usernames().flatMap((username) =>
      v1File(username).links.flatMap((l, i) => (l.isAdult !== true && Object.hasOwn(secrets, l.id) ? [{ username, i, url: l.url ?? '' }] : [])),
    );
    expect(cards.length).toBe(4);
    expect(cards.some((c) => c.username === 'weiwei')).toBe(true);
    for (const { username, i, url } of cards) {
      const at = `${username} card ${i + 1}`;
      const link = (await served(request, username)).links[i];
      const res = await request.get(`/r/${link.id}`, { maxRedirects: 0 });
      expect(res.status(), at).toBe(302);
      expect(res.headers()['location'] === rootRelative(url), `${at} Location is its file's url`).toBe(true);
    }
  });
});

// Ticket 16 (folded from ticket 15's tests/stack-import-check.mjs): the test stack, its schema and the v1 Import's write half,
// checked through the Operator's three doors: PocketBase's REST API on its loopback port (as the superuser from tests/e2e.env),
// the import through `docker compose run`, and Compose's own status and inspect output. The harness's seed (tests/stack.sh) is the import run whose
// records are checked here; the CLI runs again only where a check needs its printed lines, on a copy of the Fixture site
// under another Username, which is removed afterwards, and in the re-runs at the end of this block. Destinations are compared as booleans and never printed.
// ASSUMPTION: the schema check stays in 02-v1-import, the spec's import spec, while the anonymous calls moved to 02-live-edit,
// where the spec's Testing Decisions place them (ticket 20; rung 2 for the move). Keeping the schema check here is rung 5: the
// spec names no file for it and the move would gain nothing. Overturned if the spec places the schema check in 02-live-edit.
// This file runs in the last Playwright project, `stack-import`, after every other spec (playwright.config.ts; spec, Spec
// order): the re-auth check below resets the superuser's password, which turns away every token issued before it, and a
// request another spec made at that moment could meet a second refusal after the app's one retry.
// ASSUMPTION: the last project lands here rather than with ticket 19's re-imports, because this ticket's re-auth check is
// already a write that other specs' reads can feel (rung 4: ordering is cheaper than a flaky 500). Overturned if the re-auth
// check moves to a stack of its own.
test.describe('on the test stack', () => {
  test.skip(!onLocalStack(), 'the stack under test is not the local test stack');

  const ENV: Record<string, string> = Object.fromEntries(
    readFileSync(join(ROOT, 'tests', 'e2e.env'), 'utf8')
      .split('\n')
      .filter((l) => /^[A-Z_]+=/.test(l))
      .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]),
  );
  const PB = `http://127.0.0.1:${ENV.PB_PORT}`;
  const FIXTURES = join(ROOT, 'tests', 'fixtures');
  const IMAGES = join(ROOT, 'app', 'public', 'images');
  const fixture = JSON.parse(readFileSync(join(FIXTURES, 'api', 'profiles', 'fixture.json'), 'utf8'));
  const secrets: Record<string, string> = JSON.parse(readFileSync(join(FIXTURES, 'netlify', 'functions', 'secrets.json'), 'utf8'));

  const compose = (...args: string[]) =>
    spawnSync('docker', ['compose', '--env-file', 'tests/e2e.env', ...args], { cwd: ROOT, encoding: 'utf8' });
  const pb = (pathname: string, { token, ...init }: RequestInit & { token?: string } = {}) =>
    fetch(PB + pathname, { ...init, headers: { ...(init.headers as Record<string, string>), ...(token ? { Authorization: token } : {}) } });
  const json = (body: object) => ({ method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

  let token: string;
  const signIn = async () => {
    const res = await pb('/api/collections/_superusers/auth-with-password', json({ identity: ENV.PB_SUPERUSER_EMAIL, password: ENV.PB_SUPERUSER_PASSWORD }));
    expect(res.status).toBe(200);
    token = (await res.json()).token;
  };
  test.beforeAll(signIn);
  const list = async (c: string, filter: string, sort = '') =>
    (await (await pb(`/api/collections/${c}/records?perPage=200&filter=${encodeURIComponent(filter)}${sort && `&sort=${sort}`}`, { token })).json()).items;

  test('caddy, app and pocketbase run, PocketBase is healthy, and the app answers through Caddy', async ({ request }) => {
    const ps = compose('ps', '--format', 'json').stdout.trim().split('\n').map((l) => JSON.parse(l));
    expect(['app', 'caddy', 'pocketbase'].every((s) => ps.some((c) => c.Service === s && c.State === 'running'))).toBe(true);
    expect(ps.some((c) => c.Service === 'pocketbase' && c.Health === 'healthy')).toBe(true);
    expect((await pb('/api/health')).status).toBe(200);
    const viaCaddy = await request.get('/');
    expect(viaCaddy.status()).toBe(200);
    expect(viaCaddy.headers()['via']).toContain('Caddy');
  });

  // Amended by ticket 25 (Phase 3), only where it opens a rule: users sign-up, log-in and own-record reads, and the profiles
  // claim and owner reads (1791140004_sign_up_and_claim.js); the Username's length and the one-Profile-per-owner index.
  // Amended by ticket 26, only where it opens a rule: the profiles update and every links rule, for the signed-in owner of the
  // Link's Profile (1791140005_content_rules.js). The file fields were already webp-only and stay as they were.
  // Amended by ticket 39 (Phase 5), only where it adds: the hidden Custom Domain on profiles and the update rule's clause that
  // refuses a Creator setting one (1791140008_domains.js); 05-domains proves both.
  test('the schema: fields, patterns, relations, file fields, and every rule superuser-only but the ones Phase 3 opens', async () => {
    const collection = async (name: string) => (await pb(`/api/collections/${name}`, { token })).json();
    const [users, profiles, links, events] = await Promise.all(['users', 'profiles', 'links', 'events'].map(collection));
    const rulesClosed = (c: Record<string, unknown>, rules = ['listRule', 'viewRule', 'createRule', 'updateRule', 'deleteRule']) => rules.every((r) => c[r] === null);
    const OWN = '@request.auth.id != "" && id = @request.auth.id';
    const OWNER = '@request.auth.id != "" && owner = @request.auth.id';
    expect(users.type === 'auth' && rulesClosed(users, ['updateRule', 'deleteRule']) && users.manageRule === null, 'users update and delete closed').toBe(true);
    expect(users.authRule === '' && users.listRule === OWN && users.viewRule === OWN, 'users sign in, and read only their own record').toBe(true);
    expect(users.createRule.includes('@request.body.verified:isset = false'), 'users sign-up sets nothing but email and password').toBe(true);
    expect(rulesClosed(profiles, ['deleteRule']), 'profiles delete closed').toBe(true);
    expect(profiles.updateRule, 'profiles updated by their verified owner, not Username, owner, badge or v1Key').toBe(
      `${OWNER} && @request.auth.verified = true && @request.body.username:isset = false && @request.body.owner:isset = false && @request.body.verified:isset = false && @request.body.v1Key:isset = false && @request.body.customDomain:isset = false`,
    );
    expect(profiles.listRule === OWNER && profiles.viewRule === OWNER, 'profiles read by their owner only').toBe(true);
    expect(profiles.createRule.startsWith('@request.auth.id != "" && @request.body.owner = @request.auth.id && '), 'profiles claimed by a signed-in Creator for itself').toBe(true);
    expect(profiles.indexes.some((i: string) => /UNIQUE INDEX .*\(owner\) WHERE owner != ''/.test(i)), 'one Profile per owner, ownerless ones exempt').toBe(true);
    const LINK_OWNER = '@request.auth.id != "" && profile.owner = @request.auth.id';
    const DESTINATION_OK = '(@request.body.destination ~ "https://%" || @request.body.destination ~ "http://%" || @request.body.destination ~ "/%")';
    expect(links.listRule === LINK_OWNER && links.viewRule === LINK_OWNER, 'links read by the owner of their Profile only').toBe(true);
    expect(links.createRule, 'links added by the verified owner, no id, Link Id or v1Key, a checked Destination').toBe(
      `@request.auth.id != "" && @request.body.profile.owner = @request.auth.id && @request.auth.verified = true && @request.body.id:isset = false && @request.body.linkId:isset = false && @request.body.v1Key:isset = false && ${DESTINATION_OK}`,
    );
    expect(links.updateRule, 'links edited by the verified owner, not Profile, Link Id or v1Key, a sent Destination checked').toBe(
      `${LINK_OWNER} && @request.auth.verified = true && @request.body.profile:isset = false && @request.body.linkId:isset = false && @request.body.v1Key:isset = false && (@request.body.destination:isset = false || ${DESTINATION_OK})`,
    );
    expect(links.deleteRule, 'links deleted by the verified owner').toBe(`${LINK_OWNER} && @request.auth.verified = true`);
    expect(events.type === 'base' && rulesClosed(events), 'events closed').toBe(true);
    type Field = { name: string; type: string; system?: boolean; [k: string]: unknown };
    const field = (c: { fields: Field[] }, name: string) => c.fields.find((f) => f.name === name) || ({} as Field);
    const shape = (c: { fields: Field[] }) => c.fields.filter((f) => !f.system).map((f) => `${f.name}:${f.type}`).join(' ');
    expect(shape(profiles)).toBe('username:text displayName:text bio:text verified:bool avatar:file mode:select owner:relation v1Key:text customDomain:text');
    expect(shape(links)).toBe(
      'profile:relation linkId:text title:text order:number isAdult:bool mode:select destination:text tracking:bool defaultTrackingCode:text geo:json icon:file backgroundImage:file v1Key:text',
    );
    expect(shape(events)).toBe('profile:relation link:relation kind:select country:text inAppBrowser:text created:autodate');
    const username = field(profiles, 'username');
    expect(username.required && username.pattern === '^[a-z0-9_]{3,30}$' && username.min === 3 && username.max === 30).toBe(true);
    expect(profiles.indexes.some((i: string) => /UNIQUE INDEX .* \(username\)/.test(i))).toBe(true);
    const linkId = field(links, 'linkId');
    expect(linkId.required && linkId.autogeneratePattern === '[a-z0-9]{12}' && linkId.pattern === '^[a-z0-9]{12}$').toBe(true);
    expect(links.indexes.some((i: string) => /UNIQUE INDEX .* \(linkId\)/.test(i))).toBe(true);
    expect(field(links, 'destination').pattern).toBe(String.raw`^(https?://[^\s\\/]|/[^\s\\/])[^\s\\]*$`);
    const relation = (c: { fields: Field[] }, name: string, target: string, cascade: boolean) => {
      const f = field(c, name);
      return f.type === 'relation' && f.collectionId === target && f.maxSelect === 1 && f.cascadeDelete === cascade;
    };
    expect(relation(links, 'profile', profiles.id, true) && field(links, 'profile').required).toBe(true);
    expect(relation(profiles, 'owner', users.id, false) && !field(profiles, 'owner').required).toBe(true);
    expect(relation(events, 'profile', profiles.id, true) && field(events, 'profile').required).toBe(true);
    expect(relation(events, 'link', links.id, false) && !field(events, 'link').required).toBe(true);
    expect(field(events, 'kind').values).toEqual(['page_view', 'click']);
    expect(field(events, 'kind').maxSelect).toBe(1);
    expect(field(events, 'created').onCreate === true && field(events, 'created').onUpdate === false).toBe(true);
    for (const c of [profiles, links]) {
      expect(field(c, 'mode').values).toEqual(['direct', 'escape_ig', 'deeplink']);
      expect(field(c, 'mode').required).toBe(false);
    }
    const files = [users, profiles, links].flatMap((c) => c.fields.filter((f: Field) => f.type === 'file'));
    expect(files.length).toBe(4);
    for (const f of files) {
      expect(f.mimeTypes).toEqual(['image/webp']);
      expect(f.maxSelect).toBe(1);
      expect(f.maxSize).toBe(5 * 1024 * 1024);
    }
  });

  test('the seed wrote the Fixture Profile: fields, Links in order, fresh Link Ids, Destinations and image bytes', async () => {
    const [profile] = await list('profiles', "username='fixture'");
    expect(profile).toBeTruthy();
    expect(profile.mode).toBe(fixture.profile.mode);
    expect(profile.displayName === fixture.profile.displayName && profile.bio === fixture.profile.bio).toBe(true);
    expect(profile.verified === fixture.profile.verified && profile.v1Key === 'fixture.json').toBe(true);
    const written = await list('links', `profile='${profile.id}'`, 'order');
    expect(written.length).toBe(4);
    expect(written.map((l: { title: string }) => l.title)).toEqual(fixture.links.map((l: { title: string }) => l.title));
    expect(written.every((l: { order: number }, i: number) => l.order === i)).toBe(true);
    expect(written.every((l: { linkId: string }) => /^[a-z0-9]{12}$/.test(l.linkId))).toBe(true);
    expect(new Set(written.map((l: { linkId: string }) => l.linkId)).size).toBe(4);
    for (const [i, l] of written.entries()) {
      const f = fixture.links[i];
      const card = `card ${i + 1}`;
      expect(l.linkId !== l.id && !f.id.toLowerCase().includes(l.linkId) && !l.linkId.includes(f.id.toLowerCase()), card).toBe(true);
      expect(l.v1Key, card).toBe(`${f.id}#1`);
      expect(l.mode === (f.mode || '') && l.isAdult === (f.isAdult === true) && l.tracking === (f.tracking === true), card).toBe(true);
      expect(l.defaultTrackingCode === (f.default_tracknumber ?? ''), card).toBe(true);
      expect(l.destination === (f.isAdult ? secrets[f.id] : f.url), `${card} Destination`).toBe(true);
      if (f.isAdult) expect(JSON.stringify(l.geo) === JSON.stringify(f.geo), `${card} Geo Rule`).toBe(true);
    }
    // Images, byte for byte against the stock icons the Fixture Profile names.
    const same = async (c: string, record: Record<string, string>, fieldName: string, v1Path?: string) => {
      if (!v1Path) return !record[fieldName];
      if (!record[fieldName]) return false;
      const res = await pb(`/api/files/${c}/${record.id}/${record[fieldName]}`, { token });
      return res.ok && Buffer.from(await res.arrayBuffer()).equals(readFileSync(join(IMAGES, v1Path.replace(/^\/images\//, ''))));
    };
    const slots = [await same('profiles', profile, 'avatar', fixture.profile.avatarUrl)];
    for (const [i, l] of written.entries()) {
      slots.push(await same('links', l, 'icon', fixture.links[i].icon), await same('links', l, 'backgroundImage', fixture.links[i].backgroundImage));
    }
    expect(slots.every(Boolean)).toBe(true);
    expect(slots.length).toBe(9);
  });

  // The import through `docker compose run`, as the Operator runs it; its site is mounted read-only at /site, with the given
  // images directory as /site/images. Compose's own `Container …` lines are left out.
  const importLines = (r: { stdout: string; stderr: string }) =>
    `${r.stdout}${r.stderr}`.split('\n').filter((l) => l && !/^\s*Container /.test(l));
  const treeMounts = (tree: string) => [`${join(tree, 'api')}:/site/api:ro`, `${join(tree, 'netlify')}:/site/netlify:ro`];
  const composeImport = (siteMounts: string[], images = IMAGES) => {
    const r = compose('run', '--rm', ...siteMounts.flatMap((m) => ['-v', m]), '-v', `${images}:/site/images:ro`, 'app', 'import-v1', '--site', '/site');
    return { status: r.status, lines: importLines(r) };
  };
  const SUMMARY = /^imported: \d+ Profiles, \d+ Links, \d+ images, \d+ warnings$/;

  test('the import\'s printed lines: a write error exits 2, the next run completes it with three dropped lines, the stale Profiles named and the summary; no Destination printed', async () => {
    // The Fixture site under another Username, so a full run can write; its Profile is removed at the end.
    const site = tempDir('v1-stackcheck-');
    mkdirSync(join(site, 'api', 'profiles'), { recursive: true });
    cpSync(join(FIXTURES, 'api', 'profiles', 'fixture.json'), join(site, 'api', 'profiles', 'stackcheck.json'));
    cpSync(join(FIXTURES, 'netlify'), join(site, 'netlify'), { recursive: true });
    // The same site, but card 2's icon is a WebP header padded past the schema's 5 MB: the import accepts it and PocketBase
    // refuses it, after the Profile and card 1 are written.
    const oversized = tempDir('v1-stackcheck-big-');
    mkdirSync(join(oversized, 'api', 'profiles'), { recursive: true });
    cpSync(join(FIXTURES, 'netlify'), join(oversized, 'netlify'), { recursive: true });
    cpSync(IMAGES, join(oversized, 'images'), { recursive: true });
    const big = Buffer.alloc(5 * 1024 * 1024 + 64);
    big.write('RIFF', 0, 'latin1');
    big.writeUInt32LE(big.length - 8, 4);
    big.write('WEBPVP8 ', 8, 'latin1');
    writeFileSync(join(oversized, 'images', 'oversized.webp'), big);
    const file = JSON.parse(readFileSync(join(FIXTURES, 'api', 'profiles', 'fixture.json'), 'utf8'));
    file.links[1].icon = '/images/oversized.webp';
    writeFileSync(join(oversized, 'api', 'profiles', 'stackcheck.json'), JSON.stringify(file));
    try {
      const failed = composeImport(treeMounts(oversized), join(oversized, 'images'));
      expect(holdsDestination(failed.lines, [oversized])).toBe(false);
      expect(failed.status).toBe(2);
      expect(failed.lines.at(-1)).toBe('write failed: stackcheck card 2 refused');
      const [partial] = await list('profiles', "username='stackcheck'");
      const partialLinks = await list('links', `profile='${partial.id}'`, 'order');
      expect(partialLinks.length).toBe(1);

      const run = composeImport(treeMounts(site));
      expect(holdsDestination(run.lines, [site])).toBe(false);
      expect(run.status).toBe(0);
      expect(startsWith(run.lines, 'dropped: stackcheck card ').length).toBe(3);
      // Every other v1-imported Profile is absent from this run's input, so each is named once; none is deleted.
      const stale = startsWith(run.lines, 'stale in v2: ');
      const imported = (await list('profiles', "v1Key!=''")).map((p: { username: string }) => p.username).filter((u: string) => u !== 'stackcheck');
      expect(stale.map((l) => l.slice('stale in v2: '.length)).sort()).toEqual(imported.sort());
      expect(run.lines.at(-1)).toBe(`imported: 1 Profiles, 4 Links, 6 images, ${3 + stale.length} warnings`);
      expect((await list('profiles', "username='stackcheck'")).length).toBe(1);
      const written = await list('links', `profile='${partial.id}'`, 'order');
      expect(written.length).toBe(4); // no duplicate: card 1 matched by its v1Key
      expect(written[0].id === partialLinks[0].id && written[0].linkId === partialLinks[0].linkId).toBe(true);

      const appId = compose('ps', '-q', 'app').stdout.trim();
      const mounts = JSON.parse(spawnSync('docker', ['inspect', '--format', '{{json .Mounts}}', appId], { encoding: 'utf8' }).stdout);
      expect(mounts).toEqual([]); // the running app mounts no site
      // No one-off import container is left: none of the project's containers carries Compose's one-off label.
      const oneOffs = spawnSync('docker', ['ps', '-a', '-q', '--filter', `label=com.docker.compose.project=${ENV.COMPOSE_PROJECT_NAME}`,
        '--filter', 'label=com.docker.compose.oneoff=True'], { encoding: 'utf8' });
      expect(oneOffs.status).toBe(0);
      expect(oneOffs.stdout.trim()).toBe('');
    } finally {
      for (const p of await list('profiles', "username='stackcheck'")) await pb(`/api/collections/profiles/records/${p.id}`, { method: 'DELETE', token });
    }
  });

  test('the app signs in again when PocketBase stops accepting its superuser token', async ({ request }) => {
    // Setting the superuser's password (to the same value) makes PocketBase refuse every token issued before it.
    const [superuser] = (await (await pb(`/api/collections/_superusers/records?filter=${encodeURIComponent(`email='${ENV.PB_SUPERUSER_EMAIL}'`)}`, { token })).json()).items;
    const password = ENV.PB_SUPERUSER_PASSWORD;
    const reset = await pb(`/api/collections/_superusers/records/${superuser.id}`, { ...json({ password, passwordConfirm: password }), method: 'PATCH', token });
    expect(reset.status).toBe(200);
    // The old token is now a guest's. Probed on events, which stay superuser-only: since ticket 25 a guest lists profiles, and
    // since ticket 26 links, as an empty list (200), which the app's gateway confirms with a token refresh (app/src/gateway.js).
    expect((await pb('/api/collections/events/records', { token })).status).toBe(403);
    await signIn();
    const res = await request.get('/api/profiles/fixture.json');
    expect(res.status()).toBe(200);
    const served = (await res.json()).links as { id: string; title: string }[];
    expect(served.length).toBe(4);
    // Once more, with a Link read first: `/r` lists links before anything lists profiles, so a guest's empty links list must not
    // read as an unknown Link Id.
    const reset2 = await pb(`/api/collections/_superusers/records/${superuser.id}`, { ...json({ password, passwordConfirm: password }), method: 'PATCH', token });
    expect(reset2.status).toBe(200);
    await signIn();
    const direct = served.find((l) => l.title === 'Direct Link')!;
    const redirect = await request.get(`/r/${direct.id}`, { maxRedirects: 0 });
    expect(redirect.status()).toBe(302);
  });

  test('PocketBase refuses a Destination that is neither absolute http(s) nor root-relative', async () => {
    // On a throwaway Profile, so that no other spec's served Fixture Profile changes.
    const profileRes = await pb('/api/collections/profiles/records', { ...json({ username: 'destcheck' }), token });
    expect(profileRes.status).toBe(200);
    const profile = await profileRes.json();
    try {
      const createLink = async (destination: string) => {
        const res = await pb('/api/collections/links/records', { ...json({ profile: profile.id, title: 'destination check', destination }), token });
        return { status: res.status, linkId: (await res.json()).linkId };
      };
      for (const bad of ['javascript:alert(1)', '//host.example/path', '/\\host.example', '/\t/host.example']) {
        expect((await createLink(bad)).status, JSON.stringify(bad)).toBe(400);
      }
      const rootRelative = await createLink('/landing.html');
      expect(rootRelative.status).toBe(200);
      expect(rootRelative.linkId).toMatch(/^[a-z0-9]{12}$/);
      expect((await createLink('https://example.com/destination-check')).status).toBe(200);
    } finally {
      await pb(`/api/collections/profiles/records/${profile.id}`, { method: 'DELETE', token }); // cascades to its Links
    }
  });

  // Ticket 19: re-runs of the v1 Import (spec, Testing Decisions, 02-v1-import: case twins and a stable re-run, refusal,
  // re-run with changes, no Destination printed, survives recreation). They write to the stack and recreate two of its
  // containers, so they come last in this file, one after another, and leave the Fixture Profile in place.
  test.describe('re-runs', () => {
    test.describe.configure({ mode: 'serial' });
    const RERUN_A = join(ROOT, 'tests', 'v1-rerun-a');
    const RERUN_B = join(ROOT, 'tests', 'v1-rerun-b');
    type Served = { profile: { mode: string; displayName: string; avatarUrl: string }; links: { id: string; title: string }[] };
    const total = async (c: string) => (await (await pb(`/api/collections/${c}/records?perPage=1`, { token })).json()).totalItems as number;
    const counts = async () => ({ profiles: await total('profiles'), links: await total('links') });
    const served = async (request: import('@playwright/test').APIRequestContext, username: string) => {
      const res = await request.get(`/api/profiles/${username}.json`);
      expect(res.status(), username).toBe(200);
      return (await res.json()) as Served;
    };
    // Every Profile's served Link Ids, by Username.
    const servedIds = async (request: import('@playwright/test').APIRequestContext) => {
      const ids: Record<string, string[]> = {};
      for (const p of await list('profiles', "id!=''", 'username')) ids[p.username] = (await served(request, p.username)).links.map((l) => l.id);
      return ids;
    };

    test('v1\'s git tree, archived and unpacked inside the container: three case twins skipped, counts and served Link Ids unchanged', async ({ request }) => {
      test.skip(!SNAPSHOT_PRESENT, 'v1 Snapshot absent');
      test.setTimeout(180_000);
      const before = await counts();
      const idsBefore = await servedIds(request);
      // The archive is read from git and unpacked only inside the one-off container, so all 30 Profile files exist there
      // (Linux is case-sensitive) and nothing is written into the v1 Snapshot. The Fixture site comes last, as in the seed.
      const fixtureMounts = ['-v', `${join(FIXTURES, 'api')}:/site/api:ro`, '-v', `${join(FIXTURES, 'netlify')}:/site/netlify:ro`, '-v', `${IMAGES}:/site/images:ro`];
      const r = spawnSync(
        'bash',
        [
          '-c',
          'set -o pipefail; git -C "$1" archive HEAD | docker compose --env-file tests/e2e.env run --rm -T "${@:2}" app sh -c ' +
            '"mkdir -p /tmp/v1 && tar -x -C /tmp/v1 && import-v1 --site /tmp/v1 --site /site"',
          'bash',
          SNAPSHOT,
          ...fixtureMounts,
        ],
        { cwd: ROOT, encoding: 'utf8' },
      );
      const lines = importLines(r);
      expect(holdsDestination(lines, [SNAPSHOT, FIXTURES])).toBe(false);
      expect(r.status).toBe(0);
      expect(startsWith(lines, 'invalid v1 file: ').length).toBe(0);
      const twins = lines.map((l) => l.match(/^skipped: \/tmp\/v1\/api\/profiles\/([^/]+): case twin of /)?.[1]).filter(Boolean);
      expect(twins.sort()).toEqual(['Jaka.json', 'JakaJaka.json', 'weiWEi.json']);
      expect(lines.filter((l) => l.includes('case twin')).length).toBe(3);
      expect(startsWith(lines, 'stale in v2: ').length).toBe(0);
      expect(SUMMARY.test(lines.at(-1) ?? '')).toBe(true);
      expect(await counts()).toEqual(before);
      expect(await servedIds(request)).toEqual(idsBefore);
      const snapshotStatus = spawnSync('git', ['-C', SNAPSHOT, 'status', '--porcelain'], { encoding: 'utf8' });
      expect(snapshotStatus.status === 0 && snapshotStatus.stdout === '').toBe(true);
    });

    test('the broken tree plus a case twin with other bytes is refused, one line per bad file, and nothing is written', async ({ page }) => {
      const before = await counts();
      // The twin is written inside the container, into a copy of the read-only tree.
      const r = compose('run', '--rm', '-v', `${BROKEN}:/broken:ro`, 'app', 'sh', '-c',
        'cp -R /broken /tmp/broken && printf \'{"profile":{},"links":[]}\' > /tmp/broken/api/profiles/Importcheck_ok.json && import-v1 --site /tmp/broken');
      const lines = importLines(r);
      expect(holdsDestination(lines, [BROKEN])).toBe(false);
      expect(r.status).toBe(1);
      const invalid = startsWith(lines, 'invalid v1 file: ');
      expect(invalid.length).toBe(lines.length);
      expect(invalid.filter((l) => l.includes('/importcheck_badjson.json: ')).length).toBe(1);
      expect(invalid.filter((l) => l.includes('/importcheck_nolinks.json: ')).length).toBe(1);
      expect(invalid.filter((l) => l.includes('/Importcheck_ok.json: case twin of importcheck_ok.json')).length).toBe(1);
      expect(invalid.length).toBe(3);
      // The good file is named only as the twin's other half, never on a line of its own.
      expect(lines.filter((l) => l.includes('importcheck_ok')).length).toBe(1);
      expect(await counts()).toEqual(before);
      await page.goto('/importcheck_ok');
      await expect(page).toHaveURL(/\/landing\.html$/);
    });

    test('tree A, then Direct Mode set through the API, then tree B: Link Ids kept, a fresh one for the new Link, the dropped one named and served, Mode kept', async ({ request }) => {
      test.setTimeout(120_000);
      const a = composeImport(treeMounts(RERUN_A));
      expect(holdsDestination(a.lines, [RERUN_A])).toBe(false);
      expect(a.status).toBe(0);
      expect(a.lines.some((l) => l.includes('reruncheck'))).toBe(false);
      const [profile] = await list('profiles', "username='reruncheck'");
      expect(profile.mode).toBe('escape_ig');
      const linksA = await list('links', `profile='${profile.id}'`, 'order');
      expect(linksA.map((l: { title: string }) => l.title)).toEqual(['Adult Link', 'Old Title', 'Dropped Link', 'Twin Link', 'Twin Link']);
      const idA = linksA.map((l: { linkId: string }) => l.linkId);
      expect(new Set(idA).size).toBe(5);

      const setMode = await pb(`/api/collections/profiles/records/${profile.id}`, { ...json({ mode: 'direct' }), method: 'PATCH', token });
      expect(setMode.status).toBe(200);
      // A Link born in v2 (no v1Key): never named, never touched.
      const born = await pb('/api/collections/links/records', { ...json({ profile: profile.id, title: 'Born in v2', order: 9, destination: '/landing.html' }), token });
      expect(born.status).toBe(200);
      const bornId = (await born.json()).linkId;

      const b = composeImport(treeMounts(RERUN_B));
      expect(holdsDestination(b.lines, [RERUN_B, RERUN_A])).toBe(false);
      expect(b.status).toBe(0);
      const stale = b.lines.filter((l) => l.startsWith('stale in v2: reruncheck'));
      expect(stale.length).toBe(1);
      expect(stale[0].startsWith('stale in v2: reruncheck card 3') && stale[0].includes(idA[2])).toBe(true);
      expect(b.lines.some((l) => l.includes(bornId))).toBe(false);
      expect(SUMMARY.test(b.lines.at(-1) ?? '')).toBe(true);

      const json_ = await served(request, 'reruncheck');
      expect(json_.profile.mode).toBe('direct');
      expect(json_.profile.displayName).toBe('Rerun Check B'); // v1 wins on its fields
      const byId = new Map(json_.links.map((l) => [l.id, l.title]));
      expect(byId.get(idA[0])).toBe('Adult Link');
      expect(byId.get(idA[1])).toBe('New Title');
      expect(byId.get(idA[2])).toBe('Dropped Link'); // still served until the Operator deletes it
      expect(byId.get(idA[3]) === 'Twin Link' && byId.get(idA[4]) === 'Twin Link').toBe(true);
      expect(byId.get(bornId)).toBe('Born in v2');
      const added = json_.links.filter((l) => l.title === 'Added Link');
      expect(added.length).toBe(1);
      expect(/^[a-z0-9]{12}$/.test(added[0].id) && !idA.includes(added[0].id) && added[0].id !== bornId).toBe(true);
      expect(json_.links.length).toBe(7);
      // v1 wins on the Destination, compared as a boolean.
      const secretsB: Record<string, string> = JSON.parse(readFileSync(join(RERUN_B, 'netlify', 'functions', 'secrets.json'), 'utf8'));
      const [adult] = await list('links', `linkId='${idA[0]}'`);
      expect(adult.destination === secretsB.reruncheck_1, 'the Adult Link\'s Destination is tree B\'s').toBe(true);
    });

    test('pocketbase and app recreated: the re-run Profile still serves in Direct Mode and the Fixture avatar with the same bytes', async ({ request }) => {
      test.setTimeout(180_000);
      const avatarBytes = async () => {
        const res = await request.get((await served(request, 'fixture')).profile.avatarUrl);
        expect(res.status()).toBe(200);
        return Buffer.from(await res.body());
      };
      const stock = readFileSync(join(IMAGES, fixture.profile.avatarUrl.replace(/^\/images\//, '')));
      expect((await avatarBytes()).equals(stock)).toBe(true);
      const idsBefore = (await served(request, 'reruncheck')).links.map((l) => l.id);

      const up = compose('up', '-d', '--force-recreate', '--wait', 'pocketbase', 'app');
      expect(up.status).toBe(0);
      await expect.poll(async () => (await request.get('/api/profiles/reruncheck.json')).status(), { timeout: 60_000 }).toBe(200);

      const after = await served(request, 'reruncheck');
      expect(after.profile.mode).toBe('direct');
      expect(after.links.map((l) => l.id)).toEqual(idsBefore);
      expect((await avatarBytes()).equals(stock)).toBe(true);
      const ps = compose('ps', '--format', 'json').stdout.trim().split('\n').map((l) => JSON.parse(l));
      expect(['app', 'caddy', 'pocketbase'].every((s) => ps.some((c) => c.Service === s && c.State === 'running'))).toBe(true);
      await signIn(); // the recreated PocketBase keeps its data; a fresh token for anything after this
    });
  });

  // Ticket 20: last in the last project, so after every other spec. Only a migration made the events collection: it was created
  // before the first request PocketBase logged on this stack's empty volume, so no API call made it. Migrations run before
  // PocketBase serves. The check needs at least one request log by the end of the run, and asserts it.
  // Ticket 33 dropped the check that it holds no record: from Phase 4 on every Profile load and `/r` Click writes an Event.
  // Ticket 36 dropped the check that it was also last changed before that request: Phase 4's test 11 (tests/e2e/04-stats.spec.ts)
  // has the Operator add a temporary required field to it through the API and remove it again, as the Phase 4 spec requires,
  // which moves its `updated` time. The schema check above, which also runs after every other spec, still finds the
  // migrations' fields and closed rules.
  // ASSUMPTION: an API change that is undone before the run ends is allowed, as long as the schema check finds the migrations'
  // shape (rung 3: ticket 33 narrowed this check when Phase 4 made it untrue; rung 2: the Phase 4 spec's test 11 makes the change).
  // Overturned if the events collection must never be changed through the API, even for a test; test 11 then needs a way to fail
  // every Event write that leaves the collection alone.
  test('after every spec: only a migration created the events collection', async () => {
    const events = await (await pb('/api/collections/events', { token })).json();
    const first = await (await pb(`/api/logs?perPage=1&sort=created&filter=${encodeURIComponent("data.type='request'")}`, { token })).json();
    expect(first.totalItems).toBeGreaterThan(0);
    expect(events.created < first.items[0].created, 'events made before the first logged request').toBe(true);
  });
});
