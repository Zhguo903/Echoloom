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
  const REQUEST_BODY_BUDGET = 28_000;
  const NORMAL_CONTEXT = { memoryCount: 16, memoryBytes: 9_500, messageCount: 20, messageBytes: 11_000 };
  const COMPACT_CONTEXT = { memoryCount: 6, memoryBytes: 3_500, messageCount: 10, messageBytes: 5_500 };

  const delay = (milliseconds) => new Promise((resolve) => window.setTimeout(resolve, milliseconds));

  function utf8Size(value) {
    let size = 0;
    for (const character of String(value ?? '')) {
      const codePoint = character.codePointAt(0);
      size += codePoint <= 0x7f ? 1 : codePoint <= 0x7ff ? 2 : codePoint <= 0xffff ? 3 : 4;
    }
    return size;
  }

  function boundedText(value, maximumCharacters, maximumBytes) {
    let output = '';
    let bytes = 0;
    let characters = 0;
    for (const character of String(value ?? '')) {
      if (characters >= maximumCharacters) break;
      const characterBytes = utf8Size(character);
      if (bytes + characterBytes > maximumBytes) break;
      output += character;
      bytes += characterBytes;
      characters += 1;
    }
    return output.trim();
  }

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

  function queryTokens(input) {
    const parts = String(input || '').toLocaleLowerCase().match(/[a-z0-9]+|[\u3400-\u9fff]+/gi) || [];
    const tokens = new Set();
    for (const part of parts) {
      if (/^[\u3400-\u9fff]+$/.test(part)) {
        const characters = [...part];
        if (characters.length <= 2) tokens.add(part);
        for (let index = 0; index < characters.length - 1; index += 1) tokens.add(characters.slice(index, index + 2).join(''));
      } else if (part.length > 1) {
        tokens.add(part);
      }
    }
    return [...tokens].slice(0, 24);
  }

  function memorySnapshot(memories = [], language = 'zh', currentInput = '', budget = NORMAL_CONTEXT) {
    const tokens = queryTokens(currentInput);
    const prepared = memories.map((memory, index) => ({
      id: boundedText(memory.id, 100, 200),
      content: boundedText(localized(memory.text, language), budget === COMPACT_CONTEXT ? 160 : 260, budget === COMPACT_CONTEXT ? 480 : 780),
      memoryType: boundedText(memory.memoryType || memory.type, 40, 80),
      importance: Math.max(1, Math.min(10, Number(memory.importance ?? memory.emotionalIntensity ?? 5))),
      source: boundedText(localized(memory.source, language), 80, 240),
      branchId: boundedText(memory.branchId || 'root', 80, 160),
      pinned: memory.pinned === true,
      obsolete: memory.obsolete === true,
      index
    })).filter((memory) => memory.content && !memory.obsolete);
    prepared.forEach((memory) => {
      const searchable = `${memory.content} ${memory.source}`.toLocaleLowerCase();
      const relevance = tokens.reduce((score, token) => score + (searchable.includes(token) ? Math.min(24, token.length * 4) : 0), 0);
      memory.rank = (memory.pinned ? 1_000 : 0) + relevance + (memory.importance * 3) + Math.max(0, 20 - (memory.index * 0.25));
    });
    prepared.sort((left, right) => right.rank - left.rank || left.index - right.index);

    const selected = [];
    let usedBytes = 0;
    for (const { index: _index, rank: _rank, ...memory } of prepared) {
      const itemBytes = utf8Size(JSON.stringify(memory));
      if (selected.length >= budget.memoryCount || usedBytes + itemBytes > budget.memoryBytes) continue;
      selected.push(memory);
      usedBytes += itemBytes;
    }
    return selected;
  }

  function recentMessages(method, engineState, options, currentInput = '', budget = NORMAL_CONTEXT) {
    const source = method === 'sceneReply'
      ? (options.scene?.messages || [])
      : method === 'storyReply'
        ? (engineState.storyMessages || [])
        : (engineState.chatMessages || []);
    const messages = source.slice(-24).map((message) => ({
      role: message?.role === 'character' ? 'character' : 'user',
      text: boundedText(localized(message?.text, engineState.language), budget === COMPACT_CONTEXT ? 220 : 500, budget === COMPACT_CONTEXT ? 660 : 1_500)
    })).filter((message) => message.text);
    const last = messages.at(-1);
    if (last?.role === 'user' && last.text.trim() === String(currentInput).trim()) messages.pop();

    const selected = [];
    let usedBytes = 0;
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const message = messages[index];
      const itemBytes = utf8Size(JSON.stringify(message));
      if (selected.length >= budget.messageCount || usedBytes + itemBytes > budget.messageBytes) break;
      selected.unshift(message);
      usedBytes += itemBytes;
    }
    return selected;
  }

  function localizedEventText(primary, localizedValue, language) {
    const selected = language === 'en' ? 'en' : 'zh';
    const other = selected === 'en' ? 'zh' : 'en';
    const object = localizedValue && typeof localizedValue === 'object' ? localizedValue : {};
    const selectedText = String(object[selected] || primary || object[other] || '').trim();
    const otherText = String(object[other] || primary || selectedText).trim();
    return { [selected]: selectedText, [other]: otherText };
  }

  function boundedFlags(flags = {}) {
    return Object.fromEntries(Object.entries(flags).slice(0, 40).flatMap(([key, value]) => {
      const safeKey = boundedText(key, 80, 160);
      if (!safeKey) return [];
      if (typeof value === 'boolean') return [[safeKey, value]];
      if (typeof value === 'number' && Number.isFinite(value)) return [[safeKey, Math.max(-100, Math.min(100, value))]];
      if (typeof value === 'string') return [[safeKey, boundedText(value, 80, 240)]];
      return [];
    }));
  }

  function requestBody(method, input, engineState, options, budget = NORMAL_CONTEXT) {
    return {
      userId: boundedText(options.userId || 'local-demo', 80, 160),
      characterId: engineState.activeCharacterId,
      message: boundedText(input, 1000, 3_000),
      language: engineState.language,
      mode: method === 'storyReply' ? 'story' : method === 'sceneReply' ? 'scene' : 'chat',
      playerName: boundedText(options.playerName || '', 40, 120),
      playerIntent: boundedText(options.playerIntent || '', 60, 180),
      branchId: boundedText(engineState.campaign?.activeBranchId || 'root', 80, 160),
      relationship: engineState.relationship || {},
      currentStoryState: storySnapshot(engineState),
      storyFlags: boundedFlags(engineState.liveStory?.flags || {}),
      memories: memorySnapshot(engineState.memories || [], engineState.language, input, budget),
      recentMessages: recentMessages(method, engineState, options, input, budget)
    };
  }

  function compactRequestBody(method, input, engineState, options) {
    return requestBody(method, input, engineState, options, COMPACT_CONTEXT);
  }

  async function postChat(url, body, signal) {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      signal,
      body: JSON.stringify(body)
    });
    return { response, payload: await response.json().catch(() => ({})) };
  }

  function normalizeLiveResult(event, base, language) {
    return {
      ...base,
      response: localizedEventText(event.dialogue, event.dialogueLocalized, language),
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
    if (window.ECHOLOOM_PUBLIC?.offlineOnly) {
      setRuntime({ configured: false, source: 'offline', state: 'ready' });
      return { configured: false, model: null };
    }
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
    const mode = window.ECHOLOOM_PUBLIC?.offlineOnly ? 'offline' : (['auto', 'live', 'offline'].includes(options.aiMode) ? options.aiMode : 'auto');
    const discovery = mode === 'auto' ? await initialize() : null;
    if (mode === 'offline' || (mode === 'auto' && !discovery?.configured)) {
      setRuntime({ source: 'offline', state: 'ready', errorCode: null, model: null });
      return { result: base, source: 'offline', fallback: false };
    }

    setRuntime({ source: 'gemini', state: 'loading', errorCode: null });
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 20_000);
    try {
      const url = new URL('api/chat', document.baseURI);
      let body = requestBody(method, input, engineState, options);
      if (utf8Size(JSON.stringify(body)) > REQUEST_BODY_BUDGET) body = compactRequestBody(method, input, engineState, options);
      let { response, payload } = await postChat(url, body, controller.signal);
      if (response.status === 413) {
        body = compactRequestBody(method, input, engineState, options);
        ({ response, payload } = await postChat(url, body, controller.signal));
      }
      if (!response.ok || !payload?.event) {
        const error = new Error(payload?.error?.message || `API returned ${response.status}.`);
        error.code = payload?.error?.code || 'provider_error';
        throw error;
      }
      setRuntime({ source: 'gemini', state: 'ready', errorCode: null, model: payload.meta?.model || null });
      return { result: normalizeLiveResult(payload.event, base, engineState.language), source: 'gemini', fallback: false, meta: payload.meta || {} };
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

  async function localize(items, targetLanguage, options = {}) {
    if (window.ECHOLOOM_PUBLIC?.offlineOnly) return { translations: [], skipped: true };
    const mode = ['auto', 'live', 'offline'].includes(options.aiMode) ? options.aiMode : 'auto';
    if (mode === 'offline' || !Array.isArray(items) || !items.length) return { translations: [], skipped: true };
    const discovery = mode === 'auto' ? await initialize() : null;
    if (mode === 'auto' && !discovery?.configured) return { translations: [], skipped: true };
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 20_000);
    try {
      const response = await fetch(new URL('api/localize', document.baseURI), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          targetLanguage: targetLanguage === 'zh' ? 'zh' : 'en',
          items: items.slice(0, 40).map((item) => ({
            id: boundedText(item?.id, 80, 160),
            text: boundedText(item?.text, 1200, 3_600)
          }))
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !Array.isArray(payload.translations)) return { translations: [], fallback: true, errorCode: payload?.error?.code || 'provider_unavailable' };
      return { translations: payload.translations, meta: payload.meta || {}, fallback: false };
    } catch (error) {
      return { translations: [], fallback: true, errorCode: error?.name === 'AbortError' ? 'provider_timeout' : 'provider_unavailable' };
    } finally {
      window.clearTimeout(timer);
    }
  }

  async function generateSceneBackground(scene, options = {}) {
    if (window.ECHOLOOM_PUBLIC?.offlineOnly) return { skipped: true, fallback: false };
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
    localize,
    generateSceneBackground,
    status: () => ({ ...runtime })
  };
})();
