# 20: A Click on v2 ends at the same Destination as on v1, through `/r` or Reveal, with v1's Tracking Codes and Geo Rules

Spec: docs/spec/phase-02-vps-foundation.md
Covers: user stories 2, 3, 4, 5, 6, 35, 36, 42
Seams: the stack's public HTTP surface.
- Playwright `request` covers Reveal and `/r`, without following redirects.
- `page` covers journeys. The last navigation to a Destination's host is caught by `page.route` and answered locally, never followed.
- The oracle is v1's own Reveal, loaded in the test process with the same secrets files the seed uses.
- PocketBase's REST API is used for the events check.
Blocked by: 19: Every v1 Profile opens on v2 from PocketBase…; 05: No Adult Link carries its Destination in a public file (Phase 0: Adult Destinations live only in the secrets file the import and the oracle read); 08: A Link Shortcut opens its Link with the Tracking Code it arrived with… (Phase 1: the Link Shortcut behaviour the journey runs)
Status: ready-for-agent

**What to build:** A Click on v2 ends where it ends on v1.

- A non-Adult Link's card leads through `/r/{Link Id}`, which redirects to the Destination.
- An Adult Link, after the Age Gate, and a Link Shortcut both go through Reveal at v1's own path.
- `/r` and Reveal share one Destination resolver, a port of v1's Reveal and Geo Rule code:
  - digits append `/c{digits}`;
  - `geo` looks the Visitor up in the Link's Geo Rule;
  - anything else appends nothing.
- The Visitor's country and US state come from the edge's request headers, in the order the spec gives, with v1's fallback to US.
- Reveal accepts `user` and ignores it.
- No Event is written.

- [ ] For every non-Adult Link outside Deeplink Mode, `/r/{id}` answers 302 with the Link's v1 Destination in `Location:`.
- [ ] For every Adult Link, Reveal answers what v1's Reveal answers:
  - with no `trackingId`, with digits, with `geo` and with junk;
  - for each Link with a Geo Rule, with several `x-country`/`x-region` pairs: a country the rule names as a string, a US state, a country with no entry, and no headers at all.
- [ ] Visitor location follows the spec's header order, checked through Reveal:
  - the country comes from `x-country`, else `cf-ipcountry`, else US;
  - the region comes from `x-nf-subdivision-code`, else `x-region`, else `cf-region-code`.
- [ ] Journeys on the page:
  - Tapping a non-Adult Link card goes through `/r/{id}` to that Link's v1 Destination.
  - Opening `/{username}/{digits}` and passing the Age Gate on an Adult Link with tracking on sends Reveal `trackingId={digits}`. The journey lands where v1's Reveal sends that code.
  - Opening `/{username}?link={Adult Link Id}` calls Reveal on load and lands where v1's Reveal sends it.
  - No navigation leaves the machine.
- [ ] An unknown Link Id gets 404 from both Reveal and `/r`.
- [ ] After every Reveal and `/r` call above, the events collection still holds no record.
- [ ] No test re-implements Tracking Codes or Geo Rules. A failing assertion names the Link Id and never prints a Destination.
- [ ] Playwright: extends `tests/e2e/02-profile-parity.spec.ts`. `./check.sh` passes.
