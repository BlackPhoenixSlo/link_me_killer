# 60: Caddy asks the app before it issues any certificate, so only ofl.ink's own hosts, Spare Domains and Custom Domains get HTTPS, and the Cutover needs no change in Caddy

Spec: docs/spec/phase-05-cutover-and-domains.md
Covers: user stories 1, 4, 6, 8, 19, 20, 33
Seams:
- the spec's one seam, with the TLS Ask checks made through Playwright `request` at the baseURL with `?domain=`;
- the spec's one wiring check outside Playwright. It runs on a stack started with Phase 2's test env file, reads the ask address from Caddy's own adapted config, and calls it from inside the Caddy container. The stack is taken down before `./check.sh`.
Blocked by: 59: Only the Operator sets a Custom Domain… (spec behaviour 9's live-change test, which this ticket extends with the TLS Ask answers); 57: The Operator gives a Profile a Custom Domain in PocketBase… (Host Resolution's kinds and the primary hosts setting); 17: The v2 stack starts with one `docker compose up`… (Caddy, its config at the image default, its certificate volume, and the one Phase 2 site this ticket replaces); 34: An invited Creator signs up on one screen, claims a Username… (the reserved Username `internal`, so the TLS Ask address can never be a Profile); 29: `./check.sh` runs only against v2 at localhost:4173… (the v2-only test loop and Phase 2's test env file). Not ticket 30: nothing here needs a real certificate on 443. Ticket 63 does.
Status: ready-for-agent

**What to build:** Any hostname gets a certificate on its first visit, but only if the app knows it. So a Custom Domain gets HTTPS with no hand work, and a stranger's domain pointed at the VPS gets none. ofl.ink itself is one more on-demand hostname, so the Cutover is a DNS change only.

- **TLS Ask endpoint.** It answers on every host, ahead of the Profile catch-all. Its answer comes from Host Resolution, and a primary host needs no PocketBase:
  - 200 with an empty body for a primary host or a Custom Domain (Spare Domains join in ticket 61);
  - 404 for an unknown host;
  - 400 when `domain` is missing or is not a hostname;
  - 503 when PocketBase cannot be reached, which Caddy also takes as no.
- **Caddy.**
  - A global on-demand policy asks that endpoint over the compose network.
  - One `https://` catch-all with on-demand TLS carries the same routes as Phase 2's site, and replaces it. It serves Phase 2's v2 host too.
  - Caddy's certificate volume is unchanged, so a restart re-issues nothing.
  - If ticket 30 has added an n8n site, it stays as it is.
- **Plain HTTP.** The local loop's plain-HTTP listener on the baseURL port accepts any Host. On the VPS, plain HTTP only redirects to HTTPS and answers certificate challenges, as Phase 2's runbook checks.
- **Primary hosts on the VPS** are ofl.ink, `www.ofl.ink` if it exists, and Phase 2's v2 host. The Cutover's deploy step sets them. Nothing in the repo names ofl.ink as a Caddy site.
- **RUN.md's Cutover section** gains the ofl.ink steps of the spec's Acceptance, in its order, with blanks for the recorded DNS answers and the dates. The steps are:
  - deploy;
  - record v1's DNS;
  - move the zone;
  - readiness, including the ports;
  - freeze v1 edits and run the final v1 Import;
  - backups;
  - switch;
  - verify;
  - clear readiness traffic;
  - the real-device matrix;
  - rollback;
  - Netlify off after 30 days.

  Ticket 57's Custom Domain step and ticket 61's Spare Domain steps keep their places in that order.

ASSUMPTION: the plain-HTTP listener that serves the app exists only when the test env file asks for it, just as Phase 2's site address is `:80` only in tests. Rung 3. Overturned if Phase 2's built Caddy config already separates the local loop from the VPS another way.

- [ ] Spec behaviour 1, this ticket's part. The TLS Ask answers:
  - 200 for `creator.test` and for `localhost`;
  - something other than 200 for `unknown.test`;
  - 400 with no `domain`.

  `spare.test` gets its 200 in ticket 61.
- [ ] Spec behaviour 9, TLS half: after the change to `creator2.test`, the TLS Ask answers 200 for `creator2.test` and 404 for `creator.test`.
- [ ] The wiring check in the spec's Acceptance passes:
  - on a stack started with the test env file, `caddy validate` passes;
  - the ask address in Caddy's adapted config, called from inside the Caddy container, says yes to `localhost` and no to `unknown.test`;
  - the stack is then taken down.
- [ ] With the test listener switched off, Caddy's adapted config has no plain-HTTP site that serves the app.
- [ ] RUN.md has a `## Cutover` section holding the steps above in the spec's order.
- [ ] Playwright: extends `tests/e2e/05-domains.spec.ts` (spec behaviour 1, and the TLS half of 9). `./check.sh` passes.
