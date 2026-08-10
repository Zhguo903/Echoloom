import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { loadConfig } from '../server/config.mjs';
import { buildScenePrompt, generateSceneBackground, readSceneBackground, sceneFingerprint, validateSceneRequest } from '../server/scene-service.mjs';

const cacheDir = await mkdtemp(path.join(os.tmpdir(), 'echoloom-scene-test-'));
const jpeg = Buffer.from([0xff, 0xd8, 0x45, 0x63, 0x68, 0x6f, 0x4c, 0x6f, 0x6f, 0x6d, 0xff, 0xd9]);
const scene = { changed: true, location: 'rainy archive balcony', time: 'blue hour', weather: 'soft rain', mood: 'quietly hopeful' };

try {
  assert.throws(() => validateSceneRequest({ scene: { ...scene, changed: false } }), /validated scene change/);
  const prompt = buildScenePrompt(scene);
  assert.match(prompt, /No characters/);
  assert.equal(sceneFingerprint(prompt).length, 64);

  const config = loadConfig({
    CLOUDFLARE_ACCOUNT_ID: 'account-test', CLOUDFLARE_API_TOKEN: 'token-test',
    CLOUDFLARE_FLUX_MODEL: '@cf/black-forest-labs/flux-1-schnell', ECHOLOOM_SCENE_CACHE_DIR: cacheDir
  }, '/');
  let calls = 0;
  const fetchImpl = async (url, options) => {
    calls += 1;
    assert.equal(url, 'https://api.cloudflare.com/client/v4/accounts/account-test/ai/run/@cf/black-forest-labs/flux-1-schnell');
    assert.equal(options.headers.authorization, 'Bearer token-test');
    const body = JSON.parse(options.body);
    assert.equal(body.num_steps, 4);
    assert.match(body.prompt, /rainy archive balcony/);
    return new Response(JSON.stringify({ success: true, result: { image: jpeg.toString('base64') } }), { status: 200, headers: { 'content-type': 'application/json' } });
  };

  const generated = await generateSceneBackground({ scene, characterId: 'qian', language: 'zh' }, config, { fetchImpl });
  assert.equal(generated.cached, false);
  assert.match(generated.image, /^\/api\/scenes\/[a-f0-9]{64}\.jpg$/);
  assert.deepEqual(await readSceneBackground(generated.fingerprint, cacheDir), jpeg);

  const cached = await generateSceneBackground({ scene }, config, { fetchImpl });
  assert.equal(cached.cached, true);
  assert.equal(cached.fingerprint, generated.fingerprint);
  assert.equal(calls, 1);
} finally {
  await rm(cacheDir, { recursive: true, force: true });
}

console.log('EchoLoom scene background test: PASS');
console.log('Checked validated scene-change gating, deterministic prompts, Cloudflare FLUX request shape, immutable fingerprints, and disk cache reuse.');
