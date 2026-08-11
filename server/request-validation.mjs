import { CHARACTER_IDS } from './personas.mjs';

const CHARACTER_SET = new Set(CHARACTER_IDS);
const MODES = new Set(['chat', 'story', 'scene']);

const clean = (value, maximum = 1000) => typeof value === 'string'
  ? value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, maximum)
  : '';

function plainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function boundedObject(source, keys, maximumString = 200) {
  const object = plainObject(source);
  return Object.fromEntries(keys.flatMap((key) => {
    const value = object[key];
    if (typeof value === 'boolean') return [[key, value]];
    if (typeof value === 'number' && Number.isFinite(value)) return [[key, Math.max(-100, Math.min(100, value))]];
    if (typeof value === 'string') return [[key, clean(value, maximumString)]];
    return [];
  }));
}

export class RequestValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'RequestValidationError';
    this.code = 'invalid_request';
  }
}

export function validateChatRequest(value) {
  const body = plainObject(value);
  const characterId = clean(body.characterId, 64);
  const message = clean(body.message, 1000);
  if (!CHARACTER_SET.has(characterId)) throw new RequestValidationError('Unknown characterId.');
  if (!message) throw new RequestValidationError('message is required.');

  const relationshipKeys = ['familiarity', 'trust', 'intimacy', 'reciprocity', 'compatibility', 'romanticAttraction', 'sexualAttraction', 'safety', 'commitment', 'strain', 'repair', 'stage', 'status'];
  const storyKeys = ['currentChapter', 'currentScene', 'phase', 'chapterIndex', 'completed', 'finalDecision'];
  const recentMessages = Array.isArray(body.recentMessages) ? body.recentMessages.slice(-24).map((item) => ({
    role: item?.role === 'character' ? 'character' : 'user',
    text: clean(item?.text, 600)
  })).filter((item) => item.text) : [];
  const memories = Array.isArray(body.memories) ? body.memories.slice(0, 32).map((item) => ({
    id: clean(item?.id, 100),
    content: clean(item?.content ?? item?.text?.zh ?? item?.text?.en ?? item?.text, 500),
    memoryType: clean(item?.memoryType ?? item?.memory_type ?? item?.type, 40),
    importance: Math.max(1, Math.min(10, Number(item?.importance ?? item?.emotionalIntensity ?? 5))),
    source: clean(item?.source?.zh ?? item?.source?.en ?? item?.source, 160),
    branchId: clean(item?.branchId ?? item?.branch_id ?? 'root', 80),
    pinned: item?.pinned === true,
    obsolete: item?.obsolete === true
  })).filter((item) => item.content) : [];

  return {
    userId: clean(body.userId, 80), // accepted for API compatibility; never used for Supabase authorization
    characterId,
    message,
    language: body.language === 'en' ? 'en' : 'zh',
    mode: MODES.has(body.mode) ? body.mode : 'chat',
    playerName: clean(body.playerName, 40),
    playerIntent: clean(body.playerIntent, 60),
    branchId: clean(body.branchId, 80) || 'root',
    relationship: boundedObject(body.relationship, relationshipKeys),
    currentStoryState: boundedObject(body.currentStoryState, storyKeys),
    storyFlags: boundedObject(body.storyFlags, Object.keys(plainObject(body.storyFlags)).slice(0, 40), 80),
    memories,
    recentMessages
  };
}
