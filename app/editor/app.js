// The Editor (docs/spec/phase-03-auth-and-editor.md): static, no build step, no package. It calls PocketBase's REST API
// same-origin through the app's proxy with plain fetch, keeps the auth token in localStorage and sends it as the
// Authorization header. Every Creator-entered or PocketBase-sent string is put in the page as text (textContent or a text
// node), never as HTML.
// Native ES modules. This file is the shell: the PocketBase calls, the rendering and navigation helpers the screens share,
// and the router, started at the end once every module has loaded. The screens are in screens/auth.js, screens/links.js,
// screens/profile.js and stats.js; they import the helpers from here, and the router imports them.
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

import { drawLogin, drawSignup, drawClaim, drawRetry, drawVerify, drawVerified, drawReset, drawForgot } from './screens/auth.js';
import { drawLinkForm, drawHome } from './screens/links.js';
import { drawProfileStep } from './screens/profile.js';
import { openStats } from './stats.js';

const TOKEN = 'ofl.token';
const screen = document.getElementById('screen');
const title = document.getElementById('title');
export let account = null; // the signed-in users record, from the last sign-in or refresh

// ---- PocketBase, through the proxy --------------------------------------------------------------------------------------

// A FormData body (a Link with its stock icon) goes as it is, and the browser sets the multipart content type itself.
export async function api(path, { method = 'GET', body, keepalive = false } = {}) {
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
export async function upload(collection, recordId, field, file) {
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

export function signedIn({ token, record }) {
  localStorage.setItem(TOKEN, token);
  account = record;
}

export function signOut() {
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
export async function refresh() {
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

export function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
    else if (key in node && key !== 'list') node[key] = value;
    else node.setAttribute(key, value);
  }
  for (const child of children) node.append(typeof child === 'string' ? document.createTextNode(child) : child);
  return node;
}

export function render(heading, ...children) {
  title.textContent = heading;
  document.title = `${heading} · ofl.ink`;
  screen.replaceChildren(el('section', { className: 'card' }, ...children));
}

export function message() {
  return el('p', { className: 'message', role: 'status' });
}

export function say(node, text, kind = 'error') {
  node.className = `message ${kind}`;
  node.textContent = text;
}

// The Username field lowercases what is typed, keeping the caret where it was.
export function usernameInput(value = '') {
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

export function addressField(input) {
  return el('label', {}, 'Username', el('div', { className: 'address' }, el('span', {}, `${location.host}/`), input));
}

// PocketBase's per-field refusals as one line each, e.g. "Password: Must be at least 8 character(s)."
const LABELS = { email: 'Email', password: 'Password', passwordConfirm: 'Password', title: 'Title', destination: 'Destination', geo: 'Geo Rule' };
export function fieldReasons(res, fallback) {
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
export function claimReason(res, username) {
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

export function show(path, draw) {
  if (location.pathname !== path) history.replaceState(null, '', path);
  draw();
}

export function go(path) {
  history.pushState(null, '', path);
  route();
}

export function link(text, path) {
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
export async function onboard() {
  const done = await onboarded();
  if (done) show('/edit/home', () => drawHome(done.profile, done.links));
}

// The onboarded Creator's Profile and its Links, for the screens past Onboarding (the Editor, Stats); otherwise it draws Retry
// or the first Onboarding step that applies and returns nothing. Its callers hold the fresh token onboard() needs.
export async function onboarded() {
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
export function linksOf(profile) {
  const filter = encodeURIComponent(`profile='${profile.id}'`);
  return api(`links/records?perPage=500&sort=order&filter=${filter}&fields=id,title,order`);
}

export async function route() {
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
export function creatorNav(current) {
  const entry = (text, path) => {
    const a = link(text, path);
    if (path === current) a.setAttribute('aria-current', 'page');
    return a;
  };
  return el('nav', { className: 'creator-nav', 'aria-label': 'Creator' }, entry('Editor', '/edit'), entry('Stats', '/edit/stats'));
}

// ---- Shared by the screens ----------------------------------------------------------------------------------------------

export function submitting(form, busy) {
  for (const control of form.elements) control.disabled = busy;
}

const IMAGE_TYPES = 'image/jpeg,image/png,image/heic,image/heif,image/gif,image/webp,.heic,.heif';
export const MODE_NAMES = { direct: 'Direct', escape_ig: 'Escape', deeplink: 'Deeplink' };
// v1's stock icons, the n8n Form's options. A chosen one is stored as the Page Copy's own WebP file in the Link's icon field,
// byte for byte, the way the v1 Import stores an imported stock icon (app/bin/import-v1 copies a WebP image unchanged).
// ASSUMPTION: the Editor fetches the stock WebP from `/images/` and sends it in the Link's own multipart write through the
// proxy, rather than through the upload endpoint, which would re-encode it (rung 3: the v1 Import's byte-for-byte copy; rung
// 5: no new endpoint). Overturned if stock icons must be stored as a name rather than a file; that needs a field.
export const ICONS = [
  ['', 'None'],
  ['onlyicon.webp', 'OnlyFans'],
  ['linkicon.webp', 'Link'],
  ['twitchicon.webp', 'Twitch'],
  ['igicon.webp', 'Instagram'],
];

export const address = (profile) => `${location.origin}/${profile.username}`;

export function fileInput(name) {
  return el('input', { type: 'file', name, accept: IMAGE_TYPES });
}

export function select(name, options, value = '') {
  const node = el('select', { name }, ...options.map(([v, text]) => el('option', { value: v }, text)));
  node.value = value;
  return node;
}

export function check(name, text, checked = false) {
  const box = el('input', { type: 'checkbox', name, checked });
  return { box, row: el('label', { className: 'check' }, box, text) };
}

// Copies the address, saying whether it worked.
export function copyButton(text, status) {
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

// Log out ends the session on this device: the token goes and log-in shows. PocketBase keeps no session to end.
// ASSUMPTION: "Log out" sits at the foot of the Editor only, not on the Onboarding screens (rung 5: the Template's Edit Profile
// screen has none to copy, and the Editor is where a Profile is changed). Overturned if a half-onboarded Creator must log out too.
export function logOut() {
  signOut();
  show('/edit/login', drawLogin);
}

window.addEventListener('popstate', route);
route();
