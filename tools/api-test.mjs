import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createChatEvent } from '../server/chat-service.mjs';
import { loadConfig } from '../server/config.mjs';
import { validateGameEvent } from '../server/game-event.mjs';
import { retrieveMemories } from '../server/memory-retrieval.mjs';
import { validateChatRequest } from '../server/request-validation.mjs';
import { applyStoryRules } from '../server/story-rules.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rawEvent = {
  dialogue: '我会先听。你不必现在把所有原因解释清楚。',
  emotion: 'gentle',
  expression: 'concerned',
  relationship: { intimacy_delta: 9, trust_delta: 99, romance_delta: -9, tension_delta: -99 },
  story: { chapter: 'chapter_2', event: 'quiet-listening', unlock_event: null, requested_flags: ['shared_memory_acknowledged', 'forbidden_finale'] },
  scene: { changed: false, location: 'archive', time: 'evening', weather: 'rain', mood: 'quiet' },
  memory: { save: true, importance: 8, content: 'User prefers being heard before receiving advice.', memory_type: 'preference', emotion: 'tired' },
  choices: [
    { text: '慢慢说明发生了什么', intent: 'open_up' },
    { text: '先安静待一会儿', intent: 'quiet_company' },
    { text: '说明自己需要空间', intent: 'need_space' },
    { text: '不应出现', intent: 'extra' }
  ]
};

const event = validateGameEvent(rawEvent, { allowedFlags: ['shared_memory_acknowledged'] });
assert.equal(event.relationship.trust_delta, 2.5);
assert.equal(event.relationship.intimacy_delta, 2.5);
assert.equal(event.relationship.romance_delta, -1.5);
assert.equal(event.relationship.tension_delta, -2.5);
assert.deepEqual(event.story.requested_flags, ['shared_memory_acknowledged']);
assert.equal(event.memory.save, true);
assert.equal(event.choices.length, 3);

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
  assert.doesNotMatch(body.input, /browser-spoof/);
  return new Response(JSON.stringify({ output_text: JSON.stringify(rawEvent) }), { status: 200, headers: { 'content-type': 'application/json' } });
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

console.log('EchoLoom API boundary test: PASS');
console.log('Checked request isolation, keyword memory retrieval, structured Gemini parsing, semantic validation, application-owned story flags, canonical chapter state, and relationship clamping.');
