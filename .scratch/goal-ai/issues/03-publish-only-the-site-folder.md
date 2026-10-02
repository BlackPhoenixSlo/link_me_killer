# 03: Only the site folder is published: `/netlify/` answers 404 and every Visitor address still works

Spec: docs/spec/phase-00-security-cleanup.md
Covers: user stories 1, 6, 8, 9, 10, 11, 24, 25, 26, 31
Seams: v1's HTTP surface as the dev server stand-in serves it (Playwright `page` for Visitor flows, `request` for status and JSON), compared against BASE. Static checks cover the deploy config's function bundle, git's index and the n8n Form export.
Blocked by: 01: The dev server stand-in follows netlify.toml…; 02: weiwei and jaka7q open as real Profiles
Status: ready-for-agent

**What to build:** v1 deploys only a new site folder, which holds everything a page loads: the Profile page, the landing page, the script, the styles, the video, the images and the Profile files. The functions, secrets.json and the repo's own files stay outside it.

A crawler that asks for the secrets path, anything under `/netlify/`, or a file that belongs only to the repo gets nothing of value. A Visitor following any bio link sees exactly what they saw before. That covers a Profile, a Profile with a Tracking Code, an image, a Profile file, Reveal and the landing page.

Everything that reads or writes the moved folders follows them:
- the Geo Rule lookup, both locally and in the deployed function bundle;
- the n8n Form's Profile and image paths, so the Operator's edits still go live;
- the optimize tool's output.

The local 404 comes from netlify.toml's own rule, which the stand-in from ticket 01 reads. A 404 seen locally therefore proves the deploy config.

- [ ] The secrets path answers 404, and its body contains no `onlyfans.com` (spec test 1). Every path under `/netlify/` answers 404 with the landing page as its body.
- [ ] None of the repo-only files comes back with its own content (spec test 2). They are the three in-repo n8n exports, sdf, txt_replacement_dmca, README.md, optimize.py, netlify.toml, and the Reveal and Geo Rule lookup sources.
- [ ] Every Profile file name at BASE, and every Profile file in the published folder, comes back through the server as JSON with a `profile` object and a `links` array (spec test 3).
- [ ] The tests read BASE as the spec's Testing Decisions describe. BASE is `origin/main`, read with `git show`, with weiwei parsed leniently and Destinations held in memory only. A failure names the Profile file and position and never a Destination. The tests skip themselves once BASE has no Profile files.
- [ ] Every image path a served Profile references answers 200 with an `image/` content type (spec test 11). That covers each avatar and each Link's background image. The exceptions are the 6 avatars already missing at BASE.
- [ ] Reveal for juliafilippo_'s Adult Link, asked with `trackingId=geo` from country SI, ends in that Geo Rule's code as read from the served Profile (spec test 8). The deploy config bundles the Profile files from their new folder for the function (the spec's `included_files` check).
- [ ] A Visitor who arrives at `/juliafilippo_/123`, taps the Adult Link and passes the Age Gate gets a Reveal answer ending in `/c123` (spec test 13).
- [ ] The spec's Acceptance checks for the layout pass:
  - the publish folder is the site folder;
  - the functions and secrets.json sit outside it;
  - nothing is left at the old Profile and image paths;
  - every Profile and image that BASE tracks is tracked in the published folder.
- [ ] The n8n Form export is still active. Its seven Profile and image paths point into the published folder, and its four secrets.json paths are unchanged (the spec's n8n path check). No other part of the export changes in this ticket.
- [ ] The optimize tool writes its output into the published images folder.
- [ ] These are unchanged: netlify.toml's headers and catch-all, Reveal's logic, and the page files' contents, apart from the move itself.
- [ ] In linkme_clone3, the deploy config, the Geo Rule lookup and the optimize tool sit in the code commit. The move sits in the data commit, on top of the code commit. Nothing is pushed.
- [ ] Playwright: extends `tests/e2e/00-security-cleanup.spec.ts`. `./check.sh` passes.
