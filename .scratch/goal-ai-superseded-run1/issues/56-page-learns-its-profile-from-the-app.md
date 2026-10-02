# 56: v2's page learns which Profile it shows from the app, builds every address from its own origin, and nothing a Visitor sees changes

Spec: docs/spec/phase-05-cutover-and-domains.md
Covers: user stories 7, 33 (in part). It is the prefactor the spec's Public page bootstrap calls for (Owns, Interfaces), which ticket 57 then relies on for a Custom Domain's root.
Seams: the spec's one seam, `tests/e2e/05-domains.spec.ts` against the local stack at the baseURL. Chromium is launched at file level with `*.test` mapped to the loopback address, so the page sends a real `.test` Host header over plain HTTP. Phase 0's, Phase 1's and Phase 4's specs and the smoke spec run unchanged on v2.
Blocked by: 44: v2 serves its own copy of the public page script… (the copy this ticket edits); 51: A Tracking Code stays with the Profile it arrived on… (Phase 4's last change to how the copy keeps a Tracking Code, which the app's answer now feeds); 45: A Profile load counts as one Page View… (the ping, whose Username now comes from the app); 19: Every v1 Profile opens on v2 from PocketBase… (the Profile catch-all, which now carries the identity); 28: Phase 1's spec passes against v2 on the seeded Fixture Profile (the Escape targets and the capture of custom-scheme navigation); 29: `./check.sh` runs only against v2 at localhost:4173… (the test loop)
Status: ready-for-agent

**What to build:** Prefactoring for the Phase. Today v2's page works out its Profile from the address bar. The first path segment is the Username, the second is the Tracking Code, and `/` falls back to `juliafilippo_`. On a Custom Domain's root that would show the wrong Profile. So the app now tells the page who it is, and the page stops reading its own path.

- Every Profile page the app serves carries three things, worked out from the request's host and path: the Username, the Tracking Code from the address (or none), and the Profile's own path. This is where the spec's Host Resolution starts. Until ticket 57 adds host kinds, every host uses ofl.ink's grammar, `/{username}[/{code}]`, with `/{username}` as the Profile path.
- v2's copy of the page script reads that answer instead of the path. It uses it for the Profile JSON and Reveal calls, the Page View ping, the per-Profile Tracking Code, the Link Shortcut and the Escape.
- Every address the page builds for itself is rebuilt from the page's own origin plus the Profile path. That covers address-bar cleanup, Escape targets and anything that carries a Tracking Code. Nothing the page loads or builds names ofl.ink or any other host.
- v1's tree is untouched.
- The Phase's spec file starts here. It launches Chromium with the `*.test` mapping at file level and leaves the Playwright config unchanged.

ASSUMPTION: where the app's answer names no Profile (a path outside the grammar, such as `/` on ofl.ink), the page behaves as it does today, `juliafilippo_` fallback on `/` included. Rung 4: a prefactor changes nothing a Visitor sees. Overturned if the Operator wants `/` on ofl.ink to land somewhere else.

ASSUMPTION: the spec file runs serially in the v2 project, ahead of the last project whose guard spec spends the Reveal window (ticket 21), as Phase 4's does (ticket 44). Its tests share the domains they arrange. Rung 3. Overturned if Phase 2's built Playwright config groups specs another way.

- [ ] Phase 0's specs, Phase 1's spec, Phase 4's spec and the smoke spec pass on v2 unchanged.
- [ ] On `unknown.test`, a host nobody has listed, `/{username}/{code}` shows the Fixture Profile. A Link Shortcut there reveals its Link on load.
- [ ] With an iOS Instagram User-Agent, tapping the Escape Mode Link on `unknown.test/{username}/{code}` navigates to an `x-safari-https://` address. Its host is `unknown.test` and its path keeps `/{username}/{code}`. Custom-scheme navigation is captured the way Phase 1's spec captures it.
- [ ] On `unknown.test/{username}`, the Page View ping goes to `unknown.test` at `/v/{username}`, and no request goes to `localhost:4173`.
- [ ] Playwright: adds `tests/e2e/05-domains.spec.ts`. `./check.sh` passes.
