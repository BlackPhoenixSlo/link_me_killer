/// <reference path="../pb_data/types.d.ts" />
// Phase 6, ticket 4 (docs/spec/phase-06-sites-and-domains.md, § 3 Option 1, Schema and Migration): Custom Domains move from
// `profiles.customDomain` (1791140008_domains.js) to their own collection, which a verified Creator fills for their own Profile.
// One record per Profile, pending or live; a domain is live for one Profile at most, and a pending claim never blocks the real
// owner (the live index is partial). Only the app's DNS check (app/src/domain-check.js, as superuser) and the Operator set
// `status` and `checked`: update is null and the create rule refuses both, with `id` and `token`. Delete is the owner.
// Every Operator-set `profiles.customDomain` becomes a live record, then the field, its index and the
// `@request.body.customDomain:isset = false` clauses go. The clauses are removed one by one from whatever the profiles rules
// hold now (1791140011_several_profiles.js edits them too), so every other clause stays as it is.
// ASSUMPTION: a record a Creator creates has an empty `status`, which reads as pending everywhere (the app, the Editor, the
// TLS Ask), because the create rule refuses `status` and a select has no default (rung 5: no hook). Overturned if pending must
// be stored; a hook or the check route would then write it.
// ASSUMPTION: the token gets the pattern and length its autogenerate pattern makes (rung 3: links.linkId). Overturned if the
// Operator must type a token by hand in the admin UI; it is then a free text.
migrate((app) => {
  // Kept inside the callback: migration files may share one JS runtime.
  const HOSTNAME = "^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\\.)+[a-z][a-z0-9-]{0,61}[a-z0-9]$";
  const NO_DOMAIN = "@request.body.customDomain:isset = false";
  const SIGNED_IN = '@request.auth.id != ""';
  const and = (...clauses) => clauses.join(" && ");
  const unset = (...names) => names.map((name) => `@request.body.${name}:isset = false`);
  const OWNER = and(SIGNED_IN, "profile.owner = @request.auth.id");

  const profiles = app.findCollectionByNameOrId("profiles");
  const customDomains = new Collection({
    type: "base",
    name: "customDomains",
    listRule: OWNER,
    viewRule: OWNER,
    createRule: and(SIGNED_IN, "@request.body.profile.owner = @request.auth.id", "@request.auth.verified = true",
      ...unset("id", "status", "token", "checked")),
    updateRule: null,
    deleteRule: OWNER,
    fields: [
      { name: "profile", type: "relation", required: true, collectionId: profiles.id, maxSelect: 1, cascadeDelete: true },
      { name: "domain", type: "text", required: true, max: 253, pattern: HOSTNAME },
      { name: "token", type: "text", required: true, min: 32, max: 32, pattern: "^[a-z0-9]{32}$", autogeneratePattern: "[a-z0-9]{32}" },
      // Empty = pending (the create rule refuses `status`).
      { name: "status", type: "select", maxSelect: 1, values: ["pending", "live"] },
      // When the app's check found the DNS pointing here and set the record live.
      { name: "checked", type: "date" },
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_customDomains_profile ON customDomains (profile)",
      "CREATE UNIQUE INDEX idx_customDomains_live ON customDomains (domain) WHERE status = 'live'",
    ],
  });
  app.save(customDomains);

  // The Operator set these, so they are live as they were.
  for (const profile of app.findRecordsByFilter("profiles", "customDomain != ''", "", 0, 0)) {
    const record = new Record(customDomains);
    record.set("profile", profile.id);
    record.set("domain", profile.getString("customDomain"));
    record.set("token", $security.randomStringWithAlphabet(32, "abcdefghijklmnopqrstuvwxyz0123456789"));
    record.set("status", "live");
    app.save(record);
  }

  const without = (rule) => (rule === null ? null : rule.split(" && ").filter((clause) => clause !== NO_DOMAIN).join(" && "));
  profiles.createRule = without(profiles.createRule);
  profiles.updateRule = without(profiles.updateRule);
  profiles.removeIndex("idx_profiles_customDomain");
  profiles.fields.removeByName("customDomain");
  app.save(profiles);
}, (app) => {
  // Back to 1791140008's state: each live record's domain on its Profile again, the clauses appended, no collection.
  const HOSTNAME = "^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\\.)+[a-z][a-z0-9-]{0,61}[a-z0-9]$";
  const NO_DOMAIN = "@request.body.customDomain:isset = false";
  const profiles = app.findCollectionByNameOrId("profiles");
  profiles.fields.add(new TextField({ name: "customDomain", max: 253, pattern: HOSTNAME, hidden: true }));
  profiles.addIndex("idx_profiles_customDomain", true, "customDomain", "customDomain != ''");
  profiles.createRule = `${profiles.createRule} && ${NO_DOMAIN}`;
  profiles.updateRule = `${profiles.updateRule} && ${NO_DOMAIN}`;
  app.save(profiles);
  for (const live of app.findRecordsByFilter("customDomains", "status = 'live'", "", 0, 0)) {
    const profile = app.findRecordById("profiles", live.getString("profile"));
    profile.set("customDomain", live.getString("domain"));
    app.save(profile);
  }
  app.delete(app.findCollectionByNameOrId("customDomains"));
});
