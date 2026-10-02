# 58: On a Custom Domain every tap behaves as on ofl.ink: Reveal keeps the page's Tracking Code, the Escape stays on the domain, and other origins are refused

Spec: docs/spec/phase-05-cutover-and-domains.md
Covers: user stories 14, 16, 25, 26
Seams: the spec's one seam, through `page`. The test:
- watches Reveal;
- intercepts navigation to a Destination and fulfils it with a harmless page, as the smoke spec does;
- overrides the User-Agent with `test.use`;
- captures custom-scheme navigation as Phase 1's spec does.

Expected Destinations come from Phase 2's v1 oracle. A failing assertion names the Link Id and never prints a Destination.
Blocked by: 57: The Operator gives a Profile a Custom Domain in PocketBase… (`creator.test` and its grammar); 20: A Click on v2 ends at the same Destination as on v1… (Reveal, `/r`, Tracking Codes and Geo Rules on v2, the v1 oracle, and the seed's test-only secrets file that gives the Fixture Profile's Adult Link its Destination); 21: Reveal answers only its own origin, and Reveal and `/r` slow down a harvester (the same-origin refusal); 28: Phase 1's spec passes against v2 on the seeded Fixture Profile (the Modes, the Age Gate and the Escape on v2)
Status: ready-for-agent

**What to build:** A Visitor on a Custom Domain gets everything a Visitor on ofl.ink gets: the Age Gate, Reveal, the redirect, the Escape and the Escape Overlay. The domain changes nothing but the address.

- Reveal and `/r` answer the same way on every host, and are not limited to the host's own Profile.
- Reveal answers the page's own origin on a Custom Domain too. ADR 0004 reads "own origin" as same-origin, so a page on another origin cannot read Reveal's answer.
- The Escape target on a Custom Domain is the domain itself plus `/{code}`, with no Username segment, on iOS and on Android.
- Attribution follows the page: the Tracking Code the Visitor arrived with on this host is the one that reaches OnlyFans.

Where any of this fails, the fix belongs in v2's page or in the app. This ticket adds no route.

- [ ] Spec behaviour 3 on `creator.test/{code}` and on `localhost/{username}/{code}`, each with two different Tracking Codes, A and B:
  - the Adult Link's Reveal request goes to the page's own host and carries that page's code. It answers 200 with the Destination the v1 oracle gives for that Link and code;
  - the Direct Mode Link ends at the oracle's Destination.
- [ ] Spec behaviour 5, Custom Domain half:
  - with an iOS Instagram User-Agent, tapping the Escape Mode Link on `creator.test/{code}` navigates to an `x-safari-https://` address whose host is `creator.test` and whose path is `/{code}`;
  - with an Android Instagram User-Agent, the `intent://` address names `creator.test` the same way.
- [ ] Spec behaviour 8: a `fetch` from a page on `creator.test` to Reveal on `spare.test:4173` cannot be read by the page. `spare.test` is still an unlisted host here; ticket 61 lists it, and the check holds either way.
- [ ] Playwright: extends `tests/e2e/05-domains.spec.ts` (spec behaviour 3 on the Custom Domain and on ofl.ink's own host, the Custom Domain half of 5, and 8). `./check.sh` passes.
