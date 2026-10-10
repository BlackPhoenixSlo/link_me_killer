/// <reference path="../pb_data/types.d.ts" />
// An account that never confirms its email can use the whole Editor (the Operator, 2026-10-10): Phase 3's verified-email gate
// on content writes is overturned as its own ASSUMPTION foresaw (docs/spec/phase-03-auth-and-editor.md, "Content writes need a
// verified email"). The `@request.auth.verified = true` clause comes out of profiles.updateRule and links' create, update and
// delete rules (1791140005_content_rules.js) and customDomains.createRule (1791140012_custom_domains.js), and the slot clause
// `(@request.body.slot = 1 || @request.auth.verified = true)` out of profiles.createRule (1791140011_several_profiles.js), so
// an unverified account claims every slot up to the field's max. Each clause is removed from whatever the rule holds now, as
// 1791140012 removes its own, so every other clause stays as it is. Email verification then gates only password reset.
// ASSUMPTION: an unverified account publishing on the shared domain is acceptable (rung 2: the Operator's call). Overturned if
// abuse appears; down() puts the clauses back where they stood.
migrate((app) => {
  // Kept inside the callback: migration files may share one JS runtime.
  const VERIFIED = "@request.auth.verified = true";
  const SLOT_VERIFIED = "(@request.body.slot = 1 || @request.auth.verified = true)";
  const without = (rule, gone) => rule.split(" && ").filter((clause) => clause !== gone).join(" && ");

  const profiles = app.findCollectionByNameOrId("profiles");
  profiles.createRule = without(profiles.createRule, SLOT_VERIFIED);
  profiles.updateRule = without(profiles.updateRule, VERIFIED);
  app.save(profiles);

  const links = app.findCollectionByNameOrId("links");
  links.createRule = without(links.createRule, VERIFIED);
  links.updateRule = without(links.updateRule, VERIFIED);
  links.deleteRule = without(links.deleteRule, VERIFIED);
  app.save(links);

  const customDomains = app.findCollectionByNameOrId("customDomains");
  customDomains.createRule = without(customDomains.createRule, VERIFIED);
  app.save(customDomains);
}, (app) => {
  // Back to the gate: each clause goes in again right after the clause it followed.
  const VERIFIED = "@request.auth.verified = true";
  const SLOT_VERIFIED = "(@request.body.slot = 1 || @request.auth.verified = true)";
  const after = (rule, anchor, clause) => {
    const clauses = rule.split(" && ");
    const at = clauses.indexOf(anchor);
    if (at < 0) throw new Error(`1791140019 down: no clause "${anchor}" in ${rule}`);
    clauses.splice(at + 1, 0, clause);
    return clauses.join(" && ");
  };
  const CLAIM_OWNER = "@request.body.profile.owner = @request.auth.id";
  const OWNER = "profile.owner = @request.auth.id";

  const profiles = app.findCollectionByNameOrId("profiles");
  profiles.createRule = after(profiles.createRule, "@request.body.slot > 0", SLOT_VERIFIED);
  profiles.updateRule = after(profiles.updateRule, "owner = @request.auth.id", VERIFIED);
  app.save(profiles);

  const links = app.findCollectionByNameOrId("links");
  links.createRule = after(links.createRule, CLAIM_OWNER, VERIFIED);
  links.updateRule = after(links.updateRule, OWNER, VERIFIED);
  links.deleteRule = after(links.deleteRule, OWNER, VERIFIED);
  app.save(links);

  const customDomains = app.findCollectionByNameOrId("customDomains");
  customDomains.createRule = after(customDomains.createRule, CLAIM_OWNER, VERIFIED);
  app.save(customDomains);
});
