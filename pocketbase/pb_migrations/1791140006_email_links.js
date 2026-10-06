/// <reference path="../pb_data/types.d.ts" />
// Phase 3, ticket 31 (docs/spec/phase-03-auth-and-editor.md, Interfaces, Email links): the users collection's verification and
// password-reset emails link to the Editor's two fixed URLs, `{APP_URL}/edit/verify?token={TOKEN}` and
// `{APP_URL}/edit/reset?token={TOKEN}`, instead of PocketBase's admin UI. The Application URL is the public origin: the Operator
// sets it on the VPS, and tests/stack.sh sets it in the test stack.
// ASSUMPTION: only the link in PocketBase's stock template changes and its wording stays (rung 5: one replace per template;
// observed on 0.40.4: the stock bodies link to `{APP_URL}/_/#/auth/confirm-verification/{TOKEN}` and
// `{APP_URL}/_/#/auth/confirm-password-reset/{TOKEN}`). Overturned if the Operator wants the emails reworded; that is a body
// edit in the admin UI or a later migration.
migrate((app) => {
  // Kept inside the callbacks: migration files may share one JS runtime (1791140004_sign_up_and_claim.js). A body without the
  // expected link fails the migration loudly rather than recording it as applied with the email unchanged.
  const users = app.findCollectionByNameOrId("users");
  for (const [template, from, to] of [
    ["verificationTemplate", "{APP_URL}/_/#/auth/confirm-verification/{TOKEN}", "{APP_URL}/edit/verify?token={TOKEN}"],
    ["resetPasswordTemplate", "{APP_URL}/_/#/auth/confirm-password-reset/{TOKEN}", "{APP_URL}/edit/reset?token={TOKEN}"],
  ]) {
    if (!users[template].body.includes(from)) throw new Error(`users.${template} has no ${from} link to replace`);
    users[template].body = users[template].body.replace(from, to);
  }
  app.save(users);
}, (app) => {
  const users = app.findCollectionByNameOrId("users");
  for (const [template, from, to] of [
    ["verificationTemplate", "{APP_URL}/edit/verify?token={TOKEN}", "{APP_URL}/_/#/auth/confirm-verification/{TOKEN}"],
    ["resetPasswordTemplate", "{APP_URL}/edit/reset?token={TOKEN}", "{APP_URL}/_/#/auth/confirm-password-reset/{TOKEN}"],
  ]) {
    if (!users[template].body.includes(from)) throw new Error(`users.${template} has no ${from} link to replace`);
    users[template].body = users[template].body.replace(from, to);
  }
  app.save(users);
});
