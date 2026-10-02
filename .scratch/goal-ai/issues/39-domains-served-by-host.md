# 39: Custom Domains and Spare Domains listed in PocketBase serve Profiles by host and pass the TLS Ask

Spec: docs/spec/phase-05-cutover-and-domains.md
Covers: user stories 22, 23, 24, 29, 31, 32, 33, 34, 36, 40, 41, 43, 45
Seams: the Playwright spec `05-domains` against the local stack at the existing baseURL through `./check.sh`. Chromium maps `*.test` to loopback, so host-routing checks go through `page` with real `creator.test:4173` and `spare.test:4173` Host headers over plain HTTP; TLS Ask checks go through `request` at the baseURL with `?domain=`. Set-up and tear-down as a superuser through PocketBase's REST API (set-up, not a second seam); the Creator's writes through the API the Editor uses
Blocked by: 22: Reveal and /r answer only v2's own origin within a per-client limit, 30: Only a Profile's owner and the Operator can read or change it through PocketBase's API
Status: ready-for-agent

**What to build:** The Operator types a domain into a Profile, or lists a Spare Domain, in the PocketBase admin UI, and on the next page load that hostname works with no deploy and no Caddy edit.
- **Host Resolution.** The app turns the request's Host header into one of four kinds, checked in this order: ofl.ink's own hosts (the primary-hosts setting, no database), a listed Spare Domain, a Profile's Custom Domain, anything else. Hostnames are lower-cased and lose any port and trailing dot, and matching is exact. Every non-primary request asks PocketBase; there is no cache.
- **Paths per host.** On a Custom Domain, `/` is that Profile, `/{code}` is that Profile with that Tracking Code, and `?link=` is a Link Shortcut; deeper paths get Phase 2's unknown-Username answer. Every other host, Spare Domains and unknown hosts included, keeps `/{username}[/{code}]`. The app's own routes (Reveal, `/r`, the Page View ping, the TLS Ask, the Editor and its proxy, the page's static files) match first on every host.
- **TLS Ask.** `GET /internal/tls-ask?domain=` answers an empty 200 for a primary host, Spare Domain or Custom Domain, 404 for anything else, 400 when `domain` is missing or not a hostname, and 503 (never 200) for a non-primary host when PocketBase cannot be reached. It confirms one hostname the caller already has and never lists any.
- **The page learns its Profile from the app.** Each Profile page carries its Username, Tracking Code and Profile path as a JSON block, and v2's copy of the public page reads them there instead of parsing its own address.
- **Domains schema.** An optional Custom Domain on Profiles (the spec's hostname pattern, at most 253 characters, hidden from the public API, unique when set) and a Spare Domains collection that only superusers can list, view or change. Phase 3's Profiles create and update rules refuse any non-superuser request that sets a Custom Domain, so only the Operator sets one, and the Editor has no field for it.

ASSUMPTION (the spec's, rung 5): a Custom Domain that equals ofl.ink's host or a Spare Domain is never reached, because the order above settles it; nothing is validated on save. Overturned if the Operator wants such a typo refused when it is saved.
ASSUMPTION (the spec's, evidence blocked): the Operator-only clause uses PocketBase 0.23+ request-body syntax. Overturned by the rule syntax of the release Phase 2 pins.

- [ ] The TLS Ask answers 200 for `creator.test`, `spare.test` and `localhost`, 404 for `unknown.test`, and 400 when `domain` is missing.
- [ ] `creator.test/` shows the Fixture Profile's display name and Link cards, `creator.test/{code}` shows the same Profile, and `creator.test/?link={Link Id}` reveals that Link on load exactly as `localhost/{username}?link={Link Id}` does.
- [ ] `spare.test/{username}` shows the Fixture Profile, and `spare.test/{username}?link={Link Id}` reveals that Link on load.
- [ ] Changing the Fixture Profile's Custom Domain to `creator2.test` makes `creator2.test/` show it on the next load with no restart, and the TLS Ask then answers 200 for `creator2.test` and 404 for `creator.test`.
- [ ] Giving a second, test-made Profile the same Custom Domain is refused. With that Profile's Custom Domain set to `spare.test`, `spare.test/{username}` still shows the Fixture Profile.
- [ ] Signed in as a verified Creator through the Editor's API, creating a Profile with a Custom Domain and setting one on their own Profile are both refused, and the stored value is unchanged.
- [ ] Loading `localhost/{username}`, no response body the page receives contains `creator.test`. Without a token at the baseURL, no response from the Profiles or Spare Domains records API contains `creator.test` or `spare.test`.
- [ ] Set-up gives the Fixture Profile `creator.test` and lists `spare.test`; tear-down removes both, and a test that changes a domain restores it. `unknown.test` is never added, and the seed is unchanged.
- [ ] A screenshot of `creator.test/` is saved with the run's other shots. A failing assertion names the Link Id and never prints a Destination.
- [ ] Every existing spec still passes on `localhost`, and `./check.sh` passes.
