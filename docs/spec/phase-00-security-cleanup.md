# Phase 00 — Security + data cleanup on the current Netlify site

**Objective.** v1 deploys only its site folder, so the secrets path answers 404, no Adult Link's Destination sits in a public file, every Profile file parses, and every Link has a random Link Id that the n8n Form keeps stable. All of this is proven on the local dev server, and the GitHub, n8n and live-site steps go to the Operator as a runbook.

## Problem Statement

The Operator believes Reveal keeps Destinations hidden. It does not:

- v1 deploys its whole repo (`publish = "."`). `ofl.ink/netlify/functions/secrets.json` therefore gives anyone every Destination. The files next to it are public too: three n8n exports (Feb18.json, n8nFeb15.json, n8nWorkflow.json), sdf and txt_replacement_dmca. Locally the dev server answers 200 with the file for each of these paths today.
- The GitHub repo BlackPhoenixSlo/linkme_clone3 is public, and secrets.json is in its history.
- 7 of the 25 Adult Links in parseable Profiles also carry their Destination in their public Profile file.
- A Link Id is the Username plus a few digits, so anyone can guess one and ask Reveal for its Destination.

Visitors and Creators also run into broken data that the n8n Form wrote:

- weiwei's Profile file has a trailing comma. A Visitor who opens `/weiwei` is bounced to the landing page.
- jaka7q's Profile shows template code (`$('Extract from Upload File')…`) as its name.
- juliafilippo_, jaka6q and jaka7q each have two Links that share one Link Id.
- juliafilippo_'s ids repeat the Username three times.
- juliafilippo and weiwei both use the ids `1` and `2`.
- Reveal looks Destinations up by id alone, so Links that share an id share one Destination.
- secrets.json keeps every id that has been replaced: 10 of its 29 entries belong to no current Link, and they still reveal.

The cause is in the n8n Form:

- Every edit rebuilds each Link Id from the Username plus the digits of the old id.
- A new Link gets a number from 1 to 1000.

As a result, ids change on every edit, collide across copied Profiles, and keep growing for Usernames that contain digits.

## Solution

**What Visitors see.**
- Only a `public/` folder in the product repo is deployed. Every Visitor-facing address stays the same: `/{username}`, `/{username}/{code}`, `/api/profiles/…`, `/images/…`, Reveal and `/landing.html`.
- Anything under `/netlify/` answers 404.
- Files that belong only to the repo cannot be reached any more.

**The data.**
- The corrupted Profiles are repaired.
- Every Link gets a fresh random 12-digit Link Id, unique across ofl.ink.
- secrets.json is rebuilt so that it holds the current Links and nothing else.
- Adult Links no longer carry their Destination in the public file.
- Old ids stop revealing.

**The tool.**
- A small tool does the id work.
- The Operator can re-run it on freshly pulled data at go-live. A run on clean data changes nothing.

**n8n.**
- The active n8n export is fixed: an edit keeps each Link's id, a new Link gets a random id, and the files are written into `public/`.

**What the Operator does.**
- The Operator gets a short runbook for the steps this run may not take: pause n8n, make the repo private, purge secrets.json from history, push, re-import n8n, and check ofl.ink live.

## User Stories

1. As a Visitor, I want every Profile, image and Tracking Code address to look and work as before the move into `public/`, so that the bio links I follow still work.
2. As a Visitor opening ofl.ink/weiwei, I want to see the Profile instead of being sent to the landing page, so that the Creator's bio link works.
3. As a Visitor opening ofl.ink/jaka7q, I want a real display name in the header and the tab title instead of template code, so that the page looks trustworthy.
4. As a Visitor on a Profile where two cards used to share a Link Id, I want each card to lead to its own Destination, so that I land where the card says.
5. As a Visitor tapping an Adult Link, I want the Age Gate and then the same Destination as before, now looked up by its new Link Id, so that nothing changes for me.
6. As a Visitor arriving with a Tracking Code, or from a country covered by a Geo Rule, I want the OnlyFans Destination to carry the same `/c{code}` as before, so that the Creator's attribution holds.
7. As a Visitor holding an old Link Shortcut, I want the Profile to still open, so that I am not stranded, even though the shortcut no longer reveals.
8. As a Creator, I want my Profile, banners and attribution to come through Phase 0 unchanged, so that my traffic is not interrupted.
9. As the Operator, I want `ofl.ink/netlify/functions/secrets.json` to answer 404, so that no one can download every Destination.
10. As the Operator, I want every path under `/netlify/` to answer 404, so that neither the function sources nor the secrets can be fetched by any path.
11. As the Operator, I want the n8n exports, sdf, txt_replacement_dmca, README.md, optimize.py and netlify.toml to stop being served, so that the repo's internals stay private.
12. As the Operator, I want no public Profile file to carry an Adult Link's Destination, so that the Age Gate and Reveal are the only way to reach it.
13. As the Operator, I want every Link Id to be 12 random digits, unique across ofl.ink and with no trace of the Username, so that ids cannot be guessed.
14. As the Operator, I want every old Link Id to stop revealing, so that leaked or guessed old ids are useless.
15. As the Operator, I want secrets.json to hold exactly one entry per current Link that has a Destination, so that replaced ids stop revealing and the file matches the Profiles.
16. As the Operator, I want the 4 corrupted Profiles (juliafilippo_, jaka6q, jaka7q, weiwei) repaired, so that every Profile file parses and every id is unique.
17. As the Operator, I want a tool that regenerates Link Ids, which I can re-run on freshly pulled data without changing anything already clean, so that go-live includes n8n edits made after this work.
18. As the Operator, I want the tool to list each Link's old and new id, so that I know which shared Link Shortcuts to replace.
19. As the Operator, I want the tool to list Links that have no Destination on record, so that I can fix or drop them.
20. As the Operator, I want the tool to stop and name the file when a Profile file does not parse, so that it never writes from broken input.
21. As the Operator, I want each banner image to exist under the name n8n will build from the new Link Id, so that my next n8n edit does not blank the banners.
22. As the Operator, I want the n8n Form to keep an existing Link's id across edits, so that ids, Link Shortcuts and secrets entries stop changing (the prefix bug).
23. As the Operator, I want the n8n Form to give a fresh random 12-digit id to every new Link and to every Link that arrives in an uploaded file, so that copied Profiles never share ids or Destinations.
24. As the Operator, I want the n8n Form to write Profiles and images into `public/`, so that my edits still go live after the move.
25. As the Operator, I want optimize.py to write into the published images folder, so that local image prep still reaches the site.
26. As the Operator, I want Reveal's Geo Rule lookup to find Profiles in their new folder, both locally and on Netlify, so that geo Tracking Codes keep working.
27. As the Operator, I want a step-by-step go-live list for the steps only I can take, so that no n8n edit is lost and nothing is left exposed.
28. As the Operator, I want the GitHub repo made private and secrets.json removed from its history, so that the Destinations are not in a public git log.
29. As the Operator, I want a live check that ofl.ink's secrets path answers 404 and that every Profile parses there, so that the plan's DONE is observed on the real site.
30. As the Operator, I want to know whether old Netlify deploys or GitHub forks still serve the old files, so that I can retire them.
31. As the agent, I want the dev server to follow netlify.toml's publish folder and redirect rules, so that a 404 seen locally proves the deployed config.
32. As the agent, I want the smoke spec to read the Adult Link's id from the served Profile, so that it still passes after the ids are regenerated.
33. As the agent, I want a screenshot of `/weiwei` saved in `.scratch/goal_ai/shots/`, so that the human can glance at the repaired Profile.

## Implementation Decisions

- **Owns.**
  - *v1 site layout* (the product repo, linkme_clone3). A new `public/` folder holds everything a page loads: index.html, landing.html, script.js, style.css, example.webm, `images/` and `api/profiles/` (rung 1: what index.html, landing.html and script.js reference). Everything else stays where it is, outside `public/`: netlify.toml, `netlify/functions/` (Reveal, the Geo Rule lookup, secrets.json), optimize.py, README.md, the three in-repo n8n exports, sdf and txt_replacement_dmca.
  - *v1 deploy config* (netlify.toml).
  - *The Geo Rule lookup* (geo_utils): only the folder it reads from changes.
  - *Profile files and secrets.json*: the hand repairs, plus everything the regenerate tool writes.
  - *regenerate-link-ids*, a new tool: a Node script with no dependencies, at the product repo root next to optimize.py.
  - *optimize tool*: only its output folder changes.
  - *The n8n Form export*: `n8n_oflink_Feb18.json` in the workspace root. It is the active workflow (`"active": true`, rung 1).
  - *Test loop*: the dev server stand-in, the smoke spec's Adult Link test, and a new spec, `00-security-cleanup`.
  - Not touched: script.js, index.html, landing.html and style.css, apart from moving them. Reveal's own logic is not touched either: its id lookup, its Tracking Code handling and its CORS header stay as they are.
  ASSUMPTION: regenerate-link-ids is kept as a script, not run once and thrown away, because the Operator must re-run it on the data pulled at go-live. It sits next to optimize.py (rung 3). Overturned if the remote has had no n8n edit since this snapshot.

- **Interfaces.**
  - **netlify.toml**
    - `publish = "public"`.
    - A new redirect, placed above the catch-all: everything under `/netlify/` answers status 404, with landing.html as the body.
    - `[functions] included_files` points at the Profile files' new folder.
    - The headers and the catch-all are unchanged.
  - **Geo Rule lookup**
    - Reads `{username}.json` from the Profile files' new folder, both from the source tree (local) and from the deployed function bundle (relative to the working directory).
    - Its signature does not change.
  - **regenerate-link-ids**
    - Invocation: `node linkme_clone3/regenerate-link-ids.mjs`. It takes no arguments and works on the repo it sits in. In order:
      1. It reads every Profile file and secrets.json. If any of them fails to parse, it exits non-zero and names the file, so the hand repairs must come first.
      2. It keeps a Link Id that is already 12 digits and not taken by an earlier Link in the same run. Otherwise it mints a new id with a crypto-random generator, unique across all Profiles.
      3. It picks each Link's Destination. A non-Adult Link's Destination is its own `url`, which is where v1 sends Visitors today. An Adult Link's Destination is its secrets entry under the old id, or its own `url` if there is no entry.
      4. It rewrites secrets.json from scratch: one entry per Link that has a Destination, and nothing else.
      5. It sets `url` to `""` on every Adult Link.
      6. For each Link with a background image whose id changed, it copies the image to `images/{profile file name}_alt{new id}.webp` and points the Link at the copy. The original images stay in place. If the source image is missing, the Link keeps its path and is reported.
      7. It prints each Link's old and new id, and every Link with no Destination on record.
    - Geo Rules, tracking settings, titles, icons, avatars and Link order are left alone.
    - The tool is idempotent: run again on its own output, it changes nothing.
  - **optimize tool**: writes its webp output into the published images folder.
  - **n8n Form export**
    - All seven GitHub file paths for Profiles and images gain the `public/` prefix. The secrets.json path is unchanged.
    - The Link Id rule: a Link keeps its id when the Profile's own stored file in GitHub already has that id. Every other Link gets a fresh random 12-digit id, whether it is new or arrived in an uploaded JSON file. The Username is never part of an id.
    - The banner-name expression and every other node are unchanged.
  - **Dev server stand-in**
    - Serves the `publish` folder named in netlify.toml.
    - Applies netlify.toml's `[[redirects]]` in file order, using `from` with an optional trailing `*`, `to` and `status`.
    - A file that exists in the publish folder wins over a rule, which is Netlify's default when `force` is not set.
    - Functions keep running at `/.netlify/functions/{name}` from `netlify/functions/`.
  - **Smoke spec**: the Adult Link test reads the Link Id from the served Profile instead of pinning `juliafilippo_juliafilippo_juliafilippo_name1`.

- **Schema.** No new fields. Existing data gets these constraints:
  ```
  Link.id       string, /^\d{12}$/, unique across every Profile file
  Link.url      "" whenever Link.isAdult is true
  secrets.json  { [Link.id]: Destination }  — keys = exactly the Link Ids that have a Destination
  ```

- **Contracts.**
  - **Public addresses** are unchanged, as listed under Solution.
  - **`GET /netlify/*`** is new and answers 404.
  - **Reveal** keeps its request and response as they are. A Link Id that is no longer current gets 404.
  - **n8n ↔ GitHub file paths** become:
    - Profiles: `public/api/profiles/{ID}.json`
    - Avatars: `public/images/{ID}.webp`
    - Banners: `public/images/{ID}_alt{digits of Link Id}.webp`
    - Secrets: `netlify/functions/secrets.json`, unchanged
  - **Dev server ↔ netlify.toml**: the stand-in reads its publish folder and redirects from netlify.toml. Any later change to either reaches the local tests without editing the stand-in.

- **n8n paths.**
  ASSUMPTION: n8n's seven Profile and image paths gain the `public/` prefix. This is work the plan's "n8n untouched except the prefix bug" did not foresee: after the move, n8n edits would otherwise land in files that are not deployed. The prefix was chosen over a Netlify build command that copies `api/` and `images/` into `public/`, because it is the smaller change (rung 5). Overturned if the Operator would rather keep n8n's paths and add that build step.

- **The prefix-bug fix.**
  ASSUMPTION: the "prefix bug" fix is the Link Id rule above: keep a stored id, otherwise mint a random one, and never prepend the Username. The corrupted ids all come from that one expression. Minting fresh ids for Links that arrive in an uploaded file prevents the cross-Profile collisions that kept ids would cause, since the upload field is how Profiles get copied (rung 5). Overturned if the Operator reads "prefix bug" as only stopping the Username repetition.

- **Link Id format.**
  ASSUMPTION: a Link Id is 12 random digits. That meets D8's "random 10+ chars". n8n's banner-name expression, which is not changed, keeps only an id's digits, and with all-digit ids it still gives each Link its own file name (rung 5). Overturned if ids must be alphanumeric, which would also mean changing n8n's banner paths.

- **Which Destinations leave the public files.**
  ASSUMPTION: only Adult Links lose their Destination from the Profile file. A non-Adult Link keeps its public `url`, because v1's script goes straight to it, and hiding it needs script work this Phase does not own (rung 5). Overturned if ADR 0004's "no Destination in any public file" must cover non-Adult Links in v1 too.

- **Banner copies.**
  ASSUMPTION: banners are copied to the name n8n will build from the new id. On its next edit of a Link with a banner, n8n rewrites the banner path to `{ID}_alt{digits of id}.webp`. Copying leaves n8n untouched, and it leaves shared images such as face.webp and motherfucker_alt450.webp where other Links use them (rung 4). Overturned if the Operator would rather re-upload banners or change n8n's banner expression.

- **Why the 404 needs its own rule.**
  ASSUMPTION (evidence blocked): the catch-all rewrite makes Netlify answer 200 with index.html for any path missing from `public/`. The plan's 404 therefore needs its own rule. The dev server copies that catch-all and answers 200 for `/nope/missing.json` today. Netlify itself cannot be observed from here. Overturned if ofl.ink answers 404 for the secrets path without the rule.

- **The 404 rule.**
  ASSUMPTION: the rule covers all of `/netlify/*`, the whole old functions tree, and not only secrets.json. Its body is landing.html, the page that unknown Profiles already lead to, so no new file is needed (rung 5). Overturned if a Profile named "netlify" must exist, or if a dedicated 404 page is wanted.

- **Dev server follows netlify.toml.**
  ASSUMPTION: the dev server reads the publish folder and redirects from netlify.toml instead of hard-coding them. A local 404 then proves the deployed config, not just the stand-in. The stand-in's own header says it stands in for `netlify dev`, which reads netlify.toml (rung 3). Overturned if Phase 2's Docker webServer replaces it before this lands.

- **Hand repairs before the tool runs.** weiwei loses its trailing comma, and jaka7q gets a display name. The tool then fixes the shared and repeated ids.
  ASSUMPTION: jaka7q's display name becomes `jaka7q`, because jaka6q's display name equals its Username (rung 3). Overturned by the Operator choosing a name.
  ASSUMPTION: jaka6q's two identical cards both stay, each with its own id; only the ids are repaired (rung 4). Overturned if the Operator wants the duplicate card removed.

- **Which n8n export is fixed.**
  ASSUMPTION: only the active export in the workspace root is fixed. The three older exports inside the product repo are left as they are; after the move they are no longer deployed (rung 5). Overturned if the Operator imports from one of those.

## Testing Decisions

**The seam.** There is one: v1's HTTP surface as the dev server serves it. Because the dev server follows netlify.toml, what the tests see is what the deployed config produces.

- Visitor flows use Playwright's `page`.
- Status and JSON checks use Playwright's `request`.
- Tests assert only what a Visitor or a crawler receives: status codes, bodies, rendered names and where Reveal sends them. They never assert how files are laid out.

**New spec `tests/e2e/00-security-cleanup.spec.ts`:**
1. The secrets path answers 404, and the body contains no `onlyfans.com`.
2. None of these paths returns the file's own content: the three in-repo n8n exports, sdf, txt_replacement_dmca, README.md, optimize.py, netlify.toml, and the Reveal and Geo Rule lookup sources. Each response is compared with the file read from disk.
3. Every Profile file in the published Profile folder is listed from disk and fetched through the server. Each one comes back as JSON with a `profile` object and a `links` array.
4. Across all served Profiles, every Link Id matches `^\d{12}$`, and no two are the same.
5. No served Adult Link has a non-empty `url`.
6. Every Adult Link reveals, answering 200 with a `realUrl`. The one exception is asdfasdf's Adult Link: it had no Destination anywhere before this Phase (rung 1: it was missing from both secrets.json and its Profile file).
7. The old ids `juliafilippo_juliafilippo_juliafilippo_name1` and `1` get 404 from Reveal.
8. juliafilippo_'s Adult Link has a Geo Rule. Calling Reveal for it with `trackingId=geo` and the header `x-country: SI` returns a `realUrl` ending in `/c{geo.SI}`, where `geo.SI` is read from the served Profile.
9. A Visitor opening `/weiwei` sees the display name "Julia Filippo" and stays on `/weiwei`. The test saves a screenshot to `.scratch/goal_ai/shots/00-security-cleanup.png`.
10. A Visitor opening `/jaka7q` sees the display name `jaka7q`.

**Changed spec `tests/e2e/00-smoke.spec.ts`:** the Adult Link test takes the id from the served Profile. The rest of the spec is unchanged, and it doubles as the end-to-end check that the Age Gate, Reveal and the regenerated ids work together.

**What the HTTP seam cannot reach:**
- **The n8n export** has no runtime seam here, because running n8n locally needs an image pull (floor 2). Static `jq` checks in Acceptance cover it, and the Operator's form test covers the rest.
- **regenerate-link-ids** is checked through its output as served, plus the idempotency re-run in Acceptance.
- **secrets.json having no leftover keys** cannot be seen over HTTP, so a `jq` line in Acceptance checks it.

Prior art: `tests/e2e/00-smoke.spec.ts`, which uses `page.goto` on a Profile, stubs Reveal with `page.route`, uses `waitForRequest` on Reveal, and sets an Instagram User-Agent.

## Acceptance

```sh
# Run from the workspace root (/Users/jakabasej/oflinkv2).
# Only the site is published; functions and secrets stay outside public/
grep -Eq '^[[:space:]]*publish[[:space:]]*=[[:space:]]*"public"' linkme_clone3/netlify.toml
test ! -e linkme_clone3/public/netlify
test -f linkme_clone3/netlify/functions/secrets.json
# Every Profile file parses (jq exits non-zero on the first bad file)
jq -e -s 'all(.[]; (.profile|type=="object") and (.links|type=="array"))' linkme_clone3/public/api/profiles/*.json
# secrets.json holds no key that is not a current Link Id
jq -e -n --slurpfile s linkme_clone3/netlify/functions/secrets.json '[inputs.links[].id] as $ids | (($s[0]|keys) - $ids) == []' linkme_clone3/public/api/profiles/*.json
# Regeneration is idempotent: a second run changes nothing
snap() { cat linkme_clone3/public/api/profiles/*.json linkme_clone3/netlify/functions/secrets.json; ls linkme_clone3/public/images; }
before=$(snap | shasum)
node linkme_clone3/regenerate-link-ids.mjs
test "$before" = "$(snap | shasum)"
# n8n export: still the active workflow; Profile/image paths point into public/; the id is never built from the Username; no 1..1000 ids
jq -e '.active == true' n8n_oflink_Feb18.json
jq -e '[.nodes[] | select(.type=="n8n-nodes-base.github") | .parameters.filePath | select(test("^=(api|images)/"))] | length == 0' n8n_oflink_Feb18.json
! jq -r '.nodes[] | select(.name=="Edit Fields3") | .parameters.jsonOutput' n8n_oflink_Feb18.json | grep '"id"' | grep -q username
! jq -r '.nodes[] | select(.name=="idset") | .parameters.assignments.assignments[].value' n8n_oflink_Feb18.json | grep -Eq 'random\(\) \* 1000\)'
# Visitor-facing checks through the dev server that mirrors netlify.toml
npx playwright test tests/e2e/00-security-cleanup.spec.ts tests/e2e/00-smoke.spec.ts
# manual: in n8n (n8n.srv1395798.hstgr.cloud), deactivate "n8n ofl.ink Feb18" — no edits until it is re-imported
# manual: git -C linkme_clone3 pull --rebase && node linkme_clone3/regenerate-link-ids.mjs && ./check.sh   # takes in n8n edits made since this snapshot
# manual: GitHub → BlackPhoenixSlo/linkme_clone3 → Settings → Change visibility → Private; confirm the repo has no forks
# manual: purge netlify/functions/secrets.json from every commit with git filter-repo, put the current file back, commit, force-push (steps in Further Notes)
# manual: in n8n, import the fixed n8n_oflink_Feb18.json, re-attach the "GitHub account 2" credential, activate
# manual: for h in ofl.ink linkmeclone3.netlify.app; do curl -s -o /dev/null -w "$h %{http_code}\n" "https://$h/netlify/functions/secrets.json"; done   # expect 404 on both (the plan's DONE)
# manual: for f in linkme_clone3/public/api/profiles/*.json; do curl -fsS "https://ofl.ink/api/profiles/$(basename "$f")" | jq -e .profile >/dev/null || echo "FAIL $f"; done   # expect no FAIL
# manual: on a phone, open https://ofl.ink/juliafilippo_, tap the Adult Link, pass the Age Gate → the OnlyFans page opens
# manual: submit the n8n Form for jaka6q with no changes → its Link Ids and banners are unchanged; create a throwaway Profile from an uploaded copy of jaka6q's file → its Link Ids differ from jaka6q's
# manual: open an earlier deploy's permalink (Netlify → Deploys) + /netlify/functions/secrets.json; if it answers 200, retire those deploys
./check.sh
```

## Depends on

None. This is the first Phase, and it needs nothing from Phases 1–5.

## Out of Scope

- **Rate-limited Reveal and a same-origin CORS rule (D8).** They are not in Phase 0's list (plan §5), and v2's Reveal is built in Phase 2.
- **Hiding non-Adult Links' Destinations from Profile files.** v1's script goes straight to their `url`, and changing how a tap travels is Mode and redirect work (Phase 1 and Phase 2).
- **The Fixture Profile from plan §7.** It needs Modes, which arrive in Phase 1.
- **`netlify dev` as the Playwright webServer.** The dev server stand-in already exists, and installing netlify-cli is a network fetch (floor 2).
- **Purging Destinations from the git history of the Profile files** (the 7 Adult Links). The plan names only secrets.json, and the repo becomes private.
- **Deleting the in-repo n8n exports, sdf, txt_replacement_dmca, or banner images the new copies replace.** They stop being deployed or used. Deleting them is not needed, and it cannot be undone cheaply.
- **Other n8n flaws:** delete-then-create is not atomic, edits to the shared secrets.json overwrite each other, every edit costs about 5 commits plus a build, and banner names are built from an id's digits. The plan leaves n8n "untouched except the prefix bug", and D2 replaces GitHub-as-database in v2.
- **Profile files whose inner `username` differs from their file name** (weiwei, juliafilippo, cleocash, hannah). v1 routes by file name, so no Visitor sees the difference.
- **Reveal using its `user` parameter in a file path.** No leak was observed: a non-Profile file fails the Link lookup and yields no Tracking Code. v2's Reveal replaces this code.
- **The always-on Escape Overlay and Modes.** They belong to Phase 1.
- **Protection against ofl.ink being Flagged.** Spare Domains (D6) handle that, in Phase 5.

## Further Notes

**The plan's DONE is a live observation.** "ofl.ink/netlify/functions/secrets.json returns 404; all profiles parse" can only be seen on the live site, which floor 2 rules out for this run. The runnable stand-in is local: the dev server, which follows the new netlify.toml, answers 404 on that path, and every Profile parses through it. The live check is left as `# manual:` lines.

**Go-live runbook, for the Operator, in this order:**
1. Deactivate the n8n workflow.
2. Pull the latest data, re-run regenerate-link-ids and `./check.sh`.
3. Make the repo private.
4. Back up the current secrets.json outside the repo.
5. Run `git filter-repo --path netlify/functions/secrets.json --invert-paths`. git-filter-repo is a new tool: `brew install git-filter-repo`.
6. Restore the file, commit, re-add `origin`, and run `git push --force --all`.
7. Delete the backup.
8. Re-clone the repo everywhere else it is checked out.
9. Re-import and activate the fixed n8n export.
10. Run the live checks.

ASSUMPTION: n8n stays deactivated from before the pull until after the force-push. Any edit made in that window would land on history that the push overwrites (rung 4). Overturned if the Operator can guarantee no edits during the switch.

ASSUMPTION (evidence blocked): Netlify keeps earlier deploys reachable at their own permalinks, and those deploys still serve the old secrets.json. A fork of the public repo would also keep the old history, beyond the purge's reach. Neither can be checked offline, so both are `# manual:` checks. Overturned if an old deploy's permalink answers 404 and the repo has no forks.

**Broken Link Shortcuts.** Regenerating ids breaks every Link Shortcut already shared with an old id. The Profile still opens, but nothing is revealed. The tool's old-to-new id list is what the Operator uses to replace the shortcuts they shared (ADR 0004).
