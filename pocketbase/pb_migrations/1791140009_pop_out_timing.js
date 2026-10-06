/// <reference path="../pb_data/types.d.ts" />
// Pop out timing (docs/spec/phase-01-link-modes-and-escape.md, Schema): one Profile field, `popOutTiming`, `open` or `tap`. It
// decides only whether an Escape or Deeplink default pops the Visitor out of an In-App Browser as soon as the page opens
// (`open`) or waits for the Visitor's tap (`tap`); empty reads as `tap`, so every existing and v1-imported Profile keeps v1's
// overlay-first behaviour. A Profile setting, not a Link one: ADR 0003's one Mode per Link stands.
// The verified owner already updates it (1791140005_content_rules.js names only the fields it refuses). The claim still sets
// only Username, owner and default Mode (1791140004_sign_up_and_claim.js), so the create rule gains one clause refusing it.
migrate((app) => {
  // Kept inside the callback: migration files may share one JS runtime.
  const NOT_ON_CLAIM = "@request.body.popOutTiming:isset = false";
  const profiles = app.findCollectionByNameOrId("profiles");
  profiles.fields.add(new SelectField({ name: "popOutTiming", maxSelect: 1, values: ["open", "tap"] }));
  profiles.createRule = `${profiles.createRule} && ${NOT_ON_CLAIM}`;
  app.save(profiles);
}, (app) => {
  const NOT_ON_CLAIM = " && @request.body.popOutTiming:isset = false";
  const profiles = app.findCollectionByNameOrId("profiles");
  profiles.createRule = profiles.createRule.replace(NOT_ON_CLAIM, "");
  profiles.fields.removeByName("popOutTiming");
  app.save(profiles);
});
