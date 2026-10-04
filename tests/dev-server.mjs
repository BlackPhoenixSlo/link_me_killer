// Tiny stand-in for `netlify dev`: serves the Page Copy (app/public) statically,
// rewrites unknown paths to /index.html, and mounts netlify/functions/<name>.js at
// /.netlify/functions/<name>. Phase 2 replaces this with docker compose.
// Until tickets 02 and 04, Profiles (/api/profiles/*.json) and functions still come from the v1 Snapshot.
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../app/public/', import.meta.url));
const SNAPSHOT = fileURLToPath(new URL('../linkme_clone3/', import.meta.url));
const PROFILES_DIR = fileURLToPath(new URL('../linkme_clone3/api/profiles/', import.meta.url));
const FUNCTIONS_DIR = join(SNAPSHOT, 'netlify', 'functions');
const PORT = Number(process.env.PORT) || 4173;
const require = createRequire(import.meta.url);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webm': 'video/webm',
};

async function runFunction(name, url, req, res) {
  // Drop cached function modules so edits are picked up without restarting the server.
  for (const key of Object.keys(require.cache)) if (key.startsWith(FUNCTIONS_DIR)) delete require.cache[key];

  let handler;
  try {
    ({ handler } = require(join(FUNCTIONS_DIR, `${name}.js`)));
  } catch {}
  if (typeof handler !== 'function') {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    return res.end(`Function not found: ${name}`);
  }

  const result = await handler({
    httpMethod: req.method,
    path: url.pathname,
    queryStringParameters: Object.fromEntries(url.searchParams),
    headers: req.headers,
  }, {});
  res.writeHead(result.statusCode ?? 200, result.headers);
  res.end(result.body ?? '');
}

async function serveStatic(pathname, res, root = ROOT) {
  let file = resolve(root, '.' + decodeURIComponent(pathname));
  const inside = file.startsWith(root) || file + sep === root;
  const isFile = inside && (await stat(file).catch(() => null))?.isFile();
  if (!isFile) file = join(ROOT, 'index.html'); // [[redirects]] from = "/*" to = "/index.html" status = 200

  res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' });
  res.end(await readFile(file));
}

createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    const fn = url.pathname.match(/^\/\.netlify\/functions\/([\w-]+)\/?$/);
    const profile = url.pathname.match(/^\/api\/profiles\/([\w.-]+\.json)$/);
    if (fn) await runFunction(fn[1], url, req, res);
    else if (profile) await serveStatic('/' + profile[1], res, PROFILES_DIR);
    else await serveStatic(url.pathname, res);
  } catch (err) {
    console.error(err);
    if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Internal error');
  }
}).listen(PORT, () => console.log(`dev server on http://localhost:${PORT}`));
