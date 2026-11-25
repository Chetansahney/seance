// HTTP server: static haunted UI plus a streaming scan API.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { scan } from './scan.js';
import { checkHost } from './net/guard.js';
import { USER_AGENT } from './net/probe.js';

const PUBLIC = resolve(fileURLToPath(new URL('../public', import.meta.url)));
const PORT = Number(process.env.PORT) || 3666;
const MAX_BODY = 1_000_000;
const MAX_PAGE = 3_000_000;
const MAX_LINKS = 300;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.md': 'text/markdown; charset=utf-8',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
};

function readBody(req) {
  return new Promise((ok, fail) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) { fail(new Error('Offering too large (1 MB max)')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => ok(Buffer.concat(chunks).toString('utf8')));
    req.on('error', fail);
  });
}

async function fetchPage(url) {
  const u = new URL(url);
  if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error('Only http(s) pages can be summoned');
  if ((await checkHost(url)) !== 'ok') throw new Error('That page cannot be reached from here');
  const res = await fetch(u, { headers: { 'user-agent': USER_AGENT }, signal: AbortSignal.timeout(12000) });
  if (!res.ok) throw new Error(`The page answered ${res.status}`);
  const text = await res.text();
  if (text.length > MAX_PAGE) throw new Error('That page is too large (3 MB max)');
  return text;
}

async function handleScan(req, res) {
  let input;
  try {
    input = JSON.parse(await readBody(req));
  } catch (err) {
    return json(res, 400, { error: err.message || 'Invalid JSON' });
  }
  let text = typeof input.text === 'string' ? input.text : '';
  let skipHost;
  if (!text && typeof input.url === 'string') {
    try {
      text = await fetchPage(input.url.trim());
      skipHost = new URL(input.url.trim()).hostname;
    } catch (err) { return json(res, 422, { error: err.message }); }
  }
  if (!text.trim()) return json(res, 400, { error: 'Offer a document or a URL to begin.' });

  res.writeHead(200, {
    'content-type': 'text/event-stream; charset=utf-8',
    'cache-control': 'no-cache, no-transform',
    connection: 'keep-alive',
    'x-accel-buffering': 'no',
  });
  const ac = new AbortController();
  res.on('close', () => ac.abort());
  const send = (type, data) => { if (!res.writableEnded) res.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`); };
  const heartbeat = setInterval(() => res.write(': still here\n\n'), 15000);

  try {
    await scan(text, {
      signal: ac.signal,
      maxLinks: MAX_LINKS,
      skipHost,
      onEvent: (type, data) => {
        if (type === 'found' && data.skipped > 0) {
          send('warning', { message: `Found ${data.total + data.skipped} links; only the first ${MAX_LINKS} are checked.` });
        }
        send(type, data);
      },
    }).catch((err) => send('error', { message: err.message }));
  } finally {
    clearInterval(heartbeat);
    res.end();
  }
}

function json(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

async function serveStatic(req, res) {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const file = normalize(join(PUBLIC, path === '/' ? 'index.html' : path));
  if (!file.startsWith(PUBLIC)) return json(res, 403, { error: 'Forbidden' });
  try {
    const body = await readFile(file);
    res.writeHead(200, {
      'content-type': TYPES[extname(file)] ?? 'application/octet-stream',
      'cache-control': 'no-cache',
      'x-content-type-options': 'nosniff',
    });
    res.end(body);
  } catch {
    res.writeHead(404, { 'content-type': 'text/html; charset=utf-8' });
    res.end('<!doctype html><title>404</title><body style="background:#0b0a10;color:#e8e2f2;font-family:serif;text-align:center;padding-top:20vh"><h1>404: this page has passed on</h1><p><a style="color:#b9f5d8" href="/">Return to the graveyard</a></p>');
  }
}

export const server = createServer(async (req, res) => {
  try {
    if (req.method === 'POST' && req.url === '/api/scan') return await handleScan(req, res);
    if (req.method === 'GET' && req.url === '/healthz') return json(res, 200, { ok: true });
    if (req.method === 'GET' || req.method === 'HEAD') return await serveStatic(req, res);
    json(res, 405, { error: 'Method not allowed' });
  } catch (err) {
    if (!res.headersSent) json(res, 500, { error: 'The spirits are restless: ' + err.message });
    else res.end();
  }
});

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  server.listen(PORT, () => console.log(`🕯️  Séance is open at http://localhost:${PORT}`));
}
