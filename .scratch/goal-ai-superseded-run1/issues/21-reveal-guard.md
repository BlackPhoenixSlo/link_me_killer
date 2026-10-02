# 21: Reveal answers only its own origin, and Reveal and `/r` slow down a harvester

Spec: docs/spec/phase-02-vps-foundation.md
Covers: user stories 33, 34
Seams: the stack's public HTTP surface, through Playwright `request` with crafted `Origin`, `Sec-Fetch-Site` and `X-Forwarded-For` headers. The limit is read from the test env file. The spec runs in a last Playwright project, after every other v2 spec.
Blocked by: 20: A Click on v2 ends at the same Destination as on v1…
Status: ready-for-agent

**What to build:** Reveal and `/r` get the spec's Click guard, as obfuscation rather than a security boundary (ADR 0004).

- Reveal refuses with 403 when the `Origin` names another origin, or when `Sec-Fetch-Site` is `cross-site` or `same-site`. A request with neither header passes.
- Reveal never sends a CORS header.
- Reveal and `/r` share one fixed-window limit per client per minute, held in the app's memory. The client is the IP that Caddy reports in `X-Forwarded-For`.
- The limit comes from the environment: 60 by default and 600 in the test env file, so one local run fits in one window.
- Because the guard spends the window, its spec runs in a last project after every other v2 spec. The v1 Import spec (ticket 25) joins that project.

- [ ] Reveal gets 403, with no Destination in the body, when it carries any of these:
  - a foreign `Origin`;
  - `Sec-Fetch-Site: cross-site`;
  - `Sec-Fetch-Site: same-site`.
- [ ] Reveal passes when its `Origin` is the stack's own, and when it carries neither header.
- [ ] No Reveal answer (200, 403, 404 or 429) carries `Access-Control-Allow-Origin`.
- [ ] Repeated calls reach 429 within the limit plus one requests, with the limit read from the test env file:
  - Reveal calls alone;
  - `/r` calls alone;
  - a mix of the two, which share one window.

  No 429 body holds a Destination.
- [ ] A client that sends its own, changing `X-Forwarded-For` still reaches 429.
- [ ] The guard spec runs after every other v2 spec, so a spent window never fails another spec.
- [ ] Playwright: adds `tests/e2e/02-reveal-guard.spec.ts`, in a last project. `./check.sh` passes.
