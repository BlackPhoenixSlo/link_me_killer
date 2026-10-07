/// <reference path="../pb_data/types.d.ts" />
// The per-account Profile cap goes from N = 3 to N = 10 (the Operator, 2026-10-07). Only the global ceiling moves: the create
// rule's `slot > 0` and the (owner, slot) unique index already hold, and no row loses its slot. The Editor's MAX_PROFILES
// matches (app/editor/app.js). 1791140011_several_profiles.js stays as it is: it is applied on the live database.
// ASSUMPTION: still one global cap held by the field's max (1791140011's rung 6), now 10. A per-account cap would instead be
// `users.maxProfiles` with `@request.body.slot <= @request.auth.maxProfiles` in the create rule.
migrate((app) => {
  const profiles = app.findCollectionByNameOrId("profiles");
  profiles.fields.getByName("slot").max = 10;
  app.save(profiles);
}, (app) => {
  // Back to 3. Accounts that claimed slots 4 to 10 keep those rows; the field's max only bars new claims above it.
  const profiles = app.findCollectionByNameOrId("profiles");
  profiles.fields.getByName("slot").max = 3;
  app.save(profiles);
});
