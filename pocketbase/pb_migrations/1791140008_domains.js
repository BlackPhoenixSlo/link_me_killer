/// <reference path="../pb_data/types.d.ts" />
// Phase 5, ticket 39 (docs/spec/phase-05-cutover-and-domains.md, Schema): the Domains schema. An optional Custom Domain on
// Profiles, hidden from the public API and unique when set, and a Spare Domains collection that only superusers list, view or
// change (every rule null). Phase 3's Profiles create and update rules (1791140004_sign_up_and_claim.js,
// 1791140005_content_rules.js) each gain one clause refusing any request that sets `customDomain`; superusers bypass every rule,
// so only the Operator sets one, in the admin UI. The app reads both as the superuser it already is (app/src/gateway.js).
// The hostname pattern has no look-ahead, because PocketBase patterns are Go regular expressions; Punycode (`xn--…`) passes and
// `localhost` cannot be stored.
// The clause is PocketBase 0.23+ request-body syntax, `@request.body.customDomain:isset = false`, as the Phase 3 rules on this
// stack's 0.40.4 already use. Observed on the test stack for ticket 39 (2026-10-05): 0.40.4 drops a hidden field from a
// non-superuser's create or update body before the rules run, so while `customDomain` is hidden the clause never fires and
// PocketBase answers the write as if it named no Custom Domain, storing none; with the field not hidden, the same create was
// refused (400). The clause stays as the spec writes it, so lifting `hidden` later still leaves only the Operator setting one.
// ASSUMPTION: "refused" is met by the value never being stored, not by a refusing status (rung 4: hidden is the spec's closed
// choice, and either way no Creator sets a Custom Domain). Overturned if a Creator's write naming one must be answered with a
// refusal; a later migration then drops `hidden`, and the clause refuses it.
// ASSUMPTION (the spec's, rung 5): a Custom Domain equal to a primary host or a Spare Domain is not refused on save; Host
// Resolution's order (app/src/host-resolver.js) means it is never reached. Overturned if the Operator wants such a typo refused
// when it is saved.
migrate((app) => {
  // Kept inside the callback: migration files may share one JS runtime.
  const HOSTNAME = "^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\\.)+[a-z][a-z0-9-]{0,61}[a-z0-9]$";
  const NO_DOMAIN = "@request.body.customDomain:isset = false";

  const profiles = app.findCollectionByNameOrId("profiles");
  profiles.fields.add(new TextField({ name: "customDomain", max: 253, pattern: HOSTNAME, hidden: true }));
  profiles.addIndex("idx_profiles_customDomain", true, "customDomain", "customDomain != ''");
  profiles.createRule = `${profiles.createRule} && ${NO_DOMAIN}`;
  profiles.updateRule = `${profiles.updateRule} && ${NO_DOMAIN}`;
  app.save(profiles);

  const spareDomains = new Collection({
    type: "base",
    name: "spareDomains",
    listRule: null,
    viewRule: null,
    createRule: null,
    updateRule: null,
    deleteRule: null,
    fields: [{ name: "domain", type: "text", required: true, max: 253, pattern: HOSTNAME }],
    indexes: ["CREATE UNIQUE INDEX idx_spareDomains_domain ON spareDomains (domain)"],
  });
  app.save(spareDomains);
}, (app) => {
  // Back to Phase 4's state: no Spare Domains, no Custom Domain, Phase 3's rules without the clause.
  app.delete(app.findCollectionByNameOrId("spareDomains"));
  const NO_DOMAIN = " && @request.body.customDomain:isset = false";
  const profiles = app.findCollectionByNameOrId("profiles");
  profiles.createRule = profiles.createRule.replace(NO_DOMAIN, "");
  profiles.updateRule = profiles.updateRule.replace(NO_DOMAIN, "");
  profiles.removeIndex("idx_profiles_customDomain");
  profiles.fields.removeByName("customDomain");
  app.save(profiles);
});
