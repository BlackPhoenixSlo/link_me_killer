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
