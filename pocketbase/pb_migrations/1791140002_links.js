/// <reference path="../pb_data/types.d.ts" />
// Phase 2 schema (docs/spec/phase-02-vps-foundation.md, Schema): links. Every API rule is superuser-only (null).
// linkId is the public Link Id: 12 random [a-z0-9], minted by PocketBase on create, separate from the record id.
// destination takes only an absolute http(s) URL or a root-relative path, so `javascript:` and `//host` are refused.
// ASSUMPTION: the pattern also refuses a backslash or whitespace anywhere, and needs a host or path character right after
// `http(s)://` or the leading `/`: browsers read `\` as `/` and drop tab and newline, so `/\host` or `/<TAB>/host` would
// leave v2's origin (rung 4: a refused value is cheaper to relax than an off-origin redirect is to recall). Go RE2, so no
// lookahead. Overturned if a real Destination needs a literal space or backslash; it would then be percent-encoded.
migrate((app) => {
  // Kept inside the callback: migration files may share one JS runtime.
  const WEBP_5MB = { type: "file", maxSelect: 1, maxSize: 5 * 1024 * 1024, mimeTypes: ["image/webp"] };
  const MODES = ["direct", "escape_ig", "deeplink"];
  const profiles = app.findCollectionByNameOrId("profiles");
  const links = new Collection({
    type: "base",
    name: "links",
    listRule: null,
    viewRule: null,
    createRule: null,
    updateRule: null,
    deleteRule: null,
    fields: [
      { name: "profile", type: "relation", required: true, collectionId: profiles.id, maxSelect: 1, cascadeDelete: true },
      { name: "linkId", type: "text", required: true, min: 12, max: 12, pattern: "^[a-z0-9]{12}$", autogeneratePattern: "[a-z0-9]{12}" },
      { name: "title", type: "text", required: true },
      { name: "order", type: "number" },
      { name: "isAdult", type: "bool" },
      // Empty = the Profile's default Mode.
      { name: "mode", type: "select", maxSelect: 1, values: MODES },
      { name: "destination", type: "text", pattern: "^(https?://[^\\s\\\\/]|/[^\\s\\\\/])[^\\s\\\\]*$" },
      { name: "tracking", type: "bool" },
      // v1 default_tracknumber, verbatim.
      { name: "defaultTrackingCode", type: "text" },
      // Geo Rule, v1 shape.
      { name: "geo", type: "json" },
      { name: "icon", ...WEBP_5MB },
      { name: "backgroundImage", ...WEBP_5MB },
      // "<v1 Link Id>#<n>", n = occurrence within the file.
      { name: "v1Key", type: "text" },
    ],
    indexes: ["CREATE UNIQUE INDEX idx_links_linkId ON links (linkId)"],
  });
  app.save(links);
}, (app) => {
  app.delete(app.findCollectionByNameOrId("links"));
});
