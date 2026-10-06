/// <reference path="../pb_data/types.d.ts" />
// Deeplink on tap (x-safari script) (docs/spec/phase-01-link-modes-and-escape.md, Solution): the Link and Profile Modes gain
// `deeplink_script`, Deeplink on tap by a scripted pop-out instead of an anchor tap, a test variant kept so a phone can compare
// the two mechanisms side by side.
migrate((app) => {
  for (const name of ["profiles", "links"]) {
    const collection = app.findCollectionByNameOrId(name);
    const mode = collection.fields.getByName("mode");
    mode.values = [...mode.values, "deeplink_script"];
    app.save(collection);
  }
}, (app) => {
  // Back to 0012's state: a `deeplink_script` Mode becomes Deeplink on tap, and the selects lose the option.
  for (const name of ["profiles", "links"]) {
    app.db().newQuery(`UPDATE ${name} SET mode = 'deeplink' WHERE mode = 'deeplink_script'`).execute();
    const collection = app.findCollectionByNameOrId(name);
    const mode = collection.fields.getByName("mode");
    mode.values = mode.values.filter((value) => value !== "deeplink_script");
    app.save(collection);
  }
});
