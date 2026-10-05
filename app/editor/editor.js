'use strict';
// The Editor (docs/spec/phase-03-auth-and-editor.md): static, no build step, no package. It calls PocketBase's REST API
// same-origin through the app's proxy with plain fetch, keeps the auth token in localStorage and sends it as the
// Authorization header. Every Creator-entered or PocketBase-sent string is put in the page as text (textContent or a text
// node), never as HTML.
// Ticket 25: log-in, sign-up, the claim step and the "verify your email" screen. `/edit` sends a Creator with no session to
// log-in, and a signed-in one to the first Onboarding step that applies: no Profile, the claim step; email not verified, the
// verify screen. Ticket 26 adds the later steps.
// ASSUMPTION: a signed-in, verified Creator with a Profile sees a bare "Edit Profile" screen holding only "Your Bio Link"
// until ticket 26 adds the Profile step and the Editor (rung 5: somewhere to land, nothing more). Overturned by ticket 26.

const TOKEN = 'ofl.token';
const screen = document.getElementById('screen');
const title = document.getElementById('title');
let account = null; // the signed-in users record, from the last sign-in or refresh

// ---- PocketBase, through the proxy --------------------------------------------------------------------------------------

async function api(path, { method = 'GET', body, keepalive = false } = {}) {
  const headers = {};
  const token = localStorage.getItem(TOKEN);
  if (token) headers.Authorization = token;
  if (body !== undefined) headers['content-type'] = 'application/json';
  const res = await fetch(`/api/collections/${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
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
// token makes an empty list mean "no Profile".
async function onboard() {
  const res = await api('profiles/records?perPage=1');
  if (!res.ok) return drawRetry(res.data.message || 'PocketBase did not answer.');
  const profile = res.data.items[0];
  if (!profile) return show('/edit/claim', () => drawClaim());
  if (!account.verified) return show('/edit/verify-email', drawVerify);
  return show('/edit/home', () => drawHome(profile));
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

function drawHome(profile) {
  render('Edit Profile', el('h1', {}, 'Edit Profile'),
    el('div', { className: 'bio-link' }, el('span', { className: 'label' }, 'Your Bio Link'), el('span', { className: 'value' }, `${location.host}/${profile.username}`)));
}

window.addEventListener('popstate', route);
route();
