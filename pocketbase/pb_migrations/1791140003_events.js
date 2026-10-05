/// <reference path="../pb_data/types.d.ts" />
// Phase 2 schema (docs/spec/phase-02-vps-foundation.md, Schema; D5): events, ready for Phase 4. Every API rule is
// superuser-only (null). Nothing writes to it in Phase 2; Phase 4's `/r`, Reveal and Page View ping will.
// ASSUMPTION: deleting a Link keeps its Events with an empty link (cascadeDelete false), so a Creator's past Clicks stay in
// Stats; deleting the Profile removes them (cascade, per the spec). Rung 4: kept rows are cheaper to drop later than lost
// ones are to recover. Overturned if Phase 4 wants a deleted Link's Events gone with it.
migrate((app) => {
  const profiles = app.findCollectionByNameOrId("profiles");
  const links = app.findCollectionByNameOrId("links");
  const events = new Collection({
    type: "base",
    name: "events",
    listRule: null,
    viewRule: null,
    createRule: null,
    updateRule: null,
    deleteRule: null,
    fields: [
      { name: "profile", type: "relation", required: true, collectionId: profiles.id, maxSelect: 1, cascadeDelete: true },
      // Empty for a Page View.
      { name: "link", type: "relation", collectionId: links.id, maxSelect: 1, cascadeDelete: false },
      { name: "kind", type: "select", maxSelect: 1, values: ["page_view", "click"] },
      // The Visitor's country.
      { name: "country", type: "text" },
      // Which In-App Browser, if any.
      { name: "inAppBrowser", type: "text" },
      { name: "created", type: "autodate", onCreate: true, onUpdate: false },
    ],
  });
  app.save(events);
}, (app) => {
  app.delete(app.findCollectionByNameOrId("events"));
});
