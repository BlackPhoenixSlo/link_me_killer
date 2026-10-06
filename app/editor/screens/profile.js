// The Profile's own forms (docs/spec/phase-03-auth-and-editor.md; tickets 26 and 27, see app.js): the Profile step, the
// Editor's Profile card, and its "Quick Settings", the Profile's default Mode. The shell's helpers come from app.js; the class
// names are the design brief's (docs/spec/editor-redesign.md, section 5).

import { api, upload, el, render, message, say, fileInput, select, MODE_NAMES, submitting, fieldReasons, onboard, field, steps,
  icon, pageTitle } from '../app.js';

// Writes `fields` to the Profile with the form busy, saying PocketBase's refusal in `status`. On success PocketBase's answer
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

// The Profile's own form, the same for the Profile step and the Editor's Profile card, saved on its one button: in the Editor
// the picture beside its file input, display name (required), the @Username read-only and bio; on the step (the brief's 4.8)
// display name, bio, then the picture. Name and bio are saved first, then a picked picture goes to the upload endpoint.
// `done(status)` runs after a full save.
// ASSUMPTION: the Editor checks the display name itself (whitespace only counts as none) and shows its own message, and a
// refused avatar keeps the Creator on the form with the reason, the name and bio already saved (rung 5: no rollback).
// Overturned if PocketBase must refuse an empty display name, or a half-saved step must be undone.
export function profileForm(profile, { editor = false, button, done }) {
  const displayName = el('input', {
    className: 'e-input',
    name: 'displayName',
    value: profile.displayName || '',
    autocomplete: 'name',
    required: true,
    oninput: () => {
      displayName.removeAttribute('aria-invalid');
      displayName.removeAttribute('aria-describedby');
    },
  });
  const bio = el('textarea', { className: 'e-textarea', name: 'bio', rows: 3, value: profile.bio || '' });
  const avatar = fileInput('avatar');
  const status = message();
  status.id = 'profile-message';
  // The current picture, or a muted circle with a person icon when there is none; exactly one img.avatar on the screen.
  const current = el('img', { className: 'avatar e-avatar e-avatar--lg', alt: '', width: 96, height: 96, 'data-test': 'avatar-preview' });
  const none = el('span', { className: 'e-avatar e-avatar--lg', 'aria-hidden': 'true' }, icon('person'));
  const showAvatar = (url) => {
    current.hidden = !url;
    none.hidden = Boolean(url);
    if (url) current.src = url;
  };
  showAvatar(profile.avatar ? `/api/files/profiles/${profile.id}/${profile.avatar}` : '');
  const form = el('form', {
    className: 'e-form',
    noValidate: true,
    onsubmit: async (event) => {
      event.preventDefault();
      if (!displayName.value.trim()) {
        // The field says why it is invalid, and takes the focus so the name can be typed at once.
        displayName.setAttribute('aria-invalid', 'true');
        displayName.setAttribute('aria-describedby', status.id);
        say(status, 'Enter a display name.');
        return displayName.focus();
      }
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
  const picture = el('div', { className: 'e-profile__picture' }, current, none, editor
    ? field('profile-avatar', 'Change Profile Picture', avatar, { hint: 'jpg, png, heic, gif or webp. It uploads when you press Save profile.' })
    : field('profile-avatar', 'Profile picture', avatar));
  const name = field('profile-display-name', 'Display name', displayName);
  const about = field('profile-bio', 'Bio', bio, { hint: 'Optional. A line or two.' });
  if (editor) {
    const username = el('input', { className: 'e-input', name: 'username', value: profile.username, readOnly: true });
    form.append(picture, name, field('profile-username', 'Username', username, { hint: 'Your page\'s address. It can\'t be changed.', prefix: '@' }), about);
  } else {
    form.append(name, about, picture);
  }
  form.append(el('button', { type: 'submit', className: 'e-btn e-btn--primary e-btn--block' }, button), status);
  return form;
}

// The Profile step, Onboarding step 3 of 5, in one card: the Profile's own form, then on to the next Onboarding step.
export function drawProfileStep(profile) {
  render('Your Profile', el('div', { className: 'e-card' },
    steps(3),
    pageTitle('Your Profile'),
    el('p', { className: 'e-page__lead' }, 'What Visitors see at the top of your page. A photo in jpg, png, heic, gif or webp.'),
    profileForm(profile, { button: 'Continue', done: () => onboard() })));
}

// What each default Mode does, in one plain sentence, as app/public/script.js does it (the brief's ruling 13).
const MODE_HELP = {
  direct: 'Direct opens the Destination straight away.',
  escape_ig: 'Escape shows Visitors in the Instagram or TikTok browser a screen that helps them into Safari or Chrome; a Visitor already in a real browser never sees it.',
  deeplink: 'Deeplink on tap sends the Visitor to Safari or Chrome the moment they tap the Link, from Instagram, TikTok and other apps\' in-app browsers on iPhone and Android, with no how-to screen. Safari or Chrome then opens the Destination.',
  deeplink_open: 'Deeplink at open sends the Visitor to Safari or Chrome as soon as your page opens in Instagram, TikTok and other apps\' in-app browsers on iPhone and Android, once per tab, with no how-to screen. Taps there behave like Deeplink on tap.',
};

// A select field whose hint (`{id}-help`) explains the option chosen and changes with it (aria-live); a change saves nothing.
function explained(id, label, control, help) {
  const node = field(id, label, control, { hint: help[control.value] });
  const hint = node.querySelector(`#${id}-help`);
  hint.setAttribute('aria-live', 'polite');
  control.addEventListener('change', () => {
    hint.textContent = help[control.value];
  });
  return node;
}

// "Quick Settings" on the Editor's home: the Profile's default Mode, saved on one button (saveProfile). The
// helper under the select explains the option now selected and changes with it; nothing is saved until "Save default Mode".
// Under the Mode's helper, a line that does not change says what the default Mode applies to.
// ASSUMPTION: the default Mode has its own form and Save button in "Quick Settings" rather than saving when the select
// changes (rung 2: the spec's Contracts, "Each form saves on its own Save button, with no autosave"). Overturned if the
// Operator wants the Template's toggle that acts at once.
// An empty stored default Mode shows as Escape, as PocketBase's field reads it (pocketbase/pb_migrations/1791140001_profiles.js:22).
export function quickSettings(profile) {
  const mode = select('mode', Object.entries(MODE_NAMES), profile.mode || 'escape_ig');
  const modeField = explained('default-mode', 'Default Mode', mode, MODE_HELP);
  modeField.querySelector('#default-mode-help').setAttribute('data-test', 'default-mode-help');
  modeField.append(el('p', { className: 'e-field__hint', id: 'default-mode-note' }, 'Every Link left on “Profile default” follows this Mode.'));
  mode.setAttribute('aria-describedby', 'default-mode-help default-mode-note');
  const modeSaved = message();
  const settings = el('form', {
    className: 'e-form',
    // A changed choice is not saved yet, so an earlier "Default Mode saved." goes.
    onchange: () => {
      modeSaved.textContent = '';
    },
    onsubmit: async (event) => {
      event.preventDefault();
      if (await saveProfile(profile, settings, modeSaved, { mode: mode.value })) say(modeSaved, 'Default Mode saved.', 'ok');
    },
  },
  modeField,
  el('button', { type: 'submit', className: 'e-btn e-btn--primary e-btn--block' }, 'Save default Mode'),
  modeSaved);
  return settings;
}
