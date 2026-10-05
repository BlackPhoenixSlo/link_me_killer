// The Domain screen at `/edit/domain` (docs/spec/phase-06-sites-and-domains.md, § 3 Option 1, Creator flow and screen copy;
// ticket 7): the current Profile's Custom Domain, added, checked and removed by its Creator. Three states, read from the
// Profile's one `customDomains` record: none (the "Add domain" form), pending (the records to set, from the check route, and
// "Check now") and live (Open, Copy, "Remove domain"). Only the app's check route sets a domain live (app/server.js,
// `POST /api/domain-check/:id`), and the records it answers are the ones shown, so the screen never hard-codes the VPS address.
// The shell's helpers come from app.js; no class here is new (editor.css, stats.css).
// ASSUMPTION: a pending domain can be removed too, with the same confirmation, because one domain per Profile means a typo can
// only be undone that way (rung 4). Overturned if the Operator wants pending records to expire instead.
// ASSUMPTION: opening the screen on a pending domain runs the check once, for its records, and says nothing of its problems
// until "Check now" is pressed; a domain whose DNS is already right goes live then (rung 5: one call answers both).
// Overturned if the records must show without a DNS lookup; the route would then need a records-only answer.

import { api, post, el, render, message, say, submitting, card, field, copyButton, creatorNav, pageTitle, fieldReasons, route,
  NO_ANSWER } from '../app.js';
import { drawRetry } from './auth.js';

const TOO_MANY = 'Too many checks from your connection. Wait a minute, then try again.';
const checkFailed = (status) => (status ? `The check failed (${status}). Try again.` : NO_ANSWER);

// An example domain made from the Username (underscores are not allowed in a hostname).
const exampleOf = (profile) => `${profile.username.replace(/_/g, '') || 'yourname'}.com`;

// The check route, called with the Creator's token: { ok, status, data: { status, problems, records } }.
async function check(record) {
  const res = await post(`/api/domain-check/${record.id}`);
  if (!res) return { ok: false, status: 0 };
  let data = {};
  try {
    data = await res.json();
  } catch {
    // an empty answer
  }
  return { ok: res.ok, status: res.status, data };
}

// The screen's frame: the h1, the lead, the state's card, and the forwarding note at the foot.
function draw(profile, domain, stateCard) {
  render('Use your own domain',
    creatorNav('/edit/domain'),
    pageTitle('Use your own domain'),
    el('p', { className: 'e-page__lead' }, `Show @${profile.username} at an address you own, like ${exampleOf(profile)}. You need to be able to change your domain's DNS records (where you bought it, or at Cloudflare).`),
    stateCard,
    el('p', { className: 'e-field__hint' }, `Only want ${domain || exampleOf(profile)} to forward to ${location.host}/${profile.username}? Set up URL forwarding where you bought the domain. You don't need to add it here.`));
}

// The current Profile's Custom Domain screen, in the state its `record` is in: onboarded()'s read on the way in (null for none,
// undefined when PocketBase did not answer), or the screen's own answer after an add or a removal. `said` is a line for the
// status (after a removal).
export async function drawDomain(profile, record, said = '') {
  if (record === undefined) return drawRetry();
  if (record && record.status === 'live') return drawLive(profile, record);
  if (!record) return drawAdd(profile, said);
  const checked = await check(record);
  if (!checked.ok) return drawRetry(checked.status === 429 ? TOO_MANY : checkFailed(checked.status));
  if (checked.data.status === 'live') return drawLive(profile, record);
  return drawPending(profile, record, checked.data.records);
}

// None yet: the "Add domain" form. The domain is sent lower-cased and trimmed; PocketBase checks its form.
function drawAdd(profile, said) {
  const input = el('input', { className: 'e-input', name: 'domain', type: 'text', inputMode: 'url', autocomplete: 'off',
    autocapitalize: 'none', spellcheck: false, placeholder: exampleOf(profile) });
  const status = message();
  if (said) say(status, said, 'ok');
  const form = el('form', {
    className: 'e-form',
    noValidate: true,
    onsubmit: async (event) => {
      event.preventDefault();
      const domain = input.value.trim().toLowerCase();
      if (!domain) return say(status, 'Enter a domain.');
      submitting(form, true);
      const res = await api('customDomains/records', { method: 'POST', body: { profile: profile.id, domain } });
      submitting(form, false);
      if (!res.ok) return say(status, addReason(res, profile));
      return drawDomain(profile, res.data);
    },
  },
  field('domain-name', 'Domain', input, { hint: 'Without https:// or a slash. Use exactly the address you will put in your bio.' }),
  el('button', { type: 'submit', className: 'e-btn e-btn--primary e-btn--block' }, 'Add domain'),
  status);
  draw(profile, '', el('div', { className: 'e-card' }, form));
}

function addReason(res, profile) {
  const fields = (res.data && res.data.data) || {};
  if (fields.domain && fields.domain.code === 'validation_invalid_format') {
    return `Enter the domain alone, like ${exampleOf(profile)}: no https://, no slash, no spaces.`;
  }
  if (fields.profile && fields.profile.code === 'validation_not_unique') return 'This Profile already has a domain. Reload the page to see it.';
  return fieldReasons(res, `The domain was not added (${res.status}). Try again.`);
}

// The records to set, as a table: Type, Name, Value.
function recordsTable(records) {
  return el('div', { className: 'e-table-wrap', role: 'region', 'aria-labelledby': 'records-title', tabIndex: 0 },
    el('table', { className: 'e-table e-table--wrap', 'aria-labelledby': 'records-title' },
      el('thead', {}, el('tr', {}, ...['Type', 'Name', 'Value'].map((name) => el('th', { scope: 'col' }, name)))),
      el('tbody', {}, ...records.map(({ type, name, value }) => el('tr', {}, el('th', { scope: 'row' }, type), el('td', {}, name), el('td', {}, value))))));
}

// Pending: the records, "Check now" and what the check still misses.
function drawPending(profile, record, records) {
  const status = message();
  const table = el('div', {}, recordsTable(records));
  const form = el('form', {
    className: 'e-form',
    onsubmit: async (event) => {
      event.preventDefault();
      submitting(form, true);
      const res = await check(record);
      submitting(form, false);
      if (res.ok && res.data.status === 'live') return drawLive(profile, record);
      if (res.ok) {
        table.replaceChildren(recordsTable(res.data.records));
        return say(status, `Not yet: ${res.data.problems.join(' ')}`);
      }
      if (res.status === 401 || res.status === 404) return route(); // the session ended, or the domain was removed elsewhere
      if (res.status === 429) return say(status, TOO_MANY);
      return say(status, checkFailed(res.status));
    },
  }, el('button', { type: 'submit', className: 'e-btn e-btn--primary e-btn--block' }, 'Check now'), status);
  const stateCard = card(`Point ${record.domain} here`,
    el('p', { id: 'records-title' }, 'Add these records where your domain\'s DNS is managed, then press Check now. Changes can take a few minutes, sometimes a few hours.'),
    table,
    el('p', { className: 'e-field__hint' }, 'Delete any other A or AAAA record for this name. On Cloudflare, set the cloud to DNS only (grey).'),
    form,
    removeButton(profile, record, status, 'e-btn e-btn--ghost e-btn--block'));
  draw(profile, record.domain, stateCard);
}

// Live: the address, Open, Copy and "Remove domain". The Bio Link shows it from the next screen on (app.js, address()).
function drawLive(profile, record) {
  const url = `https://${record.domain}/`;
  const status = message();
  const stateCard = card(`${record.domain} is live`,
    el('p', {}, `It shows this Profile now. Open it once to finish setting up HTTPS, then put it in your bio. ${location.host}/${profile.username} keeps working too.`),
    el('div', { className: 'e-live__actions' },
      el('a', { className: 'e-btn e-btn--primary', href: url, target: '_blank', rel: 'noopener' }, 'Open'),
      copyButton(url, status)),
    status,
    removeButton(profile, record, status, 'e-btn e-btn--danger e-btn--block'));
  draw(profile, record.domain, stateCard);
}

// "Remove domain", asked first in the page's own dialog, as a Link's delete is (screens/links.js): "Keep it" has the focus
// first, and it or Esc closes the dialog with nothing changed. Once removed, the host is unknown from the next request. A
// refusal is said in the screen's one status line, `status`.
function removeButton(profile, record, status, className) {
  const dialog = el('dialog', { className: 'e-dialog', role: 'alertdialog', 'aria-labelledby': 'remove-title', 'aria-describedby': 'remove-text' },
    el('h2', { className: 'e-dialog__title', id: 'remove-title' }, `Remove ${record.domain}?`),
    el('p', { className: 'e-dialog__text', id: 'remove-text' }, 'Visitors on it will stop seeing this Profile.'),
    el('div', { className: 'e-dialog__actions' },
      el('button', { type: 'button', className: 'e-btn e-btn--danger', onclick: () => dialog.close('remove') }, 'Remove domain'),
      el('button', { type: 'button', className: 'e-btn e-btn--secondary', autofocus: true, onclick: () => dialog.close() }, 'Keep it')));
  const button = el('button', {
    type: 'button',
    className,
    onclick: () => {
      dialog.returnValue = '';
      dialog.showModal();
    },
  }, 'Remove domain');
  dialog.addEventListener('close', async () => {
    if (dialog.returnValue !== 'remove') return button.focus();
    button.disabled = true;
    const res = await api(`customDomains/records/${record.id}`, { method: 'DELETE' });
    if (!res.ok && res.status !== 404) {
      button.disabled = false;
      return say(status, `The domain was not removed (${res.status || 'no answer'}). Try again.`);
    }
    return drawDomain(profile, null, `${record.domain} is removed.`);
  });
  return el('div', {}, button, dialog);
}
