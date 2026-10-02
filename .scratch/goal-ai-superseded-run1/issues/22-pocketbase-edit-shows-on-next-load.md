# 22: An edit made through PocketBase shows on the next page load

Spec: docs/spec/phase-02-vps-foundation.md
Covers: user stories 7, 26
Seams: PocketBase's REST API on its loopback port, called as the superuser, which is the API the admin UI drives. It arranges each edit. The stack's public HTTP surface (Playwright `page` and `request`) observes the result.
Blocked by: 18: Every PocketBase collection comes from versioned migrations…; 19: Every v1 Profile opens on v2 from PocketBase…
Status: ready-for-agent

**What to build:** When the Operator changes a Profile or a Link in PocketBase, the change shows at the next page load, with no build and no restart. Nothing caches Profile data. Every Mode value set in PocketBase reaches the Profile JSON that v1's page script reads.

- [ ] A throwaway Profile and Link, created through PocketBase's API, show on the page.
- [ ] Each of these shows on the next load, with no restart:
  - renaming the Profile;
  - retitling a Link;
  - reordering the Links;
  - adding a Link;
  - deleting a Link.
- [ ] Deleting the throwaway Profile sends its page to /landing.html.
- [ ] The Profile JSON shows each of these on the next load, as the effective Mode:
  - the throwaway Profile's default Mode set to `direct`, `escape_ig` and `deeplink` in turn;
  - a Link's own Mode set to each of the three in turn;
  - a Link with no Mode of its own, which inherits the Profile's.
- [ ] Every throwaway record is gone after the spec, and no seeded Profile was touched.
- [ ] A screenshot of the throwaway Profile after its edits is saved under `.scratch/goal-ai/shots/`.
- [ ] Playwright: extends `tests/e2e/02-live-edit.spec.ts`. `./check.sh` passes.
