'use strict';
// PocketBase gateway: the app's only door to PocketBase (docs/spec/phase-02-vps-foundation.md, Interfaces).
// Reads run as the superuser named in the environment, signing in again when PocketBase refuses the token.
// Nothing here logs: a record can hold a Destination, so errors carry only a fixed message.
// A refused read is retried once after a fresh sign-in, on 401 or on 403: PocketBase 0.40.4 reads a superuser-only collection
// with a token it no longer accepts as a guest's read and answers 403 (observed on the test stack; 02-v1-import's stack checks
// invalidate the app's token and read through the app).
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
  }

  async function read(pathname) {
    if (!token) await signIn();
    let res = await fetch(url + pathname, { headers: { Authorization: token } });
    if (res.status === 401 || res.status === 403) {
      await res.body?.cancel();
      await signIn();
      res = await fetch(url + pathname, { headers: { Authorization: token } });
    }
    return res;
  }

  async function records(collection, filter, sort) {
    const query = `perPage=1000&filter=${encodeURIComponent(filter)}${sort ? `&sort=${sort}` : ''}`;
    const res = await read(`/api/collections/${collection}/records?${query}`);
    if (!res.ok) throw new Error(`PocketBase list of ${collection} refused`);
    return (await res.json()).items;
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
      const res = await read(`/api/files/${collection}/${recordId}/${encodeURIComponent(filename)}`);
      if (!res.ok) {
        await res.body?.cancel();
        return null;
      }
      return res;
    },
  };
}

module.exports = { createGateway };
