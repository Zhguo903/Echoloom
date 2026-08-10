export const ALLOWED_STORY_FLAGS = Object.freeze([
  'first_contact_complete',
  'shared_memory_acknowledged',
  'repair_conversation_available',
  'scene_invitation_available'
]);

function text(value, maximum, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, maximum) : fallback;
}

function number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * Gemini may propose story changes, but only application rules can confirm them.
 * The model never chooses the canonical chapter and cannot unlock an arbitrary flag.
 */
export function applyStoryRules(event, requestData, context = {}) {
  const current = context.currentStoryState || {};
  const requested = new Set(event.story?.requested_flags || []);
  const existingFlags = current.flags && typeof current.flags === 'object' ? current.flags : requestData.storyFlags || {};
  const relationship = context.relationship || requestData.relationship || {};
  const canonicalChapter = text(current.current_chapter ?? current.currentChapter, 80, 'character_story_1');
  const canonicalScene = text(current.current_scene ?? current.currentScene, 100, 'first_contact');
  const nextTension = number(relationship.tension ?? relationship.strain) + number(event.relationship?.tension_delta);
  const eventId = text(event.story?.event, 80, 'conversation');
  const checks = {
    first_contact_complete: requestData.mode === 'chat',
    shared_memory_acknowledged: event.memory?.save === true,
    repair_conversation_available: nextTension >= 2 && /repair|reconcile|apology/.test(eventId),
    scene_invitation_available: event.scene?.changed === true && Boolean(text(event.scene?.location, 100))
  };
  const flags = {};
  for (const flag of ALLOWED_STORY_FLAGS) {
    if (existingFlags[flag] === true || (requested.has(flag) && checks[flag])) flags[flag] = true;
  }

  event.story.chapter = canonicalChapter;
  event.story.scene = event.scene?.changed ? text(event.scene.location, 100, canonicalScene) : canonicalScene;
  event.story.flags = flags;
  return event;
}
