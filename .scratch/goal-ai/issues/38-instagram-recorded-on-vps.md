# 38: A phone inside Instagram is recorded as Instagram on v2's VPS host

Spec: docs/spec/phase-04-stats.md
Covers: user stories 8, 33
Seams: the Operator's terminal and PocketBase's admin UI through an SSH tunnel, outside `./check.sh`; a real phone with the Instagram app; the RUN.md row 36 added. The spec's real-device `# manual:` Acceptance line
Blocked by: 36: Only the owner reads a Profile's Stats and recording never blocks a Click or a deletion, 32: Sign-up runs on the VPS with the Operator's mail and nightly backups
Status: parked — VPS step: the Operator runs the commands (plan §11; ports answered: Traefik fronts Caddy)

**What to build:** Nothing new in code. This ticket puts Phase 4 on the VPS and confirms on a real phone what the fake User-Agents showed locally. Once 32 has Phase 3 live there, the Operator, in this order:
1. copies this repo to the VPS and restarts the stack, with the same commands as Phase 2's VPS lines (plan-review, Needs the human, "The VPS"). Phase 4's migration applies on start;
2. inside Instagram on a phone, opens a Profile on v2's VPS host;
3. in PocketBase's admin UI, reads the newest Event for that Profile. It shows In-App Browser instagram, and country `XX` until 37's production source is on;
4. fills RUN.md's Phase 4 row with the device, OS version, app version and pass or fail.

When the row fails, this ticket stays open with the observed User-Agent pasted in. The spec's In-App Browser ASSUMPTION says what changes: the real User-Agent decides the patterns' order, and widening a pattern beyond plan section 4's is the Operator's call.

**Why parked.** It needs v2 live on the VPS. 23, and 32 after it, are the Operator's VPS steps. The ports question is answered (plan §11, 2026-10-04; plan-review, Needs the human, item 1): Traefik keeps 80 and 443 and fronts v2's Caddy. The real phone is the human's in any case.

ASSUMPTION: parked as a VPS step, as 11, 23 and 32 are (rung 3). Overturned once 32 closes; this ticket is then ready for the human.

- [ ] The VPS stack runs this Phase's build, and the admin UI shows the events collection with the spec's fields and the `dailyStats` view.
- [ ] RUN.md's Phase 4 row passes: the newest Event from the phone reads In-App Browser instagram.
- [ ] The Phase 4 spec's local Acceptance from 36 still passes on the commit that was deployed.
