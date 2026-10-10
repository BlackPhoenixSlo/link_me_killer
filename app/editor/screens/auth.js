// The Editor's sign-in screens (docs/spec/phase-03-auth-and-editor.md; tickets 25, 29 and 31, see app.js): log-in, sign-up,
// the claim step, "verify your email", Retry, and the two screens the emails link to with "Forgot password?". The shell's
// helpers come from app.js, whose router draws these screens. Layout and copy: docs/spec/editor-redesign.md section 4 (4.1-4.7,
// 4.16); class names: its section 5.

import { account, api, signedIn, signOut, refresh, el, render, message, say, usernameInput, fieldReasons, claimReason, show,
  go, link, onboard, route, submitting, field, steps, icon, pageTitle, useProfile, NO_ANSWER } from '../app.js';

// ---- The parts every screen here is built from -----------------------------------------------------------------------------

// An auth screen: one card in the page's narrow column (the brief's layout for auth and Onboarding), headed `heading`.
const draw = (heading, ...children) => render(heading, el('div', { className: 'e-card' }, ...children));

const lead = (...text) => el('p', { className: 'e-page__lead' }, ...text);
const quiet = (...children) => el('p', { className: 'e-page__links' }, ...children);
const actions = (...children) => el('div', { className: 'e-page__actions' }, ...children);
// The round mark above a screen's h1 (mail, check).
const mark = (name, tone = '') => el('span', { className: `e-page__icon${tone && ` e-page__icon--${tone}`}`, 'aria-hidden': 'true' }, icon(name));
const input = (props) => el('input', { className: 'e-input', required: true, ...props });

function textLink(text, path) {
  const a = link(text, path);
  a.className = 'e-link';
  return a;
}

const primary = (text, props) => el('button', { className: 'e-btn e-btn--primary e-btn--block', type: 'submit', ...props }, text);
const secondary = (text, props) => el('button', { className: 'e-btn e-btn--secondary e-btn--block', type: 'button', ...props }, text);

const usernameField = (control, hint) => field('auth-username', 'Username', control, { hint, prefix: `${location.host}/` });

// A lone button's request (Verify's Continue and Resend email): the button is disabled and spins (aria-busy) while it runs, and
// has the focus again after, as submitting() does for a form.
async function pressed(button, request) {
  button.disabled = true;
  button.setAttribute('aria-busy', 'true');
  const answer = await request();
  button.disabled = false;
  button.removeAttribute('aria-busy');
  if (button.isConnected) button.focus();
  return answer;
}

// ---- Log-in, sign-up and the claim ----------------------------------------------------------------------------------------

export function drawLogin() {
  // Log-in reached from an ended session carries a return path; it lands by the Onboarding rule all the same.
  const ended = new URLSearchParams(location.search).has('next');
  const email = input({ name: 'email', type: 'email', autocomplete: 'email' });
  const password = input({ name: 'password', type: 'password', autocomplete: 'current-password' });
  const status = message();
  const form = el('form', {
    className: 'e-form',
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
  field('auth-email', 'Email', email),
  field('auth-password', 'Password', password),
  status,
  primary('Log in'));
  // An ended session's banner takes the lead's place; it is not a status, so the form's own stays the only one.
  const intro = ended
    ? el('p', { className: 'e-msg e-msg--info' }, 'Your session has ended. Log in to carry on.')
    : lead('Edit your ofl.ink Profile.');
  draw('Log in', pageTitle('Log in'), intro, form,
    quiet(textLink('Forgot password?', '/edit/forgot')),
    quiet('New here? ', textLink('Sign up', '/edit/signup')));
}

export function drawSignup() {
  const email = input({ name: 'email', type: 'email', autocomplete: 'email' });
  const password = input({ name: 'password', type: 'password', autocomplete: 'new-password' });
  const username = usernameInput();
  const status = message();
  const form = el('form', {
    className: 'e-form',
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
      const claimed = await claim(wanted, 1);
      if (!claimed.ok) return show('/edit/claim', () => drawClaim({ username: wanted, error: claimReason(claimed, wanted) }));
      return onboard();
    },
  },
  field('auth-email', 'Email', email),
  field('auth-password', 'Password', password, { hint: 'At least 8 characters.' }),
  usernameField(username, 'Lowercase letters, digits and _, 3 to 30 characters.'),
  status,
  primary('Create account'));
  draw('Sign up', steps(1), pageTitle('Create your page'), lead('Your email, a password and the Username your page lives at.'), form,
    quiet('Already have an account? ', textLink('Log in', '/edit/login')));
}

// The claim: the Profile with only the Username, the Creator as owner, Escape Mode as its default Mode and its slot (Phase 6:
// 1 for an account's first Profile, the next free one for "Add a Profile").
function claim(username, slot) {
  return api('profiles/records', { method: 'POST', body: { username, owner: account.id, mode: 'escape_ig', slot } });
}

// `error`, the sign-up's refused claim, shows at once and describes the Username field. `slot` above 1 is "Add a Profile"
// (`/edit/new`): the claimed Profile becomes the current one, and Cancel goes back to the Editor.
export function drawClaim({ username = '', error = '', slot = 1 } = {}) {
  const control = usernameInput(username);
  const status = message();
  const form = el('form', {
    className: 'e-form',
    onsubmit: async (event) => {
      event.preventDefault();
      submitting(form, true);
      const wanted = control.value;
      const res = await claim(wanted, slot);
      submitting(form, false);
      if (!res.ok) return say(status, claimReason(res, wanted));
      useProfile(res.data.id);
      return onboard();
    },
  },
  usernameField(control),
  status,
  primary('Claim'));
  if (error) {
    status.id = 'claim-error';
    control.setAttribute('aria-describedby', status.id);
    say(status, error);
  }
  const another = slot > 1;
  draw('Claim your Username', steps(1), pageTitle('Claim your Username'),
    lead(`It becomes your ${another ? 'new Profile' : 'page'}'s address. Lowercase letters, digits and _, 3 to 30 characters.`), form,
    ...(another ? [quiet(textLink('Cancel', '/edit'))] : []));
}

// Retry, for a call that failed: `reason` is PocketBase's message, or none when it sent none.
export function drawRetry(reason = NO_ANSWER) {
  const status = message();
  say(status, reason);
  draw('Try again', pageTitle('Try again'), actions(status, primary('Try again', { type: 'button', onclick: route })));
}

// PocketBase answers 204 to a repeat request inside its throttle window and sends nothing (observed on 0.40.4), so the
// screen says the email was asked for, never that one went out.
const resendAsked = (email) => `We asked for a new link to ${email}. If none arrives within a few minutes, check your spam folder and try again.`;

export function drawVerify() {
  const status = message();
  const resend = secondary('Resend email', {
    onclick: async () => {
      const res = await pressed(resend, () => api('users/request-verification', { method: 'POST', body: { email: account.email } }));
      if (res.ok) say(status, resendAsked(account.email), 'ok');
      else say(status, res.data.message || 'The email could not be sent. Try again.');
    },
  });
  const next = primary('Continue', {
    type: 'button',
    onclick: async () => {
      const ok = await pressed(next, refresh);
      if (!ok) return show('/edit/login', drawLogin);
      if (!account.verified) return say(status, 'Your email is not verified yet. Open the link in the email we sent you, then press Continue.');
      return onboard();
    },
  });
  draw('Verify your email', steps(2), mark('mail'), pageTitle('Verify your email'),
    lead('We sent a link to ', el('strong', {}, account.email), '. Open it to verify your email, then press Continue.'),
    actions(status, next, resend));
}

// ---- The emails' screens -------------------------------------------------------------------------------------------------

const CHECK_INBOX = 'If an account uses that address, we sent it a link. Check your inbox.';
const linkToken = () => new URLSearchParams(location.search).get('token') || '';

// An email field whose button asks PocketBase to send `endpoint`'s email. PocketBase answers 204 whether or not an account uses
// the address, so the screen says the same either way and reveals nothing about who has one.
function mailForm(button, endpoint) {
  const email = input({ name: 'email', type: 'email', autocomplete: 'email' });
  const status = message();
  const form = el('form', {
    className: 'e-form',
    onsubmit: async (event) => {
      event.preventDefault();
      submitting(form, true);
      const res = await api(`users/${endpoint}`, { method: 'POST', body: { email: email.value } });
      submitting(form, false);
      if (res.ok) say(status, CHECK_INBOX, 'ok');
      else say(status, fieldReasons(res, 'The email could not be sent. Try again.'));
    },
  },
  field('auth-email', 'Email', email),
  status,
  primary(button));
  return form;
}

function drawInvalidLink(what, button, endpoint) {
  draw('Link invalid or expired', pageTitle('Link invalid or expired'),
    lead(`This ${what} link is invalid or expired. Enter your email and we will send you a new one.`),
    mailForm(button, endpoint));
}

// The verification email's link. PocketBase confirms its token whether or not this browser is signed in; Continue then goes
// through `/edit`, which lands a signed-in Creator on their next Onboarding step and anyone else on log-in. Until the answer
// comes, the page's loading skeleton (index.html) stays.
export async function drawVerified() {
  const res = await api('users/confirm-verification', { method: 'POST', body: { token: linkToken() } });
  // A verification token is spent on first use, so the Creator's own click can land after something else already spent
  // it — an email provider's link scanner, a preview fetch, or the link reopened in a second tab — and PocketBase then
  // refuses it. A refusal is therefore not proof the email is unverified. When this device's signed-in account already
  // reads as verified, the link did its job and the "invalid" screen would be a lie, so show success either way.
  if (res.ok || (await verifiedNow())) {
    return draw('Email verified', mark('check', 'ok'), pageTitle('Email verified'), lead('Your email is verified.'),
      actions(primary('Continue', { type: 'button', onclick: () => go('/edit') })));
  }
  return drawInvalidLink('verification', 'Resend email', 'request-verification');
}

// Whether this device is signed in as the very account the refused link names, with its email now verified — read from a
// token refresh without disturbing the stored token. The link's subject is read from its own JWT payload (not trusted for
// auth; the server already decided verification). A different account, no session, or any refusal is false, so only a link
// that truly did its job shows success and a genuinely bad one still shows as invalid.
async function verifiedNow() {
  const subject = tokenSubject(linkToken());
  if (!subject) return false;
  const res = await api('users/auth-refresh', { method: 'POST' });
  return res.ok && !!res.data.record && res.data.record.id === subject && res.data.record.verified === true;
}

// The user id a PocketBase token names, from its unverified JWT payload; '' when the token is missing or unreadable.
function tokenSubject(token) {
  try {
    return JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).id || '';
  } catch {
    return '';
  }
}

// The reset email's link: a new password for the account its token names. PocketBase says whether the token is good only when
// the password is sent, so a bad or expired link shows as such then.
// ASSUMPTION: the token is checked on submit rather than on opening (rung 5: PocketBase has no call that checks a reset token
// without using it). Overturned if the screen must say so before a password is typed; the Editor would then read the token's
// expiry itself.
export function drawReset() {
  const password = input({ name: 'password', type: 'password', autocomplete: 'new-password' });
  const status = message();
  const form = el('form', {
    className: 'e-form',
    onsubmit: async (event) => {
      event.preventDefault();
      submitting(form, true);
      const body = { token: linkToken(), password: password.value, passwordConfirm: password.value };
      const res = await api('users/confirm-password-reset', { method: 'POST', body });
      submitting(form, false);
      if (res.ok) {
        return draw('Password changed', pageTitle('Password changed'), lead('Log in with your new password.'),
          actions(primary('Log in', { type: 'button', onclick: () => go('/edit/login') })));
      }
      if (res.data.data && res.data.data.token) return drawInvalidLink('reset', 'Send a new link', 'request-password-reset');
      return say(status, fieldReasons(res, 'The password could not be set. Try again.'));
    },
  },
  field('auth-password', 'New password', password, { hint: 'At least 8 characters.' }),
  status,
  primary('Set password'));
  draw('Set a new password', pageTitle('Set a new password'), form);
}

export function drawForgot() {
  draw('Forgot password', pageTitle('Forgot password'),
    lead('Enter your email and we will send you a link to set a new password.'),
    mailForm('Send reset link', 'request-password-reset'),
    quiet(textLink('Back to log in', '/edit/login')));
}
