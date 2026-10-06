/// <reference path="../pb_data/types.d.ts" />
// The Deeplink Modes are Profile defaults only (ADR 0003, amended 2026-10-06, the Operator's decision): a Link chooses Direct
// or Escape, or inherits the Profile's default. links.mode loses `deeplink` and `deeplink_script` (it never held
// `deeplink_open`), and a Link that held one inherits instead. profiles.mode is unchanged.
migrate((app) => {
  app.db().newQuery("UPDATE links SET mode = '' WHERE mode IN ('deeplink', 'deeplink_script', 'deeplink_open')").execute();
  const links = app.findCollectionByNameOrId("links");
  const mode = links.fields.getByName("mode");
  mode.values = mode.values.filter((value) => value === "direct" || value === "escape_ig");
  app.save(links);
}, (app) => {
  // Back to 0013's options; a Link that inherited a Deeplink default stays on the default (which Links held one is not kept).
  const links = app.findCollectionByNameOrId("links");
  const mode = links.fields.getByName("mode");
  mode.values = [...mode.values, "deeplink", "deeplink_script"];
  app.save(links);
});
