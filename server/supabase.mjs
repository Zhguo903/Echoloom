function configured(config) {
  return Boolean(config.url && config.serviceRoleKey && config.demoUserId);
}

function headers(config, extra = {}) {
  return {
    apikey: config.serviceRoleKey,
    authorization: `Bearer ${config.serviceRoleKey}`,
    'content-type': 'application/json',
    ...extra
  };
}

async function request(config, path, { fetchImpl = fetch, method = 'GET', body } = {}) {
  const response = await fetchImpl(`${config.url}/rest/v1/${path}`, {
    method,
    headers: headers(config, method === 'POST' ? { prefer: 'return=representation' } : {}),
    body: body == null ? undefined : JSON.stringify(body)
  });
  if (!response.ok) throw new Error(`Supabase request failed with ${response.status}.`);
  if (response.status === 204) return null;
  return response.json();
}

function first(value) {
  return Array.isArray(value) ? value[0] : null;
}

export function createSupabaseRepository(config, { fetchImpl = fetch } = {}) {
  return {
    configured: configured(config),

    async loadContext(characterId) {
      if (!configured(config)) return null;
      const user = encodeURIComponent(config.demoUserId);
      const character = encodeURIComponent(characterId);
      const [personaRows, relationshipRows, memoryRows, storyRows, recentRows] = await Promise.all([
        request(config, `characters?id=eq.${character}&select=id,name,personality,background,speaking_style,system_prompt,relationship_style,boundaries,core_conflict&limit=1`, { fetchImpl }),
        request(config, `user_character_relationships?user_id=eq.${user}&character_id=eq.${character}&select=*&limit=1`, { fetchImpl }),
        request(config, `memories?user_id=eq.${user}&character_id=eq.${character}&select=id,content,memory_type,importance,emotion,branch_id,created_at&order=importance.desc,created_at.desc&limit=30`, { fetchImpl }),
        request(config, `story_states?user_id=eq.${user}&character_id=eq.${character}&select=*&limit=1`, { fetchImpl }),
        request(config, `chat_messages?user_id=eq.${user}&character_id=eq.${character}&select=role,content,created_at&order=created_at.desc&limit=12`, { fetchImpl })
      ]);
      return {
        persona: first(personaRows),
        relationship: first(relationshipRows),
        memories: Array.isArray(memoryRows) ? memoryRows : [],
        storyState: first(storyRows),
        recentMessages: Array.isArray(recentRows) ? recentRows.reverse().map((message) => ({ role: message.role, text: message.content })) : []
      };
    },

    async applyEvent(requestData, event) {
      if (!configured(config)) return null;
      return request(config, 'rpc/apply_validated_game_event', {
        fetchImpl,
        method: 'POST',
        body: {
          p_user_id: config.demoUserId,
          p_character_id: requestData.characterId,
          p_user_message: requestData.message,
          p_dialogue: event.dialogue,
          p_relationship: event.relationship,
          p_story: event.story,
          p_memory: event.memory,
          p_event: event,
          p_branch_id: requestData.branchId,
          p_provider: 'gemini'
        }
      });
    }
  };
}

