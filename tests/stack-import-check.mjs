// Ticket 15: the test stack, its schema and the v1 Import's write half, checked through the Operator's two doors:
// PocketBase's REST API on its loopback port (as the superuser, and anonymously), and the import through `docker compose run`.
// Run by hand while nothing else holds port 4173: node tests/stack-import-check.mjs
// It starts the test project from empty, and always takes it down with its data (`down -v`) at the end.
// Prints only check names with pass/fail, counts and the import's own lines; Destinations are compared as booleans.
// ASSUMPTION: a standalone script, not a Playwright spec, because ./check.sh still runs on the Dev-Server Stand-in at the
// stack's own port 4173 until ticket 16 moves the suite onto the stack (rung 5). Overturned by 16, the first ticket without
// that port clash: it folds these checks into a Playwright spec that runs against the stack and deletes this file.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ENV = Object.fromEntries(
  readFileSync(join(ROOT, 'tests', 'e2e.env'), 'utf8')
    .split('\n')
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]),
);
const PB = `http://127.0.0.1:${ENV.PB_PORT}`;
const SITE_URL = `http://127.0.0.1:${ENV.HTTP_PORT}`;
const FIXTURES = join(ROOT, 'tests', 'fixtures');
const IMAGES = join(ROOT, 'app', 'public', 'images');
const fixture = JSON.parse(readFileSync(join(FIXTURES, 'api', 'profiles', 'fixture.json'), 'utf8'));
const secrets = JSON.parse(readFileSync(join(FIXTURES, 'netlify', 'functions', 'secrets.json'), 'utf8'));

const compose = (...args) =>
  spawnSync('docker', ['compose', '--env-file', 'tests/e2e.env', ...args], { cwd: ROOT, encoding: 'utf8' });

let failed = 0;
const check = (name, ok, detail = '') => {
  if (!ok) failed += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` (${detail})` : ''}`);
};

async function pb(pathname, { token, ...init } = {}) {
  const headers = { ...(init.headers || {}), ...(token ? { Authorization: token } : {}) };
  return fetch(PB + pathname, { ...init, headers });
}

async function main() {
  // Start from an empty test project; a stray one would hold other data.
  compose('down', '-v');
  const up = compose('up', '--build', '--wait');
  check('stack comes up healthy with the test env', up.status === 0, `exit ${up.status}`);
  if (up.status !== 0) return;
  const ps = JSON.parse(`[${compose('ps', '--format', 'json').stdout.trim().split('\n').join(',')}]`);
  check(
    'caddy, app and pocketbase are running, pocketbase healthy',
    ['app', 'caddy', 'pocketbase'].every((s) => ps.some((c) => c.Service === s && c.State === 'running')) &&
      ps.some((c) => c.Service === 'pocketbase' && c.Health === 'healthy'),
  );
  check('PocketBase /api/health answers 200', (await pb('/api/health')).status === 200);
  const viaCaddy = await fetch(SITE_URL + '/');
  // Ticket 16 adds the Visitor routes; until then the app answers Hono's 404, proxied by Caddy.
  check('the app answers through Caddy', !!viaCaddy.headers.get('via')?.includes('Caddy') && viaCaddy.status < 500, `status ${viaCaddy.status}`);

  // Schema, read as the superuser.
  const auth = await (
    await pb('/api/collections/_superusers/auth-with-password', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ identity: ENV.PB_SUPERUSER_EMAIL, password: ENV.PB_SUPERUSER_PASSWORD }),
    })
  ).json();
  const token = auth.token;
  check('superuser signs in', typeof token === 'string');
  const collection = async (name) => (await pb(`/api/collections/${name}`, { token })).json();
  const [users, profiles, links] = await Promise.all(['users', 'profiles', 'links'].map(collection));
  const rulesClosed = (c) => ['listRule', 'viewRule', 'createRule', 'updateRule', 'deleteRule'].every((r) => c[r] === null);
  check('users: every rule superuser-only (sign-up closed)', users.type === 'auth' && rulesClosed(users) && users.manageRule === null);
  check('profiles: every rule superuser-only', rulesClosed(profiles));
  check('links: every rule superuser-only', rulesClosed(links));
  const field = (c, name) => c.fields.find((f) => f.name === name) || {};
  const shape = (c) => c.fields.filter((f) => !f.system).map((f) => `${f.name}:${f.type}`).join(' ');
  check(
    'profiles fields per the Schema',
    shape(profiles) === 'username:text displayName:text bio:text verified:bool avatar:file mode:select owner:relation v1Key:text',
  );
  check(
    'links fields per the Schema',
    shape(links) ===
      'profile:relation linkId:text title:text order:number isAdult:bool mode:select destination:text tracking:bool defaultTrackingCode:text geo:json icon:file backgroundImage:file v1Key:text',
  );
  const username = field(profiles, 'username');
  check(
    'Username required, lower-case pattern, unique index',
    username.required && username.pattern === '^[a-z0-9_]+$' && profiles.indexes.some((i) => /UNIQUE INDEX .* \(username\)/.test(i)),
  );
  const linkId = field(links, 'linkId');
  check(
    'linkId: required, autogenerated [a-z0-9]{12}, unique, separate from id',
    linkId.required && linkId.autogeneratePattern === '[a-z0-9]{12}' && linkId.pattern === '^[a-z0-9]{12}$' &&
      links.indexes.some((i) => /UNIQUE INDEX .* \(linkId\)/.test(i)),
  );
  const DESTINATION = String.raw`^(https?://[^\s\\/]|/[^\s\\/])[^\s\\]*$`;
  check(`destination pattern ${DESTINATION}`, field(links, 'destination').pattern === DESTINATION);
  const relation = (c, name, target, cascade) => {
    const f = field(c, name);
    return f.type === 'relation' && f.collectionId === target && f.maxSelect === 1 && f.cascadeDelete === cascade;
  };
  check('links.profile -> profiles, required, cascade delete', relation(links, 'profile', profiles.id, true) && field(links, 'profile').required);
  check('profiles.owner -> users, optional', relation(profiles, 'owner', users.id, false) && !field(profiles, 'owner').required);
  const modes = (c) => isDeepStrictEqual(field(c, 'mode').values, ['direct', 'escape_ig', 'deeplink']) && !field(c, 'mode').required;
  check('mode selects direct | escape_ig | deeplink, optional', modes(profiles) && modes(links));
  const files = [users, profiles, links].flatMap((c) => c.fields.filter((f) => f.type === 'file').map((f) => [c.name, f]));
  check(
    'every file field: WebP only, max 1, 5 MB',
    files.length === 4 && files.every(([, f]) => isDeepStrictEqual(f.mimeTypes, ['image/webp']) && f.maxSelect === 1 && f.maxSize === 5 * 1024 * 1024),
    `${files.length} file fields`,
  );

  // Anonymous calls are refused.
  const anonProfiles = await pb('/api/collections/profiles/records');
  check('anonymous list of profiles is refused', anonProfiles.status >= 400, `status ${anonProfiles.status}`);
  const anonLinks = await pb('/api/collections/links/records');
  check('anonymous list of links is refused', anonLinks.status >= 400, `status ${anonLinks.status}`);
  const signUp = await pb('/api/collections/users/records', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'signup-check@example.com', password: 'signup-check-1', passwordConfirm: 'signup-check-1' }),
  });
  check('anonymous sign-up is refused', signUp.status >= 400, `status ${signUp.status}`);

  // The import, as the Operator runs it, against the Fixture site.
  const runImport = () => {
    const r = compose(
      'run', '--rm',
      '-v', `${join(FIXTURES, 'api')}:/site/api:ro`,
      '-v', `${join(FIXTURES, 'netlify')}:/site/netlify:ro`,
      '-v', `${IMAGES}:/site/images:ro`,
      'app', 'import-v1', '--site', '/site',
    );
    return { status: r.status, lines: `${r.stdout}${r.stderr}`.split('\n').filter((l) => l && !/^\s*Container /.test(l)) };
  };
  const run = runImport();
  const { lines } = run;
  const needles = [...Object.values(secrets), ...fixture.links.map((l) => l.url)].filter(Boolean);
  const leaks = lines.some((l) => needles.some((n) => l.includes(n)));
  check('nothing the import prints holds a Test Secrets value or fixture url', !leaks);
  if (!leaks) for (const l of lines) console.log(`  | ${l}`);
  check('import exits 0', run.status === 0, `exit ${run.status}`);
  check('three dropped: lines', lines.filter((l) => l.startsWith('dropped: ')).length === 3);
  check('summary count', lines.at(-1) === 'imported: 1 Profiles, 4 Links, 6 images, 3 warnings');
  // A PocketBase error while writing gives exit 2 and a fixed reason: here a second run, refused on the existing Username
  // (re-runs become upserts in ticket 19).
  const again = runImport();
  const againLines = again.lines;
  check('a PocketBase error while writing exits 2 with a fixed reason', again.status === 2 && againLines.at(-1) === 'write failed: profile fixture refused', `exit ${again.status}`);
  check('the failed run prints no Test Secrets value or fixture url', !againLines.some((l) => needles.some((n) => l.includes(n))));
  const appId = compose('ps', '-q', 'app').stdout.trim();
  const mounts = JSON.parse(spawnSync('docker', ['inspect', '--format', '{{json .Mounts}}', appId], { encoding: 'utf8' }).stdout);
  check('after the run the app container mounts no site', Array.isArray(mounts) && mounts.length === 0, `${mounts?.length} mounts`);
  check('no one-off import container is left', compose('ps', '-a', '-q').stdout.trim().split('\n').length === 3);

  // What was written, read as the superuser.
  const list = async (c, filter, sort) =>
    (await (await pb(`/api/collections/${c}/records?perPage=200&filter=${encodeURIComponent(filter)}${sort ? `&sort=${sort}` : ''}`, { token })).json()).items;
  const [profile] = await list('profiles', "username='fixture'");
  check('the Fixture Profile exists', !!profile);
  if (!profile) return;
  check("the Fixture Profile carries its file's Mode", profile.mode === fixture.profile.mode);
  check('Profile fields from the file', profile.displayName === fixture.profile.displayName && profile.bio === fixture.profile.bio &&
    profile.verified === fixture.profile.verified && profile.v1Key === 'fixture.json');
  const written = await list('links', `profile='${profile.id}'`, 'order');
  check('four Links', written.length === 4, `${written.length}`);
  check('Links in file order', isDeepStrictEqual(written.map((l) => l.title), fixture.links.map((l) => l.title)) &&
    written.every((l, i) => l.order === i));
  check('every Link Id is 12 lower-case letters or digits', written.every((l) => /^[a-z0-9]{12}$/.test(l.linkId)));
  check('every Link Id is unlike its v1 id and the record id', written.every((l, i) => {
    const v1 = fixture.links[i].id.toLowerCase();
    return l.linkId !== l.id && !v1.includes(l.linkId) && !l.linkId.includes(v1);
  }));
  check('Link Ids are distinct', new Set(written.map((l) => l.linkId)).size === 4);
  check('each Link keeps its private v1 key', written.every((l, i) => l.v1Key === `${fixture.links[i].id}#1`));
  check('each Link keeps its file Mode, Adult flag and tracking', written.every((l, i) => {
    const f = fixture.links[i];
    return l.mode === (f.mode || '') && l.isAdult === (f.isAdult === true) && l.tracking === (f.tracking === true);
  }));
  const adultAt = fixture.links.findIndex((l) => l.isAdult);
  const adult = written[adultAt];
  check("the Adult Link's Destination is its Test Secrets value", adult.destination === secrets[fixture.links[adultAt].id]);
  check("the Adult Link's Geo Rule is the file's", isDeepStrictEqual(adult.geo, fixture.links[adultAt].geo));
  check("the default Tracking Code is the file's (verbatim)", written.every((l, i) => l.defaultTrackingCode === (fixture.links[i].default_tracknumber ?? '')));
  check("each non-Adult Link's Destination is its own url", written.every((l, i) => l.isAdult || l.destination === fixture.links[i].url));

  // Images, byte for byte against the stock icons the Fixture Profile names.
  const same = async (c, record, fieldName, v1Path) => {
    if (!v1Path) return !record[fieldName];
    if (!record[fieldName]) return false;
    const res = await pb(`/api/files/${c}/${record.id}/${record[fieldName]}`, { token });
    const bytes = Buffer.from(await res.arrayBuffer());
    return res.ok && bytes.equals(readFileSync(join(IMAGES, v1Path.replace(/^\/images\//, ''))));
  };
  const imageChecks = [await same('profiles', profile, 'avatar', fixture.profile.avatarUrl)];
  for (const [i, l] of written.entries()) {
    imageChecks.push(await same('links', l, 'icon', fixture.links[i].icon));
    imageChecks.push(await same('links', l, 'backgroundImage', fixture.links[i].backgroundImage));
  }
  check('every image has the stock icon\'s bytes', imageChecks.every(Boolean), `${imageChecks.filter(Boolean).length}/${imageChecks.length} slots`);

  // PocketBase itself refuses a Destination that is not absolute http(s) or root-relative.
  const createLink = async (destination) => {
    const res = await pb('/api/collections/links/records', {
      method: 'POST',
      token,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ profile: profile.id, title: 'destination check', destination }),
    });
    const body = await res.json();
    if (res.ok) await pb(`/api/collections/links/records/${body.id}`, { method: 'DELETE', token });
    return { status: res.status, linkId: body.linkId };
  };
  const js = await createLink('javascript:alert(1)');
  check('PocketBase refuses a javascript: Destination', js.status === 400, `status ${js.status}`);
  const protocolRelative = await createLink('//host.example/path');
  check('PocketBase refuses a //host Destination', protocolRelative.status === 400, `status ${protocolRelative.status}`);
  const backslash = await createLink('/\\host.example');
  check('PocketBase refuses a /\\host Destination', backslash.status === 400, `status ${backslash.status}`);
  const tab = await createLink('/\t/host.example');
  check('PocketBase refuses a /<TAB>/host Destination', tab.status === 400, `status ${tab.status}`);
  const rootRelative = await createLink('/landing.html');
  check('PocketBase takes a root-relative Destination (control)', rootRelative.status === 200 && /^[a-z0-9]{12}$/.test(rootRelative.linkId), `status ${rootRelative.status}`);
  const absolute = await createLink('https://example.com/destination-check');
  check('PocketBase takes an absolute https Destination (control)', absolute.status === 200, `status ${absolute.status}`);
}

try {
  await main();
} catch (e) {
  // The error's message only: no response body is ever printed.
  check('the script ran to the end', false, e instanceof Error ? e.name : 'error');
} finally {
  const down = compose('down', '-v');
  const volumes = spawnSync('docker', ['volume', 'ls', '-q', '--filter', `name=${ENV.COMPOSE_PROJECT_NAME}_`], { encoding: 'utf8' }).stdout.trim();
  check('the stack is taken down with its data', down.status === 0 && compose('ps', '-a', '-q').stdout.trim() === '' && volumes === '');
  console.log(failed ? `${failed} check(s) failed` : 'all checks passed');
  process.exitCode = failed ? 1 : 0;
}
