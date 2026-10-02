# 06: Go-live runbook: the Operator's handoff for n8n, GitHub and the live site

Spec: docs/spec/phase-00-security-cleanup.md
Covers: user stories 27, 28, 29, 30, 36, 37, 38
Seams: the live site, GitHub and n8n, which agents cannot reach. These are the spec's `# manual:` lines and the go-live runbook in its Further Notes.
Blocked by: 01: The dev server stand-in follows netlify.toml…; 02: weiwei and jaka7q open as real Profiles; 03: Only the site folder is published…; 04: Every Link gets its own random 12-digit Link Id…; 05: No Adult Link carries its Destination in a public file
Status: parked — needs-human: every step needs the Operator's own n8n, GitHub and Netlify access. Pausing n8n, pushing, making the repo private, rewriting remote history, re-importing n8n and reading the live site are all barred to agents.

**What to build:** Nothing, for an agent. Once tickets 01–05 are done, the Operator works through the spec's go-live runbook (Further Notes, steps 1–10) in order, then the live checks. After that, ofl.ink itself no longer serves the secrets, the Destinations are gone from the public git history, and no n8n edit has been lost on the way. The exact commands are in the spec. The steps here are listed in order.

- [ ] Step 1: the n8n workflow is deactivated before the fetch. It stays off until after the forced push.
- [ ] Step 2: n8n edits made since this run are carried in.
  - If upstream has no new commits since BASE, both local commits are kept.
  - Otherwise the data commit is dropped and the code commit is rebased. The data step is then redone on the fetched files: the move, any hand repair that the tool or the tests still ask for, and the regenerate tool.
- [ ] Step 3: `./check.sh` (`tests/e2e/00-security-cleanup.spec.ts` and `tests/e2e/00-smoke.spec.ts`) and the spec's Acceptance block pass on the go-live data.
- [ ] Step 4: the GitHub repo is private, and GitHub lists no forks of it.
- [ ] Step 5: both commits are pushed to main. From this deploy on, the secrets path answers 404.
- [ ] Step 6: secrets.json is purged from the history of both main and dev, in a fresh clone outside the workspace. A fresh clone of the pushed repo then shows exactly one commit touching secrets.json (the restore), and lists dev.
- [ ] Step 7: the secrets backup and the purge clone are deleted.
- [ ] Step 8: every other checkout is re-cloned, including the one inside this workspace. A stale clone that pulls and then pushes would put the old history back.
- [ ] Step 9: the fixed n8n Form export is re-imported and activated.
- [ ] Step 10, the live checks:
  - ofl.ink and the Netlify site address both answer 404 on the secrets path (the plan's DONE);
  - every Profile file parses on ofl.ink;
  - a live Reveal of juliafilippo_'s Adult Link with the Geo Rule ends in the code for the Operator's country;
  - on a phone, juliafilippo_'s Adult Link opens the OnlyFans page after the Age Gate.
- [ ] Also in step 10, the n8n Form test, run on jaka6q:
  - an unchanged submit keeps its Link Ids and banners;
  - a submit with one Link added gives that Link a fresh 12-digit id, and the other Links keep theirs;
  - a throwaway Profile created from an uploaded copy of jaka6q's file gets Link Ids that differ from jaka6q's.
- [ ] Earlier deploys' permalinks, and any dev branch deploy, are checked on the secrets path. Any that answers 200 is retired.
- [ ] An old commit's GitHub URL is checked after the forced push. If it still answers, GitHub is asked to remove the old commits, using the clean-up steps that filter-repo printed.
- [ ] Rollback is understood: a deploy from before step 5 is never published again, because it serves secrets.json. A bad deploy is fixed by pushing forward.
- [ ] Every Link Shortcut the Operator shared under an old id is replaced, using the regenerate tool's list of old and new ids.

The Operator's ruling on the non-Adult Links that the tool lists as carrying an Adult Destination is tracked as Phase 1, D1, in docs/spec/plan-review.md `## Needs the human`. It is not part of this runbook.
