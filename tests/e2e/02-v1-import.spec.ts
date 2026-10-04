import { test, expect } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Ticket 14: the v1 Import CLI, run as a process with this machine's Node and no PocketBase reachable.
// Observed only through its printed lines and exit code. Destinations are compared as booleans and never printed.
const ROOT = join(__dirname, '..', '..');
const CLI = join(ROOT, 'app', 'bin', 'import-v1');
const SNAPSHOT = join(ROOT, 'linkme_clone3');
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
  test.skip(!existsSync(SNAPSHOT), 'v1 Snapshot absent');
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

// Ticket 16 (folded from ticket 15's tests/stack-import-check.mjs): the test stack, its schema and the v1 Import's write half,
// checked through the Operator's three doors: PocketBase's REST API on its loopback port (as the superuser from tests/e2e.env,
// and anonymously), the import through `docker compose run`, and Compose's own status and inspect output. The harness's seed (tests/stack.sh) is the import run whose
// records are checked here; the CLI runs again only where a check needs its printed lines, on a copy of the Fixture site
// under another Username, which is removed afterwards. Destinations are compared as booleans and never printed.
// ASSUMPTION: these checks live in 02-v1-import, the spec's import spec, schema and anonymous checks included, rather than in
// 02-live-edit, which ticket 20 creates (rung 5: one file for what one script held). Overturned by ticket 20; the schema and
// anonymous checks then move there.
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

  test('the schema: fields, patterns, relations, file fields, and every rule superuser-only', async () => {
    const collection = async (name: string) => (await pb(`/api/collections/${name}`, { token })).json();
    const [users, profiles, links] = await Promise.all(['users', 'profiles', 'links'].map(collection));
    const rulesClosed = (c: Record<string, unknown>) => ['listRule', 'viewRule', 'createRule', 'updateRule', 'deleteRule'].every((r) => c[r] === null);
    expect(users.type === 'auth' && rulesClosed(users) && users.manageRule === null, 'users closed, sign-up included').toBe(true);
    expect(rulesClosed(profiles), 'profiles closed').toBe(true);
    expect(rulesClosed(links), 'links closed').toBe(true);
    type Field = { name: string; type: string; system?: boolean; [k: string]: unknown };
    const field = (c: { fields: Field[] }, name: string) => c.fields.find((f) => f.name === name) || ({} as Field);
    const shape = (c: { fields: Field[] }) => c.fields.filter((f) => !f.system).map((f) => `${f.name}:${f.type}`).join(' ');
    expect(shape(profiles)).toBe('username:text displayName:text bio:text verified:bool avatar:file mode:select owner:relation v1Key:text');
    expect(shape(links)).toBe(
      'profile:relation linkId:text title:text order:number isAdult:bool mode:select destination:text tracking:bool defaultTrackingCode:text geo:json icon:file backgroundImage:file v1Key:text',
    );
    const username = field(profiles, 'username');
    expect(username.required && username.pattern === '^[a-z0-9_]+$').toBe(true);
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

  test('anonymous calls to PocketBase are refused', async () => {
    expect((await pb('/api/collections/profiles/records')).status).toBeGreaterThanOrEqual(400);
    expect((await pb('/api/collections/links/records')).status).toBeGreaterThanOrEqual(400);
    const signUp = await pb('/api/collections/users/records', json({ email: 'signup-check@example.com', password: 'signup-check-1', passwordConfirm: 'signup-check-1' }));
    expect(signUp.status).toBeGreaterThanOrEqual(400);
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

  test('the import\'s printed lines: exit 0 with three dropped lines and the summary, then exit 2 on an existing Username; no Destination printed', async () => {
    // The Fixture site under another Username, so a full run can write; its Profile is removed at the end.
    const site = tempDir('v1-stackcheck-');
    mkdirSync(join(site, 'api', 'profiles'), { recursive: true });
    cpSync(join(FIXTURES, 'api', 'profiles', 'fixture.json'), join(site, 'api', 'profiles', 'stackcheck.json'));
    cpSync(join(FIXTURES, 'netlify'), join(site, 'netlify'), { recursive: true });
    const composeImport = (siteMounts: string[]) => {
      const r = compose('run', '--rm', ...siteMounts.flatMap((m) => ['-v', m]), '-v', `${IMAGES}:/site/images:ro`, 'app', 'import-v1', '--site', '/site');
      return { status: r.status, lines: `${r.stdout}${r.stderr}`.split('\n').filter((l) => l && !/^\s*Container /.test(l)) };
    };
    try {
      const run = composeImport([`${join(site, 'api')}:/site/api:ro`, `${join(site, 'netlify')}:/site/netlify:ro`]);
      expect(holdsDestination(run.lines, [site])).toBe(false);
      expect(run.status).toBe(0);
      expect(startsWith(run.lines, 'dropped: stackcheck card ').length).toBe(3);
      expect(run.lines.at(-1)).toBe('imported: 1 Profiles, 4 Links, 6 images, 3 warnings');

      // The seeded Username again: a PocketBase error while writing exits 2 with a fixed reason and writes nothing
      // (re-runs become upserts in ticket 19).
      const before = (await list('links', "profile.username='fixture'")).length;
      const again = composeImport([`${join(FIXTURES, 'api')}:/site/api:ro`, `${join(FIXTURES, 'netlify')}:/site/netlify:ro`]);
      expect(holdsDestination(again.lines, [FIXTURES])).toBe(false);
      expect(again.status).toBe(2);
      expect(again.lines.at(-1)).toBe('write failed: profile fixture refused');
      expect((await list('links', "profile.username='fixture'")).length).toBe(before);

      const appId = compose('ps', '-q', 'app').stdout.trim();
      const mounts = JSON.parse(spawnSync('docker', ['inspect', '--format', '{{json .Mounts}}', appId], { encoding: 'utf8' }).stdout);
      expect(mounts).toEqual([]); // the running app mounts no site
      expect(compose('ps', '-a', '-q').stdout.trim().split('\n').length).toBe(3); // no one-off import container is left
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
    expect((await pb('/api/collections/profiles/records', { token })).status).toBe(403); // the old token is now a guest's
    await signIn();
    const res = await request.get('/api/profiles/fixture.json');
    expect(res.status()).toBe(200);
    expect((await res.json()).links.length).toBe(4);
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
});
