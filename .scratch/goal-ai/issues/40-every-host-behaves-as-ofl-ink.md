# 40: On a Custom Domain or Spare Domain every Mode and Escape and Reveal works and counts as on ofl.ink

Spec: docs/spec/phase-05-cutover-and-domains.md
Covers: user stories 25, 26, 27, 28, 37, 45
Seams: the Playwright spec `05-domains` against the local stack at the existing baseURL through `./check.sh`, with `*.test` mapped to loopback in Chromium, the In-App Browser User-Agents set as Phase 0's smoke spec sets them, custom-scheme navigation captured as Phase 1's spec captures it, navigation to a Destination fulfilled with a harmless page, and Events read as a superuser through PocketBase's REST API
Blocked by: 39: Custom Domains and Spare Domains listed in PocketBase serve Profiles by host and pass the TLS Ask, 10: The escaped Link opens by itself in the System Browser credited to the same Tracking Code, 36: Only the owner reads a Profile's Stats and recording never blocks a Click or a deletion
Status: claimed 20261005T084628Z 2026-10-05T15:23:09Z

**What to build:** A Visitor who opens a Profile on a Custom Domain or a Spare Domain gets exactly what ofl.ink gives them, and the domain changes nothing but the address. Every URL the page builds for itself (Escape targets, anything that carries the Tracking Code, any address-bar clean-up) is rebuilt from the page's own origin plus the Profile path the app handed it, plus `/{code}`. So an Escape from `creator.test/{code}` lands on `creator.test/{code}`, and one from `spare.test/{username}/{code}` keeps `/{username}/{code}`. Reveal and the Page View ping go to the page's own host, Reveal answers that origin and refuses others, and the Page View and the Click are credited to the Profile the app resolved. Nothing the page loads or builds names ofl.ink or another of ofl.ink's hosts, so a Flagged ofl.ink does not take the other domains down with it. Reveal and `/r/{Link Id}` stay the same on every host and are not limited to the host's own Profile.

- [ ] With Tracking Codes 111 and 222, each on `creator.test/{code}`, `spare.test/{username}/{code}` and `localhost/{username}/{code}`: tapping the Adult Link shows the Age Gate, Continue sends Reveal to the page's own host, and it answers 200 with a Destination ending in `/c{code}` for that page's code.
- [ ] On the same three hosts, the Direct Mode Link and a Deeplink Mode Link (its Mode set in the REST set-up) each end at the same Destination.
- [ ] With an iOS Instagram User-Agent, `creator.test/` shows the Escape Overlay exactly when `localhost/{username}` does.
- [ ] Tapping the Escape Mode Link on `creator.test/{code}` fires an Escape whose target names `creator.test` and the path `/{code}`, with no Username segment and no other host; with an Android Instagram User-Agent the `intent://` target names `creator.test` the same way.
- [ ] On `spare.test/{username}/{code}` the Escape target keeps `/{username}/{code}`.
- [ ] Loading `creator.test/` adds one Page View Event, and the Adult Link's Reveal on `creator.test/{code}` adds one Click Event, both for the Fixture Profile.
- [ ] On `creator.test` and `spare.test`, no request goes to another of ofl.ink's hosts (`localhost:4173` or the other `.test` host), and no request URL names `ofl.ink`. Third-party hosts the page already loads are left alone.
- [ ] A `fetch` from a page on `creator.test` to Reveal on `spare.test:4173` cannot be read by the page.
- [ ] A failing assertion names the Link Id and never prints a Destination, and `./check.sh` passes.
