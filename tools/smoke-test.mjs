import { spawn } from 'node:child_process';
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = 4197;
const required = [
  'index.html',
  'app/styles.css',
  'app/data.js',
  'app/storage.js',
  'app/story-engine.js',
  'app/reply-timing.js',
  'app/api-engine.js',
  'app/app.js',
  'server/chat-service.mjs',
  'server/config.mjs',
  'server/game-event.mjs',
  'server/gemini.mjs',
  'server/localization-service.mjs',
  'server/scene-service.mjs',
  'server/supabase.mjs',
  'supabase/migrations/202608100001_api_foundation.sql',
  'supabase/seed.sql',
  'assets/brand/echoloom-lockup.png',
  'assets/brand/echoloom-mark.png',
  'assets/brand/echoloom-app-icon.png',
  'assets/character/qian-memory-restorer.png',
  'assets/character/qian-memory-restorer-card.png',
  'assets/character/qian-memory-restorer-avatar.png',
  'assets/character/shenyao-observer.png',
  'assets/character/shenyao-observer-card.png',
  'assets/character/shenyao-observer-avatar.png',
  'assets/character/lichuan-traveller.png',
  'assets/character/lichuan-traveller-card.png',
  'assets/character/lichuan-traveller-avatar.png',
  'assets/character/zhoutang-architect.png',
  'assets/character/zhoutang-architect-card.png',
  'assets/character/zhoutang-architect-avatar.png',
  'assets/character/wensheng-weaver.png',
  'assets/character/wensheng-weaver-card.png',
  'assets/character/wensheng-weaver-avatar.png',
  'assets/backgrounds/archive.svg',
  'assets/backgrounds/station.svg',
  'assets/backgrounds/echolink-lab.svg',
  'assets/backgrounds/unfinished-world.svg',
  'assets/backgrounds/observatory.svg',
  'AGENTS.md'
];

for (const relative of required) await access(path.join(root, relative));

const appSource = await readFile(path.join(root, 'app/app.js'), 'utf8');
for (const expected of ['renderBrandSplash', 'renderTitle', 'renderPrologue', 'renderPlayerName', 'renderSignalScan', 'renderSignalDetail', 'renderSignalConfirm', 'renderFirstRescue', 'renderEventResult', 'renderEchoActivation', 'renderFirstContact', 'renderObservatoryHome', 'renderStoryHub', 'renderWorldHub', 'renderArchiveBranches', 'completeFirstRescue', 'sendFirstContact', 'chronologicalStoryView', 'characterAvatar', 'renderTogether', 'renderEchoes', 'renderStation', 'renderEchoLink', 'renderEchoTyping', 'scheduleEchoReply', 'echoPendingReplies', 'sendEchoMessage', 'selectEchoIntent', 'aria-pressed', 'renderRelationship', 'renderSharedEvent', 'createArchive', 'activeJourney', 'EchoStorage', 'EchoEngine', 'EchoApiEngine']) {
  if (!appSource.includes(expected)) throw new Error(`app.js is missing ${expected}`);
}

const engineSource = await readFile(path.join(root, 'app/story-engine.js'), 'utf8');
for (const expected of ['qian', 'shenyao', 'lichuan', 'zhoutang', 'wensheng', '喜欢我', 'sexual_signal', 'playerSignalDelta', 'relationshipDelta']) {
  if (!engineSource.includes(expected)) throw new Error(`story-engine.js is missing ${expected}`);
}

const child = spawn(process.execPath, ['tools/server.mjs', `--port=${port}`, '--no-open'], {
  cwd: root,
  env: {
    ...process.env,
    GEMINI_API_KEY: '',
    SUPABASE_URL: '',
    SUPABASE_SERVICE_ROLE_KEY: '',
    ECHOLOOM_DEMO_USER_ID: '',
    CLOUDFLARE_ACCOUNT_ID: '',
    CLOUDFLARE_API_TOKEN: ''
  },
  stdio: ['ignore', 'pipe', 'pipe']
});

let stderr = '';
child.stderr.on('data', (chunk) => { stderr += chunk; });

try {
  await waitForServer(`http://127.0.0.1:${port}/api/health`);
  const providerResponse = await fetch(`http://127.0.0.1:${port}/api/provider-status`);
  const providerStatus = await providerResponse.json();
  if (!providerResponse.ok || providerStatus.offlineFallback !== true || providerStatus.gemini.configured !== false) throw new Error('Provider status did not report the offline fallback.');
  const chatResponse = await fetch(`http://127.0.0.1:${port}/api/chat`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ characterId: 'qian', message: 'Test offline fallback.' })
  });
  const chatPayload = await chatResponse.json();
  if (chatResponse.status !== 503 || chatPayload.fallback !== 'offline') throw new Error('Unconfigured chat API did not return a typed offline fallback.');
  const localizationResponse = await fetch(`http://127.0.0.1:${port}/api/localize`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ targetLanguage: 'en', items: [{ id: 'legacy-1', text: '你好。' }] })
  });
  const localizationPayload = await localizationResponse.json();
  if (localizationResponse.status !== 503 || localizationPayload.fallback !== 'offline') throw new Error('Unconfigured localization API did not return a typed offline fallback.');
  const boundedLongBody = JSON.stringify({
    characterId: 'qian',
    message: 'Long context parse test.',
    memories: Array.from({ length: 20 }, (_, index) => ({ id: `m-${index}`, content: '记'.repeat(500), importance: 7 })),
    recentMessages: Array.from({ length: 10 }, (_, index) => ({ role: index % 2 ? 'character' : 'user', text: '话'.repeat(600) }))
  });
  if (Buffer.byteLength(boundedLongBody) <= 32_768 || Buffer.byteLength(boundedLongBody) >= 98_304) throw new Error('Long-context smoke fixture is outside the intended request range.');
  const boundedLongResponse = await fetch(`http://127.0.0.1:${port}/api/chat`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: boundedLongBody
  });
  const boundedLongPayload = await boundedLongResponse.json();
  if (boundedLongResponse.status === 413 || boundedLongPayload.error?.code !== 'provider_unavailable') throw new Error('Bounded long context was rejected before provider fallback.');
  const sceneResponse = await fetch(`http://127.0.0.1:${port}/api/scene`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ scene: { changed: true, location: 'archive', time: 'evening', weather: 'rain', mood: 'quiet' } })
  });
  const scenePayload = await sceneResponse.json();
  if (sceneResponse.status !== 503 || scenePayload.fallback !== 'offline') throw new Error('Unconfigured scene API did not return a typed packaged-background fallback.');
  const checks = [
    ['/', 'EchoLoom Interactive Demo'],
    ['/app/styles.css', '--slate'],
    ['/app/app.js', 'renderGeneratedStory'],
    ['/app/reply-timing.js', 'baseDelayByContact'],
    ['/assets/backgrounds/seaside.svg', '<svg']
    ,['/assets/backgrounds/station.svg', '<svg']
    ,['/assets/backgrounds/unfinished-world.svg', '<svg']
  ];
  for (const [url, needle] of checks) {
    const response = await fetch(`http://127.0.0.1:${port}${url}`);
    if (!response.ok) throw new Error(`${url} returned ${response.status}`);
    const text = await response.text();
    if (!text.includes(needle)) throw new Error(`${url} did not include ${needle}`);
  }
  const pngChecks = [
    ['/assets/character/qian-memory-restorer.png', 100_000],
    ['/assets/character/qian-memory-restorer-card.png', 100_000],
    ['/assets/character/qian-memory-restorer-avatar.png', 100_000],
    ['/assets/character/shenyao-observer.png', 100_000],
    ['/assets/character/shenyao-observer-card.png', 100_000],
    ['/assets/character/shenyao-observer-avatar.png', 100_000],
    ['/assets/character/lichuan-traveller.png', 100_000],
    ['/assets/character/lichuan-traveller-card.png', 100_000],
    ['/assets/character/lichuan-traveller-avatar.png', 100_000],
    ['/assets/character/zhoutang-architect.png', 100_000],
    ['/assets/character/zhoutang-architect-card.png', 100_000],
    ['/assets/character/zhoutang-architect-avatar.png', 100_000],
    ['/assets/character/wensheng-weaver.png', 100_000],
    ['/assets/character/wensheng-weaver-card.png', 100_000],
    ['/assets/character/wensheng-weaver-avatar.png', 100_000],
    ['/assets/brand/echoloom-lockup.png', 50_000],
    ['/assets/brand/echoloom-mark.png', 40_000],
    ['/assets/brand/echoloom-app-icon.png', 20_000]
  ];
  for (const [url, minimumBytes] of pngChecks) {
    const response = await fetch(`http://127.0.0.1:${port}${url}`);
    if (!response.ok) throw new Error(`${url} returned ${response.status}`);
    if (response.headers.get('content-type') !== 'image/png') throw new Error(`${url} did not return image/png`);
    if ((await response.arrayBuffer()).byteLength < minimumBytes) throw new Error(`${url} is unexpectedly small`);
  }
  console.log('EchoLoom smoke test: PASS');
  console.log(`Checked ${required.length} required files and ${checks.length + pngChecks.length + 3} served resources.`);
} finally {
  child.kill('SIGTERM');
}

async function waitForServer(url) {
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Server did not start. ${stderr}`);
}
