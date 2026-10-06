/// <reference path="../pb_data/types.d.ts" />
// Phase 3, ticket 25 (docs/spec/phase-03-auth-and-editor.md, Schema): this ticket's part of the auth-and-ownership migration.
// It opens sign-up, log-in and the Username claim, and nothing else: profiles update and links stay superuser-only (tickets
// 26 and 27 open them). Every owner comparison starts with `@request.auth.id != ""`, so an anonymous caller never matches an
// ownerless imported Profile. Superusers bypass every rule, so the v1 Import and the admin UI keep writing as before; they are
// bound only by the Username field's length and pattern.
// ASSUMPTION: "the request sets nothing but …" is one `@request.body.<field>:isset = false` clause per other field of the
// collection, read from the collection when the migration runs (rung 5: no hand-kept list to drift from the schema).
// Overturned if a later field must be settable on create; that migration rewrites the rule.
// ASSUMPTION: the Username field gets min 3 and max 30 beside the pattern, so PocketBase itself names the reason (too short,
// too long, or a character outside the pattern) for the Editor to show (rung 5). Overturned if one combined reason is enough.
migrate((app) => {
  // Kept inside the callback: migration files may share one JS runtime.
  // The reserved Usernames: the spec's five, plus every top-level path segment of 3 or more characters that the app routes.
  // `node app/bin/reserved-usernames` prints that list, read from app/server.js and app/public/;
  // tests/e2e/03-auth-and-editor.spec.ts claims every name on it over HTTP, so a routed name with no clause here fails there.
  // ASSUMPTION: "read from the app's routes at build time" is that HTTP check in the test loop against the literal list below,
  // not a list generated during `docker compose build` (rung 5: PocketBase's image has no Node and its build context holds no
  // app code; a migration's rule is a literal once applied anyway). Overturned if the list must be written by the build; the
  // script then becomes a generator.
  const RESERVED = ["api", "edit", "images", "internal", "netlify"];
  const SIGNED_IN = '@request.auth.id != ""';
  const onlySets = (collection, allowed) =>
    collection.fields
      .map((f) => f.name)
      .filter((name) => !allowed.includes(name))
      .map((name) => `@request.body.${name}:isset = false`);

  const users = app.findCollectionByNameOrId("users");
  users.createRule = onlySets(users, ["email", "password"]).join(" && ");
  users.authRule = ""; // any account, verified or not
  users.listRule = `${SIGNED_IN} && id = @request.auth.id`;
  users.viewRule = `${SIGNED_IN} && id = @request.auth.id`;
  users.updateRule = null;
  users.deleteRule = null;
  users.manageRule = null;
  app.save(users);

  const profiles = app.findCollectionByNameOrId("profiles");
  const username = profiles.fields.getByName("username");
  username.pattern = "^[a-z0-9_]{3,30}$";
  username.min = 3;
  username.max = 30;
  profiles.listRule = `${SIGNED_IN} && owner = @request.auth.id`;
  profiles.viewRule = `${SIGNED_IN} && owner = @request.auth.id`;
  profiles.createRule = [
    SIGNED_IN,
    "@request.body.owner = @request.auth.id",
    ...onlySets(profiles, ["username", "owner", "mode"]),
    ...RESERVED.map((name) => `@request.body.username != "${name}"`),
  ].join(" && ");
  profiles.updateRule = null;
  profiles.deleteRule = null;
  // One Profile per Creator; the ownerless imported Profiles stay valid.
  profiles.addIndex("idx_profiles_owner", true, "owner", "owner != ''");
  app.save(profiles);
}, (app) => {
  // Back to Phase 2's closed state (1791140000_users_closed.js, 1791140001_profiles.js).
  const users = app.findCollectionByNameOrId("users");
  users.createRule = null;
  users.authRule = "";
  users.listRule = null;
  users.viewRule = null;
  app.save(users);
  const profiles = app.findCollectionByNameOrId("profiles");
  const username = profiles.fields.getByName("username");
  username.pattern = "^[a-z0-9_]+$";
  username.min = 0;
  username.max = 0;
  profiles.listRule = null;
  profiles.viewRule = null;
  profiles.createRule = null;
  profiles.removeIndex("idx_profiles_owner");
  app.save(profiles);
});
