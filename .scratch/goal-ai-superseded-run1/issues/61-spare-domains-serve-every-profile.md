# 61: Every Spare Domain listed in PocketBase serves every Profile at ofl.ink's paths, ahead of any Custom Domain, and the list stays private

Spec: docs/spec/phase-05-cutover-and-domains.md
Covers: user stories 17, 22, 28, 29, 31, 32, 33
Seams: the spec's one seam.
- Host routing goes through `page`.
- The TLS Ask and privacy checks use `request` at the baseURL.
- `beforeAll` adds the Spare Domain `spare.test` through PocketBase's REST API on its loopback port, as a superuser, and `afterAll` removes it. That is set-up, not a second seam.
Blocked by: 60: Caddy asks the app before it issues any certificate… (the TLS Ask endpoint, which now says yes to Spare Domains); 58: On a Custom Domain every tap behaves as on ofl.ink… (the checks for spec behaviours 3, 5 and 8, which this ticket extends to `spare.test`); 59: Only the Operator sets a Custom Domain… (the checks for spec behaviours 9 and 11, which this ticket extends); 18: Every PocketBase collection comes from versioned migrations… (migrations and superuser-only collections); 32: The Editor's address and the Creator's PocketBase paths answer on the Profile origin… (the allow-list, which leaves Spare Domains off)
Status: ready-for-agent

**What to build:** The Operator lists a Spare Domain in PocketBase. With no deploy, it serves every Profile at the same paths as ofl.ink, gets its certificate on its first visit, and keeps serving at all times. Rotating means Creators replace "ofl.ink" in their bio links; nothing in v2 changes.

- **Domains schema, Spare half.** A new collection of Spare Domains holds one required, unique domain per record, with the same pattern and length limit as a Custom Domain. Every rule is superuser-only. The migration is additive.
- **Host Resolution** checks Spare Domains after the primary hosts and before Custom Domains.
  - A Spare Domain uses ofl.ink's grammar, `/{username}[/{code}]`, with `/{username}` as the Profile path.
  - A Custom Domain equal to a Spare Domain is never reached.
  - There is no "active domain".
- The TLS Ask says yes to a Spare Domain.
- **RUN.md's Cutover section** gains two steps, each in its place in the spec's order:
  - **the Spare Domain step:**
    - buy one;
    - add it to Cloudflare with ofl.ink's SSL/TLS settings and a Proxied A record;
    - set its nameservers;
    - list it in the PocketBase admin UI;
    - warm it with one `curl`;
    - open it inside Instagram on a phone;
  - **the rotation procedure for the day ofl.ink is Flagged.** It says that links posted outside bios keep ofl.ink and are not recovered, and how to tell whether rotation worked.

ASSUMPTION: rotating to a Spare Domain recovers traffic once ofl.ink is Flagged. This is the spec's one needs-human (its Review, B24b; docs/spec/plan-review.md, `## Needs the human`), and only a real Flag settles it. This ticket stays ready because a superuser-only collection and one more host kind are cheap to leave unused or to drop (rung 4). Overturned by the first real Flag. If the warmed Spare Domain shows a Meta warning inside Instagram, rotation fails and the Operator picks another mitigation. This ticket's collection can then stay empty.

- [ ] Spec behaviour 1, Spare half: the TLS Ask answers 200 for `spare.test`.
- [ ] Spec behaviour 4: `spare.test/{username}` shows the Fixture Profile. `spare.test/{username}?link={Link Id}` reveals that Link on load.
- [ ] Spec behaviour 3 on `spare.test/{username}/{code}`, with Tracking Codes A and B, as ticket 58 checks it on the other two hosts.
- [ ] Spec behaviour 5, Spare half: tapping the Escape Mode Link on `spare.test/{username}/{code}` gives an Escape target that keeps `spare.test` and `/{username}/{code}`.
- [ ] Spec behaviour 7, Spare half: on `spare.test`, no request goes to `localhost:4173` or `creator.test`.
- [ ] Spec behaviour 9, last step: with the second Profile's Custom Domain set to `spare.test`, `spare.test/{username}` still shows the Fixture Profile.
- [ ] Spec behaviour 11, whole: without a token, none of the spec's three requests at the baseURL contains `creator.test` or `spare.test`. The Spare Domains path answers 404 there.
- [ ] RUN.md's Cutover section holds the Spare Domain step and the rotation procedure.
- [ ] Playwright: extends `tests/e2e/05-domains.spec.ts` (spec behaviour 4, the Spare halves of 1, 3, 5 and 7, the last step of 9, and the rest of 11). `./check.sh` passes.
