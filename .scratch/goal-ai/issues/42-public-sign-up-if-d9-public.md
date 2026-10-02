# 42: Anyone can sign up without an invite, if the Operator answers D9 "public"

Spec: docs/spec/phase-03-auth-and-editor.md
Covers: no user story of its own. It carries the Review's B1 and D1 (D9, public or invite-only sign-up) and the public-sign-up items under Out of Scope.
Seams: as ticket 34: Creator journeys in Playwright's browser at a phone-sized viewport, and rule probes through Playwright `request` at the same origin.
Blocked by: 34: An invited Creator signs up on one screen, claims a Username and waits on "verify your email"
Status: parked — needs-human: the Operator's written answer to D9 (docs/spec/plan-review.md, `## Needs the human`). Is sign-up public, or invite-only for Creators the Operator manages?

**What to build:** It depends on the answer.

- **Invite-only.** Nothing to build. Close this ticket and drop the D9 ASSUMPTION from ticket 34 and from the spec.
- **Public.** The sign-up rule admits any address, and the invite list stops gating it. An uninvited address signs up and claims a Username, so spec behaviour 1 turns around. The verified-email gate on content writes stays as it is. The extras that the spec's Out of Scope ties to public sign-up come back in: content rules, abuse reporting, a captcha, and rate limits on sign-up and log-in. None of them is specified yet, so they go into the spec before this ticket is built.

ASSUMPTION: D9 rests on this ticket alone. Tickets 32 to 41 build the invite-only path and are ready-for-agent, because it is the closed default and opening sign-up later only adds to it: one rule plus the Out of Scope extras, while spam from open sign-up could get the one shared domain Flagged, which cannot be undone (rung 4). This ticket's content exists only under "public", so it parks on D9 and keeps the question in the map, as ticket 15 does for Phase 1's D1 (rung 3). Overturned by the Operator answering "public" before ticket 34 is built; ticket 34 then drops its invite gate and this ticket takes the extras.

- [ ] The Operator's answer is written into the spec's D9 decision.
- [ ] If "public": an address not on the invite list signs up, claims a Username and pauses on "verify your email". Content writes still wait for a verified email. Each extra, once specified, has its own check.
- [ ] Playwright: extends `tests/e2e/03-auth-and-editor.spec.ts`. `./check.sh` passes.
