// The Editor's sign-in screens (docs/spec/phase-03-auth-and-editor.md; tickets 25, 29 and 31, see app.js): log-in, sign-up,
// the claim step, "verify your email", Retry, and the two screens the emails link to with "Forgot password?". The shell's
// helpers come from app.js, whose router draws these screens.

import { account, api, signedIn, signOut, refresh, el, render, message, say, usernameInput, addressField, fieldReasons,
  claimReason, show, go, link, onboard, route, submitting } from '../app.js';

export function drawLogin() {
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

export function drawSignup() {
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

export function drawClaim({ username = '', error = '' } = {}) {
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

export function drawRetry(reason) {
  const status = message();
  say(status, reason);
  render('Try again', el('h1', {}, 'Try again'), status, el('button', { type: 'button', onclick: route }, 'Try again'));
}

// PocketBase answers 204 to a repeat request inside its throttle window and sends nothing (observed on 0.40.4), so the
// screen says the email was asked for, never that one went out.
const resendAsked = (email) => `We asked for a new link to ${email}. If none arrives within a few minutes, check your spam folder and try again.`;

export function drawVerify() {
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
export async function drawVerified() {
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
export function drawReset() {
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

export function drawForgot() {
  render('Forgot password', el('h1', {}, 'Forgot password'),
    el('p', { className: 'hint' }, 'Enter your email and we will send you a link to set a new password.'),
    mailForm('Send reset link', 'request-password-reset'),
    el('p', { className: 'switch' }, link('Back to log in', '/edit/login')));
}
