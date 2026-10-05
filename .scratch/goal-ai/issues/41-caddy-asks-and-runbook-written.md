# 41: Caddy asks the app before every certificate and the Cutover runbook is written

Spec: docs/spec/phase-05-cutover-and-domains.md
Covers: user stories 1, 8, 10, 14, 17, 30, 31, 35, 45
Seams: offline, the local Caddy image adapting the production configuration, and the running local stack called from inside Caddy's container; the Playwright loop through `./check.sh` for the hand-over order, its Operator steps arranged as a superuser at PocketBase's loopback port as Phase 3 arranges them; the spec's local Acceptance block under `set -e`
Blocked by: 40: On a Custom Domain or Spare Domain every Mode and Escape and Reveal works and counts as on ofl.ink, 29: Log-in lands a Creator where they left off and a handed-over Profile opens in the Editor
Status: claimed 20261005T084628Z 2026-10-05T16:02:04Z

**What to build:** Everything about the Cutover that can be made and checked on this machine, so that on the day only DNS moves.
- **Production Caddy site.** The production site address becomes one `https://` catch-all with on-demand TLS, carrying the same routes as Phase 2's public site. A global on-demand policy points its ask at the app's TLS Ask over the Compose network, so Caddy obtains a certificate only for a hostname the app admits: ofl.ink after the switch, Phase 2's v2 host, every Spare Domain and every Custom Domain. The original Host header reaches the app. The local plain-HTTP listener on the baseURL port keeps what Phase 2 gave it and accepts any Host. The primary-hosts setting is `localhost` locally; its production value is set at the runbook's step 1. Nothing in Caddy or the app changes on the day of the switch.
- **The Cutover runbook.** A `## Cutover` section in `RUN.md` holds the spec's sixteen Acceptance steps in order, with their exact commands and set-once variables, so the Operator can switch in one sitting without guessing.
- **The hand-over order.** Step 12 hands an imported Profile to its v1 Creator after the switch. If that Creator claimed another Username meanwhile, the bare Profile is deleted first. This ticket proves that order works on the local stack.

ASSUMPTION: the production Caddy configuration is checked offline with the Caddy image already on this machine, outside `./check.sh` (rung 1: the spec observed `caddy adapt` and BusyBox `wget` on the local `caddy:2-alpine` image; rung 5: the spec keeps one Playwright seam and proves the live wiring on the VPS at step 1). Overturned if the Operator wants the check inside the loop.
ASSUMPTION: the hand-over check lives beside Phase 3's hand-over case, not as a twelfth behaviour of `05-domains` (rung 3: ticket 29 arranges the hand-over that way). Overturned if the implementer finds `05-domains` the only spec that reaches a Creator's log-in; it then goes there.
ASSUMPTION: setting the owner before deleting the bare Profile is refused by Phase 3's partial unique index on owner (Phase 3 spec, One Profile per Creator). Overturned if Phase 3 fell back to a create-rule check, which a superuser bypasses. RUN.md's step 12 then says the order is not enforced, and the Operator checks the Creator owns one Profile.

- [ ] Adapting the production configuration with the local Caddy image succeeds and reports an on-demand ask endpoint at the app's TLS Ask. On the running local stack, that endpoint called from inside Caddy's container says yes to `localhost` and no to `unknown.invalid`.
- [ ] The local loop obtains no certificate and reaches no network. Phase 2's parity spec and Phase 4's Stats spec still inject location headers through the local listener and pass.
- [ ] `RUN.md`'s `## Cutover` holds steps 1 to 15 in the spec's order with its exact commands, and also says:
  - the v1 Import is never run again after the switch, written above step 6's import command;
  - the three things that break or go stale at the Cutover (story 10);
  - what a rollback restores and when to roll back (story 14);
  - the one A record a Creator creates for a Custom Domain, and that removing one means clearing the field and restarting Caddy;
  - the switch time line of step 8, and that readiness traffic stays in Stats;
  - step 12's hand-over is never done before step 8;
  - no step changes Netlify: v1 stays live on its netlify.app address indefinitely as the rollback target (plan section 10);
  - which lines rest on the production country source (step 1's ranges line, step 3, the Cloudflare part of step 4, step 7's two header probes, and the record changes in steps 8, 9 and 13), so ticket 42 can rewrite them under the other answer.
- [ ] `RUN.md` names no Destination.
- [ ] On the local stack, a Creator who owns a bare Profile is handed an ownerless Profile made the way the v1 Import makes one: setting its owner while the bare Profile exists is refused; after the bare Profile is deleted it succeeds, the Creator's next log-in lands in the Editor on the handed-over Profile with its Links, and they own exactly one Profile.
- [ ] The spec's local Acceptance block exits 0 under `set -e`: the v1 Snapshot shows no change (the status read and the empty test on two lines), the `05-domains` spec exists, `RUN.md` has `## Cutover`, and `./check.sh` passes.
