const MEMORY_TYPES = new Set(['profile', 'preference', 'relationship', 'emotional']);
const EXPRESSIONS = new Set(['neutral', 'gentle', 'concerned', 'distant', 'thoughtful', 'guarded', 'surprised', 'relieved']);
const EMOTIONS = new Set(['neutral', 'gentle', 'warm', 'concerned', 'curious', 'guarded', 'sad', 'tense', 'relieved', 'playful']);
const ID_PATTERN = /^[a-z][a-z0-9_-]{0,63}$/;

const relationshipProperties = {
  intimacy_delta: { type: 'number', minimum: -2.5, maximum: 2.5 },
  trust_delta: { type: 'number', minimum: -2.5, maximum: 2.5 },
  romance_delta: { type: 'number', minimum: -1.5, maximum: 1.5 },
  tension_delta: { type: 'number', minimum: -2.5, maximum: 2.5 }
};

export const GAME_EVENT_SCHEMA = Object.freeze({
  type: 'object',
  additionalProperties: false,
  properties: {
    dialogue: { type: 'string', description: 'Concise in-character dialogue, normally one to three short paragraphs.' },
    emotion: { type: 'string', enum: [...EMOTIONS] },
    expression: { type: 'string', enum: [...EXPRESSIONS] },
    relationship: {
      type: 'object', additionalProperties: false, properties: relationshipProperties,
      required: ['intimacy_delta', 'trust_delta', 'romance_delta', 'tension_delta']
    },
    story: {
      type: 'object', additionalProperties: false,
      properties: {
        chapter: { type: 'string' }, event: { type: 'string' }, unlock_event: { type: ['string', 'null'] },
        requested_flags: { type: 'array', items: { type: 'string' }, maxItems: 3 }
      },
      required: ['chapter', 'event', 'unlock_event', 'requested_flags']
    },
    scene: {
      type: 'object', additionalProperties: false,
      properties: {
        changed: { type: 'boolean' }, location: { type: 'string' }, time: { type: 'string' },
        weather: { type: 'string' }, mood: { type: 'string' }
      },
      required: ['changed', 'location', 'time', 'weather', 'mood']
    },
    memory: {
      type: 'object', additionalProperties: false,
      properties: {
        save: { type: 'boolean' }, importance: { type: 'integer', minimum: 0, maximum: 10 },
        content: { type: 'string' }, memory_type: { type: 'string', enum: [...MEMORY_TYPES] }, emotion: { type: 'string' }
      },
      required: ['save', 'importance', 'content', 'memory_type', 'emotion']
    },
    choices: {
      type: 'array', maxItems: 3,
      items: {
        type: 'object', additionalProperties: false,
        properties: { text: { type: 'string' }, intent: { type: 'string' } },
        required: ['text', 'intent']
      }
    }
  },
  required: ['dialogue', 'emotion', 'expression', 'relationship', 'story', 'scene', 'memory', 'choices']
});

function text(value, maximum, fallback = '') {
  if (typeof value !== 'string') return fallback;
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, maximum);
}

function delta(value, minimum, maximum) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.round(Math.max(minimum, Math.min(maximum, number)) * 4) / 4;
}

function eventId(value, fallback = '') {
  const candidate = text(value, 64).toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
  return ID_PATTERN.test(candidate) ? candidate : fallback;
}

export class GameEventError extends Error {
  constructor(message, code = 'invalid_game_event') {
    super(message);
    this.name = 'GameEventError';
    this.code = code;
  }
}

export function validateGameEvent(value, { allowedFlags = [] } = {}) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new GameEventError('Model output is not a JSON object.');
  const dialogue = text(value.dialogue, 1200);
  if (!dialogue) throw new GameEventError('Model output has no dialogue.');
  const allowedFlagSet = new Set(allowedFlags);
  const relationship = value.relationship && typeof value.relationship === 'object' ? value.relationship : {};
  const story = value.story && typeof value.story === 'object' ? value.story : {};
  const scene = value.scene && typeof value.scene === 'object' ? value.scene : {};
  const sourceMemory = value.memory && typeof value.memory === 'object' ? value.memory : {};
  const importance = Math.round(Math.max(0, Math.min(10, Number(sourceMemory.importance) || 0)));
  const memoryType = MEMORY_TYPES.has(sourceMemory.memory_type) ? sourceMemory.memory_type : 'relationship';
  const memoryContent = text(sourceMemory.content, 1000);
  const shouldSaveMemory = sourceMemory.save === true && importance >= 6 && memoryContent.length >= 8;

  return {
    dialogue,
    emotion: EMOTIONS.has(value.emotion) ? value.emotion : 'neutral',
    expression: EXPRESSIONS.has(value.expression) ? value.expression : 'neutral',
    relationship: {
      intimacy_delta: delta(relationship.intimacy_delta, -2.5, 2.5),
      trust_delta: delta(relationship.trust_delta, -2.5, 2.5),
      romance_delta: delta(relationship.romance_delta, -1.5, 1.5),
      tension_delta: delta(relationship.tension_delta, -2.5, 2.5)
    },
    story: {
      chapter: eventId(story.chapter, 'current'),
      event: eventId(story.event, 'conversation'),
      unlock_event: story.unlock_event == null ? null : eventId(story.unlock_event, null),
      requested_flags: Array.isArray(story.requested_flags)
        ? [...new Set(story.requested_flags.map((flag) => eventId(flag)).filter((flag) => flag && allowedFlagSet.has(flag)))].slice(0, 3)
        : [],
      flags: {}
    },
    scene: {
      changed: scene.changed === true,
      location: text(scene.location, 100), time: text(scene.time, 40), weather: text(scene.weather, 60), mood: text(scene.mood, 80)
    },
    memory: {
      save: shouldSaveMemory,
      importance,
      content: shouldSaveMemory ? memoryContent : '',
      memory_type: memoryType,
      emotion: text(sourceMemory.emotion, 40, 'neutral') || 'neutral'
    },
    choices: Array.isArray(value.choices) ? value.choices.slice(0, 3).map((choice) => ({
      text: text(choice?.text, 40),
      intent: eventId(choice?.intent, 'respond')
    })).filter((choice) => choice.text) : []
  };
}

export function parseModelJson(value) {
  if (value && typeof value === 'object') return value;
  const raw = text(value, 20_000);
  if (!raw) throw new GameEventError('Model returned an empty response.', 'empty_model_response');
  try {
    return JSON.parse(raw);
  } catch {
    const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
    if (!fenced) throw new GameEventError('Model response was not valid JSON.');
    try { return JSON.parse(fenced); } catch { throw new GameEventError('Model response was not valid JSON.'); }
  }
}

