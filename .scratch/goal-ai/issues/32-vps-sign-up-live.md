# 32: Sign-up runs on the VPS with the Operator's mail and nightly backups

Spec: docs/spec/phase-03-auth-and-editor.md
Covers: user stories 6, 8, 14, 15, 17, 24, 41, 57, 58
Seams: the Operator's terminal and PocketBase's admin UI through an SSH tunnel, outside `./check.sh`; a real inbox; a real iPhone (Safari) and Android phone (Chrome). The spec's `# manual:` Acceptance lines
Blocked by: 31: Verification and reset emails reach the local mail catcher and their links work, 23: v2 serves every v1 Profile identically on its public https host on the VPS
Status: parked — VPS step: the Operator runs the commands (plan §11; ports answered: Traefik fronts Caddy)

**What to build:** Nothing new in code. This ticket closes Phase 3 on the VPS. Once 23 has v2 on its public https host, the Operator, in this order:
1. copies this repo to the VPS and restarts the stack, with the same commands as Phase 2's VPS lines (plan-review, Needs the human, "The VPS"). The auth-and-ownership migration applies on start, and the VPS stack runs no mail catcher;
2. in the admin UI, sets Settings → Application URL to the public origin and Settings → Mail to the Operator's SMTP sender: host, port, user, password and from-address. This is a human-held credential and is never committed;
3. in the admin UI, turns on Settings → Backups: auto backups, cron `0 3 * * *`, keep 7. From this deploy on, public sign-up makes v2 the only copy of new Profiles (spec, Further Notes, Backups). Phase 5 checks before the switch that backups are on and that one has completed;
4. with a real inbox, signs up, follows the verification link (the screen says verified), then uses "Forgot password", follows the email link, sets a new password and logs in with it;
5. on a real iPhone (Safari) and a real Android phone (Chrome), completes Onboarding with a camera photo (HEIC on iOS) as avatar and as a background. The public Profile serves both as webp.

The results are recorded in this ticket. The Operator shares the sign-up link privately. No v1 Import runs and no imported Profile is handed over: that is step 12 of Phase 5's Cutover runbook. n8n, the n8n Form and v1 are not touched, and v1 keeps serving ofl.ink until Cutover.

**Why parked.** It needs v2 live on the VPS, which is 23's VPS step for the Operator. The ports question is answered (plan §11, 2026-10-04; plan-review, Needs the human, item 1): Traefik keeps 80 and 443 and fronts v2's Caddy. The SMTP sender, the real inbox and the real phones are the human's in any case.

ASSUMPTION: parked as a VPS step, as 11 and 23 are (rung 3). Overturned once 23 closes; this ticket is then ready for the human.

- [x] The Application URL and the SMTP sender are set in the admin UI, and the repo holds no SMTP credential. (2026-10-05: set through PocketBase's settings API on the VPS over the tunnel: Application URL https://v2.ofl.ink (to become https://ofl.ink at Cutover step 1), sender ofl.ink <me@jackbase.dev>, SMTP mail.privateemail.com:587 STARTTLS PLAIN; `PATCH /api/settings` 200, `POST /api/settings/test/email` 204. The credential lives in PocketBase's database only.)
- [ ] Scheduled backups are on, daily at 03:00 and keeping 7, as the admin UI shows.
- [ ] The real-inbox verification and reset run passes, recorded here.
- [ ] Both phones complete Onboarding, and the public Profile serves the avatar and the background as `image/webp`, recorded here.
- [ ] At the public host, `/api/collections/_superusers/auth-with-password` answers 404. The admin UI answers only through the SSH tunnel.
- [ ] n8n's containers are the same before and after (`docker ps` ids). The n8n Form and v1 are untouched, and v1 still serves ofl.ink.
