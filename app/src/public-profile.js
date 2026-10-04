'use strict';
// Public Profile: records to the Profile JSON (docs/spec/phase-02-vps-foundation.md, Contracts).
// Never sent: destination, geo, owner, v1Key.
const MODES = new Set(['direct', 'escape_ig', 'deeplink']);

const fileUrl = (collection, record, field) => (record[field] ? `/api/files/${collection}/${record.id}/${record[field]}` : '');

function toPublicProfile(profile, links, origin) {
  const profileMode = MODES.has(profile.mode) ? profile.mode : 'escape_ig';
  return {
    profile: {
      username: profile.username,
      displayName: profile.displayName,
      bio: profile.bio,
      avatarUrl: fileUrl('profiles', profile, 'avatar'),
      verified: profile.verified,
      mode: profileMode,
    },
    links: links.map((link) => {
      const mode = MODES.has(link.mode) ? link.mode : profileMode;
      return {
        id: link.linkId,
        title: link.title,
        isAdult: link.isAdult,
        tracking: link.tracking,
        ...(link.defaultTrackingCode ? { default_tracknumber: link.defaultTrackingCode } : {}),
        mode,
        icon: fileUrl('links', link, 'icon'),
        backgroundImage: fileUrl('links', link, 'backgroundImage'),
        url: !link.isAdult && mode !== 'deeplink' ? `${origin}/r/${link.linkId}` : '',
      };
    }),
  };
}

module.exports = { toPublicProfile };
