'use strict';
// The Custom Domain check (docs/spec/phase-06-sites-and-domains.md, § 3 Option 1, Check route): does a Creator's domain point
// here, and does its owner hold its DNS? Five checks over node:dns, no dependency:
//   (a) the name is not a primary host or a Spare Domain, and is not under one;
//   (b) TXT `_oflink.{domain}` holds `oflink-verify={token}`;
//   (c) there is at least one A record, and every A is ORIGIN_IPV4;
//   (d) every AAAA is ORIGIN_IPV6, none at all being fine;
//   (e) there is no CAA record, or one allows letsencrypt.org.
// Each failed check is one sentence for the Editor to show as it is. `records` are the exact records the Creator sets, so the
// Editor never hard-codes the VPS address. Nothing here logs: a domain is the Creator's own, but the rule stays (app/server.js).
// DNS_SERVERS (the test stack's fake DNS, tests/fake-dns.mjs) names the servers to ask, comma-separated `host[:port]`; a host
// that is not an address is looked up once per check through the system resolver (a Compose service name). Empty: the system's.
// ASSUMPTION: CAA is read at the name and then at each parent until a set is found, as a CA reads it (RFC 8659's tree climb),
// and only `issue` entries count: a set with none lets any CA issue for a non-wildcard name (rung 4: Let's Encrypt itself
// refuses on a parent's CAA, so checking the name alone would let a domain go live that can never get a certificate).
// Overturned if the Operator wants the name alone checked.
// ASSUMPTION: the record's Name column is `@` for a two-label domain and the labels before the last two otherwise, as most DNS
// providers take a name relative to the zone (rung 5: no zone lookup). Overturned by a public suffix of two labels
// (`jakabasej.co.uk` shows `jakabasej`); the screen's hint then names the full host.
const dns = require('node:dns');
const net = require('node:net');

const ORIGIN_IPV4 = process.env.ORIGIN_IPV4 || '';
const ORIGIN_IPV6 = process.env.ORIGIN_IPV6 || '';
// Read once, at start: a malformed ORIGIN_IPV6 would fail every check's AAAA comparison, so the app refuses to start instead.
if (ORIGIN_IPV6 && !net.isIPv6(ORIGIN_IPV6)) throw new Error(`ORIGIN_IPV6 is not an IPv6 address: ${ORIGIN_IPV6}`);
const DNS_SERVERS = String(process.env.DNS_SERVERS || '').split(',').map((s) => s.trim()).filter(Boolean);

// A lookup that finds nothing is an empty answer; any other failure (a timeout, SERVFAIL) is thrown on.
const NOTHING = new Set([dns.NODATA, dns.NOTFOUND]);
const orNone = (promise) => promise.catch((err) => {
  if (NOTHING.has(err.code)) return [];
  throw err;
});

// `host[:port]` as setServers takes it: an address, with the port if one was given.
async function serverAddress(entry) {
  const [, host, port] = /^(.*?)(?::(\d+))?$/.exec(entry);
  const address = net.isIP(host) ? host : (await dns.promises.lookup(host, { family: 4 })).address;
  return port ? `${address}:${port}` : address;
}

async function resolver() {
  const r = new dns.promises.Resolver({ timeout: 3000, tries: 2 });
  if (DNS_SERVERS.length) r.setServers(await Promise.all(DNS_SERVERS.map(serverAddress)));
  return r;
}

// The record name relative to its zone (see the ASSUMPTION above), with `prefix` (`_oflink`) in front.
function relativeName(domain, prefix = '') {
  const labels = domain.split('.');
  const inZone = labels.slice(0, -2).join('.');
  return [prefix, inZone].filter(Boolean).join('.') || '@';
}

// The records to set for `domain` with `token`.
function recordsFor(domain, token) {
  const records = [];
  if (ORIGIN_IPV4) records.push({ type: 'A', name: relativeName(domain), value: ORIGIN_IPV4 });
  if (ORIGIN_IPV6) records.push({ type: 'AAAA', name: relativeName(domain), value: ORIGIN_IPV6 });
  records.push({ type: 'TXT', name: relativeName(domain, '_oflink'), value: `oflink-verify=${token}` });
  return records;
}

// The CAA set that applies to `domain`: the first non-empty one from the name up.
async function caaSet(r, domain) {
  const labels = domain.split('.');
  for (let i = 0; i < labels.length; i++) {
    const set = await orNone(r.resolveCaa(labels.slice(i).join('.')));
    if (set.length) return set;
  }
  return [];
}

const allowsLetsEncrypt = (set) => {
  const issuers = set.filter((entry) => entry.issue !== undefined).map((entry) => entry.issue.split(';')[0].trim().toLowerCase());
  return !issuers.length || issuers.includes('letsencrypt.org');
};

// { problems, records } for the record { domain, token }. `isOwnHost` is the host resolver's (a primary host or a Spare
// Domain). A DNS failure other than "no such record" is one problem saying so, never a pass.
async function checkDomain({ domain, token }, { isOwnHost }) {
  const records = recordsFor(domain, token);
  const names = domain.split('.').map((_, i, labels) => labels.slice(i).join('.')); // the name and each parent
  let own = false;
  for (const name of names) own = own || (await isOwnHost(name));
  if (own) return { problems: [`${domain} is one of ofl.ink's own addresses. Use a domain you own.`], records };
  const problems = [];
  if (!ORIGIN_IPV4) problems.push('Custom Domains are not set up on this server yet. Try again later.');
  try {
    const r = await resolver();
    const [txt, a, aaaa, caa] = await Promise.all([
      orNone(r.resolveTxt(`_oflink.${domain}`)),
      orNone(r.resolve4(domain)),
      orNone(r.resolve6(domain)),
      caaSet(r, domain),
    ]);
    const proof = `oflink-verify=${token}`;
    const texts = txt.map((chunks) => chunks.join(''));
    if (!texts.length) problems.push(`No TXT record _oflink.${domain} yet.`);
    else if (!texts.includes(proof)) problems.push(`The TXT record _oflink.${domain} does not hold ${proof} yet.`);
    if (ORIGIN_IPV4) {
      if (!a.length) problems.push(`No A record for ${domain} yet.`);
      else if (!a.includes(ORIGIN_IPV4)) problems.push(`${domain} points to ${a.join(', ')}, not ${ORIGIN_IPV4}.`);
      else for (const other of a.filter((ip) => ip !== ORIGIN_IPV4)) problems.push(`Delete the A record ${other}.`);
    }
    for (const other of aaaa.filter((ip) => !ORIGIN_IPV6 || !sameIpv6(ip, ORIGIN_IPV6))) problems.push(`Delete the AAAA record ${other}.`);
    if (!allowsLetsEncrypt(caa)) problems.push(`A CAA record for ${domain} does not allow letsencrypt.org. Add one that does, or delete it.`);
  } catch {
    problems.push(`The DNS lookup for ${domain} did not answer. Try again in a few minutes.`);
  }
  return { problems, records };
}

// Two IPv6 addresses compared as addresses, not as text (`2001:db8::1` and `2001:0db8:0:0:0:0:0:1` are one).
function sameIpv6(a, b) {
  const list = new net.BlockList();
  list.addAddress(b, 'ipv6');
  return list.check(a, 'ipv6');
}

module.exports = { checkDomain, recordsFor };
