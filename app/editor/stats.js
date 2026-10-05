// The Stats page (docs/spec/phase-04-stats.md, Stats page; tickets 33 and 34), a screen of the creator-only area at
// `/edit/stats`, next to the Editor in its navigation. Its own module: it imports the Editor's helpers (api, el, select, render,
// show, onboarded, creatorNav, pageTitle from app.js; drawRetry from screens/auth.js), and app.js's router calls openStats. It reads the
// `dailyStats` view through the same-origin proxy with the Creator's token and sends no Profile
// filter, so PocketBase's list rule alone decides which rows it gets; it never asks for events. Numbers are as of page load or
// of the last range tab picked.
// Laid out after the link.me Template's analytics page (link.me/analytics.html): the range tabs with their date span, a Link
// and a Country filter that narrow every panel, three cards in place of Profile Views, Link Clicks and Engagement Rate, the
// daily panel in place of Traffic Overview, a Links table in place of Top Web Links and a Countries table in place of
// Geographic Analytics → Countries. Bars are plain elements, no chart library.
// Every number sits under an accessible label: a card's heading names its region, a table's cells sit under column headers.
// Styled by the redesign brief (docs/spec/editor-redesign.md, 4.15 and ruling 8) with the `e-` classes in stats.css: the range
// tabs a segmented group, the filters two fields, three stat cards, and each table in a card whose wrapper scrolls sideways
// when the table is wider than the screen, so the page itself never does.
// ASSUMPTION: the Links table lists every Link of the Creator's, those with no Click in the range at 0, plus "Deleted link" once
// a deleted Link's Clicks are in the range (rung 6: the spec fixes the columns and the order, not which Links show). Overturned
// if only Links with Clicks should show, as the Countries table shows only countries seen.

import { api, el, select, render, show, onboarded, creatorNav, pageTitle } from './app.js';
import { drawRetry } from './screens/auth.js';

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
export async function openStats() {
  const done = await onboarded();
  if (!done) return;
  return showRange(done.links, 7, { link: '', country: '' });
}

// The range of the `n` days ending today, its rows read afresh (each tab asks only for its own days, never all history), drawn
// under `filters`: a Link's record id and a country code, '' for all. `refocus`, a selector, names the control to focus once
// drawn: the range tab the Creator picked.
async function showRange(links, n, filters, refocus) {
  const days = rangeDays(n);
  const rows = await statsRows(days[0], days[days.length - 1]);
  if (location.pathname.replace(/\/+$/, '') !== '/edit/stats') return undefined; // Back or a link left Stats while it loaded
  if (!rows.ok) return drawRetry(rows.message);
  return show('/edit/stats', () => drawStats(days, links, rows.rows, filters, refocus));
}

// CTR: Clicks ÷ Page Views as a percentage with one decimal, shown as computed even above 100%; "—" with no Page Views.
const ctrText = (clicks, views) => (views ? `${((clicks / views) * 100).toFixed(1)}%` : '—');
const sum = (rows, key) => rows.reduce((n, row) => n + row[key], 0);
let labelIds = 0;
const labelId = () => `stats-label-${++labelIds}`;

// A stat card, its h2 the region's name (h2, as the tables' titles: no heading level is skipped under the page's h1).
function card(name, value) {
  const id = labelId();
  return el('section', { className: 'e-stat', 'aria-labelledby': id },
    el('h2', { className: 'e-stat__label', id }, name), el('p', { className: 'e-stat__value' }, String(value)));
}

// A number with its bar, `max` being the column's largest; the bar is decoration only, its length the share `--w` of a full
// bar (stats.css).
function bar(n, max, kind) {
  const share = max ? n / max : 0;
  return [el('span', { className: `e-bar e-bar--${kind}`, style: `--w: ${share}`, 'aria-hidden': 'true' }), String(n)];
}

// A labelled filter: `options` are [value, text]; choosing one calls `choose` with its value.
function filterControl(name, options, value, choose) {
  const node = select(name.toLowerCase(), options, value);
  node.id = `stats-${node.name}`;
  node.addEventListener('change', () => choose(node.value));
  return el('div', { className: 'e-field' }, el('label', { className: 'e-field__label', htmlFor: node.id }, name), node);
}

const countryName = (code) => (code === 'XX' ? 'Unknown' : code);

// A titled table in its card: `rows` are [row header, ...cells], each cell a string or a list of nodes and strings. The table
// sits in a wrapper that scrolls sideways if it is wider than the card; the wrapper is focusable, so the keyboard can scroll it,
// and is a region named by the table's h2. Row headers stay on one line unless `wrap` (Link titles, which can be long).
function table(name, columns, rows, wrap = false) {
  const id = labelId();
  const cell = (content) => el('td', {}, ...[].concat(content));
  return el('div', { className: 'e-card e-table-card' },
    el('h2', { className: 'e-table-card__title', id }, name),
    el('div', { className: 'e-table-wrap', role: 'region', 'aria-labelledby': id, tabIndex: 0 },
      el('table', { className: wrap ? 'e-table e-table--wrap' : 'e-table', 'aria-labelledby': id },
        el('thead', {}, el('tr', {}, ...columns.map((column) => el('th', { scope: 'col' }, column)))),
        el('tbody', {}, ...rows.map(([head, ...cells]) => el('tr', {}, el('th', { scope: 'row' }, head), ...cells.map(cell)))))));
}

// After a redraw, which replaces every node, the control the Creator just used (a selector) has the focus again.
function focusAgain(selector) {
  if (selector) document.querySelector(`#screen ${selector}`)?.focus();
}

// The range's rows under the filters. Page Views belong to the Profile, so only the Country filter narrows them, and under a Link
// filter CTR is that Link's Clicks over the Profile's Page Views; Clicks are narrowed by both filters. Choosing a filter redraws
// from the rows already read.
// ASSUMPTION: the filters stay as chosen when another range tab is picked, and the Country filter keeps a chosen country that
// the new range has not seen (rung 6: the spec says which countries the filter offers, not what a tab does to it). Overturned
// if a tab should reset the filters; showRange is then called with empty ones.
function drawStats(days, links, rows, filters, refocus) {
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
  const redraw = (change, control) => drawStats(days, links, rows, { ...filters, ...change }, `select[name="${control}"]`);

  // A range tab says it is busy until its rows arrive; only then is it drawn pressed.
  const rangeTab = ([name, n], i) => el('button', {
    type: 'button',
    className: 'e-segmented__btn',
    'aria-pressed': String(n === days.length),
    onclick: (event) => {
      event.currentTarget.setAttribute('aria-busy', 'true');
      showRange(links, n, filters, `.e-segmented__btn:nth-child(${i + 1})`);
    },
  }, name);

  // A redraw for a filter or a range tab keeps the scroll and does not move the focus to the h1 (`focus: false`); focusAgain()
  // returns it to the control used. The first draw is a screen change and focuses the h1 as every screen does.
  render('Stats',
    creatorNav('/edit/stats'),
    pageTitle('Stats'),
    el('p', { className: 'e-page__lead' }, 'Page Views, Clicks and CTR for your page.'),
    el('div', { className: 'e-range' },
      el('div', { className: 'e-segmented', role: 'group', 'aria-label': 'Range' }, ...RANGES.map(rangeTab)),
      el('span', { className: 'e-range__span' }, days.length === 1 ? `${days[0]} (UTC)` : `${days[0]} – ${days[days.length - 1]} (UTC)`)),
    el('div', { className: 'e-filters' },
      filterControl('Link', [['', 'All Links'], ...links.map((l) => [l.id, l.title])], filters.link, (link) => redraw({ link }, 'link')),
      filterControl('Country', [['', 'All countries'], ...seen.map((c) => [c, countryName(c)])], filters.country, (country) => redraw({ country }, 'country'))),
    ...(rows.length ? [] : [el('p', { className: 'e-empty' }, 'No Page Views or Clicks in this range yet.')]),
    el('div', { className: 'e-stats' }, card('Page Views', views), card('Clicks', clicks), card('CTR', ctrText(clicks, views))),
    table('Daily', ['Day', 'Page Views', 'Clicks'], daily.map(([day, v, c]) => [day, bar(v, maxViews, 'views'), bar(c, maxClicks, 'clicks')])),
    el('div', { className: 'e-tables' },
      table('Links', ['Link', 'Clicks', 'CTR'], linkRows.map(([name, n]) => [name, String(n), ctrText(n, views)]), true),
      table('Countries', ['Country', 'Page Views', 'Clicks', 'CTR'], countryRows)),
    { focus: !refocus });
  focusAgain(refocus);
}
