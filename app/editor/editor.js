'use strict';
// The Editor (docs/spec/phase-03-auth-and-editor.md): static, no build step, no package. It calls PocketBase's REST API
// same-origin through the app's proxy with plain fetch, keeps the auth token in localStorage and sends it as the
// Authorization header. Every Creator-entered or PocketBase-sent string is put in the page as text (textContent or a text
// node), never as HTML.
// Ticket 25: log-in, sign-up, the claim step and the "verify your email" screen. `/edit` sends a Creator with no session to
// log-in, and a signed-in one to the first Onboarding step that applies: no Profile, the claim step; email not verified, the
// verify screen.
// Ticket 26: then no display name, the Profile step; no Link, the first-Link step (the Link form), followed by the live
// address; otherwise the Editor, which for now holds "Your Bio Link", the Links list in Visitor order and "Add link". Progress
// is derived from the records each time, never stored.
// ASSUMPTION: screen paths `/edit/profile`, `/edit/first-link`, `/edit/live` and `/edit/add-link` (rung 6: the spec fixes only
// `/edit`, `/edit/verify` and `/edit/reset`). Opening any of them anew goes through `/edit`'s routing, so a reload of the live
// address or of "Add link" lands in the Editor. Overturned by a later ticket moving screens.

const TOKEN = 'ofl.token';
const screen = document.getElementById('screen');
const title = document.getElementById('title');
let account = null; // the signed-in users record, from the last sign-in or refresh

// ---- PocketBase, through the proxy --------------------------------------------------------------------------------------

// A FormData body (a Link with its stock icon) goes as it is, and the browser sets the multipart content type itself.
async function api(path, { method = 'GET', body, keepalive = false } = {}) {
  const headers = {};
  const token = localStorage.getItem(TOKEN);
  if (token) headers.Authorization = token;
  const json = body !== undefined && !(body instanceof FormData);
  if (json) headers['content-type'] = 'application/json';
  const res = await fetch(`/api/collections/${path}`, {
    method,
    headers,
    body: json ? JSON.stringify(body) : body,
    keepalive,
  });
  let data = {};
  try {
    data = await res.json();
  } catch {
    // 204 and other empty answers
  }
  return { ok: res.ok, status: res.status, data };
}

// The raw file, as picked, to Phase 2's upload endpoint with the Creator's token; the app stores the WebP. The browser never
// converts an image.
async function upload(collection, recordId, field, file) {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`/api/upload/${collection}/${recordId}/${field}`, {
    method: 'POST',
    headers: { Authorization: localStorage.getItem(TOKEN) || '' },
    body: form,
  });
  if (res.ok) return null;
  if (res.status === 413) return 'That image is over 20 MB.';
  if (res.status === 415) return 'That file is not an image we can read (jpg, png, heic, gif or webp).';
  return `The image was refused (${res.status}). Try again.`;
}

function signedIn({ token, record }) {
  localStorage.setItem(TOKEN, token);
  account = record;
}

function signOut() {
  localStorage.removeItem(TOKEN);
  account = null;
}

// Refreshes the stored token; false when there is none or PocketBase no longer accepts it.
async function refresh() {
  if (!localStorage.getItem(TOKEN)) return false;
  const res = await api('users/auth-refresh', { method: 'POST' });
  if (!res.ok) {
    signOut();
    return false;
  }
  signedIn(res.data);
  return true;
}

// ---- Rendering: elements built from text, never from HTML ---------------------------------------------------------------

function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
    else if (key in node && key !== 'list') node[key] = value;
    else node.setAttribute(key, value);
  }
  for (const child of children) node.append(typeof child === 'string' ? document.createTextNode(child) : child);
  return node;
}

function render(heading, ...children) {
  title.textContent = heading;
  document.title = `${heading} · ofl.ink`;
  screen.replaceChildren(el('section', { className: 'card' }, ...children));
}

function message() {
  return el('p', { className: 'message', role: 'status' });
}

function say(node, text, kind = 'error') {
  node.className = `message ${kind}`;
  node.textContent = text;
}

// The Username field lowercases what is typed, keeping the caret where it was.
function usernameInput(value = '') {
  const input = el('input', {
    name: 'username',
    value,
    required: true,
    autocomplete: 'off',
    autocapitalize: 'none',
    spellcheck: false,
    inputMode: 'text',
  });
  input.addEventListener('input', () => {
    const lower = input.value.toLowerCase();
    if (lower === input.value) return;
    const { selectionStart, selectionEnd } = input;
    input.value = lower;
    input.setSelectionRange(selectionStart, selectionEnd);
  });
  return input;
}

function addressField(input) {
  return el('label', {}, 'Username', el('div', { className: 'address' }, el('span', {}, `${location.host}/`), input));
}

// PocketBase's per-field refusals as one line each, e.g. "Password: Must be at least 8 character(s)."
const LABELS = { email: 'Email', password: 'Password', passwordConfirm: 'Password' };
function fieldReasons(res, fallback) {
  const fields = Object.entries((res.data && res.data.data) || {});
  if (!fields.length) return (res.data && res.data.message) || fallback;
  return fields
    .map(([name, err]) => {
      if (name === 'email' && err.code === 'validation_not_unique') return 'Email: this address already has an account. Log in instead.';
      return `${LABELS[name] || name}: ${err.message}`;
    })
    .join(' ');
}

// The claim's refusal, from PocketBase's answer. A Username refused by the create rule alone (400 with no field error) can
// only be a reserved one: the Editor always sends itself as owner and nothing but Username, owner and default Mode, with a
// token it has just signed in with or refreshed.
// ASSUMPTION: "reserved" is inferred from that bare 400, because PocketBase names no reason when a rule refuses a create
// (observed on 0.40.4: `{"data":{}, "message":"Failed to create record."}`) (rung 5: no separate lookup, as the spec says).
// Overturned if another clause of the create rule can fail for the Editor's own request; the message then has to say less.
function claimReason(res, username) {
  const field = (res.data && res.data.data && res.data.data.username) || {};
  switch (field.code) {
    case 'validation_not_unique':
      return `“${username}” is taken. If it is your Username on ofl.ink today, do not claim another one: the Operator hands over Usernames held on v1 at Cutover, when ofl.ink moves to this site.`;
    case 'validation_min_text_constraint':
      return 'Too short: a Username has at least 3 characters.';
    case 'validation_max_text_constraint':
      return 'Too long: a Username has at most 30 characters.';
    case 'validation_invalid_format':
      return 'Not allowed: a Username has only lowercase letters, digits and underscore (_).';
    case 'validation_required':
      return 'Enter a Username.';
    default:
  }
  if (res.status === 400 && !Object.keys((res.data && res.data.data) || {}).length) return `“${username}” is reserved. Pick another Username.`;
  return (res.data && res.data.message) || 'The claim failed. Try again.';
}

// ---- Navigation ---------------------------------------------------------------------------------------------------------

function show(path, draw) {
  if (location.pathname !== path) history.replaceState(null, '', path);
  draw();
}

function go(path) {
  history.pushState(null, '', path);
  route();
}

function link(text, path) {
  return el('a', {
    href: path,
    onclick: (event) => {
      event.preventDefault();
      go(path);
    },
  }, text);
}

// The first Onboarding step that applies to the signed-in Creator. Every caller has just signed in or refreshed the token:
// PocketBase 0.40.4 answers a token it no longer accepts as a guest's (an empty profiles list, never 401), so only a fresh
// token makes an empty list mean "no Profile", and the same holds for the links list since ticket 26 opened owner reads.
// Buttons that return here without a write behind them (Cancel, "Go to the Editor") go through route(), which refreshes first.
async function onboard() {
  const res = await api('profiles/records?perPage=1');
  if (!res.ok) return drawRetry(res.data.message || 'PocketBase did not answer.');
  const profile = res.data.items[0];
  if (!profile) return show('/edit/claim', () => drawClaim());
  if (!account.verified) return show('/edit/verify-email', drawVerify);
  if (!profile.displayName) return show('/edit/profile', () => drawProfileStep(profile));
  const links = await linksOf(profile);
  if (!links.ok) return drawRetry(links.data.message || 'PocketBase did not answer.');
  if (!links.data.items.length) return show('/edit/first-link', () => drawLinkForm(profile, []));
  return show('/edit/home', () => drawHome(profile, links.data.items));
}

// The Profile's Links in the order Visitors see them, with only what the Editor shows or needs: the title and the order.
function linksOf(profile) {
  const filter = encodeURIComponent(`profile='${profile.id}'`);
  return api(`links/records?perPage=500&sort=order&filter=${filter}&fields=id,title,order`);
}

async function route() {
  const path = location.pathname.replace(/\/+$/, '');
  if (path === '/edit/signup') return drawSignup();
  if (path === '/edit/login') return drawLogin();
  if (!(await refresh())) return show('/edit/login', drawLogin);
  return onboard();
}

// ---- Screens ------------------------------------------------------------------------------------------------------------

function submitting(form, busy) {
  for (const control of form.elements) control.disabled = busy;
}

function drawLogin() {
  const email = el('input', { name: 'email', type: 'email', required: true, autocomplete: 'email' });
  const password = el('input', { name: 'password', type: 'password', required: true, autocomplete: 'current-password' });
  const status = message();
  const form = el('form', {
    onsubmit: async (event) => {
      event.preventDefault();
      submitting(form, true);
      const res = await api('users/auth-with-password', { method: 'POST', body: { identity: email.value, password: password.value } });
      submitting(form, false);
      if (!res.ok) return say(status, res.status === 400 ? 'Wrong email or password.' : res.data.message || 'Log-in failed. Try again.');
      signedIn(res.data);
      return onboard();
    },
  },
  el('label', {}, 'Email', email),
  el('label', {}, 'Password', password),
  status,
  el('button', { type: 'submit' }, 'Log in'));
  render('Log in', el('h1', {}, 'Log in'), el('p', { className: 'hint' }, 'Edit your ofl.ink Profile.'), form,
    el('p', { className: 'switch' }, 'New here? ', link('Sign up', '/edit/signup')));
}

function drawSignup() {
  const email = el('input', { name: 'email', type: 'email', required: true, autocomplete: 'email' });
  const password = el('input', { name: 'password', type: 'password', required: true, autocomplete: 'new-password' });
  const username = usernameInput();
  const status = message();
  const form = el('form', {
    onsubmit: async (event) => {
      event.preventDefault();
      submitting(form, true);
      const wanted = username.value;
      const body = { email: email.value, password: password.value, passwordConfirm: password.value };
      const created = await api('users/records', { method: 'POST', body });
      if (!created.ok) {
        submitting(form, false);
        return say(status, fieldReasons(created, 'Sign-up failed. Try again.'));
      }
      const auth = await api('users/auth-with-password', { method: 'POST', body: { identity: body.email, password: body.password } });
      if (!auth.ok) {
        submitting(form, false);
        return say(status, `Your account was made, but log-in was refused: ${auth.data.message || auth.status}`);
      }
      signedIn(auth.data);
      // The verification email is asked for and not waited on: until a mail server is set up, none is delivered.
      api('users/request-verification', { method: 'POST', body: { email: body.email }, keepalive: true }).catch(() => {});
      const claimed = await claim(wanted);
      if (!claimed.ok) return show('/edit/claim', () => drawClaim({ username: wanted, error: claimReason(claimed, wanted) }));
      return show('/edit/verify-email', drawVerify);
    },
  },
  el('label', {}, 'Email', email),
  el('label', {}, 'Password', password),
  addressField(username),
  status,
  el('button', { type: 'submit' }, 'Create account'));
  render('Sign up', el('h1', {}, 'Create your page'), el('p', { className: 'hint' }, 'Your email, a password and the Username your Profile lives at.'), form,
    el('p', { className: 'switch' }, 'Already have an account? ', link('Log in', '/edit/login')));
}

// The claim: the Profile with only the Username, the Creator as owner and Escape Mode as its default Mode.
function claim(username) {
  return api('profiles/records', { method: 'POST', body: { username, owner: account.id, mode: 'escape_ig' } });
}

function drawClaim({ username = '', error = '' } = {}) {
  const input = usernameInput(username);
  const status = message();
  if (error) say(status, error);
  const form = el('form', {
    onsubmit: async (event) => {
      event.preventDefault();
      submitting(form, true);
      const wanted = input.value;
      // A token PocketBase no longer accepts would make the claim a guest's, refused with the bare 400 read as "reserved".
      if (!(await refresh())) return show('/edit/login', drawLogin);
      const res = await claim(wanted);
      submitting(form, false);
      if (!res.ok) return say(status, claimReason(res, wanted));
      return onboard();
    },
  },
  addressField(input),
  status,
  el('button', { type: 'submit' }, 'Claim'));
  render('Claim your Username', el('h1', {}, 'Claim your Username'), el('p', { className: 'hint' }, 'It is your Profile\'s address. Lowercase letters, digits and underscore, 3 to 30 characters.'), form);
}

function drawRetry(reason) {
  const status = message();
  say(status, reason);
  render('Try again', el('h1', {}, 'Try again'), status, el('button', { type: 'button', onclick: route }, 'Try again'));
}

function drawVerify() {
  const status = message();
  const resend = el('button', {
    type: 'button',
    className: 'secondary',
    onclick: async () => {
      resend.disabled = true;
      const res = await api('users/request-verification', { method: 'POST', body: { email: account.email } });
      resend.disabled = false;
      if (res.ok) say(status, `We sent a new link to ${account.email}.`, 'ok');
      else say(status, res.data.message || 'The email could not be sent. Try again.');
    },
  }, 'Resend email');
  const next = el('button', {
    type: 'button',
    onclick: async () => {
      next.disabled = true;
      const ok = await refresh();
      next.disabled = false;
      if (!ok) return show('/edit/login', drawLogin);
      if (!account.verified) return say(status, 'Your email is not verified yet. Open the link in the email we sent you, then press Continue.');
      return onboard();
    },
  }, 'Continue');
  render('Verify your email', el('h1', {}, 'Verify your email'),
    el('p', { className: 'hint' }, 'We sent a link to ', el('strong', {}, account.email), '. Open it to verify your email, then press Continue.'),
    status, el('div', { className: 'actions' }, next, resend));
}

// ---- Onboarding after verification, and the Editor ---------------------------------------------------------------------

const IMAGE_TYPES = 'image/jpeg,image/png,image/heic,image/heif,image/gif,image/webp,.heic,.heif';
const MODE_NAMES = { direct: 'Direct', escape_ig: 'Escape', deeplink: 'Deeplink' };
// v1's stock icons, the n8n Form's options. A chosen one is stored as the Page Copy's own WebP file in the Link's icon field,
// byte for byte, the way the v1 Import stores an imported stock icon (app/bin/import-v1 copies a WebP image unchanged).
// ASSUMPTION: the Editor fetches the stock WebP from `/images/` and sends it in the Link's own multipart write through the
// proxy, rather than through the upload endpoint, which would re-encode it (rung 3: the v1 Import's byte-for-byte copy; rung
// 5: no new endpoint). Overturned if stock icons must be stored as a name rather than a file; that needs a field.
const ICONS = [
  ['', 'None'],
  ['onlyicon.webp', 'OnlyFans'],
  ['linkicon.webp', 'Link'],
  ['twitchicon.webp', 'Twitch'],
  ['igicon.webp', 'Instagram'],
];

const address = (profile) => `${location.origin}/${profile.username}`;

function fileInput(name) {
  return el('input', { type: 'file', name, accept: IMAGE_TYPES });
}

function select(name, options, value = '') {
  const node = el('select', { name }, ...options.map(([v, text]) => el('option', { value: v }, text)));
  node.value = value;
  return node;
}

function check(name, text, checked = false) {
  const box = el('input', { type: 'checkbox', name, checked });
  return { box, row: el('label', { className: 'check' }, box, text) };
}

// The Profile step: display name (required) and bio are saved first, then the avatar goes to the upload endpoint.
// ASSUMPTION: the Editor checks the display name itself (whitespace only counts as none) and shows its own message, and a
// refused avatar keeps the Creator on the step with the reason, the name and bio already saved (rung 5: no rollback).
// Overturned if PocketBase must refuse an empty display name, or a half-saved step must be undone.
function drawProfileStep(profile) {
  const displayName = el('input', { name: 'displayName', value: profile.displayName || '', autocomplete: 'name' });
  const bio = el('textarea', { name: 'bio', rows: 3, value: profile.bio || '' });
  const avatar = fileInput('avatar');
  const status = message();
  const form = el('form', {
    noValidate: true,
    onsubmit: async (event) => {
      event.preventDefault();
      if (!displayName.value.trim()) return say(status, 'Enter a display name.');
      submitting(form, true);
      const res = await api(`profiles/records/${profile.id}`, { method: 'PATCH', body: { displayName: displayName.value.trim(), bio: bio.value } });
      if (!res.ok) {
        submitting(form, false);
        return say(status, fieldReasons(res, `The save failed (${res.status}). Try again.`));
      }
      const failed = avatar.files[0] ? await upload('profiles', profile.id, 'avatar', avatar.files[0]) : null;
      submitting(form, false);
      if (failed) return say(status, failed);
      return onboard();
    },
  },
  el('label', {}, 'Display name', displayName),
  el('label', {}, 'Bio', bio),
  el('label', {}, 'Profile picture', avatar),
  status,
  el('button', { type: 'submit' }, 'Continue'));
  render('Your Profile', el('h1', {}, 'Your Profile'), el('p', { className: 'hint' }, 'What Visitors see at the top of your page. A photo in jpg, png, heic, gif or webp.'), form);
}

// The Link form, the same for the first-Link step and the Editor's "Add link". A new Link starts on Profile default, which
// stores no Mode, and takes the highest order plus one; PocketBase gives it its Link Id.
// ASSUMPTION: the default Tracking Code is checked in the browser (digits only, or empty), because PocketBase's rules have no
// regular expression and the field keeps v1's values verbatim for the Import; v2's Reveal ignores any other code anyway
// (app/src/destination.js) (rung 5). Overturned if PocketBase must refuse it; the field then needs a pattern the Import meets.
function drawLinkForm(profile, links) {
  const onboarding = !links.length; // the first-Link step
  const title = el('input', { name: 'title', autocomplete: 'off' });
  const destination = el('input', { name: 'destination', inputMode: 'url', autocomplete: 'off', autocapitalize: 'none', spellcheck: false, placeholder: 'https://' });
  const icon = select('icon', ICONS);
  const background = fileInput('backgroundImage');
  const adult = check('isAdult', '18+ Age Gate');
  const profileMode = MODE_NAMES[profile.mode] || MODE_NAMES.escape_ig;
  const mode = select('mode', [['', `Profile default (currently ${profileMode})`], ['direct', 'Direct'], ['escape_ig', 'Escape'], ['deeplink', 'Deeplink']]);
  const tracking = check('tracking', 'OnlyFans tracking');
  const code = el('input', { name: 'defaultTrackingCode', inputMode: 'numeric', autocomplete: 'off' });
  const status = message();
  const order = links.length ? Math.max(...links.map((l) => Number(l.order) || 0)) + 1 : 0;
  let saved = null; // the Link once created, so a retry after a failed background upload does not add a second one

  const form = el('form', {
    noValidate: true,
    onsubmit: async (event) => {
      event.preventDefault();
      if (!title.value.trim()) return say(status, 'Enter a title.');
      if (!/^\d*$/.test(code.value)) return say(status, 'Default Tracking Code: digits only, or leave it empty.');
      submitting(form, true);
      const fields = new FormData();
      fields.append('title', title.value.trim());
      fields.append('destination', destination.value.trim());
      fields.append('isAdult', String(adult.box.checked));
      fields.append('mode', mode.value); // empty: Profile default, no Mode stored
      fields.append('tracking', String(tracking.box.checked));
      fields.append('defaultTrackingCode', code.value);
      if (!saved) {
        fields.append('profile', profile.id);
        fields.append('order', String(order));
        if (icon.value) {
          const stock = await fetch(`/images/${icon.value}`);
          if (!stock.ok) {
            submitting(form, false);
            return say(status, 'The icon could not be loaded. Try again.');
          }
          fields.append('icon', new File([await stock.blob()], icon.value, { type: 'image/webp' }));
        }
      }
      const res = await api(saved ? `links/records/${saved.id}` : 'links/records', { method: saved ? 'PATCH' : 'POST', body: fields });
      if (!res.ok) {
        submitting(form, false);
        return say(status, fieldReasons(res, `The save failed (${res.status}). Try again.`));
      }
      saved = res.data;
      const failed = background.files[0] ? await upload('links', saved.id, 'backgroundImage', background.files[0]) : null;
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
  adult.row,
  el('label', {}, 'Mode', mode),
  tracking.row,
  el('label', {}, 'Default Tracking Code', code),
  status,
  el('button', { type: 'submit' }, 'Save link'));
  const heading = onboarding ? 'Add your first Link' : 'Add link';
  const children = [el('h1', {}, heading), el('p', { className: 'hint' }, 'Where the card on your page leads.'), form];
  if (!onboarding) children.push(el('div', { className: 'actions' }, el('button', { type: 'button', className: 'secondary', onclick: route }, 'Cancel')));
  render(heading, ...children);
}

// Copies the address, saying whether it worked.
function copyButton(text, status) {
  return el('button', {
    type: 'button',
    className: 'secondary',
    onclick: async () => {
      try {
        await navigator.clipboard.writeText(text);
        say(status, 'Copied.', 'ok');
      } catch {
        say(status, 'Copy did not work here. Press and hold the address to copy it.');
      }
    },
  }, 'Copy');
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

// ASSUMPTION: the Editor for now holds "Your Bio Link" with Copy, "Featured Links" (titles in Visitor order) and "Add link";
// editing, reordering and deleting come with tickets 27 and 28 (rung 5). Overturned by those tickets.
function drawHome(profile, links) {
  const status = message();
  const rows = links.map((link) => el('li', { className: 'link-row' }, el('span', { className: 'link-row-title' }, link.title)));
  render('Edit Profile', el('h1', {}, 'Edit Profile'),
    el('div', { className: 'bio-link' }, el('span', { className: 'label' }, 'Your Bio Link'), el('span', { className: 'value' }, `${location.host}/${profile.username}`)),
    el('div', { className: 'actions' }, copyButton(address(profile), status)),
    status,
    el('h2', {}, 'Featured Links'),
    el('ul', { className: 'links', 'aria-label': 'Links' }, ...rows),
    el('div', { className: 'actions' }, el('button', {
      type: 'button',
      onclick: () => {
        history.pushState(null, '', '/edit/add-link');
        drawLinkForm(profile, links);
      },
    }, 'Add link')));
}

window.addEventListener('popstate', route);
route();
