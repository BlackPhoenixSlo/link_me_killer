'use strict';
// The app behind Caddy (docs/spec/phase-02-vps-foundation.md). Ticket 16 adds the Visitor routes;
// until then every request gets Hono's own 404, which is enough for the stack to come up.
const { Hono } = require('hono');
const { serve } = require('@hono/node-server');

const app = new Hono();

serve({ fetch: app.fetch, port: 3000 });
