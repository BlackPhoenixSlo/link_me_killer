'use strict';
// The app behind Caddy (docs/spec/phase-02-vps-foundation.md, Contracts): Profile JSON, /r, Reveal, PocketBase files and the
// Page Copy; from Phase 3 on also the Editor at /edit and the same-origin API proxy (docs/spec/phase-03-auth-and-editor.md).
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
const { allow, clientIp, originOf, sameOrigin } = require('./src/click-guard');

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
const app = new Hono();

const pageCopy = (file) => fs.readFileSync(path.join(PUBLIC, file));

// The file at `rel` under `root`, else `root`'s index.html, with the Page Copy's cache header.
function staticFile(c, root, rel) {
  let file = null;
  try {
    const candidate = path.resolve(root, '.' + decodeURIComponent(rel));
    if (candidate.startsWith(root + path.sep) && fs.statSync(candidate).isFile()) file = candidate;
  } catch {
    // a malformed escape or a missing file falls through to the index page
  }
  file ||= path.join(root, 'index.html');
  return c.body(fs.readFileSync(file), 200, {
    'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream',
    'Cache-Control': MUST_REVALIDATE,
  });
}

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

app.get('/r/:linkId', async (c) => {
  c.header('Cache-Control', 'no-store');
  if (!underLimit(c)) return c.json(TOO_MANY, 429);
  const destination = resolveDestination(await gateway.getLink(c.req.param('linkId')));
  if (!destination) return c.json({ error: 'Link not found' }, 404);
  return c.redirect(destination, 302);
});

// Reveal at v1's path. `user` is accepted and ignored: a v2 Link Id is unique across all Profiles. No CORS header.
// ASSUMPTION: the same-origin check runs before the limit, so a cross-origin call refused with 403 does not use up the window
// of the IP it came from (rung 5). Overturned if cross-origin attempts must count against the limit too; `allow` then moves first.
app.get('/.netlify/functions/reveal', async (c) => {
  c.header('Cache-Control', 'no-store');
  if (!sameOrigin(c.req.raw)) return c.json({ error: 'Cross-origin request refused' }, 403);
  if (!underLimit(c)) return c.json(TOO_MANY, 429);
  const location = visitorLocation(c.req.header()); // every request header, lower-cased names
  const realUrl = resolveDestination(await gateway.getLink(c.req.query('id')), c.req.query('trackingId'), location);
  if (!realUrl) return c.json({ error: 'Link not found' }, 404);
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
  if (viewed !== 200) return c.json({ error: 'Refused by PocketBase' }, viewed);
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

// Same-origin API proxy (Phase 3 spec, Interfaces): PocketBase's users, profiles and links collection paths, records and auth
// alike, go to PocketBase with the caller's own method, headers (its token, or none) and body, and PocketBase's answer comes
// back as it is. The superuser's token is never added: PocketBase's collection rules decide every call.
// ASSUMPTION: only hop-by-hop headers are dropped, plus Accept-Encoding on the way in and the encoding and length headers on
// the way out, because Node's fetch decodes a compressed answer and the stream it hands on is no longer the one those headers
// describe (rung 5). Overturned if a client needs PocketBase's own compression through the proxy.
// ASSUMPTION: a path holding an encoded slash or backslash is not forwarded (404), so nothing past the collection name can
// step into another collection on PocketBase's side (rung 4: a closed default). Overturned if a PocketBase path in these
// collections ever needs one.
const PROXIED = /^\/api\/collections\/(users|profiles|links)\/[^/]/;
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

// v1's leak path stays dead: 404, with the landing page as its body.
app.get('/netlify/*', (c) => c.body(pageCopy('landing.html'), 404, { 'Content-Type': TYPES['.html'], 'Cache-Control': MUST_REVALIDATE }));

// Any other GET: the Page Copy file at that path, else index.html (v1's `/* -> /index.html` rule).
app.get('*', (c) => staticFile(c, PUBLIC, c.req.path));

// A fixed line only: an error can carry a PocketBase answer, and a record can hold a Destination.
app.onError((err, c) => {
  console.error('request failed');
  c.header('Cache-Control', 'no-store');
  return c.json({ error: 'Internal error' }, 500);
});

serve({ fetch: app.fetch, port: 3000 });
