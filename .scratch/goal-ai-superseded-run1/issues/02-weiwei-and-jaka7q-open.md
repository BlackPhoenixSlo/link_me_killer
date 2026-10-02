# 02: weiwei and jaka7q open as real Profiles

Spec: docs/spec/phase-00-security-cleanup.md
Covers: user stories 2, 3, 16, 33
Seams: v1's HTTP surface as the dev server stand-in serves it (Playwright `page`). Case twins are checked statically through git's index.
Blocked by: None (can start immediately)
Status: ready-for-agent

**What to build:** A Visitor opening ofl.ink/weiwei sees the Profile, with the display name "Julia Filippo", instead of being sent to the landing page. A Visitor opening ofl.ink/jaka7q sees `jaka7q` as the display name in the header and the tab title, instead of n8n template code. These are the two hand repairs the regenerate tool needs before it runs: once they are done, every Profile file parses. weiwei has a capitalised case twin (weiWEi), and the twin gets the same repaired content, so a case-sensitive host serves the repaired Profile at both names. This ticket starts the Phase's new spec.

Today only weiwei's Profile file fails to parse (rung 1: `jq empty` on each of the 27 Profile files on disk fails for weiwei.json alone). Ticket 03's "every Profile is served as JSON" test is therefore gated on this ticket.

- [ ] A Visitor opening `/weiwei` sees the display name "Julia Filippo" and stays on `/weiwei`. The test saves a screenshot to `.scratch/goal_ai/shots/00-security-cleanup.png` (spec test 9).
- [ ] A Visitor opening `/jaka7q` sees `jaka7q` as the display name, in the header and in the tab title (spec test 10).
- [ ] Every Profile file parses as JSON with a `profile` object and a `links` array.
- [ ] In git's index, every case twin pair still holds identical bytes, so weiWEi carries weiwei's repair. This is the spec's case-twin check, run over the Profile folder wherever it currently sits.
- [ ] No other Profile content changes. jaka6q's two identical cards both stay, and every Link Id stays as it is: the repeated and shared ids are ticket 04's work.
- [ ] The repairs belong to the data commit in linkme_clone3 (spec, "Two local commits"). Nothing is pushed.
- [ ] Playwright: adds `tests/e2e/00-security-cleanup.spec.ts`. `./check.sh` passes.
