import http from 'node:http';
import { readFile, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { createChatEvent } from '../server/chat-service.mjs';
import { loadConfig, loadLocalEnvironment, providerStatus } from '../server/config.mjs';
import { ProviderError } from '../server/gemini.mjs';
import { readJsonBody, sendJson } from '../server/http.mjs';
import { localizeGeneratedText } from '../server/localization-service.mjs';
import { RequestValidationError } from '../server/request-validation.mjs';
import { generateSceneBackground, readSceneBackground, SceneValidationError } from '../server/scene-service.mjs';

const root = await realpath(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'));
const args = new Set(process.argv.slice(2));
const portArg = process.argv.find((arg) => arg.startsWith('--port='));
const port = Number(portArg?.split('=')[1] || process.env.PORT || 5173);
const shouldOpen = args.has('--open') && !args.has('--no-open');
const config = loadConfig(loadLocalEnvironment(root), root);

const mime = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.webmanifest', 'application/manifest+json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.webp', 'image/webp']
]);

const publicFiles = new Set(['index.html', 'sw.js', 'manifest.webmanifest']);
const publicExtensions = new Set(['.html', '.css', '.js', '.json', '.svg', '.png', '.jpg', '.jpeg', '.webp', '.gif', '.ico', '.woff', '.woff2', '.mp3', '.ogg', '.wav']);

async function safePath(urlPath) {
  let decoded;
  try { decoded = decodeURIComponent(urlPath.split('?')[0]); }
  catch { return null; }
  if (decoded.includes('\\') || decoded.includes('\0')) return null;
  const relative = decoded.replace(/^\/+/, '') || 'index.html';
  const segments = relative.split('/');
  if (segments.some((segment) => !segment || segment.startsWith('.'))) return null;
  const publicRoot = segments[0] === 'app' || segments[0] === 'assets';
  if (!publicFiles.has(relative) && !(publicRoot && publicExtensions.has(path.extname(relative).toLowerCase()))) return null;
  const absolute = path.resolve(root, relative);
  if (!absolute.startsWith(`${root}${path.sep}`)) return null;
  try {
    // A public-looking symlink must never expose a private repository file.
    return await realpath(absolute) === absolute ? absolute : null;
  } catch { return null; }
}

const server = http.createServer(async (request, response) => {
  try {
    const requestUrl = new URL(request.url || '/', 'http://127.0.0.1');
    if (request.url === '/api/health') {
      sendJson(response, 200, { ok: true, product: 'EchoLoom Interactive Demo' });
      return;
    }
    if (requestUrl.pathname === '/api/provider-status') {
      if (request.method !== 'GET') return sendJson(response, 405, { error: { code: 'method_not_allowed', message: 'Use GET.' } });
      return sendJson(response, 200, providerStatus(config));
    }
    if (requestUrl.pathname === '/api/chat') {
      if (request.method !== 'POST') return sendJson(response, 405, { error: { code: 'method_not_allowed', message: 'Use POST.' } });
      const payload = await readJsonBody(request);
      return sendJson(response, 200, await createChatEvent(payload, config));
    }
    if (requestUrl.pathname === '/api/localize') {
      if (request.method !== 'POST') return sendJson(response, 405, { error: { code: 'method_not_allowed', message: 'Use POST.' } });
      const payload = await readJsonBody(request);
      return sendJson(response, 200, await localizeGeneratedText(payload, config));
    }
    if (requestUrl.pathname === '/api/scene') {
      if (request.method !== 'POST') return sendJson(response, 405, { error: { code: 'method_not_allowed', message: 'Use POST.' } });
      const payload = await readJsonBody(request);
      return sendJson(response, 200, await generateSceneBackground(payload, config));
    }
    const sceneMatch = requestUrl.pathname.match(/^\/api\/scenes\/([a-f0-9]{64})\.jpg$/);
    if (sceneMatch) {
      if (request.method !== 'GET') return sendJson(response, 405, { error: { code: 'method_not_allowed', message: 'Use GET.' } });
      const image = await readSceneBackground(sceneMatch[1], config.sceneCacheDir);
      if (!image) return sendJson(response, 404, { error: { code: 'scene_not_found', message: 'Scene background not found.' } });
      response.writeHead(200, {
        'content-type': 'image/jpeg',
        'cache-control': 'public, max-age=31536000, immutable',
        'content-length': image.length,
        'x-content-type-options': 'nosniff'
      });
      response.end(image);
      return;
    }
    const filePath = await safePath(request.url || '/');
    if (!filePath) {
      response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      response.end('Not found');
      return;
    }
    if (!['GET', 'HEAD'].includes(request.method)) {
      response.writeHead(405, { 'content-type': 'text/plain; charset=utf-8', allow: 'GET, HEAD' });
      response.end('Use GET or HEAD.');
      return;
    }
    try {
      const info = await stat(filePath);
      if (!info.isFile()) throw new Error('Not a public file');
    } catch {
      response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      response.end('Not found');
      return;
    }
    const body = await readFile(filePath);
    response.writeHead(200, {
      'content-type': mime.get(path.extname(filePath).toLowerCase()) || 'application/octet-stream',
      'content-length': body.length,
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff'
    });
    response.end(request.method === 'HEAD' ? undefined : body);
  } catch (error) {
    const known = error instanceof ProviderError || error instanceof RequestValidationError || error instanceof SceneValidationError || Number.isInteger(error?.status);
    const status = known ? (error.status || 400) : 500;
    const code = known ? (error.code || 'invalid_request') : 'internal_error';
    sendJson(response, status, {
      error: { code, message: known ? error.message : 'EchoLoom server could not complete the request.' },
      fallback: code.startsWith('provider_') ? 'offline' : undefined
    });
  }
});

server.listen(port, '127.0.0.1', () => {
  const url = `http://127.0.0.1:${port}`;
  console.log('\nEchoLoom is running locally.');
  console.log(`Open: ${url}`);
  console.log('Press Ctrl+C to stop.\n');
  if (shouldOpen) openBrowser(url);
});

function openBrowser(url) {
  const platform = process.platform;
  const command = platform === 'darwin' ? 'open' : platform === 'win32' ? 'cmd' : 'xdg-open';
  const commandArgs = platform === 'win32' ? ['/c', 'start', '', url] : [url];
  const child = spawn(command, commandArgs, { detached: true, stdio: 'ignore' });
  child.on('error', () => {});
  child.unref();
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
