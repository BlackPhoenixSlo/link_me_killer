'use strict';
// The app behind Caddy (docs/spec/phase-02-vps-foundation.md, Contracts): Profile JSON, /r, Reveal, PocketBase files and the
// Page Copy. It reads PocketBase as the superuser named in the environment and never logs a Destination: nothing below logs
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

const PUBLIC = path.join(__dirname, 'public');
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

// The origin the Visitor used: Caddy passes the Host through and sets X-Forwarded-Proto.
function originOf(c) {
  const proto = c.req.header('x-forwarded-proto') === 'https' ? 'https' : 'http';
  return `${proto}://${c.req.header('host')}`;
}

const pageCopy = (file) => fs.readFileSync(path.join(PUBLIC, file));

app.get('/api/profiles/:file', async (c, next) => {
  const file = c.req.param('file');
  if (!file.endsWith('.json')) return next();
  c.header('Cache-Control', MUST_REVALIDATE);
  const found = await gateway.getProfile(file.slice(0, -'.json'.length));
  if (!found) return c.json({ error: 'Profile not found' }, 404);
  return c.json(toPublicProfile(found.profile, found.links, originOf(c)));
});

app.get('/r/:linkId', async (c) => {
  c.header('Cache-Control', 'no-store');
  const destination = resolveDestination(await gateway.getLink(c.req.param('linkId')));
  if (!destination) return c.json({ error: 'Link not found' }, 404);
  return c.redirect(destination, 302);
});

// Reveal at v1's path. `user` is accepted and ignored: a v2 Link Id is unique across all Profiles. No CORS header.
app.get('/.netlify/functions/reveal', async (c) => {
  c.header('Cache-Control', 'no-store');
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

// v1's leak path stays dead: 404, with the landing page as its body.
app.get('/netlify/*', (c) => c.body(pageCopy('landing.html'), 404, { 'Content-Type': TYPES['.html'], 'Cache-Control': MUST_REVALIDATE }));

// Any other GET: the Page Copy file at that path, else index.html (v1's `/* -> /index.html` rule).
app.get('*', (c) => {
  let file = null;
  try {
    const candidate = path.resolve(PUBLIC, '.' + decodeURIComponent(c.req.path));
    if (candidate.startsWith(PUBLIC + path.sep) && fs.statSync(candidate).isFile()) file = candidate;
  } catch {
    // a malformed escape or a missing file falls through to the index page
  }
  file ||= path.join(PUBLIC, 'index.html');
  return c.body(fs.readFileSync(file), 200, {
    'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream',
    'Cache-Control': MUST_REVALIDATE,
  });
});

// A fixed line only: an error can carry a PocketBase answer, and a record can hold a Destination.
app.onError((err, c) => {
  console.error('request failed');
  c.header('Cache-Control', 'no-store');
  return c.json({ error: 'Internal error' }, 500);
});

serve({ fetch: app.fetch, port: 3000 });
