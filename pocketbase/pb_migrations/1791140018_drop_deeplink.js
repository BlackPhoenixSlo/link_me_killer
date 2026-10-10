/// <reference path="../pb_data/types.d.ts" />
// Drop the Deeplink Modes (docs/spec/phase-01-link-modes-and-escape.md, Schema): an off-site redirect fired through the app's
// own page is what flagged OnlyFans links in Instagram, so the new app matches the proven-safe v1 copy and keeps only Direct
// and Escape. A Profile whose default is `deeplink` or `deeplink_open` falls back to Escape; links.mode never held a Deeplink
// value (1791140014 cleared it), so its UPDATE is a defensive no-op. profiles.mode then loses the two options.
migrate((app) => {
  app.db().newQuery("UPDATE profiles SET mode = 'escape_ig' WHERE mode IN ('deeplink', 'deeplink_open')").execute();
  app.db().newQuery("UPDATE links SET mode = '' WHERE mode IN ('deeplink', 'deeplink_open')").execute();
  const profiles = app.findCollectionByNameOrId("profiles");
  const mode = profiles.fields.getByName("mode");
  mode.values = mode.values.filter((value) => value === "direct" || value === "escape_ig");
  app.save(profiles);
}, (app) => {
  // Back to the previous options; a Profile that fell back to Escape stays on Escape (which Profiles held a Deeplink default is not kept).
  const profiles = app.findCollectionByNameOrId("profiles");
  const mode = profiles.fields.getByName("mode");
  mode.values = [...mode.values, "deeplink", "deeplink_open"];
  app.save(profiles);
});
