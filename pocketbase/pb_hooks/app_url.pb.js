/// <reference path="../pb_data/types.d.ts" />
// The Application URL from the environment: PocketBase builds the verification and password-reset links from
// settings.meta.appURL (1791140006_email_links.js), which lives in pb_data and is otherwise set by hand in the admin UI, so a
// fresh install's emails would link to the wrong host. On every start, a non-empty PB_APP_URL that differs from the stored
// value replaces it (a refused one is logged and boot goes on); an empty one leaves the stored value (and the admin UI) in charge.
onBootstrap((e) => {
  e.next(); // settings are loaded only once the app has bootstrapped
  // A value PocketBase refuses is logged, never thrown: a bad PB_APP_URL must not stop PocketBase from starting.
  try {
    const wanted = $os.getenv("PB_APP_URL").trim();
    if (!wanted) return;
    const settings = e.app.settings();
    if (settings.meta.appURL === wanted) return;
    settings.meta.appURL = wanted;
    e.app.save(settings);
    console.log(`appURL set from PB_APP_URL: ${wanted}`);
  } catch (err) {
    console.log(`appURL not set from PB_APP_URL: ${err}`);
  }
});
