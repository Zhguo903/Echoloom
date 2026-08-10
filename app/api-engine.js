(() => {
  const runtime = {
    source: 'offline',
    state: 'idle',
    errorCode: null,
    model: null,
    updatedAt: null
  };

  const delay = (milliseconds) => new Promise((resolve) => window.setTimeout(resolve, milliseconds));

  function offlineResult(method, input, engineState, options = {}) {
    if (method === 'sceneReply') return window.EchoEngine.sceneReply(input, options.scene || {}, engineState);
    return window.EchoEngine[method](input, engineState);
  }

  function storySnapshot(engineState = {}) {
    const mainline = engineState.campaign?.mainline || {};
    return {
      currentChapter: mainline.chapterIndex != null ? `chapter_${Number(mainline.chapterIndex) + 1}` : 'current',
      currentScene: engineState.activeGeneratedSceneId || engineState.selectedSceneId || 'current',
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

  function recentMessages(method, engineState, options) {
    const source = method === 'sceneReply'
      ? (options.scene?.messages || [])
      : method === 'storyReply'
        ? (engineState.storyMessages || [])
        : (engineState.chatMessages || []);
    return source.slice(-12).map((message) => ({ ...message, text: localized(message.text, engineState.language) }));
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

  async function requestReply(method, input, engineState, options = {}) {
    const base = offlineResult(method, input, engineState, options);
    if (options.aiMode !== 'live') {
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
          recentMessages: recentMessages(method, engineState, options)
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

  window.EchoApiEngine = {
    reply,
    status: () => ({ ...runtime })
  };
})();
