'use strict';
// The Stats page (docs/spec/phase-04-stats.md, Stats page; tickets 33 and 34), a screen of the creator-only area at
// `/edit/stats`, next to the Editor in its navigation. Its own file so editor.js stays under 1000 lines; it is loaded first and
// calls the Editor's helpers (api, el, select, render, show, onboarded, drawRetry, creatorNav) only once editor.js has run and
// routed here. It reads the `dailyStats` view through the same-origin proxy with the Creator's token and sends no Profile
// filter, so PocketBase's list rule alone decides which rows it gets; it never asks for events. Numbers are as of page load or
// of the last range tab picked.
// Laid out after the link.me Template's analytics page (link.me/analytics.html): the range tabs with their date span, a Link
// and a Country filter that narrow every panel, three cards in place of Profile Views, Link Clicks and Engagement Rate, the
// daily panel in place of Traffic Overview, a Links table in place of Top Web Links and a Countries table in place of
// Geographic Analytics → Countries. Bars are plain elements, no chart library.
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

// The range tabs: Today, 7D (the default) and 30D, each that many UTC days ending today by the browser's clock.
const RANGES = [['Today', 1], ['7D', 7], ['30D', 30]];

// `/edit/stats` for a signed-in Creator past Onboarding (the Editor's onboarded(), which otherwise draws the step that applies):
// their Profile's Links, read the way the Editor reads them, and the 7D range for every Link and country.
async function openStats() {
  const done = await onboarded();
  if (!done) return;
  return showRange(done.links, 7, { link: '', country: '' });
}

// The range of the `n` days ending today, its rows read afresh (each tab asks only for its own days, never all history), drawn
// under `filters`: a Link's record id and a country code, '' for all.
async function showRange(links, n, filters) {
  const days = rangeDays(n);
  const rows = await statsRows(days[0], days[days.length - 1]);
  if (!rows.ok) return drawRetry(rows.message || 'PocketBase did not answer.');
  return show('/edit/stats', () => drawStats(days, links, rows.rows, filters));
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

// A labelled filter: `options` are [value, text]; choosing one calls `choose` with its value.
function filterControl(name, options, value, choose) {
  const node = select(name.toLowerCase(), options, value);
  node.addEventListener('change', () => choose(node.value));
  return el('label', { className: 'filter' }, name, node);
}

const countryName = (code) => (code === 'XX' ? 'Unknown' : code);

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

// The range's rows under the filters. Page Views belong to the Profile, so only the Country filter narrows them, and under a Link
// filter CTR is that Link's Clicks over the Profile's Page Views; Clicks are narrowed by both filters. Choosing a filter redraws
// from the rows already read.
// ASSUMPTION: the filters stay as chosen when another range tab is picked, and the Country filter keeps a chosen country that
// the new range has not seen (rung 6: the spec says which countries the filter offers, not what a tab does to it). Overturned
// if a tab should reset the filters; showRange is then called with empty ones.
function drawStats(days, links, rows, filters) {
  const viewRows = rows.filter((row) => !filters.country || row.country === filters.country);
  const clickRows = viewRows.filter((row) => !filters.link || row.link === filters.link);
  const views = sum(viewRows, 'views');
  const clicks = sum(clickRows, 'clicks');

  const daily = days.map((day) => {
    const on = (of) => of.filter((row) => row.day === day);
    return [day, sum(on(viewRows), 'views'), sum(on(clickRows), 'clicks')];
  });
  const maxViews = Math.max(0, ...daily.map(([, v]) => v));
  const maxClicks = Math.max(0, ...daily.map(([, , c]) => c));

  // Clicks per Link, in the order Visitors see the Links; a Click whose Link is gone counts under "Deleted link" (key '').
  const names = new Map(links.map((l) => [l.id, l.title]));
  const perLink = new Map(links.filter((l) => !filters.link || l.id === filters.link).map((l) => [l.id, 0]));
  for (const row of clickRows) {
    if (!row.clicks) continue;
    const key = names.has(row.link) ? row.link : '';
    perLink.set(key, (perLink.get(key) || 0) + row.clicks);
  }
  const linkRows = [...perLink]
    .map(([id, n]) => [names.get(id) || 'Deleted link', n])
    .sort((a, b) => b[1] - a[1]); // a stable sort keeps the Visitor order between equals

  // Page Views and Clicks per country; a row adds a country only for the number it holds under the filters.
  const perCountry = new Map();
  const add = (country, v, c) => {
    const [v0, c0] = perCountry.get(country) || [0, 0];
    perCountry.set(country, [v0 + v, c0 + c]);
  };
  for (const row of viewRows) if (row.views) add(row.country, row.views, 0);
  for (const row of clickRows) if (row.clicks) add(row.country, 0, row.clicks);
  const countryRows = [...perCountry]
    .sort((a, b) => b[1][0] - a[1][0] || b[1][1] - a[1][1])
    .map(([country, [v, c]]) => [countryName(country), String(v), String(c), ctrText(c, v)]);

  // The Country filter offers each country seen in the range, and the chosen one.
  const seen = [...new Set([...rows.map((row) => row.country), filters.country].filter(Boolean))].sort();
  const redraw = (change) => drawStats(days, links, rows, { ...filters, ...change });

  render('Stats',
    creatorNav('/edit/stats'),
    el('h1', {}, 'Stats'),
    el('div', { className: 'range' },
      ...RANGES.map(([name, n]) => el('button', {
        type: 'button', className: 'range-tab', 'aria-pressed': String(n === days.length), onclick: () => showRange(links, n, filters),
      }, name)),
      el('span', { className: 'hint' }, days.length === 1 ? `${days[0]} (UTC)` : `${days[0]} – ${days[days.length - 1]} (UTC)`)),
    el('div', { className: 'filters' },
      filterControl('Link', [['', 'All Links'], ...links.map((l) => [l.id, l.title])], filters.link, (link) => redraw({ link })),
      filterControl('Country', [['', 'All countries'], ...seen.map((c) => [c, countryName(c)])], filters.country, (country) => redraw({ country }))),
    ...(rows.length ? [] : [el('p', { className: 'hint' }, 'No Page Views or Clicks in this range yet.')]),
    el('div', { className: 'stat-cards' }, card('Page Views', views), card('Clicks', clicks), card('CTR', ctrText(clicks, views))),
    ...table('Daily', ['Day', 'Page Views', 'Clicks'], daily.map(([day, v, c]) => [day, bar(v, maxViews, 'views'), bar(c, maxClicks, 'clicks')])),
    ...table('Links', ['Link', 'Clicks', 'CTR'], linkRows.map(([name, n]) => [name, String(n), ctrText(n, views)])),
    ...table('Countries', ['Country', 'Page Views', 'Clicks', 'CTR'], countryRows));
}
