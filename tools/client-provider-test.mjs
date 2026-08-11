import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const liveEvent = {
  dialogue: '先坐一会儿。你愿意说的时候我再听。',
  dialogueLocalized: { zh: '先坐一会儿。你愿意说的时候我再听。', en: 'Sit for a while. I will listen when you are ready.' },
  emotion: 'gentle', expression: 'concerned',
  relationship: { intimacy_delta: 1, trust_delta: 1.5, romance_delta: 0, tension_delta: -0.5 },
  story: { chapter: 'current', event: 'quiet-company', unlock_event: null, requested_flags: [], flags: {} },
  scene: { changed: false, location: 'archive', time: 'evening', weather: 'rain', mood: 'quiet' },
  memory: { save: true, importance: 8, content: '用户疲惫时更喜欢安静陪伴。', contentLocalized: { zh: '用户疲惫时更喜欢安静陪伴。', en: 'User prefers quiet company when tired.' }, memory_type: 'preference', emotion: 'tired' },
  choices: [{ text: '慢慢说明情况', textLocalized: { zh: '慢慢说明情况', en: 'Explain slowly' }, intent: 'open_up' }]
};

let fetchMode = 'success';
let sentBody = null;
let sentBodies = [];
let sceneCalls = 0;
const offline = {
  storyReply: () => ({ response: 'offline story', relationshipDelta: { trust: 0 }, behaviourTags: [], playerSignalDelta: {} }),
  chatReply: () => ({ response: 'offline chat', relationshipDelta: { trust: 0 }, behaviourTags: [], playerSignalDelta: {} }),
  sceneReply: () => ({ response: 'offline scene', relationshipDelta: { trust: 0 }, behaviourTags: [], playerSignalDelta: {} })
};
const context = vm.createContext({
  console,
  Date,
  URL,
  AbortController,
  Response,
  document: { baseURI: 'http://127.0.0.1:5173/' },
  fetch: async (_url, options) => {
    if (String(_url).endsWith('/api/provider-status')) {
      return new Response(JSON.stringify({ gemini: { configured: true, model: 'gemini-test' } }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    if (String(_url).endsWith('/api/scene')) {
      sceneCalls += 1;
      const sceneBody = JSON.parse(options.body);
      assert.equal(sceneBody.characterId, 'qian');
      assert.equal(sceneBody.scene.changed, true);
      return new Response(JSON.stringify({ fingerprint: 'a'.repeat(64), image: `/api/scenes/${'a'.repeat(64)}.jpg`, cached: true }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    if (String(_url).endsWith('/api/localize')) {
      const localizationBody = JSON.parse(options.body);
      return new Response(JSON.stringify({ translations: localizationBody.items.map((item) => ({ id: item.id, text: 'Translated legacy reply.' })), meta: { model: 'gemini-test' } }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    sentBody = JSON.parse(options.body);
    sentBodies.push(sentBody);
    if (fetchMode === 'failure') return new Response(JSON.stringify({ error: { code: 'provider_unavailable', message: 'not configured' }, fallback: 'offline' }), { status: 503, headers: { 'content-type': 'application/json' } });
    if (fetchMode === 'oversized-once' && sentBodies.length === 1) return new Response(JSON.stringify({ error: { code: 'request_too_large', message: 'too large' } }), { status: 413, headers: { 'content-type': 'application/json' } });
    return new Response(JSON.stringify({ event: liveEvent, meta: { model: 'gemini-test' } }), { status: 200, headers: { 'content-type': 'application/json' } });
  },
  window: {
    EchoEngine: offline,
    setTimeout,
    clearTimeout
  }
});
vm.runInContext(await readFile(path.join(root, 'app/api-engine.js'), 'utf8'), context, { filename: 'app/api-engine.js' });
const api = context.window.EchoApiEngine;
const discovered = await api.initialize();
assert.equal(discovered.configured, true);
const engineState = {
  language: 'zh', activeCharacterId: 'qian', relationship: { trust: 2 }, campaign: { activeBranchId: 'root', mainline: { chapterIndex: 1, phase: 'briefing' } },
  liveStory: { currentChapter: 'character_story_1', currentScene: 'private_archive', flags: { first_contact_complete: true } },
  memories: [{ id: 'localized', text: { zh: '用户喜欢雨夜。', en: 'User likes rain.' }, source: { zh: '聊天', en: 'Chat' }, type: 'preference' }],
  chatMessages: [{ role: 'character', text: { zh: '你可以慢慢说。', en: 'Take your time.' } }]
};

const offlineEnvelope = await api.reply('chatReply', 'hello', engineState, { aiMode: 'offline', minimumDelay: 0 });
assert.equal(offlineEnvelope.source, 'offline');
assert.equal(offlineEnvelope.result.response, 'offline chat');

const liveEnvelope = await api.reply('chatReply', '今天很累', engineState, { aiMode: 'live', minimumDelay: 0, userId: 'spoofed' });
assert.equal(liveEnvelope.source, 'gemini');
assert.equal(liveEnvelope.result.response.zh, liveEvent.dialogueLocalized.zh);
assert.equal(liveEnvelope.result.response.en, liveEvent.dialogueLocalized.en);
assert.equal(liveEnvelope.result.relationshipDelta.trust, 1.5);
assert.equal(liveEnvelope.result.relationshipDelta.romanticAttraction, 0);
assert.equal(sentBody.memories[0].content, '用户喜欢雨夜。');
assert.equal(sentBody.recentMessages[0].text, '你可以慢慢说。');
assert.equal(sentBody.currentStoryState.currentChapter, 'character_story_1');
assert.equal(sentBody.currentStoryState.currentScene, 'private_archive');
assert.equal(sentBody.storyFlags.first_contact_complete, true);

const localizedLegacy = await api.localize([{ id: 'legacy-1', text: '旧回复' }], 'en', { aiMode: 'live' });
assert.equal(localizedLegacy.translations[0].text, 'Translated legacy reply.');

const autoEnvelope = await api.reply('chatReply', '你今天在做什么？', engineState, { aiMode: 'auto', minimumDelay: 0 });
assert.equal(autoEnvelope.source, 'gemini');
assert.equal(sentBody.message, '你今天在做什么？');

const longEngineState = {
  ...engineState,
  memories: Array.from({ length: 100 }, (_, index) => ({
    id: `memory-${index}`,
    text: { zh: `${index === 73 ? '用户一直想去看极光。' : '普通关系记忆'}${'记'.repeat(360)}`, en: `Relationship memory ${index}` },
    source: { zh: '长期聊天记录', en: 'Long conversation' },
    type: 'relationship', importance: index === 73 ? 9 : 6, pinned: index === 4
  })),
  chatMessages: Array.from({ length: 180 }, (_, index) => ({
    role: index % 2 ? 'character' : 'user',
    text: { zh: `第${index}轮${'对话'.repeat(240)}`, en: `Conversation turn ${index}` }
  }))
};
sentBodies = [];
const longEnvelope = await api.reply('chatReply', '你还记得我想去看极光吗？', longEngineState, { aiMode: 'live', minimumDelay: 0 });
assert.equal(longEnvelope.source, 'gemini');
assert.ok(Buffer.byteLength(JSON.stringify(sentBody)) <= 28_000);
assert.ok(sentBody.memories.length <= 16);
assert.ok(sentBody.recentMessages.length <= 20);
assert.ok(sentBody.memories.some((memory) => memory.content.includes('极光')));

fetchMode = 'oversized-once';
sentBodies = [];
const recoveredEnvelope = await api.reply('chatReply', '继续刚才的话题', engineState, { aiMode: 'live', minimumDelay: 0 });
assert.equal(recoveredEnvelope.source, 'gemini');
assert.equal(sentBodies.length, 2);
assert.ok(sentBodies[1].memories.length <= 6);
assert.ok(sentBodies[1].recentMessages.length <= 10);
assert.equal(api.status().state, 'ready');

const skippedScene = await api.generateSceneBackground({ changed: false, location: 'archive' }, { aiMode: 'live', characterId: 'qian' });
assert.equal(skippedScene.skipped, true);
assert.equal(sceneCalls, 0);
const liveScene = await api.generateSceneBackground({ changed: true, location: 'archive', time: 'evening', weather: 'rain', mood: 'quiet' }, { aiMode: 'live', characterId: 'qian', language: 'zh' });
assert.equal(liveScene.cached, true);
assert.equal(liveScene.image, `/api/scenes/${'a'.repeat(64)}.jpg`);
assert.equal(sceneCalls, 1);

fetchMode = 'failure';
sentBodies = [];
const fallbackEnvelope = await api.reply('chatReply', 'still here', engineState, { aiMode: 'live', minimumDelay: 0 });
assert.equal(fallbackEnvelope.fallback, true);
assert.equal(fallbackEnvelope.result.response, 'offline chat');
assert.equal(api.status().state, 'fallback');

console.log('EchoLoom browser provider adapter test: PASS');
console.log('Checked forced offline mode, provider discovery, automatic Gemini mode, bilingual live-event mapping, legacy localization, bounded long-conversation context, relevant-memory selection, 413 compact retry, scene-change gating, cached background mapping, and typed provider fallback.');
