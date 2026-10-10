/// <reference path="../pb_data/types.d.ts" />
// A Creator may delete their own Profile from the Editor (the Operator, 2026-10-07): `profiles.deleteRule` opens to the owner,
// the same shape the list, view and customDomains rules use (`@request.auth.id != "" && owner = @request.auth.id`). An
// ownerless imported Profile (owner = '') never matches a signed-in caller, and no one deletes another account's Profile.
// The Profile's Links and Events (1791140002, 1791140003) and its Custom Domain (1791140012) all relate to it with
// cascadeDelete, so deleting the Profile takes them with it; nothing is left orphaned. Superusers still bypass the rule.
// ASSUMPTION: delete is the owner alone, with no verified-email gate, because create already needs a verified email for any
// Profile past slot 1 and slot 1 is the account's own (rung 4). Overturned if deleting a Profile must also be gated on verified.
migrate((app) => {
  const profiles = app.findCollectionByNameOrId("profiles");
  profiles.deleteRule = '@request.auth.id != "" && owner = @request.auth.id';
  app.save(profiles);
}, (app) => {
  const profiles = app.findCollectionByNameOrId("profiles");
  profiles.deleteRule = null;
  app.save(profiles);
});
