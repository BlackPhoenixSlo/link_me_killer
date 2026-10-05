'use strict';
// The app behind Caddy (docs/spec/phase-02-vps-foundation.md, Contracts): Profile JSON, /r, Reveal, PocketBase files and the
// Page Copy; from Phase 3 on also the Editor at /edit and the same-origin API proxy (docs/spec/phase-03-auth-and-editor.md);
// from Phase 4 on the Page View Ping, and `/r` and Reveal record a Click (docs/spec/phase-04-stats.md); from Phase 5 on
// Host Resolution picks each page's Profile by host and the TLS Ask answers Caddy (docs/spec/phase-05-cutover-and-domains.md).
// It reads PocketBase as the superuser named in the environment and never logs a Destination: nothing below logs
// a request, a record or an error's details.
// ASSUMPTION: Page Copy answers carry v1's `/*` header, `Cache-Control: public, max-age=0, must-revalidate` (rung 3:
// linkme_clone3/netlify.toml), so a page edit reaches the next load. Overturned if Phase 5 wants the Page Copy cached at an edge.
const fs = require('node:fs');
const path = require('node:path');
const { Hono } = require('hono');
const { serve } = require('@hono/node-server');
const { createGateway } = require('./src/gateway');
const { toPublicProfile } = require('./src/public-profile');
const { resolveDestination } = require('./src/destination');
const { visitorLocation } = require('./src/visitor-location');
const { toWebp, TARGETS } = require('./src/image');
const { allow, allowPing, clientIp, originOf, sameOrigin } = require('./src/click-guard');
const { createEventRecorder } = require('./src/event-recorder');
const { createHostResolver } = require('./src/host-resolver');
const { checkDomain, recordsFor } = require('./src/domain-check');

const PUBLIC = path.join(__dirname, 'public');
const EDITOR = path.join(__dirname, 'editor');
const MUST_REVALIDATE = 'public, max-age=0, must-revalidate';
const IMMUTABLE = 'public, max-age=31536000, immutable';
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.webp': 'image/webp',
};

const gateway = createGateway({
  url: process.env.PB_URL,
  email: process.env.PB_SUPERUSER_EMAIL,
  password: process.env.PB_SUPERUSER_PASSWORD,
});
const events = createEventRecorder(gateway);
const hosts = createHostResolver({ primaryHosts: process.env.PRIMARY_HOSTS, gateway });
const app = new Hono();

const pageCopy = (file) => fs.readFileSync(path.join(PUBLIC, file));

// The file at `rel` under `root`, or null.
function fileUnder(root, rel) {
  try {
    const candidate = path.resolve(root, '.' + decodeURIComponent(rel));
    if (candidate.startsWith(root + path.sep) && fs.statSync(candidate).isFile()) return candidate;
  } catch {
    // a malformed escape or a missing file is no file
  }
  return null;
}

// The file at `file`, with the Page Copy's cache header.
function serveFile(c, file) {
  return c.body(fs.readFileSync(file), 200, {
    'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream',
    'Cache-Control': MUST_REVALIDATE,
  });
}

// The file at `rel` under `root`, else `root`'s index.html.
const staticFile = (c, root, rel) => serveFile(c, fileUnder(root, rel) || path.join(root, 'index.html'));

app.get('/api/profiles/:file', async (c, next) => {
  const file = c.req.param('file');
  if (!file.endsWith('.json')) return next();
  c.header('Cache-Control', MUST_REVALIDATE);
  const found = await gateway.getProfile(file.slice(0, -'.json'.length));
  if (!found) return c.json({ error: 'Profile not found' }, 404);
  return c.json(toPublicProfile(found.profile, found.links, originOf(c.req.raw)));
});

// The Click guard's answers are fixed bodies, checked before the Link lookup: a refused call costs no PocketBase read.
const underLimit = (c) => allow(clientIp(c.req.raw));
const TOO_MANY = { error: 'Too many requests' };

// Once the Link resolves, `/r` records a Click, then redirects; from outside it looks as before.
app.get('/r/:linkId', async (c) => {
  c.header('Cache-Control', 'no-store');
  if (!underLimit(c)) return c.json(TOO_MANY, 429);
  const link = await gateway.getLink(c.req.param('linkId'));
  const destination = resolveDestination(link);
  if (!destination) return c.json({ error: 'Link not found' }, 404);
  await events.recordClick(c.req.raw, link.profile, link.id);
  return c.redirect(destination, 302);
});

// The Page View Ping (Phase 4 spec, Contracts): POST only, so a GET under /v/ still reaches the Profile route below and no
// Username is reserved. 204 once the Event Recorder has returned; an unknown Username is 404 and records nothing. Over its own
// limit per client IP and Username (the Click guard's allowPing, Reveal's threshold) it answers 429 as Reveal does, before the
// Profile lookup, so a refused ping costs no PocketBase read.
// ASSUMPTION: a failed Page View write still answers 204, since the Event Recorder logs and swallows it and tells its caller
// nothing (rung 2: the spec's Write path and Interfaces, "never throws"; rung 5: one answer whatever the write did). Overturned
// if the ping must tell the page its Page View was lost; the recorder then returns the write's outcome.
app.post('/v/:username', async (c) => {
  c.header('Cache-Control', 'no-store');
  if (!allowPing(clientIp(c.req.raw), c.req.param('username'))) return c.json(TOO_MANY, 429);
  const profile = await gateway.findProfile(c.req.param('username'));
  if (!profile) return c.json({ error: 'Profile not found' }, 404);
  await events.recordPageView(c.req.raw, profile.id);
  return c.body(null, 204);
});

// Reveal at v1's path. `user` is accepted and ignored: a v2 Link Id is unique across all Profiles. No CORS header.
// Each Destination it returns records a Click first (Phase 4 spec, Interfaces); a refusal, 429 or 404 records nothing. For any
// one Click either Reveal or `/r` hands out the Destination, never both, so no Click counts twice.
// ASSUMPTION: the same-origin check runs before the limit, so a cross-origin call refused with 403 does not use up the window
// of the IP it came from (rung 5). Overturned if cross-origin attempts must count against the limit too; `allow` then moves first.
app.get('/.netlify/functions/reveal', async (c) => {
  c.header('Cache-Control', 'no-store');
  if (!sameOrigin(c.req.raw)) return c.json({ error: 'Cross-origin request refused' }, 403);
  if (!underLimit(c)) return c.json(TOO_MANY, 429);
  const location = visitorLocation(c.req.header()); // every request header, lower-cased names
  const link = await gateway.getLink(c.req.query('id'));
  const realUrl = resolveDestination(link, c.req.query('trackingId'), location);
  if (!realUrl) return c.json({ error: 'Link not found' }, 404);
  await events.recordClick(c.req.raw, link.profile, link.id);
  return c.json({ realUrl });
});

// A PocketBase file of a Profile or a Link; anything PocketBase does not hold is its own 404.
// ASSUMPTION: "only while each is still its record's current file" holds through PocketBase itself, which deletes a replaced
// file (spec, Upload: "Replacing a file leaves PocketBase to delete the old one"), so the app looks up no record (rung 5).
// Overturned if PocketBase is set to keep replaced files; the route then checks the record's current file name.
const FILE_COLLECTIONS = ['profiles', 'links'];
app.get('/api/files/:collection/:recordId/:filename', async (c) => {
  const { collection, recordId, filename } = c.req.param();
  const res = FILE_COLLECTIONS.includes(collection) ? await gateway.fetchFile(collection, recordId, filename) : null;
  if (!res) return c.body(null, 404);
  return c.body(res.body, 200, {
    'Content-Type': res.headers.get('content-type') || 'application/octet-stream',
    'Cache-Control': IMMUTABLE,
  });
});

// Upload (D4): the caller's token is checked by viewing the target record through PocketBase before anything is decoded;
// the WebP replaces the file with the same token. The app never decides ownership. Neither the body nor the token is logged.
// ASSUMPTION: the checks run in this order: no token (401), a target not in the list (404), a declared length over the cap
// (413), PocketBase's view with the caller's token (its own status passed through), then the body read under the same cap
// (413), the multipart `file` (a missing one is 415, as not a decodable image) and the decode (415). Rung 5: the cheap checks
// that need no PocketBase call come first, and no byte is decoded before PocketBase has answered. Overturned if a bad target
// must answer 401 to a caller with no token.
const UPLOAD_CAP = 20 * 1024 * 1024; // the 20 MB input cap (spec, Upload (D4) ASSUMPTION), whole multipart body

// The request body, or null once it passes `cap` bytes; the rest is left unread.
async function readCapped(stream, cap) {
  if (!stream) return Buffer.alloc(0);
  const parts = [];
  let size = 0;
  for await (const part of stream) {
    size += part.length;
    if (size > cap) return null;
    parts.push(part);
  }
  return Buffer.concat(parts);
}

app.post('/api/upload/:collection/:recordId/:field', async (c) => {
  c.header('Cache-Control', 'no-store');
  const { collection, recordId, field } = c.req.param();
  const token = c.req.header('authorization');
  if (!token) return c.json({ error: 'Token required' }, 401);
  const maxSide = TARGETS[`${collection}/${field}`];
  if (!maxSide) return c.json({ error: 'Not found' }, 404);
  if (Number(c.req.header('content-length')) > UPLOAD_CAP) return c.json({ error: 'Over 20 MB' }, 413);
  const viewed = await gateway.viewRecord(collection, recordId, token);
  if (viewed.status !== 200) return c.json({ error: 'Refused by PocketBase' }, viewed.status);
  const body = await readCapped(c.req.raw.body, UPLOAD_CAP);
  if (!body) return c.json({ error: 'Over 20 MB' }, 413);
  let file;
  try {
    file = (await new Response(body, { headers: { 'content-type': c.req.header('content-type') || '' } }).formData()).get('file');
  } catch {
    file = null;
  }
  if (!file || typeof file === 'string') return c.json({ error: 'Not a decodable image' }, 415);
  let webp;
  try {
    webp = await toWebp(Buffer.from(await file.arrayBuffer()), maxSide);
  } catch {
    return c.json({ error: 'Not a decodable image' }, 415);
  }
  const replaced = await gateway.replaceFile(collection, recordId, field, webp, token);
  if (replaced.status !== 200) return c.json({ error: 'Refused by PocketBase' }, replaced.status);
  return c.json({ url: `/api/files/${collection}/${recordId}/${replaced.filename}` });
});

// The Custom Domain check (Phase 6 spec, § 3 Option 1, Check route), on the upload's pattern: the caller's token is required
// (401), Reveal's per-address limit applies (429), and the record is viewed through PocketBase with that token, its status
// passed through, so the rules decide ownership. Then app/src/domain-check.js asks the DNS; when every check passes the record
// is set live as the superuser, and a clash on the live index (another Profile's live domain) is the problem "taken". The
// answer is { status: 'pending' | 'live', problems, records }. A live record is answered as it is, with no DNS lookup.
// ASSUMPTION: the limit comes before PocketBase's view, as Reveal's comes before its Link lookup, so a refused call costs no
// PocketBase read (rung 3). Overturned if a Creator's checks must not share a Visitor's window on one address.
app.post('/api/domain-check/:id', async (c) => {
  c.header('Cache-Control', 'no-store');
  const token = c.req.header('authorization');
  if (!token) return c.json({ error: 'Token required' }, 401);
  if (!underLimit(c)) return c.json(TOO_MANY, 429);
  const viewed = await gateway.viewRecord('customDomains', c.req.param('id'), token, 'id,domain,token,status');
  if (viewed.status !== 200) return c.json({ error: 'Refused by PocketBase' }, viewed.status);
  const { record } = viewed;
  if (record.status === 'live') return c.json({ status: 'live', problems: [], records: recordsFor(record.domain, record.token) });
  const { problems, records } = await checkDomain(record, { isOwnHost: hosts.isOwnHost });
  if (!problems.length) {
    const written = await gateway.setDomainLive(record.id);
    if (written === 200) return c.json({ status: 'live', problems, records });
    if (written === 404) return c.json({ error: 'Refused by PocketBase' }, 404); // removed since the view
    if (written !== 400) throw new Error('PocketBase refused the live write');
    problems.push(`Another Profile already uses ${record.domain}.`);
  }
  return c.json({ status: 'pending', problems, records });
});

// Same-origin API proxy (Phase 3 spec, Interfaces): PocketBase's users, profiles and links collection paths, records and auth
// alike, from Phase 4 on the Stats page's dailyStats view (never events), and from Phase 6 on customDomains, go to PocketBase with the caller's own method, headers (its token, or none) and body, and PocketBase's answer comes
// back as it is. The superuser's token is never added: PocketBase's collection rules decide every call.
// ASSUMPTION: only hop-by-hop headers are dropped, plus Accept-Encoding on the way in and the encoding and length headers on
// the way out, because Node's fetch decodes a compressed answer and the stream it hands on is no longer the one those headers
// describe (rung 5). Overturned if a client needs PocketBase's own compression through the proxy.
// ASSUMPTION: a path holding an encoded slash or backslash is not forwarded (404), so nothing past the collection name can
// step into another collection on PocketBase's side (rung 4: a closed default). Overturned if a PocketBase path in these
// collections ever needs one.
const PROXIED = /^\/api\/collections\/(users|profiles|links|dailyStats|customDomains)\/[^/]/;
const DROP_IN = ['connection', 'keep-alive', 'proxy-connection', 'proxy-authorization', 'te', 'trailer', 'transfer-encoding', 'upgrade', 'host', 'content-length', 'accept-encoding'];
const DROP_OUT = ['connection', 'keep-alive', 'transfer-encoding', 'content-encoding', 'content-length'];
app.all('/api/collections/*', async (c, next) => {
  const { pathname, search } = new URL(c.req.url);
  if (!PROXIED.test(pathname) || /%2f|%5c|\\/i.test(pathname)) return next();
  const headers = new Headers(c.req.raw.headers);
  for (const name of DROP_IN) headers.delete(name);
  const withBody = c.req.method !== 'GET' && c.req.method !== 'HEAD';
  const res = await fetch(process.env.PB_URL + pathname + search, {
    method: c.req.method,
    headers,
    body: withBody ? c.req.raw.body : undefined,
    duplex: 'half',
    redirect: 'manual',
  });
  const out = new Headers(res.headers);
  for (const name of DROP_OUT) out.delete(name);
  return new Response(res.body, { status: res.status, headers: out });
});

// Every other /api/ path is not v2's: not PocketBase's other collections, `_superusers` included, nor realtime, batch,
// settings or logs. PocketBase's own files go only through the file route above.
// ASSUMPTION: one 404 for every /api/ path no route above answers, every method, rather than the index page the catch-all gave
// a GET there in Phase 2 (rung 2: the ticket requires `/api/realtime` to answer 404; rung 4: a closed default). Overturned if
// some /api/ GET must keep the index page.
app.all('/api/*', (c) => c.json({ error: 'Not found' }, 404));

// The Editor (Phase 3 spec, Editor route): its files under app/editor/, and its index.html for every other /edit path, matched
// before the Profile catch-all.
const editor = (c) => staticFile(c, EDITOR, c.req.path.slice('/edit'.length));
app.get('/edit', editor);
app.get('/edit/*', editor);

// The TLS Ask (Phase 5 spec, Interfaces): Caddy's question before it issues a certificate for `domain`. An empty 200 for a
// primary host, a Spare Domain or a Custom Domain, 404 for anything else, 400 when `domain` is missing or not a hostname, and
// 503 when PocketBase cannot be read for a non-primary host, which Caddy also takes as no. It confirms one hostname the caller
// already has and never lists any. Matched before the Profile catch-all on every host; `internal` is a reserved Username.
app.get('/internal/tls-ask', async (c) => {
  c.header('Cache-Control', 'no-store');
  const domain = c.req.query('domain');
  if (!domain || !hosts.isAskable(domain)) return c.body(null, 400);
  let resolved;
  try {
    resolved = await hosts.resolveHost(domain);
  } catch {
    return c.body(null, 503);
  }
  return c.body(null, resolved.kind === 'unknown' ? 404 : 200);
});

// v1's leak path stays dead: 404, with the landing page as its body.
app.get('/netlify/*', (c) => c.body(pageCopy('landing.html'), 404, { 'Content-Type': TYPES['.html'], 'Cache-Control': MUST_REVALIDATE }));

// Any other GET: the Page Copy file at that path, else index.html (v1's `/* -> /index.html` rule) as the Profile page, which
// from Phase 5 on carries the Profile Host Resolution found for this host and path (Phase 5 spec, Profile page bootstrap) as a
// JSON block the page reads instead of parsing its own address: { username, trackingCode, profilePath }, or null.
// `<`, `>` and `&` are escaped, and the block goes in by a replacer function, so no `$` pattern in the path is expanded:
// nothing from the path can end the block.
const INDEX = path.join(PUBLIC, 'index.html');
const BOOTSTRAP_BEFORE = '<script src="/script.js"></script>';
const asScriptJson = (value) => JSON.stringify(value).replace(/[<>&]/g, (ch) => `\\u${ch.charCodeAt(0).toString(16).padStart(4, '0')}`);
app.get('*', async (c) => {
  const file = fileUnder(PUBLIC, c.req.path);
  if (file && file !== INDEX) return serveFile(c, file);
  const request = await hosts.resolveProfileRequest(c.req.header('host'), new URL(c.req.url).pathname);
  // The root of ofl.ink, and of any host that is not a Custom Domain, is the landing page (Operator's ask, 2026-10-06), not
  // v1's default Profile. A Custom Domain's root stays its Profile (resolveProfileRequest names it). The page script's
  // empty-Username fallback stays for Page Copy parity but is never reached from here.
  if (request && request.username === '' && request.trackingCode === null) {
    return c.body(pageCopy('landing.html'), 200, { 'Content-Type': TYPES['.html'], 'Cache-Control': MUST_REVALIDATE });
  }
  const block = `<script type="application/json" id="profile-bootstrap">${asScriptJson(request)}</script>\n    `;
  const page = pageCopy('index.html').toString('utf8').replace(BOOTSTRAP_BEFORE, () => block + BOOTSTRAP_BEFORE);
  return c.body(page, 200, { 'Content-Type': TYPES['.html'], 'Cache-Control': MUST_REVALIDATE });
});

// A fixed line only: an error can carry a PocketBase answer, and a record can hold a Destination.
app.onError((err, c) => {
  console.error('request failed');
  c.header('Cache-Control', 'no-store');
  return c.json({ error: 'Internal error' }, 500);
});

serve({ fetch: app.fetch, port: 3000 });
