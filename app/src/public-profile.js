'use strict';
// Public Profile: records to the Profile JSON (docs/spec/phase-02-vps-foundation.md, Contracts).
// Never sent: destination, geo, owner, v1Key.
// The Deeplink Modes are Profile defaults only (ADR 0003, amended 2026-10-06): a Link's own Mode is honoured only if Direct
// or Escape, and anything else on a Link (a Deeplink Mode included) is normalised like an unknown Mode, to the Profile default.
// `deeplink_script` is Deeplink on tap by a scripted pop-out, a test variant kept so a phone can compare the two.
const LINK_MODES = new Set(['direct', 'escape_ig']);
const DEEPLINK_MODES = new Set(['deeplink', 'deeplink_script', 'deeplink_open']);
const PROFILE_MODES = new Set([...LINK_MODES, ...DEEPLINK_MODES]);

const fileUrl = (collection, record, field) => (record[field] ? `/api/files/${collection}/${record.id}/${record[field]}` : '');

function toPublicProfile(profile, links, origin) {
  const profileMode = PROFILE_MODES.has(profile.mode) ? profile.mode : 'escape_ig';
  return {
    profile: {
      // The record id: the per-Profile Tracking Code key (docs/spec/phase-04-stats.md, Contracts, Tracking Code storage).
      id: profile.id,
      username: profile.username,
      displayName: profile.displayName,
      bio: profile.bio,
      avatarUrl: fileUrl('profiles', profile, 'avatar'),
      verified: profile.verified,
      mode: profileMode,
    },
    links: links.map((link) => {
      const mode = LINK_MODES.has(link.mode) ? link.mode : profileMode;
      return {
        id: link.linkId,
        title: link.title,
        isAdult: link.isAdult,
        tracking: link.tracking,
        ...(link.defaultTrackingCode ? { default_tracknumber: link.defaultTrackingCode } : {}),
        mode,
        icon: fileUrl('links', link, 'icon'),
        backgroundImage: fileUrl('links', link, 'backgroundImage'),
        url: !link.isAdult && !DEEPLINK_MODES.has(mode) ? `${origin}/r/${link.linkId}` : '',
      };
    }),
  };
}

module.exports = { toPublicProfile };
