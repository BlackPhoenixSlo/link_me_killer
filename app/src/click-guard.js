'use strict';
// Click guard (docs/spec/phase-02-vps-foundation.md, Reveal hardening (D8)): the same-origin check for Reveal, and the
// in-memory, fixed-window limit per client IP that Reveal and `/r` share. Nothing here logs an address or a header.
// ASSUMPTION: the window is the wall-clock minute, the same for every client, and the whole table is dropped when a new minute
// starts (rung 5: a fixed window with memory bounded by one minute's clients and no timer). Overturned if bursts across a
// minute boundary (up to twice the limit in a few seconds) must be refused; the window then moves to a sliding log.
const WINDOW_MS = 60_000;
// The Reveal limit is read once, at start, from the environment; compose.yaml holds its only default. Not a number above 0:
// the app refuses to start rather than run unguarded or on a second default.
const LIMIT = Number(process.env.REVEAL_LIMIT_PER_MINUTE);
if (!(LIMIT > 0)) throw new Error('REVEAL_LIMIT_PER_MINUTE must be a number above 0');

let windowStart = 0;
let counts = new Map();

// True while `clientIp` has made at most the limit of calls in this minute; every call counts, refused ones too.
function allow(clientIp) {
  const now = Date.now();
  const start = now - (now % WINDOW_MS);
  if (start !== windowStart) {
    windowStart = start;
    counts = new Map();
  }
  const count = (counts.get(clientIp) || 0) + 1;
  counts.set(clientIp, count);
  return count <= LIMIT;
}

// The client IP is the last X-Forwarded-For entry, the one Caddy writes; any entry before it is a claim Caddy passed on.
// ASSUMPTION: the last-entry rule is proven only by inspection: Caddy trusting no proxy replaces a client-set header with
// the peer address, so every local call carries one entry and a first-entry rule would pass the same tests (rung 1, observed
// with a temporary entry-count log in ticket 22). Behind Traefik, Caddy's PROXY protocol flag (PROXY_PROTOCOL_FROM, ticket
// 45) makes the header's source Caddy's peer, so the entry Caddy writes is still the Visitor's: tests/proxy-protocol.sh shows
// Visitor A reaching 429 while Visitor B, behind the same allowed proxy, is still answered, which proves separate windows.
// Phase 5's Cloudflare lines keep it so by replacing the header with Caddy's client address. Overturned if Caddy ever
// appends a trusted proxy's address instead; the key then moves to the entry before it.
// ASSUMPTION: a request without X-Forwarded-For throws, so it gets the 500 Hono answers to any thrown error, with no
// Destination (rung 4: a loud 500 shows a changed proxy at once, where one key shared by every header-less call would hide
// it until load turned it into 429s for every Visitor). Every request reaches the app through Caddy, which always writes
// the header, and the app publishes no port (spec, Reveal hardening (D8)), so this fires only when that is no longer true.
// Overturned if something other than Caddy must reach Reveal or `/r`; it then needs a client address of its own.
function clientIp(request) {
  const forwarded = request.headers.get('x-forwarded-for');
  if (!forwarded) throw new Error('X-Forwarded-For missing: Reveal and /r are reached only through Caddy');
  return forwarded.split(',').pop().trim();
}

// The origin the Visitor used: Caddy passes the Host through and sets X-Forwarded-Proto.
function originOf(request) {
  const proto = request.headers.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
  return `${proto}://${request.headers.get('host')}`;
}

// False when `Origin` names another origin than the one the request came to (`originOf`), or when Sec-Fetch-Site says the
// caller is another site or a sibling subdomain. Neither header: true.
function sameOrigin(request) {
  const site = request.headers.get('sec-fetch-site');
  if (site === 'cross-site' || site === 'same-site') return false;
  const origin = request.headers.get('origin');
  if (origin === null) return true;
  try {
    return new URL(origin).origin === new URL(originOf(request)).origin;
  } catch {
    // ASSUMPTION: `Origin: null` or a malformed value counts as another origin (rung 4). Overturned if a real Visitor's browser
    // sends `Origin: null` on the page's own Reveal.
    return false;
  }
}

module.exports = { allow, clientIp, originOf, sameOrigin };
