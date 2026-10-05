'use strict';
// Host Resolution (docs/spec/phase-05-cutover-and-domains.md, Interfaces): a request's Host header to one of four kinds,
// checked in this order: a primary host (the PRIMARY_HOSTS setting, no database), a listed Spare Domain, a Profile's Custom
// Domain, anything else. Hostnames are lower-cased and lose any port and trailing dot before matching, and matching is exact.
// Every non-primary request asks PocketBase through the gateway; there is no cache, so an admin-UI edit is live on the next load.
// One resolveHost feeds both the TLS Ask and the page grammar, so certificate admission and routing change together.
const { HOSTNAME } = require('./gateway');

// `Host: Creator.Test:4173` and `creator.test.` both name creator.test.
const normalize = (host) => String(host || '').toLowerCase().replace(/:\d*$/, '').replace(/\.$/, '');

// The path's segments as the browser sent them (still percent-encoded, as v1's page read location.pathname), empty ones dropped.
const segmentsOf = (path) => path.split('/').filter(Boolean);

function createHostResolver({ primaryHosts, gateway }) {
  const primary = new Set(String(primaryHosts || '').split(',').map(normalize).filter(Boolean));
  // Read once, at start: with no primary host, ofl.ink itself would be an unknown host and the TLS Ask would refuse it.
  if (!primary.size) throw new Error('PRIMARY_HOSTS must name at least one host');

  // { kind: 'primary' | 'spare' | 'custom' | 'unknown', username? }: `username` only for 'custom'. A name that is not a hostname
  // (an address, a stray Host header) is 'unknown' with no PocketBase call. Throws when PocketBase cannot be read.
  async function resolveHost(host) {
    const name = normalize(host);
    if (primary.has(name)) return { kind: 'primary' };
    if (!HOSTNAME.test(name)) return { kind: 'unknown' };
    if (await gateway.isSpareDomain(name)) return { kind: 'spare' };
    const profile = await gateway.profileWithDomain(name);
    return profile ? { kind: 'custom', username: profile.username } : { kind: 'unknown' };
  }

  // Can the TLS Ask be asked about `domain`? A primary host always (local `localhost` has one label), else a hostname.
  // ASSUMPTION: the primary-host check comes before the hostname pattern, because the ticket's TLS Ask must answer 200 for
  // `localhost`, which the pattern refuses (rung 2: ticket 39's first box). Overturned if PRIMARY_HOSTS may only name hostnames
  // the schema could store; the pattern then runs alone.
  const isAskable = (domain) => primary.has(normalize(domain)) || HOSTNAME.test(normalize(domain));

  // The Profile a page request is for: { username, trackingCode, profilePath }, or null when no Profile answers the path.
  // On a Custom Domain `/` is its Profile and `/{code}` that Profile with that Tracking Code; deeper paths are null, which the
  // page answers as Phase 2 answers an unknown Username. Every other host keeps `/{username}[/{code}]`, unknown hosts included,
  // with any deeper segments ignored as v1's page ignored them; whether the Username exists is the Profile JSON's to say.
  async function resolveProfileRequest(host, path) {
    const segments = segmentsOf(path);
    const resolved = await resolveHost(host);
    if (resolved.kind === 'custom') {
      if (segments.length > 1) return null;
      return { username: resolved.username, trackingCode: segments[0] || null, profilePath: '/' };
    }
    const [username = '', trackingCode = null] = segments;
    return { username, trackingCode, profilePath: `/${username}` };
  }

  return { resolveHost, isAskable, resolveProfileRequest };
}

module.exports = { createHostResolver };
