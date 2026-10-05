// The Link screens and the Editor's home (docs/spec/phase-03-auth-and-editor.md; tickets 26 to 29, see app.js): the Link form
// for the first-Link step, "Add link" and an opened Link, the live address, and the home with "Featured Links". The shell's
// helpers come from app.js, the Profile panel and "Quick Settings" from profile.js.

import { api, upload, el, render, message, say, select, check, fileInput, ICONS, MODE_NAMES, submitting, fieldReasons, show,
  onboard, route, address, copyButton, creatorNav, linksOf, logOut } from '../app.js';
import { drawRetry } from './auth.js';
import { profileForm, quickSettings } from './profile.js';

// The Geo Rule a textarea holds: an object, null when it is empty ("no Geo Rule"), or undefined when it is anything else. There
// is no deeper schema check (spec, Implementation Decisions, Geo Rule).
function geoRule(text) {
  if (!text.trim()) return null;
  try {
    const rule = JSON.parse(text);
    return rule && typeof rule === 'object' && !Array.isArray(rule) ? rule : undefined;
  } catch {
    return undefined;
  }
}

// A Link save's refusal, from PocketBase's answer. PocketBase names no reason when a rule refuses a write: a bare 400 for a
// create, a 404 for an update (observed on 0.40.4 for a `javascript:` Destination). The Editor sends only fields the rules allow,
// for a Link of the Creator's own Profile, so the clause left to fail is the Destination's prefix; the Editor does not
// pre-check it.
// ASSUMPTION: a bare refusal is read as the Destination's prefix, naming a Link deleted elsewhere as the other cause of a 404
// (rung 3: claimReason reads a bare 400 the same way). Overturned if another clause of the links rules can fail for the
// Editor's own request; the message then has to say less.
function linkReason(res, creating) {
  const bare = !Object.keys((res.data && res.data.data) || {}).length;
  if (bare && creating && res.status === 400) return 'PocketBase refused the Link: a Destination must start with https://, http:// or /.';
  if (bare && !creating && res.status === 404) return 'PocketBase refused the Link: a Destination must start with https://, http:// or /. If it does, the Link may have been deleted elsewhere; press Cancel.';
  return fieldReasons(res, `The save failed (${res.status}). Try again.`);
}

// The Link form, the same for the first-Link step, the Editor's "Add link" and a Link opened from "Featured Links" (`link`, the
// full record, Destination included, which its owner may read). A new Link starts on Profile default, which stores no Mode,
// and takes the highest order plus one; PocketBase gives it its Link Id. An opened Link's form is filled with its values,
// a new one's with BLANK_LINK.
// ASSUMPTION: the default Tracking Code is checked in the browser (digits only, or empty), because PocketBase's rules have no
// regular expression and the field keeps v1's values verbatim for the Import; v2's Reveal ignores any other code anyway
// (app/src/destination.js) (rung 5). Overturned if PocketBase must refuse it; the field then needs a pattern the Import meets.
const BLANK_LINK = { title: '', destination: '', icon: '', backgroundImage: '', isAdult: false, mode: '', tracking: false, defaultTrackingCode: '', geo: null };
export function drawLinkForm(profile, links, link = null) {
  const onboarding = !link && !links.length; // the first-Link step
  const current = link || BLANK_LINK;
  const title = el('input', { name: 'title', autocomplete: 'off', value: current.title });
  const destination = el('input', { name: 'destination', inputMode: 'url', autocomplete: 'off', autocapitalize: 'none', spellcheck: false, placeholder: 'https://', value: current.destination });
  // An opened Link's icon shows as the stock icon its file was made from (PocketBase keeps the sent name as the file name's
  // start, `igicon_<random>.webp`); one made from no stock icon shows as "Current icon". The icon is written only when changed.
  const stock = ICONS.find(([file]) => file && current.icon.startsWith(`${file.replace(/\.webp$/, '')}_`));
  let storedIcon = current.icon ? (stock ? stock[0] : 'current') : '';
  const icon = select('icon', storedIcon === 'current' ? [['current', 'Current icon'], ...ICONS] : ICONS, storedIcon);
  const background = fileInput('backgroundImage');
  // An opened Link with a background offers to remove it; a file picked as well replaces it instead.
  const removeBackground = current.backgroundImage ? check('removeBackground', 'Remove background') : null;
  const adult = check('isAdult', '18+ Age Gate', current.isAdult);
  const profileMode = MODE_NAMES[profile.mode] || MODE_NAMES.escape_ig;
  const mode = select('mode', [['', `Profile default (currently ${profileMode})`], ...Object.entries(MODE_NAMES)], current.mode);
  const tracking = check('tracking', 'OnlyFans tracking', current.tracking);
  const code = el('input', { name: 'defaultTrackingCode', inputMode: 'numeric', autocomplete: 'off', value: current.defaultTrackingCode });
  const geo = el('textarea', { name: 'geo', rows: 4, spellcheck: false, autocapitalize: 'none', value: current.geo == null ? '' : JSON.stringify(current.geo, null, 2) });
  const status = message();
  const order = links.length ? Math.max(...links.map((l) => Number(l.order) || 0)) + 1 : 0;
  let saved = link; // the Link being edited: the opened one, or the new one once created, so a retry does not add a second one

  const form = el('form', {
    noValidate: true,
    onsubmit: async (event) => {
      event.preventDefault();
      if (!title.value.trim()) return say(status, 'Enter a title.');
      if (!/^\d*$/.test(code.value)) return say(status, 'Default Tracking Code: digits only, or leave it empty.');
      const rule = geoRule(geo.value);
      if (rule === undefined) return say(status, 'Geo Rule: write a JSON object, such as {"US": "5"}, or leave it empty for no Geo Rule.');
      submitting(form, true);
      const fields = new FormData();
      fields.append('title', title.value.trim());
      fields.append('destination', destination.value.trim());
      fields.append('isAdult', String(adult.box.checked));
      fields.append('mode', mode.value); // empty: Profile default, no Mode stored
      fields.append('tracking', String(tracking.box.checked));
      fields.append('defaultTrackingCode', code.value);
      fields.append('geo', JSON.stringify(rule)); // "null" for none, as the v1 Import writes it
      // An empty value clears a file field, as the v1 Import clears one (app/bin/import-v1, attach).
      if (removeBackground && removeBackground.box.checked) fields.append('backgroundImage', '');
      if (!saved) {
        fields.append('profile', profile.id);
        fields.append('order', String(order));
      }
      if (icon.value !== storedIcon) {
        if (!icon.value) fields.append('icon', '');
        else {
          const file = await fetch(`/images/${icon.value}`);
          if (!file.ok) {
            submitting(form, false);
            return say(status, 'The icon could not be loaded. Try again.');
          }
          fields.append('icon', new File([await file.blob()], icon.value, { type: 'image/webp' }));
        }
      }
      const res = await api(saved ? `links/records/${saved.id}` : 'links/records', { method: saved ? 'PATCH' : 'POST', body: fields });
      if (!res.ok) {
        submitting(form, false);
        return say(status, linkReason(res, !saved));
      }
      saved = res.data;
      storedIcon = icon.value;
      const failed = background.files[0] ? (await upload('links', saved.id, 'backgroundImage', background.files[0])).error : null;
      submitting(form, false);
      if (failed) return say(status, `The Link is saved, but not its background: ${failed}`);
      if (onboarding) return show('/edit/live', () => drawLive(profile));
      return onboard();
    },
  },
  el('label', {}, 'Title', title),
  el('label', {}, 'Destination', destination),
  el('label', {}, 'Icon', icon),
  el('label', {}, 'Background image', background),
  ...(removeBackground ? [removeBackground.row] : []),
  adult.row,
  el('label', {}, 'Mode', mode),
  tracking.row,
  el('label', {}, 'Default Tracking Code', code),
  el('label', {}, 'Geo Rule', geo),
  status,
  el('button', { type: 'submit' }, 'Save link'));
  const heading = onboarding ? 'Add your first Link' : link ? 'Edit link' : 'Add link';
  const children = [el('h1', {}, heading), el('p', { className: 'hint' }, 'Where the card on your page leads.'), form];
  if (!onboarding) children.push(el('div', { className: 'actions' }, el('button', { type: 'button', className: 'secondary', onclick: route }, 'Cancel')));
  render(heading, ...children);
}

function drawLive(profile) {
  const url = address(profile);
  const status = message();
  render('Your page is live', el('h1', {}, 'Your page is live'),
    el('p', { className: 'hint' }, 'Paste this address into your Instagram or TikTok bio.'),
    el('p', { className: 'live-address' }, url),
    status,
    el('div', { className: 'actions' },
      el('a', { className: 'button', href: url, target: '_blank', rel: 'noopener' }, 'Open'),
      copyButton(url, status),
      el('button', { type: 'button', className: 'secondary', onclick: route }, 'Go to the Editor')));
}

// The Editor's home, in the Template's order: "Your Bio Link", the Profile panel ("Change Profile Picture", display name, the
// @Username read-only, bio), "Quick Settings", "Featured Links" (featuredLinks) and "Add link". Each form saves on its
// own button, with no autosave, and the last save wins. A save keeps PocketBase's answer in `profile` (saveProfile), so "Add
// link" names the default Mode just saved.
// ASSUMPTION: "Your Bio Link" shows the full public address, scheme included, so what it shows is what Copy puts on the
// clipboard (rung 5: one string; the Template shows "link.me/f_wei13" without one). Overturned if the Operator wants the
// Template's scheme-less look; only the shown text changes.
// "Change Profile Picture" is a field of the Profile panel and uploads on "Save profile", after display name and bio, as the
// Profile step does (rung 2: the spec's Contracts, "Each form saves on its own Save button, with no autosave").
// ASSUMPTION: a save keeps PocketBase's answer in the in-memory Profile, so "Add link" names the default Mode just saved
// without a re-read; a reload or Cancel re-reads it through route() (rung 5). Overturned if two tabs must see each other's saves.
// ASSUMPTION: the Profile panel refuses an empty display name, as the Profile step does, because a Profile with none sends the
// Creator back to that step at the next log-in (rung 3). Overturned if a Creator may clear their display name.
// ASSUMPTION: the @Username is a readonly field labelled "Username" with a decorative "@", not a disabled one (rung 5).
// Overturned if it must be plain text.
export function drawHome(profile, links) {
  const copied = message();
  const panel = profileForm(profile, { editor: true, button: 'Save profile', done: (status) => say(status, 'Profile saved.', 'ok') });
  const settings = quickSettings(profile);

  const featured = featuredLinks(profile, links);
  render('Edit Profile', creatorNav('/edit'), el('h1', {}, 'Edit Profile'),
    el('div', { className: 'bio-link' }, el('span', { className: 'label' }, 'Your Bio Link'), el('span', { className: 'value' }, address(profile))),
    el('div', { className: 'actions' }, copyButton(address(profile), copied)),
    copied,
    panel,
    el('h2', {}, 'Quick Settings'),
    settings,
    el('h2', {}, 'Featured Links'),
    featured.list,
    featured.status,
    el('div', { className: 'actions' }, el('button', {
      type: 'button',
      onclick: () => {
        history.pushState(null, '', '/edit/add-link');
        drawLinkForm(profile, featured.links());
      },
    }, 'Add link')),
    el('div', { className: 'actions' }, el('button', { type: 'button', className: 'secondary', onclick: logOut }, 'Log out')));
}

// "Featured Links", laid out like the Template's: one row per Link in the order Visitors see them, the title opening the Link
// form, then up and down where the Template's drag handle sits, and delete. It owns the Links it shows: `links()` answers them, so
// "Add link" takes the highest order plus one of what is there now.
// A move swaps the Link's order with its neighbour's, two writes, the moved Link first; after it, failed or not, the list is
// read again from PocketBase, so it never shows an order the page does not.
// ASSUMPTION: two Links with the same order (only the Operator or the v1 Import could write that) swap to the same values, so
// such a move changes nothing (rung 5: the Editor itself always writes distinct orders). Overturned if imported or admin-made
// Profiles carry equal orders; a move would then renumber the whole list.
function featuredLinks(profile, initial) {
  let links; // as the list shows them, set by draw
  const list = el('ul', { className: 'links', 'aria-label': 'Links' });
  const status = message();
  const buttons = () => list.querySelectorAll('button');
  const reload = async () => {
    const res = await linksOf(profile);
    if (!res.ok) return say(status, `The list could not be read again: ${res.data.message || res.status}. Reload the page.`);
    return draw(res.data.items);
  };
  const move = async (from, to) => {
    const [a, b] = [links[from], links[to]];
    for (const button of buttons()) button.disabled = true;
    const first = await api(`links/records/${a.id}?fields=id`, { method: 'PATCH', body: { order: b.order } });
    const failed = first.ok ? await api(`links/records/${b.id}?fields=id`, { method: 'PATCH', body: { order: a.order } }) : first;
    if (!failed.ok) say(status, `The move failed: ${failed.data.message || failed.status}. The list shows your page's order.`);
    await reload();
  };
  // Deleted only after the Creator confirms, in the browser's own dialog.
  // ASSUMPTION: `confirm()` rather than a confirmation drawn in the page (rung 5: no new markup; the Template has no delete
  // dialog to copy). Overturned if the Operator wants the Template's look for it.
  const remove = async (link) => {
    if (!window.confirm(`Delete “${link.title}”? It goes from your page at once.`)) return;
    for (const button of buttons()) button.disabled = true;
    const res = await api(`links/records/${link.id}`, { method: 'DELETE' });
    if (!res.ok) say(status, `The delete failed: ${res.data.message || res.status}.`);
    await reload();
  };
  function draw(items) {
    links = items;
    list.replaceChildren(...items.map((link, i) => el('li', { className: 'link-row' },
      el('button', { type: 'button', className: 'link-row-title', onclick: () => openLink(profile, links, link.id) }, link.title),
      el('button', { type: 'button', className: 'link-row-icon up', 'aria-label': `Move ${link.title} up`, disabled: i === 0, onclick: () => move(i, i - 1) }),
      el('button', { type: 'button', className: 'link-row-icon down', 'aria-label': `Move ${link.title} down`, disabled: i === items.length - 1, onclick: () => move(i, i + 1) }),
      el('button', { type: 'button', className: 'link-row-icon delete', 'aria-label': `Delete ${link.title}`, onclick: () => remove(link) }))));
  }
  draw(initial);
  return { list, status, links: () => links };
}

// A Link from "Featured Links", read in full (its Destination included, which its owner may read), in the Link form.
async function openLink(profile, links, id) {
  const res = await api(`links/records/${id}`);
  if (!res.ok) return drawRetry(res.data.message || 'PocketBase did not answer.');
  history.pushState(null, '', '/edit/link');
  return drawLinkForm(profile, links, res.data);
}
