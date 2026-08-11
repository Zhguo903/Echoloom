import { requestGeminiEvent } from './gemini.mjs';
import { retrieveMemories } from './memory-retrieval.mjs';
import { personaFor } from './personas.mjs';
import { buildNpcPrompt } from './prompt.mjs';
import { validateChatRequest } from './request-validation.mjs';
import { createSupabaseRepository } from './supabase.mjs';
import { ALLOWED_STORY_FLAGS, applyStoryRules } from './story-rules.mjs';

function databasePersona(persona, fallback) {
  if (!persona) return fallback;
  return {
    ...fallback,
    name: String(persona.name || fallback.name).slice(0, 80),
    traits: String(persona.personality || fallback.traits).slice(0, 600),
    speakingStyle: String(persona.speaking_style || fallback.speakingStyle).slice(0, 600),
    boundary: Array.isArray(persona.boundaries) ? persona.boundaries.join('; ').slice(0, 600) : fallback.boundary,
    coreConflict: String(persona.core_conflict || fallback.coreConflict).slice(0, 400),
    relationshipStyle: String(persona.relationship_style || 'slow-burn').slice(0, 80)
  };
}

export async function createChatEvent(payload, config, { fetchImpl = fetch } = {}) {
  const requestData = validateChatRequest(payload);
  const repository = createSupabaseRepository(config.supabase, { fetchImpl });
  let persistedContext = null;
  const warnings = [];
  if (repository.configured) {
    try { persistedContext = await repository.loadContext(requestData.characterId); }
    catch { warnings.push('persistence_read_unavailable'); }
  }

  const fallbackPersona = personaFor(requestData.characterId, requestData.language);
  const sourceMemories = persistedContext?.memories?.length ? persistedContext.memories : requestData.memories;
  const context = {
    ...requestData,
    persona: databasePersona(persistedContext?.persona, fallbackPersona),
    relationship: persistedContext?.relationship || requestData.relationship,
    currentStoryState: persistedContext?.storyState || requestData.currentStoryState,
    memories: retrieveMemories(requestData.message, sourceMemories, 6),
    recentMessages: persistedContext?.recentMessages?.length ? persistedContext.recentMessages : requestData.recentMessages
  };
  let providerModel = config.gemini.model;
  const event = applyStoryRules(
    await requestGeminiEvent(buildNpcPrompt(context), config.gemini, {
      fetchImpl,
      allowedFlags: ALLOWED_STORY_FLAGS,
      onModelUsed: (model) => { providerModel = model; }
    }),
    requestData,
    context
  );

  let persistence = null;
  if (repository.configured) {
    try { persistence = await repository.applyEvent(requestData, event); }
    catch { warnings.push('persistence_write_unavailable'); }
  }

  return {
    event,
    meta: {
      provider: 'gemini',
      model: providerModel,
      characterId: requestData.characterId,
      memoryCount: context.memories.length,
      persisted: Boolean(persistence),
      warnings
    }
  };
}
