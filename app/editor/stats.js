'use strict';
// The Stats page (docs/spec/phase-04-stats.md, Stats page; ticket 33), a screen of the creator-only area at `/edit/stats`, next
// to the Editor in its navigation. Its own file so editor.js stays under 1000 lines; it is loaded first and calls the Editor's
// helpers (api, el, render, show, onboarded, drawRetry, creatorNav) only once editor.js has run and routed here.
// It reads the `dailyStats` view through the same-origin proxy with the Creator's token and sends no Profile filter, so
// PocketBase's list rule alone decides which rows it gets; it never asks for events. Numbers are as of page load.
// Laid out after the link.me Template's analytics page (link.me/analytics.html): the range with its date span, three cards in
// place of Profile Views, Link Clicks and Engagement Rate, the daily panel in place of Traffic Overview, a Links table in place
// of Top Web Links and a Countries table in place of Geographic Analytics → Countries. Bars are plain elements, no chart library.
// Every number sits under an accessible label: a card's heading names its region, a table's cells sit under column headers.
// ASSUMPTION: the Links table lists every Link of the Creator's, those with no Click in the range at 0, plus "Deleted link" once
// a deleted Link's Clicks are in the range (rung 6: the spec fixes the columns and the order, not which Links show). Overturned
// if only Links with Clicks should show, as the Countries table shows only countries seen.

const DAY_MS = 86_400_000;
const PAGE_SIZE = 500;

// The `n` UTC days ending today by the browser's clock, oldest first, as "YYYY-MM-DD".
function rangeDays(n) {
  const now = Date.now();
  return Array.from({ length: n }, (_, i) => new Date(now - (n - 1 - i) * DAY_MS).toISOString().slice(0, 10));
}

// Every dailyStats row from `first` to `last`, PAGE_SIZE to a page, asking for the next page until PocketBase has sent them all:
// `{ ok, rows, message }`, `ok` false with PocketBase's message from the first page it refuses.
async function statsRows(first, last) {
  const filter = encodeURIComponent(`day >= '${first}' && day <= '${last}'`);
  const rows = [];
  for (let page = 1; ; page++) {
    const res = await api(`dailyStats/records?perPage=${PAGE_SIZE}&page=${page}&filter=${filter}`);
    if (!res.ok) return { ok: false, rows, message: res.data.message };
    rows.push(...res.data.items);
    if (page >= res.data.totalPages) return { ok: true, rows, message: '' };
  }
}

// `/edit/stats` for a signed-in Creator past Onboarding (the Editor's onboarded(), which otherwise draws the step that applies):
// their Profile's Links, read the way the Editor reads them, and the 7D range's rows.
async function openStats() {
  const done = await onboarded();
  if (!done) return;
  const days = rangeDays(7);
  const rows = await statsRows(days[0], days[days.length - 1]);
  if (!rows.ok) return drawRetry(rows.message || 'PocketBase did not answer.');
  return show('/edit/stats', () => drawStats(days, done.links, rows.rows));
}

// CTR: Clicks ÷ Page Views as a percentage with one decimal, shown as computed even above 100%; "—" with no Page Views.
const ctrText = (clicks, views) => (views ? `${((clicks / views) * 100).toFixed(1)}%` : '—');
const sum = (rows, key) => rows.reduce((n, row) => n + row[key], 0);
let labelIds = 0;
const labelId = () => `stats-label-${++labelIds}`;

function card(name, value) {
  const id = labelId();
  return el('section', { className: 'stat-card', 'aria-labelledby': id }, el('h3', { id }, name), el('p', {}, String(value)));
}

// A number with its bar, `max` being the column's largest; the bar is decoration only.
function bar(n, max, kind) {
  const width = max ? Math.round((48 * n) / max) : 0;
  return [el('span', { className: `bar ${kind}`, style: `width: ${width}px`, 'aria-hidden': 'true' }), String(n)];
}

// A titled table: `rows` are [row header, ...cells], each cell a string or a list of nodes and strings.
function table(name, columns, rows) {
  const id = labelId();
  const cell = (content) => el('td', {}, ...[].concat(content));
  return [
    el('h2', { id }, name),
    el('table', { className: 'stats-table', 'aria-labelledby': id },
      el('thead', {}, el('tr', {}, ...columns.map((column) => el('th', { scope: 'col' }, column)))),
      el('tbody', {}, ...rows.map(([head, ...cells]) => el('tr', {}, el('th', { scope: 'row' }, head), ...cells.map(cell))))),
  ];
}

function drawStats(days, links, rows) {
  const views = sum(rows, 'views');
  const clicks = sum(rows, 'clicks');

  const daily = days.map((day) => {
    const of = rows.filter((row) => row.day === day);
    return [day, sum(of, 'views'), sum(of, 'clicks')];
  });
  const maxViews = Math.max(0, ...daily.map(([, v]) => v));
  const maxClicks = Math.max(0, ...daily.map(([, , c]) => c));

  // Clicks per Link, in the order Visitors see the Links; a Click whose Link is gone counts under "Deleted link" (key '').
  const names = new Map(links.map((l) => [l.id, l.title]));
  const perLink = new Map(links.map((l) => [l.id, 0]));
  for (const row of rows) {
    if (!row.clicks) continue;
    const key = names.has(row.link) ? row.link : '';
    perLink.set(key, (perLink.get(key) || 0) + row.clicks);
  }
  const linkRows = [...perLink]
    .map(([id, n]) => [names.get(id) || 'Deleted link', n])
    .sort((a, b) => b[1] - a[1]); // a stable sort keeps the Visitor order between equals

  const perCountry = new Map();
  for (const row of rows) {
    const [v, c] = perCountry.get(row.country) || [0, 0];
    perCountry.set(row.country, [v + row.views, c + row.clicks]);
  }
  const countryRows = [...perCountry]
    .sort((a, b) => b[1][0] - a[1][0] || b[1][1] - a[1][1])
    .map(([country, [v, c]]) => [country === 'XX' ? 'Unknown' : country, String(v), String(c), ctrText(c, v)]);

  render('Stats',
    creatorNav('/edit/stats'),
    el('h1', {}, 'Stats'),
    el('div', { className: 'range' }, el('span', { className: 'range-tab', 'aria-current': 'true' }, '7D'),
      el('span', { className: 'hint' }, `${days[0]} – ${days[days.length - 1]} (UTC)`)),
    ...(rows.length ? [] : [el('p', { className: 'hint' }, 'No Page Views or Clicks in this range yet.')]),
    el('div', { className: 'stat-cards' }, card('Page Views', views), card('Clicks', clicks), card('CTR', ctrText(clicks, views))),
    ...table('Daily', ['Day', 'Page Views', 'Clicks'], daily.map(([day, v, c]) => [day, bar(v, maxViews, 'views'), bar(c, maxClicks, 'clicks')])),
    ...table('Links', ['Link', 'Clicks', 'CTR'], linkRows.map(([name, n]) => [name, String(n), ctrText(n, views)])),
    ...table('Countries', ['Country', 'Page Views', 'Clicks', 'CTR'], countryRows));
}
