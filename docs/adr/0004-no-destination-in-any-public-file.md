# No Destination in any public file; Reveal by script is obfuscation, not protection

In v1 the "secret links" hide nothing:

- `publish = "."` serves netlify/functions/secrets.json, which holds every Destination, to anyone.
- The GitHub repo is public and has that file in its history.
- 7 of 25 Adult Links also carry their Destination in public Profile JSON.
- Reveal answers any origin, without a rate limit, for Link Ids that can be guessed from the Username.

In v2 we keep Reveal by script only as obfuscation against casual crawling and draw the real line elsewhere. No Destination appears in any file v2 publishes or in this repo's git history. Link Ids are random, at least 10 characters, and unrelated to the Username. Reveal is rate-limited and answers only the page's own origin.

These rules govern v2 only. v1 is left as it is (ADR 0005), so its secrets.json and public git history stay exposed at least until Netlify is switched off after Cutover. v2 mints a fresh Link Id for every Link, so leaked v1 ids reveal nothing once ofl.ink points at v2.

A Destination that has been published cannot be recalled, and fresh Link Ids do not make it useless; they only stop anyone guessing their way to Destinations through v2's Reveal. Hiding Destinations does not stop ofl.ink from being Flagged; Spare Domains are the protection against that.

## Consequences

- Fresh v2 Link Ids break every Link Shortcut (`?link=` URL) shared with a v1 id, from Cutover on.
- The v1 Snapshot (`linkme_clone3/`) holds secrets.json and is untracked but not git-ignored in this repo (`git status --short` lists `?? linkme_clone3/`), so a blanket `git add` would put every v1 Destination into v2's history.
- "Own origin" means whichever host served the Profile: ofl.ink, a Spare Domain or a Custom Domain. Reveal therefore accepts same-origin calls only, rather than an allow-list that names ofl.ink.
  ASSUMPTION: D8's "CORS locked to own origin" is read as same-origin, because a fixed ofl.ink allow-list would break Reveal on Custom Domains and Spare Domains. Overturned if Profiles on other domains must call Reveal on ofl.ink across origins.
- In v2, a Destination must never be readable through PocketBase's public API (ADR 0002).
