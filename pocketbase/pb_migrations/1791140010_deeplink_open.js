/// <reference path="../pb_data/types.d.ts" />
// Deeplink at open (docs/spec/phase-01-link-modes-and-escape.md, Schema; ADR 0003, amended 2026-10-06): the Profile's default
// Mode gains `deeplink_open`, which pops an In-App Browser Visitor out as soon as the page opens. It is a Profile default only,
// so links.mode is unchanged and ADR 0003's one Mode per Link stands. Pop out timing goes: its "At open" on a Deeplink default
// is carried over as `deeplink_open`; on an Escape default it is dropped (the Operator's decision: an Escape default no longer
// pops out at open). profiles.popOutTiming is removed, and the create rule loses the clause 1791140009_pop_out_timing.js
// appended, back to what it was before that migration. 0009 stays as it is: it is applied on the live database.
migrate((app) => {
  // Kept inside the callback: migration files may share one JS runtime.
  const NOT_ON_CLAIM = " && @request.body.popOutTiming:isset = false";
  const profiles = app.findCollectionByNameOrId("profiles");
  const mode = profiles.fields.getByName("mode");
  mode.values = [...mode.values, "deeplink_open"];
  app.save(profiles);

  app.db().newQuery("UPDATE profiles SET mode = 'deeplink_open' WHERE mode = 'deeplink' AND popOutTiming = 'open'").execute();

  const after = app.findCollectionByNameOrId("profiles");
  after.createRule = after.createRule == null ? after.createRule : after.createRule.replace(NOT_ON_CLAIM, "");
  if ((after.createRule || "").includes("popOutTiming")) throw new Error("profiles.createRule still names popOutTiming");
  after.fields.removeByName("popOutTiming");
  app.save(after);
}, (app) => {
  // Back to 0009's state: popOutTiming returns with its claim-rule clause, a `deeplink_open` default becomes a Deeplink
  // default with "At open", and the default Mode select loses the option.
  const NOT_ON_CLAIM = "@request.body.popOutTiming:isset = false";
  const profiles = app.findCollectionByNameOrId("profiles");
  profiles.fields.add(new SelectField({ name: "popOutTiming", maxSelect: 1, values: ["open", "tap"] }));
  if (profiles.createRule != null) profiles.createRule = `${profiles.createRule} && ${NOT_ON_CLAIM}`;
  app.save(profiles);

  app.db().newQuery("UPDATE profiles SET popOutTiming = 'open', mode = 'deeplink' WHERE mode = 'deeplink_open'").execute();

  const after = app.findCollectionByNameOrId("profiles");
  const mode = after.fields.getByName("mode");
  mode.values = mode.values.filter((value) => value !== "deeplink_open");
  app.save(after);
});
