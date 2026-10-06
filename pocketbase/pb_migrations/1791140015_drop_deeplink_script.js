/// <reference path="../pb_data/types.d.ts" />
// Deeplink on tap (x-safari script) goes (the Operator, 2026-10-06, once a phone had compared it with the anchor tap): a
// Profile default of `deeplink_script` becomes Deeplink on tap, and profiles.mode loses the option. links.mode no longer has
// it (1791140014_link_modes_direct_escape.js). 1791140013_deeplink_script.js stays as it is: it is applied on the live database.
migrate((app) => {
  app.db().newQuery("UPDATE profiles SET mode = 'deeplink' WHERE mode = 'deeplink_script'").execute();
  const profiles = app.findCollectionByNameOrId("profiles");
  const mode = profiles.fields.getByName("mode");
  mode.values = mode.values.filter((value) => value !== "deeplink_script");
  app.save(profiles);
}, (app) => {
  // Back to 0014's options; which Profiles held `deeplink_script` is not kept.
  const profiles = app.findCollectionByNameOrId("profiles");
  const mode = profiles.fields.getByName("mode");
  mode.values = [...mode.values, "deeplink_script"];
  app.save(profiles);
});
