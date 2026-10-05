/// <reference path="../pb_data/types.d.ts" />
// Phase 3, ticket 26 (docs/spec/phase-03-auth-and-editor.md, Schema): the rest of the auth-and-ownership migration, the content
// rules. A signed-in owner with a verified email updates their Profile and adds, edits and deletes its Links; only the owner of
// a Link's Profile reads the Link, so a Destination stays with its owner and the Operator (ADR 0004). Every owner comparison
// starts with `@request.auth.id != ""`, so an anonymous caller never matches an ownerless imported Profile or its Links.
// Superusers bypass every rule, so the v1 Import and the admin UI keep writing as before.
// The file fields (profiles.avatar, links.icon, links.backgroundImage) already take `image/webp` only since Phase 2
// (1791140001_profiles.js, 1791140002_links.js; asserted in 02-v1-import's schema test), so this migration leaves them alone.
// ASSUMPTION: the Destination check is three LIKE prefixes (`~ "https://%"`, `"http://%"`, `"/%"`), because PocketBase rules have
// no regular expression; LIKE ignores ASCII case, and links.destination's own pattern (1791140002_links.js) still refuses
// anything but lowercase `http(s)://<host>` or `/<path>`, `//host` included (rung 5). Overturned if PocketBase's rules gain a
// prefix operator.
// "The request sets none of …" is one `@request.body.<field>:isset = false` clause per named field, as in
// 1791140004_sign_up_and_claim.js. Field modifiers do not slip past it: on 0.40.4 a verified owner's `owner+`/`owner-` on
// profiles and `profile+`/`linkId:autogenerate` on links are refused, and a links create sending `linkId:autogenerate` too
// (observed on the test stack for ticket 26, 2026-10-05).
// ASSUMPTION: no Creator write sets v1Key on a Profile or Link, though the spec's Schema names only Username, owner and badge,
// and the record id and Link Id: the v1 Import reads v1Key as "came from v1" (app/bin/import-v1 matches Links by it and names a
// Profile or Link with one, missing from its input, on a `stale in v2:` line; records born in v2 have none) (rung 4: closed is
// cheaper to undo than a forged v1 record). Overturned if a Creator must ever write v1Key.
migrate((app) => {
  // Kept inside the callback: migration files may share one JS runtime.
  const SIGNED_IN = '@request.auth.id != ""';
  const VERIFIED = "@request.auth.verified = true";
  const unset = (...names) => names.map((name) => `@request.body.${name}:isset = false`);
  const destinationOk = '(@request.body.destination ~ "https://%" || @request.body.destination ~ "http://%" || @request.body.destination ~ "/%")';
  const and = (...clauses) => clauses.join(" && ");

  const profiles = app.findCollectionByNameOrId("profiles");
  profiles.updateRule = and(SIGNED_IN, "owner = @request.auth.id", VERIFIED, ...unset("username", "owner", "verified", "v1Key"));
  app.save(profiles);

  const links = app.findCollectionByNameOrId("links");
  const OWNER = "profile.owner = @request.auth.id";
  links.listRule = and(SIGNED_IN, OWNER);
  links.viewRule = and(SIGNED_IN, OWNER);
  links.createRule = and(SIGNED_IN, "@request.body.profile.owner = @request.auth.id", VERIFIED, ...unset("id", "linkId", "v1Key"), destinationOk);
  links.updateRule = and(SIGNED_IN, OWNER, VERIFIED, ...unset("profile", "linkId", "v1Key"), `(@request.body.destination:isset = false || ${destinationOk})`);
  links.deleteRule = and(SIGNED_IN, OWNER, VERIFIED);
  app.save(links);
}, (app) => {
  // Back to ticket 25's state: profiles update and every links rule superuser-only (1791140002_links.js, 1791140004).
  const profiles = app.findCollectionByNameOrId("profiles");
  profiles.updateRule = null;
  app.save(profiles);
  const links = app.findCollectionByNameOrId("links");
  links.listRule = null;
  links.viewRule = null;
  links.createRule = null;
  links.updateRule = null;
  links.deleteRule = null;
  app.save(links);
});
