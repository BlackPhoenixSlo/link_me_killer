# 01: The dev server stand-in follows netlify.toml, and the smoke spec reads the Adult Link's id from the served Profile

Spec: docs/spec/phase-00-security-cleanup.md
Covers: user stories 31, 32
Seams: v1's HTTP surface as the dev server stand-in serves it (Playwright `page`, through the smoke spec)
Blocked by: None (can start immediately)
Status: ready-for-agent

**What to build:** A prefactor for the rest of Phase 0. Nothing a Visitor sees changes. The dev server stand-in stops hard-coding what it serves. It serves whatever publish folder netlify.toml names and applies netlify.toml's redirects, so that once the deploy config changes in ticket 03, a 404 seen locally proves the deployed config and not just the stand-in. The smoke spec's Adult Link test stops pinning today's Link Id and reads it from the served Profile, so that it keeps passing once ticket 04 regenerates every Link Id.

ASSUMPTION: the smoke spec change (story 32) rides with the stand-in change rather than with the Link Id ticket. Both are test-loop changes that preserve behaviour and must land before the ids change, and this keeps ticket 04 smaller (rung 5). Overturned if the smoke spec is meant to change in the same ticket as the ids.

- [ ] With netlify.toml as v1 has it today, every address behaves as before: Profiles, Profile files, images, Reveal, `/landing.html`, and the catch-all, which still answers an unknown path with the Profile page shell.
- [ ] The stand-in takes its publish folder and its redirects only from netlify.toml. Rules apply in file order. `from` may end in `*`. Each rule's `to` and `status` are honoured. A file that exists in the publish folder wins over a rule, which is Netlify's default when `force` is not set.
- [ ] Functions still answer at `/.netlify/functions/{name}`, served from the functions folder, and still reload on every request.
- [ ] A stand-in left running picks up a netlify.toml edit on its next request, with no restart. Playwright reuses a running server outside CI, so this matters.
- [ ] The smoke spec's Adult Link test takes the Adult Link's id from the served Profile. No Link Id is pinned anywhere in the smoke spec, and the rest of the spec is unchanged.
- [ ] Nothing in linkme_clone3 changes.
- [ ] Playwright: extends `tests/e2e/00-smoke.spec.ts`. `./check.sh` passes.
