(() => {
  const KEY = 'echoloom.demo.v2';
  const LEGACY_KEY = 'echoloom-demo-state-v1';
  const SCHEMA_VERSION = 8;

  const clone = (value) => JSON.parse(JSON.stringify(value));
  const data = () => window.ECHOLOOM_DATA;
  const number = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;

  function migrateRelationship(saved = {}) {
    const base = data().createJourney('qian').relationship;
    const isV3 = Object.hasOwn(saved, 'romanticAttraction') || Object.hasOwn(saved, 'intimacy');
    if (isV3) return { ...base, ...saved, direction: 'characterToPlayer' };
    return {
      ...base,
      status: saved.stage || 'acquaintance',
      stage: saved.stage || 'acquaintance',
      familiarity: number(saved.familiarity, 1),
      trust: number(saved.trust, 1),
      intimacy: number(saved.comfort, 0),
      reciprocity: Math.max(0, number(saved.comfort, 1) - 1),
      compatibility: number(saved.compatibility, 1),
      romanticAttraction: number(saved.attraction, 0),
      sexualAttraction: 0,
      safety: number(saved.comfort, 1),
      commitment: 0,
      strain: number(saved.unresolved, 1),
      repair: 0,
      path: saved.path || 'open'
    };
  }

  function mergeMemory(memory, characterId, index) {
    const section = memory?.section || 'aboutUser';
    const type = memory?.type || (section === 'unresolved' ? 'relationshipJudgement' : section === 'aboutUser' ? 'fact' : 'event');
    return {
      id: memory?.id || `${characterId}-imported-${index}`,
      section,
      text: memory?.text || '',
      source: memory?.source || { zh: '旧版导入', en: 'Legacy import' },
      pinned: Boolean(memory?.pinned),
      permanent: memory?.permanent !== false,
      type,
      worldId: memory?.worldId || 'station',
      branchId: memory?.branchId || 'root',
      providedBy: memory?.providedBy || characterId,
      confidence: memory?.confidence || (type === 'relationshipJudgement' ? 'medium' : 'high'),
      emotionalIntensity: number(memory?.emotionalIntensity, type === 'event' ? 2 : 1),
      private: Boolean(memory?.private),
      obsolete: Boolean(memory?.obsolete),
      crossWorld: Boolean(memory?.crossWorld)
    };
  }

  function mergeJourney(characterId, saved, sourceVersion = SCHEMA_VERSION) {
    const base = data().createJourney(characterId);
    if (!saved || typeof saved !== 'object') return base;
    const merged = {
      ...base,
      ...saved,
      met: typeof saved.met === 'boolean' ? saved.met : sourceVersion >= 2,
      relationship: migrateRelationship(saved.relationship || {}),
      playerSignals: { ...base.playerSignals, ...(saved.playerSignals || {}) },
      agreements: {
        ...base.agreements,
        ...(saved.agreements || {}),
        consentNotes: Array.isArray(saved.agreements?.consentNotes) ? saved.agreements.consentNotes : []
      },
      behaviourHistory: Array.isArray(saved.behaviourHistory) ? saved.behaviourHistory.slice(-50) : [],
      openingDecision: saved.openingDecision && typeof saved.openingDecision === 'object' ? saved.openingDecision : null,
      routeFlags: Array.isArray(saved.routeFlags) ? saved.routeFlags.slice(-20) : [],
      communicationPulse: {
        ...base.communicationPulse,
        ...(saved.communicationPulse || {}),
        channelComfort: { ...base.communicationPulse.channelComfort, ...(saved.communicationPulse?.channelComfort || {}) }
      },
      memories: Array.isArray(saved.memories) ? saved.memories.map((memory, index) => mergeMemory(memory, characterId, index)) : base.memories,
      generatedScenes: Array.isArray(saved.generatedScenes) ? saved.generatedScenes : [],
      storyMessages: Array.isArray(saved.storyMessages) ? saved.storyMessages : base.storyMessages,
      chatMessages: Array.isArray(saved.chatMessages) ? saved.chatMessages : base.chatMessages
    };
    return merged;
  }

  function mergeEchoLink(saved = {}, sourceVersion = SCHEMA_VERSION) {
    const base = data().createEchoLink();
    const contacts = {};
    for (const [id, contact] of Object.entries(base.contacts)) contacts[id] = { ...contact, ...(saved.contacts?.[id] || {}) };
    const conversations = {};
    for (const [id, conversation] of Object.entries(base.conversations)) {
      const imported = saved.conversations?.[id] || {};
      conversations[id] = {
        ...conversation,
        ...imported,
        participantIds: sourceVersion < 5 && id === 'group-seven'
          ? [...new Set([...conversation.participantIds, ...(Array.isArray(imported.participantIds) ? imported.participantIds : [])])]
          : Array.isArray(imported.participantIds) ? imported.participantIds : conversation.participantIds,
        messages: Array.isArray(imported.messages) ? imported.messages.slice(-120) : conversation.messages
      };
    }
    return {
      ...base,
      ...saved,
      contacts,
      conversations,
      moments: Array.isArray(saved.moments) ? saved.moments : base.moments,
      pendingEvents: { ...base.pendingEvents, ...(saved.pendingEvents || {}) },
      commitments: Array.isArray(saved.commitments) ? saved.commitments : [],
      hiddenFlags: Array.isArray(saved.hiddenFlags) ? saved.hiddenFlags : []
    };
  }

  function mergeWeaver(saved = {}, sourceVersion = SCHEMA_VERSION) {
    const base = data().createWeaverState();
    const merged = {
      ...base,
      ...saved,
      phase: ['locked', 'arrival', 'threads', 'review', 'npc', 'world', 'complete'].includes(saved.phase) ? saved.phase : 'locked',
      observerLevel: Math.max(1, Math.min(8, number(saved.observerLevel, sourceVersion < 8 ? 1 : base.observerLevel))),
      threadIndex: Math.max(0, Math.min(data().weaverContent.threads.length - 1, number(saved.threadIndex, 0))),
      responses: Array.isArray(saved.responses) ? saved.responses.slice(-20) : [],
      threadValues: saved.threadValues && typeof saved.threadValues === 'object' ? saved.threadValues : {},
      confirmedThreadIds: Array.isArray(saved.confirmedThreadIds)
        ? saved.confirmedThreadIds.filter((id) => data().weaverContent.threads.some((thread) => thread.id === id))
        : [],
      tutorialNpc: { ...base.tutorialNpc, ...(saved.tutorialNpc || {}) },
      tutorialWorld: { ...base.tutorialWorld, ...(saved.tutorialWorld || {}) },
      tutorialNpcCreated: Boolean(saved.tutorialNpcCreated),
      tutorialWorldCreated: Boolean(saved.tutorialWorldCreated),
      completed: Boolean(saved.completed),
      workshopUnlocked: Boolean(saved.workshopUnlocked),
      quota: { ...base.quota, ...(saved.quota || {}) },
      createdNpcs: Array.isArray(saved.createdNpcs) ? saved.createdNpcs.slice(0, 60) : [],
      createdWorlds: Array.isArray(saved.createdWorlds) ? saved.createdWorlds.slice(0, 24) : [],
      editingNpcId: typeof saved.editingNpcId === 'string' ? saved.editingNpcId : null,
      editingWorldId: typeof saved.editingWorldId === 'string' ? saved.editingWorldId : null
    };
    if (merged.completed) {
      merged.phase = 'complete';
      merged.observerLevel = 8;
      merged.workshopUnlocked = true;
      merged.tutorialNpcCreated = true;
      merged.tutorialWorldCreated = true;
    }
    return data().syncWeaverQuota(merged);
  }

  function migrateLegacy(saved) {
    const base = clone(data().defaultState);
    return {
      ...base,
      language: saved?.language === 'en' ? 'en' : 'zh',
      screen: 'title',
      settings: { ...base.settings, ...(saved?.settings || {}) },
      legacyArchive: {
        migratedAt: new Date().toISOString(),
        sourceSchemaVersion: number(saved?.version, 1),
        state: clone(saved)
      }
    };
  }

  function mergeCampaign(saved = {}, sourceVersion = SCHEMA_VERSION) {
    const base = data().createCampaign();
    const baseMainline = data().createMainline();
    const savedMainline = saved.mainline && typeof saved.mainline === 'object' ? saved.mainline : {};
    const mainline = {
      ...baseMainline,
      ...savedMainline,
      chapterIndex: Math.max(0, Math.min(data().mainlineContent.chapters.length - 1, number(savedMainline.chapterIndex, 0))),
      phase: ['briefing', 'sample', 'result', 'finale', 'resolved'].includes(savedMainline.phase) ? savedMainline.phase : 'briefing',
      responses: Array.isArray(savedMainline.responses) ? savedMainline.responses.slice(-20) : [],
      confirmedAnchorIds: Array.isArray(savedMainline.confirmedAnchorIds)
        ? savedMainline.confirmedAnchorIds.filter((id) => data().mainlineContent.chapters.some((chapter) => chapter.anchor.id === id))
        : [],
      completed: Boolean(savedMainline.completed),
      finalDecision: ['restore', 'echo', 'publish'].includes(savedMainline.finalDecision) ? savedMainline.finalDecision : null
    };
    return {
      ...base,
      ...saved,
      clues: Array.isArray(saved.clues) ? saved.clues : [],
      knowledge: Array.isArray(saved.knowledge) ? saved.knowledge : base.knowledge,
      characterRelations: { ...base.characterRelations, ...(saved.characterRelations || {}) },
      sharedEvent: { ...base.sharedEvent, ...(saved.sharedEvent || {}) },
      worldDraft: { ...base.worldDraft, ...(saved.worldDraft || {}) },
      npcDraft: { ...base.npcDraft, ...(saved.npcDraft || {}) },
      mainline,
      weaver: mergeWeaver(saved.weaver || {}, sourceVersion),
      echoLink: mergeEchoLink(saved.echoLink || {}, sourceVersion)
    };
  }

  function mergeState(saved) {
    const base = clone(data().defaultState);
    if (!saved || typeof saved !== 'object') return base;
    const sourceVersion = number(saved.version, 1);
    if (sourceVersion < 2 || !saved.journeys || typeof saved.journeys !== 'object') return migrateLegacy(saved);

    const journeys = {};
    for (const characterId of data().characterIds) {
      if (saved.journeys[characterId]) journeys[characterId] = mergeJourney(characterId, saved.journeys[characterId], sourceVersion);
    }

    const activeCharacterId = data().characters[saved.activeCharacterId] ? saved.activeCharacterId : null;
    const legacyScreenMap = {
      splash: 'title', discover: 'signal-scan', story: 'first-rescue', summary: 'event-result', station: 'observatory-home',
      threads: 'archive-branches', together: 'together', echoes: 'echoes', echolink: 'echolink', relationship: 'relationship',
      sharedEvent: 'sharedEvent', creator: 'creator', home: 'home', chat: 'chat', generatedStory: 'generatedStory', settings: 'settings'
    };
    const validScreens = new Set([
      'splash', 'title', 'prologue', 'player-name', 'signal-scan', 'signal-detail', 'signal-confirm', 'first-rescue',
      'event-result', 'echolink-activation', 'first-contact', 'observatory-home', 'mainline-chapter', 'weaver-mainline', 'story-hub', 'world-hub', 'archive-branches',
      'echolink', 'relationship', 'sharedEvent', 'creator', 'home', 'chat', 'together', 'generatedStory', 'echoes', 'settings'
    ]);
    const requestedScreen = saved.screen || legacyScreenMap[saved.route] || 'title';
    const screen = validScreens.has(requestedScreen) ? requestedScreen : 'title';
    const knownNpcIds = Array.isArray(saved.knownNpcIds)
      ? saved.knownNpcIds.filter((id) => data().characters[id])
      : Object.keys(journeys).filter((id) => journeys[id]?.met);
    const contactNpcIds = Array.isArray(saved.contactNpcIds)
      ? saved.contactNpcIds.filter((id) => data().characters[id])
      : (saved.campaign?.firstSignal ? [saved.campaign.firstSignal] : []);
    const merged = {
      ...base,
      ...saved,
      version: SCHEMA_VERSION,
      activeCharacterId,
      screen,
      resumeScreen: validScreens.has(saved.resumeScreen) ? saved.resumeScreen : (screen === 'settings' ? 'observatory-home' : screen),
      onboardingStarted: typeof saved.onboardingStarted === 'boolean' ? saved.onboardingStarted : Boolean(saved.campaign?.firstSignal || sourceVersion < 6),
      onboardingCompleted: typeof saved.onboardingCompleted === 'boolean' ? saved.onboardingCompleted : Boolean(saved.campaign?.prologueComplete),
      playerName: typeof saved.playerName === 'string' ? saved.playerName.slice(0, 24) : '',
      knownNpcIds,
      contactNpcIds,
      selectedNpcId: data().characters[saved.selectedNpcId] ? saved.selectedNpcId : (saved.campaign?.firstSignal || null),
      unreadCount: Math.max(0, number(saved.unreadCount, 0)),
      currentBranchId: saved.currentBranchId || saved.campaign?.activeBranchId || 'root',
      hiddenFlags: Array.isArray(saved.hiddenFlags) ? saved.hiddenFlags : [],
      saves: Array.isArray(saved.saves) ? saved.saves.slice(0, 12) : [],
      journeys,
      campaign: mergeCampaign(saved.campaign || {}, sourceVersion),
      archives: Array.isArray(saved.archives) ? saved.archives.slice(0, 6) : [],
      settings: { ...base.settings, ...(saved.settings || {}) }
    };
    delete merged.route;
    return merged;
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return mergeState(JSON.parse(raw));
      const legacyRaw = localStorage.getItem(LEGACY_KEY);
      if (!legacyRaw) return clone(data().defaultState);
      const migrated = mergeState(JSON.parse(legacyRaw));
      save(migrated);
      return migrated;
    } catch (error) {
      console.warn('EchoLoom state could not be loaded:', error);
      return clone(data().defaultState);
    }
  }

  function save(state) {
    const next = { ...state, version: SCHEMA_VERSION, lastUpdated: new Date().toISOString() };
    localStorage.setItem(KEY, JSON.stringify(next));
  }

  function reset() {
    localStorage.removeItem(KEY);
    localStorage.removeItem(LEGACY_KEY);
    return clone(data().defaultState);
  }

  function exportState(state) {
    return JSON.stringify({
      product: 'EchoLoom Interactive Demo',
      schemaVersion: SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      state: { ...state, version: SCHEMA_VERSION }
    }, null, 2);
  }

  function importState(text) {
    const payload = JSON.parse(text);
    const source = payload?.state || payload;
    const isLegacy = source && typeof source === 'object' && Array.isArray(source.memories);
    const isJourneyState = source && typeof source === 'object' && source.journeys && typeof source.journeys === 'object';
    if (!isLegacy && !isJourneyState) throw new Error('Invalid EchoLoom state');
    return mergeState(source);
  }

  window.EchoStorage = { load, save, reset, exportState, importState };
})();
