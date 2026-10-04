/// <reference path="../pb_data/types.d.ts" />
// Phase 2 schema (docs/spec/phase-02-vps-foundation.md, Schema): profiles. Every API rule is superuser-only (null).
migrate((app) => {
  // Kept inside the callback: migration files may share one JS runtime.
  const WEBP_5MB = { type: "file", maxSelect: 1, maxSize: 5 * 1024 * 1024, mimeTypes: ["image/webp"] };
  const MODES = ["direct", "escape_ig", "deeplink"];
  const users = app.findCollectionByNameOrId("users");
  const profiles = new Collection({
    type: "base",
    name: "profiles",
    listRule: null,
    viewRule: null,
    createRule: null,
    updateRule: null,
    deleteRule: null,
    fields: [
      { name: "username", type: "text", required: true, pattern: "^[a-z0-9_]+$" },
      { name: "displayName", type: "text" },
      { name: "bio", type: "text" },
      { name: "verified", type: "bool" },
      { name: "avatar", ...WEBP_5MB },
      // The default Mode; empty reads as escape_ig.
      { name: "mode", type: "select", maxSelect: 1, values: MODES },
      { name: "owner", type: "relation", collectionId: users.id, maxSelect: 1, cascadeDelete: false },
      // The v1 file name; empty for v2-born Profiles.
      { name: "v1Key", type: "text" },
    ],
    indexes: ["CREATE UNIQUE INDEX idx_profiles_username ON profiles (username)"],
  });
  app.save(profiles);
}, (app) => {
  app.delete(app.findCollectionByNameOrId("profiles"));
});
