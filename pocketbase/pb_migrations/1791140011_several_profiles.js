/// <reference path="../pb_data/types.d.ts" />
// Phase 6, ticket 1 (docs/spec/phase-06-sites-and-domains.md, § 2 Option A, Schema and Rules): an account owns up to N = 3
// Profiles, each in its own slot. `profiles.slot` is a number, min 1, max 3, not required: the ownerless imported Profiles have
// none (0 as stored, which PocketBase 0.40.4 does not hold to the minimum). Phase 3's one-Profile index on owner
// (idx_profiles_owner, 1791140004_sign_up_and_claim.js) becomes a unique index on (owner, slot) for owned Profiles, so two
// concurrent claims for one slot meet the index. Every owned Profile gets slot 1, so nothing existing clashes.
// The create rule gains `slot`: above 0, and a verified email unless it is 1, so an unverified account still claims exactly one
// (Phase 3). The update rule refuses `slot` beside Username, owner, badge and v1Key. Superusers bypass every rule, so the
// Operator's hand-over sets owner and a free slot in the admin UI; the v1 Import writes ownerless Profiles with no slot.
// ASSUMPTION: N = 3, one global cap held by the field's max (the spec's, rung 6). Overturned by the Operator's pricing answer;
// a per-account cap then becomes `users.maxProfiles` with `@request.body.slot <= @request.auth.maxProfiles` in the create rule.
migrate((app) => {
  // Kept inside the callback: migration files may share one JS runtime.
  const ON_CLAIM = "@request.body.slot > 0 && (@request.body.slot = 1 || @request.auth.verified = true)";
  const NOT_ON_UPDATE = "@request.body.slot:isset = false";
  const profiles = app.findCollectionByNameOrId("profiles");
  profiles.fields.add(new NumberField({ name: "slot", min: 1, max: 3, onlyInt: true }));
  profiles.removeIndex("idx_profiles_owner");
  profiles.addIndex("idx_profiles_owner_slot", true, "owner, slot", "owner != ''");
  profiles.createRule = `${profiles.createRule} && ${ON_CLAIM}`;
  profiles.updateRule = `${profiles.updateRule} && ${NOT_ON_UPDATE}`;
  app.save(profiles);
  app.db().newQuery("UPDATE profiles SET slot = 1 WHERE owner != ''").execute();
}, (app) => {
  // Back to one Profile per account. An account owning two cannot go back without losing one, so the migration stops and says
  // which accounts; the Operator deletes or hands away the extra Profiles first.
  const many = arrayOf(new DynamicModel({ owner: "" }));
  app.db().newQuery("SELECT owner FROM profiles WHERE owner != '' GROUP BY owner HAVING COUNT(*) > 1").all(many);
  if (many.length) {
    throw new Error(`1791140011 down: these accounts own more than one Profile: ${many.map((m) => m.owner).join(", ")}`);
  }
  const ON_CLAIM = " && @request.body.slot > 0 && (@request.body.slot = 1 || @request.auth.verified = true)";
  const NOT_ON_UPDATE = " && @request.body.slot:isset = false";
  const profiles = app.findCollectionByNameOrId("profiles");
  profiles.createRule = profiles.createRule.replace(ON_CLAIM, "");
  profiles.updateRule = profiles.updateRule.replace(NOT_ON_UPDATE, "");
  profiles.removeIndex("idx_profiles_owner_slot");
  profiles.addIndex("idx_profiles_owner", true, "owner", "owner != ''");
  profiles.fields.removeByName("slot");
  app.save(profiles);
});
