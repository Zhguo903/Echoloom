import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = new Set(process.argv.slice(2));
const portArg = process.argv.find((arg) => arg.startsWith('--port='));
const port = Number(portArg?.split('=')[1] || process.env.PORT || 5173);
const shouldOpen = args.has('--open') && !args.has('--no-open');

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

function safePath(urlPath) {
  const clean = decodeURIComponent(urlPath.split('?')[0]).replace(/^\/+/, '');
  const normalized = path.normalize(clean || 'index.html');
  const absolute = path.resolve(root, normalized);
  return absolute.startsWith(root) ? absolute : null;
}

const server = http.createServer(async (request, response) => {
  try {
    if (request.url === '/api/health') {
      response.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
      response.end(JSON.stringify({ ok: true, product: 'EchoLoom Interactive Demo' }));
      return;
    }
    let filePath = safePath(request.url || '/');
    if (!filePath) throw new Error('Invalid path');
    try {
      const info = await stat(filePath);
      if (info.isDirectory()) filePath = path.join(filePath, 'index.html');
    } catch {
      response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      response.end('Not found');
      return;
    }
    const body = await readFile(filePath);
    response.writeHead(200, {
      'content-type': mime.get(path.extname(filePath).toLowerCase()) || 'application/octet-stream',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff'
    });
    response.end(body);
  } catch (error) {
    response.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
    response.end(`EchoLoom server error: ${error.message}`);
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
