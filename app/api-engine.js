(() => {
  const runtime = {
    source: 'offline',
    state: 'idle',
    errorCode: null,
    model: null,
    configured: null,
    updatedAt: null,
    scene: { state: 'idle', cached: false, errorCode: null }
  };
  let providerDiscovery = null;

  const delay = (milliseconds) => new Promise((resolve) => window.setTimeout(resolve, milliseconds));

  function offlineResult(method, input, engineState, options = {}) {
    if (method === 'sceneReply') return window.EchoEngine.sceneReply(input, options.scene || {}, engineState);
    return window.EchoEngine[method](input, engineState);
  }

  function storySnapshot(engineState = {}) {
    const mainline = engineState.campaign?.mainline || {};
    const liveStory = engineState.liveStory || {};
    return {
      currentChapter: liveStory.currentChapter || (mainline.chapterIndex != null ? `chapter_${Number(mainline.chapterIndex) + 1}` : 'current'),
      currentScene: liveStory.currentScene || engineState.activeGeneratedSceneId || engineState.selectedSceneId || 'current',
      phase: mainline.phase || '',
      chapterIndex: Number(mainline.chapterIndex || 0),
      completed: Boolean(mainline.completed),
      finalDecision: mainline.finalDecision || ''
    };
  }

  function localized(value, language) {
    if (typeof value === 'string') return value;
    if (value && typeof value === 'object') return String(value[language] || value.zh || value.en || '');
    return '';
  }

  function memorySnapshot(memories = [], language = 'zh') {
    return memories.slice(0, 80).map((memory) => ({
      id: memory.id,
      content: localized(memory.text, language),
      memoryType: memory.memoryType || memory.type,
      importance: memory.importance ?? memory.emotionalIntensity,
      source: localized(memory.source, language),
      branchId: memory.branchId,
      pinned: memory.pinned,
      obsolete: memory.obsolete
    }));
  }

  function recentMessages(method, engineState, options, currentInput = '') {
    const source = method === 'sceneReply'
      ? (options.scene?.messages || [])
      : method === 'storyReply'
        ? (engineState.storyMessages || [])
        : (engineState.chatMessages || []);
    const messages = source.slice(-24).map((message) => ({ ...message, text: localized(message.text, engineState.language) }));
    const last = messages.at(-1);
    if (last?.role === 'user' && last.text.trim() === String(currentInput).trim()) messages.pop();
    return messages;
  }

  function normalizeLiveResult(event, base) {
    return {
      ...base,
      response: event.dialogue,
      memoryRef: event.memory?.save === true || base.memoryRef,
      relationshipDelta: {
        ...(base.relationshipDelta || {}),
        intimacy: Number(event.relationship?.intimacy_delta || 0),
        trust: Number(event.relationship?.trust_delta || 0),
        romanticAttraction: Number(event.relationship?.romance_delta || 0),
        strain: Number(event.relationship?.tension_delta || 0)
      },
      gameEvent: event,
      provider: 'gemini'
    };
  }

  function setRuntime(next) {
    Object.assign(runtime, next, { updatedAt: new Date().toISOString() });
  }

  async function initialize() {
    if (runtime.configured !== null) return { configured: runtime.configured, model: runtime.model };
    if (providerDiscovery) return providerDiscovery;
    providerDiscovery = fetch(new URL('api/provider-status', document.baseURI), { headers: { accept: 'application/json' } })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        runtime.configured = response.ok && payload?.gemini?.configured === true;
        if (payload?.gemini?.model) runtime.model = payload.gemini.model;
        return { configured: runtime.configured, model: runtime.model };
      })
      .catch(() => {
        runtime.configured = false;
        return { configured: false, model: null };
      });
    return providerDiscovery;
  }

  async function requestReply(method, input, engineState, options = {}) {
    const base = offlineResult(method, input, engineState, options);
    const mode = ['auto', 'live', 'offline'].includes(options.aiMode) ? options.aiMode : 'auto';
    const discovery = mode === 'auto' ? await initialize() : null;
    if (mode === 'offline' || (mode === 'auto' && !discovery?.configured)) {
      setRuntime({ source: 'offline', state: 'ready', errorCode: null, model: null });
      return { result: base, source: 'offline', fallback: false };
    }

    setRuntime({ source: 'gemini', state: 'loading', errorCode: null });
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 16_000);
    try {
      const url = new URL('api/chat', document.baseURI);
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          userId: options.userId || 'local-demo',
          characterId: engineState.activeCharacterId,
          message: String(input || '').slice(0, 1000),
          language: engineState.language,
          mode: method === 'storyReply' ? 'story' : method === 'sceneReply' ? 'scene' : 'chat',
          playerName: options.playerName || '',
          playerIntent: options.playerIntent || '',
          branchId: engineState.campaign?.activeBranchId || 'root',
          relationship: engineState.relationship || {},
          currentStoryState: storySnapshot(engineState),
          storyFlags: engineState.liveStory?.flags || {},
          memories: memorySnapshot(engineState.memories || [], engineState.language),
          recentMessages: recentMessages(method, engineState, options, input)
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.event) {
        const error = new Error(payload?.error?.message || `API returned ${response.status}.`);
        error.code = payload?.error?.code || 'provider_error';
        throw error;
      }
      setRuntime({ source: 'gemini', state: 'ready', errorCode: null, model: payload.meta?.model || null });
      return { result: normalizeLiveResult(payload.event, base), source: 'gemini', fallback: false, meta: payload.meta || {} };
    } catch (error) {
      setRuntime({ source: 'offline', state: 'fallback', errorCode: error?.name === 'AbortError' ? 'provider_timeout' : (error?.code || 'provider_unavailable'), model: null });
      return { result: base, source: 'offline', fallback: true, errorCode: runtime.errorCode };
    } finally {
      window.clearTimeout(timer);
    }
  }

  async function reply(method, input, engineState, options = {}) {
    const minimumDelay = Number.isFinite(options.minimumDelay) ? Math.max(0, options.minimumDelay) : 620;
    const [envelope] = await Promise.all([requestReply(method, input, engineState, options), delay(minimumDelay)]);
    return envelope;
  }

  async function generateSceneBackground(scene, options = {}) {
    if (options.aiMode === 'offline' || scene?.changed !== true) return { skipped: true, fallback: false };
    runtime.scene = { state: 'loading', cached: false, errorCode: null };
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 25_000);
    try {
      const response = await fetch(new URL('api/scene', document.baseURI), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({ scene, characterId: options.characterId || '', language: options.language === 'en' ? 'en' : 'zh' })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !/^\/api\/scenes\/[a-f0-9]{64}\.jpg$/.test(payload.image || '')) {
        const error = new Error(payload?.error?.message || `Scene API returned ${response.status}.`);
        error.code = payload?.error?.code || 'provider_error';
        throw error;
      }
      runtime.scene = { state: 'ready', cached: payload.cached === true, errorCode: null };
      return { ...payload, fallback: false };
    } catch (error) {
      runtime.scene = { state: 'fallback', cached: false, errorCode: error?.name === 'AbortError' ? 'provider_timeout' : (error?.code || 'provider_unavailable') };
      return { fallback: true, errorCode: runtime.scene.errorCode };
    } finally {
      window.clearTimeout(timer);
    }
  }

  window.EchoApiEngine = {
    initialize,
    reply,
    generateSceneBackground,
    status: () => ({ ...runtime })
  };
})();
