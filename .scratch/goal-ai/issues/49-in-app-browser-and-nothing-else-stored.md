# 49: Each Event names the In-App Browser it came from, and stores nothing that identifies the Visitor

Spec: docs/spec/phase-04-stats.md
Covers: user stories 8, 11
Seams: Visitors as fresh browser contexts with fake User-Agents, each waiting for the ping's 204. The Operator's reads go to PocketBase's REST API on its loopback port, with the superuser credentials from the test env file. They read the newest Event and the events collection's fields.
Blocked by: 45: A Profile load counts as one Page View… (the Event Recorder and the ping); 18: Every PocketBase collection comes from versioned migrations… (the events collection's fields)
Status: ready-for-agent

**What to build:** The Operator can judge from the PocketBase admin UI how much traffic arrives in an In-App Browser and whether Escapes work. The Visitor is counted, not followed.

- The Event Recorder classifies the In-App Browser from the User-Agent with plan section 4's patterns. The first match wins:
  - `Threads` → threads;
  - `Instagram` → instagram;
  - `FBAN|FBAV` → facebook;
  - `musical_ly|Bytedance|TikTok` → tiktok;
  - anything else → empty.
- Page Views and Clicks are classified alike. A load after an Escape comes from the System Browser, so it records an empty In-App Browser.
- An Event holds only its kind, Profile, Link, country, In-App Browser and time. No IP address, User-Agent string, referrer or Visitor identifier is stored.
- The Stats page shows no In-App Browser breakdown (the spec's Out of Scope).

- [ ] Spec test 6. A Visitor loads the Stats Profile once with each of five User-Agents: Instagram, Facebook (`FBAN`), Threads, TikTok and desktop Chrome. Read with the Operator's credentials, the newest Event for that Profile has `inAppBrowser` instagram, facebook, threads, tiktok and empty, respectively.
- [ ] Read the same way, the events collection's fields are exactly `id`, `kind`, `profile`, `link`, `country`, `inAppBrowser` and `created`.
- [ ] Playwright: extends `tests/e2e/04-stats.spec.ts` (test 6). `./check.sh` passes.
