# Phase 00 — Security + data cleanup on the current Netlify site

**Objective.** v1 deploys only its site folder, so the secrets path answers 404. No Adult Link carries its Destination in a public file, and every Link still leads where it did. Every Profile file parses, and every Link has a random Link Id that the n8n Form keeps stable. Six non-Adult Links whose url is also an Adult Link's Destination keep that url, and the Operator gets a list of them. All of this is proven on the local dev server, and the GitHub, n8n and live-site steps go to the Operator as a runbook.

## Problem Statement

The Operator believes Reveal keeps Destinations hidden. It does not:

- v1 deploys its whole repo (`publish = "."`). `ofl.ink/netlify/functions/secrets.json` therefore gives anyone every Destination. The files next to it are public too: three n8n exports (Feb18.json, n8nFeb15.json, n8nWorkflow.json), sdf and txt_replacement_dmca. Locally the dev server answers 200 with the file for each of these paths today.
- The GitHub repo BlackPhoenixSlo/linkme_clone3 is public. secrets.json is in the history of both its branches: 56 commits on main and 1 on dev touch it.
- 7 of the 25 Adult Links in parseable Profiles also carry their Destination in their public Profile file.
- 2 of the 12 distinct Adult Destinations are also the public `url` of 6 non-Adult Links, in jaka5, jaka6q, jaka7q and motherfucker.
- A Link Id is the Username plus a few digits, so anyone can guess one and ask Reveal for its Destination.

Visitors and Creators also run into broken data that the n8n Form wrote:

- weiwei's Profile file has a trailing comma. A Visitor who opens `/weiwei` is bounced to the landing page.
- jaka7q's Profile shows template code (`$('Extract from Upload File')…`) as its name.
- juliafilippo_, jaka6q and jaka7q each have two Links that share one Link Id.
- juliafilippo_'s ids repeat the Username three times.
- juliafilippo and weiwei both use the ids `1` and `2`.
- Reveal looks Destinations up by id alone, so Links that share an id share one Destination. Today every pair that shares an id also shares its url, so no Visitor lands in the wrong place yet.
- secrets.json keeps every id that has been replaced: 10 of its 29 entries belong to no current Link, and they still reveal.
- Git tracks 30 Profile files and 55 images, but this Mac's checkout shows 27 and 53. Three Profile pairs (Jaka/jaka, JakaJaka/jakajaka, weiWEi/weiwei) and two image pairs (JakaJaka/jakajaka, weiWEi_alt1/weiwei_alt1) differ only in case. Each pair is byte-identical (`git ls-tree -r origin/main`; the blobs match).

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
- Adult Links no longer carry their Destination in the public file. Non-Adult Links whose url is an Adult Link's Destination keep it, and the Operator gets a list of them.
- Every Link leads to the same Destination as before.
- Old ids stop revealing.

**The tool.**
- A small tool does the id work.
- The Operator can re-run it on freshly pulled data at go-live. A run on clean data changes nothing.

**n8n.**
- The active n8n export is fixed: an edit keeps each Link's id, a new Link gets a random id, and the files are written into `public/`.

**What the Operator does.**
- The Operator gets a short runbook for the steps this run may not take: pause n8n, carry in n8n edits made since this run, make the repo private, push, purge secrets.json from the history of every branch, re-import n8n, and check ofl.ink live. The runbook also names the rollback that would re-open the leak.

## User Stories

1. As a Visitor, I want every Profile, image and Tracking Code address to look and work as before the move into `public/`, so that the bio links I follow still work.
2. As a Visitor opening ofl.ink/weiwei, I want to see the Profile instead of being sent to the landing page, so that the Creator's bio link works.
3. As a Visitor opening ofl.ink/jaka7q, I want a real display name in the header and the tab title instead of template code, so that the page looks trustworthy.
4. As a Visitor on a Profile where two cards shared a Link Id, I want each card to still lead where it did, now under its own Link Id, so that an edit to one card can no longer change where the other leads.
5. As a Visitor tapping an Adult Link, I want the Age Gate and then the same Destination as before, now looked up by its new Link Id, so that nothing changes for me.
6. As a Visitor arriving with a Tracking Code, or from a country covered by a Geo Rule, I want the OnlyFans Destination to carry the same `/c{code}` as before, so that the Creator's attribution holds.
7. As a Visitor holding an old Link Shortcut, I want the Profile to still open, so that I am not stranded, even though the shortcut no longer reveals.
8. As a Creator, I want my Profile, banners and attribution to come through Phase 0 unchanged, so that my traffic is not interrupted.
9. As the Operator, I want `ofl.ink/netlify/functions/secrets.json` to answer 404, so that no one can download every Destination.
10. As the Operator, I want every path under `/netlify/` to answer 404, so that neither the function sources nor the secrets can be fetched by any path.
11. As the Operator, I want the n8n exports, sdf, txt_replacement_dmca, README.md, optimize.py and netlify.toml to stop being served, so that the repo's internals stay private.
12. As the Operator, I want no published file to carry an Adult Link's Destination, except as the url of a non-Adult Link the tool lists, so that from an Adult Link's card the Age Gate and Reveal are the only way to reach it.
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
34. As the Operator, I want the tool to list every non-Adult Link whose url is also an Adult Link's Destination, so that I can decide whether to mark it Adult.
35. As the Operator, I want the tool to list every old Link Id that more than one Link shared, so that I can confirm each of those cards still leads where it should.
36. As the Operator, I want secrets.json purged from the history of both GitHub branches, main and dev, so that no branch keeps it.
37. As the Operator, I want n8n edits made between this run and the push carried into the new layout, so that no Profile is left outside `public/`.
38. As the Operator, I want to know that restoring a deploy from before Phase 0 publishes secrets.json again, so that a rollback never re-opens the leak.

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
      7. It prints each Link's old and new id, every Link with no Destination on record, every old id that more than one Link shared, and every non-Adult Link whose url is also an Adult Link's Destination. Each line names the Profile file and the Link's title, never a Destination.
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
    - It re-reads netlify.toml on every request, the way it already reloads function modules on every request (tests/dev-server.mjs:30-31). A server left running from before an edit then cannot serve a stale config to Playwright, which reuses a running server outside CI (playwright.config.ts:14).
    ASSUMPTION: re-reading per request follows the stand-in's own reload habit (rung 3). Overturned if reading netlify.toml slows the suite noticeably.
  - **Smoke spec**: the Adult Link test reads the Link Id from the served Profile instead of pinning `juliafilippo_juliafilippo_juliafilippo_name1`.

- **Schema.** No new fields. Existing data gets these constraints:
  ```
  Link.id       string, /^\d{12}$/, unique across every Profile file (a case twin counts as the same file)
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
  ASSUMPTION: only Adult Links lose their Destination from the Profile file. A non-Adult Link keeps its public `url`, because v1's script goes straight to it, and hiding it needs script work this Phase does not own (rung 5). ADR 0004 lists Phase 0's four steps, and hiding non-Adult Links is not among them (docs/adr/0004-no-destination-in-any-public-file.md:12-17). Overturned if ADR 0004's "no Destination in any public file" must cover non-Adult Links in v1 too.
  This keeps 2 of the 12 distinct Adult Destinations public. 6 non-Adult Links in jaka5, jaka6q, jaka7q and motherfucker carry them as their `url` (rung 1: Profile files compared with secrets.json in memory, nothing printed). The tool lists these Links and does not change them.
  ASSUMPTION: these 6 Links stay non-Adult. Marking them Adult would put an Age Gate in front of them, which changes what Visitors see (rung 4). Overturned if the Operator marks them Adult or removes them.

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

- **Two local commits, so the data can be redone at go-live.** The run leaves two commits in linkme_clone3 and pushes neither.
  - The *code* commit holds netlify.toml, geo_utils, optimize.py and the tool.
  - The *data* commit holds the move into `public/` (`mkdir public && git mv index.html landing.html script.js style.css example.webm images api public/`), the hand repairs and the tool's output.
  - n8n writes only `api/profiles/`, `images/` and secrets.json (rung 1: the 11 GitHub `filePath` values in n8n_oflink_Feb18.json). The code commit therefore rebases cleanly onto later n8n edits. The data commit would conflict, so it is redone instead (runbook step 2).
  ASSUMPTION: the data step is redone on fresh data, not rebased. A rebase would leave Profiles that n8n wrote after this run under the old `api/` path, which is no longer published. It would also conflict on secrets.json, which the tool rebuilds (rung 4). Overturned if no n8n edit lands between this run and the push; runbook step 2 then keeps both commits.

- **Case twins stay, and stay identical.** The three Profile twins and two image twins are kept. The run deletes nothing outside its effort directory, and n8n now writes only lower-case names (`Create a file` lower-cases the ID), so the capitalised copies are left over from older writes.
  - On this Mac each twin pair is one file on disk. The tool therefore sees 27 Profile files, and it rewrites the lower-case one.
  - The data commit must give each capitalised index entry the same new content as its lower-case twin. Otherwise `/Jaka`, `/JakaJaka` and `/weiWEi` would keep old ids and Adult Destinations on a case-sensitive host.
  - An Acceptance line checks this through git's index, where case is kept.
  ASSUMPTION (evidence blocked): Netlify serves `Jaka.json` and `jaka.json` as two files, as a case-sensitive server would. Nothing here can observe Netlify. Keeping the twins identical is right either way (rung 4). Overturned if the Operator would rather drop the capitalised copies.

- **Which n8n export is fixed.**
  ASSUMPTION: only the active export in the workspace root is fixed. The three older exports inside the product repo are left as they are; after the move they are no longer deployed (rung 5). Overturned if the Operator imports from one of those.

## Testing Decisions

**The seam.** There is one: v1's HTTP surface as the dev server serves it. The dev server follows netlify.toml's publish folder and redirects, so for those two settings what the tests see is what a deploy produces. It does not reproduce how Netlify packages functions. `included_files` and the deployed Geo Rule lookup are therefore covered by a static check and a live check in Acceptance.

- Visitor flows use Playwright's `page`.
- Status and JSON checks use Playwright's `request`.
- Tests assert only what a Visitor or a crawler receives: status codes, bodies, rendered names and where Reveal sends them. They never assert how files are laid out.

**Baseline.** Tests 3, 6 and 7 compare against BASE, which is `origin/main` of linkme_clone3: the upstream data this Phase starts from.
- Today BASE is 79b80d4 (rung 1: `git -C linkme_clone3 rev-parse HEAD origin/main` prints it twice). At go-live it is the data just fetched (runbook step 2).
- The tests read BASE with `git show`. They parse weiwei's file leniently by dropping its trailing comma, and they hold Destinations in memory only.
- A failure names the Profile file and the Link's position, never a Destination.
- Once the go-live push has replaced origin/main, BASE has no `api/profiles/`, and these tests skip themselves.
ASSUMPTION: the baseline is a git ref, not a saved copy, so no second copy of the Destinations is written to disk (rung 4). Overturned if the tests must keep comparing after go-live.

**New spec `tests/e2e/00-security-cleanup.spec.ts`:**
1. The secrets path answers 404, and the body contains no `onlyfans.com`.
2. None of these paths returns the file's own content: the three in-repo n8n exports, sdf, txt_replacement_dmca, README.md, optimize.py, netlify.toml, and the Reveal and Geo Rule lookup sources. Each response is compared with the file read from disk.
3. Every Profile file name at BASE, and every file in the published Profile folder, is fetched through the server. Each one comes back as JSON with a `profile` object and a `links` array. A Profile lost or stranded in the move therefore fails here.
4. Across all served Profiles, every Link Id matches `^\d{12}$`, and no two are the same.
5. No file a crawler can fetch carries an Adult Link's Destination. Every file under the published folder is listed from disk and fetched through the server. Its body is searched for each Adult Destination, which is read from secrets.json and held in memory. The `url` of non-Adult Links is skipped: those are the Links the tool lists. No served Adult Link has a non-empty `url`.
6. Every Link leads where it did at BASE, matched by Profile file and position.
   - An Adult Link's Reveal answers 200 with exactly its BASE Destination: the BASE secrets.json entry under its old id, or else its BASE `url`.
   - A non-Adult Link's served `url` equals its BASE `url`.
   - The one exception is asdfasdf's Adult Link, which gets 404. It had no Destination anywhere at BASE (rung 1: it was missing from both secrets.json and its Profile file).
7. Every Link Id in BASE's Profile files, and every key in BASE's secrets.json, gets 404 from Reveal, and none of them is a served Link Id. Today none of them has 12 digits (rung 1: 0 of 38 ids and 0 of 29 keys), so the first run must replace them all.
8. juliafilippo_'s Adult Link has a Geo Rule. Calling Reveal for it with `trackingId=geo` and the header `x-country: SI` returns a `realUrl` ending in `/c{geo.SI}`, where `geo.SI` is read from the served Profile.
9. A Visitor opening `/weiwei` sees the display name "Julia Filippo" and stays on `/weiwei`. The test saves a screenshot to `.scratch/goal_ai/shots/00-security-cleanup.png`.
10. A Visitor opening `/jaka7q` sees the display name `jaka7q`.
11. Every image path a served Profile references answers 200 with an `image/` content type: its `avatarUrl` and each Link's `backgroundImage`. The exceptions are the 6 avatars already missing before this Phase: bnjmklk, ja123, jaka, jaka5, jaka6q and jaka7q (rung 1: no such file under `images/` at 79b80d4).
12. A Visitor opening an old Link Shortcut, `/juliafilippo_?link=juliafilippo_juliafilippo_juliafilippo_name1`, sees the Profile and stays on it after Reveal answers 404.
13. A Visitor arrives at `/juliafilippo_/123`, taps the Adult Link and passes the Age Gate. Reveal is called with `trackingId=123`, and its real answer ends in `/c123` (rung 1: that Link has `tracking: true`). The answer is then replaced with `/landing.html`, as in the smoke spec.

**Changed spec `tests/e2e/00-smoke.spec.ts`:** the Adult Link test takes the id from the served Profile. The rest of the spec is unchanged, and it doubles as the end-to-end check that the Age Gate, Reveal and the regenerated ids work together.

**What the HTTP seam cannot reach:**
- **The n8n export** has no runtime seam here, because running n8n locally needs an image pull (floor 2). Static `jq` checks in Acceptance cover it, and the Operator's form test covers the rest.
- **regenerate-link-ids** is checked through its output as served and the idempotency re-run. It is also run on a disposable fixture in `.scratch/goal_ai/regen-fixture/` that holds no real data. Given a broken Profile file, it must exit non-zero, name the file and write nothing. Given a Link with no Destination, it must report that Link.
- **Function packaging** is not reproduced by the stand-in. A grep checks `included_files`, and a live Reveal call checks the deployed Geo Rule lookup.
- **Case.** The stand-in runs on this Mac's case-insensitive disk, and a case-sensitive host does not. Locally a case twin looks like one file, so the twin check runs on git's index in Acceptance.
- **secrets.json having no leftover keys** cannot be seen over HTTP, so a `jq` line in Acceptance checks it.

Prior art: `tests/e2e/00-smoke.spec.ts`, which uses `page.goto` on a Profile, stubs Reveal with `page.route`, uses `waitForRequest` on Reveal, and sets an Instagram User-Agent.

## Acceptance

```sh
# Run from the workspace root (/Users/jakabasej/oflinkv2). BASE = origin/main of linkme_clone3 (see Testing Decisions).
# Only the site is published; functions and secrets stay outside public/
grep -Eq '^[[:space:]]*publish[[:space:]]*=[[:space:]]*"public"' linkme_clone3/netlify.toml
test ! -e linkme_clone3/public/netlify
test -f linkme_clone3/netlify/functions/secrets.json
# The deployed Geo Rule lookup gets the Profile files in its bundle
grep -Fq '"public/api/profiles/*.json"' linkme_clone3/netlify.toml
# Nothing was lost or stranded in the move: every Profile and image at BASE is published, and nothing is left at the old paths
test ! -e linkme_clone3/api && test ! -e linkme_clone3/images
test -z "$(comm -23 <(git -C linkme_clone3 ls-tree -r --name-only origin/main -- api/profiles images | sed 's|^|public/|' | sort) <(git -C linkme_clone3 ls-files public/api/profiles public/images | sort))"
# Case twins (names that differ only in case) still hold identical bytes; this Mac's checkout shows only one of each
test -z "$(git -C linkme_clone3 ls-files -s public | awk '{print tolower($4), $2}' | sort -u | awk '{print $1}' | uniq -d)"
# Every Profile file parses (jq exits non-zero on the first bad file)
jq -e -s 'all(.[]; (.profile|type=="object") and (.links|type=="array"))' linkme_clone3/public/api/profiles/*.json
# secrets.json holds exactly the current Links that have a Destination: every Adult Link except asdfasdf's, and every non-Adult Link with a url
jq -e -n --slurpfile s linkme_clone3/netlify/functions/secrets.json '[inputs | (input_filename|endswith("/asdfasdf.json")) as $x | .links[] | select((.isAdult and ($x|not)) or ((.isAdult|not) and .url != "")) | .id] | sort == ($s[0]|keys)' linkme_clone3/public/api/profiles/*.json
# Regeneration is idempotent: a second run changes nothing, image bytes included
snap() { cat linkme_clone3/public/api/profiles/*.json linkme_clone3/netlify/functions/secrets.json; ls linkme_clone3/public/images; cat linkme_clone3/public/images/*; }
before=$(snap | shasum)
node linkme_clone3/regenerate-link-ids.mjs
test "$before" = "$(snap | shasum)"
# The tool on a disposable fixture with no real data: broken input stops it before any write; a Link with no Destination is reported
F=.scratch/goal_ai/regen-fixture; rm -rf "$F"; mkdir -p "$F/public/api/profiles" "$F/public/images" "$F/netlify/functions"
cp linkme_clone3/regenerate-link-ids.mjs "$F/"; echo '{}' > "$F/netlify/functions/secrets.json"
echo '{"profile":{"username":"a"},"links":[{"id":"a1","title":"NoDestination","url":"","isAdult":true}]}' > "$F/public/api/profiles/a.json"
echo '{"profile":{"username":"b"},"links":[{"id":"b1","title":"B","url":"https://example.invalid/b","isAdult":false},]}' > "$F/public/api/profiles/b.json"
h=$(cat "$F"/public/api/profiles/*.json "$F/netlify/functions/secrets.json" | shasum)
! node "$F/regenerate-link-ids.mjs" > "$F/out" 2>&1
grep -q 'b.json' "$F/out" && test "$h" = "$(cat "$F"/public/api/profiles/*.json "$F/netlify/functions/secrets.json" | shasum)"
sed -i '' 's/},]}/}]}/' "$F/public/api/profiles/b.json"
node "$F/regenerate-link-ids.mjs" > "$F/out" 2>&1 && grep -q 'NoDestination' "$F/out"
# n8n export: still active; exactly the seven Profile/image paths point into public/, the four secrets paths are unchanged, and the id nodes exist
jq -e '.active == true' n8n_oflink_Feb18.json
jq -e '[.nodes[] | select(.type=="n8n-nodes-base.github") | .parameters.filePath] | length == 11 and (map(select(test("^=public/(api/profiles|images)/"))) | length) == 7 and (map(select(. == "=netlify/functions/secrets.json")) | length) == 4' n8n_oflink_Feb18.json
jq -e '[.nodes[].name] | index("idset") != null and index("Edit Fields3") != null' n8n_oflink_Feb18.json
# ...and the id is never built from the Username, nor from 1..1000
! jq -r '.nodes[] | select(.name=="Edit Fields3") | .parameters.jsonOutput' n8n_oflink_Feb18.json | grep '"id"' | grep -q username
! jq -r '.nodes[] | select(.name=="idset") | .parameters.assignments.assignments[].value' n8n_oflink_Feb18.json | grep -Eq 'random\(\) \* 1000\)'
# Visitor-facing checks through the dev server that mirrors netlify.toml
npx playwright test tests/e2e/00-security-cleanup.spec.ts tests/e2e/00-smoke.spec.ts
# manual: work through the go-live runbook in Further Notes, steps 1-10, in order
# manual: gh repo view BlackPhoenixSlo/linkme_clone3 --json visibility -q .visibility   # expect PRIVATE; GitHub → Forks lists none
# manual: in a fresh clone of the pushed repo: git log --all --oneline -- netlify/functions/secrets.json   # expect one commit, the restore; git branch -a lists dev too
# manual: for h in ofl.ink linkmeclone3.netlify.app; do curl -s -o /dev/null -w "$h %{http_code}\n" "https://$h/netlify/functions/secrets.json"; done   # expect 404 on both (the plan's DONE)
# manual: for f in linkme_clone3/public/api/profiles/*.json; do curl -fsS "https://ofl.ink/api/profiles/$(basename "$f")" | jq -e .profile >/dev/null || echo "FAIL $f"; done   # expect no FAIL
# manual: curl -s "https://ofl.ink/.netlify/functions/reveal?user=juliafilippo_&trackingId=geo&id=$(jq -r '.links[] | select(.isAdult) | .id' linkme_clone3/public/api/profiles/juliafilippo_.json)" | jq -r .realUrl | grep -Eo '/c[0-9]+$'   # expect the Geo Rule's code for the country you are in (US's code if Netlify passes no x-country, Reveal's existing default)
# manual: on a phone, open https://ofl.ink/juliafilippo_, tap the Adult Link, pass the Age Gate → the OnlyFans page opens
# manual: submit the n8n Form for jaka6q with no changes → its Link Ids and banners are unchanged; submit it again with one Link added → that Link gets a fresh 12-digit id and the others keep theirs; create a throwaway Profile from an uploaded copy of jaka6q's file → its Link Ids differ from jaka6q's
# manual: open an earlier deploy's permalink, and any branch deploy of dev (Netlify → Deploys), + /netlify/functions/secrets.json; if it answers 200, retire those deploys
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
2. Carry in the n8n edits made since this run: `git -C linkme_clone3 fetch`.
   - If `git -C linkme_clone3 rev-list --count 79b80d4..origin/main` prints 0, keep both local commits.
   - Otherwise drop the data commit (`git -C linkme_clone3 reset --hard HEAD~1`) and rebase the code commit (`git -C linkme_clone3 rebase origin/main`). Then redo the data step on the fetched files and commit it: the move, any hand repair the tool or the tests still ask for, and the tool.
3. Run `./check.sh` and the Acceptance block.
4. Make the repo private.
5. Push both commits: `git -C linkme_clone3 push origin main`. From this deploy on, the secrets path answers 404.
6. Purge secrets.json from every branch, in a fresh clone outside the workspace.
   - Run `git clone https://github.com/BlackPhoenixSlo/linkme_clone3 lc3-purge`, and back up its secrets.json outside the clone.
   - Run `git -C lc3-purge filter-repo --sensitive-data-removal --path netlify/functions/secrets.json --invert-paths`.
   - Restore the file, commit, re-add `origin`, and run `git -C lc3-purge push --force --all`.
   - Follow the clean-up steps that filter-repo prints for the server's copy.
   - git-filter-repo is already installed on this Mac (`/opt/homebrew/bin/git-filter-repo`). It refuses to run outside a fresh clone. In a fresh clone it turns `origin/dev` into a local `dev` branch, so the forced push rewrites both main and dev (`git filter-repo --help`: the fresh-clone check and `--partial`).
7. Delete the backup and the purge clone.
8. Re-clone the repo everywhere else it is checked out, including `oflinkv2/linkme_clone3`. A stale clone that pulls and then pushes puts the old history back (`git filter-repo --help`, "Prevent repeats").
9. Re-import and activate the fixed n8n export.
10. Run the live checks.

**Rollback.** Never publish a deploy from before step 5 (Netlify → Deploys → Publish deploy): it serves secrets.json again. Undo a bad deploy by pushing a fix forward.

ASSUMPTION: n8n stays deactivated from before the fetch until after the force-push. Any edit made in that window would land on history that the push overwrites (rung 4). Overturned if the Operator can guarantee no edits during the switch.

ASSUMPTION (evidence blocked): Netlify keeps earlier deploys reachable at their own permalinks, and those deploys still serve the old secrets.json. A branch deploy of dev, if one is set up, would too. A fork of the public repo would also keep the old history, beyond the purge's reach. None of this can be checked offline, so all of it is a `# manual:` check. Overturned if an old deploy's permalink answers 404, no branch deploy exists, and the repo has no forks.

ASSUMPTION (evidence blocked): after the forced push, GitHub may keep the old commits reachable by their hashes until GitHub itself removes them. filter-repo's printed clean-up steps say what to ask for. With the repo private, only its collaborators could reach those commits. Overturned if an old commit's GitHub URL answers 404 after the push.

**Broken Link Shortcuts.** Regenerating ids breaks every Link Shortcut already shared with an old id. The Profile still opens, but nothing is revealed. The tool's old-to-new id list is what the Operator uses to replace the shortcuts they shared (ADR 0004).

**What regenerating ids does not do.** It retires the old ids, not the Destinations. A Destination that leaked through secrets.json, the git history or a Profile file is still the same OnlyFans address afterwards, and only a new address from the Creator would retire it. ADR 0004 used to say that regenerating ids makes a published Destination useless. The plan review corrected it: new ids only stop anyone guessing their way to Destinations through Reveal (docs/adr/0004-no-destination-in-any-public-file.md:19). This spec never relied on the old wording.

## Review

codex, 2026-10-02.
- **How it ran.** Two calls (`codex exec --sandbox read-only`, reasoning effort high) on a sparse worktree holding goal_ai.txt, CONTEXT.md, docs/adr/, tests/, check.sh, playwright.config.ts and package.json. Both exited 0 within the 900 s bound (178 s and 202 s), and each wrote a fresh, non-empty output.
- **How blind the first call was.** The worktree's HEAD (86af25f) contains docs/spec/, so the first call was blind by instruction, not by construction. Its command log shows no git reads, and no access to docs/spec/, linkme_clone3/ or anything outside the workspace.
- **How claims were checked.** Claims about linkme_clone3 were checked here against the real repo, read-only, with no Destination printed.

B = blind call (before the spec), D = draft call (with the spec).

- B1 **reject**. Alternative: build `public/` from a list of inputs and keep n8n's paths. The plan says "Move site into public/" (goal_ai.txt:65). The spec's n8n-paths ASSUMPTION already weighs a build step against the prefix.
- B2 **reject**. Alternative: block only the secrets URL. The spec does not take this route. It publishes only `public/` and answers 404 for all of `/netlify/*`.
- B3 **partial**. Alternative: rewrite history, or move to a clean private repo; the reviewer also found no evidence step for either.
  - The rewrite stays, because the plan says "purge secrets.json from git history" (goal_ai.txt:66).
  - Accepted, with what observation showed. origin/dev also carries secrets.json (`git log origin/dev -- netlify/functions/secrets.json`: 1 commit). filter-repo also refuses to run outside a fresh clone (`git filter-repo --help`).
  - Runbook step 6 now purges in a fresh clone, which rewrites main and dev together. New `# manual:` lines check that the repo is private and that a fresh clone has exactly one secrets.json commit.
- B4 **reject**. Alternative: pause edits, or make the writer safe. The spec pauses n8n (runbook step 1), and the plan allows no n8n change beyond the prefix bug (goal_ai.txt:126).
- B5 **reject**. Alternative: rescue on the VPS first. That reopens ADR 0001, under which v1 stays live until parity (docs/adr/0001-v2-on-own-vps-beside-live-v1.md:3).
- B6 **partial**. Exposure must be covered across every published file, and in history wherever a Destination appears.
  - Accepted for files. Observation: 2 of the 12 distinct Adult Destinations are also the public url of 6 non-Adult Links (jaka5, jaka6q, jaka7q, motherfucker). The old Objective and test 5 would have passed with those still public.
  - The Objective, story 12 and test 5 are rewritten; test 5 now crawls every published file. The tool lists these Links (story 34, and the ASSUMPTION under "Which Destinations leave the public files").
  - Rejected for history. The plan and ADR 0004 name only secrets.json (docs/adr/0004-no-destination-in-any-public-file.md:16), and the repo goes private.
- B7 **reject**. Reveal should be rate-limited and same-origin in Phase 0.
  - ADR 0004 lists Phase 0's four steps without either (docs/adr/0004-no-destination-in-any-public-file.md:12-17). That list matches plan §5 (goal_ai.txt:124-126).
  - With about 37 live 12-digit ids in 10^12, one guess hits with a probability of about 4·10^-11.
  - CORS does not bind a crawler that is not a browser.
- B8 **partial**. Data must be correct beyond parsing: duplicates and the inventory.
  - Unique ids and display names were already tested. The Destination mapping is answered under D2.
  - Duplicates: every shared-id pair has identical urls (observed), so story 4 is restated and the tool lists shared ids (story 35).
  - Accepted for the inventory. Git tracks 30 Profile files and 55 images, while this Mac shows 27 and 53, because of byte-identical case twins (`git ls-tree -r origin/main`). Added: the "Case twins" decision, the baseline inventory line and the twin line in Acceptance.
- B9 **partial**. Rotation semantics and attribution. The coordinated rewrite, the collision rule and the broken Link Shortcuts were already specced. Accepted for attribution: a Tracking Code arriving in the path was untested, so test 13 is added.
- B10 **partial**. The next n8n submission must keep the repairs. Answered with D4: stronger static checks, plus a new-Link case in the manual form test. n8n cannot run here, because that needs an image pull (floor 2).
- B11 **accept**. Release order, rollback and evidence.
  - Runbook step 2 now redoes the data step on the fetched n8n edits instead of running `pull --rebase`. A rebase would leave new Profiles under the old `api/` path, which is no longer published, and it would conflict on secrets.json.
  - This needs the new "Two local commits" decision.
  - A Rollback note says that a deploy from before Phase 0 serves secrets.json again.
- B12 **reject**. The stand-in hard-codes its root folder. The spec already makes it read netlify.toml (Interfaces → Dev server stand-in).
- B13 **reject**. The catch-all answers 200, not 404. This was already decided under "Why the 404 needs its own rule".
- B14 **accept**. The stand-in does not prove how Netlify packages functions. See D6.
- B15 **partial**. The smoke test stubs Reveal and pins an id. The pinned id was already removed. Checking the Destination is accepted through D2's baseline test 6.
- B16 **partial**. `reuseExistingServer` may run the tests against a stale server (playwright.config.ts:14). A stale server from before this Phase answers 200 on the secrets path (tests/dev-server.mjs:52-59), so it would fail test 1, not pass it. Even so, the stand-in now re-reads netlify.toml on every request, so a running server cannot hold a stale config.
- B17 **reject**. Live evidence of no exposure would overturn the premise. The premise is observed locally on the same config (`publish = "."`, linkme_clone3/netlify.toml:2). The live checks are `# manual:` lines (floor 2).
- B18 **accept**. A leaked Destination still works after the ids rotate. A Further Notes paragraph now says that rotation retires ids, not Destinations, and that ADR 0004:19 claims more than ids can deliver. The ADR is not edited here.
- B19 **partial**. The plan's DONE could pass while a Profile still publishes a Destination. The Acceptance already went beyond the DONE, but this case was real (see B6). The crawl in test 5 now catches it.
- B20 **partial**. A later n8n edit could undo the cleanup. The manual form test now covers an unchanged edit, a new Link and an upload. Overlapping edits stay out of scope (goal_ai.txt:126; ADR 0002 replaces GitHub-as-database).
- B21 **reject**. ofl.ink could be Flagged anyway. This is already Out of Scope: Spare Domains handle it in Phase 5 (docs/adr/0004-no-destination-in-any-public-file.md:19).
- D1 **partial**. The exclusions contradict ADR 0004.
  - ADR 0004 itself limits Phase 0 to four steps (docs/adr/0004-no-destination-in-any-public-file.md:12-17), the same list as the plan (goal_ai.txt:124-126). Rate limiting, CORS and Profile-file history therefore stay excluded (see B7 and B6).
  - Accepted where the conflict had a real effect: non-Adult Links did keep 2 Adult Destinations public. The Objective is narrowed to what holds, and the 6 Links are listed for the Operator under a flagged ASSUMPTION.
- D2 **accept**. Acceptance could pass with the wrong Destinations.
  - Test 6 now compares every Link with BASE (`origin/main`, 79b80d4), matched by Profile file and position. An Adult Link must get exactly its old Destination from Reveal, and a non-Adult Link must serve its old url.
  - Colliding old ids: all 5 shared-id pairs have identical urls (observed), so no Destination needs reconstructing. The tool now lists shared ids (story 35).
- D3 **accept**. Coverage was taken from the folder after the move.
  - Test 3 now fetches every BASE Profile.
  - Acceptance checks that every BASE Profile and image is in `public/` and that nothing is left at `api/` or `images/`.
  - Added test 11: images load, except the 6 avatars already missing at 79b80d4.
  - Added test 12: an old Link Shortcut keeps the Profile open. script.js ignores a Reveal 404 for `?link=`.
  - Added test 13: a Tracking Code in the path reaches Reveal and ends the Destination as `/c{code}`.
- D4 **partial**. The n8n checks pass on an empty workflow.
  - Accepted: they now require 11 GitHub paths, exactly 7 of them under `=public/` and 4 on the secrets path, plus the `idset` and `Edit Fields3` nodes. Checked here: they fail on today's export and on `{"nodes":[]}`.
  - Running the id expression for each case is not possible here (floor 2). Instead, the manual form test gains a new-Link case.
- D5 **accept**. The tool's own seam was untested. Acceptance adds a disposable fixture in `.scratch/goal_ai/regen-fixture/` with no real data. Broken input must exit non-zero, name the file and write nothing, and a Link with no Destination must be reported. `snap()` now hashes image bytes.
- D6 **accept**. The stand-in does not prove how Netlify packages functions. The seam paragraph no longer claims it does. Acceptance adds a grep for `included_files` and a live Reveal call with `trackingId=geo`.
- D7 **accept**. The secrets check proved only that no key was extra. It is now an equality: the keys must be every Adult Link except asdfasdf's, plus every non-Adult Link with a url. Checked here on synthetic input: missing entries fail it, and exact entries pass.
- D8 **accept**. A kept 12-digit id may not be random, and only two old ids were tested.
  - Test 7 now checks every Link Id and secrets key at BASE: each must get 404, and none may be served.
  - Observed: 0 of 38 ids and 0 of 29 keys have 12 digits today. The first run must therefore replace every id, or test 7 fails.
  - The keep rule is still needed so that a rerun changes nothing.
- D9 **reject**. "Depends on: None" holds, and the reviewer found no missing dependency. The ADR boundary it calls a prerequisite is settled under D1.

needs-human: none. Every material objection was answered by observation, by the plan, or by ADR 0004's own Phase 0 list. The open choices are decided and flagged as ASSUMPTION in their sections.

### Six hats

Six thinking hats on the whole Phase set, 2026-10-02, reconciled in the plan review. Labels follow docs/spec/plan-review.md (W white, R red, K black, Y yellow, G green, U blue). "Owner" is the one Phase that holds the decision.

- **K2** (this spec's test 1 expects 404 on the secrets path, but v2's catch-all answers 200) **accept**, owner Phase 2. Phase 2 now answers `/netlify/*` with 404 and landing.html, copying this Phase's rule, so test 1 passes on v2. No change here.
- **K3** (the Fixture Profile's Adult Link has no Destination anywhere the import reads, because this spec forbids extra keys in secrets.json) **accept**, owner Phase 2. Its Destination goes into a test-only `tests/fixtures/secrets.json`, which the seed imports with a second `--secrets`. The secrets.json equality in this spec's Acceptance stays as written.
- **K7** (case twins: a Linux checkout refuses the import, and a copy from the Mac drops `/Jaka`, `/JakaJaka` and `/weiWEi`) **accept**, owner Phase 2. Phase 2's import skips a capitalised twin whose bytes equal its lower-case file, and the app matches Usernames lower-cased. Both rest on this spec's "Case twins stay, and stay identical". No change here.
- **U3** (ADR 0004:19 claims new Link Ids make a leaked Destination useless) **accept**. ADR 0004 is corrected in place, and the "What regenerating ids does not do" paragraph now says so.
