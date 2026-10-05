// The Profile's own forms (docs/spec/phase-03-auth-and-editor.md; tickets 26 and 27, see app.js): the Profile step, the
// Editor's Profile panel, and its "Quick Settings", the Profile's default Mode. The shell's helpers come from app.js.

import { api, upload, el, render, message, say, fileInput, select, MODE_NAMES, submitting, fieldReasons, onboard } from '../app.js';

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
export function profileForm(profile, { editor = false, button, done }) {
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
export function drawProfileStep(profile) {
  render('Your Profile', el('h1', {}, 'Your Profile'), el('p', { className: 'hint' }, 'What Visitors see at the top of your page. A photo in jpg, png, heic, gif or webp.'),
    profileForm(profile, { button: 'Continue', done: () => onboard() }));
}

// "Quick Settings" on the Editor's home: the Profile's default Mode, saved on its own button (saveProfile).
// ASSUMPTION: the default Mode has its own form and Save button in "Quick Settings" rather than saving when the select
// changes (rung 2: the spec's Contracts, "Each form saves on its own Save button, with no autosave"). Overturned if the
// Operator wants the Template's toggle that acts at once.
// An empty stored default Mode shows as Escape, as PocketBase's field reads it (pocketbase/pb_migrations/1791140001_profiles.js:22).
export function quickSettings(profile) {
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
  return settings;
}
