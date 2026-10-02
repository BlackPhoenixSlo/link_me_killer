# 30: The VPS's ports 80 and 443 reach v2's Caddy the way the Operator chose

Spec: docs/spec/phase-02-vps-foundation.md
Covers: user stories 19, 20
Seams: the Compose config's static checks and the local test stack, which must not change. The decision itself is made on the live VPS, in ticket 31's first step.
Blocked by: 17: The v2 stack starts with one `docker compose up`…
Status: parked — needs-human: D11b (docs/spec/plan-review.md, `## Needs the human`). What holds ports 80 and 443 on the VPS today? If something does, does v2's Caddy front n8n too ("Caddy fronts both"), or does the existing proxy front v2? Settled by the `ss` check in ticket 31's first step and, if anything listens, the Operator's choice.

**What to build:** Whatever this repo needs so that HTTPS for the v2 host ends at v2's Caddy, for the case the Operator settles. Phase 5 rests on the same answer: TLS on 443 must reach Caddy, directly or by SNI passthrough.

- **Nothing holds 80/443.** v2's Caddy takes them and n8n is untouched. No repo change; this ticket closes.
- **Caddy fronts both.** v2's Caddy also serves n8n's host name, proxied to the n8n container that is already running. v2's Compose file still does not define, start or rebuild n8n. The old proxy is stopped, not deleted, so restarting it rolls back. Story 20 then no longer holds as written, so the spec's n8n decision is updated with it.
- **The existing proxy fronts v2.** v2's Caddy listens on the ports that the VPS's env file sets, and the proxy passes TLS through to it by SNI. Story 20 holds. The proxy's own configuration is outside this repo and goes to ticket 31 as a step.

ASSUMPTION: the decision's repo-side work is a ticket of its own rather than a runbook step. Only "Caddy fronts both" changes this repo, and Phase 5's Depends on rests on the same answer (the spec's Six hats, W2). Rung 5. Overturned if the answer is "nothing holds 80/443"; the ticket then closes with no change.

ASSUMPTION: under "Caddy fronts both", n8n's site exists only when its host name is set in the environment. Rung 4: the test stack and the services check stay as they are, and unsetting the name rolls it back. Overturned if the Operator wants n8n's site written into the Caddy config unconditionally.

- [ ] The Operator's choice is written in this ticket, with the `docker ps` and `ss` output that led to it. The output holds no credentials.
- [ ] Caddy fronts both:
  - with n8n's host name set, the Compose config shows Caddy serving it and reaching the running n8n container;
  - with the name unset, the config and the services list (app, caddy, pocketbase) are as before;
  - n8n's container, data and Compose project are untouched.
- [ ] The existing proxy fronts v2: the env values and the proxy's SNI passthrough are written as steps in ticket 31, and the Phase 5 spec's 443 condition is noted as met or not.
- [ ] Playwright: adds no spec. `tests/e2e/02-profile-parity.spec.ts` stays green, and `./check.sh` passes.
