/// <reference path="../pb_data/types.d.ts" />
// Phase 4, ticket 33 (docs/spec/phase-04-stats.md, Schema): the Phase's one additive migration. Phase 2's events collection
// (1791140003_events.js) already holds every field the spec names, under its name and type: kind, profile (required, cascade
// delete), link (optional, no cascade, so PocketBase clears it when the Link is deleted), country, inAppBrowser and created.
// So this migration adds no field and keeps every events rule superuser-only (null), as Phase 2 left them. It adds the index
// on (profile, created) and the `dailyStats` view, and renames, retypes or drops nothing.
// `dailyStats`: one row per Profile, Link, country and UTC day (`created` is stored in UTC), holding that day's Page Views
// (`views`) and Clicks (`clicks`). `link` stays a relation: empty on Page View rows and on Clicks of a deleted Link. Its list
// and view rule starts with `@request.auth.id != ""`, so a signed-out caller never matches an ownerless imported Profile's rows.
// The column types follow PocketBase's view inference: direct columns keep their field's type (relations stay relations, which
// the rule's `profile.owner` needs), COUNT() reads as a number and CAST(... AS TEXT) as text.
// ASSUMPTION: a row's id is its group's key, Profile, Link, country and day joined by `_`, so it is unique per row and stays the
// same as Events arrive (rung 4: a row id that changes as rows are added, such as ROW_NUMBER(), could not be viewed again by its
// id; rung 5: no stored rollup). Overturned if PocketBase refuses an id of that shape; ROW_NUMBER() then stands in.
migrate((app) => {
  // Kept inside the callback: migration files may share one JS runtime.
  const OWNER_ONLY = '@request.auth.id != "" && profile.owner = @request.auth.id';
  const events = app.findCollectionByNameOrId("events");
  events.addIndex("idx_events_profile_created", false, "profile, created", "");
  app.save(events);

  const dailyStats = new Collection({
    type: "view",
    name: "dailyStats",
    listRule: OWNER_ONLY,
    viewRule: OWNER_ONLY,
    viewQuery: `
      SELECT
        (events.profile || '_' || events.link || '_' || events.country || '_' || strftime('%Y%m%d', events.created)) AS id,
        events.profile AS profile,
        events.link AS link,
        events.country AS country,
        CAST(strftime('%Y-%m-%d', events.created) AS TEXT) AS day,
        COUNT(CASE WHEN events.kind = 'page_view' THEN 1 END) AS views,
        COUNT(CASE WHEN events.kind = 'click' THEN 1 END) AS clicks
      FROM events
      GROUP BY events.profile, events.link, events.country, strftime('%Y-%m-%d', events.created)
    `,
  });
  app.save(dailyStats);
}, (app) => {
  app.delete(app.findCollectionByNameOrId("dailyStats"));
  const events = app.findCollectionByNameOrId("events");
  events.removeIndex("idx_events_profile_created");
  app.save(events);
});
