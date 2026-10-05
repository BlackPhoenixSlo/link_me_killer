'use strict';
// PocketBase gateway: the app's only door to PocketBase (docs/spec/phase-02-vps-foundation.md, Interfaces).
// Reads run as the superuser named in the environment, signing in again when PocketBase refuses the token.
// Nothing here logs: a record can hold a Destination, so errors carry only a fixed message.
// A refused read is retried once after a fresh sign-in, on 401 or on 403: PocketBase 0.40.4 reads a superuser-only collection
// with a token it no longer accepts as a guest's read and answers 403 (observed on the test stack; 02-v1-import's stack checks
// invalidate the app's token and read through the app).
// From Phase 3 on the profiles list rule is open to owners (1791140004_sign_up_and_claim.js), so a token PocketBase no longer
// accepts reads profiles as a guest's empty list (200), not 403. An empty profiles list is therefore confirmed per token used:
// when the list's fetch ran on a token `read()` had just signed in for, it stands; when another request has since replaced that
// token, the list runs once more on the current one with no refresh; otherwise that same token is refreshed through
// `_superusers/auth-refresh`, and if that is refused the gateway signs in again and reads once more.
// From ticket 26 on the links list rule is open to the owner of a Link's Profile (1791140005_content_rules.js), and a token
// PocketBase no longer accepts lists links as a guest's empty list (200) too (observed on the test stack, 2026-10-05: a garbage
// token lists links 200 empty and events 403), so an empty links list is confirmed the same way.
// ASSUMPTION: only an unknown Username or Link Id, and a Profile with no Link, costs one extra call (the refresh or the second
// list), with no time bound, because a bound would serve a real Profile or Link as missing for up to that long after the token
// is invalidated (rung 5: a refresh is a token check, not a password hash; the Click guard already limits `/r` and Reveal per
// client). Overturned if a scan of unknown Usernames or Link Ids must cost one call each; the gateway then tracks the token's
// expiry and invalidation another way.
const USERNAME = /^[a-z0-9_]+$/;
const LINK_ID = /^[a-z0-9]{12}$/;
// Hono decodes %2F in a path parameter, so an unchecked record id such as `../../collections/links/records` would turn a file
// read into a superuser record view (observed with Hono's router for this ticket).
const RECORD_ID = /^[a-z0-9]{15}$/;

function createGateway({ url, email, password }) {
  let token = null;

  async function signIn() {
    const res = await fetch(`${url}/api/collections/_superusers/auth-with-password`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ identity: email, password }),
    });
    if (!res.ok) throw new Error('PocketBase superuser sign-in refused');
    token = (await res.json()).token;
    return token;
  }

  // { res, sent, fresh }: the response, the token its final fetch carried, and whether this call had just signed in for it.
  async function read(pathname) {
    let fresh = !token;
    let sent = token || (await signIn());
    let res = await fetch(url + pathname, { headers: { Authorization: sent } });
    if (res.status === 401 || res.status === 403) {
      await res.body?.cancel();
      sent = await signIn();
      fresh = true;
      res = await fetch(url + pathname, { headers: { Authorization: sent } });
    }
    return { res, sent, fresh };
  }

  // Is `sent` still a superuser's token? A fresh one replaces the shared token when it is.
  async function stillAccepted(sent) {
    const res = await fetch(`${url}/api/collections/_superusers/auth-refresh`, { method: 'POST', headers: { Authorization: sent } });
    if (!res.ok) {
      await res.body?.cancel();
      return false;
    }
    token = (await res.json()).token;
    return true;
  }

  async function records(collection, filter, sort) {
    const query = `perPage=1000&filter=${encodeURIComponent(filter)}${sort ? `&sort=${sort}` : ''}`;
    const list = async () => {
      const { res, sent, fresh } = await read(`/api/collections/${collection}/records?${query}`);
      if (!res.ok) throw new Error(`PocketBase list of ${collection} refused`);
      return { items: (await res.json()).items, sent, fresh };
    };
    let { items, sent, fresh } = await list();
    if (!items.length && !fresh) {
      if (sent !== token) ({ items } = await list());
      else if (!(await stillAccepted(sent))) {
        await signIn();
        ({ items } = await list());
      }
    }
    return items;
  }

  return {
    // The Profile and its Links in `order`, or null. The Username is matched lower-cased.
    async getProfile(username) {
      const name = String(username).toLowerCase();
      if (!USERNAME.test(name)) return null;
      const [profile] = await records('profiles', `username='${name}'`);
      if (!profile) return null;
      return { profile, links: await records('links', `profile='${profile.id}'`, 'order') };
    },
    async getLink(linkId) {
      if (!LINK_ID.test(linkId || '')) return null;
      const [link] = await records('links', `linkId='${linkId}'`);
      return link || null;
    },
    // The file's response from PocketBase (body stream and content type), or null.
    async fetchFile(collection, recordId, filename) {
      if (!RECORD_ID.test(recordId || '')) return null;
      const { res } = await read(`/api/files/${collection}/${recordId}/${encodeURIComponent(filename)}`);
      if (!res.ok) {
        await res.body?.cancel();
        return null;
      }
      return res;
    },
    // The upload's two calls carry the caller's token, never the superuser's, so PocketBase alone decides ownership.
    // Each answers PocketBase's own status; nothing of a record (a Link holds its Destination) leaves here but a file name.
    async viewRecord(collection, recordId, callerToken) {
      if (!RECORD_ID.test(recordId || '')) return 404;
      const res = await fetch(`${url}/api/collections/${collection}/records/${recordId}?fields=id`, { headers: { Authorization: callerToken } });
      await res.body?.cancel();
      return res.status;
    },
    // Replaces the record's file field with the WebP bytes; PocketBase deletes the old file. { status, filename }.
    async replaceFile(collection, recordId, field, webp, callerToken) {
      if (!RECORD_ID.test(recordId || '')) return { status: 404 };
      const form = new FormData();
      form.append(field, new Blob([webp], { type: 'image/webp' }), `${field}.webp`);
      const res = await fetch(`${url}/api/collections/${collection}/records/${recordId}?fields=${field}`, {
        method: 'PATCH',
        headers: { Authorization: callerToken },
        body: form,
      });
      if (!res.ok) {
        await res.body?.cancel();
        return { status: res.status };
      }
      return { status: res.status, filename: (await res.json())[field] };
    },
  };
}

module.exports = { createGateway };
