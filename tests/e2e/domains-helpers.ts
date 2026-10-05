// Phase 5 test plumbing that is not itself a test (Playwright's default testMatch skips it): kept apart from tests/e2e/helpers.ts,
// which holds Phase 3's plumbing and the drivers that more than one spec of Phases 1-4 shares.

// A Profile page as the app serves it from ticket 39 on (app/server.js, the Profile page bootstrap) is the Page Copy's index.html
// with one JSON block before its script tag. This is the answer without that block, to compare with the Page Copy; 05-domains
// reads the block itself.
const BOOTSTRAP = /<script type="application\/json" id="profile-bootstrap">.*?<\/script>\n {4}/s;
export const withoutBootstrap = (body: string) => body.replace(BOOTSTRAP, '');

// Phase 6's fake DNS (tests/fake-dns.mjs): the answers it gives from now on, set through its control API on loopback. Each named
// entry replaces that name's records whole; null removes the name. Only the local test stack has it.
type DnsRecords = { A?: string[]; AAAA?: string[]; TXT?: string[]; CAA?: { flags?: number; tag: string; value: string }[] };
export async function dnsAnswers(port: string, zone: Record<string, DnsRecords | null>) {
  const res = await fetch(`http://127.0.0.1:${port}/records`, { method: 'POST', body: JSON.stringify(zone) });
  if (res.status !== 204) throw new Error(`the fake DNS refused the records: ${res.status}`);
}
