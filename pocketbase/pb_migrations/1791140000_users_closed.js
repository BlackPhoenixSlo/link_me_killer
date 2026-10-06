/// <reference path="../pb_data/types.d.ts" />
// Phase 2 schema (docs/spec/phase-02-vps-foundation.md, Schema): PocketBase's built-in users collection,
// with every API rule superuser-only (null), sign-up included. Phase 3 opens sign-up and owner rules.
// Its built-in avatar field takes WebP only, up to 5 MB, like every other file field (story 32).
// manageRule stays null (superuser-only), set here so the closed state is explicit.
// ASSUMPTION: authRule keeps PocketBase's default "" rather than null. Observed on 0.40.4: with authRule null, a users record's
// auth-with-password answers 403; with "" it answers 200. With createRule null and no users record, nobody can sign in anyway
// (rung 4: Phase 3's log-in needs "", so ticket 25 inherits it instead of having to reopen it). Overturned if Phase 2 must also
// refuse sign-in for a users record the Operator creates by hand; set authRule to null here and ticket 25 sets it to "".
// ASSUMPTION: the built-in users.avatar counts as one of "the file fields" that take WebP only (rung 4: narrower is cheaper to relax). Overturned if Phase 3 wants raw photos there; its Editor converts uploads anyway.
migrate((app) => {
  const users = app.findCollectionByNameOrId("users");
  users.listRule = null;
  users.viewRule = null;
  users.createRule = null;
  users.updateRule = null;
  users.deleteRule = null;
  users.manageRule = null;
  // No guard: a users collection without its built-in avatar fails the migration.
  const avatar = users.fields.getByName("avatar");
  avatar.mimeTypes = ["image/webp"];
  avatar.maxSize = 5 * 1024 * 1024;
  app.save(users);
}, (app) => {
  // Back to PocketBase's own defaults for users.
  const users = app.findCollectionByNameOrId("users");
  users.listRule = "id = @request.auth.id";
  users.viewRule = "id = @request.auth.id";
  users.createRule = "";
  users.updateRule = "id = @request.auth.id";
  users.deleteRule = "id = @request.auth.id";
  users.manageRule = null;
  const avatar = users.fields.getByName("avatar");
  avatar.mimeTypes = ["image/jpeg", "image/png", "image/svg+xml", "image/gif", "image/webp"];
  avatar.maxSize = 0;
  app.save(users);
});
