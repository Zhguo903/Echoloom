import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createChatEvent } from '../server/chat-service.mjs';
import { loadConfig } from '../server/config.mjs';
import { validateGameEvent } from '../server/game-event.mjs';
import { outputText, requestGeminiEvent } from '../server/gemini.mjs';
import { localizeGeneratedText } from '../server/localization-service.mjs';
import { retrieveMemories } from '../server/memory-retrieval.mjs';
import { validateChatRequest } from '../server/request-validation.mjs';
import { applyStoryRules } from '../server/story-rules.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rawEvent = {
  dialogue: '我会先听。你不必现在把所有原因解释清楚。',
  dialogueLocalized: { zh: '我会先听。你不必现在把所有原因解释清楚。', en: 'I will listen first. You do not have to explain every reason now.' },
  emotion: 'gentle',
  expression: 'concerned',
  relationship: { intimacy_delta: 9, trust_delta: 99, romance_delta: -9, tension_delta: -99 },
  story: { chapter: 'chapter_2', event: 'quiet-listening', unlock_event: null, requested_flags: ['shared_memory_acknowledged', 'forbidden_finale'] },
  scene: { changed: false, location: 'archive', time: 'evening', weather: 'rain', mood: 'quiet' },
  memory: { save: true, importance: 8, content: '用户希望先被倾听，再听建议。', contentLocalized: { zh: '用户希望先被倾听，再听建议。', en: 'User prefers being heard before receiving advice.' }, memory_type: 'preference', emotion: 'tired' },
  choices: [
    { text: '慢慢说明发生了什么', textLocalized: { zh: '慢慢说明发生了什么', en: 'Explain what happened slowly' }, intent: 'open_up' },
    { text: '先安静待一会儿', textLocalized: { zh: '先安静待一会儿', en: 'Sit quietly for a while' }, intent: 'quiet_company' },
    { text: '说明自己需要空间', textLocalized: { zh: '说明自己需要空间', en: 'Say that I need space' }, intent: 'need_space' },
    { text: '不应出现', textLocalized: { zh: '不应出现', en: 'Should not appear' }, intent: 'extra' }
  ]
};

const event = validateGameEvent(rawEvent, { allowedFlags: ['shared_memory_acknowledged'] });
assert.equal(event.relationship.trust_delta, 2.5);
assert.equal(event.relationship.intimacy_delta, 2.5);
assert.equal(event.relationship.romance_delta, -1.5);
assert.equal(event.relationship.tension_delta, -2.5);
assert.deepEqual(event.story.requested_flags, ['shared_memory_acknowledged']);
assert.equal(event.memory.save, true);
assert.equal(event.dialogueLocalized.en, 'I will listen first. You do not have to explain every reason now.');
assert.equal(event.memory.contentLocalized.en, 'User prefers being heard before receiving advice.');
assert.equal(event.choices.length, 3);
assert.equal(event.choices[0].textLocalized.en, 'Explain what happened slowly');
assert.equal(outputText({ steps: [{ type: 'thought' }, { type: 'model_output', content: [{ type: 'text', text: '{"dialogue":"from steps"}' }] }] }), '{"dialogue":"from steps"}');

const ruledEvent = applyStoryRules(structuredClone(event), {
  mode: 'chat', relationship: { tension: 3 }, storyFlags: {}, currentStoryState: { currentChapter: 'chapter_2', currentScene: 'archive' }
}, {
  relationship: { tension: 3 }, currentStoryState: { currentChapter: 'chapter_2', currentScene: 'archive' }
});
assert.equal(ruledEvent.story.chapter, 'chapter_2');
assert.equal(ruledEvent.story.scene, 'archive');
assert.equal(ruledEvent.story.flags.shared_memory_acknowledged, true);
assert.equal(ruledEvent.story.flags.first_contact_complete, undefined);

const unimportant = validateGameEvent({ ...rawEvent, memory: { ...rawEvent.memory, importance: 5 } });
assert.equal(unimportant.memory.save, false);
assert.equal(unimportant.memory.content, '');

const selected = retrieveMemories('我还想去看极光', [
  { id: 'rain', content: 'User likes rainy evenings.', importance: 6 },
  { id: 'aurora', content: 'User has wanted to see the aurora since childhood.', importance: 8 },
  { id: 'obsolete', content: 'User dislikes the aurora.', importance: 10, obsolete: true }
], 1);
assert.equal(selected[0].id, 'aurora');

assert.throws(() => validateChatRequest({ characterId: 'unknown', message: 'hello' }), /Unknown characterId/);
const request = validateChatRequest({ characterId: 'qian', message: '今天有点累', userId: 'browser-spoof', recentMessages: [{ role: 'character', text: '你可以慢慢说。' }] });
assert.equal(request.characterId, 'qian');
assert.equal(request.userId, 'browser-spoof');

let calls = 0;
const fetchImpl = async (url, options) => {
  calls += 1;
  assert.equal(url, 'https://generativelanguage.googleapis.com/v1beta/interactions');
  assert.equal(options.headers['x-goog-api-key'], 'test-key');
  const body = JSON.parse(options.body);
  assert.equal(body.model, 'gemini-test');
  assert.equal(body.response_format.mime_type, 'application/json');
  assert.match(body.input, /祁安/);
  assert.match(body.input, /CURRENT message directly/);
  assert.match(body.input, /dialogueLocalized/);
  assert.doesNotMatch(body.input, /browser-spoof/);
  return new Response(JSON.stringify({ steps: [{ type: 'thought' }, { type: 'model_output', content: [{ type: 'text', text: JSON.stringify(rawEvent) }] }] }), { status: 200, headers: { 'content-type': 'application/json' } });
};
const config = loadConfig({ GEMINI_API_KEY: 'test-key', GEMINI_MODEL: 'gemini-test' }, root);
const result = await createChatEvent({
  userId: 'browser-spoof',
  characterId: 'qian',
  message: '今天有点累，我希望先听我说。',
  language: 'zh',
  relationship: { trust: 3, intimacy: 1, romanticAttraction: 0 },
  currentStoryState: { currentChapter: 'chapter_2', currentScene: 'archive' },
  memories: [{ id: 'preference-listen', content: 'User prefers being heard before advice.', type: 'preference', importance: 8 }]
}, config, { fetchImpl });
assert.equal(calls, 1);
assert.equal(result.meta.provider, 'gemini');
assert.equal(result.meta.characterId, 'qian');
assert.equal(result.meta.persisted, false);
assert.equal(result.event.dialogue, rawEvent.dialogue);
assert.equal(result.event.memory.memory_type, 'preference');
assert.equal(result.event.story.chapter, 'chapter_2');
assert.equal(result.event.story.scene, 'archive');
assert.equal(result.event.story.flags.shared_memory_acknowledged, true);

let retryCalls = 0;
const retryModels = [];
let recoveredModel = '';
const retriedEvent = await requestGeminiEvent('retry test', { ...config.gemini, timeoutMs: 5_000 }, {
  allowedFlags: ['shared_memory_acknowledged'],
  onModelUsed: (model) => { recoveredModel = model; },
  fetchImpl: async (_url, options) => {
    retryCalls += 1;
    retryModels.push(JSON.parse(options.body).model);
    if (retryCalls === 1) {
      return new Response(JSON.stringify({ error: { message: 'Please retry.' } }), {
        status: 429,
        headers: { 'content-type': 'application/json', 'retry-after': '0' }
      });
    }
    return new Response(JSON.stringify({ steps: [{ type: 'model_output', content: [{ type: 'text', text: JSON.stringify(rawEvent) }] }] }), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    });
  }
});
assert.equal(retryCalls, 2);
assert.deepEqual(retryModels, ['gemini-test', 'gemini-3.5-flash-lite']);
assert.equal(recoveredModel, 'gemini-3.5-flash-lite');
assert.equal(retriedEvent.dialogue, rawEvent.dialogue);

let localizationPrompt = '';
const localized = await localizeGeneratedText({
  targetLanguage: 'en',
  items: [{ id: 'legacy-1', text: '先检查 03:17 的异常波形。' }]
}, config, {
  fetchImpl: async (_url, options) => {
    const body = JSON.parse(options.body);
    localizationPrompt = body.input;
    return new Response(JSON.stringify({ steps: [{ type: 'model_output', content: [{ type: 'text', text: JSON.stringify({ translations: [{ id: 'legacy-1', text: 'Check the anomalous 03:17 waveform first.' }] }) }] }] }), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    });
  }
});
assert.match(localizationPrompt, /User-authored text is never included/);
assert.equal(localized.translations[0].text, 'Check the anomalous 03:17 waveform first.');
assert.equal(localized.meta.model, 'gemini-test');

console.log('EchoLoom API boundary test: PASS');
console.log('Checked request isolation, bilingual Game Events, legacy generated-text localization, keyword memory retrieval, current Interactions steps parsing, rate-limit model failover, conversational relevance instructions, semantic validation, application-owned story flags, canonical chapter state, and relationship clamping.');
