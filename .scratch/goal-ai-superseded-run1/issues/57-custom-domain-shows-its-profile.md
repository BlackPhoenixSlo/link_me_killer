# 57: The Operator gives a Profile a Custom Domain in PocketBase, and the domain shows that Profile at its root, with Tracking Codes and Link Shortcuts

Spec: docs/spec/phase-05-cutover-and-domains.md
Covers: user stories 13, 14, 15, 17, 18, 24, 33
Seams: the spec's one seam. Host routing is checked through `page` only, because Playwright's `request` does not use the `*.test` mapping. `beforeAll` gives the Fixture Profile the Custom Domain `creator.test` through PocketBase's REST API on its loopback port, as a superuser, and `afterAll` removes it. That is set-up, not a second seam.
Blocked by: 56: v2's page learns which Profile it shows from the app… (the page that reads the app's answer); 18: Every PocketBase collection comes from versioned migrations… (the profiles collection, which gains the field); 19: Every v1 Profile opens on v2 from PocketBase… (the unknown-Username answer that a Custom Domain's deeper paths get, and the app's privileged PocketBase access); 32: The Editor's address and the Creator's PocketBase paths answer on the Profile origin… (routes that must match before `/{code}` on every host); 45: A Profile load counts as one Page View… (the `/v` route, which must also match first); 17: The v2 stack starts with one `docker compose up`… (Caddy's local plain-HTTP listener, which must hand the app the Visitor's Host header)
Status: ready-for-agent

**What to build:** A Creator's own domain stands in for `ofl.ink/{username}`. The Operator types the domain into the Profile in PocketBase. With no deploy and no Caddy edit, the domain's `/` shows that Profile, `/{code}` shows it with that Tracking Code, and `/?link={Link Id}` works as a Link Shortcut.

- **Domains schema, Profiles half.** Profiles gain an optional Custom Domain with these properties:
  - a lower-case hostname matching the spec's pattern, which has no look-ahead and lets punycode through;
  - at most 253 characters;
  - hidden from PocketBase's public API;
  - unique among the Profiles that have one.

  The migration is additive.
- **Host Resolution learns host kinds.** The host is lower-cased and loses any port and trailing dot. It is then matched exactly:
  - first against the primary hosts setting (`localhost` in the test env file);
  - then against Profiles' Custom Domains;
  - anything else is unknown.

  Every request that is not for a primary host asks PocketBase, with no cache, through the app's privileged access. Spare Domains join in ticket 61.
- **A Custom Domain's grammar.**
  - `/` is that Profile, and `/{code}` is that Profile with that Tracking Code. The Profile path is `/`.
  - Deeper paths get the answer Phase 2 gives an unknown Username.
  - The app's own routes match first on every host.
  - Primary and unknown hosts keep `/{username}[/{code}]`.
- Ticket 56's page needs no other change, because it already reads its Profile from the app and builds every address from its own origin and the Profile path.
- Caddy's local plain-HTTP listener accepts any Host header and hands it to the app unchanged. The spec checks this by its result.
- **RUN.md.** The Cutover section, created here if it is absent, gains the first Custom Domain step:
  - the one record the Creator creates: a DNS-only A record to the VPS's address, plus AAAA only if the VPS has IPv6;
  - the field the Operator fills in the PocketBase admin UI;
  - the `dig` and `curl` checks;
  - a tap of each Mode inside Instagram on a real iPhone and Android phone. An Escape must land on the domain, not on ofl.ink.

ASSUMPTION: the Custom Domain field lands here with its whole schema, but the Operator-only clauses on Profiles' create and update rules land in ticket 59. Until then a Creator's own token could set the field. Rung 5, as Phase 4 sliced its tickets (ticket 45): nothing reaches a Visitor before ticket 63 deploys the Phase. Overturned if Phase 5's tickets are deployed one at a time; ticket 59's clauses then move here.

- [ ] `creator.test/` shows the Fixture Profile's display name and Link cards.
- [ ] `creator.test/{code}` shows the same Profile.
- [ ] `creator.test/?link={Link Id}` reveals that Link on load, as `localhost/{username}?link={Link Id}` does.
- [ ] A deeper path on `creator.test` gets the same answer as an unknown Username on `localhost`.
- [ ] Spec behaviour 6: on `creator.test/`, the Page View ping goes to `creator.test` at `/v/{username}`, with the Fixture Profile's Username.
- [ ] Spec behaviour 7, Custom Domain half: on `creator.test`, no request goes to `localhost:4173` or `spare.test`. Third-party hosts that v1's page loads are left alone.
- [ ] The spec saves a screenshot of `creator.test/` to `.scratch/goal_ai/shots/05-domains.png`.
- [ ] RUN.md's Cutover section holds the first Custom Domain step.
- [ ] Playwright: extends `tests/e2e/05-domains.spec.ts` (spec behaviours 2 and 6, and the Custom Domain half of 7). `./check.sh` passes.
