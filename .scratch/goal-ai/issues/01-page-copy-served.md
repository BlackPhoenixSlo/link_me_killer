# 01: The test loop serves the Page Copy

Spec: docs/spec/phase-00-new-repo-ground.md
Covers: user stories 1, 2, 4, 5, 6, 7, 26
Seams: the Dev-Server Stand-in's HTTP surface at baseURL, driven by Playwright through the existing smoke spec (unchanged); byte-identity and v1 Snapshot facts through the spec's Acceptance commands
Blocked by: None (can start immediately)
Status: claimed 20261004T191309Z 2026-10-04T19:13:09Z

**What to build:** v2 gets its own public page. v1's index, script, style and landing page, plus exactly the four stock Link icons that v1 Profiles reference (the spec lists them), are copied byte-for-byte into the Page Copy, where the v2 app will live. The Page Copy is a copy, not a link: it neither imports nor references the v1 Snapshot, so later edits can never reach v1. The Dev-Server Stand-in now serves pages and static files from the Page Copy instead of the v1 Snapshot. Every other path, a Profile path included, still falls back to the Page Copy's index page with status 200, as v1 does.

For this ticket only, the stand-in still answers Profile requests and the Reveal from the v1 Snapshot. So the existing smoke spec still passes unchanged on `juliafilippo_`. That Profile's Creator photos show as broken, because photos are not part of the Page Copy. The v1 Snapshot is only read here, never edited. Nothing from it except the Page Copy enters what git would take.

ASSUMPTION: the move off the v1 Snapshot is split across tickets 01, 02 and 04, so `./check.sh` stays green at every ticket boundary. This ticket moves the page. 02 moves Profiles to the fixtures. 04 moves the Reveal. (Rung 4: each step is reversible and checkable on its own; rung 5.) Overturned if the build run accepts a red loop between tickets. The three stand-in moves would then land as one, with the same end state.

- [ ] The spec's Acceptance checks headed "The Page Copy is v1's public page plus the four stock icons, byte for byte, and nothing else" pass. Each file is byte-identical to its v1 Snapshot original. The Page Copy holds no other file: no Profile data, Creator photo, video or n8n export.
- [ ] A path that names a file in the Page Copy returns that file. Any unknown path returns the Page Copy's index page with status 200. Apart from Profile requests and the Reveal (still served from the v1 Snapshot in this ticket), the stand-in serves nothing from outside the Page Copy. So v1's secrets file can no longer be reached through it.
- [ ] Any dev server already on port 4173 is stopped first, because the Playwright config reuses one outside CI. Then the existing smoke spec passes unchanged under `./check.sh`.
- [ ] The spec's Acceptance checks headed "The v1 Snapshot is its own git checkout, unedited, git-ignored here and untracked" pass.
- [ ] The spec's leak scan reports nothing except its one pre-existing finding: v1 Link Ids in the smoke spec, which 02 removes. This shows the Page Copy brings no v1 Destination with it.
- [ ] No dependency is added. The Playwright config, `check.sh` and `package.json` are unchanged.
