// The Link screens and the Editor's home (docs/spec/phase-03-auth-and-editor.md; tickets 26 to 29, see app.js): the Link form
// for the first-Link step, "Add link" and an opened Link, the live address, and the home with the Links list. The shell's
// helpers come from app.js, the Profile card and "Quick Settings" from profile.js. The layout and class names are the design
// brief's (docs/spec/editor-redesign.md, sections 4.9 to 4.12 and 5, as ruled in section 11).

import { api, upload, el, render, message, say, select, check, fileInput, ICONS, MODE_NAMES, submitting, fieldReasons, show,
  onboard, route, address, copyButton, creatorNav, linksOf, logOut, card, field, steps, icon, pageTitle, switcher, link as navLink } from '../app.js';
import { drawRetry } from './auth.js';
import { profileForm, quickSettings } from './profile.js';

// ---- Pieces the screens below share -------------------------------------------------------------------------------------

// The shell's switch row, named by its label text alone, with its hint under the row (a hint's words never join a control's
// accessible name: the 18+ hint says "Mode", and the Mode select is found by its label).
function toggle(name, text, hint, checked = false) {
  const { box, row } = check(name, text, checked);
  box.setAttribute('aria-describedby', `link-${name}-help`);
  return { box, row: el('div', { className: 'e-field' }, row, el('p', { className: 'e-switch__hint', id: `link-${name}-help` }, hint)) };
}

// ---- The Link form ------------------------------------------------------------------------------------------------------

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

// A Link save's refusal, from PocketBase's answer, as [the reason, the names of the fields it is about]. PocketBase names no
// reason when a rule refuses a write: a bare 400 for a create, a 404 for an update (observed on 0.40.4 for a `javascript:`
// Destination). The Editor sends only fields the rules allow, for a Link of the Creator's own Profile, so the clause left to
// fail is the Destination's prefix; the Editor does not pre-check it.
// ASSUMPTION: a bare refusal is read as the Destination's prefix, naming a Link deleted elsewhere as the other cause of a 404
// (rung 3: claimReason reads a bare 400 the same way). Overturned if another clause of the links rules can fail for the
// Editor's own request; the message then has to say less.
const DESTINATION_REFUSED = 'This Link was not saved: a Destination must start with https://, http:// or /.';
function linkReason(res, creating) {
  const fields = Object.keys((res.data && res.data.data) || {});
  if (!fields.length && creating && res.status === 400) return [DESTINATION_REFUSED, ['destination']];
  if (!fields.length && !creating && res.status === 404) {
    return [`${DESTINATION_REFUSED} If it does, the Link may have been deleted in another tab: press Cancel.`, ['destination']];
  }
  return [fieldReasons(res, `The save failed (${res.status}). Try again.`), fields];
}

// The Link form, the same for the first-Link step (`onboarding`, from the router's Onboarding rule), the Editor's "Add link"
// and a Link opened from the Links list (`link`, the full record, Destination included, which its owner may read). The
// first-Link step shows "Step 4 of 5", has no Cancel and goes on to the live address. A new Link starts on Profile default,
// which stores no Mode, and takes the highest order plus one; PocketBase gives it its Link Id. An opened Link's form is filled
// with its values, a new one's with BLANK_LINK.
// Its own screen (the brief's ruling 4): the document scrolls, and "Save link", Cancel beside it, and the screen's one status
// line sit in the foot, which the stylesheet keeps at the bottom of a phone's screen. The foot is outside the form, its "Save
// link" tied to the form by its `form` attribute, so a save in progress disables "Save link" but never Cancel.
// OnlyFans tracking, Default Tracking Code and Geo Rule sit in "Tracking and Geo Rule", a disclosure open when one of them holds
// a value or a message names one of them, closed otherwise.
// ASSUMPTION: the default Tracking Code is checked in the browser (digits only, or empty), because PocketBase's rules have no
// regular expression and the field keeps v1's values verbatim for the Import; v2's Reveal ignores any other code anyway
// (app/src/destination.js) (rung 5). Overturned if PocketBase must refuse it; the field then needs a pattern the Import meets.
const BLANK_LINK = { title: '', destination: '', icon: '', backgroundImage: '', isAdult: false, mode: '', tracking: false, defaultTrackingCode: '', geo: null };
export function drawLinkForm(profile, links, { link = null, onboarding = false } = {}) {
  const current = link || BLANK_LINK;
  const title = el('input', { className: 'e-input', name: 'title', autocomplete: 'off', value: current.title });
  const destination = el('input', { className: 'e-input', name: 'destination', inputMode: 'url', autocomplete: 'off', autocapitalize: 'none', spellcheck: false, placeholder: 'https://', value: current.destination });
  // An opened Link's icon shows as the stock icon its file was made from (PocketBase keeps the sent name as the file name's
  // start, `igicon_<random>.webp`); one made from no stock icon shows as "Current icon". The icon is written only when changed.
  const stock = ICONS.find(([file]) => file && current.icon.startsWith(`${file.replace(/\.webp$/, '')}_`));
  let storedIcon = current.icon ? (stock ? stock[0] : 'current') : '';
  const iconPick = select('icon', storedIcon === 'current' ? [['current', 'Current icon'], ...ICONS] : ICONS, storedIcon);
  // The chosen icon's image beside the select: the stock file, or the Link's own for "Current icon".
  const preview = el('img', { className: 'e-field__preview', alt: '', width: 44, height: 44 });
  const showIcon = () => {
    const src = iconPick.value === 'current' ? `/api/files/links/${current.id}/${current.icon}` : iconPick.value && `/images/${iconPick.value}`;
    preview.hidden = !src;
    if (src) preview.src = src;
  };
  iconPick.addEventListener('change', showIcon);
  showIcon();
  const iconField = field('link-icon', 'Icon', iconPick);
  const iconRow = el('div', { className: 'e-field__row' });
  iconPick.replaceWith(iconRow);
  iconRow.append(iconPick, preview);
  const background = fileInput('backgroundImage');
  // An opened Link with a background offers to remove it; a file picked as well replaces it instead.
  const removeBackground = current.backgroundImage ? toggle('removeBackground', 'Remove background', 'Picking a new image replaces it instead.') : null;
  const adult = toggle('isAdult', '18+ Age Gate', 'Visitors who tap it on your page confirm they are 18 or older first. Works with any Mode.', current.isAdult);
  const profileMode = MODE_NAMES[profile.mode] || MODE_NAMES.escape_ig;
  // Deeplink at open is a Profile default only (ADR 0003, amended 2026-10-06), so a Link is never offered it.
  const linkModes = Object.entries(MODE_NAMES).filter(([value]) => value !== 'deeplink_open');
  const mode = select('mode', [['', `Profile default (currently ${profileMode})`], ...linkModes], current.mode);
  const tracking = toggle('tracking', 'OnlyFans tracking', 'Adds a Tracking Code to the address so OnlyFans credits each subscriber to its source.', current.tracking);
  const code = el('input', { className: 'e-input', name: 'defaultTrackingCode', inputMode: 'numeric', autocomplete: 'off', value: current.defaultTrackingCode });
  const geo = el('textarea', { className: 'e-textarea e-textarea--code', name: 'geo', rows: 4, spellcheck: false, autocapitalize: 'none', value: current.geo == null ? '' : JSON.stringify(current.geo, null, 2) });
  const more = el('details', { className: 'e-more', open: Boolean(current.tracking || current.defaultTrackingCode || current.geo != null) },
    // The summary's name is "Tracking and Geo Rule" alone: its helper line is for the eye (each field inside has its own hint).
    el('summary', { className: 'e-more__summary' }, el('span', {}, 'Tracking and Geo Rule'), ' ',
      el('span', { className: 'e-more__hint', 'aria-hidden': 'true' }, 'Only for OnlyFans Links.')),
    tracking.row,
    field('link-tracking-code', 'Default Tracking Code', code, { hint: 'Digits only. Used when no other code applies.' }),
    field('link-geo', 'Geo Rule', geo, { hint: 'Advanced: Tracking Codes per country as JSON, e.g. {"US": "5"}. Leave it empty for none.' }));
  const status = message();
  const order = links.length ? Math.max(...links.map((l) => Number(l.order) || 0)) + 1 : 0;
  let saved = link; // the Link being edited: the opened one, or the new one once created, so a retry does not add a second one

  // A refusal: the reason in the foot, in view, every field as typed; the fields it names are marked, inside the disclosure
  // opened.
  const named = { title, destination, tracking: tracking.box, defaultTrackingCode: code, geo };
  const refuse = (text, fields = []) => {
    for (const name of fields) {
      if (!named[name]) continue;
      named[name].setAttribute('aria-invalid', 'true');
      if (more.contains(named[name])) more.open = true;
    }
    say(status, text);
    status.scrollIntoView({ block: 'nearest' });
  };

  const form = el('form', {
    className: 'e-sheet__body',
    id: 'link-form',
    noValidate: true,
    onsubmit: async (event) => {
      event.preventDefault();
      for (const control of Object.values(named)) control.removeAttribute('aria-invalid');
      if (!title.value.trim()) return refuse('Enter a title.', ['title']);
      if (!/^\d*$/.test(code.value)) return refuse('Default Tracking Code: digits only, or leave it empty.', ['defaultTrackingCode']);
      const rule = geoRule(geo.value);
      if (rule === undefined) return refuse('Geo Rule: write a JSON object, such as {"US": "5"}, or leave it empty for no Geo Rule.', ['geo']);
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
      if (iconPick.value !== storedIcon) {
        if (!iconPick.value) fields.append('icon', '');
        else {
          const file = await fetch(`/images/${iconPick.value}`).catch(() => null);
          if (!file || !file.ok) {
            submitting(form, false);
            return refuse('The icon could not be loaded. Try again.');
          }
          fields.append('icon', new File([await file.blob()], iconPick.value, { type: 'image/webp' }));
        }
      }
      const res = await api(saved ? `links/records/${saved.id}` : 'links/records', { method: saved ? 'PATCH' : 'POST', body: fields });
      if (!res.ok) {
        submitting(form, false);
        return refuse(...linkReason(res, !saved));
      }
      saved = res.data;
      storedIcon = iconPick.value;
      const failed = background.files[0] ? (await upload('links', saved.id, 'backgroundImage', background.files[0])).error : null;
      submitting(form, false);
      if (failed) return refuse(`The Link is saved, but not its background: ${failed}`);
      if (onboarding) return show('/edit/live', () => drawLive(profile));
      return onboard();
    },
  },
  field('link-title', 'Title', title, { hint: 'What Visitors read on the card.' }),
  field('link-destination', 'Destination', destination, { hint: 'Where the Link leads. Starts with https://, http:// or /.' }),
  iconField,
  field('link-background', 'Background image', background, { hint: 'Any photo: jpg, png, heic, gif or webp. Shown behind the title.' }),
  ...(removeBackground ? [removeBackground.row] : []),
  adult.row,
  field('link-mode', 'Mode', mode, { hint: 'How a tap leaves Instagram or TikTok. Not sure? Keep Profile default.' }),
  more);
  const save = el('button', { type: 'submit', className: 'e-btn e-btn--primary' }, 'Save link');
  save.setAttribute('form', form.id);
  const foot = el('div', { className: 'e-sheet__foot' }, status, save);
  if (!onboarding) foot.append(el('button', { type: 'button', className: 'e-btn e-btn--secondary', onclick: route }, 'Cancel'));
  const heading = onboarding ? 'Add your first Link' : link ? 'Edit link' : 'Add link';
  render(heading, el('div', { className: 'e-sheet' },
    el('div', { className: 'e-sheet__head' }, ...(onboarding ? [steps(4)] : []), pageTitle(heading),
      el('p', { className: 'e-page__lead' }, 'Where the card on your page leads.')),
    form,
    foot));
}

// The live address after the first Link, with Open, Copy and the way on to the Editor.
function drawLive(profile) {
  const url = address(profile);
  const status = message();
  render('Your page is live', el('div', { className: 'e-card' },
    steps(5),
    pageTitle('Your page is live'),
    el('p', { className: 'e-page__lead' }, 'Paste this address into your Instagram or TikTok bio.'),
    el('p', { className: 'live-address e-live__address', 'data-test': 'live-address' }, url),
    el('div', { className: 'e-live__actions' },
      el('a', { className: 'e-btn e-btn--primary', href: url, target: '_blank', rel: 'noopener' }, 'Open'),
      copyButton(url, status)),
    status,
    el('button', { type: 'button', className: 'e-btn e-btn--ghost e-btn--block', onclick: route }, 'Go to the Editor')));
}

// ---- The Editor's home --------------------------------------------------------------------------------------------------

// The Editor's home, "Edit Profile", stacked cards (the brief's ruling 1): the Profile switcher (Phase 6, app.js), the jump
// chips, "Your Bio Link" with Copy, Open and "Domain" (Phase 6's Custom Domain screen, `/edit/domain`),
// Links (the list and "Add link"), Profile (display name, bio, picture, the @Username read-only), "Quick Settings" (the default
// Mode), then "Log out". Each form saves on its own button, with no autosave, and the last save wins. A save keeps
// PocketBase's answer in `profile` (saveProfile), so "Add link" names the default Mode just saved.
// ASSUMPTION: "Your Bio Link" shows the full public address, scheme included, so what it shows is what Copy puts on the
// clipboard (rung 5: one string; the Template shows "link.me/f_wei13" without one). Overturned if the Operator wants the
// Template's scheme-less look; only the shown text changes.
// "Change Profile Picture" is a field of the Profile card and uploads on "Save profile", after display name and bio, as the
// Profile step does (rung 2: the spec's Contracts, "Each form saves on its own Save button, with no autosave").
// ASSUMPTION: a save keeps PocketBase's answer in the in-memory Profile, so "Add link" names the default Mode just saved
// without a re-read; a reload or Cancel re-reads it through route() (rung 5). Overturned if two tabs must see each other's saves.
// ASSUMPTION: the Profile card refuses an empty display name, as the Profile step does, because a Profile with none sends the
// Creator back to that step at the next log-in (rung 3). Overturned if a Creator may clear their display name.
export function drawHome(profile, links) {
  const url = address(profile);
  const copied = message();
  const section = (id, heading, ...children) => Object.assign(card(heading, ...children), { id });
  const domain = navLink('Domain', '/edit/domain');
  domain.className = 'e-btn e-btn--ghost';
  render('Edit Profile', creatorNav('/edit'), pageTitle('Edit Profile'),
    switcher(profile),
    jumpChips(),
    el('div', { className: 'bio-link e-card e-biolink', 'data-test': 'bio-link' },
      el('span', { className: 'label e-biolink__label', 'data-test': 'bio-link-label' }, 'Your Bio Link'),
      el('span', { className: 'value e-biolink__address', 'data-test': 'bio-link-value' }, url),
      el('div', { className: 'e-biolink__actions' },
        copyButton(url, copied),
        el('a', { className: 'e-btn e-btn--ghost', href: url, target: '_blank', rel: 'noopener' }, 'Open'),
        domain),
      copied),
    linksCard(profile, links),
    section('profile', 'Profile', profileForm(profile, { editor: true, button: 'Save profile', done: (status) => say(status, 'Profile saved.', 'ok') })),
    section('modes', 'Quick Settings', quickSettings(profile)),
    el('button', { type: 'button', className: 'e-btn e-btn--ghost', onclick: logOut }, 'Log out'));
}

// The chips under the h1: plain in-page links to the cards (the router leaves a jump within the screen alone).
function jumpChips() {
  const chip = (id, text) => el('a', { className: 'e-chips__item', href: `#${id}`, 'data-test': `jump-${id}` }, text);
  return el('nav', { className: 'e-chips', 'aria-label': 'Sections' }, chip('links', 'Links'), chip('profile', 'Profile'), chip('modes', 'Modes'));
}

// The Links card (`#links`, the "Links" chip's target): "Add link", then the list, laid out like the Template's: one row per
// Link in the order Visitors see them, up and down where the Template's drag handle sits, the title opening the Link form, then
// delete. It owns the Links it shows: "Add link" takes the highest order plus one of what is there now.
// A move swaps the Link's order with its neighbour's, two writes, the moved Link first; after it, failed or not, the list is
// read again from PocketBase, so it never shows an order the page does not. Focus then goes back to the moved Link's button for
// the same direction, or to its title when that button is now disabled, or to "Add link" when the list could not be read again
// (its buttons stay disabled).
// ASSUMPTION: two Links with the same order (only the Operator or the v1 Import could write that) swap to the same values, so
// such a move changes nothing (rung 5: the Editor itself always writes distinct orders). Overturned if imported or admin-made
// Profiles carry equal orders; a move would then renumber the whole list.
function linksCard(profile, initial) {
  let links; // as the list shows them, set by draw
  let rows = []; // each Link's row buttons, in list order
  const list = el('ul', { className: 'links e-list', 'aria-label': 'Links' });
  const empty = el('div', { className: 'e-empty', hidden: true },
    el('span', { className: 'e-empty__icon', 'aria-hidden': 'true' }, icon('links')),
    el('p', { className: 'e-empty__title' }, 'No Links yet'),
    el('p', { className: 'e-empty__text' }, 'Add one so Visitors have something to tap.'));
  const status = message();
  const confirm = deleteDialog();
  const add = el('button', {
    type: 'button',
    className: 'e-btn e-btn--primary e-btn--block',
    onclick: () => {
      history.pushState(null, '', '/edit/add-link');
      drawLinkForm(profile, links);
    },
  }, icon('plus'), 'Add link');
  const busy = () => {
    for (const button of list.querySelectorAll('button')) button.disabled = true;
  };
  const focus = (button) => (button && !button.disabled ? button : add).focus();
  const reload = async () => {
    const res = await linksOf(profile);
    if (!res.ok) return say(status, `The list could not be read again: ${res.data.message || res.status}. Reload the page.`);
    return draw(res.data.items);
  };
  const move = async (from, to, way) => {
    const [a, b] = [links[from], links[to]];
    busy();
    const first = await api(`links/records/${a.id}?fields=id`, { method: 'PATCH', body: { order: b.order } });
    const failed = first.ok ? await api(`links/records/${b.id}?fields=id`, { method: 'PATCH', body: { order: a.order } }) : first;
    if (!failed.ok) say(status, `The move failed: ${failed.data.message || failed.status}. The list shows your page's order.`);
    await reload();
    const row = rows[links.findIndex((l) => l.id === a.id)];
    if (row) focus(row[way].disabled ? row.title : row[way]);
  };
  // Deleted only after the Creator confirms in the page's dialog. "Keep it" (or Esc) hands focus back to the Delete button;
  // after a delete it goes to the Link now in that place, or to "Add link" when none is left or the list could not be read again.
  const remove = async (link, i) => {
    if (!(await confirm.ask(link.title))) return rows[i].remove.focus();
    busy();
    const res = await api(`links/records/${link.id}`, { method: 'DELETE' });
    if (!res.ok) say(status, `The delete failed: ${res.data.message || res.status}.`);
    await reload();
    const next = rows[Math.min(i, rows.length - 1)];
    return focus(next && next.title);
  };
  function draw(items) {
    links = items;
    rows = items.map((link, i) => ({
      up: el('button', { type: 'button', className: 'e-btn e-btn--icon e-row__move', 'aria-label': `Move ${link.title} up`, disabled: i === 0, onclick: () => move(i, i - 1, 'up') }, icon('up')),
      down: el('button', { type: 'button', className: 'e-btn e-btn--icon e-row__move', 'aria-label': `Move ${link.title} down`, disabled: i === items.length - 1, onclick: () => move(i, i + 1, 'down') }, icon('down')),
      title: el('button', { type: 'button', className: 'e-row__title', onclick: () => openLink(profile, links, link.id) }, link.title),
      remove: el('button', { type: 'button', className: 'e-btn e-btn--icon e-row__delete', 'aria-label': `Delete ${link.title}`, onclick: () => remove(link, i) }, icon('trash')),
    }));
    list.replaceChildren(...rows.map((row) => el('li', { className: 'e-row' }, el('div', { className: 'e-row__handle' }, row.up, row.down), row.title, row.remove)));
    empty.hidden = items.length > 0;
  }
  draw(initial);
  return Object.assign(card('Links', add, list, empty, status, confirm.dialog), { id: 'links' });
}

// The delete confirmation (P3 s38: delete asks first), a modal dialog drawn in the page. `ask(title)` opens it and answers
// whether the Creator chose "Delete link"; "Keep it" has focus first, and it or Esc closes the dialog with nothing changed.
function deleteDialog() {
  const text = el('p', { className: 'e-dialog__text', id: 'delete-text' });
  const dialog = el('dialog', { className: 'e-dialog', role: 'alertdialog', 'aria-labelledby': 'delete-title', 'aria-describedby': 'delete-text', 'data-test': 'delete-dialog' },
    el('h2', { className: 'e-dialog__title', id: 'delete-title' }, 'Delete this link?'),
    text,
    el('div', { className: 'e-dialog__actions' },
      el('button', { type: 'button', className: 'e-btn e-btn--danger', 'data-test': 'delete-confirm', onclick: () => dialog.close('delete') }, 'Delete link'),
      el('button', { type: 'button', className: 'e-btn e-btn--secondary', autofocus: true, 'data-test': 'delete-cancel', onclick: () => dialog.close() }, 'Keep it')));
  const ask = (title) => new Promise((resolve) => {
    text.textContent = `“${title}” goes from your page at once.`;
    dialog.returnValue = '';
    dialog.addEventListener('close', () => resolve(dialog.returnValue === 'delete'), { once: true });
    dialog.showModal();
  });
  return { dialog, ask };
}

// A Link from the list, read in full (its Destination included, which its owner may read), in the Link form.
async function openLink(profile, links, id) {
  const res = await api(`links/records/${id}`);
  if (!res.ok) return drawRetry(res.data.message);
  history.pushState(null, '', '/edit/link');
  return drawLinkForm(profile, links, { link: res.data });
}
