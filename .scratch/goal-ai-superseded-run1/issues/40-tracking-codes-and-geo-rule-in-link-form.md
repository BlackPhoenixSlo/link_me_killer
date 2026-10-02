# 40: The Link form keeps OnlyFans tracking and takes a Geo Rule as raw JSON, and the plan's DONE journey runs end to end

Spec: docs/spec/phase-03-auth-and-editor.md
Covers: user stories 34, 35, 36
Seams: Creator journeys in Playwright's browser at a phone-sized viewport. The Visitor side in a fresh browser context, with an injected Visitor country and Reveal's real answer observed. The superuser invites and verifies at PocketBase's loopback port.
Blocked by: 37: A Link's Mode and 18+ toggle…; 38: Avatars, Link backgrounds and stock icons go in as any common image…; 39: The Editor changes the display name, bio, avatar and default Mode… (the finished Editor in the screenshot); 20: A Click on v2 ends at the same Destination as on v1… (Reveal applies Tracking Codes and Geo Rules on v2 as v1 does)
Status: ready-for-agent

**What to build:** The last fields of the Link form, then the spec's tracer bullet as one journey.

- **OnlyFans tracking.** A toggle and a default Tracking Code, as the n8n Form offers today, so that OnlyFans keeps crediting subscribers to their traffic sources on Links made in the Editor.
- **Geo Rule.** A textarea prefilled with the Link's current Geo Rule as JSON. It must parse as a JSON object, or be empty for "no Geo Rule". Anything else blocks the save with a message and leaves the Link unchanged. There is no deeper check.
- **The plan's DONE** ("new user signs up, adds a link with image, page live") runs as spec behaviour 2, in one journey. The Operator invites; the Creator signs up and claims a Username; the superuser verifies them. Onboarding then takes a display name and PNG avatar, and a first Link with a title, Destination, stock icon, PNG background, Adult on, Escape Mode, OnlyFans tracking on and a Geo Rule. It ends on the live-address screen, and every Visitor check follows.

- [ ] Spec behaviour 5. Invalid Geo Rule JSON shows an error and leaves the Link unchanged. Valid JSON saves. Emptying the textarea removes the Geo Rule.
- [ ] Turning tracking on with a default Tracking Code shows both in the Link's entry in the page payload at the next load, as for an imported Link.
- [ ] On `/{username}/geo`, with an injected Visitor country that the Geo Rule names, the revealed Destination carries that country's Tracking Code.
- [ ] Spec behaviour 2 passes as one journey, every Visitor check included.
- [ ] A screenshot of the finished Editor exists, is not empty, and sits at the path the spec's Acceptance checks.
- [ ] Playwright: extends `tests/e2e/03-auth-and-editor.spec.ts`. `./check.sh` passes.
