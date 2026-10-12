import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { access, mkdtemp, readFile, readdir, rm, symlink } from 'node:fs/promises';
import http from 'node:http';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { buildPublic } from './build-public.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const temporary = await mkdtemp(path.join(os.tmpdir(), 'echoloom-public-test-'));
const suffix = `${process.pid}-${Date.now()}`;
const fileLink = `assets/public-boundary-${suffix}.svg`;
const directoryLink = `assets/public-boundary-${suffix}`;
let child;
let stderr = '';

async function filesWithin(directory, prefix = '') {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    assert.equal(entry.isSymbolicLink(), false, `Public output contains a symlink: ${entry.name}`);
    const relative = path.posix.join(prefix, entry.name);
    if (entry.isDirectory()) files.push(...await filesWithin(path.join(directory, entry.name), relative));
    else files.push(relative);
  }
  return files;
}

function rawRequest(port, pathname, method = 'GET') {
  return new Promise((resolve, reject) => {
    const request = http.request({ hostname: '127.0.0.1', port, path: pathname, method }, (response) => {
      let size = 0;
      response.on('data', (chunk) => { size += chunk.length; });
      response.on('end', () => resolve({ status: response.statusCode, headers: response.headers, size }));
    });
    request.on('error', reject);
    request.end();
  });
}

async function unusedPort() {
  const socket = net.createServer();
  await new Promise((resolve, reject) => { socket.once('error', reject); socket.listen(0, '127.0.0.1', resolve); });
  const port = socket.address().port;
  await new Promise((resolve) => socket.close(resolve));
  return port;
}

async function waitForServer(port) {
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    try { if ((await rawRequest(port, '/api/health')).status === 200) return; } catch {}
    if (child.exitCode !== null) break;
    await new Promise((resolve) => setTimeout(resolve, 60));
  }
  throw new Error(`Public security test server did not start. ${stderr}`);
}

try {
  await symlink(path.join(root, 'package.json'), path.join(root, fileLink));
  await symlink(path.join(root, 'app'), path.join(root, directoryLink));
  const output = path.join(temporary, 'dist');
  await buildPublic(output);
  const outputFiles = await filesWithin(output);
  for (const relative of outputFiles) {
    assert.match(relative, /^(?:index\.html|sw\.js|manifest\.webmanifest|(?:app|assets)\/[^.].*)$/, `Unexpected public artifact: ${relative}`);
    assert.equal(relative.split('/').some((segment) => segment.startsWith('.')), false);
    assert.equal(/(?:^|\/)(?:\.env|\.git|server|supabase|docs|tools|node_modules|\.cache)(?:\/|$)/.test(relative), false);
  }
  for (const excluded of ['.env', '.git/config', 'server/config.mjs', 'supabase/seed.sql', 'docs/PRODUCT_BRIEF.md', 'tools/server.mjs', 'package.json', 'AGENTS.md', 'api/chat', fileLink, `${directoryLink}/app.js`]) {
    await assert.rejects(access(path.join(output, excluded)), `Private or symlinked file entered the public build: ${excluded}`);
  }
  const html = await readFile(path.join(output, 'index.html'), 'utf8');
  assert.match(html.slice(html.search(/<script\b/i)), /^<script src="app\/public-config\.js"><\/script>/);
  assert.match(await readFile(path.join(output, 'sw.js'), 'utf8'), /['"]\.\/app\/public-config\.js['"]/);
  for (const match of html.matchAll(/<(?:script|link)\b[^>]*\b(?:src|href)=["']([^"']+)["']/gi)) {
    const reference = match[1];
    if (/^(?:https?:|data:|#)/i.test(reference)) continue;
    await access(path.join(output, reference.split('?')[0]));
  }
  await assert.rejects(buildPublic(path.join(root, 'app')), /must not overwrite repository source files/);

  let fetchCalls = 0;
  const publicContext = vm.createContext({
    console, Date, URL, AbortController, Response,
    document: { baseURI: 'https://echoloom.example/' },
    fetch: async () => { fetchCalls += 1; throw new Error('Public mode must not contact a provider.'); },
    window: {
      setTimeout, clearTimeout,
      EchoEngine: Object.fromEntries(['storyReply', 'chatReply', 'sceneReply'].map((method) => [method, () => ({ response: `offline ${method}` })]))
    }
  });
  vm.runInContext(await readFile(path.join(output, 'app/public-config.js'), 'utf8'), publicContext);
  vm.runInContext(await readFile(path.join(output, 'app/api-engine.js'), 'utf8'), publicContext);
  const api = publicContext.window.EchoApiEngine;
  assert.equal((await api.initialize()).configured, false);
  for (const method of ['storyReply', 'chatReply', 'sceneReply']) {
    const envelope = await api.reply(method, 'private message', { activeCharacterId: 'qian', language: 'en' }, { aiMode: 'live', minimumDelay: 0 });
    assert.equal(envelope.source, 'offline');
    assert.equal(envelope.fallback, false);
    assert.equal(envelope.result.response, `offline ${method}`);
  }
  assert.equal((await api.localize([{ id: 'one', text: 'private memory' }], 'en', { aiMode: 'live' })).skipped, true);
  assert.equal((await api.generateSceneBackground({ changed: true, location: 'archive' }, { aiMode: 'live' })).skipped, true);
  assert.equal(fetchCalls, 0, 'Public mode sent private input or discovery traffic to an API.');

  const storageContext = vm.createContext({
    console, Date,
    window: {},
    localStorage: {
      getItem: () => { throw Object.assign(new Error('Storage blocked'), { name: 'SecurityError' }); },
      setItem: () => { throw Object.assign(new Error('Storage full'), { name: 'QuotaExceededError' }); },
      removeItem: () => { throw Object.assign(new Error('Storage blocked'), { name: 'SecurityError' }); }
    }
  });
  for (const relative of ['app/data.js', 'app/storage.js']) vm.runInContext(await readFile(path.join(output, relative), 'utf8'), storageContext);
  const storage = storageContext.window.EchoStorage;
  const state = storage.load();
  state.playerName = 'Session observer';
  state.journeys.qian = storageContext.window.ECHOLOOM_DATA.createJourney('qian');
  state.journeys.qian.memories.push({ id: 'session-memory', text: 'A memory retained without disk storage.', type: 'fact' });
  assert.equal(storage.save(state), false);
  assert.equal(storage.status().persistent, false);
  assert.equal(storage.load().playerName, 'Session observer');
  const exported = storage.exportState(state);
  assert.equal(JSON.parse(exported).state.journeys.qian.memories.at(-1).id, 'session-memory');
  assert.equal(storage.importState(exported).playerName, 'Session observer');
  assert.equal(storage.reset().playerName, '');
  assert.equal(storage.load().playerName, '');
  assert.equal(storage.status().persistent, false);

  const port = await unusedPort();
  child = spawn(process.execPath, ['tools/server.mjs', `--port=${port}`, '--no-open'], {
    cwd: root,
    env: { ...process.env, GEMINI_API_KEY: '', SUPABASE_URL: '', SUPABASE_SERVICE_ROLE_KEY: '', ECHOLOOM_DEMO_USER_ID: '', CLOUDFLARE_ACCOUNT_ID: '', CLOUDFLARE_API_TOKEN: '' },
    stdio: ['ignore', 'ignore', 'pipe']
  });
  child.stderr.on('data', (chunk) => { stderr += chunk; });
  await waitForServer(port);
  const privatePaths = ['/.env', '/.env.example', '/.git/config', '/AGENTS.md', '/README.md', '/package.json', '/tools/server.mjs', '/server/config.mjs', '/supabase/seed.sql', '/docs/PRODUCT_BRIEF.md', '/.cache/echoloom-scenes/test.jpg', '/%2eenv', '/app/%2e%2e/server/config.mjs', '/app%2f..%2fserver%2fconfig.mjs', '/..%2fEchoLoom_Interactive_Demo-other%2findex.html', '/app%5c..%5c.env', '/app/%00data.js', '/%ZZ', `/${fileLink}`, `/${directoryLink}/app.js`];
  for (const pathname of privatePaths) assert.equal((await rawRequest(port, pathname)).status, 404, `Private path was exposed: ${pathname}`);
  for (const pathname of ['/', '/index.html', '/app/data.js?v=public-test', '/app/styles.css', '/assets/brand/echoloom-app-icon.png', '/manifest.webmanifest', '/sw.js']) {
    assert.equal((await rawRequest(port, pathname)).status, 200, `Public file is unavailable: ${pathname}`);
  }
  const head = await rawRequest(port, '/index.html', 'HEAD');
  assert.equal(head.status, 200);
  assert.equal(head.size, 0);
  assert.ok(Number(head.headers['content-length']) > 0);
  for (const method of ['POST', 'PUT', 'DELETE']) {
    const rejected = await rawRequest(port, '/index.html', method);
    assert.equal(rejected.status, 405);
    assert.equal(rejected.headers.allow, 'GET, HEAD');
  }
  console.log('EchoLoom public website test: PASS');
  console.log(`Checked ${outputFiles.length} allowlisted artifacts, private-path and symlink denial, GET/HEAD behavior, zero-network public mode, and storage-failure export/reset recovery.`);
} finally {
  if (child && child.exitCode === null) {
    child.kill('SIGTERM');
    await new Promise((resolve) => child.once('exit', resolve));
  }
  await rm(path.join(root, fileLink), { force: true });
  await rm(path.join(root, directoryLink), { force: true });
  await rm(temporary, { recursive: true, force: true });
}
