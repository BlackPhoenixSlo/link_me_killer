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
// ASSUMPTION: screen paths `/edit/profile`, `/edit/first-link`, `/edit/live`, `/edit/add-link` and (ticket 28) `/edit/link` for
// an opened Link (rung 6: the spec fixes only
// `/edit`, `/edit/verify` and `/edit/reset`). Opening any of them anew goes through `/edit`'s routing, so a reload of the live
// address or of "Add link" lands in the Editor. Overturned by a later ticket moving screens.
// Ticket 27: the top of the Editor, laid out like the link.me Template's "Edit Profile" screen (link.me/profile/edit.html):
// "Your Bio Link" with Copy, "Change Profile Picture", the Profile panel (display name, the @Username read-only, bio) and
// "Quick Settings", whose "Deeplink Banner" row is the Profile's default Mode. No badge control, no Username change, no delete.
// Ticket 28: "Featured Links" edits, moves and deletes Links; the Link form opens a Link with its current values, Destination
// included, and gains the Geo Rule textarea; a refused save shows its reason and keeps every field as typed.
// Ticket 29: the session lasts until the Creator ends it. "Log out" drops the token on this device and shows log-in. An answer
// refused for an ended session sends the Creator to log-in with a return path (`?next=`), and logging in lands them by the
// Onboarding rule, which for an onboarded Creator is the Editor, so an ended session never shows as a failed save.
// Ticket 31: the two screens the emails link to, `/edit/verify?token=…` and `/edit/reset?token=…` (fixed URLs), and "Forgot
// password?" on log-in, at `/edit/forgot`. A bad or expired link says so and offers to send a new one.
// ASSUMPTION: the screen path `/edit/forgot` (rung 6, as for the screen paths above). Overturned by a later ticket moving it.
// Ticket 33: the Stats page at `/edit/stats`, in its own file (stats.js), with a "Stats" entry next to the Editor in the
// creator-only area's navigation; a signed-out Creator opening it is sent to log-in as for the Editor.
// ASSUMPTION: the screen path `/edit/stats` (rung 6, as above; it adds no top-level path, so no Username is reserved).
// Overturned by a later ticket moving it.

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
  if (token && (await sessionEnded(res, token))) return expired();
  let data = {};
  try {
    data = await res.json();
  } catch {
    // 204 and other empty answers
  }
  return { ok: res.ok, status: res.status, data };
}

// The raw file, as picked, to Phase 2's upload endpoint with the Creator's token; the app stores the WebP. The browser never
// converts an image. The answer is the refusal's reason, or null and the stored file's URL.
async function upload(collection, recordId, field, file) {
  const form = new FormData();
  form.append('file', file);
  const token = localStorage.getItem(TOKEN) || '';
  const res = await fetch(`/api/upload/${collection}/${recordId}/${field}`, {
    method: 'POST',
    headers: { Authorization: token },
    body: form,
  });
  if (token && (await sessionEnded(res, token))) return expired();
  if (res.ok) return { error: null, url: (await res.json()).url };
  if (res.status === 413) return { error: 'That image is over 20 MB.' };
  if (res.status === 415) return { error: 'That file is not an image we can read (jpg, png, heic, gif or webp).' };
  return { error: `The image was refused (${res.status}). Try again.` };
}

function signedIn({ token, record }) {
  localStorage.setItem(TOKEN, token);
  account = record;
}

function signOut() {
  localStorage.removeItem(TOKEN);
  account = null;
}

// Was `res` refused because the session `token` belongs to has ended? A 401 says so. PocketBase 0.40.4 takes a token it no longer
// accepts as a guest's, so a write answers 404 or 400 instead (observed: a Profile save with an invalid token, "The requested
// resource wasn't found."), and the upload endpoint passes such a status on. Only then is auth-refresh, which answers 401 to any
// token it does not accept, asked which it is. A probe that gets no answer counts as "not ended", so the real refusal still shows.
// ASSUMPTION: every 400, 403 or 404 sent with a token costs one auth-refresh call to tell an ended session from a real refusal
// (rung 5: no expiry is read out of the token, and no screen changes how it calls PocketBase). Overturned if PocketBase starts
// answering an unaccepted token with 401; the 401 check alone then does.
async function sessionEnded(res, token) {
  if (res.status === 401) return true;
  if (![400, 403, 404].includes(res.status)) return false;
  try {
    const check = await fetch('/api/collections/users/auth-refresh', { method: 'POST', headers: { Authorization: token } });
    return check.status === 401;
  } catch {
    return false;
  }
}

// The session has ended: the token goes and log-in shows, with the path to come back to. The caller's own handling of the answer
// never runs (the promise never settles), so nothing on the page it leaves reads as a failed save.
function expired() {
  const back = location.pathname + location.search;
  signOut();
  show(`/edit/login?next=${encodeURIComponent(back)}`, drawLogin);
  return new Promise(() => {});
}

// Refreshes the stored token; false only when there is none. A token PocketBase no longer accepts ends the session in api(),
// and a refresh PocketBase does not answer shows "Try again"; neither settles.
// ASSUMPTION: a failed refresh (5xx) keeps the token and shows "Try again" rather than log-in (rung 3: expired()'s unsettled
// promise and drawRetry for an unanswered call; the session lasts until the Creator ends it). Overturned if a failed refresh
// must drop the session.
async function refresh() {
  if (!localStorage.getItem(TOKEN)) return false;
  const res = await api('users/auth-refresh', { method: 'POST' });
  if (!res.ok) {
    drawRetry(res.data.message || 'PocketBase did not answer.');
    return new Promise(() => {});
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
const LABELS = { email: 'Email', password: 'Password', passwordConfirm: 'Password', title: 'Title', destination: 'Destination', geo: 'Geo Rule' };
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
// only be a reserved one: the Editor always sends itself as owner and nothing but Username, owner and default Mode, and a bare
// 400 sent with a token PocketBase no longer accepts ends the session in api() before it reaches here.
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
  const done = await onboarded();
  if (done) show('/edit/home', () => drawHome(done.profile, done.links));
}

// The onboarded Creator's Profile and its Links, for the screens past Onboarding (the Editor, Stats); otherwise it draws Retry
// or the first Onboarding step that applies and returns nothing. Its callers hold the fresh token onboard() needs.
async function onboarded() {
  const res = await api('profiles/records?perPage=1');
  if (!res.ok) return drawRetry(res.data.message || 'PocketBase did not answer.');
  const profile = res.data.items[0];
  if (!profile) return show('/edit/claim', () => drawClaim());
  if (!account.verified) return show('/edit/verify-email', drawVerify);
  if (!profile.displayName) return show('/edit/profile', () => drawProfileStep(profile));
  const links = await linksOf(profile);
  if (!links.ok) return drawRetry(links.data.message || 'PocketBase did not answer.');
  if (!links.data.items.length) return show('/edit/first-link', () => drawLinkForm(profile, []));
  return { profile, links: links.data.items };
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
  if (path === '/edit/verify') return drawVerified();
  if (path === '/edit/reset') return drawReset();
  if (path === '/edit/forgot') return drawForgot();
  if (!(await refresh())) return show('/edit/login', drawLogin);
  if (path === '/edit/stats') return openStats();
  return onboard();
}

// The creator-only area's navigation: the Editor and, next to it, Stats. The entry for `current` is marked as the page shown.
function creatorNav(current) {
  const entry = (text, path) => {
    const a = link(text, path);
    if (path === current) a.setAttribute('aria-current', 'page');
    return a;
  };
  return el('nav', { className: 'creator-nav', 'aria-label': 'Creator' }, entry('Editor', '/edit'), entry('Stats', '/edit/stats'));
}

// ---- Screens ------------------------------------------------------------------------------------------------------------

function submitting(form, busy) {
  for (const control of form.elements) control.disabled = busy;
}

function drawLogin() {
  // Log-in reached from an ended session carries a return path; it lands by the Onboarding rule all the same.
  const ended = new URLSearchParams(location.search).has('next');
  const email = el('input', { name: 'email', type: 'email', required: true, autocomplete: 'email' });
  const password = el('input', { name: 'password', type: 'password', required: true, autocomplete: 'current-password' });
  const status = message();
  const form = el('form', {
    onsubmit: async (event) => {
      event.preventDefault();
      signOut(); // a new log-in replaces any session left on this device
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
  const hint = ended ? 'Your session has ended. Log in to carry on.' : 'Edit your ofl.ink Profile.';
  render('Log in', el('h1', {}, 'Log in'), el('p', { className: 'hint' }, hint), form,
    el('p', { className: 'switch' }, link('Forgot password?', '/edit/forgot')),
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
      signOut(); // a new sign-up replaces any session left on this device
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
      // The verification email is asked for as soon as the account exists, and not waited on.
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

// PocketBase answers 204 to a repeat request inside its throttle window and sends nothing (observed on 0.40.4), so the
// screen says the email was asked for, never that one went out.
const resendAsked = (email) => `We asked for a new link to ${email}. If none arrives within a few minutes, check your spam folder and try again.`;

function drawVerify() {
  const status = message();
  const resend = el('button', {
    type: 'button',
    className: 'secondary',
    onclick: async () => {
      resend.disabled = true;
      const res = await api('users/request-verification', { method: 'POST', body: { email: account.email } });
      resend.disabled = false;
      if (res.ok) say(status, resendAsked(account.email), 'ok');
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

// ---- The emails' screens -------------------------------------------------------------------------------------------------

const CHECK_INBOX = 'If an account uses that address, we sent it a link. Check your inbox.';
const linkToken = () => new URLSearchParams(location.search).get('token') || '';

// An email field whose button asks PocketBase to send `endpoint`'s email. PocketBase answers 204 whether or not an account uses
// the address, so the screen says the same either way and reveals nothing about who has one.
function mailForm(button, endpoint) {
  const email = el('input', { name: 'email', type: 'email', required: true, autocomplete: 'email' });
  const status = message();
  const form = el('form', {
    onsubmit: async (event) => {
      event.preventDefault();
      submitting(form, true);
      const res = await api(`users/${endpoint}`, { method: 'POST', body: { email: email.value } });
      submitting(form, false);
      if (res.ok) say(status, CHECK_INBOX, 'ok');
      else say(status, fieldReasons(res, 'The email could not be sent. Try again.'));
    },
  },
  el('label', {}, 'Email', email),
  status,
  el('button', { type: 'submit' }, button));
  return form;
}

function drawInvalidLink(what, button, endpoint) {
  render('Link invalid or expired', el('h1', {}, 'Link invalid or expired'),
    el('p', { className: 'hint' }, `This ${what} link is invalid or expired. Enter your email and we will send you a new one.`),
    mailForm(button, endpoint));
}

// The verification email's link. PocketBase confirms its token whether or not this browser is signed in; Continue then goes
// through `/edit`, which lands a signed-in Creator on their next Onboarding step and anyone else on log-in.
async function drawVerified() {
  const res = await api('users/confirm-verification', { method: 'POST', body: { token: linkToken() } });
  if (!res.ok) return drawInvalidLink('verification', 'Resend email', 'request-verification');
  return render('Email verified', el('h1', {}, 'Email verified'), el('p', { className: 'hint' }, 'Your email is verified.'),
    el('button', { type: 'button', onclick: () => go('/edit') }, 'Continue'));
}

// The reset email's link: a new password for the account its token names. PocketBase says whether the token is good only when
// the password is sent, so a bad or expired link shows as such then.
// ASSUMPTION: the token is checked on submit rather than on opening (rung 5: PocketBase has no call that checks a reset token
// without using it). Overturned if the screen must say so before a password is typed; the Editor would then read the token's
// expiry itself.
function drawReset() {
  const password = el('input', { name: 'password', type: 'password', required: true, autocomplete: 'new-password' });
  const status = message();
  const form = el('form', {
    onsubmit: async (event) => {
      event.preventDefault();
      submitting(form, true);
      const body = { token: linkToken(), password: password.value, passwordConfirm: password.value };
      const res = await api('users/confirm-password-reset', { method: 'POST', body });
      submitting(form, false);
      if (res.ok) {
        return render('Password changed', el('h1', {}, 'Password changed'), el('p', { className: 'hint' }, 'Log in with your new password.'),
          el('button', { type: 'button', onclick: () => go('/edit/login') }, 'Log in'));
      }
      if (res.data.data && res.data.data.token) return drawInvalidLink('reset', 'Send a new link', 'request-password-reset');
      return say(status, fieldReasons(res, 'The password could not be set. Try again.'));
    },
  },
  el('label', {}, 'New password', password),
  status,
  el('button', { type: 'submit' }, 'Set password'));
  render('Set a new password', el('h1', {}, 'Set a new password'), form);
}

function drawForgot() {
  render('Forgot password', el('h1', {}, 'Forgot password'),
    el('p', { className: 'hint' }, 'Enter your email and we will send you a link to set a new password.'),
    mailForm('Send reset link', 'request-password-reset'),
    el('p', { className: 'switch' }, link('Back to log in', '/edit/login')));
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

// Writes `fields` to the Profile with the form disabled, saying PocketBase's refusal in `status`. On success PocketBase's answer
// is kept in `profile`, the one place the Editor's in-memory Profile is updated, and the answer is true.
async function saveProfile(profile, form, status, fields) {
  submitting(form, true);
  const res = await api(`profiles/records/${profile.id}`, { method: 'PATCH', body: fields });
  submitting(form, false);
  if (!res.ok) {
    say(status, fieldReasons(res, `The save failed (${res.status}). Try again.`));
    return false;
  }
  Object.assign(profile, res.data);
  return true;
}

// The Profile's own form, the same for the Profile step and the Editor's Profile panel: display name (required), bio and
// picture, saved on its one button. Name and bio are saved first, then a picked picture goes to the upload endpoint. The
// Editor's panel adds the current picture beside "Change Profile Picture" and the @Username read-only; `done(status)` runs
// after a full save.
// ASSUMPTION: the Editor checks the display name itself (whitespace only counts as none) and shows its own message, and a
// refused avatar keeps the Creator on the form with the reason, the name and bio already saved (rung 5: no rollback).
// Overturned if PocketBase must refuse an empty display name, or a half-saved step must be undone.
function profileForm(profile, { editor = false, button, done }) {
  const displayName = el('input', { name: 'displayName', value: profile.displayName || '', autocomplete: 'name' });
  const bio = el('textarea', { name: 'bio', rows: 3, value: profile.bio || '' });
  const avatar = fileInput('avatar');
  const status = message();
  const current = el('img', { className: 'avatar', alt: '' });
  const showAvatar = (url) => {
    current.hidden = !url;
    if (url) current.src = url;
  };
  showAvatar(profile.avatar ? `/api/files/profiles/${profile.id}/${profile.avatar}` : '');
  const form = el('form', {
    noValidate: true,
    onsubmit: async (event) => {
      event.preventDefault();
      if (!displayName.value.trim()) return say(status, 'Enter a display name.');
      if (!(await saveProfile(profile, form, status, { displayName: displayName.value.trim(), bio: bio.value }))) return undefined;
      displayName.value = profile.displayName;
      const file = avatar.files[0];
      if (file) {
        submitting(form, true);
        const res = await upload('profiles', profile.id, 'avatar', file);
        submitting(form, false);
        if (res.error) return say(status, res.error);
        avatar.value = '';
        showAvatar(res.url);
      }
      return done(status);
    },
  });
  const name = el('label', {}, 'Display name', displayName);
  const about = el('label', {}, 'Bio', bio);
  if (editor) {
    const username = el('input', { name: 'username', value: profile.username, readOnly: true });
    form.append(
      el('div', { className: 'picture' }, current, el('label', {}, 'Change Profile Picture', avatar)),
      name,
      el('label', {}, 'Username', el('div', { className: 'address' }, el('span', { 'aria-hidden': 'true' }, '@'), username)),
      about,
    );
  } else {
    form.append(name, about, el('label', {}, 'Profile picture', avatar));
  }
  form.append(status, el('button', { type: 'submit' }, button));
  return form;
}

// The Profile step: the Profile's own form, then on to the next Onboarding step.
function drawProfileStep(profile) {
  render('Your Profile', el('h1', {}, 'Your Profile'), el('p', { className: 'hint' }, 'What Visitors see at the top of your page. A photo in jpg, png, heic, gif or webp.'),
    profileForm(profile, { button: 'Continue', done: () => onboard() }));
}

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
function drawLinkForm(profile, links, link = null) {
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

// The Editor's home, in the Template's order: "Your Bio Link", the Profile panel ("Change Profile Picture", display name, the
// @Username read-only, bio), "Quick Settings", "Featured Links" (featuredLinks) and "Add link". Each form saves on its
// own button, with no autosave, and the last save wins. A save keeps PocketBase's answer in `profile` (saveProfile), so "Add
// link" names the default Mode just saved.
// ASSUMPTION: "Your Bio Link" shows the full public address, scheme included, so what it shows is what Copy puts on the
// clipboard (rung 5: one string; the Template shows "link.me/f_wei13" without one). Overturned if the Operator wants the
// Template's scheme-less look; only the shown text changes.
// "Change Profile Picture" is a field of the Profile panel and uploads on "Save profile", after display name and bio, as the
// Profile step does (rung 2: the spec's Contracts, "Each form saves on its own Save button, with no autosave").
// ASSUMPTION: the default Mode has its own form and Save button in "Quick Settings" rather than saving when the select
// changes (rung 2: the spec's Contracts, "Each form saves on its own Save button, with no autosave"). Overturned if the
// Operator wants the Template's toggle that acts at once.
// ASSUMPTION: a save keeps PocketBase's answer in the in-memory Profile, so "Add link" names the default Mode just saved
// without a re-read; a reload or Cancel re-reads it through route() (rung 5). Overturned if two tabs must see each other's saves.
// ASSUMPTION: the Profile panel refuses an empty display name, as the Profile step does, because a Profile with none sends the
// Creator back to that step at the next log-in (rung 3). Overturned if a Creator may clear their display name.
// ASSUMPTION: the @Username is a readonly field labelled "Username" with a decorative "@", not a disabled one (rung 5).
// Overturned if it must be plain text.
// An empty stored default Mode shows as Escape, as PocketBase's field reads it (pocketbase/pb_migrations/1791140001_profiles.js:22).
function drawHome(profile, links) {
  const copied = message();
  const panel = profileForm(profile, { editor: true, button: 'Save profile', done: (status) => say(status, 'Profile saved.', 'ok') });

  const mode = select('mode', Object.entries(MODE_NAMES), profile.mode || 'escape_ig');
  const modeSaved = message();
  const settings = el('form', {
    onsubmit: async (event) => {
      event.preventDefault();
      if (await saveProfile(profile, settings, modeSaved, { mode: mode.value })) say(modeSaved, 'Default Mode saved.', 'ok');
    },
  },
  el('label', {}, 'Default Mode', mode),
  el('p', { className: 'hint' }, 'Escape helps visitors switch to Safari/Chrome from Instagram or TikTok. Every Link left on “Profile default” follows this Mode.'),
  modeSaved,
  el('button', { type: 'submit', className: 'secondary' }, 'Save default Mode'));

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

// Log out ends the session on this device: the token goes and log-in shows. PocketBase keeps no session to end.
// ASSUMPTION: "Log out" sits at the foot of the Editor only, not on the Onboarding screens (rung 5: the Template's Edit Profile
// screen has none to copy, and the Editor is where a Profile is changed). Overturned if a half-onboarded Creator must log out too.
function logOut() {
  signOut();
  show('/edit/login', drawLogin);
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

window.addEventListener('popstate', route);
route();
