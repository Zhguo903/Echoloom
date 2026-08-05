(() => {
  const app = document.getElementById('app');
  const modalRoot = document.getElementById('modal-root');
  const toastRoot = document.getElementById('toast-root');
  const demoShell = document.getElementById('demo-shell');
  const phoneFrame = document.getElementById('phone-frame');
  const importFile = document.getElementById('import-file');
  const { copy, scenes, characters, characterIds, prologueRoutes, onboardingContent, mainlineContent, weaverContent, createMainline, createWeaverState, syncWeaverQuota, createJourney, createCampaign } = window.ECHOLOOM_DATA;

  let state = window.EchoStorage.load();
  let isTyping = false;
  let isGenerating = false;
  let modalContext = null;
  let splashTimer = null;
  let splashStartedAt = state.screen === 'splash' ? Date.now() : 0;
  let prologueAutoTimer = null;
  let prologueAuto = false;
  const echoPendingReplies = new Map();
  let echoReplySequence = 0;

  const routeSequence = ['title', 'prologue', 'signal-scan', 'first-rescue', 'event-result', 'echolink-activation', 'first-contact', 'observatory-home', 'mainline-chapter', 'weaver-mainline', 'story-hub', 'echolink', 'world-hub', 'archive-branches'];
  const sceneBackgroundAssets = {
    'fate-observatory': 'assets/backgrounds/bg01-fate-observatory.png',
    'private-archive': 'assets/backgrounds/bg02-private-archive.png',
    'rainy-old-station': 'assets/backgrounds/bg03-rainy-old-station.png',
    'memory-repair-lab': 'assets/backgrounds/bg04-memory-repair-lab.png',
    'echolink-space': 'assets/backgrounds/bg05-echolink-space.png',
    'sealed-echoloom': 'assets/backgrounds/bg06-sealed-echoloom.png',
    'activated-echoloom': 'assets/backgrounds/bg07-activated-echoloom.png',
    'tide-city-terminal': 'assets/backgrounds/bg08-tide-city-terminal.png',
    'main-mirror-tribunal': 'assets/backgrounds/bg09-main-mirror-tribunal.png'
  };
  const characterNarrativeBackgrounds = {
    qian: 'memory-repair-lab',
    shenyao: 'main-mirror-tribunal',
    lichuan: 'rainy-old-station',
    zhoutang: 'echolink-space',
    wensheng: 'rainy-old-station'
  };
  const characterNarrativeScreens = new Set(['signal-detail', 'first-rescue', 'event-result', 'story', 'summary']);
  const demoGroups = [
    { title: ['核心叙事', 'Core narrative'], steps: [
      ['title', '品牌与标题'], ['prologue', '17 秒序章'], ['signal-scan', '五处信号'], ['signal-confirm', '优先响应'],
      ['first-rescue', '首次救援'], ['first-contact', '联系建立'], ['observatory-home', '观测站首页'], ['mainline-chapter', '第十七秒之后'], ['weaver-mainline', '第一根自由的线'], ['archive-branches', '分支档案']
    ] },
    { title: ['功能演示', 'Feature demos'], steps: [
      ['echolink', 'EchoLink'], ['relationship', '关系观测'], ['sharedEvent', '共同场景'], ['world-hub', '世界与 NPC'],
      ['echoes', '类型化记忆'], ['together', '随机世界'], ['creator', '织界工坊']
    ] }
  ];

  const esc = (value = '') => String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  const t = (key) => copy[state.language]?.[key] ?? copy.zh[key] ?? key;
  const localText = (value) => {
    if (value == null) return '';
    if (typeof value === 'object') return value[state.language] ?? value.zh ?? value.en ?? '';
    return value;
  };
  const characterAvatar = (characterOrId) => {
    const character = typeof characterOrId === 'string' ? characters[characterOrId] : characterOrId;
    return character?.avatar || character?.portrait || 'assets/brand/echoloom-mark.png';
  };
  const activeCharacter = () => characters[state.activeCharacterId] || null;
  const activeJourney = () => state.activeCharacterId ? state.journeys?.[state.activeCharacterId] || null : null;
  const engineState = () => ({ ...(activeJourney() || {}), language: state.language, activeCharacterId: state.activeCharacterId, campaign: state.campaign });
  const langText = (zh, en) => state.language === 'en' ? en : zh;

  function sceneBackgroundKey() {
    const screen = state.screen;
    const mainline = state.campaign?.mainline || {};
    const weaver = state.campaign?.weaver || {};
    const phase = mainline.phase || 'briefing';
    const chapterIndex = Math.max(0, Number(mainline.chapterIndex || 0));

    if (screen === 'prologue') return 'fate-observatory';
    if (characterNarrativeScreens.has(screen)) {
      return characterNarrativeBackgrounds[state.selectedNpcId || state.activeCharacterId] || '';
    }
    if (screen === 'mainline-chapter') {
      if (['finale', 'resolved'].includes(phase) || chapterIndex >= 3) return 'main-mirror-tribunal';
      if (chapterIndex === 0 && phase === 'sample') return 'rainy-old-station';
      if (chapterIndex === 0) return 'private-archive';
      if (chapterIndex === 1) return 'memory-repair-lab';
      if (chapterIndex === 2) return 'echolink-space';
    }
    if (screen === 'weaver-mainline') {
      if (['world', 'complete'].includes(weaver.phase)) return 'tide-city-terminal';
      if (['threads', 'review', 'npc'].includes(weaver.phase)) return 'activated-echoloom';
      return 'sealed-echoloom';
    }
    return '';
  }

  function applySceneBackground() {
    const screen = app.firstElementChild;
    const key = sceneBackgroundKey();
    const assetPath = sceneBackgroundAssets[key];
    if (!screen || !assetPath) return;
    const asset = new URL(assetPath, document.baseURI).href;

    screen.dataset.sceneBackground = key;
    screen.style.setProperty('--scene-background-image', `url("${asset}")`);

    const sceneImage = screen.querySelector([
      ':scope > .vn-background',
      ':scope > .signal-detail-bg',
      '.result-hero > img',
      '.story-scene > .story-scene-bg'
    ].join(', '));
    if (sceneImage) sceneImage.src = asset;

    const summaryDecoration = screen.querySelector('.summary-decoration');
    if (summaryDecoration) summaryDecoration.style.backgroundImage = `url("${asset}")`;
  }

  const icon = (name, size = 20) => {
    const attrs = `width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"`;
    const paths = {
      back: '<path d="m15 18-6-6 6-6"/>',
      settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21H9.6v-.1A1.7 1.7 0 0 0 8.6 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H3V9.6h.1A1.7 1.7 0 0 0 4.6 8.6a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V3h4v.1A1.7 1.7 0 0 0 15.4 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 9c.16.38.37.72.6 1 .3.35.7.4 1.1.4h.1v4h-.1a1.7 1.7 0 0 0-1.7.6Z"/>',
      home: '<path d="m3 11 9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/>',
      threads: '<path d="M4 6h16M4 12h16M4 18h10"/>',
      together: '<path d="M8.5 14.5 4 10a3 3 0 0 1 4.2-4.2L12 9.6l3.8-3.8A3 3 0 0 1 20 10l-8 8-1.7-1.7"/><path d="m7 12 5 5 5-5"/>',
      echoes: '<path d="M5 4h14v16H5z"/><path d="M8 8h8M8 12h6M8 16h4"/>',
      send: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
      edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
      trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 10v6M14 10v6"/>',
      pin: '<path d="m12 17 5-5-2-2 1-5-7 7-5 1 2 2 5-5"/><path d="m5 19 4-4"/>',
      download: '<path d="M12 3v12m0 0 4-4m-4 4-4-4"/><path d="M5 21h14"/>',
      upload: '<path d="M12 17V5m0 0 4 4m-4-4L8 9"/><path d="M5 21h14"/>',
      plus: '<path d="M12 5v14M5 12h14"/>',
      memory: '<path d="M4 5h16v14H4z"/><path d="m7 9 2 2 4-4"/><path d="M7 15h10"/>',
      message: '<path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z"/>',
      image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 15-5-5L5 20"/>',
      chevron: '<path d="m9 18 6-6-6-6"/>',
      people: '<circle cx="9" cy="8" r="3"/><path d="M3 20c0-4 2.5-7 6-7s6 3 6 7"/><circle cx="17" cy="9" r="2"/><path d="M15 14c3 0 5 2 5 5"/>'
      ,phone: '<rect x="6" y="2" width="12" height="20" rx="3"/><path d="M10 5h4M11 18h2"/>'
      ,contacts: '<circle cx="9" cy="8" r="3"/><path d="M3 20c0-4 2-7 6-7s6 3 6 7M16 7h5M18.5 4.5v5"/>'
      ,moments: '<circle cx="12" cy="12" r="8"/><path d="m8 14 2-2 2 2 3-4 3 4"/><circle cx="9" cy="9" r="1"/>'
      ,bonds: '<path d="M7 12a5 5 0 0 1 8-4l2 2a5 5 0 0 1-7 7l-1-1"/><path d="M17 12a5 5 0 0 1-8 4l-2-2a5 5 0 0 1 7-7l1 1"/>'
      ,mic: '<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3"/>'
      ,call: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.4 2.1L8.1 10a16 16 0 0 0 5.9 5.9l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.9.6 2.9.7a2 2 0 0 1 1.7 2Z"/>'
    };
    return `<svg ${attrs}>${paths[name] || paths.together}</svg>`;
  };

  function statusBar() {
    return '<div class="status-bar"><span>9:41</span><span class="status-icons"><span class="signal"></span><span class="wifi"></span><span class="battery"></span></span></div>';
  }

  function topBar(title, subtitle = '', backRoute = 'home', right = 'settings') {
    const rightButton = right === 'none' ? '<span></span>' : `<button class="round-icon-button" type="button" data-action="go" data-route="${esc(right)}" aria-label="${esc(t('settings'))}">${icon('settings', 17)}</button>`;
    return `${statusBar()}<div class="top-bar"><button class="round-icon-button" type="button" data-action="go" data-route="${esc(backRoute)}" aria-label="Back">${icon('back', 18)}</button><div class="top-bar-title"><strong>${esc(title)}</strong>${subtitle ? `<span>${esc(subtitle)}</span>` : ''}</div>${rightButton}</div>`;
  }

  function bottomNav(active) {
    const unread = Number(state.unreadCount || 0);
    const items = [
      ['observatory-home', 'home', langText('首页', 'Home')],
      ['story-hub', 'threads', langText('故事', 'Story')],
      ['echolink', 'phone', 'EchoLink'],
      ['world-hub', 'together', langText('世界', 'World')],
      ['archive-branches', 'echoes', langText('档案', 'Archive')]
    ];
    return `<nav class="bottom-nav observatory-nav" aria-label="Primary">${items.map(([route, iconName, label], index) => `<button type="button" class="nav-item ${index === 2 ? 'center-link' : ''} ${active === route ? 'active' : ''}" data-action="go" data-route="${route}" aria-label="${esc(label)}"><span class="nav-icon-wrap">${icon(iconName)}${index === 2 && unread ? `<b>${unread}</b>` : ''}</span><span>${esc(label)}</span></button>`).join('')}</nav>`;
  }

  function renderSplash() {
    const lead = langText('命运观测站断电了 17 秒。恢复后，你出现在站内，系统却找不到一份彼此一致的“你”。', 'The Fate Observation Station lost power for 17 seconds. When it returned, you were inside—and the system could not find one consistent version of you.');
    return `<section class="app-screen splash-screen">${statusBar()}<div class="splash-content"><img class="splash-lockup" src="assets/brand/echoloom-lockup.png" alt="EchoLoom — Stories weave. Companions stay."><h1 class="visually-hidden">EchoLoom</h1><div class="splash-tagline">${esc(langText('命运观测站', 'Fate Observation Station'))}</div><p class="splash-lead">${esc(lead)}</p><div class="splash-thread"><span></span></div><div class="splash-actions"><button type="button" class="primary-button" data-action="go" data-route="discover">${esc(langText('回应求救信号', 'Answer a distress signal'))} ✦</button><div class="splash-meta">${esc(t('demoOffline'))}</div></div></div></section>`;
  }

  function renderDiscover() {
    const first = state.campaign?.firstSignal;
    return `<section class="app-screen discover-screen people-discover">${statusBar()}<header class="people-header"><div><span class="eyebrow">EchoLoom · ${esc(langText('观测站事故 00:17', 'Station incident 00:17'))}</span><h1>${esc(first ? langText('五条关系线，仍属于五个独立的人', 'Five relationship lines, each belonging to an independent person') : langText('你先回应哪一处？', 'Which signal will you answer first?'))}</h1><p>${esc(first ? langText('你可以认识其他人；第一次选择造成的影响会保留。', 'You may meet the others; the consequences of your first choice remain.') : langText('五处信号同时出现。路线决定你先掌握的事实，也会影响其他人如何理解你。', 'Five signals arrive at once. Your route shapes what you learn first and how the others understand you.'))}</p></div><button class="round-icon-button" type="button" data-action="go" data-route="settings" aria-label="${esc(t('settings'))}">${icon('settings', 17)}</button></header><div class="people-list">${characterIds.map(renderCharacterCard).join('')}</div><p class="people-principle">${esc(langText('选择只决定相遇顺序，不分配恋爱对象。角色只会对自己实际知道的事作出反应。', 'The choice sets encounter order, not a romantic assignment. Characters react only to what they actually know.'))}</p></section>`;
  }

  function renderCharacterCard(characterId) {
    const character = characters[characterId];
    const journey = state.journeys?.[characterId];
    const action = journey?.met ? t('resumeKnowing') : (state.campaign?.firstSignal ? t('startKnowing') : langText('前往现场', 'Respond here'));
    const first = state.campaign?.firstSignal === characterId;
    return `<article class="person-card ${state.activeCharacterId === characterId ? 'active' : ''}"><img class="person-card-bg" src="${esc(character.discoveryBg)}" alt=""><div class="person-card-shade"></div><img class="person-card-art character-card-${esc(character.id)}" src="${esc(character.cardPortrait || character.portrait)}" alt="${esc(localText(character.name))}"><div class="person-card-copy"><span class="person-relation">${esc(localText(character.stationArea))}${first ? ` · ${esc(langText('最先回应', 'First response'))}` : ''}</span><h2>${esc(localText(character.name))}</h2><p>${esc(localText(character.role))}</p><div class="signal-line">${esc(localText(character.distress))}</div><div class="person-tags"><span>${esc(localText(character.traits))}</span><span>${esc(localText(character.firstWorld))}</span></div><button type="button" class="primary-button compact" data-action="start-character" data-character-id="${characterId}">${esc(action)} ✦</button></div></article>`;
  }

  function chronologicalStoryView(messages = [], fallbackOpening = null) {
    const ordered = Array.isArray(messages) ? messages : [];
    const hasPlayerMessage = ordered.some((message) => message.role === 'user');
    if (hasPlayerMessage) return { spotlight: null, history: ordered };
    const spotlight = [...ordered].reverse().find((message) => message.role !== 'user') || fallbackOpening;
    return { spotlight, history: [] };
  }

  function renderStory() {
    const character = activeCharacter();
    const journey = activeJourney();
    if (!character || !journey) return renderDiscover();
    const messages = journey.storyMessages || [];
    const conversation = chronologicalStoryView(messages);
    return `<section class="app-screen story-screen">${statusBar()}<div class="story-scene"><img class="story-scene-bg" src="${esc(character.storyBg)}" alt=""><div class="story-top-actions"><button class="round-icon-button" type="button" data-action="go" data-route="discover" aria-label="${esc(langText('返回角色选择', 'Back to character discovery'))}">${icon('back',18)}</button><button class="round-icon-button" type="button" data-action="go" data-route="settings" aria-label="${esc(t('settings'))}">${icon('settings',17)}</button></div><div class="story-header"><span class="chapter">${esc(t('chapterOne'))} · ${esc(localText(character.relation))}</span><h1>${esc(localText(character.chapterTitle))}</h1><p>${esc(localText(character.chapterSubtitle))}</p></div>${conversation.spotlight ? `<div class="story-dialogue-wrap">${dialogueCard(conversation.spotlight)}</div>` : ''}</div><div class="story-interaction"><div class="story-history" id="story-history">${conversation.history.map(storyHistoryMessage).join('')}${isTyping ? typingMarkup() : ''}</div><div class="story-input-row"><input id="story-input" class="story-input" type="text" maxlength="260" placeholder="${esc(t('whatSay'))}"><button type="button" class="send-button" data-action="story-send" aria-label="${esc(t('send'))}" ${isTyping ? 'disabled' : ''}>${icon('send',18)}</button></div><div class="intent-options">${character.options.map((option, index) => `<button type="button" class="intent-button" data-action="story-option" data-text="${esc(localText(option))}"><span class="intent-icon">${['?', '↔', '…', '◇'][index] || '·'}</span><span>${esc(localText(option))}</span><span class="chev">›</span></button>`).join('')}</div><p class="story-hint">${esc(t('storyInputHint'))}</p>${journey.storyStep >= 2 && !isTyping ? `<button type="button" class="primary-button slate finish-story-button" data-action="finish-chapter">${esc(t('finishChapter'))}</button>` : ''}</div></section>`;
  }

  function dialogueCard(message) {
    const character = activeCharacter();
    return `<div class="dialogue-card"><div class="dialogue-avatar"><img src="${esc(characterAvatar(character))}" alt=""></div><div class="dialogue-copy"><strong>${esc(localText(character.name))}</strong><p>${esc(localText(message.text))}</p>${message.memoryRef ? `<span class="memory-reference">${icon('memory',10)}${esc(t('mentionMemory'))}</span>` : ''}</div></div>`;
  }

  function storyHistoryMessage(message) {
    return `<div class="story-history-message ${message.role === 'user' ? 'user' : 'character'}">${esc(localText(message.text))}</div>`;
  }

  function typingMarkup() {
    const character = activeCharacter();
    return `<div class="typing-indicator"><span>${esc(localText(character.name))}${state.language === 'en' ? ' is typing…' : ' 正在输入…'}</span><span class="typing-dots"><i></i><i></i><i></i></span></div>`;
  }

  function naturalRelationshipSummary() {
    const character = activeCharacter();
    const relationship = activeJourney()?.relationship || {};
    if (Number(relationship.trust || 0) <= 0 || Number(relationship.safety || 0) <= 0) {
      return langText(`${localText(character.name)}已经主动拉开距离。继续认识需要先重新确认边界和诚实。`, `${localText(character.name)} has stepped back. Continuing will require clearer boundaries and honesty.`);
    }
    if (Number(relationship.strain || 0) >= 4) {
      return langText(`你们仍愿意继续了解彼此，但几次分歧尚未解决。关系不会在问题被忽略时自动变亲密。`, 'You are still willing to know each other, but several disagreements remain unresolved. The relationship will not deepen by ignoring them.');
    }
    return localText(character.summary);
  }

  function relationshipLabel(journey = activeJourney()) {
    const labels = {
      unconfirmed: langText('尚未共同定义', 'Not mutually defined'),
      friend: langText('普通朋友', 'Friends'),
      closeFriend: langText('亲密朋友', 'Close friends'),
      ambiguous: langText('暧昧关系', 'Ambiguous relationship'),
      lover: langText('恋爱伴侣', 'Romantic partners'),
      distant: langText('保持距离', 'Distant')
    };
    return labels[journey?.agreements?.label] || labels.unconfirmed;
  }

  function qualitative(value, inverse = false) {
    const amount = Number(value || 0);
    if (inverse) {
      if (amount >= 6) return langText('需要处理', 'Needs attention');
      if (amount >= 3) return langText('仍有张力', 'Some tension');
      return langText('较低', 'Low');
    }
    if (amount >= 7) return langText('显著', 'Strong');
    if (amount >= 4) return langText('逐渐稳定', 'Developing');
    if (amount >= 2) return langText('初步形成', 'Emerging');
    return langText('尚未形成', 'Not formed');
  }

  function renderSummary() {
    const character = activeCharacter();
    if (!character) return renderDiscover();
    const clue = prologueRoutes[character.id]?.clue;
    return `<section class="app-screen summary-screen">${statusBar()}<div class="summary-decoration" style="background-image:url('${esc(character.discoveryBg)}')"></div><div class="summary-content"><div class="thread-emblem"><img src="assets/brand/echoloom-mark.png" alt=""></div><h1>${esc(langText('第一条命运线已记录', 'The first fate line is recorded'))}</h1><p class="lead">${esc(langText(`你和${localText(character.name)}仍在认识彼此。危机中的合作不等于亲密，也不替双方定义关系。`, `You and ${localText(character.name)} are still learning about each other. Cooperation in a crisis does not equal intimacy or define the relationship.`))}</p>${clue ? `<div class="clue-card"><span>${esc(langText('新线索', 'New clue'))} · ${esc(localText(clue.source))}</span><p>${esc(localText(clue.text))}</p></div>` : ''}<div class="summary-section"><h2>${esc(langText('角色理解到的你', `What ${localText(character.name)} understood`))}</h2>${character.heLearnt.map((item) => `<div class="summary-item">${esc(localText(item))}</div>`).join('')}</div><div class="relationship-state-card"><span>${esc(t('relationshipState'))} · ${esc(relationshipLabel())}</span><p>${esc(naturalRelationshipSummary())}</p><small>${esc(langText('数值变化不会自动改写关系名称；只有对话确认才会。', 'Values never rename the relationship automatically; only mutual conversation can.'))}</small></div><button type="button" class="primary-button" data-action="continue-knowing">${esc(langText('返回命运观测站', 'Return to the station'))} ✦</button></div></section>`;
  }

  function renderStation() {
    const metIds = characterIds.filter((id) => state.journeys?.[id]?.met);
    const allMet = metIds.length === characterIds.length;
    const campaign = state.campaign;
    const eventResolved = campaign.sharedEvent?.status === 'resolved';
    const echoUnread = Object.values(campaign.echoLink?.conversations || {}).filter(echoThreadUnlocked).reduce((sum, thread) => sum + Number(thread.unread || 0), 0);
    return `<section class="app-screen station-screen">${statusBar()}<div class="station-hero"><img src="assets/backgrounds/observatory.svg" alt=""><div class="station-top"><span>${esc(langText('命运观测站', 'Fate Observation Station'))}</span><button class="round-icon-button" type="button" data-action="go" data-route="settings" aria-label="${esc(t('settings'))}">${icon('settings',17)}</button></div><div class="station-title"><span class="eyebrow">${esc(langText('见习观察员 · 主线谜团', 'Trainee observer · central mystery'))}</span><h1>${esc(langText('没有这个名字', 'There Is No Such Name'))}</h1><p>${esc(langText('你记得许澄，也保留着她的照片；系统却坚持她从未存在。五类证据记录着同一场校正的后果。', 'You remember Xu Cheng and still have her photo; the system insists she never existed. Five kinds of evidence record the consequences of one correction.'))}</p></div></div><div class="station-content"><div class="station-progress"><span>${esc(langText('已认识角色', 'People met'))}</span><strong>${metIds.length} / ${characterIds.length}</strong><div><i style="width:${metIds.length / characterIds.length * 100}%"></i></div></div><div class="station-people">${characterIds.map((id) => {
      const character = characters[id];
      const met = state.journeys?.[id]?.met;
      return `<button type="button" class="station-person ${met ? 'met' : ''}" data-action="${met ? 'open-character-home' : 'start-character'}" data-character-id="${id}"><img src="${esc(characterAvatar(character))}" alt=""><span><strong>${esc(localText(character.name))}</strong><small>${esc(met ? relationshipLabel(state.journeys[id]) : localText(character.stationArea))}</small></span><b>›</b></button>`;
    }).join('')}</div><button class="station-alert ${eventResolved ? 'resolved' : ''}" type="button" data-action="go" data-route="sharedEvent" ${!allMet ? 'disabled' : ''}><span class="alert-mark">${eventResolved ? '✓' : '!'}</span><span><strong>${esc(langText('共同事件：许澄的选择', 'Shared event: Xu Cheng’s Choice'))}</strong><small>${esc(eventResolved ? langText('她的决定已写入当前分支', 'Her decision is recorded in this branch') : allMet ? langText('找到许澄后，先问她想去哪里', 'When Xu Cheng is found, ask where she wants to go') : langText(`再认识 ${characterIds.length - metIds.length} 人后解锁`, `Meet ${characterIds.length - metIds.length} more to unlock`))}</small></span><b>›</b></button><button class="echolink-entry" type="button" data-action="go" data-route="echolink"><span class="echolink-mark">${icon('phone',20)}</span><span><strong>${esc(langText('回声终端 EchoLink', 'EchoLink Terminal'))}</strong><small>${esc(langText('讯息、联系人、动态、关系与分支', 'Messages, contacts, moments, bonds, and branches'))}</small></span>${echoUnread ? `<b>${echoUnread}</b>` : '<i>›</i>'}</button><section class="station-panel"><div class="panel-heading"><span><strong>${esc(langText('当前证据', 'Current evidence'))}</strong><small>${campaign.clues.length + 2} ${esc(langText('条记录', 'records'))}</small></span><button type="button" data-action="go" data-route="relationship">${esc(langText('关系与知情范围', 'Relationships & knowledge'))}</button></div>${campaign.clues.slice(-2).map((clue) => `<div class="mini-clue"><span>${esc(localText(clue.source))}</span><p>${esc(localText(clue.text))}</p></div>`).join('') || `<div class="mini-clue"><p>${esc(langText('先回应一处信号，保全许澄存在过的第一类证据。', 'Answer one signal to preserve the first kind of evidence that Xu Cheng existed.'))}</p></div>`}</section><div class="station-tools"><button type="button" data-action="go" data-route="threads"><span>⌁</span><strong>${esc(langText('命运档案', 'Fate Archive'))}</strong><small>${esc(langText('保存与回溯分支', 'Save and rewind branches'))}</small></button><button type="button" data-action="go" data-route="creator"><span>✦</span><strong>${esc(langText('世界与 NPC', 'World & NPC'))}</strong><small>${esc(langText('闻笙协作的设定卡', 'Setting cards with Wen Sheng'))}</small></button></div></div>${bottomNav('station')}</section>`;
  }

  const echoLinkState = () => state.campaign?.echoLink;

  function echoContactName(contactId) {
    if (characters[contactId]) return localText(characters[contactId].name);
    if (contactId === 'unknown-w17') return langText('未知号码 · W-17', 'Unknown number · W-17');
    return localText(echoLinkState()?.contacts?.[contactId]?.name) || contactId;
  }

  function echoContactAvatar(contactId) {
    return characterAvatar(contactId);
  }

  function echoContactUnlocked(contactId) {
    if (characters[contactId]) return Boolean(state.journeys?.[contactId]?.met);
    if (contactId === 'sui') return Boolean(state.campaign.mainline?.completed || state.campaign.sharedEvent?.status === 'resolved');
    if (contactId === 'yecheng' || contactId === 'unknown-w17') return Boolean(state.campaign.firstSignal);
    return false;
  }

  function echoThreadUnlocked(thread) {
    if (!thread) return false;
    if (thread.type === 'group') return characterIds.every((id) => state.journeys?.[id]?.met);
    if (thread.type === 'delayed') return Boolean(state.campaign.firstSignal);
    return thread.participantIds.some((id) => id !== 'player' && echoContactUnlocked(id));
  }

  function echoContactSource(contact) {
    if (!contact) return '';
    if (contact.sources) return localText(contact.sources[state.campaign.firstSignal] || contact.sources.qian);
    return localText(contact.source);
  }

  function echoTabBar(active) {
    const tabs = [
      ['messages', 'message', '讯息', 'Messages'],
      ['contacts', 'contacts', '联系人', 'Contacts'],
      ['moments', 'moments', '动态', 'Moments'],
      ['bonds', 'bonds', '关系', 'Bonds'],
      ['archive', 'threads', '档案', 'Archive']
    ];
    return `<nav class="echolink-tabs" aria-label="EchoLink">${tabs.map(([id, iconName, zh, en]) => `<button type="button" class="${active === id ? 'active' : ''}" data-action="echolink-tab" data-tab="${id}">${icon(iconName,18)}<span>${esc(langText(zh,en))}</span></button>`).join('')}</nav>`;
  }

  function echoHeader(title, subtitle = '') {
    return `${statusBar()}<div class="echolink-header"><button class="round-icon-button" type="button" data-action="go" data-route="observatory-home" aria-label="Back">${icon('back',18)}</button><div><strong>${esc(title)}</strong><span>${esc(subtitle)}</span></div><button class="round-icon-button" type="button" data-action="go" data-route="settings" aria-label="${esc(t('settings'))}">${icon('settings',16)}</button></div>`;
  }

  function renderEchoLink() {
    const terminal = echoLinkState();
    if (!terminal || !state.campaign.firstSignal) return renderStation();
    if (!terminal.hasOpened) {
      const firstId = state.campaign.firstSignal;
      return `<section class="app-screen echolink-screen echolink-lock">${statusBar()}<div class="terminal-lock-time"><strong>09:17</strong><span>${esc(langText('命运观测站 · 当前分支', 'Fate Observation Station · current branch'))}</span></div><div class="terminal-lock-card"><div class="terminal-logo">${icon('phone',28)}</div><span>EchoLink</span><h1>${esc(langText('回声终端已配对', 'Echo terminal paired'))}</h1><p>${esc(langText('它保存联系人权限、异步讯息、共同记忆和当前世界线。普通沉默不会被解释成关系下降。', 'It stores contact permissions, asynchronous messages, shared memories, and the current worldline. Ordinary silence is not treated as relationship decline.'))}</p><div class="lock-notifications"><div><img src="${esc(echoContactAvatar(firstId))}" alt=""><span><strong>${esc(echoContactName(firstId))}</strong><small>${esc(langText('新的联系通道已建立', 'A new contact channel is available'))}</small></span></div><div><span class="unknown-avatar">?</span><span><strong>${esc(langText('未知号码 · W-17', 'Unknown number · W-17'))}</strong><small>${esc(langText('收到一段延迟未知的受损语音', 'A damaged voice note arrived with unknown delay'))}</small></span></div></div><button class="primary-button" type="button" data-action="echolink-activate">${esc(langText('解锁回声终端', 'Unlock EchoLink'))}</button><button class="text-button" type="button" data-action="go" data-route="observatory-home">${esc(langText('暂时返回观测站', 'Return to station for now'))}</button></div></section>`;
    }
    const thread = terminal.activeThreadId ? terminal.conversations[terminal.activeThreadId] : null;
    if (thread && echoThreadUnlocked(thread)) return renderEchoThread(thread);
    terminal.activeThreadId = null;
    const bodies = {
      messages: renderEchoMessages,
      contacts: renderEchoContacts,
      moments: renderEchoMoments,
      bonds: renderEchoBonds,
      archive: renderEchoArchive
    };
    const renderBody = bodies[terminal.activeTab] || renderEchoMessages;
    return `<section class="app-screen echolink-screen">${echoHeader('EchoLink', langText('回声终端 · 当前世界线已同步', 'Echo terminal · current worldline synced'))}<div class="echolink-content">${renderBody()}</div>${echoTabBar(terminal.activeTab)}</section>`;
  }

  function echoThreadTitle(thread) {
    if (thread.type === 'group') return langText('第七异常观测小组', 'Seventh Anomaly Group');
    if (thread.type === 'delayed') return langText('未知号码 · W-17', 'Unknown number · W-17');
    return echoContactName(thread.participantIds.find((id) => id !== 'player'));
  }

  function renderEchoMessages() {
    const terminal = echoLinkState();
    const threads = Object.values(terminal.conversations).filter(echoThreadUnlocked);
    const unread = threads.reduce((sum, thread) => sum + Number(thread.unread || 0), 0);
    return `<div class="echo-page-heading"><div><span>${esc(langText('异步通讯', 'Asynchronous communication'))}</span><h1>${esc(langText('讯息', 'Messages'))}</h1></div><b>${unread ? `${unread} ${esc(langText('条未读', 'unread'))}` : esc(langText('已同步', 'Synced'))}</b></div><div class="echo-thread-list">${threads.map((thread) => {
      const last = thread.messages[thread.messages.length - 1];
      const pending = echoPendingReplies.get(thread.id);
      const avatarId = thread.type === 'group' ? 'yecheng' : thread.participantIds.find((id) => id !== 'player');
      const badge = thread.type === 'group' ? String(thread.participantIds.length) : thread.type === 'delayed' ? '⌁' : '';
      const preview = pending ? langText(`${echoContactName(pending.speakerId)}正在输入…`, `${echoContactName(pending.speakerId)} is typing…`) : localText(last?.text);
      return `<button type="button" class="echo-thread-row" data-action="echolink-open-thread" data-thread-id="${esc(thread.id)}"><span class="echo-avatar"><img src="${esc(echoContactAvatar(avatarId))}" alt="">${badge ? `<i>${badge}</i>` : ''}</span><span><strong>${esc(echoThreadTitle(thread))}</strong><small class="${pending ? 'pending' : ''}">${esc(preview)}</small></span><span class="thread-meta"><time>${esc(last?.time || '')}</time>${thread.unread ? `<b>${thread.unread}</b>` : ''}</span></button>`;
    }).join('')}</div><div class="echo-quiet-note">${icon('message',16)}<span>${esc(langText('可以随时尝试联系，但对方可能因工作、边界或世界信号稍后回复。', 'You may reach out at any time, but work, boundaries, or world signal may delay a reply.'))}</span></div>`;
  }

  function renderEchoContacts() {
    const contacts = Object.values(echoLinkState().contacts);
    return `<div class="echo-page-heading"><div><span>${esc(langText('权限来自剧情与意愿', 'Access comes from story and willingness'))}</span><h1>${esc(langText('联系人', 'Contacts'))}</h1></div><b>${contacts.filter((contact) => echoContactUnlocked(contact.id)).length} / ${contacts.length}</b></div><div class="echo-contact-list">${contacts.map((contact) => {
      const unlocked = echoContactUnlocked(contact.id);
      const channels = unlocked ? contact.channels : [];
      return `<article class="echo-contact-card ${unlocked ? '' : 'locked'}"><div class="contact-main"><img src="${esc(echoContactAvatar(contact.id))}" alt=""><span><strong>${esc(characters[contact.id] ? localText(characters[contact.id].name) : localText(contact.name))}</strong><small>${esc(localText(contact.world))}</small></span><b>${unlocked ? esc(langText('可联系', 'Available')) : '🔒'}</b></div><p>${esc(unlocked ? localText(contact.status) : langText('见过或被记录，不等于拥有私人联系方式。', 'Being seen or recorded does not grant private contact.'))}</p>${unlocked ? `<div class="contact-source"><span>${esc(langText('取得方式', 'Source'))}</span><strong>${esc(echoContactSource(contact))}</strong></div><div class="channel-pills">${channels.map((channel) => `<span>${esc(echoChannelLabel(channel))}</span>`).join('')}${contact.lockedChannels.slice(0,2).map((channel) => `<span class="locked">${esc(echoChannelLabel(channel))} · ${esc(langText('未开放', 'locked'))}</span>`).join('')}</div><small class="contact-habit">${esc(localText(contact.habit))}</small><button type="button" data-action="echolink-open-thread" data-thread-id="${contact.id}">${esc(langText('打开讯息', 'Open messages'))}</button>` : ''}</article>`;
    }).join('')}</div>`;
  }

  function echoChannelLabel(channel) {
    const labels = { text: ['文字','Text'], voice: ['语音','Voice'], photo: ['照片','Photo'], call: ['通话','Call'], location: ['位置','Location'] };
    return langText(...(labels[channel] || [channel,channel]));
  }

  function renderEchoMoments() {
    const moments = echoLinkState().moments.filter((moment) => echoContactUnlocked(moment.authorId));
    return `<div class="echo-page-heading"><div><span>${esc(langText('他们的生活不围绕你停止', 'Their lives continue outside you'))}</span><h1>${esc(langText('动态', 'Moments'))}</h1></div></div><div class="moment-feed">${moments.map((moment) => `<article class="moment-card"><header><img src="${esc(echoContactAvatar(moment.authorId))}" alt=""><span><strong>${esc(echoContactName(moment.authorId))}</strong><small>${esc(localText(moment.time))}</small></span></header>${moment.type === 'photo' ? `<div class="moment-visual"><img src="${esc(characters[moment.authorId]?.homeBg || 'assets/backgrounds/observatory.svg')}" alt=""><span>${icon('image',18)}</span></div>` : '<div class="moment-notice">OBSERVATION NOTICE</div>'}<p>${esc(localText(moment.text))}</p><footer><button type="button" class="${moment.playerLiked ? 'active' : ''}" data-action="echolink-like-moment" data-moment-id="${esc(moment.id)}">${moment.playerLiked ? '♥' : '♡'} ${esc(langText('回应', 'React'))}</button><button type="button" data-action="echolink-moment-private" data-author-id="${esc(moment.authorId)}">${esc(langText('私聊回应', 'Reply privately'))}</button><span>${Number(moment.comments || 0) + (moment.playerLiked ? 1 : 0)}</span></footer></article>`).join('')}</div>`;
  }

  function echoObserverEstimate(value, journey) {
    const center = Math.round(Number(value || 0) * 10);
    const spread = Math.max(6, 22 - Math.round(Number(journey.relationship.familiarity || 0) * 2));
    const confidence = Math.min(92, 44 + Math.round(Number(journey.relationship.familiarity || 0) * 5));
    return `${Math.max(0,center-spread)}–${Math.min(100,center+spread)} · ${langText('可信度', 'confidence')} ${confidence}%`;
  }

  function renderEchoBonds() {
    const terminal = echoLinkState();
    const metIds = characterIds.filter((id) => state.journeys?.[id]?.met);
    const selectedId = metIds.includes(state.activeCharacterId) ? state.activeCharacterId : metIds[0];
    if (!selectedId) return `<div class="echo-empty">${esc(langText('先在观测站回应一条求救信号。', 'Answer a distress signal at the station first.'))}</div>`;
    const journey = state.journeys[selectedId];
    const pendingPromise = terminal.commitments.find((item) => item.with === selectedId && item.status === 'pending');
    const relationshipKeys = { trust:['信任','Trust'], intimacy:['亲密','Intimacy'], reciprocity:['互惠','Reciprocity'], compatibility:['契合','Compatibility'], safety:['边界安全','Safety'], romanticAttraction:['浪漫倾向','Romance'], strain:['矛盾负债','Strain'], repair:['修复能力','Repair'] };
    const pulseKeys = { responseReliability:['回应可靠性','Response reliability'], initiativeBalance:['主动平衡','Initiative balance'], topicDepth:['话题深度','Topic depth'] };
    return `<div class="echo-page-heading"><div><span>${esc(langText('长期关系与近期通信分开观察', 'Long-term bond and recent communication stay separate'))}</span><h1>${esc(langText('关系观测', 'Bonds'))}</h1></div><button type="button" class="observer-toggle ${terminal.observerMode ? 'active' : ''}" data-action="echolink-observer-mode">${esc(terminal.observerMode ? langText('分析模式', 'Analysis') : langText('沉浸模式', 'Immersive'))}</button></div><div class="bond-selector">${metIds.map((id) => `<button type="button" class="${id === selectedId ? 'active' : ''}" data-action="echolink-select-bond" data-character-id="${id}"><img src="${esc(characterAvatar(id))}" alt=""><span>${esc(localText(characters[id].name))}</span></button>`).join('')}</div><section class="bond-status-card"><span>${esc(langText('双方确认状态', 'Mutual confirmation'))}</span><h2>${esc(relationshipLabel(journey))}</h2><p>${esc(langText('表达、吸引和双方确认仍是三件不同的事。', 'Expression, attraction, and mutual confirmation remain separate.'))}</p></section><section class="bond-grid">${Object.entries(relationshipKeys).map(([key,labels]) => `<div><span>${esc(langText(...labels))}</span><strong>${esc(terminal.observerMode ? echoObserverEstimate(journey.relationship[key],journey) : qualitative(journey.relationship[key],key === 'strain'))}</strong></div>`).join('')}</section><section class="pulse-card"><div><span>${esc(langText('近期通信脉冲', 'Recent communication pulse'))}</span><small>${esc(langText('低频联系不自动降低长期关系', 'Low frequency does not reduce the long-term bond'))}</small></div>${Object.entries(pulseKeys).map(([key,labels]) => `<p><span>${esc(langText(...labels))}</span><strong>${esc(qualitative(journey.communicationPulse[key]))}</strong></p>`).join('')}<p><span>${esc(langText('渠道舒适度', 'Channel comfort'))}</span><strong>${Object.entries(journey.communicationPulse.channelComfort).sort((a,b)=>b[1]-a[1]).slice(0,2).map(([channel])=>esc(echoChannelLabel(channel))).join(' · ')}</strong></p></section>${pendingPromise ? `<section class="promise-card"><span>${esc(langText('待兑现约定', 'Pending promise'))}</span><strong>${esc(localText(pendingPromise.text))}</strong><small>${esc(langText('约定只有在后续行为发生时才结算信任。', 'Trust is settled only when the follow-up action occurs.'))}</small><div><button type="button" data-action="echolink-resolve-promise" data-outcome="fulfilled">${esc(langText('兑现约定', 'Fulfilled'))}</button><button type="button" data-action="echolink-resolve-promise" data-outcome="explained">${esc(langText('提前说明无法前来', 'Explained early'))}</button><button type="button" data-action="echolink-resolve-promise" data-outcome="missed">${esc(langText('失约且未解释', 'Missed without explanation'))}</button></div></section>` : ''}<section class="player-signal-card"><span>${esc(langText('主控明确表达过', 'Player has explicitly expressed'))}</span><p>${esc(Object.entries(journey.playerSignals).filter(([,value])=>Number(value)>0).map(([key])=>key).join(' · ') || langText('尚无明确倾向', 'No clear signal'))}</p></section>`;
  }

  function renderEchoArchive() {
    const activeBranch = state.campaign.activeBranchId || 'root';
    return `<div class="echo-page-heading"><div><span>${esc(langText('通讯状态随分支一起恢复', 'Communication state restores with the branch'))}</span><h1>${esc(langText('档案', 'Archive'))}</h1></div><b>${state.archives.length + 1} / 7</b></div><section class="archive-tree echo-archive-tree"><article class="archive-node root ${activeBranch === 'root' ? 'active' : ''}"><span class="node-dot"></span><div><strong>${esc(langText('原始时间线', 'Original timeline'))}</strong><small>${esc(langText('联系人、未读、承诺和消息从这里分叉', 'Contacts, unread state, promises, and messages branch here'))}</small></div><b>${activeBranch === 'root' ? esc(langText('当前', 'Current')) : '00'}</b></article>${state.archives.map((archive,index)=>renderArchiveNode(archive,index)).join('')}<button class="secondary-button archive-save" type="button" data-action="create-archive" ${state.archives.length >= 6 ? 'disabled' : ''}>${icon('plus',13)} ${esc(langText('保存当前通讯分支', 'Save current communication branch'))}</button><p class="archive-note">${esc(langText('回溯会先保存当前状态；另一分支的关系、联系人权限、未读消息和承诺不会叠加。', 'Rewind saves the current state first; relationships, contact access, unread messages, and promises never accumulate across branches.'))}</p></section>`;
  }

  function renderEchoMessage(message, thread) {
    const self = message.sender === 'player';
    const system = message.sender === 'system';
    const senderName = self || system ? '' : echoContactName(message.sender);
    const typeLabel = message.type === 'voice' ? `▸ ${langText('语音留言', 'Voice note')}` : message.type === 'photo' ? `▧ ${langText('照片', 'Photo')}` : message.type === 'call' ? `☎ ${langText('通话记录', 'Call record')}` : '';
    return `<div class="echo-message ${self ? 'self' : system ? 'system' : 'other'}">${thread.type === 'group' && senderName ? `<span class="echo-sender">${esc(senderName)}</span>` : ''}<div>${typeLabel ? `<small>${esc(typeLabel)}</small>` : ''}<p>${esc(localText(message.text))}</p><time>${esc(message.time || '')}</time></div></div>`;
  }

  function renderEchoTyping(thread) {
    const pending = echoPendingReplies.get(thread.id);
    if (!pending) return '';
    const name = echoContactName(pending.speakerId);
    const status = langText(`${name}正在输入`, `${name} is typing`);
    return `<div class="echo-typing-row" role="status" aria-live="polite" aria-label="${esc(status)}"><img src="${esc(echoContactAvatar(pending.speakerId))}" alt=""><div class="echo-typing-stack">${thread.type === 'group' ? `<span>${esc(name)}</span>` : ''}<div class="echo-typing-bubble" aria-hidden="true"><i></i><i></i><i></i></div></div><span class="visually-hidden">${esc(status)}</span></div>`;
  }

  function renderEchoThread(thread) {
    const terminal = echoLinkState();
    thread.unread = 0;
    const contactId = thread.participantIds.find((id) => id !== 'player');
    const contact = terminal.contacts[contactId];
    const availableChannels = thread.type === 'private' ? (contact?.channels || ['text']) : thread.type === 'delayed' ? ['text','voice'] : ['text'];
    if (!availableChannels.includes(terminal.composerChannel)) terminal.composerChannel = 'text';
    const subtitle = thread.type === 'group' ? langText(`${thread.participantIds.length} 人 · 谁看见，谁才知道`, `${thread.participantIds.length} members · only recipients know`) : thread.type === 'delayed' ? langText('跨世界延迟未知', 'Cross-world delay unknown') : localText(contact?.status);
    const nightTrain = thread.id === 'lichuan' && terminal.pendingEvents.nightTrain === 'available';
    const pending = echoPendingReplies.has(thread.id);
    return `<section class="app-screen echolink-screen echo-thread-screen">${statusBar()}<div class="echolink-header thread"><button class="round-icon-button" type="button" data-action="echolink-close-thread" aria-label="Back">${icon('back',18)}</button><div><strong>${esc(echoThreadTitle(thread))}</strong><span>${esc(subtitle)}</span></div>${thread.id === 'shenyao' ? `<button class="round-icon-button" type="button" data-action="echolink-call">${icon('call',16)}</button>` : '<span></span>'}</div><div class="echo-thread-body" id="echo-thread-body">${thread.messages.map((message)=>renderEchoMessage(message,thread)).join('')}${renderEchoTyping(thread)}${nightTrain && !pending ? `<section class="message-event-card"><span>${esc(langText('异步剧情 · 夜间列车', 'Async story · Night Train'))}</span><p>${esc(langText('黎川会根据你的行动继续自己的路线；不回复本身不会降低关系。', 'Li Chuan will continue his route based on your action; silence alone does not lower the bond.'))}</p><div><button type="button" data-action="echolink-invite" data-choice="join">${esc(langText('愿意同行', 'Go together'))}</button><button type="button" data-action="echolink-invite" data-choice="ask">${esc(langText('先问风险', 'Ask about risk'))}</button><button type="button" data-action="echolink-invite" data-choice="alternative">${esc(langText('拒绝并提替代', 'Decline, offer alternative'))}</button></div></section>` : ''}</div><div class="echo-composer"><div class="intent-suggestions"><button type="button" data-action="echolink-suggest" data-intent="friendship">${esc(langText('朋友式关心', 'Friendly care'))}</button><button type="button" data-action="echolink-suggest" data-intent="task">${esc(langText('询问事实与风险', 'Ask facts and risk'))}</button><button type="button" data-action="echolink-suggest" data-intent="uncertain">${esc(langText('暂时不确定', 'Still uncertain'))}</button></div><label class="private-intent"><span>${esc(langText('主控真实意图 · NPC 不直接看到', 'Player intent · not directly shown to NPC'))}</span><select id="echo-private-intent"><option value="friendship" ${terminal.privateIntent === 'friendship' ? 'selected' : ''}>${esc(langText('朋友式关心', 'Friendship'))}</option><option value="hidden-romance" ${terminal.privateIntent === 'hidden-romance' ? 'selected' : ''}>${esc(langText('隐藏好感', 'Hidden romantic interest'))}</option><option value="uncertain" ${terminal.privateIntent === 'uncertain' ? 'selected' : ''}>${esc(langText('自己也不确定', 'Uncertain'))}</option><option value="task" ${terminal.privateIntent === 'task' ? 'selected' : ''}>${esc(langText('任务合作', 'Task cooperation'))}</option></select></label><div class="channel-switch">${availableChannels.map((channel)=>`<button type="button" class="${terminal.composerChannel === channel ? 'active' : ''}" data-action="echolink-channel" data-channel="${channel}">${channel === 'voice' ? icon('mic',14) : channel === 'photo' ? icon('image',14) : icon('message',14)}${esc(echoChannelLabel(channel))}</button>`).join('')}</div><div class="echo-input-row"><input id="echo-message-input" maxlength="300" ${pending ? 'disabled' : ''} placeholder="${esc(pending ? langText('对方正在输入…', 'Waiting for reply…') : langText('自由输入；建议只表达意图', 'Write freely; suggestions express intent only'))}"><button type="button" data-action="echolink-send" aria-label="${esc(t('send'))}" ${pending ? 'disabled' : ''}>${icon('send',17)}</button></div><button class="silence-button" type="button" data-action="echolink-silence" ${pending ? 'disabled' : ''}>${esc(langText('保持沉默／稍后回复', 'Stay silent / reply later'))}</button></div></section>`;
  }

  function renderRelationship() {
    const character = activeCharacter();
    const journey = activeJourney();
    if (!character || !journey) return renderStation();
    const dimensionLabels = {
      familiarity: ['熟悉度', 'Familiarity'], trust: ['信任度', 'Trust'], intimacy: ['亲密度', 'Intimacy'], reciprocity: ['互惠感', 'Reciprocity'], compatibility: ['相容性', 'Compatibility'], romanticAttraction: ['浪漫吸引', 'Romantic attraction'], sexualAttraction: ['身体吸引', 'Physical attraction'], safety: ['安全感', 'Safety'], commitment: ['承诺度', 'Commitment'], strain: ['关系张力', 'Strain'], repair: ['修复程度', 'Repair']
    };
    const signalLabels = { friendship: ['友情倾向', 'friendship'], romantic: ['浪漫倾向', 'romantic interest'], sexual: ['身体亲密倾向', 'physical-intimacy interest'], avoidance: ['回避倾向', 'avoidance'], uncertainty: ['不确定', 'uncertainty'] };
    const expressed = Object.entries(journey.playerSignals).filter(([, value]) => Number(value) > 0).map(([key]) => langText(...signalLabels[key])).join(' · ');
    const known = state.campaign.knowledge.concat(state.campaign.clues).filter((item) => item.knownBy?.includes(character.id));
    const network = Object.values(state.campaign.characterRelations || {});
    return `<section class="app-screen relationship-screen">${topBar(langText('关系档案', 'Relationship dossier'), localText(character.name), 'station')}<div class="relationship-content"><section class="agreement-card"><span>${esc(langText('双方确认层', 'Mutual agreement layer'))}</span><h2>${esc(relationshipLabel(journey))}</h2><p>${esc(langText('吸引、你的表达和双方关系是三件不同的事。这里不会因阈值自动改名。', 'Attraction, your expression, and the shared relationship are separate. Thresholds never rename it automatically.'))}</p><div class="agreement-facts"><span>${esc(langText(`浪漫：${journey.agreements.romantic ? '已确认' : '未确认'}`, `Romance: ${journey.agreements.romantic ? 'confirmed' : 'unconfirmed'}`))}</span><span>${esc(langText(`排他性：${journey.agreements.exclusivity === 'undefined' ? '未讨论' : journey.agreements.exclusivity}`, `Exclusivity: ${journey.agreements.exclusivity === 'undefined' ? 'not discussed' : journey.agreements.exclusivity}`))}</span><span>${esc(langText(`身体亲密：${journey.agreements.sexual ? '已确认' : '未确认'}`, `Physical intimacy: ${journey.agreements.sexual ? 'confirmed' : 'unconfirmed'}`))}</span></div></section><section class="relationship-section"><h2>${esc(langText(`${localText(character.name)} → 你`, `${localText(character.name)} → you`))}</h2><p>${esc(langText('角色内部状态 · 以自然语言呈现', 'Character internal state · shown in natural language'))}</p><div class="dimension-grid">${Object.entries(dimensionLabels).map(([key, labels]) => `<div><span>${esc(langText(...labels))}</span><strong>${esc(qualitative(journey.relationship[key], key === 'strain'))}</strong></div>`).join('')}</div></section><section class="relationship-section"><h2>${esc(langText('你 → 角色', 'You → character'))}</h2><p>${esc(langText('系统只记录表达信号，不推断“你爱上了谁”。', 'The system records expression signals; it never infers that you love someone.'))}</p><div class="signal-summary">${esc(expressed || langText('尚未记录明确倾向', 'No clear signal recorded'))}</div></section><section class="relationship-section"><h2>${esc(langText('发起关系确认对话', 'Start a relationship conversation'))}</h2><div class="agreement-actions"><button type="button" data-action="set-agreement" data-label="friend">${esc(langText('确认普通朋友', 'Confirm friendship'))}</button><button type="button" data-action="set-agreement" data-label="ambiguous">${esc(langText('谈谈浪漫可能', 'Discuss romantic possibility'))}</button><button type="button" data-action="set-agreement" data-label="distant">${esc(langText('说明需要距离', 'Ask for distance'))}</button></div></section><section class="relationship-section knowledge-section"><h2>${esc(langText(`${localText(character.name)}实际知道的事`, `What ${localText(character.name)} actually knows`))}</h2>${known.map((item) => `<article><span>${esc(localText(item.source))} · ${esc(item.confidence)}</span><p>${esc(localText(item.text))}</p></article>`).join('') || `<p>${esc(langText('尚无角色可用信息。', 'No character-available information yet.'))}</p>`}</section><section class="relationship-section"><h2>${esc(langText('角色之间', 'Between characters'))}</h2><p>${esc(langText('他们彼此也有独立历史，不围绕你自动竞争。', 'They also share independent histories and do not automatically compete around you.'))}</p><div class="character-network">${network.map((edge) => `<div><strong>${esc(localText(characters[edge.from].name))} ↔ ${esc(localText(characters[edge.to].name))}</strong><span>${esc(edge.status)} · ${esc(langText('信任', 'trust'))} ${esc(qualitative(edge.trust))} · ${esc(langText('张力', 'strain'))} ${esc(qualitative(edge.strain, true))}</span></div>`).join('')}</div></section></div></section>`;
  }

  function renderSharedEvent() {
    const allMet = characterIds.every((id) => state.journeys?.[id]?.met);
    if (!allMet) return renderStation();
    const event = state.campaign.sharedEvent;
    if (event.status === 'resolved') {
      const outcomes = {
        return: ['公开唯一世界线协议，让她回到观测站', 'Published the Unique Line Protocol and returned her to the station'],
        stay: ['尊重她留在当前世界线', 'Respected her choice to remain in the current worldline'],
        'new-name': ['删除旧身份，让她以新名字重新开始', 'Deleted the old identity so she could begin again under a new name'],
        protect: ['先保证了她的安全', 'Protected her safety first'],
        observe: ['保留了继续观测的决定', 'Kept the decision under observation'],
        erase: ['执行了旧系统的删除决定', 'Carried out the old system’s deletion order'],
        hide: ['隐瞒记录并转移了她', 'Hid the record and moved her']
      };
      const outcome = outcomes[event.decision] || ['保留了许澄的决定', 'Preserved Xu Cheng’s decision'];
      return `<section class="app-screen shared-event-screen">${topBar(langText('许澄的选择', 'Xu Cheng’s Choice'), langText('共同事件 · 已记录', 'Shared event · recorded'), 'station')}<div class="event-content"><div class="event-glyph">澄</div><h1>${esc(langText(...outcome))}</h1><p>${esc(langText('这是许澄对自己生活的决定，不是系统或任何关系替她分配的结局。影响已经写入当前分支，也可以从命运档案回溯。', 'This is Xu Cheng’s decision about her own life, not an ending assigned by the system or a relationship. Its effects are written to this branch and can be rewound.'))}</p><div class="event-reason">${esc(event.rationale || langText('你没有留下额外说明。', 'You left no additional explanation.'))}</div><button class="primary-button" type="button" data-action="go" data-route="relationship">${esc(langText('查看关系与知情变化', 'Review relationship and knowledge changes'))}</button></div></section>`;
    }
    const choices = [
      ['return', '陪她回观测站', '公开唯一世界线协议，让所有人承担后果', 'Return with her', 'Publish the Unique Line Protocol and share the consequences'],
      ['stay', '尊重她留下', '她在当前世界线已有生活，不把她带回档案', 'Respect her staying', 'She has a life here; do not reduce her to an archive record'],
      ['new-name', '让旧身份终止', '在她同意下删除旧身份，以新名字重新开始', 'End the old identity', 'With her consent, delete the old identity and begin under a new name']
    ];
    return `<section class="app-screen shared-event-screen">${topBar(langText('许澄的选择', 'Xu Cheng’s Choice'), langText('共同事件 · 唯一世界线协议', 'Shared event · Unique Line Protocol'), 'station')}<div class="event-content"><div class="event-glyph">澄</div><span class="eyebrow">${esc(langText('唯一世界线协议 · 三种合法出口', 'Unique Line Protocol · three lawful exits'))}</span><h1>${esc(langText('“你们讨论了这么久，谁问过我想去哪？”', '“You have discussed this for so long. Who asked where I want to go?”'))}</h1><div class="perspective-stack"><p><strong>${esc(localText(characters.qian.name))}</strong>${esc(langText('：先确认每个出口都不会伤害她，再由她决定。', ': Verify that every exit is safe, then let her decide.'))}</p><p><strong>${esc(localText(characters.shenyao.name))}</strong>${esc(langText('：把协议和风险讲清楚，不把判断藏在保护里。', ': Explain the protocol and risks; do not hide judgement inside protection.'))}</p><p><strong>${esc(localText(characters.lichuan.name))}</strong>${esc(langText('：无论选哪里，都准备一条可以离开的路。', ': Whichever she chooses, keep an exit route ready.'))}</p><p><strong>${esc(localText(characters.zhoutang.name))}</strong>${esc(langText('：先撤销任何人替她永久决定的权限。', ': Revoke anyone’s authority to decide permanently for her.'))}</p><p><strong>${esc(localText(characters.wensheng.name))}</strong>${esc(langText('：名字、记忆与生活都属于她，不属于证据链。', ': Her name, memory, and life belong to her, not to an evidence chain.'))}</p></div><textarea id="event-reason" class="scene-textarea" maxlength="300" placeholder="${esc(langText('自由说明你如何支持她；选项只记录行动意图。', 'Explain how you will support her; options record action intent only.'))}"></textarea><div class="event-choices">${choices.map(([id, zhTitle, zhDesc, enTitle, enDesc]) => `<button type="button" data-action="resolve-event" data-decision="${id}"><strong>${esc(langText(zhTitle, enTitle))}</strong><span>${esc(langText(zhDesc, enDesc))}</span></button>`).join('')}</div></div></section>`;
  }

  function renderCreator() {
    const progress = weaverState();
    const world = state.campaign.worldDraft;
    const npc = state.campaign.npcDraft;
    const mainlineDone = mainlineState().completed;
    const completedThreads = progress.confirmedThreadIds.length;
    if (!progress.workshopUnlocked) {
      const requirements = [
        [mainlineDone, langText('找回并保护许澄', 'Recover and protect Xu Cheng')],
        [completedThreads >= 1, langText('认识身份锚点', 'Understand an identity anchor')],
        [completedThreads >= 2, langText('理解角色愿望', 'Understand character desire')],
        [completedThreads >= 3, langText('修复核心记忆', 'Restore a core memory')],
        [completedThreads >= 4, langText('建立关系边界', 'Establish relationship boundaries')],
        [progress.tutorialWorldCreated, langText('完成稳定世界', 'Complete a stable world')]
      ];
      return `<section class="app-screen creator-screen weaver-workshop-screen">${topBar(langText('EchoLoom · 织界工坊', 'EchoLoom · Weaver Workshop'), langText('观测等级 Lv.8 开放', 'Unlocks at Observer Lv.8'), 'world-hub')}<div class="creator-content"><section class="workshop-lock-card"><div class="workshop-lock-mark">◇</div><span>${esc(langText(`当前观测等级 Lv.${progress.observerLevel}`, `Current observer level Lv.${progress.observerLevel}`))}</span><h1>${esc(langText('在创造一个新的角色之前，先学会理解一个已经存在的人。', 'Before creating a new character, learn to understand someone who already exists.'))}</h1><p>${esc(langText('完成主线《第一根自由的线》，为回声 000 建立身份、愿望、记忆、边界与世界。', 'Complete The First Free Thread and give Echo 000 identity, desire, memory, boundaries, and a world.'))}</p><div class="workshop-requirements">${requirements.map(([done, label]) => `<div class="${done ? 'done' : ''}"><b>${done ? '✓' : '○'}</b><span>${esc(label)}</span></div>`).join('')}</div><button class="primary-button" type="button" data-action="${mainlineDone ? 'open-weaver-mainline' : 'mainline-open'}">${esc(langText('查看解锁任务', 'View unlock task'))}</button></section></div></section>`;
    }
    const nextReset = new Date();
    nextReset.setMonth(nextReset.getMonth() + 1, 1);
    const resetLabel = state.language === 'zh' ? `${nextReset.getMonth() + 1}月1日` : nextReset.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });
    const npcRemaining = Math.max(0, Number(progress.quota.npcLimit) - Number(progress.quota.npcUsed));
    const worldRemaining = Math.max(0, Number(progress.quota.worldLimit) - Number(progress.quota.worldUsed));
    const sourceLines = [
      ['wensheng', langText('闻笙在梦境中发现', 'Found by Wen Sheng in a dream')], ['xucheng', langText('许澄从删除档案中恢复', 'Restored by Xu Cheng from a deleted file')],
      ['lichuan', langText('黎川从废弃世界带回', 'Brought by Li Chuan from an abandoned world')], ['echolink', langText('EchoLink 收到未知消息', 'Received as an unknown EchoLink message')],
      ['personal', langText('在自己的世界中第一次遇见', 'First met in your own world')]
    ];
    const relationOptions = [['first', langText('初次相遇', 'First meeting')], ['forgotten', langText('被遗忘的旧友', 'Forgotten old friend')], ['partner', langText('临时搭档', 'Temporary partner')], ['suspect', langText('互相怀疑的调查对象', 'Mutually suspicious investigators')], ['incomplete', langText('双方记忆都不完整的旧识', 'Old acquaintance with incomplete memories')]];
    const calibrationNotice = progress.quota.lastNoticePeriod !== progress.quota.period
      ? `<section class="workshop-calibration"><img src="assets/brand/echoloom-mark.png" alt=""><div><span>${esc(langText('EchoLink · 许澄', 'EchoLink · Xu Cheng'))}</span><strong>${esc(langText('新一轮稳定窗口已经开启。', 'A new stability window is open.'))}</strong><p>${esc(langText('不必急着创造一个完美的人。先想清楚你们怎样认识、怎样相处，又怎样面对分歧。', 'Do not rush to create a perfect person. Consider how you meet, relate, and face disagreement.'))}</p></div><button type="button" data-action="dismiss-calibration">${esc(langText('知道了', 'Got it'))}</button></section>`
      : '';
    return `<section class="app-screen creator-screen weaver-workshop-screen">${topBar(langText('EchoLoom · 织界工坊', 'EchoLoom · Weaver Workshop'), langText('织界师权限 · 本地离线原型', 'Weaver access · local offline prototype'), 'world-hub')}<div class="creator-content"><section class="workshop-quota"><header><span><small>${esc(langText('月相校准', 'Lunar calibration'))}</small><strong>${esc(langText('本月创生额度', 'Monthly creation capacity'))}</strong></span><b>Lv.8</b></header><div><article><span>${esc(langText('角色创生', 'NPC creation'))}</span><strong>${npcRemaining} / ${progress.quota.npcLimit}</strong></article><article><span>${esc(langText('世界创生', 'World creation'))}</span><strong>${worldRemaining} / ${progress.quota.worldLimit}</strong></article></div><p>${esc(langText(`下次恢复：${resetLabel}。草稿、预览和编辑已有内容不消耗额度；已创建内容不会随月份重置或消失。`, `Next reset: ${resetLabel}. Drafts, previews, and edits are free; existing creations never reset or disappear.`))}</p></section>${calibrationNotice}<section class="creator-guide"><img src="${esc(characters.wensheng.portrait)}" alt=""><div><span>${esc(langText('织界协作者', 'Weaving collaborator'))}</span><strong>${esc(localText(characters.wensheng.name))}</strong><p>${esc(langText('“不用急着创造一个完美的人。先想清楚你们怎样认识、怎样分歧，又怎样尊重彼此。”', '“Do not rush to create a perfect person. First decide how you meet, disagree, and respect one another.”'))}</p></div><button type="button" data-action="creator-contact-wensheng">${esc(langText('联系她', 'Contact her'))}</button></section><section class="creator-card"><span class="eyebrow">${esc(progress.editingNpcId ? langText('编辑已有角色 · 不消耗额度', 'Edit existing character · no quota used') : langText('角色创生', 'NPC creation'))}</span><h2>${esc(langText('一个拥有自己生活的人', 'A person with a life of their own'))}</h2><div class="creator-select-grid"><label>${esc(langText('名字', 'Name'))}<input id="npc-name" maxlength="60" value="${esc(npc.name)}"></label><label>${esc(langText('身份 / 工作', 'Role / work'))}<input id="npc-role" maxlength="90" value="${esc(npc.role)}"></label><label>${esc(langText('性别表达', 'Gender expression'))}<input id="npc-expression" maxlength="60" value="${esc(npc.expression)}"></label><label>${esc(langText('年龄范围', 'Age range'))}<input id="npc-age-range" maxlength="40" value="${esc(npc.ageRange)}"></label></div><label>${esc(langText('形象、服装与说话风格', 'Appearance, clothing, and voice'))}<textarea id="npc-appearance" maxlength="220">${esc([npc.appearance, npc.voice].filter(Boolean).join('；'))}</textarea></label><label>${esc(langText('核心愿望', 'Core desire'))}<textarea id="npc-desire" maxlength="220">${esc(npc.desire)}</textarea></label><label>${esc(langText('性格矛盾', 'Character tension'))}<textarea id="npc-contradiction" maxlength="220">${esc(npc.contradiction)}</textarea></label><label>${esc(langText('核心记忆', 'Core memory'))}<textarea id="npc-memory" maxlength="220">${esc(npc.memory)}</textarea></label><div class="creator-select-grid"><label>${esc(langText('初始关系', 'Initial relationship'))}<select id="npc-initial-relation">${relationOptions.map(([value, label]) => `<option value="${value}" ${npc.initialRelation === value ? 'selected' : ''}>${esc(label)}</option>`).join('')}</select></label><label>${esc(langText('来源线', 'Source thread'))}<select id="npc-source-line">${sourceLines.map(([value, label]) => `<option value="${value}" ${npc.sourceLine === value ? 'selected' : ''}>${esc(label)}</option>`).join('')}</select></label></div><label>${esc(langText('关系边界', 'Relationship boundary'))}<textarea id="npc-boundary" maxlength="220">${esc(npc.boundary)}</textarea></label><button class="primary-button creator-confirm" type="button" data-action="confirm-workshop-npc" ${!progress.editingNpcId && npcRemaining <= 0 ? 'disabled' : ''}>${esc(progress.editingNpcId ? langText('保存角色修改 · 不消耗额度', 'Save character edits · no quota used') : langText('确认角色创生', 'Confirm NPC creation'))}</button></section><section class="creator-card"><span class="eyebrow">${esc(progress.editingWorldId ? langText('编辑已有世界 · 不消耗额度', 'Edit existing world · no quota used') : langText('世界创生', 'World creation'))}</span><h2>${esc(langText('一个有规则、冲突和未来的世界', 'A world with rules, conflict, and a future'))}</h2><div class="creator-select-grid"><label>${esc(langText('世界名称', 'World name'))}<input id="world-name" maxlength="60" value="${esc(world.name)}"></label><label>${esc(langText('世界类型', 'World type'))}<input id="world-type" maxlength="80" value="${esc(world.type)}"></label></div><label>${esc(langText('核心前提', 'Core premise'))}<textarea id="world-premise" maxlength="220">${esc(world.premise)}</textarea></label><label>${esc(langText('不可违反的核心规则', 'Inviolable core rule'))}<textarea id="world-rules" maxlength="220">${esc(world.rules)}</textarea></label><label>${esc(langText('玩家在世界中的身份', 'Player identity in the world'))}<textarea id="world-player-identity" maxlength="180">${esc(world.playerIdentity)}</textarea></label><label>${esc(langText('共同地点', 'Shared place'))}<textarea id="world-shared-place" maxlength="180">${esc(world.sharedPlace)}</textarea></label><label>${esc(langText('故事最初的矛盾', 'Opening conflict'))}<textarea id="world-conflict" maxlength="220">${esc(world.conflict)}</textarea></label><label>${esc(langText('角色连续性模式', 'Character continuity mode'))}<select id="world-identity-mode"><option value="companion" ${world.identityMode === 'companion' ? 'selected' : ''}>${esc(langText('同行模式 · 同一人、保留记忆', 'Companion · same person, keeps memories'))}</option><option value="parallel" ${world.identityMode === 'parallel' ? 'selected' : ''}>${esc(langText('平行投影 · 独立个体', 'Parallel projection · independent person'))}</option><option value="echo" ${world.identityMode === 'echo' ? 'selected' : ''}>${esc(langText('命运回声 · 模糊熟悉感', 'Fate echo · vague familiarity'))}</option></select></label><button class="primary-button creator-confirm" type="button" data-action="confirm-workshop-world" ${!progress.editingWorldId && worldRemaining <= 0 ? 'disabled' : ''}>${esc(progress.editingWorldId ? langText('保存世界修改 · 不消耗额度', 'Save world edits · no quota used') : langText('确认世界创生', 'Confirm world creation'))}</button></section><button class="secondary-button creator-save-draft" type="button" data-action="save-creator">${esc(langText('只保存草稿 · 不消耗额度', 'Save drafts only · no quota used'))}</button>${progress.createdNpcs.length || progress.createdWorlds.length ? `<section class="workshop-library"><span class="eyebrow">${esc(langText('已建立内容 · 永久保留', 'Existing creations · permanently retained'))}</span><h2>${esc(langText('我的角色与世界', 'My characters and worlds'))}</h2><div>${progress.createdNpcs.map((item) => `<article><b>人</b><span><strong>${esc(item.name)}</strong><small>${esc(item.desire || item.role || '')}${item.tutorial ? ` · ${esc(langText('首次教学', 'Tutorial'))}` : ''}</small></span><button type="button" data-action="edit-workshop-npc" data-creation-id="${esc(item.id)}">${esc(langText('编辑', 'Edit'))}</button></article>`).join('')}${progress.createdWorlds.map((item) => `<article><b>界</b><span><strong>${esc(item.name)}</strong><small>${esc(item.rule || item.rules || '')}${item.tutorial ? ` · ${esc(langText('首次教学', 'Tutorial'))}` : ''}</small></span><button type="button" data-action="edit-workshop-world" data-creation-id="${esc(item.id)}">${esc(langText('编辑', 'Edit'))}</button></article>`).join('')}</div></section>` : ''}<p class="prototype-disclaimer">${esc(langText('本离线原型保存本地设定与开场钩子，不声称角色具有意识，也不会把角色设定为必然爱上主控。', 'This offline prototype stores local settings and opening hooks; it does not claim consciousness or guarantee that a character loves the player.'))}</p></div></section>`;
  }

  function renderHome() {
    const character = activeCharacter();
    if (!character) return renderDiscover();
    return `<section class="app-screen home-screen">${statusBar()}<div class="home-hero"><img class="home-hero-bg" src="${esc(character.homeBg)}" alt=""><div class="home-header"><div class="home-name"><h1>${esc(localText(character.name))}</h1><p>${esc(localText(character.role))}</p></div><button class="round-icon-button" type="button" data-action="go" data-route="settings" aria-label="${esc(t('settings'))}">${icon('settings',17)}</button></div><img class="home-character character-full-${esc(character.id)}" src="${esc(character.portrait)}" alt="${esc(localText(character.name))}"><div class="home-status-pill"><strong>${esc(localText(character.homeStatus))}</strong><span>${esc(localText(character.homeSubStatus))}</span></div></div><div class="home-body"><button class="action-card" type="button" data-action="go" data-route="chat"><span class="action-icon">${icon('message',18)}</span><span class="action-copy"><strong>${esc(localText(character.actionTitle))}</strong><span>${esc(localText(character.activeEvent))}</span></span><img class="action-thumb" src="${esc(character.storyBg)}" alt=""></button><button class="action-card" type="button" data-action="go" data-route="relationship"><span class="action-icon">${icon('people',18)}</span><span class="action-copy"><strong>${esc(langText('关系与知情范围', 'Relationship & knowledge'))}</strong><span>${esc(relationshipLabel())} · ${esc(langText('不显示好感分', 'No affection score'))}</span></span><img class="action-thumb brand-thumb" src="assets/brand/echoloom-mark.png" alt=""></button><button class="action-card" type="button" data-action="go" data-route="together"><span class="action-icon">${icon('together',18)}</span><span class="action-copy"><strong>${esc(t('inviteTogether'))}</strong><span>${esc(t('sceneSubheading'))}</span></span><img class="action-thumb" src="${esc(character.homeBg)}" alt=""></button><div class="life-card"><div class="life-card-label"><span>✦</span><span>${esc(t('currentLife'))}</span></div><p>${esc(localText(character.lifeNote))}</p></div><div class="home-chat-entry"><button type="button" data-action="go" data-route="chat">${esc(langText(`跟${localText(character.name)}说点什么…`, `Say something to ${localText(character.name)}…`))}</button><button type="button" class="send-button" data-action="go" data-route="chat" aria-label="${esc(langText('打开聊天', 'Open chat'))}">${icon('send',18)}</button></div></div>${bottomNav('station')}</section>`;
  }

  function renderChat() {
    const character = activeCharacter();
    const journey = activeJourney();
    if (!character || !journey) return renderDiscover();
    const quickPrompts = [
      langText('问问今天的工作或旅程', 'Ask about today’s work or journey'),
      langText('继续讨论上次的分歧', 'Continue the previous disagreement'),
      langText('告诉对方我今天很累，只想被听见', 'Say I am tired and only want to be heard')
    ];
    return `<section class="app-screen chat-screen">${topBar(langText(`和${localText(character.name)}的对话`, `Chat with ${localText(character.name)}`), localText(character.relation), 'home')}<div class="chat-body" id="chat-body"><div class="chat-day-label">${langText('今天 · 独立关系时间线已同步', 'Today · independent relationship timeline active')}</div>${journey.chatMessages.map(chatMessage).join('')}${isTyping ? typingMarkup() : ''}</div><div class="quick-prompts">${quickPrompts.map((prompt) => `<button class="quick-prompt" type="button" data-action="chat-quick" data-text="${esc(prompt)}">${esc(prompt)}</button>`).join('')}</div><div class="chat-composer"><input id="chat-input" class="chat-input" type="text" maxlength="300" placeholder="${esc(langText(`跟${localText(character.name)}说点什么…`, `Say something to ${localText(character.name)}…`))}"><button type="button" class="send-button" data-action="chat-send" aria-label="${esc(t('send'))}" ${isTyping ? 'disabled' : ''}>${icon('send',18)}</button></div></section>`;
  }

  function chatMessage(message) {
    if (message.role === 'user') return `<div class="chat-message-row user"><div class="chat-bubble">${esc(localText(message.text))}</div></div>`;
    const character = activeCharacter();
    return `<div class="chat-message-row character"><div class="chat-mini-avatar"><img src="${esc(characterAvatar(character))}" alt=""></div><div class="chat-bubble">${esc(localText(message.text))}${message.memoryRef ? `<div class="chat-memory-ref">${icon('memory',10)}<span>${esc(t('mentionMemory'))}</span></div>` : ''}<div class="message-actions"><button class="message-action" type="button" data-action="save-message-memory" data-message-id="${esc(message.id)}">${esc(t('saveEcho'))}</button></div></div></div>`;
  }

  function renderThreads() {
    const character = activeCharacter();
    const journey = activeJourney();
    if (!character || !journey) return renderStation();
    const activeBranch = state.campaign.activeBranchId || 'root';
    return `<section class="app-screen threads-screen">${topBar(langText('命运档案', 'Fate Archive'), langText('当前时间线不会被静默删除', 'The current timeline is never silently deleted'), 'station')}<div class="threads-content"><section class="archive-tree"><div class="section-label"><h2>${esc(langText('分支树', 'Branch tree'))}</h2><span>${state.archives.length + 1} / 7</span></div><article class="archive-node root ${activeBranch === 'root' ? 'active' : ''}"><span class="node-dot"></span><div><strong>${esc(langText('原始时间线', 'Original timeline'))}</strong><small>${esc(langText('17 秒断电后的初始记录', 'Initial record after the 17-second outage'))}</small></div><b>${activeBranch === 'root' ? esc(langText('当前', 'Current')) : '00'}</b></article>${state.archives.map((archive, index) => renderArchiveNode(archive, index)).join('')}<button class="secondary-button archive-save" type="button" data-action="create-archive" ${state.archives.length >= 6 ? 'disabled' : ''}>${icon('plus',13)} ${esc(langText('保存当前分支节点', 'Save current branch node'))}</button><p class="archive-note">${esc(langText('档案回溯会先保存当前状态，再恢复目标节点。其他分支不会共享好感、记忆或 NPC 状态。', 'Archive rewind saves the current state before restoring a target. Affection, memories, and NPC state do not accumulate across branches.'))}</p></section><div class="section-label"><h2>${esc(t('officialStory'))}</h2><span>${journey.onboardingComplete ? esc(t('chapterComplete')) : esc(t('chapterInProgress'))}</span></div><button class="thread-card" type="button" data-action="go" data-route="story"><img class="thread-card-bg" src="${esc(character.storyBg)}" alt=""><div class="thread-card-content"><span class="overline">${esc(localText(character.stationArea))}</span><h3>${esc(localText(character.chapterTitle))}</h3><p>${esc(localText(character.chapterSubtitle))}</p><span class="thread-card-status">${journey.onboardingComplete ? '✓' : '•'} ${journey.onboardingComplete ? esc(t('chapterComplete')) : esc(t('resume'))}</span></div></button><div class="section-label"><h2>${esc(t('userScenes'))}</h2><span>${journey.generatedScenes.length}</span></div>${journey.generatedScenes.length ? journey.generatedScenes.map(generatedThread).join('') : `<div class="empty-state">${esc(t('noScenes'))}</div>`}</div>${bottomNav('threads')}</section>`;
  }

  function renderArchiveNode(archive, index) {
    const active = state.campaign.activeBranchId === archive.id;
    return `<article class="archive-node ${active ? 'active' : ''}"><span class="node-line"></span><span class="node-dot"></span><div><strong>${esc(archive.label)}${active ? ` · ${esc(langText('当前分支', 'current branch'))}` : ''}</strong><small>${esc(archive.summary)}</small></div><span class="archive-actions"><button type="button" data-action="restore-archive" data-archive-id="${esc(archive.id)}">${esc(active ? langText('回到节点', 'Restore point') : langText('回溯', 'Rewind'))}</button>${active ? '' : `<button type="button" data-action="delete-archive" data-archive-id="${esc(archive.id)}" aria-label="${esc(langText('删除分支', 'Delete branch'))}">×</button>`}</span></article>`;
  }

  function generatedThread(scene) {
    const timeline = scene.timeline === 'main' ? langText('主时间线', 'Main timeline') : scene.timeline === 'extra' ? langText('番外', 'Extra') : langText('草稿', 'Draft');
    return `<button class="generated-thread" type="button" data-action="open-generated-scene" data-scene-id="${esc(scene.id)}"><img src="${esc(scene.image)}" alt=""><span><strong>${esc(scene.title)}</strong><span>${esc(scene.sceneName)} · ${esc(timeline)}</span></span><span class="arrow">›</span></button>`;
  }

  function renderTogether() {
    const character = activeCharacter();
    const journey = activeJourney();
    if (!character || !journey) return renderDiscover();
    const selected = scenes.find((scene) => scene.id === journey.selectedSceneId) || scenes[0];
    return `<section class="app-screen together-screen"><div class="together-hero"><img class="together-hero-bg" src="${esc(selected.image)}" alt=""><button class="round-icon-button together-back" type="button" data-action="go" data-route="home" aria-label="${esc(langText('返回主页', 'Back to home'))}">${icon('back',18)}</button><div class="together-header"><h1>${esc(t('sceneHeading'))}</h1><p>${esc(langText(`和${localText(character.name)}共同经历一件事，但不预设关系结果。`, `Share an experience with ${localText(character.name)} without assuming where the relationship leads.`))}</p></div></div><div class="together-body"><div class="scene-input-card"><textarea id="scene-prompt" class="scene-textarea" maxlength="400" placeholder="${esc(localText(character.scenePlaceholder))}">${esc(journey.scenePrompt || '')}</textarea><div class="scene-note"><span>✦</span><span>${esc(t('aiSceneNote'))}</span></div><div class="scene-carousel-label">${esc(t('sceneInspiration'))}</div><div class="scene-carousel">${scenes.map((scene) => scenePreset(scene, selected.id)).join('')}</div><button type="button" class="primary-button sage generate-button" data-action="generate-scene">${esc(t('generateScene'))} ✦</button></div>${journey.scenePreview ? renderScenePreview(journey.scenePreview) : ''}</div>${isGenerating ? `<div class="loading-overlay"><div class="weaving-loader"><div class="loader-mark"></div><p>${esc(t('generating'))}</p></div></div>` : ''}${bottomNav('together')}</section>`;
  }

  function scenePreset(scene, selectedId) {
    return `<button type="button" class="scene-preset ${scene.id === selectedId ? 'selected' : ''}" data-action="select-scene" data-scene-id="${scene.id}"><img src="${esc(scene.image)}" alt=""><span>${esc(t(scene.titleKey))}</span></button>`;
  }

  function renderScenePreview(preview) {
    return `<div class="scene-preview-card"><div class="scene-preview-image"><img src="${esc(preview.image)}" alt=""><h3>${esc(preview.title)}</h3></div><div class="scene-preview-copy"><p><strong>${esc(t('generatedPreviewPrefix'))}</strong> ${esc(preview.summary)}</p><div class="button-row"><button type="button" class="secondary-button" data-action="adjust-scene">${esc(t('adjustScene'))}</button><button type="button" class="primary-button slate" data-action="start-generated-scene">${esc(t('startScene'))}</button></div></div></div>`;
  }

  function getActiveScene() {
    const journey = activeJourney();
    if (!journey) return null;
    if (!journey.activeGeneratedSceneId) return journey.scenePreview;
    return journey.generatedScenes.find((scene) => scene.id === journey.activeGeneratedSceneId) || (journey.scenePreview?.id === journey.activeGeneratedSceneId ? journey.scenePreview : null);
  }

  function renderGeneratedStory() {
    const scene = getActiveScene();
    if (!scene) return renderTogether();
    const messages = scene.messages || [];
    const conversation = chronologicalStoryView(messages, { role: 'character', text: scene.firstLine });
    return `<section class="app-screen story-screen generated-story-screen">${statusBar()}<div class="story-scene"><img class="scene-full-bg" src="${esc(scene.image)}" alt=""><div class="story-top-actions"><button class="round-icon-button" type="button" data-action="go" data-route="together" aria-label="${esc(langText('返回场景生成', 'Back to scene generator'))}">${icon('back',18)}</button><button class="round-icon-button" type="button" data-action="go" data-route="echoes" aria-label="${esc(t('echoes'))}">${icon('memory',17)}</button></div><div class="story-header"><span class="chapter">${esc(scene.sceneName)}</span><h1>${esc(scene.title)}</h1><p>${esc(scene.opening)}</p></div>${conversation.spotlight ? `<div class="story-dialogue-wrap">${dialogueCard(conversation.spotlight)}</div>` : ''}</div><div class="story-interaction"><div class="story-history" id="story-history">${conversation.history.map(storyHistoryMessage).join('')}${isTyping ? typingMarkup() : ''}</div><div class="story-input-row"><input id="generated-story-input" class="story-input" type="text" maxlength="260" placeholder="${esc(t('whatSay'))}"><button type="button" class="send-button" data-action="generated-story-send" aria-label="${esc(t('send'))}" ${isTyping ? 'disabled' : ''}>${icon('send',18)}</button></div><div class="scene-save-bar"><button class="secondary-button" type="button" data-action="save-scene" data-timeline="extra">${esc(t('saveExtra'))}</button><button class="primary-button sage" type="button" data-action="save-scene" data-timeline="main">${esc(t('saveMainline'))}</button></div></div></section>`;
  }

  function renderEchoes() {
    const character = activeCharacter();
    const journey = activeJourney();
    if (!character || !journey) return renderDiscover();
    const groups = [['pinned', 'pinnedEchoes'], ['aboutUser', 'remembersAboutYou'], ['unresolved', 'unresolved']];
    return `<section class="app-screen echoes-screen">${topBar(t('echoes'), langText(`与${localText(character.name)}的共同时间线`, `Shared timeline with ${localText(character.name)}`), 'home')}<div class="echoes-content">${groups.map(([section, titleKey]) => renderEchoSection(section, titleKey)).join('')}<div class="echoes-footer"><button class="secondary-button" type="button" data-action="add-memory">${icon('plus',13)} ${esc(t('addEcho'))}</button><button class="primary-button" type="button" data-action="export">${icon('download',13)} ${esc(t('export'))}</button></div></div>${bottomNav('echoes')}</section>`;
  }

  function renderEchoSection(section, titleKey) {
    const items = (activeJourney()?.memories || []).filter((memory) => memory.section === section || (section === 'pinned' && memory.pinned));
    const unique = [...new Map(items.map((item) => [item.id, item])).values()];
    return `<section class="echo-section"><div class="echo-section-title"><h2>${esc(t(titleKey))}</h2><span class="echo-count">${unique.length}</span></div>${unique.map(echoCard).join('')}</section>`;
  }

  function echoCard(memory) {
    const text = localText(memory.text ?? (memory.textKey ? t(memory.textKey) : ''));
    const source = localText(memory.source || '');
    const typeLabels = { event: ['事件记忆', 'Event'], fact: ['事实记忆', 'Fact'], relationshipJudgement: ['关系判断', 'Relationship judgement'], promiseBoundary: ['承诺与边界', 'Promise & boundary'], reflection: ['反思记忆', 'Reflection'] };
    const editable = ['fact', 'event', 'promiseBoundary'].includes(memory.type);
    const typeLabel = langText(...(typeLabels[memory.type] || typeLabels.fact));
    return `<article class="echo-card ${memory.pinned ? 'pinned' : ''}"><div class="echo-meta"><span>${esc(typeLabel)}</span><span>${esc(memory.worldId || 'station')} · ${esc(memory.branchId || 'root')} · ${esc(memory.confidence || 'medium')}</span></div><div class="echo-card-row"><div><strong>${esc(text)}</strong><small>${esc(source)} · ${esc(memory.permanent ? t('memoryPermanent') : t('memoryTemporary'))}</small></div><div class="echo-actions"><button class="echo-action pin-mark" type="button" data-action="toggle-pin-memory" data-memory-id="${esc(memory.id)}" title="${esc(memory.pinned ? t('unpin') : t('pin'))}">${icon('pin',14)}</button>${editable ? `<button class="echo-action" type="button" data-action="edit-memory" data-memory-id="${esc(memory.id)}" title="${esc(t('edit'))}">${icon('edit',14)}</button>` : ''}<button class="echo-action" type="button" data-action="delete-memory" data-memory-id="${esc(memory.id)}" title="${esc(t('delete'))}">${icon('trash',14)}</button></div></div>${!editable ? `<p class="memory-lock-note">${esc(langText('这是角色的关系判断或反思，不可直接改写。', 'This is a character judgement or reflection and cannot be directly rewritten.'))}</p>` : ''}</article>`;
  }

  function renderSettings() {
    const backRoute = state.resumeScreen && state.resumeScreen !== 'settings' ? state.resumeScreen : (state.onboardingCompleted ? 'observatory-home' : 'title');
    const known = characterIds.filter((id) => state.journeys?.[id]?.met).map((id) => localText(characters[id].name)).join(' · ');
    return `<section class="app-screen settings-screen">${topBar(t('settings'), '', backRoute, 'none')}<div class="settings-content"><section class="settings-section"><h2>${esc(t('language'))}</h2><div class="setting-row"><div class="setting-copy"><strong>${esc(t('language'))}</strong><span>English / 中文</span></div><select id="language-select"><option value="zh" ${state.language === 'zh' ? 'selected' : ''}>中文</option><option value="en" ${state.language === 'en' ? 'selected' : ''}>English</option></select></div></section><section class="settings-section"><h2>${esc(t('notificationFrequency'))}</h2><div class="setting-row"><div class="setting-copy"><strong>${esc(t('notificationFrequency'))}</strong><span>${esc(t(state.settings.frequency))}</span></div><select id="frequency-select"><option value="gentle" ${state.settings.frequency === 'gentle' ? 'selected' : ''}>${esc(t('gentle'))}</option><option value="normal" ${state.settings.frequency === 'normal' ? 'selected' : ''}>${esc(t('normal'))}</option><option value="quiet" ${state.settings.frequency === 'quiet' ? 'selected' : ''}>${esc(t('quiet'))}</option></select></div><div class="setting-row"><div class="setting-copy"><strong>${esc(t('reduceMotion'))}</strong><span>${esc(langText('减少页面切换与装饰动画。', 'Use fewer transitions and animations.'))}</span></div><button class="toggle ${state.settings.reduceMotion ? 'on' : ''}" type="button" data-action="toggle-motion" aria-pressed="${state.settings.reduceMotion}"><span></span></button></div></section><section class="settings-section"><h2>${esc(langText('故事流程', 'Story flow'))}</h2><div class="data-note">${esc(known ? langText(`当前已认识：${known}`, `Currently known: ${known}`) : langText('尚未完成首次相遇。', 'The first encounter is not complete.'))}</div><button class="secondary-button settings-button" type="button" data-action="restart-onboarding">${esc(langText('重新开始新手剧情', 'Restart onboarding'))}</button><button class="secondary-button settings-button" type="button" data-action="return-title">${esc(langText('返回标题页', 'Return to title'))}</button></section><section class="settings-section"><h2>${esc(langText('关系与分支数据', 'Relationship and branch data'))}</h2><div class="data-note">${esc(t('dataLocal'))}</div><button class="secondary-button settings-button" type="button" data-action="export">${icon('download',14)} ${esc(t('export'))}</button><label class="secondary-button settings-button" for="import-file" style="display:flex;align-items:center;justify-content:center;gap:6px;cursor:pointer">${icon('upload',14)} ${esc(t('import'))}</label><button class="settings-button danger" type="button" data-action="clear-archive">${esc(langText('清除分支档案', 'Clear branch archive'))}</button><button class="settings-button danger" type="button" data-action="reset">${esc(t('reset'))}</button>${state.legacyArchive ? `<p class="legacy-note">${esc(t('archivedLegacy'))}</p>` : ''}</section></div></section>`;
  }

  function renderBrandSplash() {
    return `<section class="app-screen brand-splash" data-action="skip-splash" aria-label="${esc(langText('进入 EchoLoom', 'Enter EchoLoom'))}"><div class="brand-aura" aria-hidden="true"></div><div class="brand-signature"><span class="brand-mark-shell"><img src="assets/brand/echoloom-mark.png" alt=""></span><strong>EchoLoom</strong><small>STORIES WEAVE. COMPANIONS STAY.</small><i>${esc(langText('故事交织，陪伴长存。', 'Stories weave, companions stay.'))}</i></div><span class="brand-skip-hint">${esc(langText('轻触屏幕 · 进入观测', 'Tap to enter observation'))}</span></section>`;
  }

  function renderTitle() {
    const canContinue = state.onboardingStarted && state.resumeScreen && state.resumeScreen !== 'title';
    const startLabel = state.onboardingStarted ? langText('重新进入观测', 'Begin a new observation') : langText('开始观测', 'Begin observation');
    const startHint = state.onboardingStarted ? langText('继续你的故事', 'Continue your story') : langText('开启你的故事', 'Begin your story');
    return `<section class="app-screen title-screen-new"><img class="title-bg" src="assets/backgrounds/title-observatory-courtyard.png" alt=""><div class="title-shade"></div>${statusBar()}<div class="title-content"><div class="title-brand"><span class="title-orbit-mark" aria-hidden="true"><i></i><b></b></span><h1>EchoLoom</h1><small>STORIES WEAVE. COMPANIONS STAY.</small></div><div class="title-welcome"><span class="title-divider" aria-hidden="true"><i></i></span><p>${esc(langText('故事交织，陪伴长存。', 'Stories weave. Companions stay.'))}</p><small>${esc(langText('欢迎来到命运观测站', 'Welcome to the Fate Observatory'))}</small></div><div class="title-actions"><button class="primary-button title-primary" type="button" data-action="start-onboarding"><span class="title-action-star" aria-hidden="true">✦</span><span class="title-button-copy"><strong>${esc(startLabel)}</strong><small>${esc(startHint)}</small></span><span class="title-action-star" aria-hidden="true">✦</span></button>${canContinue ? `<button class="secondary-button title-continue" type="button" data-action="continue-onboarding"><span class="title-button-copy"><strong>${esc(langText('继续当前记录', 'Continue current record'))}</strong><small>${esc(screenLabel(state.resumeScreen))}</small></span></button>` : ''}<div class="title-secondary-actions"><button class="title-menu-button" type="button" data-action="go" data-route="archive-branches"><span class="title-menu-icon">${icon('echoes',24)}</span><span><strong>${esc(langText('命运档案', 'Fate Archive'))}</strong><small>${esc(langText('查看历史记录', 'View saved history'))}</small></span></button><button class="title-menu-button" type="button" data-action="go" data-route="settings"><span class="title-menu-icon">${icon('settings',24)}</span><span><strong>${esc(t('settings'))}</strong><small>${esc(langText('个性化设置', 'Personalize'))}</small></span></button></div></div></div><span class="title-version">FATE OBSERVATORY · 00:17</span></section>`;
  }

  function screenLabel(screen) {
    const labels = {
      prologue: ['17 秒序章', '17-second prologue'], 'player-name': ['身份登记', 'Identity record'], 'signal-scan': ['五处信号', 'Five signals'],
      'signal-detail': ['信号详情', 'Signal detail'], 'signal-confirm': ['优先响应', 'Priority response'], 'first-rescue': ['首次救援', 'First rescue'],
      'event-result': ['事件结果', 'Event result'], 'echolink-activation': ['终端激活', 'Terminal activation'], 'first-contact': ['首次联系', 'First contact'],
      'observatory-home': ['命运观测站', 'Fate Observatory']
    };
    return langText(...(labels[screen] || ['当前记录', 'Current record']));
  }

  function vnControls() {
    return `<div class="vn-controls"><button type="button" data-action="prologue-auto" class="${prologueAuto ? 'active' : ''}">Auto</button><button type="button" data-action="prologue-log">Log</button><button type="button" data-action="prologue-skip">Skip</button></div>`;
  }

  function prologueSpeaker(speaker) {
    const labels = {
      system: ['观测站系统', 'Observatory system'],
      narrator: ['旁白', 'Narrator'],
      xucheng: ['许澄', 'Xu Cheng'],
      player: [state.playerName || '你', state.playerName || 'You'],
      unknown: ['未知联系人', 'Unknown contact'],
      echolink: ['EchoLink', 'EchoLink']
    };
    return labels[speaker] ? langText(...labels[speaker]) : String(speaker || langText('事件记录', 'Event record'));
  }

  function prologueEntryText(entry) {
    if (!entry) return '';
    const response = entry.responses?.[state.prologueChoice]
      || entry.text
      || Object.values(entry.responses || {})[0];
    return localText(response);
  }

  function prologueClock(beat) {
    if (beat < 9) return '09:41';
    if (beat === 9) return '00:01';
    if (beat === 10) return '00:08';
    return '00:17';
  }

  function renderPrologue() {
    const beat = Math.max(0, Math.min(onboardingContent.prologue.length, Number(state.prologueBeat || 0)));
    const choosing = beat === Number(onboardingContent.prologueChoiceBeat) && !state.prologueChoice;
    const ending = beat >= onboardingContent.prologue.length;
    const entry = onboardingContent.prologue[Math.min(beat, onboardingContent.prologue.length - 1)];
    const dark = beat >= 9 && beat <= 11;
    const background = entry?.background || 'assets/backgrounds/observatory.svg';
    const choicePanel = `<div class="prologue-choice-panel"><span class="eyebrow">${esc(langText('入职第一天 · 09:41', 'First day · 09:41'))}</span><h1>${esc(langText('你怎么回应许澄？', 'How do you respond to Xu Cheng?'))}</h1><div class="prologue-intents">${onboardingContent.prologueChoices.map((choice) => `<button type="button" data-action="choose-prologue" data-choice-id="${choice.id}"><strong>${esc(localText(choice.label))}</strong><small>${esc(localText(choice.hint))}</small></button>`).join('')}</div></div>`;
    const revealPanel = `<div class="prologue-choice-panel prologue-reveal-panel"><span class="eyebrow">${esc(langText('异常记录 · 37 天后', 'Anomaly record · 37 days later'))}</span><div class="xucheng-card-remnant" aria-hidden="true"><span>XC</span><i></i><b>NO RECORD</b></div><h1>${esc(langText('“你还记得我吗？”', '“Do you still remember me?”'))}</h1><p>${esc(langText('照片还在，名字消失；五处信号保存着同一场校正留下的不同证据。', 'The photo remains, the name is gone; five signals preserve different evidence left by the same correction.'))}</p><button class="primary-button" type="button" data-action="open-signals">${esc(langText('查看五处信号', 'View five signals'))}</button></div>`;
    return `<section class="app-screen prologue-screen ${dark ? 'outage' : ''}"><img class="vn-background" src="${esc(background)}" alt=""><div class="vn-filter"></div>${statusBar()}${vnControls()}<div class="prologue-counter">${prologueClock(beat)}</div>${ending ? revealPanel : choosing ? choicePanel : `<button class="vn-dialogue" type="button" data-action="prologue-next"><span>${esc(prologueSpeaker(entry.speaker))}</span><p>${esc(prologueEntryText(entry))}</p><i>›</i></button>`}</section>`;
  }

  function renderPlayerName() {
    const backLabel = langText('返回上一段', 'Return to the previous scene');
    return `<section class="app-screen player-name-screen">${statusBar()}<div class="identity-orbit" aria-hidden="true"><span></span><span></span><span></span></div><div class="identity-card"><span class="eyebrow">${esc(langText('见习登记 · 09:41', 'Trainee registration · 09:41'))}</span><h1>${esc(langText('在校正开始前，写下你的名字', 'Write your name before correction begins'))}</h1><p>${esc(langText('这是普通的入职登记，不是角色替你取的称呼。身份写入完成前，你仍可以修改。', 'This is an ordinary trainee record, not a name assigned by a character. You can still change it before identity binding completes.'))}</p><label for="player-name-input">${esc(langText('见习观察员姓名', 'Trainee observer name'))}</label><input id="player-name-input" maxlength="24" value="${esc(state.playerName || '')}" placeholder="${esc(langText('输入名字', 'Enter a name'))}"><div class="identity-actions"><button class="primary-button" type="button" data-action="save-player-name">${esc(langText('写入身份', 'Bind identity'))}</button><button class="identity-back-button" type="button" data-action="go" data-route="prologue" aria-label="${esc(backLabel)}" title="${esc(backLabel)}">${icon('back',18)}</button></div></div></section>`;
  }

  function renderSignalScan() {
    return `<section class="app-screen signal-scan-screen">${statusBar()}<header class="signal-header"><span class="eyebrow">${esc(langText('校正完成 · 00:17', 'Correction complete · 00:17'))}</span><div class="signal-heading-row"><h1>${esc(langText('五处证据正在失去联系', 'Five pieces of evidence are losing contact'))}</h1><span class="signal-count"><b>05</b>${esc(langText('处在线', ' online'))}</span></div><p>${esc(langText('它们来自同一场校正。优先响应只决定你先见到谁、先取得哪种证据。', 'They come from the same correction. Priority response only decides whom you meet and which evidence you reach first.'))}</p></header><div class="signal-roster" aria-label="${esc(langText('五处异常信号', 'Five anomaly signals'))}">${characterIds.map((id, index) => { const character = characters[id]; const rescue = onboardingContent.rescues[id]; return `<button class="signal-roster-card signal-roster-card-${index + 1}" type="button" data-action="inspect-signal" data-character-id="${id}"><span class="signal-card-index"><i></i>0${index + 1}</span><img src="${esc(character.cardPortrait || characterAvatar(character))}" alt="${esc(localText(character.name))}"><span class="signal-card-copy"><strong>${esc(localText(character.name))}</strong><small>${esc(localText(character.role))}</small><em>${esc(localText(rescue.location))}</em></span><b aria-hidden="true">›</b></button>`; }).join('')}</div><div class="scan-footnote"><span>PRIORITY SIGNAL</span><i></i><span>${esc(langText('先取得一种证据，不会关闭其他四条关系线', 'One first clue closes no other relationship line'))}</span></div></section>`;
  }

  function renderSignalDetail() {
    const id = state.selectedNpcId;
    const character = characters[id];
    const rescue = onboardingContent.rescues[id];
    if (!character || !rescue) return renderSignalScan();
    return `<section class="app-screen signal-detail-screen"><img class="signal-detail-bg" src="${esc(character.discoveryBg)}" alt=""><div class="signal-detail-shade"></div>${statusBar()}<button class="round-icon-button signal-detail-back" type="button" data-action="go" data-route="signal-scan" aria-label="Back">${icon('back',18)}</button><img class="signal-detail-portrait" src="${esc(character.portrait)}" alt="${esc(localText(character.name))}"><div class="signal-detail-sheet"><span class="signal-live"><i></i>${esc(langText('求救信号持续中', 'Distress signal active'))}</span><h1>${esc(localText(character.name))}</h1><p class="signal-role">${esc(localText(character.role))} · ${esc(localText(rescue.location))}</p><div class="signal-crisis"><span>${esc(langText('当前危机', 'Current crisis'))}</span><p>${esc(localText(rescue.crisis))}</p></div><blockquote>${esc(localText(rescue.quote))}</blockquote><button class="primary-button" type="button" data-action="confirm-signal">${esc(langText('将此处设为优先响应', 'Set as priority response'))}</button></div></section>`;
  }

  function renderSignalConfirm() {
    const character = characters[state.selectedNpcId];
    const rescue = onboardingContent.rescues[state.selectedNpcId];
    if (!character || !rescue) return renderSignalScan();
    return `<section class="app-screen signal-confirm-screen">${statusBar()}<div class="confirm-rings" aria-hidden="true"></div><div class="confirm-card"><div class="confirm-identity"><img src="${esc(characterAvatar(character))}" alt="${esc(localText(character.name))}"><div><span class="eyebrow">PRIORITY SIGNAL</span><h1>${esc(langText(`优先响应：${localText(character.name)}`, `Priority response: ${localText(character.name)}`))}</h1></div></div><p class="confirm-crisis">${esc(localText(rescue.crisis))}</p><div class="confirm-note">${esc(langText('你会先通过这个人取得许澄存在过的一类证据。这不是恋爱对象选择，其他四条关系线仍然开放。', 'You will first reach one kind of evidence that Xu Cheng existed through this person. This is not a romance selection; the other four relationship lines remain open.'))}</div><div class="confirm-actions"><button class="primary-button" type="button" data-action="begin-rescue">${esc(langText('确认并进入现场', 'Confirm and enter'))}</button><button class="secondary-button" type="button" data-action="go" data-route="signal-scan">${esc(langText('重新选择', 'Choose again'))}</button></div></div></section>`;
  }

  function renderFirstRescue() {
    const id = state.selectedNpcId;
    const character = characters[id];
    const rescue = onboardingContent.rescues[id];
    if (!character || !rescue) return renderSignalScan();
    const beat = Math.max(0, Number(state.rescueBeat || 0));
    const entry = rescue.opening[Math.min(beat, rescue.opening.length - 1)];
    const choosing = beat >= rescue.opening.length;
    return `<section class="app-screen first-rescue-screen"><img class="vn-background" src="${esc(character.storyBg)}" alt=""><div class="rescue-gradient"></div>${statusBar()}<div class="rescue-top"><button type="button" data-action="rescue-log">Log</button><span>${esc(localText(rescue.location))}</span><b>00:17</b></div><img class="rescue-character-art" src="${esc(character.portrait)}" alt="${esc(localText(character.name))}">${choosing ? `<div class="rescue-choice-sheet"><span>${esc(langText('必须作出决定', 'A decision is required'))}</span><h1>${esc(langText('你准备如何协助？', 'How will you help?'))}</h1>${rescue.choices.map((choice, index) => `<button type="button" data-action="choose-rescue" data-choice-id="${choice.id}"><b>0${index + 1}</b><span>${esc(localText(choice.label))}</span><i>›</i></button>`).join('')}<small>${esc(langText('选择会影响多人如何理解你，但不会制造自动亲密。', 'The choice affects how several people understand you, without creating automatic intimacy.'))}</small></div>` : `<button class="vn-dialogue rescue-dialogue" type="button" data-action="rescue-next"><span>${esc(entry.speaker)}</span><p>${esc(localText(entry.text))}</p><i>›</i></button>`}</section>`;
  }

  function resultTrend(delta = {}) {
    const positives = [];
    if (Number(delta.trust || 0) > 0) positives.push(langText('更愿意相信你的判断', 'more willing to trust your judgement'));
    if (Number(delta.safety || 0) > 0) positives.push(langText('感到边界被尊重', 'felt their boundaries were respected'));
    if (Number(delta.reciprocity || 0) > 0) positives.push(langText('看见了共同承担的可能', 'saw the possibility of shared responsibility'));
    if (Number(delta.compatibility || 0) > 0) positives.push(langText('发现合作方式较为契合', 'found your working styles compatible'));
    if (Number(delta.familiarity || 0) > 0) positives.push(langText('对你多了一点具体认识', 'formed a more specific impression of you'));
    if (Number(delta.strain || 0) > 0) positives.push(langText('仍保留一项未解决的分歧', 'retained an unresolved concern'));
    return positives.slice(0, 2).join(langText('，也', ' and ')) || langText('暂时保留判断', 'withheld judgement for now');
  }

  function renderEventResult() {
    const result = state.resultData;
    const character = characters[state.selectedNpcId];
    const rescue = onboardingContent.rescues[state.selectedNpcId];
    if (!result || !character || !rescue) return renderSignalScan();
    return `<section class="app-screen event-result-screen">${statusBar()}<div class="result-hero"><img src="${esc(character.discoveryBg)}" alt=""><div></div><span>${esc(langText('证据已保全', 'Evidence preserved'))}</span><h1>${esc(langText('许澄仍无法被系统证明', 'The system still cannot prove Xu Cheng existed'))}</h1></div><div class="result-content"><section class="world-result"><span>${esc(langText('现场结果', 'Scene result'))}</span><p>${esc(localText(result.result))}</p></section><section><h2>${esc(langText('三人的第一印象', 'Three first impressions'))}</h2><div class="impression-list">${result.knownIds.map((id) => `<article><img src="${esc(characterAvatar(id))}" alt=""><div><strong>${esc(localText(characters[id].name))}</strong><p>${esc(`${localText(characters[id].name)}${langText('：', ': ')}${resultTrend(result.deltas[id])}`)}</p></div></article>`).join('')}</div></section><section class="result-clue"><span>${esc(langText('许澄的证据', 'Evidence of Xu Cheng'))} · ${esc(localText(rescue.clue.source))}</span><p>${esc(localText(rescue.clue.text))}</p></section><section class="new-contact-card"><span>EchoLink</span><strong>${esc(langText(`已取得 ${localText(character.name)} 的联系许可`, `Contact permission granted by ${localText(character.name)}`))}</strong><small>${esc(langText('许可来自共同事件，不代表私人亲密。', 'Permission comes from the shared event, not private intimacy.'))}</small></section><button class="primary-button" type="button" data-action="continue-activation">${esc(langText('启动回声终端', 'Activate EchoLink'))}</button></div></section>`;
  }

  function renderEchoActivation() {
    const character = characters[state.selectedNpcId];
    return `<section class="app-screen echo-activation-screen">${statusBar()}<div class="activation-field"><div class="activation-orbit a"></div><div class="activation-orbit b"></div><img src="assets/brand/echoloom-mark.png" alt="EchoLoom"><span class="activation-link"></span><img src="${esc(characterAvatar(character))}" alt="${esc(localText(character.name))}"></div><div class="activation-copy"><span class="eyebrow">ECHOLINK / 01</span><h1>${esc(langText('联系不是占有', 'Contact is not possession'))}</h1><p>${esc(langText('终端只保存对方同意开放的通道。回应可以延迟，沉默不会被解释成惩罚，关系也不会由单一分数定义。', 'The terminal stores only channels the other person permits. Replies may be delayed, silence is not punishment, and no single score defines a relationship.'))}</p><ul><li>${esc(langText('异步联系', 'Asynchronous contact'))}</li><li>${esc(langText('可追溯共同记忆', 'Source-linked shared memory'))}</li><li>${esc(langText('独立世界线分支', 'Independent worldline branches'))}</li></ul><button class="primary-button" type="button" data-action="open-first-contact">${esc(langText('完成配对', 'Complete pairing'))}</button></div></section>`;
  }

  function renderFirstContact() {
    const id = state.selectedNpcId;
    const character = characters[id];
    if (!character) return renderSignalScan();
    const initial = onboardingContent.firstMessages[id];
    const messages = state.firstContactMessages?.length ? state.firstContactMessages : initial;
    return `<section class="app-screen first-contact-screen">${statusBar()}<header class="first-contact-header"><img src="${esc(characterAvatar(character))}" alt=""><div><strong>${esc(localText(character.name))}</strong><span>${esc(langText('首次联系 · 新建立的通道', 'First contact · newly established channel'))}</span></div></header><div class="first-contact-context">${esc(langText('这是你第一次可以自由输入。建议项只表达意图，不会替你说完整的话。', 'This is the first free-text moment. Suggestions express intent and will not speak a full line for you.'))}</div><div class="first-contact-thread" id="first-contact-thread">${messages.map((message) => `<div class="contact-bubble ${message.sender === 'player' ? 'player' : 'character'}">${message.sender !== 'player' ? `<img src="${esc(characterAvatar(character))}" alt="">` : ''}<p>${esc(localText(message.text))}</p></div>`).join('')}${isTyping ? `<div class="contact-bubble character typing-contact"><img src="${esc(characterAvatar(character))}" alt=""><span class="typing-dots"><i></i><i></i><i></i></span></div>` : ''}</div>${!state.firstContactSent ? `<div class="first-contact-composer"><div class="intent-chips">${onboardingContent.contactSuggestions.map((item) => `<button type="button" class="${state.firstContactIntent === item.id ? 'active' : ''}" data-action="select-first-intent" data-intent-id="${item.id}">${esc(localText(item.label))}</button>`).join('')}</div><div class="contact-input-row"><input id="first-contact-input" maxlength="260" placeholder="${esc(langText('写下你真正想说的话…', 'Write what you actually want to say…'))}" ${isTyping ? 'disabled' : ''}><button type="button" data-action="send-first-contact" aria-label="${esc(t('send'))}" ${isTyping ? 'disabled' : ''}>${icon('send',18)}</button></div><button class="later-button" type="button" data-action="complete-onboarding" ${isTyping ? 'disabled' : ''}>${esc(langText('稍后回复', 'Reply later'))}</button></div>` : `<div class="first-contact-finish"><p>${esc(langText('这段联系已写入当前分支。你们仍只是刚刚认识。', 'This contact is recorded in the current branch. You have still only just met.'))}</p><button class="primary-button" type="button" data-action="complete-onboarding">${esc(langText('返回命运观测站', 'Return to the Observatory'))}</button></div>`}</section>`;
  }

  function mainlineState() {
    if (!state.campaign.mainline || typeof state.campaign.mainline !== 'object') state.campaign.mainline = createMainline();
    return state.campaign.mainline;
  }

  function currentMainlineChapter() {
    const progress = mainlineState();
    return mainlineContent.chapters[Math.max(0, Math.min(mainlineContent.chapters.length - 1, Number(progress.chapterIndex || 0)))];
  }

  function mainlineTrustUnlocked() {
    return mainlineContent.signalOrder.every((id) => Number(state.journeys?.[id]?.relationship?.trust || 0) >= 1.5);
  }

  function mainlineSignalStatus(characterId) {
    const progress = mainlineState();
    const index = mainlineContent.signalOrder.indexOf(characterId);
    const chapter = mainlineContent.chapters[index];
    if (chapter && progress.confirmedAnchorIds.includes(chapter.anchor.id)) return 'confirmed';
    if (progress.completed) return 'confirmed';
    if (index === Number(progress.chapterIndex || 0)) return 'located';
    if (progress.phase === 'result' && index === Number(progress.chapterIndex || 0) + 1) return 'located';
    return 'locked';
  }

  function mainlineHomeTask() {
    const progress = mainlineState();
    const chapter = currentMainlineChapter();
    const confirmed = progress.confirmedAnchorIds.length;
    if (progress.completed) {
      const outcome = mainlineContent.finale.outcomes[progress.finalDecision] || mainlineContent.finale.outcomes.echo;
      const weaver = weaverState();
      if (!weaver.completed) return {
        overline: langText('新主线 · 织界室已定位', 'New mainline · Weaver Room located'), title: localText(weaverContent.title),
        description: langText('许澄的存在已经得到保护。她现在要带你去见另一个尚未拥有名字、记忆与世界的人。', 'Xu Cheng’s existence is protected. She now wants you to meet someone who has no name, memory, or world yet.'),
        next: langText('进入观测站底层，在清除倒计时结束前为回声 000 建立五条稳定线。', 'Enter the lower Observatory and give Echo 000 five stability threads before the clearance timer ends.'),
        action: langText('进入封闭织界室', 'Enter the sealed Weaver Room'), actionId: 'open-weaver-mainline'
      };
      return {
        overline: langText('织界师权限已开放', 'Weaver access granted'), title: langText('第一处个人世界已经稳定', 'The first personal world is stable'), description: localText(outcome.text),
        next: langText('进入织界工坊查看本月创生额度，或继续回复许澄。', 'Open the Weaver Workshop to view this month’s capacity, or continue replying to Xu Cheng.'), action: langText('进入织界工坊', 'Open Weaver Workshop'), actionId: 'open-weaver-workshop'
      };
    }
    if (progress.phase === 'finale') {
      return {
        overline: langText('当前主线 · 最终章', 'Current mainline · Finale'), title: localText(mainlineContent.finale.title),
        description: langText('五处信号已经确认。你现在知道许澄为何被删除，也知道让她回来可能触发新的校正。', 'All five signals are confirmed. You now know why Xu Cheng was deleted and why returning her may trigger another correction.'),
        next: langText('带着五个存在锚点前往主镜，选择如何回应她的意愿与世界风险。', 'Take the five anchors to the primary lens and decide how to answer her wishes and the risk to the world.'),
        action: langText('前往主镜', 'Go to the primary lens'), actionId: 'mainline-open'
      };
    }
    if (progress.phase === 'result') {
      return {
        overline: langText(`当前主线 · 第 ${chapter.number} 章完成`, `Current mainline · Chapter ${chapter.number} complete`), title: langText(`第 ${confirmed} 处信号已确认`, `Signal ${confirmed} confirmed`),
        description: localText(chapter.anchor.proves), next: localText(chapter.anchor.next), action: localText(chapter.nextAction), actionId: 'mainline-open'
      };
    }
    if (progress.phase === 'sample') {
      return {
        overline: langText(`当前主线 · 第 ${chapter.number} 章`, `Current mainline · Chapter ${chapter.number}`), title: langText('核对共同记忆', 'Verify the shared memory'),
        description: localText(chapter.scene), next: localText(chapter.sample.prompt), action: localText(chapter.investigationAction), actionId: 'mainline-open'
      };
    }
    return {
      overline: langText(`当前主线 · 第 ${chapter.number} 章`, `Current mainline · Chapter ${chapter.number}`), title: localText(chapter.objective),
      description: localText(chapter.summary), next: localText(chapter.next), action: localText(chapter.action), actionId: 'mainline-open'
    };
  }

  function renderMainlineChapter() {
    const progress = mainlineState();
    const chapter = currentMainlineChapter();
    const character = characters[chapter.characterId];
    const confirmed = progress.confirmedAnchorIds.length;
    const selectedIntent = progress.selectedIntent;
    const resultBlock = progress.phase === 'result' ? `<div class="mainline-result"><span class="mainline-result-kicker">${esc(langText(`第 ${confirmed} 处信号已确认`, `Signal ${confirmed} confirmed`))}</span><h2>${esc(localText(chapter.anchor.label))}</h2><div class="mainline-result-grid"><article><span>${esc(langText('你发现了什么', 'What you found'))}</span><p>${esc(localText(chapter.anchor.discovered))}</p></article><article><span>${esc(langText('它说明了什么', 'What it proves'))}</span><p>${esc(localText(chapter.anchor.proves))}</p></article><article><span>${esc(langText('新的问题', 'New question'))}</span><p>${esc(localText(chapter.anchor.newQuestion))}</p></article><article><span>${esc(langText('下一步', 'Next step'))}</span><p>${esc(localText(chapter.anchor.next))}</p></article></div><button class="primary-button" type="button" data-action="mainline-next">${esc(localText(chapter.nextAction))}</button><button class="text-button" type="button" data-action="go" data-route="observatory-home">${esc(langText('稍后返回首页', 'Return home for now'))}</button></div>` : '';
    const sampleBlock = progress.phase === 'sample' ? `<div class="mainline-sample"><span class="mainline-section-label">${esc(langText('受损梦境 · 声音核对', 'Damaged dream · audio verification'))}</span><h2>${esc(localText(chapter.sample.prompt))}</h2><div class="mainline-sample-options">${chapter.sample.options.map((option, index) => `<button type="button" class="${progress.sampleChoice === option.id ? 'selected' : ''}" data-action="mainline-sample" data-sample-id="${esc(option.id)}"><b>0${index + 1}</b><span>${esc(localText(option.text))}</span></button>`).join('')}</div>${progress.sampleFeedback === 'retry' ? `<p class="mainline-sample-feedback">${esc(langText('这段声音与空白通行卡上的记忆不一致。可以重新核对；错误不会关闭主线。', 'This fragment does not match the blank-card memory. Try again; an error never closes the mainline.'))}</p>` : ''}</div>` : '';
    const briefingBlock = progress.phase === 'briefing' ? `<div class="mainline-briefing"><section class="mainline-question"><span>${esc(langText(`本章问题 · 第 ${chapter.number} 章`, `Chapter question · ${chapter.number}`))}</span><h1>${esc(localText(chapter.question))}</h1></section><section class="mainline-helper"><img src="${esc(characterAvatar(character))}" alt="${esc(localText(character.name))}"><div><span>${esc(langText('本章协助者', 'Chapter ally'))}</span><strong>${esc(localText(character.name))}</strong><small>${esc(localText(character.role))}</small></div></section><p class="mainline-scene-copy">${esc(localText(chapter.scene))}</p><div class="mainline-dialogue">${chapter.dialogue.map((line) => `<div><img src="${esc(characterAvatar(line.speaker))}" alt=""><p>${esc(localText(line.text))}</p></div>`).join('')}</div><div class="mainline-boundary"><span>◇</span><p><strong>${esc(langText('私人互动不会卡住主线', 'Private interaction never blocks the mainline'))}</strong><small>${esc(localText(chapter.boundary))}</small></p></div><div class="mainline-intents">${chapter.intents.map((intent) => `<button type="button" class="${selectedIntent === intent.id ? 'active' : ''}" data-action="mainline-select-intent" data-intent-id="${esc(intent.id)}">${esc(localText(intent.label))}</button>`).join('')}</div><div class="mainline-input-row"><input id="mainline-input" maxlength="260" value="" placeholder="${esc(langText('自由输入你的回应；建议项只表达意图', 'Write your response; suggestions express intent only'))}"><button type="button" data-action="mainline-investigate" aria-label="${esc(localText(chapter.investigationAction))}">${icon('send',18)}</button></div><button class="primary-button mainline-action-button" type="button" data-action="mainline-investigate">${esc(localText(chapter.investigationAction))}</button><p class="mainline-evidence-note">${esc(langText('无论选择哪种语气，本章证据都会保留；关系变化只影响人物态度。', 'Whichever tone you choose, the evidence is preserved; relationship changes affect only the character’s attitude.'))}</p></div>` : '';
    const finaleBlock = progress.phase === 'finale' ? `<div class="mainline-finale"><span class="mainline-result-kicker">${esc(langText('五处信号已确认', 'Five signals confirmed'))}</span><h1>${esc(localText(mainlineContent.finale.title))}</h1><p>${esc(localText(mainlineContent.finale.question))}</p><div class="mainline-anchor-list">${mainlineContent.chapters.map((item) => `<div><img src="${esc(characterAvatar(item.characterId))}" alt=""><span><strong>${esc(localText(item.anchor.label))}</strong><small>${esc(localText(characters[item.characterId].name))}</small></span><b>✓</b></div>`).join('')}</div><div class="mainline-final-choices">${mainlineContent.finale.choices.map((choice) => { const locked = choice.requiresTrust && !mainlineTrustUnlocked(); return `<button type="button" data-action="resolve-mainline" data-decision="${esc(choice.id)}" ${locked ? 'disabled' : ''}><strong>${esc(localText(choice.title))}</strong><p>${esc(localText(choice.description))}</p><span>${esc(locked ? langText('需要五位协助者都建立基础信任', 'Requires basic trust with all five allies') : localText(choice.label))} ›</span></button>`; }).join('')}</div></div>` : '';
    const resolvedOutcome = mainlineContent.finale.outcomes[progress.finalDecision];
    const resolvedBlock = progress.phase === 'resolved' && resolvedOutcome ? `<div class="mainline-resolved"><span>✦</span><h1>${esc(localText(resolvedOutcome.title))}</h1><p>${esc(localText(resolvedOutcome.text))}</p><section><strong>${esc(langText('EchoLink · 许澄', 'EchoLink · Xu Cheng'))}</strong><p>${esc(langText('终于重新连接上了。先不要把我只当成一份恢复成功的档案——织界室里，还有一个人没有来得及成为“谁”。', 'We finally reconnected. Do not reduce me to a restored file—inside the Weaver Room, someone has not yet had time to become a who.'))}</p></section><button class="primary-button" type="button" data-action="open-weaver-mainline">${esc(langText('跟随许澄进入织界室', 'Follow Xu Cheng into the Weaver Room'))}</button><button class="text-button" type="button" data-action="open-xucheng-thread">${esc(langText('先回复许澄', 'Reply to Xu Cheng first'))}</button></div>` : '';
    return `<section class="app-screen mainline-screen">${statusBar()}<header class="mainline-header"><button class="round-icon-button" type="button" data-action="go" data-route="observatory-home" aria-label="Back">${icon('back',18)}</button><div><span>${esc(localText(mainlineContent.title))} · ${progress.phase === 'finale' || progress.phase === 'resolved' ? esc(langText('最终章', 'Finale')) : esc(langText(`第 ${chapter.number} 章`, `Chapter ${chapter.number}`))}</span><strong>${esc(progress.phase === 'finale' || progress.phase === 'resolved' ? localText(mainlineContent.finale.title) : localText(chapter.title))}</strong></div><b>${Math.min(confirmed, 5)} / 5</b></header><div class="mainline-scroll">${briefingBlock}${sampleBlock}${resultBlock}${finaleBlock}${resolvedBlock}</div></section>`;
  }

  function weaverState() {
    if (!state.campaign.weaver || typeof state.campaign.weaver !== 'object') state.campaign.weaver = createWeaverState();
    const progress = syncWeaverQuota(state.campaign.weaver);
    if (progress.phase === 'locked') progress.observerLevel = Math.min(5, 1 + mainlineState().confirmedAnchorIds.length);
    if (mainlineState().completed && progress.phase === 'locked') {
      progress.phase = 'arrival';
      progress.observerLevel = 6;
    }
    return progress;
  }

  function currentWeaverThread() {
    const progress = weaverState();
    return weaverContent.threads[Math.max(0, Math.min(weaverContent.threads.length - 1, Number(progress.threadIndex || 0)))];
  }

  function weaverGuideName(guideId) {
    if (guideId === 'sui') return langText('许澄', 'Xu Cheng');
    return localText(characters[guideId]?.name || langText('未知协助者', 'Unknown ally'));
  }

  function weaverGuideAvatar(guideId) {
    return guideId === 'sui' ? 'assets/brand/echoloom-mark.png' : characterAvatar(guideId);
  }

  function weaverIntentChips() {
    const progress = weaverState();
    const intents = [
      { id: 'listen', label: langText('先听它表达', 'Listen first') },
      { id: 'verify', label: langText('确认风险与依据', 'Verify risk and evidence') },
      { id: 'boundary', label: langText('保留它重新选择的权利', 'Preserve its right to choose again') }
    ];
    return `<div class="weaver-intents">${intents.map((intent) => `<button type="button" class="${progress.selectedIntent === intent.id ? 'active' : ''}" data-action="weaver-select-intent" data-intent-id="${intent.id}">${esc(intent.label)}</button>`).join('')}</div>`;
  }

  function weaverFreeInput(action, label) {
    return `${weaverIntentChips()}<label class="weaver-free-input"><span>${esc(langText('你的回应', 'Your response'))}</span><textarea id="weaver-response" maxlength="300" placeholder="${esc(langText('自由输入；建议项只表达意图，不会替你说完整的话。', 'Write freely; suggestions express intent and never speak a full line for you.'))}"></textarea></label><button class="primary-button weaver-primary" type="button" data-action="${esc(action)}">${esc(label)}</button>`;
  }

  function renderWeaverArrival() {
    const progress = weaverState();
    return `<div class="weaver-arrival"><section class="weaver-echo-hero"><span>${esc(localText(weaverContent.opening.location))}</span><div class="echo-silhouette" aria-hidden="true"><i></i><b>000</b></div><small>${esc(langText('自动清除倒计时', 'Automatic clearance'))}</small><strong>19:43</strong></section><section class="weaver-panel"><span class="weaver-kicker">${esc(localText(weaverContent.echoName))}</span><h1>${esc(localText(weaverContent.title))}</h1><p>${esc(localText(weaverContent.opening.scene))}</p><div class="weaver-dialogue">${weaverContent.opening.dialogue.map((line) => `<div><img src="${esc(weaverGuideAvatar(line.speaker))}" alt=""><p>${esc(localText(line.text))}</p></div>`).join('')}</div>${weaverFreeInput('weaver-begin', langText('开始建立稳定线', 'Begin the stability threads'))}</section><p class="weaver-level-note">${esc(langText(`观测等级 Lv.${progress.observerLevel} · 主线不受创生额度限制`, `Observer Lv.${progress.observerLevel} · mainline never uses creation quota`))}</p></div>`;
  }

  function renderWeaverThread() {
    const progress = weaverState();
    const thread = currentWeaverThread();
    const selected = progress.threadValues[thread.id] || '';
    return `<div class="weaver-thread-view"><section class="weaver-thread-heading"><span>${esc(langText(`稳定线 ${Number(progress.threadIndex || 0) + 1} / 5`, `Stability thread ${Number(progress.threadIndex || 0) + 1} / 5`))}</span><h1>${esc(localText(thread.title))}</h1><p>${esc(localText(thread.question))}</p></section><section class="weaver-guide-card"><img src="${esc(weaverGuideAvatar(thread.guideId))}" alt=""><div><span>${esc(langText('引导者', 'Guide'))}</span><strong>${esc(weaverGuideName(thread.guideId))}</strong><p>${esc(localText(thread.lesson))}</p></div></section><div class="weaver-thread-options">${thread.options.map((option) => `<button type="button" class="${selected === option.id ? 'selected' : ''}" data-action="weaver-choose-thread" data-thread-id="${esc(thread.id)}" data-option-id="${esc(option.id)}"><b>${esc(thread.icon)}</b><span>${esc(localText(option.label))}</span><i>${selected === option.id ? '✓' : '›'}</i></button>`).join('')}</div>${weaverFreeInput('weaver-confirm-thread', langText('确认这一根线', 'Confirm this thread'))}<p class="weaver-safety-copy">${esc(langText('这是可修改的初始结构，不是不可撤销的人格命令。回声醒来后仍可质疑和重新选择。', 'This is an editable starting structure, not an irreversible personality command. The echo may question and choose again after waking.'))}</p></div>`;
  }

  function renderWeaverReview() {
    const progress = weaverState();
    return `<div class="weaver-review"><section class="weaver-thread-heading"><span>${esc(langText('五根稳定线已连接', 'Five stability threads connected'))}</span><h1>${esc(localText(weaverContent.verifier.title))}</h1><p>${esc(localText(weaverContent.verifier.text))}</p></section><section class="weaver-guide-card"><img src="${esc(weaverGuideAvatar(weaverContent.verifier.guideId))}" alt=""><div><span>${esc(langText('复核者', 'Verifier'))}</span><strong>${esc(weaverGuideName(weaverContent.verifier.guideId))}</strong><p>${esc(langText('完整的人不是“永远正确”或“永远顺从”，而是拥有能持续解释的矛盾与边界。', 'A whole person is neither always correct nor always obedient, but has coherent tensions and boundaries.'))}</p></div></section><div class="weaver-thread-summary">${weaverContent.threads.map((thread) => { const option = thread.options.find((item) => item.id === progress.threadValues[thread.id]); return `<article><b>${esc(thread.icon)}</b><span><strong>${esc(localText(thread.title))}</strong><small>${esc(localText(option?.label || langText('已记录', 'Recorded')))}</small></span><i>✓</i></article>`; }).join('')}</div><button class="primary-button weaver-primary" type="button" data-action="weaver-open-npc">${esc(langText('进入免费 NPC 创生教学', 'Begin the free NPC tutorial'))}</button><p class="weaver-level-note">${esc(langText('观测等级提升至 Lv.7', 'Observer level increased to Lv.7'))}</p></div>`;
  }

  function renderWeaverNpcTutorial() {
    const npc = weaverState().tutorialNpc;
    const relationOptions = ['初次相遇', '被遗忘的旧友', '临时搭档', '互相怀疑的调查对象', '双方记忆都不完整的旧识'];
    return `<div class="weaver-tutorial"><section class="weaver-thread-heading"><span>${esc(langText('首次教学 · 不消耗月度额度', 'First tutorial · no monthly quota used'))}</span><h1>${esc(langText('为回声 000 补全身份', 'Complete Echo 000’s identity'))}</h1><p>${esc(langText('不是把形容词堆在一起，而是让名字、愿望、矛盾、记忆、关系与边界互相解释。', 'Do not stack adjectives; let name, desire, tension, memory, relationship, and boundary explain one another.'))}</p></section><section class="weaver-form"><div class="weaver-form-grid"><label>${esc(langText('名字', 'Name'))}<input id="tutorial-npc-name" maxlength="40" value="${esc(npc.name)}"></label><label>${esc(langText('性别表达', 'Gender expression'))}<input id="tutorial-npc-expression" maxlength="50" value="${esc(npc.expression)}"></label><label>${esc(langText('年龄范围', 'Age range'))}<input id="tutorial-npc-age" maxlength="30" value="${esc(npc.ageRange)}"></label><label>${esc(langText('形象与服装', 'Appearance and clothing'))}<input id="tutorial-npc-appearance" maxlength="100" value="${esc(npc.appearance)}"></label></div><label>${esc(langText('声音与说话风格', 'Voice and speaking style'))}<textarea id="tutorial-npc-voice" maxlength="180">${esc(npc.voice)}</textarea></label><label>${esc(langText('核心愿望', 'Core desire'))}<textarea id="tutorial-npc-desire" maxlength="220">${esc(npc.desire)}</textarea></label><label>${esc(langText('性格矛盾', 'Character tension'))}<textarea id="tutorial-npc-contradiction" maxlength="220">${esc(npc.contradiction)}</textarea></label><label>${esc(langText('核心记忆', 'Core memory'))}<textarea id="tutorial-npc-memory" maxlength="220">${esc(npc.memory)}</textarea></label><label>${esc(langText('与玩家的初始关系', 'Initial relationship'))}<select id="tutorial-npc-relation">${relationOptions.map((value) => `<option value="${esc(value)}" ${npc.initialRelation === value ? 'selected' : ''}>${esc(value)}</option>`).join('')}</select></label><label>${esc(langText('关系边界', 'Relationship boundary'))}<textarea id="tutorial-npc-boundary" maxlength="220">${esc(npc.boundary)}</textarea></label></section><button class="primary-button weaver-primary" type="button" data-action="weaver-confirm-tutorial-npc">${esc(langText('确认创生 · 免费', 'Confirm creation · free'))}</button><p class="weaver-safety-copy">${esc(langText('这次教学不会扣除角色创生额度。角色可以拒绝、改变想法，也不会被设定为必然爱上玩家。', 'This tutorial does not use NPC quota. The character may refuse, change their mind, and is never set to inevitably love the player.'))}</p></div>`;
  }

  function renderWeaverWorldTutorial() {
    const world = weaverState().tutorialWorld;
    const types = ['现代都市', '未来星港', '魔法学院', '永夜城邦', '海边小镇', '东方幻想世界'];
    return `<div class="weaver-tutorial"><section class="weaver-thread-heading"><span>${esc(langText('首次教学 · 不消耗月度额度', 'First tutorial · no monthly quota used'))}</span><h1>${esc(langText('为南星留下一个世界', 'Leave a world for Nan Xing'))}</h1><p>${esc(langText('世界不是漂亮背景。它需要一条能理解的规则、共同地点，以及可以继续发展的矛盾。', 'A world is not a pretty backdrop. It needs a legible rule, a shared place, and a conflict that can continue.'))}</p></section><section class="weaver-form"><div class="weaver-form-grid"><label>${esc(langText('世界名称', 'World name'))}<input id="tutorial-world-name" maxlength="50" value="${esc(world.name)}"></label><label>${esc(langText('世界类型', 'World type'))}<select id="tutorial-world-type">${types.map((value) => `<option value="${esc(value)}" ${world.type === value ? 'selected' : ''}>${esc(value)}</option>`).join('')}</select></label></div><label>${esc(langText('核心规则', 'Core rule'))}<textarea id="tutorial-world-rule" maxlength="220">${esc(world.rule)}</textarea></label><label>${esc(langText('玩家在世界中的身份', 'Player identity in the world'))}<textarea id="tutorial-world-identity" maxlength="180">${esc(world.playerIdentity)}</textarea></label><label>${esc(langText('两人的共同地点', 'Shared place'))}<textarea id="tutorial-world-place" maxlength="180">${esc(world.sharedPlace)}</textarea></label><label>${esc(langText('故事最初的矛盾', 'Opening conflict'))}<textarea id="tutorial-world-conflict" maxlength="220">${esc(world.conflict)}</textarea></label></section><button class="primary-button weaver-primary" type="button" data-action="weaver-confirm-tutorial-world">${esc(langText('确认创生 · 免费', 'Confirm creation · free'))}</button><p class="weaver-safety-copy">${esc(langText('这次教学不会扣除世界创生额度，也不会被未来的月度校准清除。', 'This tutorial does not use world quota and will not be cleared by future monthly calibration.'))}</p></div>`;
  }

  function renderWeaverComplete() {
    const progress = weaverState();
    const npc = progress.createdNpcs.find((item) => item.tutorial) || progress.tutorialNpc;
    const world = progress.createdWorlds.find((item) => item.tutorial) || progress.tutorialWorld;
    return `<div class="weaver-complete"><div class="weaver-awaken-mark">✦</div><span>${esc(langText('第一处个人世界已建立', 'First personal world established'))}</span><h1>${esc(langText('欢迎来到 EchoLoom，织界师', 'Welcome to EchoLoom, Weaver'))}</h1><p>${esc(langText('你找回过一个被世界删除的人，也为一个没有归处的角色留下了位置。创生不是分配关系，而是承担身份、愿望、记忆、边界与世界的连续性。', 'You recovered someone deleted by the world and left a place for a person with nowhere to go. Creation assigns no relationship; it carries continuity of identity, desire, memory, boundary, and world.'))}</p><section class="weaver-created-pair"><article><span>${esc(langText('第一位回声角色', 'First echo character'))}</span><strong>${esc(npc.name)}</strong><small>${esc(npc.desire)}</small></article><article><span>${esc(langText('第一处个人世界', 'First personal world'))}</span><strong>${esc(world.name)}</strong><small>${esc(world.rule)}</small></article></section><blockquote>${esc(langText('“我已经在这里等过你很多次。但这是第一次，我能够记住你来了。”', '“I have waited for you here many times. This is the first time I can remember that you came.”'))}</blockquote><button class="primary-button weaver-primary" type="button" data-action="open-weaver-workshop">${esc(langText('进入织界工坊', 'Open Weaver Workshop'))}</button><p class="weaver-level-note">${esc(langText(`观测等级 Lv.${progress.observerLevel} · 正式权限已开放`, `Observer Lv.${progress.observerLevel} · full access granted`))}</p></div>`;
  }

  function renderWeaverMainline() {
    const progress = weaverState();
    if (!mainlineState().completed) return renderCreator();
    let content = renderWeaverArrival();
    if (progress.phase === 'threads') content = renderWeaverThread();
    if (progress.phase === 'review') content = renderWeaverReview();
    if (progress.phase === 'npc') content = renderWeaverNpcTutorial();
    if (progress.phase === 'world') content = renderWeaverWorldTutorial();
    if (progress.phase === 'complete') content = renderWeaverComplete();
    return `<section class="app-screen weaver-mainline-screen">${statusBar()}<header class="mainline-header"><button class="round-icon-button" type="button" data-action="go" data-route="observatory-home" aria-label="Back">${icon('back',18)}</button><div><span>ECHOLOOM · ${esc(localText(weaverContent.title))}</span><strong>${esc(progress.phase === 'complete' ? langText('织界师权限', 'Weaver access') : localText(weaverContent.echoName))}</strong></div><b>Lv.${progress.observerLevel}</b></header><div class="weaver-scroll">${content}</div></section>`;
  }

  function renderObservatoryHome() {
    const progress = mainlineState();
    const chapter = currentMainlineChapter();
    const helper = characters[chapter.characterId];
    const task = mainlineHomeTask();
    const confirmed = progress.confirmedAnchorIds.length;
    const phaseProgress = progress.phase === 'result' || progress.phase === 'finale' || progress.phase === 'resolved';
    const objectiveDone = progress.phase !== 'briefing';
    return `<section class="app-screen observatory-home-screen">${statusBar()}<header class="observatory-header"><div><span>FATE OBSERVATORY · 00:17</span><strong>${esc(langText(`欢迎回来，${state.playerName || '观测者'}`, `Welcome back, ${state.playerName || 'Observer'}`))}</strong></div><button class="round-icon-button" type="button" data-action="go" data-route="settings" aria-label="${esc(t('settings'))}">${icon('settings',17)}</button></header><div class="observatory-home-scroll"><section class="current-task-card"><span class="task-overline">${esc(task.overline)}</span><h1>${esc(task.title)}</h1><p>${esc(task.description)}</p>${!progress.completed && progress.phase !== 'finale' ? `<ol class="task-progress-list"><li class="done"><i>✓</i><span>${esc(confirmed ? langText('上一处信号已确认', 'Previous signal confirmed') : langText('收到三十七天后的未知消息', 'Message from thirty-seven days later received'))}</span></li><li class="${objectiveDone ? 'done' : 'current'}"><i>${objectiveDone ? '✓' : '○'}</i><span>${esc(localText(chapter.objective))}</span></li><li class="${phaseProgress ? 'done' : ''}"><i>${phaseProgress ? '✓' : '○'}</i><span>${esc(langText(`确认“${localText(chapter.anchor.label)}”`, `Confirm “${localText(chapter.anchor.label)}”`))}</span></li></ol>` : ''}<div class="task-next"><span>${esc(langText('下一步', 'Next'))}</span><p>${esc(task.next)}</p></div><button class="primary-button" type="button" data-action="${esc(task.actionId)}">${esc(task.action)}</button><small>${esc(progress.phase === 'result' ? langText(`已确认 ${confirmed} / 5 · 下一处信号已定位`, `Confirmed ${confirmed} / 5 · next signal located`) : langText(`存在锚点 ${confirmed} / 5`, `Existence anchors ${confirmed} / 5`))}</small></section><section class="chapter-helper-card"><img src="${esc(helper.cardPortrait || helper.portrait)}" alt="${esc(localText(helper.name))}"><div><span>${esc(langText('本章协助者', 'Chapter ally'))}</span><h2>${esc(localText(helper.name))}</h2><small>${esc(localText(helper.role))}</small><p>${esc(localText(chapter.scene))}</p><div><button type="button" data-action="mainline-open">${esc(progress.phase === 'briefing' ? localText(chapter.action) : langText('继续本章', 'Continue chapter'))}</button><button type="button" data-action="mainline-view-helper" data-character-id="${esc(chapter.characterId)}">${esc(langText('查看人物档案', 'View dossier'))}</button></div></div></section><button class="future-message-card" type="button" data-action="open-delayed-message"><span><small>${esc(langText('未知联系人 · 三十七天后', 'Unknown contact · thirty-seven days later'))}</small><strong>${esc(langText('“你还记得我吗？”', '“Do you still remember me?”'))}</strong><p>${esc(langText('消息来源无法定位 · 五处异常信号同时出现', 'Source unknown · five anomaly signals appeared together'))}</p></span><b>${esc(langText('查看完整消息', 'Open full message'))} ›</b></button><section class="mainline-signals"><header><span><strong>${esc(langText('五处异常信号', 'Five anomaly signals'))}</strong><small>${esc(langText('每处信号都保存着一部分关于许澄的记录。', 'Each signal preserves part of the record of Xu Cheng.'))}</small></span><b>${confirmed} / 5</b></header><div>${mainlineContent.signalOrder.map((id) => { const signalChapter = mainlineContent.chapters[mainlineContent.signalOrder.indexOf(id)]; const status = mainlineSignalStatus(id); return `<article class="${status}"><img src="${esc(characterAvatar(id))}" alt="${esc(localText(characters[id].name))}"><strong>${esc(localText(characters[id].name))}</strong><span>${esc(status === 'confirmed' ? langText('已确认', 'Confirmed') : status === 'located' ? langText('已定位', 'Located') : langText('未解锁', 'Locked'))}</span><small>${esc(localText(signalChapter.anchor.label))}</small></article>`; }).join('')}</div><p>${esc(langText(`已定位 ${mainlineContent.signalOrder.filter((id) => mainlineSignalStatus(id) !== 'locked').length} / 5 · 已确认 ${confirmed} / 5`, `${mainlineContent.signalOrder.filter((id) => mainlineSignalStatus(id) !== 'locked').length} / 5 located · ${confirmed} / 5 confirmed`))}</p></section></div>${bottomNav('observatory-home')}</section>`;
  }

  function renderStoryHub() {
    const progress = mainlineState();
    const chapter = currentMainlineChapter();
    const branch = branchPresentation();
    const currentTitle = progress.phase === 'finale' || progress.phase === 'resolved' ? mainlineContent.finale.title : chapter.title;
    const anchors = mainlineContent.chapters.filter((item) => progress.confirmedAnchorIds.includes(item.anchor.id));
    const outcome = progress.completed ? mainlineContent.finale.outcomes[progress.finalDecision] : null;
    const task = mainlineHomeTask();
    return `<section class="app-screen hub-screen story-hub-screen">${statusBar()}<header class="hub-header"><span class="eyebrow">STORY ARCHIVE</span><h1>${esc(langText('故事', 'Story'))}</h1><p>${esc(langText('每一章回答一个问题，并只留下一个明确的下一步。人物关系会改变语气，但不会吞掉主线证据。', 'Each chapter answers one question and leaves one explicit next step. Relationships change tone, never erase mainline evidence.'))}</p></header><div class="hub-content"><button class="story-main-card" type="button" data-action="mainline-open"><img src="${esc(characters[chapter.characterId]?.discoveryBg || 'assets/backgrounds/archive.svg')}" alt=""><span><small>${esc(progress.phase === 'finale' || progress.phase === 'resolved' ? langText('主线 · 最终章', 'Mainline · Finale') : langText(`主线 · 第 ${chapter.number} 章`, `Mainline · Chapter ${chapter.number}`))}</small><strong>${esc(localText(currentTitle))}</strong><p>${esc(langText(`${progress.confirmedAnchorIds.length} / 5 个存在锚点 · 当前分支 ${branch.number}`, `${progress.confirmedAnchorIds.length} / 5 existence anchors · branch ${branch.number}`))}</p></span></button><section class="story-current-question"><span>${esc(langText('当前问题', 'Current question'))}</span><strong>${esc(progress.phase === 'finale' || progress.phase === 'resolved' ? localText(mainlineContent.finale.question) : localText(chapter.question))}</strong><button type="button" data-action="${esc(task.actionId)}">${esc(task.action)} ›</button></section>${outcome ? `<section class="shared-story-card"><span>${esc(langText('新主线', 'New arc'))}</span><strong>${esc(localText(outcome.title))}</strong><p>${esc(localText(outcome.text))}</p></section>` : ''}<section class="story-clues"><h2>${esc(langText('许澄的存在锚点', 'Xu Cheng’s existence anchors'))}</h2>${anchors.length ? anchors.map((item) => `<article><span>${esc(localText(item.anchor.label))} · ${esc(localText(item.anchor.source))}</span><p>${esc(localText(item.anchor.proves))}</p></article>`).join('') : `<article><span>${esc(langText('尚未确认', 'Not yet confirmed'))}</span><p>${esc(langText('联系闻笙并核对梦境样本，确认第一份独立记录。', 'Contact Wen Sheng and verify the dream sample to confirm the first independent record.'))}</p></article>`}</section></div>${bottomNav('story-hub')}</section>`;
  }

  function renderWorldHub() {
    const progress = mainlineState();
    const weaver = weaverState();
    const chapter = currentMainlineChapter();
    const worldImages = { wensheng: 'assets/backgrounds/unfinished-world.svg', qian: 'assets/backgrounds/archive.svg', zhoutang: 'assets/backgrounds/echolink-lab.svg', lichuan: 'assets/backgrounds/station.svg', shenyao: 'assets/backgrounds/observatory.svg' };
    const task = mainlineHomeTask();
    return `<section class="app-screen hub-screen world-hub-screen">${statusBar()}<header class="hub-header"><span class="eyebrow">WORLD ATLAS</span><h1>${esc(langText('世界', 'World'))}</h1><p>${esc(langText('这里显示当前调查地点与可执行行动；世界也是人物生活的地方，不只是任务背景。', 'This page shows the current investigation location and action; worlds are places people live, not merely task backdrops.'))}</p></header><div class="hub-content"><button class="current-world-card" type="button" data-action="mainline-open"><img src="${esc(worldImages[chapter.characterId] || 'assets/backgrounds/observatory.svg')}" alt=""><span><small>${esc(localText(chapter.location).split('·')[0].trim())}</small><strong>${esc(localText(chapter.location).split('·').slice(1).join('·').trim() || localText(chapter.title))}</strong><p>${esc(progress.phase === 'result' ? localText(chapter.anchor.next) : localText(chapter.next))}</p></span></button><section class="world-mainline-action"><span>${esc(langText('当前主线地点', 'Current mainline location'))}</span><h2>${esc(localText(chapter.title))}</h2><p>${esc(localText(chapter.summary))}</p><button class="primary-button" type="button" data-action="${esc(task.actionId)}">${esc(task.action)}</button></section><div class="world-actions world-tools"><button type="button" data-action="go" data-route="together"><span>✦</span><strong>${esc(langText('生成共同场景', 'Generate a shared scene'))}</strong><small>${esc(langText('主线之外，与当前角色经历不预设结果的故事。', 'Outside the mainline, share a scene without a predetermined result.'))}</small></button><button type="button" data-action="${weaver.workshopUnlocked ? 'open-weaver-workshop' : 'open-weaver-mainline'}"><span>${weaver.workshopUnlocked ? '◇' : '⌁'}</span><strong>${esc(langText('EchoLoom · 织界工坊', 'EchoLoom · Weaver Workshop'))}</strong><small>${esc(weaver.workshopUnlocked ? langText(`Lv.8 已开放 · 角色 ${Math.max(0, weaver.quota.npcLimit - weaver.quota.npcUsed)}/${weaver.quota.npcLimit} · 世界 ${Math.max(0, weaver.quota.worldLimit - weaver.quota.worldUsed)}/${weaver.quota.worldLimit}`, `Lv.8 open · NPC ${Math.max(0, weaver.quota.npcLimit - weaver.quota.npcUsed)}/${weaver.quota.npcLimit} · World ${Math.max(0, weaver.quota.worldLimit - weaver.quota.worldUsed)}/${weaver.quota.worldLimit}`) : langText('完成《第一根自由的线》后开放；先理解身份、愿望、记忆、边界与世界。', 'Unlock after The First Free Thread; first understand identity, desire, memory, boundaries, and world.'))}</small></button></div></div>${bottomNav('world-hub')}</section>`;
  }

  function branchPresentation(nodes = state.saves || []) {
    const activeIndex = nodes.findIndex((node) => isActiveBranchNode(node.id));
    const activeNode = activeIndex >= 0 ? nodes[activeIndex] : null;
    const chapter = currentMainlineChapter();
    const progress = mainlineState();
    const outcome = progress.completed ? mainlineContent.finale.outcomes[progress.finalDecision] : null;
    const fallbackBase = outcome?.title || (progress.phase === 'finale' ? mainlineContent.finale.title : chapter.title);
    const fallbackTitle = langText(`${localText(fallbackBase)} · 当前观测`, `${localText(fallbackBase)} · Current observation`);
    const numericId = String(state.currentBranchId || '').replace(/\D/g, '');
    return {
      title: activeNode?.label ? localText(activeNode.label) : fallbackTitle,
      number: activeIndex >= 0 ? String(activeIndex + 1).padStart(2, '0') : '01',
      reference: state.currentBranchId && state.currentBranchId !== 'root' ? `#${numericId.slice(-6) || 'LOCAL'}` : 'ROOT'
    };
  }

  function isActiveBranchNode(nodeId) {
    const currentId = String(state.currentBranchId || '');
    const savedId = String(nodeId || '');
    return currentId === savedId || currentId.startsWith(`${savedId}-`) || savedId.startsWith(`${currentId}-`);
  }

  function renderArchiveBranches() {
    const nodes = state.saves || [];
    const branch = branchPresentation(nodes);
    const progress = mainlineState();
    const chapter = currentMainlineChapter();
    const characterName = progress.phase === 'finale' || progress.phase === 'resolved'
      ? langText('五位协助者', 'five allies')
      : localText(characters[chapter.characterId]?.name || langText('尚未选择', 'Not selected'));
    const currentQuestion = progress.phase === 'finale' || progress.phase === 'resolved' ? mainlineContent.finale.question : chapter.question;
    const anchorCount = progress.confirmedAnchorIds.length;
    return `<section class="app-screen archive-branches-screen">${statusBar()}<header class="archive-new-header"><button class="round-icon-button" type="button" data-action="go" data-route="${state.onboardingCompleted ? 'observatory-home' : 'title'}">${icon('back',18)}</button><div><span class="eyebrow">FATE ARCHIVE</span><h1>${esc(langText('分支档案', 'Branch Archive'))}</h1></div><button class="round-icon-button" type="button" data-action="go" data-route="settings">${icon('settings',16)}</button></header><div class="archive-branch-content"><section class="current-branch-card"><div class="current-branch-heading"><span>${esc(langText('当前分支', 'Current branch'))}</span><code title="${esc(state.currentBranchId || 'root')}">${esc(branch.reference)}</code></div><strong>${esc(branch.title)}</strong><p>${esc(langText(`${state.playerName || '观测者'} · 与${characterName}共同调查`, `${state.playerName || 'Observer'} · investigating with ${characterName}`))}</p><small>${esc(langText(`分支 ${branch.number} · 存在锚点 ${anchorCount}/5 · 当前问题：${localText(currentQuestion)}`, `Branch ${branch.number} · ${anchorCount}/5 existence anchors · current question: ${localText(currentQuestion)}`))}</small></section><div class="branch-line" aria-hidden="true"></div>${nodes.length ? `<div class="saved-branch-list">${nodes.map((node, index) => `<button type="button" class="saved-branch-node ${isActiveBranchNode(node.id) ? 'active' : ''}" data-action="restore-onboarding-save" data-save-id="${esc(node.id)}"><b>${String(index + 1).padStart(2, '0')}</b><span><strong>${esc(localText(node.label))}</strong><small>${esc(localText(node.summary))}</small></span><time>${esc(node.time || '00:17')}</time></button>`).join('')}</div>` : `<div class="archive-empty"><span>⌁</span><p>${esc(langText('完成首次救援后，事件会自动保存为独立节点。', 'Your first rescue will be saved as an independent node automatically.'))}</p></div>`}${state.onboardingCompleted ? `<button class="primary-button archive-return-signals" type="button" data-action="new-signal-branch">${esc(langText('返回五处信号，创建新分支', 'Return to five signals in a new branch'))}</button>` : ''}${state.archives?.length ? `<button class="secondary-button" type="button" data-action="go" data-route="threads">${esc(langText('查看高级回溯节点', 'View advanced rewind nodes'))}</button>` : ''}</div>${state.onboardingCompleted ? bottomNav('archive-branches') : ''}</section>`;
  }

  function render() {
    document.documentElement.lang = state.language === 'zh' ? 'zh-CN' : 'en';
    document.body.classList.toggle('reduce-motion', Boolean(state.settings?.reduceMotion));
    const characterRequired = ['story', 'summary', 'home', 'chat', 'relationship', 'together', 'generatedStory', 'echoes'];
    if (characterRequired.includes(state.screen) && (!activeCharacter() || !activeJourney())) state.screen = state.onboardingCompleted ? 'observatory-home' : 'signal-scan';
    const routes = {
      splash: renderBrandSplash, title: renderTitle, prologue: renderPrologue, 'player-name': renderPlayerName,
      'signal-scan': renderSignalScan, 'signal-detail': renderSignalDetail, 'signal-confirm': renderSignalConfirm,
      'first-rescue': renderFirstRescue, 'event-result': renderEventResult, 'echolink-activation': renderEchoActivation,
      'first-contact': renderFirstContact, 'observatory-home': renderObservatoryHome, 'mainline-chapter': renderMainlineChapter, 'weaver-mainline': renderWeaverMainline, 'story-hub': renderStoryHub,
      'world-hub': renderWorldHub, 'archive-branches': renderArchiveBranches,
      discover: renderDiscover, story: renderStory, summary: renderSummary, station: renderStation, echolink: renderEchoLink,
      home: renderHome, chat: renderChat, relationship: renderRelationship, sharedEvent: renderSharedEvent, creator: renderCreator,
      threads: renderThreads, together: renderTogether, generatedStory: renderGeneratedStory, echoes: renderEchoes, settings: renderSettings
    };
    app.innerHTML = (routes[state.screen] || renderTitle)();
    applySceneBackground();
    renderDesktop();
    scheduleScreenEffects();
    requestAnimationFrame(() => {
      const chat = document.getElementById('chat-body');
      if (chat) chat.scrollTop = chat.scrollHeight;
      const story = document.getElementById('story-history');
      if (story) story.scrollTop = story.scrollHeight;
      const echoThread = document.getElementById('echo-thread-body');
      if (echoThread) echoThread.scrollTop = echoThread.scrollHeight;
      const firstContact = document.getElementById('first-contact-thread');
      if (firstContact) firstContact.scrollTop = firstContact.scrollHeight;
    });
    window.EchoStorage.save(state);
  }

  function renderDesktop() {
    const nav = document.getElementById('desktop-nav');
    const journey = activeJourney();
    const activeRoute = state.screen;
    const unlocked = new Set(['title', 'prologue', 'signal-scan', 'signal-confirm', 'first-rescue', 'first-contact', 'observatory-home', 'archive-branches']);
    if (state.onboardingCompleted) {
      unlocked.add('mainline-chapter');
      demoGroups[1].steps.forEach(([screen]) => { if (screen !== 'creator') unlocked.add(screen); });
    }
    if (state.campaign?.mainline?.completed) unlocked.add('weaver-mainline');
    if (state.campaign?.weaver?.workshopUnlocked) unlocked.add('creator');
    let runningIndex = 0;
    nav.innerHTML = `<div class="desktop-nav-title">${esc(t('demoNavigator'))}</div>${demoGroups.map((group) => `<section class="desktop-nav-group"><h3>${esc(langText(...group.title))}</h3><div class="desktop-nav-list">${group.steps.map(([screen,label]) => {
      runningIndex += 1;
      const complete = screen === 'title' || (['prologue','signal-scan','signal-confirm'].includes(screen) && Boolean(state.prologueChoice)) || (screen === 'first-rescue' && Boolean(state.selectedRescueChoice)) || (['first-contact','observatory-home'].includes(screen) && state.onboardingCompleted) || (screen === 'mainline-chapter' && Boolean(state.campaign?.mainline?.confirmedAnchorIds?.length)) || (screen === 'weaver-mainline' && Boolean(state.campaign?.weaver?.confirmedThreadIds?.length)) || (screen === 'creator' && Boolean(state.campaign?.weaver?.workshopUnlocked)) || (screen === 'archive-branches' && state.saves?.length) || (screen === 'echolink' && state.campaign?.echoLink?.hasOpened) || (screen === 'together' && journey?.generatedScenes?.length > 0);
      const locked = !unlocked.has(screen) && !complete;
      return `<button class="desktop-nav-button ${activeRoute === screen ? 'active' : ''} ${complete ? 'complete' : ''} ${locked ? 'locked' : ''}" type="button" data-desktop-route="${screen}" ${locked ? 'disabled' : ''}><span class="desktop-nav-index">${String(runningIndex).padStart(2, '0')}</span><span class="desktop-nav-copy"><strong>${esc(label)}</strong><small>${esc(group === demoGroups[0] ? langText('核心叙事流程', 'Core story flow') : langText('保留功能页面', 'Existing feature page'))}</small></span><span class="desktop-nav-status"></span></button>`;
    }).join('')}</div></section>`).join('')}`;
    document.getElementById('principle-label').textContent = t('researchPrinciple');
    document.getElementById('principle-text').textContent = langText('角色不会因为被选择就爱上用户。关系来自记忆、理解、分歧、边界和共同经历。', 'A character does not fall in love because they were selected. Relationships grow through memory, understanding, disagreement, boundaries, and shared experience.');
    document.getElementById('prototype-hint').textContent = t('prototypeHint');
    document.getElementById('control-title').textContent = t('demoControls');
    document.getElementById('language-control-label').textContent = 'English / 中文';
    document.getElementById('export-control-label').textContent = t('export');
    document.getElementById('import-control-label').textContent = t('import');
    document.getElementById('reset-control-label').textContent = t('reset');
    document.getElementById('offline-label').textContent = t('demoOffline');
    document.getElementById('codex-ready-label').textContent = t('codexReady');
  }

  function go(route) {
    const requiresCharacter = ['story', 'summary', 'home', 'chat', 'relationship', 'together', 'generatedStory', 'echoes'];
    if (route === 'station' && state.onboardingCompleted) route = 'observatory-home';
    if (route === 'creator') {
      if (!weaverState().workshopUnlocked) return openWeaverMainline();
      route = 'creator';
    }
    if (route === 'settings' && state.screen !== 'settings') state.resumeScreen = state.screen;
    state.screen = requiresCharacter.includes(route) && !activeCharacter() ? (state.onboardingCompleted ? 'observatory-home' : 'signal-scan') : route;
    if (!['splash', 'title', 'settings'].includes(state.screen)) state.resumeScreen = state.screen;
    render();
  }

  function scheduleScreenEffects() {
    if (state.screen === 'splash') {
      if (!splashStartedAt) splashStartedAt = Date.now();
      if (!splashTimer) splashTimer = window.setTimeout(() => {
        splashTimer = null;
        if (state.screen === 'splash') go('title');
      }, state.settings?.reduceMotion ? 700 : 1750);
    } else {
      if (splashTimer) window.clearTimeout(splashTimer);
      splashTimer = null;
      splashStartedAt = 0;
    }
    if (prologueAutoTimer) window.clearTimeout(prologueAutoTimer);
    prologueAutoTimer = null;
    if (state.screen === 'prologue' && prologueAuto && Number(state.prologueBeat || 0) < onboardingContent.prologue.length) {
      prologueAutoTimer = window.setTimeout(() => advancePrologue(), state.settings?.reduceMotion ? 650 : 1500);
    }
  }

  function startNewOnboarding() {
    const keepSaves = Array.isArray(state.saves) ? state.saves : [];
    const keepArchives = Array.isArray(state.archives) ? state.archives : [];
    const keepSettings = { ...state.settings };
    const keepLanguage = state.language;
    state = JSON.parse(JSON.stringify(window.ECHOLOOM_DATA.defaultState));
    state.saves = keepSaves;
    state.archives = keepArchives;
    state.settings = keepSettings;
    state.language = keepLanguage;
    state.onboardingStarted = true;
    state.screen = 'prologue';
    state.resumeScreen = 'prologue';
    prologueAuto = false;
    render();
  }

  function advancePrologue() {
    if (state.screen !== 'prologue') return;
    const beat = Number(state.prologueBeat || 0);
    if (beat === Number(onboardingContent.prologueChoiceBeat) && !state.prologueChoice) {
      prologueAuto = false;
      return render();
    }
    if (beat === Number(onboardingContent.identityBeat) && !state.playerName) {
      state.prologueBeat = beat + 1;
      return go('player-name');
    }
    state.prologueBeat = Math.min(onboardingContent.prologue.length, beat + 1);
    render();
  }

  function openOnboardingLog(entries) {
    modalContext = { type: 'onboarding-log' };
    modalRoot.innerHTML = `<div class="modal-backdrop" data-action="modal-backdrop"><div class="memory-modal onboarding-log-modal"><div class="modal-header"><div><h2>${esc(langText('事件记录', 'Event log'))}</h2><span>00:17</span></div><button type="button" data-action="modal-cancel">×</button></div><div class="onboarding-log-list">${entries.map((entry) => `<p><strong>${esc(prologueSpeaker(entry.speaker))}</strong>${esc(prologueEntryText(entry))}</p>`).join('')}</div></div></div>`;
  }

  function beginRescue() {
    const id = state.selectedNpcId;
    if (!characters[id]) return go('signal-scan');
    state.activeCharacterId = id;
    state.rescueBeat = 0;
    state.selectedRescueChoice = null;
    state.screen = 'first-rescue';
    state.resumeScreen = 'first-rescue';
    render();
  }

  function completeFirstRescue(choiceId) {
    const id = state.selectedNpcId;
    const rescue = onboardingContent.rescues[id];
    const choice = rescue?.choices.find((item) => item.id === choiceId);
    if (!choice) return;
    const allowedKeys = new Set(['familiarity', 'trust', 'reciprocity', 'compatibility', 'safety', 'strain']);
    const knownIds = [id, ...rescue.supportIds];
    characterIds.forEach((characterId) => {
      if (!state.journeys[characterId]) state.journeys[characterId] = createJourney(characterId);
    });
    knownIds.forEach((characterId) => { state.journeys[characterId].met = true; });
    for (const [characterId, delta] of Object.entries(choice.deltas || {})) {
      const safeDelta = Object.fromEntries(Object.entries(delta).filter(([key]) => allowedKeys.has(key)));
      applyRelationshipDelta(safeDelta, state.journeys[characterId]);
    }
    state.activeCharacterId = id;
    state.selectedRescueChoice = choice.id;
    state.knownNpcIds = [...new Set([...(state.knownNpcIds || []), ...knownIds])];
    state.contactNpcIds = [...new Set([...(state.contactNpcIds || []), id])];
    state.unreadCount = 2;
    state.campaign.firstSignal = id;
    state.campaign.phase = 'contact';
    state.campaign.observationInsight = Number(state.campaign.observationInsight || 0) + 1;
    if (!state.campaign.clues.some((clue) => clue.id === rescue.clue.id)) state.campaign.clues.push(JSON.parse(JSON.stringify(rescue.clue)));
    state.hiddenFlags = [...new Set([...(state.hiddenFlags || []), 'shared-signal-detected', ...(state.knownNpcIds.length >= 3 ? ['shared-event-unlocked'] : [])])];
    state.resultData = { result: choice.result, knownIds, deltas: JSON.parse(JSON.stringify(choice.deltas)) };
    const nodeId = `branch-${Date.now()}`;
    state.currentBranchId = nodeId;
    state.campaign.activeBranchId = nodeId;
    state.saves = [...(state.saves || []), {
      id: nodeId,
      label: { zh: `首次救援 · ${localText(characters[id].name)}`, en: `First rescue · ${characters[id].name.en}` },
      summary: choice.result,
      npcId: id,
      choiceId: choice.id,
      time: '00:17',
      snapshot: {
        playerName: state.playerName,
        prologueChoice: state.prologueChoice,
        selectedNpcId: id,
        selectedRescueChoice: choice.id,
        journeys: JSON.parse(JSON.stringify(state.journeys)),
        campaign: JSON.parse(JSON.stringify(state.campaign)),
        knownNpcIds: [...state.knownNpcIds],
        contactNpcIds: [...state.contactNpcIds],
        hiddenFlags: [...state.hiddenFlags],
        resultData: JSON.parse(JSON.stringify(state.resultData)),
        onboardingCompleted: false
      }
    }].slice(-12);
    if (state.archives.length < 6) createArchive(langText(`首次救援 · ${localText(characters[id].name)}`, `First rescue · ${characters[id].name.en}`));
    state.currentBranchId = state.campaign.activeBranchId;
    state.screen = 'event-result';
    state.resumeScreen = 'event-result';
    render();
  }

  function activateFirstContact() {
    const id = state.selectedNpcId;
    const terminal = state.campaign.echoLink;
    const initial = JSON.parse(JSON.stringify(onboardingContent.firstMessages[id] || []));
    terminal.hasOpened = true;
    terminal.lastOpenedAt = new Date().toISOString();
    terminal.activeThreadId = id;
    terminal.activeTab = 'messages';
    terminal.conversations[id].messages = initial.map((message, index) => ({ id: `first-${id}-${index}`, sender: id, type: 'text', text: message.text, time: index ? '09:18' : '09:17' }));
    terminal.conversations[id].unread = initial.length;
    state.firstContactMessages = initial;
    state.unreadCount = initial.length;
    go('first-contact');
  }

  function sendFirstContact() {
    const input = document.getElementById('first-contact-input');
    const clean = String(input?.value || '').trim();
    const id = state.selectedNpcId;
    if (!clean || !characters[id] || isTyping) return;
    const thread = state.campaign.echoLink.conversations[id];
    state.firstContactMessages = state.firstContactMessages?.length ? state.firstContactMessages : JSON.parse(JSON.stringify(onboardingContent.firstMessages[id]));
    state.firstContactMessages.push({ sender: 'player', text: clean });
    thread.messages.push({ id: `first-player-${Date.now()}`, sender: 'player', type: 'text', text: clean, time: '09:19' });
    const intentDelta = state.firstContactIntent === 'boundary' ? { safety: 0.5 } : state.firstContactIntent === 'clue' ? { familiarity: 0.5 } : { reciprocity: 0.5 };
    applyRelationshipDelta(intentDelta, state.journeys[id]);
    isTyping = true;
    render();
    const delay = window.EchoReplyTiming?.calculate({ contactId: id, relationship: state.journeys[id].relationship, communicationPulse: state.journeys[id].communicationPulse }) || 900;
    window.setTimeout(() => {
      if (state.screen !== 'first-contact' || state.selectedNpcId !== id) return;
      const replies = {
        event: { zh: '我也记得。我们对刚才的决定可能还有不同理解，可以以后再把它说清楚。', en: 'I remember it too. We may still understand that decision differently, and can clarify it later.' },
        clue: { zh: '我会把来源和不确定的部分一起发给你，不把推测说成事实。', en: 'I will send the source together with its uncertainty, without presenting inference as fact.' },
        boundary: { zh: '收到。我会按你说的边界联系；如果情况变化，我们再重新确认。', en: 'Understood. I will contact you within that boundary, and we can confirm again if circumstances change.' }
      };
      const reply = replies[state.firstContactIntent] || { zh: '我收到了。你不必现在把所有事情解释清楚，我们可以慢慢认识。', en: 'I received it. You do not need to explain everything now; we can get to know each other gradually.' };
      state.firstContactMessages.push({ sender: id, text: reply });
      thread.messages.push({ id: `first-reply-${Date.now()}`, sender: id, type: 'text', text: reply, time: '09:20' });
      thread.unread = 0;
      state.unreadCount = 0;
      state.firstContactSent = true;
      isTyping = false;
      render();
    }, Math.max(700, Math.min(1500, delay)));
  }

  function finishOnboarding() {
    state.onboardingCompleted = true;
    state.campaign.prologueComplete = true;
    state.campaign.phase = 'station';
    state.campaign.echoLink.hasOpened = true;
    if (state.journeys[state.selectedNpcId]) state.journeys[state.selectedNpcId].onboardingComplete = true;
    const currentSave = [...(state.saves || [])].reverse().find((item) => item.npcId === state.selectedNpcId && item.choiceId === state.selectedRescueChoice);
    if (currentSave) currentSave.snapshot = {
      playerName: state.playerName,
      prologueChoice: state.prologueChoice,
      selectedNpcId: state.selectedNpcId,
      selectedRescueChoice: state.selectedRescueChoice,
      journeys: JSON.parse(JSON.stringify(state.journeys)),
      campaign: JSON.parse(JSON.stringify(state.campaign)),
      knownNpcIds: [...state.knownNpcIds],
      contactNpcIds: [...state.contactNpcIds],
      hiddenFlags: [...state.hiddenFlags],
      resultData: JSON.parse(JSON.stringify(state.resultData)),
      firstContactMessages: JSON.parse(JSON.stringify(state.firstContactMessages)),
      firstContactSent: state.firstContactSent,
      onboardingCompleted: true
    };
    state.resumeScreen = 'observatory-home';
    go('observatory-home');
  }

  function ensureMainlineCharacter(chapter = currentMainlineChapter()) {
    const id = chapter.characterId;
    if (!state.journeys[id]) state.journeys[id] = createJourney(id);
    state.journeys[id].met = true;
    state.knownNpcIds = [...new Set([...(state.knownNpcIds || []), id])];
    state.contactNpcIds = [...new Set([...(state.contactNpcIds || []), id])];
    state.activeCharacterId = id;
    const terminal = state.campaign.echoLink;
    terminal.hasOpened = true;
    const thread = terminal.conversations[id];
    chapter.dialogue.forEach((line, index) => {
      const messageId = `mainline-${chapter.id}-intro-${index}`;
      if (!thread.messages.some((message) => message.id === messageId)) {
        thread.messages.push({ id: messageId, sender: id, type: 'text', text: line.text, time: `09:${21 + index}` });
      }
    });
  }

  function openMainline() {
    const progress = mainlineState();
    if (!['finale', 'resolved'].includes(progress.phase)) ensureMainlineCharacter();
    state.screen = 'mainline-chapter';
    state.resumeScreen = 'mainline-chapter';
    render();
  }

  function recordMainlineResponse(chapter, inputText = '') {
    const progress = mainlineState();
    const intent = chapter.intents.find((item) => item.id === progress.selectedIntent) || null;
    const clean = String(inputText || '').trim().slice(0, 260);
    const response = {
      chapterId: chapter.id,
      characterId: chapter.characterId,
      intentId: intent?.id || null,
      text: clean,
      at: new Date().toISOString(),
      branchId: state.campaign.activeBranchId
    };
    progress.responses.push(response);
    progress.responses = progress.responses.slice(-20);
    if (intent) applyRelationshipDelta(intent.delta, state.journeys[chapter.characterId]);
    if (clean) {
      const thread = state.campaign.echoLink.conversations[chapter.characterId];
      thread.messages.push({ id: `mainline-player-${chapter.id}-${Date.now()}`, sender: 'player', type: 'text', text: clean, time: '09:23', privateIntent: intent?.id || 'uncertain' });
    }
    progress.updatedAt = response.at;
    return response;
  }

  function completeMainlineChapter(chapter = currentMainlineChapter()) {
    const progress = mainlineState();
    if (!progress.confirmedAnchorIds.includes(chapter.anchor.id)) progress.confirmedAnchorIds.push(chapter.anchor.id);
    if (!state.campaign.clues.some((clue) => clue.id === chapter.anchor.id)) {
      state.campaign.clues.push({
        id: chapter.anchor.id,
        text: JSON.parse(JSON.stringify(chapter.anchor.proves)),
        source: JSON.parse(JSON.stringify(chapter.anchor.source)),
        confidence: chapter.anchor.confidence,
        knownBy: [...chapter.anchor.knownBy]
      });
    }
    if (!state.campaign.knowledge.some((item) => item.id === `knowledge-${chapter.anchor.id}`)) {
      state.campaign.knowledge.push({
        id: `knowledge-${chapter.anchor.id}`,
        text: JSON.parse(JSON.stringify(chapter.anchor.discovered)),
        source: JSON.parse(JSON.stringify(chapter.anchor.source)),
        confidence: chapter.anchor.confidence,
        knownBy: [...chapter.anchor.knownBy]
      });
    }
    const journey = state.journeys[chapter.characterId];
    if (journey) {
      journey.onboardingComplete = true;
      if (!journey.memories.some((memory) => memory.id === chapter.anchor.id)) {
        journey.memories.unshift({
          id: chapter.anchor.id,
          section: 'pinned',
          text: JSON.parse(JSON.stringify(chapter.anchor.proves)),
          source: JSON.parse(JSON.stringify(chapter.anchor.source)),
          pinned: true,
          permanent: true,
          type: 'event',
          worldId: state.campaign.currentWorldId,
          branchId: state.campaign.activeBranchId,
          providedBy: chapter.characterId,
          confidence: chapter.anchor.confidence,
          emotionalIntensity: 3,
          private: false,
          obsolete: false,
          crossWorld: chapter.characterId === 'lichuan' || chapter.characterId === 'zhoutang'
        });
      }
    }
    const thread = state.campaign.echoLink.conversations[chapter.characterId];
    const resultMessageId = `mainline-${chapter.id}-result`;
    if (!thread.messages.some((message) => message.id === resultMessageId)) {
      thread.messages.push({ id: resultMessageId, sender: chapter.characterId, type: 'text', text: chapter.anchor.next, time: '09:24' });
    }
    progress.phase = 'result';
    progress.selectedIntent = null;
    progress.sampleFeedback = null;
    progress.updatedAt = new Date().toISOString();
    state.unreadCount = Math.max(0, Number(state.unreadCount || 0)) + 1;
    render();
  }

  function investigateMainline() {
    const progress = mainlineState();
    if (progress.phase !== 'briefing') return;
    const chapter = currentMainlineChapter();
    ensureMainlineCharacter(chapter);
    recordMainlineResponse(chapter, document.getElementById('mainline-input')?.value || '');
    if (chapter.sample) {
      progress.phase = 'sample';
      progress.sampleChoice = null;
      progress.sampleFeedback = null;
      return render();
    }
    completeMainlineChapter(chapter);
  }

  function chooseMainlineSample(sampleId) {
    const progress = mainlineState();
    const chapter = currentMainlineChapter();
    if (progress.phase !== 'sample' || !chapter.sample) return;
    const option = chapter.sample.options.find((item) => item.id === sampleId);
    if (!option) return;
    progress.sampleChoice = option.id;
    if (!option.correct) {
      progress.sampleFeedback = 'retry';
      return render();
    }
    progress.sampleFeedback = 'correct';
    completeMainlineChapter(chapter);
  }

  function advanceMainline() {
    const progress = mainlineState();
    if (progress.phase !== 'result') return;
    if (Number(progress.chapterIndex || 0) >= mainlineContent.chapters.length - 1) {
      progress.phase = 'finale';
      progress.selectedIntent = null;
      progress.updatedAt = new Date().toISOString();
      return render();
    }
    progress.chapterIndex = Number(progress.chapterIndex || 0) + 1;
    progress.phase = 'briefing';
    progress.selectedIntent = null;
    progress.sampleChoice = null;
    progress.sampleFeedback = null;
    progress.updatedAt = new Date().toISOString();
    ensureMainlineCharacter();
    render();
  }

  function resolveMainline(decision) {
    const progress = mainlineState();
    const choice = mainlineContent.finale.choices.find((item) => item.id === decision);
    if (progress.phase !== 'finale' || !choice) return;
    if (choice.requiresTrust && !mainlineTrustUnlocked()) {
      toast(langText('需要先与五位协助者都建立基础信任。', 'Build basic trust with all five allies first.'));
      return;
    }
    progress.finalDecision = decision;
    progress.completed = true;
    progress.phase = 'resolved';
    progress.updatedAt = new Date().toISOString();
    const thread = state.campaign.echoLink.conversations.sui;
    const messages = {
      restore: langText('我回来了。但主镜也已经看见你们了。先不要替我决定下一步。', 'I am back. But the primary lens has seen all of you. Do not decide my next step for me.'),
      echo: langText('回声通道稳定了。我还不能回到你所在的世界，但这一次，我的名字不会再被静默删除。', 'The echo channel is stable. I cannot return to your world yet, but this time my name will not be silently deleted.'),
      publish: langText('我看见公开记录了。谢谢你没有把我的存在变成只有你能决定的秘密。', 'I saw the public record. Thank you for not turning my existence into a secret only you could decide.')
    };
    thread.messages.push({ id: `mainline-xucheng-${Date.now()}`, sender: 'sui', type: 'text', text: messages[decision], time: '—:—' });
    thread.unread = Number(thread.unread || 0) + 1;
    state.unreadCount = Number(state.unreadCount || 0) + 1;
    render();
  }

  function openWeaverMainline() {
    if (!mainlineState().completed) {
      toast(langText('先完成许澄的五处存在锚点与最终决定。', 'Complete Xu Cheng’s five existence anchors and final decision first.'));
      state.screen = 'mainline-chapter';
      return render();
    }
    const progress = weaverState();
    if (progress.completed) return openWeaverWorkshop();
    state.screen = 'weaver-mainline';
    state.resumeScreen = 'weaver-mainline';
    render();
  }

  function recordWeaverResponse(stageId) {
    const progress = weaverState();
    const text = String(document.getElementById('weaver-response')?.value || '').trim().slice(0, 300);
    progress.responses.push({ stageId, intentId: progress.selectedIntent || null, text, at: new Date().toISOString(), branchId: state.campaign.activeBranchId });
    progress.responses = progress.responses.slice(-20);
    progress.selectedIntent = null;
  }

  function beginWeaverThreads() {
    const progress = weaverState();
    if (progress.phase !== 'arrival') return;
    recordWeaverResponse('arrival');
    progress.phase = 'threads';
    progress.threadIndex = 0;
    render();
  }

  function chooseWeaverThread(threadId, optionId) {
    const progress = weaverState();
    const thread = weaverContent.threads.find((item) => item.id === threadId);
    if (progress.phase !== 'threads' || !thread?.options.some((option) => option.id === optionId)) return;
    progress.threadValues[threadId] = optionId;
    render();
  }

  function confirmWeaverThread() {
    const progress = weaverState();
    const thread = currentWeaverThread();
    if (progress.phase !== 'threads') return;
    if (!progress.threadValues[thread.id]) return toast(langText('先选择一项初始结构；回声醒来后仍可以重新选择。', 'Choose a starting structure first; the echo may choose again after waking.'));
    recordWeaverResponse(thread.id);
    if (!progress.confirmedThreadIds.includes(thread.id)) progress.confirmedThreadIds.push(thread.id);
    if (progress.threadIndex >= weaverContent.threads.length - 1) {
      progress.phase = 'review';
      progress.observerLevel = 7;
    } else {
      progress.threadIndex += 1;
    }
    render();
  }

  function readTutorialNpcForm() {
    const value = (id, fallback = '') => String(document.getElementById(id)?.value ?? fallback).trim();
    return {
      ...weaverState().tutorialNpc,
      name: value('tutorial-npc-name'), expression: value('tutorial-npc-expression'), ageRange: value('tutorial-npc-age'), appearance: value('tutorial-npc-appearance'),
      voice: value('tutorial-npc-voice'), desire: value('tutorial-npc-desire'), contradiction: value('tutorial-npc-contradiction'), memory: value('tutorial-npc-memory'),
      initialRelation: value('tutorial-npc-relation'), boundary: value('tutorial-npc-boundary')
    };
  }

  function readTutorialWorldForm() {
    const value = (id, fallback = '') => String(document.getElementById(id)?.value ?? fallback).trim();
    return {
      ...weaverState().tutorialWorld,
      name: value('tutorial-world-name'), type: value('tutorial-world-type'), rule: value('tutorial-world-rule'), playerIdentity: value('tutorial-world-identity'),
      sharedPlace: value('tutorial-world-place'), conflict: value('tutorial-world-conflict')
    };
  }

  function confirmTutorialNpc() {
    const progress = weaverState();
    if (progress.phase !== 'npc') return;
    const npc = readTutorialNpcForm();
    const required = ['name', 'desire', 'contradiction', 'memory', 'initialRelation', 'boundary'];
    if (required.some((key) => !npc[key])) return toast(langText('请完成名字、愿望、矛盾、记忆、初始关系与边界。', 'Complete name, desire, tension, memory, initial relationship, and boundary.'));
    progress.tutorialNpc = npc;
    progress.tutorialNpcCreated = true;
    if (!progress.createdNpcs.some((item) => item.tutorial)) {
      progress.createdNpcs.push({ ...npc, id: 'tutorial-npc-nanxing', tutorial: true, createdAt: new Date().toISOString(), worldId: null });
    }
    progress.phase = 'world';
    render();
  }

  function confirmTutorialWorld() {
    const progress = weaverState();
    if (progress.phase !== 'world') return;
    const world = readTutorialWorldForm();
    const required = ['name', 'type', 'rule', 'playerIdentity', 'sharedPlace', 'conflict'];
    if (required.some((key) => !world[key])) return toast(langText('请完成世界名称、类型、规则、身份、共同地点与初始矛盾。', 'Complete world name, type, rule, identity, shared place, and opening conflict.'));
    progress.tutorialWorld = world;
    progress.tutorialWorldCreated = true;
    if (!progress.createdWorlds.some((item) => item.tutorial)) {
      progress.createdWorlds.push({ ...world, id: 'tutorial-world-tide-city', tutorial: true, createdAt: new Date().toISOString() });
    }
    const npc = progress.createdNpcs.find((item) => item.tutorial);
    if (npc) npc.worldId = 'tutorial-world-tide-city';
    progress.completed = true;
    progress.workshopUnlocked = true;
    progress.observerLevel = 8;
    progress.phase = 'complete';
    progress.completedAt = new Date().toISOString();
    state.campaign.currentWorldId = 'tutorial-world-tide-city';
    if (!state.campaign.knowledge.some((item) => item.id === 'knowledge-first-free-thread')) {
      state.campaign.knowledge.push({
        id: 'knowledge-first-free-thread',
        text: langText(`你为${progress.tutorialNpc.name}建立了${progress.tutorialWorld.name}；角色拥有身份、愿望、记忆、边界与可持续的世界。`, `You established ${progress.tutorialWorld.name} for ${progress.tutorialNpc.name}; the character has identity, desire, memory, boundaries, and a sustainable world.`),
        source: langText('EchoLoom · 第一次创生', 'EchoLoom · first creation'), confidence: 'high', knownBy: ['player', ...characterIds, 'sui']
      });
    }
    render();
  }

  function openWeaverWorkshop() {
    const progress = weaverState();
    if (!progress.workshopUnlocked) return openWeaverMainline();
    state.screen = 'creator';
    state.resumeScreen = 'creator';
    render();
  }

  function openXuChengThread() {
    const progress = mainlineState();
    if (!progress.completed) return;
    state.campaign.echoLink.hasOpened = true;
    state.campaign.echoLink.activeTab = 'messages';
    state.campaign.echoLink.activeThreadId = 'sui';
    state.screen = 'echolink';
    state.resumeScreen = 'echolink';
    render();
  }

  function openDelayedMessage() {
    state.campaign.echoLink.hasOpened = true;
    state.campaign.echoLink.activeTab = 'messages';
    state.campaign.echoLink.activeThreadId = 'delayed-w17';
    state.screen = 'echolink';
    state.resumeScreen = 'echolink';
    render();
  }

  function startSignalBranch() {
    if (state.archives.length < 6) createArchive(langText('返回五处信号前', 'Before returning to five signals'));
    const nextId = `branch-${Date.now()}-new`;
    state.journeys = {};
    state.campaign = createCampaign();
    state.campaign.activeBranchId = nextId;
    state.currentBranchId = nextId;
    state.selectedNpcId = null;
    state.selectedRescueChoice = null;
    state.resultData = null;
    state.knownNpcIds = [];
    state.contactNpcIds = [];
    state.unreadCount = 0;
    state.firstContactSent = false;
    state.firstContactIntent = null;
    state.firstContactMessages = [];
    state.onboardingCompleted = false;
    state.screen = 'signal-scan';
    state.resumeScreen = 'signal-scan';
    render();
  }

  function restoreOnboardingSave(saveId) {
    const node = (state.saves || []).find((item) => item.id === saveId);
    const snapshot = node?.snapshot;
    if (!snapshot) return;
    state.playerName = snapshot.playerName || state.playerName;
    state.prologueChoice = snapshot.prologueChoice || state.prologueChoice;
    state.selectedNpcId = snapshot.selectedNpcId || node.npcId;
    state.selectedRescueChoice = snapshot.selectedRescueChoice || node.choiceId;
    state.activeCharacterId = state.selectedNpcId;
    state.journeys = JSON.parse(JSON.stringify(snapshot.journeys || {}));
    state.campaign = JSON.parse(JSON.stringify(snapshot.campaign || createCampaign()));
    state.knownNpcIds = [...(snapshot.knownNpcIds || Object.keys(state.journeys).filter((id) => state.journeys[id]?.met))];
    state.contactNpcIds = [...(snapshot.contactNpcIds || [state.selectedNpcId])];
    state.hiddenFlags = [...(snapshot.hiddenFlags || [])];
    if (snapshot.resultData) state.resultData = JSON.parse(JSON.stringify(snapshot.resultData));
    else {
      const rescue = onboardingContent.rescues[state.selectedNpcId];
      const choice = rescue?.choices.find((item) => item.id === state.selectedRescueChoice);
      state.resultData = choice ? { result: choice.result, knownIds: [state.selectedNpcId, ...rescue.supportIds], deltas: JSON.parse(JSON.stringify(choice.deltas)) } : null;
    }
    state.firstContactMessages = JSON.parse(JSON.stringify(snapshot.firstContactMessages || []));
    state.firstContactSent = Boolean(snapshot.firstContactSent);
    state.onboardingCompleted = Boolean(snapshot.onboardingCompleted);
    state.currentBranchId = node.id;
    state.campaign.activeBranchId = node.id;
    state.screen = state.onboardingCompleted ? 'observatory-home' : 'event-result';
    state.resumeScreen = state.screen;
    render();
  }

  function startCharacter(characterId) {
    if (!characters[characterId]) return;
    state.journeys = state.journeys || {};
    const route = prologueRoutes[characterId];
    if (!state.campaign.firstSignal) {
      characterIds.forEach((id) => { if (!state.journeys[id]) state.journeys[id] = createJourney(id); });
      state.campaign.firstSignal = characterId;
      state.campaign.observationInsight = 1;
      Object.entries(route?.impact || {}).forEach(([id, delta]) => applyRelationshipDelta(delta, state.journeys[id]));
    }
    if (!state.journeys[characterId]) state.journeys[characterId] = createJourney(characterId);
    if (!state.journeys[characterId].met && route?.clue && !state.campaign.clues.some((clue) => clue.id === route.clue.id)) {
      state.campaign.clues.push(JSON.parse(JSON.stringify(route.clue)));
    }
    state.journeys[characterId].met = true;
    state.activeCharacterId = characterId;
    state.screen = state.journeys[characterId].onboardingComplete ? 'home' : 'story';
    isTyping = false;
    isGenerating = false;
    render();
  }

  function applyRelationshipDelta(delta = {}, journey = activeJourney()) {
    const relationship = journey?.relationship;
    if (!relationship) return;
    Object.entries(delta).forEach(([key, value]) => {
      const current = Number(relationship[key] || 0);
      relationship[key] = Math.max(0, Math.min(10, Math.round((current + Number(value || 0)) * 4) / 4));
    });
  }

  function applyEngineResult(result, journey = activeJourney()) {
    if (!journey || !result) return;
    applyRelationshipDelta(result.relationshipDelta, journey);
    Object.entries(result.playerSignalDelta || {}).forEach(([key, value]) => {
      journey.playerSignals[key] = Math.max(0, Math.min(10, Number(journey.playerSignals[key] || 0) + Number(value || 0)));
    });
    (result.behaviourTags || []).forEach((tag) => journey.behaviourHistory.push({ tag, at: new Date().toISOString(), branchId: state.campaign.activeBranchId }));
    journey.behaviourHistory = journey.behaviourHistory.slice(-50);
    if (result.relationshipSuggestion) journey.relationship.suggestedConversation = result.relationshipSuggestion;
  }

  function recordOpeningDecision(text, journey = activeJourney()) {
    const character = activeCharacter();
    if (!character || !journey || journey.storyStep !== 0 || journey.openingDecision) return;
    const option = character.options.find((item) => localText(item) === text);
    if (!option?.id) return;
    journey.openingDecision = { id: option.id, text, at: new Date().toISOString(), branchId: state.campaign.activeBranchId };
    journey.routeFlags = Array.isArray(journey.routeFlags) ? journey.routeFlags : [];
    if (option.routeFlag && !journey.routeFlags.includes(option.routeFlag)) journey.routeFlags.push(option.routeFlag);
    applyRelationshipDelta(option.impact || {}, journey);
    if (option.hiddenTag) {
      journey.behaviourHistory.push({ tag: option.hiddenTag, hidden: true, at: new Date().toISOString(), branchId: state.campaign.activeBranchId });
      const hiddenFlags = state.campaign.echoLink.hiddenFlags;
      if (!hiddenFlags.some((flag) => flag.id === `${character.id}-${option.routeFlag}`)) hiddenFlags.push({ id: `${character.id}-${option.routeFlag}`, characterId: character.id, tag: option.hiddenTag, status: 'hidden', branchId: state.campaign.activeBranchId });
    }
  }

  function applyDelayedOpeningConsequence(result, journey = activeJourney()) {
    if (state.activeCharacterId !== 'zhoutang' || journey.storyStep < 1 || !journey.routeFlags?.includes('concealed-copy') || journey.routeFlags.includes('concealed-copy-revealed')) return result;
    journey.routeFlags.push('concealed-copy-revealed');
    const hiddenFlag = state.campaign.echoLink.hiddenFlags.find((flag) => flag.id === 'zhoutang-concealed-copy');
    if (hiddenFlag) hiddenFlag.status = 'revealed';
    result.response = `${langText('终端刚刚校验出一份暗中复制的完整日志。你本来可以直接拒绝；表面同意让我失去了判断风险的机会。访问权限现在降到最低。', 'The terminal just verified a secret copy of the full log. You could have refused directly; outward agreement denied me the chance to judge the risk. Access is now reduced to minimum.')} ${result.response}`;
    result.relationshipDelta = { ...result.relationshipDelta, trust: Number(result.relationshipDelta?.trust || 0) - 2.5, safety: Number(result.relationshipDelta?.safety || 0) - 1.5, strain: Number(result.relationshipDelta?.strain || 0) + 2 };
    result.behaviourTags = [...(result.behaviourTags || []), 'deceptionRevealed'];
    journey.memories.unshift({ id: `zt-reveal-${Date.now()}`, section: 'unresolved', text: langText('暗中复制的完整日志被终端发现，周棠将访问权限降到最低', 'The terminal exposed the secret full-log copy, and Zhou Tang reduced access to minimum'), source: langText('第一章 · 权限复核', 'Chapter One · Access review'), pinned: false, permanent: true, type: 'event', worldId: 'station', branchId: state.campaign.activeBranchId, providedBy: 'echolink', confidence: 'high', emotionalIntensity: 3, private: false, obsolete: false, crossWorld: false });
    return result;
  }

  function sendStory(text) {
    const clean = String(text || '').trim();
    const journey = activeJourney();
    if (!clean || !journey || isTyping) return;
    recordOpeningDecision(clean, journey);
    journey.storyMessages.push({ id: `su-${Date.now()}`, role: 'user', text: clean });
    isTyping = true;
    render();
    window.setTimeout(() => {
      const result = applyDelayedOpeningConsequence(window.EchoEngine.storyReply(clean, engineState()), journey);
      journey.storyMessages.push({ id: `sc-${Date.now()}`, role: 'character', text: result.response, memoryRef: result.memoryRef });
      journey.storyStep += 1;
      journey.interactionCount += 1;
      applyEngineResult(result, journey);
      isTyping = false;
      render();
    }, 650);
  }

  function sendChat(text) {
    const clean = String(text || '').trim();
    const journey = activeJourney();
    if (!clean || !journey || isTyping) return;
    const userId = `cu-${Date.now()}`;
    journey.chatMessages.push({ id: userId, role: 'user', text: clean });
    const echoThread = echoLinkState()?.conversations?.[state.activeCharacterId];
    if (echoThread) echoThread.messages.push({ id: `el-${userId}`, sender: 'player', type: 'text', text: clean, time: echoTime() });
    journey.interactionCount += 1;
    isTyping = true;
    render();
    window.setTimeout(() => {
      const result = window.EchoEngine.chatReply(clean, engineState());
      const replyId = `cc-${Date.now()}`;
      journey.chatMessages.push({ id: replyId, role: 'character', text: result.response, memoryRef: result.memoryRef });
      if (echoThread) echoThread.messages.push({ id: `el-${replyId}`, sender: state.activeCharacterId, type: 'text', text: result.response, time: echoTime() });
      applyEngineResult(result, journey);
      updateCommunicationPulse(journey, result, 'text', true);
      isTyping = false;
      render();
    }, 620);
  }

  function echoTime() {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  }

  function applyPrivateIntent(journey, intent) {
    if (!journey) return;
    const key = intent === 'friendship' ? 'friendship' : intent === 'hidden-romance' ? 'romantic' : intent === 'uncertain' ? 'uncertainty' : null;
    if (key) journey.playerSignals[key] = Math.min(10, Math.round((Number(journey.playerSignals[key] || 0) + .5) * 4) / 4);
  }

  function updateCommunicationPulse(journey, result, channel = 'text', replied = true) {
    const pulse = journey?.communicationPulse;
    if (!pulse) return;
    if (replied) pulse.responseReliability = Math.min(10, Number(pulse.responseReliability || 0) + .25);
    pulse.initiativeBalance = Math.max(0, Math.min(10, Number(pulse.initiativeBalance || 0) + (replied ? .1 : -.1)));
    if (['support','trust','repair','flirt','sexual_signal'].includes(result?.intent)) pulse.topicDepth = Math.min(10, Number(pulse.topicDepth || 0) + .5);
    else if (result?.intent) pulse.topicDepth = Math.min(10, Number(pulse.topicDepth || 0) + .15);
    pulse.channelComfort[channel] = Math.min(10, Number(pulse.channelComfort[channel] || 0) + .25);
    pulse.lastInteractionAt = new Date().toISOString();
    pulse.pendingReply = !replied;
  }

  function echoReplyDelay(contactId, journey, channel = 'text', threadType = 'private') {
    return window.EchoReplyTiming.calculate({
      contactId,
      relationship: journey?.relationship,
      communicationPulse: journey?.communicationPulse,
      channel,
      threadType
    });
  }

  function scheduleEchoReply(thread, speakerId, journey, channel, onReply) {
    if (!thread || echoPendingReplies.has(thread.id)) return false;
    const token = `${thread.id}-${++echoReplySequence}`;
    const pending = { token, threadId: thread.id, speakerId, timerId: null };
    echoPendingReplies.set(thread.id, pending);
    render();
    pending.timerId = window.setTimeout(() => {
      if (echoPendingReplies.get(thread.id)?.token !== token) return;
      echoPendingReplies.delete(thread.id);
      onReply();
      render();
    }, echoReplyDelay(speakerId, journey, channel, thread.type));
    return true;
  }

  function clearEchoPendingReplies() {
    echoPendingReplies.forEach((pending) => {
      if (pending.timerId != null) window.clearTimeout(pending.timerId);
    });
    echoPendingReplies.clear();
  }

  function sendEchoMessage() {
    const terminal = echoLinkState();
    const thread = terminal?.conversations?.[terminal.activeThreadId];
    if (!thread || echoPendingReplies.has(thread.id)) return;
    const channel = terminal.composerChannel || 'text';
    const raw = document.getElementById('echo-message-input')?.value.trim() || '';
    const clean = raw || (channel === 'voice' ? langText('语音留言 · 8 秒', 'Voice note · 8 seconds') : channel === 'photo' ? langText('发送了一张当前场景照片', 'Sent a photo of the current scene') : '');
    if (!clean) return;
    thread.messages.push({ id: `el-u-${Date.now()}`, sender: 'player', type: channel, text: clean, time: echoTime(), privateIntent: terminal.privateIntent });
    thread.unread = 0;

    if (thread.type === 'group') {
      const knownBy = thread.participantIds.filter((id) => id !== 'player');
      state.campaign.knowledge.push({ id: `knowledge-group-${Date.now()}`, text: clean, source: langText('EchoLink · 第七异常观测小组', 'EchoLink · Seventh Anomaly Group'), confidence: 'self-reported', knownBy: ['player', ...knownBy] });
      const lower = clean.toLowerCase();
      const speaker = clean.includes('隐私') || clean.includes('权限') || clean.includes('日志') || ['privacy', 'access', 'permission', 'log'].some((word) => lower.includes(word))
        ? 'zhoutang'
        : clean.includes('故事') || clean.includes('世界') || clean.includes('梦') || clean.includes('角色') || ['story', 'world', 'dream', 'npc'].some((word) => lower.includes(word))
          ? 'wensheng'
          : clean.includes('风险') || lower.includes('risk')
            ? 'shenyao'
            : clean.includes('记忆') || lower.includes('memory') ? 'qian' : 'lichuan';
      const replies = {
        qian: langText('收到。我会把这条消息和原始副本分开保存，避免把推测写成事实。', 'Received. I will store this separately from the original copy so inference is not recorded as fact.'),
        shenyao: langText('已标记为主控自述。还需要独立来源才能提高可信度。', 'Marked as player testimony. An independent source is still required to raise confidence.'),
        lichuan: langText('我看见了。先不转发，等你说清楚希望谁知道。', 'I saw it. I will not forward it until you say who should know.'),
        zhoutang: langText('先确认这条信息的可见范围。与任务无关的私人字段不要放进群组日志。', 'Confirm the visibility scope first. Private fields unrelated to the task should not enter the group log.'),
        wensheng: langText('我先把它当成一个版本，而不是结论。这里的人如果有不同说法，也应该被保留下来。', 'I will treat it as one version, not a conclusion. If the people here disagree, their versions should remain too.')
      };
      scheduleEchoReply(thread, speaker, state.journeys?.[speaker], 'text', () => {
        thread.messages.push({ id: `el-g-${Date.now()}`, sender: speaker, type: 'text', text: replies[speaker], time: echoTime() });
      });
      return;
    }

    if (thread.type === 'delayed') {
      thread.messages.push({ id: `el-d-${Date.now()}`, sender: 'system', type: 'system', text: langText('消息已离开当前世界线；预计送达时间未知。', 'Message left the current worldline; delivery time is unknown.'), time: '⌁' });
      terminal.pendingEvents.delayedW17 = 'reply-sent';
      return render();
    }

    const contactId = thread.participantIds.find((id) => id !== 'player');
    const journey = state.journeys?.[contactId];
    if (!journey) {
      const sideReply = contactId === 'sui'
        ? langText('我收到了。这里的字会消失，但你留下的理由还在。', 'I received it. The words disappear here, but the reason you left remains.')
        : langText('已登记。若涉及失联人员，请附上最后出现的世界编号。', 'Logged. For a missing person, include the last known world number.');
      scheduleEchoReply(thread, contactId, null, channel, () => {
        thread.messages.push({ id: `el-side-${Date.now()}`, sender: contactId, type: 'text', text: sideReply, time: echoTime() });
      });
      return;
    }

    state.activeCharacterId = contactId;
    applyPrivateIntent(journey, terminal.privateIntent);
    journey.interactionCount += 1;
    journey.chatMessages.push({ id: `el-sync-user-${Date.now()}`, role: 'user', text: clean, channel, privateIntent: terminal.privateIntent });
    const result = window.EchoEngine.chatReply(clean, engineState());
    const delayed = contactId === 'shenyao' && channel === 'voice';
    if (delayed) {
      thread.messages.push({ id: `el-pending-${Date.now()}`, sender: 'system', type: 'system', text: langText('沈曜正在执行观测任务。语音已送达，预计 17 分钟后可处理；未使用紧急标记。', 'Shen Yao is observing. Voice delivered; estimated response in 17 minutes. Emergency flag not used.'), time: echoTime() });
      updateCommunicationPulse(journey, result, channel, false);
      return render();
    }
    journey.communicationPulse.pendingReply = true;
    journey.communicationPulse.lastInteractionAt = new Date().toISOString();
    scheduleEchoReply(thread, contactId, journey, channel, () => {
      thread.messages.push({ id: `el-r-${Date.now()}`, sender: contactId, type: contactId === 'lichuan' && channel === 'voice' ? 'voice' : 'text', text: result.response, time: echoTime() });
      journey.chatMessages.push({ id: `el-sync-${Date.now()}`, role: 'character', text: result.response, memoryRef: result.memoryRef });
      applyEngineResult(result, journey);
      updateCommunicationPulse(journey, result, channel, true);
    });
  }

  function resolveNightTrain(choice) {
    const terminal = echoLinkState();
    const thread = terminal.conversations.lichuan;
    const journey = state.journeys.lichuan;
    if (!thread || !journey || echoPendingReplies.has(thread.id) || terminal.pendingEvents.nightTrain !== 'available') return;
    const outcomes = {
      join: { user: langText('行动意图：立即同行', 'Action intent: go together now'), reply: langText('好。定位发你，但你随时可以改主意。', 'All right. I sent the location, and you can change your mind at any point.'), delta: { familiarity: 1, reciprocity: .75, compatibility: .75 } },
      ask: { user: langText('行动意图：先确认风险与目的地', 'Action intent: ask about risk and destination first'), reply: langText('合理。风险三项，退路两条。我先发完整路线，你看完再决定。', 'Reasonable. Three risks, two exits. I will send the full route before you decide.'), delta: { trust: .75, safety: .75 } },
      alternative: { user: langText('行动意图：今晚拒绝，提出明日下午调查旧站台', 'Action intent: decline tonight and propose investigating tomorrow'), reply: langText('可以。拒绝不是失约——明天下午这件事，我等你确认。', 'That works. Refusal is not breaking a promise—I will wait for your confirmation tomorrow.'), delta: { safety: .5 } }
    };
    const outcome = outcomes[choice];
    if (!outcome) return;
    thread.messages.push({ id: `el-event-u-${Date.now()}`, sender: 'player', type: 'system', text: outcome.user, time: echoTime() });
    applyRelationshipDelta(outcome.delta, journey);
    if (choice === 'alternative') {
      const commitment = { id: `promise-old-platform-${Date.now()}`, with: 'lichuan', due: 'next-afternoon', status: 'pending', text: langText('明天下午调查旧站台', 'Investigate the old platform tomorrow afternoon'), branchId: state.campaign.activeBranchId };
      terminal.commitments.push(commitment);
      journey.memories.unshift({ id: commitment.id, section: 'pinned', text: commitment.text, source: langText('EchoLink · 黎川邀请', 'EchoLink · Li Chuan invitation'), pinned: true, permanent: true, type: 'promiseBoundary', worldId: state.campaign.currentWorldId, branchId: state.campaign.activeBranchId, providedBy: 'player', confidence: 'high', emotionalIntensity: 2, private: false, obsolete: false, crossWorld: false });
    }
    terminal.pendingEvents.nightTrain = choice;
    scheduleEchoReply(thread, 'lichuan', journey, 'text', () => {
      thread.messages.push({ id: `el-event-l-${Date.now()}`, sender: 'lichuan', type: 'text', text: outcome.reply, time: echoTime() });
    });
  }

  function keepEchoSilence() {
    const terminal = echoLinkState();
    const thread = terminal?.conversations?.[terminal.activeThreadId];
    if (!thread) return;
    if (thread.id === 'lichuan' && terminal.pendingEvents.nightTrain === 'available') {
      terminal.pendingEvents.nightTrain = 'departed-without-reply';
      thread.messages.push({ id: `el-silence-${Date.now()}`, sender: 'system', type: 'system', text: langText('你暂时没有回复。黎川按自己的决定出发；普通沉默没有降低关系值。', 'You did not reply yet. Li Chuan left by his own choice; ordinary silence did not lower the relationship.'), time: echoTime() });
    } else {
      thread.messages.push({ id: `el-silence-${Date.now()}`, sender: 'system', type: 'system', text: langText('已标记为稍后回复。没有明确承诺或紧急责任，因此关系不受惩罚。', 'Marked for later reply. With no explicit promise or emergency duty, the relationship is not penalised.'), time: echoTime() });
    }
    render();
  }

  function resolveEchoPromise(outcome) {
    const terminal = echoLinkState();
    const promise = terminal?.commitments?.find((item) => item.with === state.activeCharacterId && item.status === 'pending');
    const journey = promise ? state.journeys?.[promise.with] : null;
    if (!promise || !journey) return;
    const results = {
      fulfilled: { delta: { trust: 1, commitment: .5 }, text: langText('你按约定来到旧站台。信任与承诺在行为发生后结算。', 'You arrived at the old platform as promised. Trust and commitment were settled after the action.') },
      explained: { delta: {}, text: langText('你提前说明无法前来。约定已调整，信任没有因缺席下降。', 'You explained in advance that you could not come. The plan changed without reducing trust.') },
      missed: { delta: { trust: -1.5, strain: 1 }, text: langText('你没有出现，也没有说明。黎川记录了这次失约；普通沉默与明确承诺的后果不同。', 'You did not arrive or explain. Li Chuan recorded the broken promise; ordinary silence and an explicit commitment have different consequences.') }
    };
    const result = results[outcome];
    if (!result) return;
    promise.status = outcome;
    promise.resolvedAt = new Date().toISOString();
    applyRelationshipDelta(result.delta, journey);
    terminal.conversations[promise.with]?.messages.push({ id: `el-promise-${Date.now()}`, sender: 'system', type: 'system', text: result.text, time: echoTime() });
    const memory = journey.memories.find((item) => item.id === promise.id);
    if (memory) memory.text = `${localText(promise.text)} · ${langText(outcome === 'fulfilled' ? '已兑现' : outcome === 'explained' ? '已提前说明变更' : '失约未解释', outcome === 'fulfilled' ? 'fulfilled' : outcome === 'explained' ? 'change explained early' : 'missed without explanation')}`;
    render();
  }

  function echoLinkCall() {
    const terminal = echoLinkState();
    const thread = terminal?.conversations?.shenyao;
    const journey = state.journeys?.shenyao;
    if (!thread || !journey) return;
    if (!journey.onboardingComplete) {
      thread.messages.push({ id: `el-call-pending-${Date.now()}`, sender: 'system', type: 'system', text: langText('实时通话尚未开放。可发送语音留言；紧急标记仅用于真实危机。', 'Live calls are not available yet. You may leave voice; emergency flags are for genuine crises only.'), time: echoTime() });
    } else {
      thread.messages.push({ id: `el-call-${Date.now()}`, sender: 'system', type: 'call', text: langText('通话 02:17 · 双方确认这次讨论只处理第 17 秒的数据。', 'Call 02:17 · Both agreed to discuss only the seventeenth-second data.'), time: echoTime() });
      journey.communicationPulse.channelComfort.call = Math.min(10, Number(journey.communicationPulse.channelComfort.call || 0) + .5);
    }
    render();
  }

  function sendGeneratedStory(text) {
    const clean = String(text || '').trim();
    const scene = getActiveScene();
    const journey = activeJourney();
    if (!clean || !scene || !journey || isTyping) return;
    scene.messages = scene.messages || [];
    scene.messages.push({ id: `gu-${Date.now()}`, role: 'user', text: clean });
    updateScene(scene);
    isTyping = true;
    render();
    window.setTimeout(() => {
      const result = window.EchoEngine.sceneReply(clean, scene, engineState());
      scene.messages.push({ id: `gc-${Date.now()}`, role: 'character', text: result.response, memoryRef: result.memoryRef });
      applyEngineResult(result, journey);
      journey.interactionCount += 1;
      updateScene(scene);
      isTyping = false;
      render();
    }, 650);
  }

  function updateScene(scene) {
    const journey = activeJourney();
    if (!journey) return;
    if (journey.scenePreview?.id === scene.id) journey.scenePreview = scene;
    const index = journey.generatedScenes.findIndex((item) => item.id === scene.id);
    if (index >= 0) journey.generatedScenes[index] = scene;
  }

  function generateSceneFromInput() {
    const journey = activeJourney();
    if (!journey || isGenerating) return;
    const input = document.getElementById('scene-prompt');
    journey.scenePrompt = input?.value.trim() || journey.scenePrompt || '';
    isGenerating = true;
    render();
    window.setTimeout(() => {
      journey.scenePreview = window.EchoEngine.generateScene(journey.scenePrompt, journey.selectedSceneId, engineState());
      journey.selectedSceneId = journey.scenePreview.sceneId;
      isGenerating = false;
      render();
    }, 900);
  }

  function startGeneratedScene() {
    const journey = activeJourney();
    if (!journey?.scenePreview) return;
    if (!journey.generatedScenes.find((scene) => scene.id === journey.scenePreview.id)) journey.generatedScenes.unshift(journey.scenePreview);
    journey.activeGeneratedSceneId = journey.scenePreview.id;
    go('generatedStory');
  }

  function saveScene(timeline) {
    const scene = getActiveScene();
    const journey = activeJourney();
    if (!scene || !journey) return;
    scene.timeline = timeline;
    updateScene(scene);
    if (!journey.generatedScenes.find((item) => item.id === scene.id)) journey.generatedScenes.unshift(scene);
    const memoryText = `${scene.title}${state.language === 'en' ? ': ' : '：'}${scene.prompt}`;
    const source = `Generated scene · ${scene.id}`;
    if (!journey.memories.find((memory) => localText(memory.source) === source)) {
      journey.memories.push({ id: `m-${Date.now()}`, section: timeline === 'main' ? 'pinned' : 'aboutUser', text: memoryText, source, pinned: timeline === 'main', permanent: timeline === 'main', type: 'event', worldId: state.campaign.currentWorldId, branchId: state.campaign.activeBranchId, providedBy: 'player', confidence: 'high', emotionalIntensity: 2, private: false, obsolete: false, crossWorld: false });
    }
    toast(t(timeline === 'main' ? 'sceneSavedMain' : 'sceneSavedExtra'));
    render();
  }

  function saveMessageMemory(messageId) {
    const journey = activeJourney();
    const message = journey?.chatMessages.find((item) => item.id === messageId);
    if (!journey || !message) return;
    const text = localText(message.text);
    if (!journey.memories.some((memory) => localText(memory.text) === text)) {
      journey.memories.unshift({ id: `m-${Date.now()}`, section: 'pinned', text, source: langText('聊天 · 今天', 'Chat · Today'), pinned: true, permanent: true, type: 'event', worldId: state.campaign.currentWorldId, branchId: state.campaign.activeBranchId, providedBy: 'player', confidence: 'high', emotionalIntensity: 2, private: false, obsolete: false, crossWorld: false });
    }
    toast(t('memorySaved'));
    render();
  }

  function openMemoryModal(memoryId = null) {
    const journey = activeJourney();
    if (!journey) return;
    const memory = memoryId ? journey.memories.find((item) => item.id === memoryId) : null;
    if (memory && !['fact', 'event', 'promiseBoundary'].includes(memory.type)) {
      toast(langText('角色判断与反思不能被直接改写；你仍可删除它。', 'Character judgements and reflections cannot be directly rewritten; you may still delete them.'));
      return;
    }
    modalContext = { type: 'memory', memoryId };
    const value = memory ? localText(memory.text ?? (memory.textKey ? t(memory.textKey) : '')) : '';
    modalRoot.innerHTML = `<div class="modal-backdrop" data-action="modal-backdrop"><div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="memory-modal-title"><h2 id="memory-modal-title">${esc(memory ? t('memoryEditorTitle') : t('addEcho'))}</h2><p>${esc(t('addMemoryPrompt'))}</p><textarea id="memory-modal-input" class="memory-input" maxlength="300">${esc(value)}</textarea><div class="button-row"><button class="secondary-button" type="button" data-action="modal-cancel">${esc(t('cancel'))}</button><button class="primary-button sage" type="button" data-action="modal-save">${esc(t('save'))}</button></div></div></div>`;
    requestAnimationFrame(() => document.getElementById('memory-modal-input')?.focus());
  }

  function closeModal() {
    modalContext = null;
    modalRoot.innerHTML = '';
  }

  function saveModal() {
    const journey = activeJourney();
    if (!modalContext || !journey) return closeModal();
    const text = document.getElementById('memory-modal-input')?.value.trim();
    if (!text) return;
    if (modalContext.memoryId) {
      const memory = journey.memories.find((item) => item.id === modalContext.memoryId);
      if (memory) { memory.text = text; memory.textKey = null; }
    } else {
      journey.memories.unshift({ id: `m-${Date.now()}`, section: 'pinned', text, source: langText('手动添加 · 今天', 'Manually added · Today'), pinned: true, permanent: true, type: 'fact', worldId: state.campaign.currentWorldId, branchId: state.campaign.activeBranchId, providedBy: 'player', confidence: 'medium', emotionalIntensity: 1, private: false, obsolete: false, crossWorld: false });
    }
    closeModal();
    render();
  }

  function togglePin(memoryId) {
    const memory = activeJourney()?.memories.find((item) => item.id === memoryId);
    if (!memory) return;
    memory.pinned = !memory.pinned;
    if (memory.pinned) memory.section = 'pinned';
    else if (memory.section === 'pinned') memory.section = 'aboutUser';
    render();
  }

  function deleteMemory(memoryId) {
    const journey = activeJourney();
    if (!journey) return;
    journey.memories = journey.memories.filter((item) => item.id !== memoryId);
    render();
  }

  function openCharacterHome(characterId) {
    if (!characters[characterId] || !state.journeys?.[characterId]?.met) return;
    state.activeCharacterId = characterId;
    state.screen = state.journeys[characterId].onboardingComplete ? 'home' : 'story';
    render();
  }

  function setAgreement(label) {
    const journey = activeJourney();
    const character = activeCharacter();
    if (!journey || !character) return;
    const relationship = journey.relationship;
    if (label === 'distant') {
      journey.agreements.label = 'distant';
      relationship.status = 'distant';
      relationship.stage = 'distant';
      toast(langText(`${localText(character.name)}确认会尊重你需要的距离。`, `${localText(character.name)} confirms that your need for distance will be respected.`));
      return render();
    }
    if (label === 'friend' && Number(relationship.familiarity || 0) >= 2 && Number(relationship.trust || 0) >= 1) {
      journey.agreements.label = 'friend';
      journey.agreements.romantic = false;
      relationship.status = 'friend';
      relationship.stage = 'friend';
      toast(langText(`${localText(character.name)}同意把你们称为普通朋友。`, `${localText(character.name)} agrees that you are friends.`));
      return render();
    }
    if (label === 'ambiguous' && Number(relationship.familiarity || 0) >= 5 && Number(relationship.trust || 0) >= 5 && Number(relationship.romanticAttraction || 0) >= 2 && Number(journey.playerSignals.romantic || 0) > 0) {
      journey.agreements.label = 'ambiguous';
      journey.agreements.romantic = true;
      relationship.status = 'ambiguous';
      relationship.stage = 'ambiguous';
      toast(langText(`${localText(character.name)}愿意确认彼此正在探索浪漫可能，但没有排他承诺。`, `${localText(character.name)} agrees that you are exploring romantic possibility, without exclusivity.`));
      return render();
    }
    relationship.suggestedConversation = label === 'ambiguous' ? 'romantic-clarification' : 'friendship-clarification';
    toast(langText(`${localText(character.name)}没有确认这个名称：还需要更多共同经历或修复尚存的分歧。`, `${localText(character.name)} does not confirm that label yet; more shared history or repair is needed.`));
    render();
  }

  function createArchive(label = null) {
    state.archives = state.archives || [];
    if (state.archives.length >= 6) {
      toast(langText('命运档案已满；请先删除一个非当前分支。', 'The Fate Archive is full; delete a non-current branch first.'));
      return null;
    }
    const id = `branch-${Date.now()}-${state.archives.length + 1}`;
    const parentId = state.campaign.activeBranchId || 'root';
    const snapshotCampaign = JSON.parse(JSON.stringify(state.campaign));
    snapshotCampaign.activeBranchId = id;
    const activeName = activeCharacter() ? localText(activeCharacter().name) : langText('观测站', 'Station');
    const archive = {
      id,
      parentId,
      label: label || langText(`档案节点 ${state.archives.length + 1}`, `Archive node ${state.archives.length + 1}`),
      summary: langText(`${activeName} · ${state.campaign.clues.length} 条线索 · 洞察 ${state.campaign.observationInsight}`, `${activeName} · ${state.campaign.clues.length} clues · insight ${state.campaign.observationInsight}`),
      createdAt: new Date().toISOString(),
      snapshot: {
        activeCharacterId: state.activeCharacterId,
        journeys: JSON.parse(JSON.stringify(state.journeys)),
        campaign: snapshotCampaign
      }
    };
    state.archives.push(archive);
    state.campaign.activeBranchId = id;
    return archive;
  }

  function restoreArchive(archiveId) {
    const target = state.archives.find((archive) => archive.id === archiveId);
    if (!target?.snapshot) return;
    if (state.archives.length >= 6) {
      toast(langText('回溯前必须保存当前分支；请先删除一个非当前节点。', 'The current branch must be saved before rewind; delete a non-current node first.'));
      return;
    }
    clearEchoPendingReplies();
    const returnRoute = state.screen === 'echolink' ? 'echolink' : 'observatory-home';
    createArchive(langText('回溯前的时间线', 'Timeline before rewind'));
    state.activeCharacterId = target.snapshot.activeCharacterId;
    state.journeys = JSON.parse(JSON.stringify(target.snapshot.journeys));
    state.campaign = JSON.parse(JSON.stringify(target.snapshot.campaign));
    state.campaign.activeBranchId = target.id;
    state.screen = returnRoute;
    toast(langText('已回溯；刚才的时间线也已保存为独立分支。', 'Rewound; the timeline you left was saved as a separate branch.'));
    render();
  }

  function deleteArchive(archiveId) {
    if (state.campaign.activeBranchId === archiveId) return toast(langText('不能删除当前分支。', 'The current branch cannot be deleted.'));
    const archive = state.archives.find((item) => item.id === archiveId);
    if (!archive) return;
    if (!window.confirm(langText(`删除“${archive.label}”？这个分支节点无法恢复。`, `Delete “${archive.label}”? This branch node cannot be recovered.`))) return;
    state.archives = state.archives.filter((item) => item.id !== archiveId);
    render();
  }

  function resolveSharedEvent(decision) {
    const event = state.campaign.sharedEvent;
    if (event.status === 'resolved') return;
    if (state.archives.length >= 6) return toast(langText('事件前需要创建可回溯节点；请先删除一个非当前分支。', 'A rewind point is required before this event; delete a non-current branch first.'));
    createArchive(langText('许澄作出选择前', 'Before Xu Cheng’s choice'));
    const rationale = document.getElementById('event-reason')?.value.trim() || '';
    const impacts = {
      protect: { qian: { trust: 1, safety: 1 }, shenyao: { strain: 1, compatibility: -0.5 }, lichuan: { reciprocity: 1 }, zhoutang: { safety: .5, reciprocity: .5 }, wensheng: { intimacy: 1, safety: 1 } },
      observe: { qian: { safety: -1, strain: 1 }, shenyao: { trust: 1, compatibility: 1 }, lichuan: { strain: 0.5 }, zhoutang: { compatibility: .5, trust: .5 }, wensheng: { strain: 1 } },
      erase: { qian: { trust: -2, strain: 2 }, shenyao: { safety: -0.5, strain: 1 }, lichuan: { trust: -1.5, strain: 2 }, zhoutang: { safety: -1, strain: 1 }, wensheng: { trust: -2, strain: 2 } },
      hide: { qian: { trust: 0.5, strain: 0.5 }, shenyao: { trust: -2, strain: 2 }, lichuan: { trust: 1, reciprocity: 1 }, zhoutang: { trust: -1.5, strain: 1.5 }, wensheng: { reciprocity: .5, safety: .5 } }
    };
    impacts.return = { qian: { trust: 1, safety: .5 }, shenyao: { compatibility: 1 }, lichuan: { reciprocity: .5 }, zhoutang: { trust: 1, reciprocity: 1 }, wensheng: { safety: 1 } };
    impacts.stay = { qian: { safety: 1 }, shenyao: { trust: .5 }, lichuan: { trust: 1, reciprocity: 1 }, zhoutang: { safety: 1 }, wensheng: { trust: 1, intimacy: .5 } };
    impacts['new-name'] = { qian: { trust: .5 }, shenyao: { compatibility: .5, strain: .5 }, lichuan: { safety: 1 }, zhoutang: { trust: 1 }, wensheng: { reciprocity: 1, safety: 1 } };
    if (!impacts[decision]) return;
    Object.entries(impacts[decision]).forEach(([id, delta]) => applyRelationshipDelta(delta, state.journeys[id]));
    const networkImpacts = {
      protect: { qian_shenyao: { strain: 1 }, lichuan_qian: { trust: 0.5 }, zhoutang_wensheng: { trust: .5 } },
      observe: { qian_shenyao: { strain: 1 }, shenyao_lichuan: { strain: 0.5 }, zhoutang_wensheng: { strain: .5 } },
      erase: { qian_shenyao: { strain: 1 }, shenyao_lichuan: { strain: 1 }, lichuan_qian: { strain: 1 }, zhoutang_wensheng: { strain: 1.5 } },
      hide: { shenyao_lichuan: { strain: 1.5 }, lichuan_qian: { reciprocity: 0.5 }, zhoutang_shenyao: { strain: 1 }, zhoutang_wensheng: { strain: .75 } }
    };
    networkImpacts.return = { qian_shenyao: { trust: .5 }, zhoutang_wensheng: { trust: .5 } };
    networkImpacts.stay = { lichuan_qian: { reciprocity: .5 }, zhoutang_wensheng: { trust: .5 } };
    networkImpacts['new-name'] = { shenyao_lichuan: { trust: .5 }, zhoutang_shenyao: { trust: .5 } };
    Object.entries(networkImpacts[decision]).forEach(([edgeId, delta]) => {
      const edge = state.campaign.characterRelations[edgeId];
      Object.entries(delta).forEach(([key, value]) => { edge[key] = Math.max(0, Math.min(10, Number(edge[key] || 0) + Number(value || 0))); });
    });
    event.status = 'resolved';
    event.decision = decision;
    event.rationale = rationale;
    event.resolvedAt = new Date().toISOString();
    state.campaign.observationInsight += 1;
    const eventKnowledge = {
      id: `knowledge-sui-${decision}`,
      text: langText(`你在“许澄的选择”事件中支持了：${decision}。五人都在场，但最终决定属于许澄。`, `In Xu Cheng’s Choice, you supported: ${decision}. All five witnessed it, but the final decision belonged to Xu Cheng.`),
      source: langText('命运观测站 · 共同事件', 'Fate Observation Station · shared event'),
      confidence: 'high',
      knownBy: ['player', ...characterIds]
    };
    state.campaign.knowledge.push(eventKnowledge);
    characterIds.forEach((id) => state.journeys[id].memories.unshift({ id: `${id}-sui-${Date.now()}`, section: 'pinned', text: eventKnowledge.text, source: eventKnowledge.source, pinned: false, permanent: true, type: 'event', worldId: 'station', branchId: state.campaign.activeBranchId, providedBy: 'station', confidence: 'high', emotionalIntensity: 3, private: false, obsolete: false, crossWorld: false }));
    render();
  }

  function saveCreatorDrafts(quiet = false) {
    state.campaign.worldDraft = {
      ...state.campaign.worldDraft,
      name: document.getElementById('world-name')?.value.trim() || '',
      type: document.getElementById('world-type')?.value.trim() || '',
      premise: document.getElementById('world-premise')?.value.trim() || '',
      rules: document.getElementById('world-rules')?.value.trim() || '',
      playerIdentity: document.getElementById('world-player-identity')?.value.trim() || '',
      sharedPlace: document.getElementById('world-shared-place')?.value.trim() || '',
      conflict: document.getElementById('world-conflict')?.value.trim() || '',
      identityMode: document.getElementById('world-identity-mode')?.value || 'companion'
    };
    state.campaign.npcDraft = {
      ...state.campaign.npcDraft,
      name: document.getElementById('npc-name')?.value.trim() || '',
      role: document.getElementById('npc-role')?.value.trim() || '',
      expression: document.getElementById('npc-expression')?.value.trim() || '',
      ageRange: document.getElementById('npc-age-range')?.value.trim() || '',
      appearance: document.getElementById('npc-appearance')?.value.trim() || '',
      desire: document.getElementById('npc-desire')?.value.trim() || '',
      contradiction: document.getElementById('npc-contradiction')?.value.trim() || '',
      memory: document.getElementById('npc-memory')?.value.trim() || '',
      initialRelation: document.getElementById('npc-initial-relation')?.value || 'first',
      boundary: document.getElementById('npc-boundary')?.value.trim() || '',
      sourceLine: document.getElementById('npc-source-line')?.value || 'wensheng',
      replySpeed: document.getElementById('npc-reply-speed')?.value || state.campaign.npcDraft.replySpeed || 'normal',
      initiative: document.getElementById('npc-initiative')?.value || state.campaign.npcDraft.initiative || 'occasional',
      preferredChannel: document.getElementById('npc-preferred-channel')?.value || state.campaign.npcDraft.preferredChannel || 'text',
      privacy: document.getElementById('npc-privacy')?.value || state.campaign.npcDraft.privacy || 'gradual',
      conflictStyle: document.getElementById('npc-conflict-style')?.value || state.campaign.npcDraft.conflictStyle || 'direct'
    };
    if (!quiet) {
      toast(langText('设定卡已保存在当前本地分支，没有消耗创生额度。', 'Setting cards saved to the current local branch without using creation quota.'));
      render();
    }
  }

  function workshopNpcFromForm() {
    saveCreatorDrafts(true);
    return { ...state.campaign.npcDraft };
  }

  function workshopWorldFromForm() {
    saveCreatorDrafts(true);
    return { ...state.campaign.worldDraft };
  }

  function confirmWorkshopNpc() {
    const progress = weaverState();
    if (!progress.workshopUnlocked) return openWeaverMainline();
    const npc = workshopNpcFromForm();
    if (['name', 'role', 'desire', 'contradiction', 'memory', 'boundary'].some((key) => !npc[key])) {
      return toast(langText('请完成名字、身份、愿望、性格矛盾、核心记忆与关系边界。', 'Complete name, role, desire, character tension, core memory, and relationship boundary.'));
    }
    if (progress.editingNpcId) {
      const index = progress.createdNpcs.findIndex((item) => item.id === progress.editingNpcId);
      if (index < 0) return;
      progress.createdNpcs[index] = { ...progress.createdNpcs[index], ...npc, updatedAt: new Date().toISOString() };
      progress.editingNpcId = null;
      toast(langText('角色修改已保存，没有消耗创生额度。', 'Character edits saved without using creation quota.'));
      return render();
    }
    if (Number(progress.quota.npcUsed) >= Number(progress.quota.npcLimit)) return toast(langText('本月角色创生额度已用完；草稿和已有角色仍可继续编辑。', 'This month’s NPC capacity is used; drafts and existing characters remain editable.'));
    progress.createdNpcs.push({ ...npc, id: `npc-${Date.now()}`, tutorial: false, createdAt: new Date().toISOString(), worldId: null });
    progress.quota.npcUsed += 1;
    state.campaign.npcDraft = { ...createCampaign().npcDraft };
    toast(langText('角色已确认创生；已建立的角色不会随月度校准消失。', 'NPC creation confirmed; existing characters never disappear at monthly calibration.'));
    render();
  }

  function confirmWorkshopWorld() {
    const progress = weaverState();
    if (!progress.workshopUnlocked) return openWeaverMainline();
    const world = workshopWorldFromForm();
    if (['name', 'type', 'premise', 'rules', 'playerIdentity', 'sharedPlace', 'conflict'].some((key) => !world[key])) {
      return toast(langText('请完成世界名称、类型、前提、规则、玩家身份、共同地点与初始矛盾。', 'Complete world name, type, premise, rule, player identity, shared place, and opening conflict.'));
    }
    if (progress.editingWorldId) {
      const index = progress.createdWorlds.findIndex((item) => item.id === progress.editingWorldId);
      if (index < 0) return;
      progress.createdWorlds[index] = { ...progress.createdWorlds[index], ...world, updatedAt: new Date().toISOString() };
      progress.editingWorldId = null;
      toast(langText('世界修改已保存，没有消耗创生额度。', 'World edits saved without using creation quota.'));
      return render();
    }
    if (Number(progress.quota.worldUsed) >= Number(progress.quota.worldLimit)) return toast(langText('本月世界创生额度已用完；草稿和已有世界仍可继续编辑。', 'This month’s world capacity is used; drafts and existing worlds remain editable.'));
    progress.createdWorlds.push({ ...world, id: `world-${Date.now()}`, tutorial: false, createdAt: new Date().toISOString() });
    progress.quota.worldUsed += 1;
    state.campaign.worldDraft = { ...createCampaign().worldDraft };
    toast(langText('世界已确认创生；已建立的世界不会随月度校准消失。', 'World creation confirmed; existing worlds never disappear at monthly calibration.'));
    render();
  }

  function editWorkshopNpc(creationId) {
    const progress = weaverState();
    const item = progress.createdNpcs.find((entry) => entry.id === creationId);
    if (!item) return;
    state.campaign.npcDraft = {
      ...createCampaign().npcDraft,
      ...item,
      initialRelation: ['first', 'forgotten', 'partner', 'suspect', 'incomplete'].includes(item.initialRelation) ? item.initialRelation : 'first'
    };
    progress.editingNpcId = item.id;
    render();
  }

  function editWorkshopWorld(creationId) {
    const progress = weaverState();
    const item = progress.createdWorlds.find((entry) => entry.id === creationId);
    if (!item) return;
    state.campaign.worldDraft = { ...createCampaign().worldDraft, ...item, rules: item.rules || item.rule || '', premise: item.premise || item.conflict || '' };
    progress.editingWorldId = item.id;
    render();
  }

  function exportRelationship() {
    const blob = new Blob([window.EchoStorage.exportState(state)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `EchoLoom-relationships-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    toast(t('exportDone'));
  }

  async function importRelationship(file) {
    try {
      clearEchoPendingReplies();
      state = window.EchoStorage.importState(await file.text());
      isTyping = false;
      isGenerating = false;
      toast(t('importDone'));
      render();
    } catch (error) {
      console.error(error);
      toast(t('importError'));
    } finally {
      importFile.value = '';
    }
  }

  function resetPrototype() {
    if (!window.confirm(t('confirmReset'))) return;
    clearEchoPendingReplies();
    state = window.EchoStorage.reset();
    isTyping = false;
    isGenerating = false;
    toast(t('resetDone'));
    render();
  }

  function toast(message) {
    const element = document.createElement('div');
    element.className = 'toast';
    element.textContent = message;
    toastRoot.appendChild(element);
    window.setTimeout(() => element.remove(), 2400);
  }

  function handleAction(target) {
    const element = target.closest('[data-action]');
    const action = element?.dataset.action;
    if (!action) return;
    const journey = activeJourney();
    switch (action) {
      case 'skip-splash': if (Date.now() - splashStartedAt >= 500) go('title'); break;
      case 'start-onboarding': startNewOnboarding(); break;
      case 'continue-onboarding': go(state.resumeScreen || 'prologue'); break;
      case 'prologue-next': advancePrologue(); break;
      case 'prologue-auto': prologueAuto = !prologueAuto; render(); break;
      case 'prologue-log': openOnboardingLog(onboardingContent.prologue.slice(0, Math.min(onboardingContent.prologue.length, Number(state.prologueBeat || 0) + 1))); break;
      case 'prologue-skip': {
        state.prologueChoice ||= 'lost';
        state.prologueBeat = state.playerName ? onboardingContent.prologue.length : Number(onboardingContent.identityBeat) + 1;
        go(state.playerName ? 'prologue' : 'player-name');
        break;
      }
      case 'save-player-name': {
        const name = String(document.getElementById('player-name-input')?.value || '').trim();
        if (!name) { toast(langText('请输入你希望使用的名字。', 'Enter the name you want to use.')); break; }
        state.playerName = name.slice(0, 24);
        state.prologueBeat = Math.max(Number(onboardingContent.identityBeat) + 1, Number(state.prologueBeat || 0));
        go('prologue');
        break;
      }
      case 'choose-prologue': state.prologueChoice = element.dataset.choiceId; prologueAuto = false; render(); break;
      case 'open-signals': go('signal-scan'); break;
      case 'inspect-signal': state.selectedNpcId = element.dataset.characterId; go('signal-detail'); break;
      case 'confirm-signal': go('signal-confirm'); break;
      case 'begin-rescue': beginRescue(); break;
      case 'rescue-next': state.rescueBeat = Number(state.rescueBeat || 0) + 1; render(); break;
      case 'rescue-log': {
        const rescue = onboardingContent.rescues[state.selectedNpcId];
        if (rescue) openOnboardingLog(rescue.opening.slice(0, Math.min(rescue.opening.length, Number(state.rescueBeat || 0) + 1)));
        break;
      }
      case 'choose-rescue': completeFirstRescue(element.dataset.choiceId); break;
      case 'continue-activation': go('echolink-activation'); break;
      case 'open-first-contact': activateFirstContact(); break;
      case 'select-first-intent': state.firstContactIntent = element.dataset.intentId; render(); requestAnimationFrame(() => document.getElementById('first-contact-input')?.focus()); break;
      case 'send-first-contact': sendFirstContact(); break;
      case 'complete-onboarding': finishOnboarding(); break;
      case 'mainline-open': openMainline(); break;
      case 'mainline-select-intent': mainlineState().selectedIntent = element.dataset.intentId; render(); requestAnimationFrame(() => document.getElementById('mainline-input')?.focus()); break;
      case 'mainline-investigate': investigateMainline(); break;
      case 'mainline-sample': chooseMainlineSample(element.dataset.sampleId); break;
      case 'mainline-next': advanceMainline(); break;
      case 'resolve-mainline': resolveMainline(element.dataset.decision); break;
      case 'open-weaver-mainline': openWeaverMainline(); break;
      case 'weaver-select-intent': weaverState().selectedIntent = element.dataset.intentId; render(); requestAnimationFrame(() => document.getElementById('weaver-response')?.focus()); break;
      case 'weaver-begin': beginWeaverThreads(); break;
      case 'weaver-choose-thread': chooseWeaverThread(element.dataset.threadId, element.dataset.optionId); break;
      case 'weaver-confirm-thread': confirmWeaverThread(); break;
      case 'weaver-open-npc': weaverState().phase = 'npc'; render(); break;
      case 'weaver-confirm-tutorial-npc': confirmTutorialNpc(); break;
      case 'weaver-confirm-tutorial-world': confirmTutorialWorld(); break;
      case 'open-weaver-workshop': openWeaverWorkshop(); break;
      case 'open-xucheng-thread': openXuChengThread(); break;
      case 'open-delayed-message': openDelayedMessage(); break;
      case 'mainline-view-helper': {
        const characterId = element.dataset.characterId;
        if (state.journeys?.[characterId]?.met) openCharacterHome(characterId);
        else toast(langText('先完成本章联系，人物档案会随信号解锁。', 'Complete this chapter contact to unlock the dossier.'));
        break;
      }
      case 'new-signal-branch': startSignalBranch(); break;
      case 'restore-onboarding-save': restoreOnboardingSave(element.dataset.saveId); break;
      case 'restart-onboarding': startNewOnboarding(); break;
      case 'clear-archive':
        if (window.confirm(langText('清除所有分支档案？当前关系状态会保留。', 'Clear every branch archive? Current relationship state will remain.'))) { state.archives = []; state.saves = []; toast(langText('分支档案已清除。', 'Branch archive cleared.')); render(); }
        break;
      case 'return-title': state.resumeScreen = state.screen === 'settings' ? (state.resumeScreen || 'observatory-home') : state.screen; state.screen = 'title'; render(); break;
      case 'go': go(element.dataset.route); break;
      case 'start-character': startCharacter(element.dataset.characterId); break;
      case 'open-character-home': openCharacterHome(element.dataset.characterId); break;
      case 'story-option': sendStory(element.dataset.text); break;
      case 'story-send': sendStory(document.getElementById('story-input')?.value); break;
      case 'finish-chapter': if (journey) { journey.onboardingComplete = true; journey.relationship.suggestedConversation = 'friendship-clarification'; state.campaign.prologueComplete = true; state.campaign.phase = 'station'; go('summary'); } break;
      case 'continue-knowing': if (journey) journey.onboardingComplete = true; go('observatory-home'); break;
      case 'set-agreement': setAgreement(element.dataset.label); break;
      case 'resolve-event': resolveSharedEvent(element.dataset.decision); break;
      case 'create-archive': if (createArchive()) { toast(langText('当前状态已保存为独立分支节点。', 'Current state saved as a branch node.')); render(); } break;
      case 'restore-archive': restoreArchive(element.dataset.archiveId); break;
      case 'delete-archive': deleteArchive(element.dataset.archiveId); break;
      case 'save-creator': saveCreatorDrafts(); break;
      case 'confirm-workshop-npc': confirmWorkshopNpc(); break;
      case 'confirm-workshop-world': confirmWorkshopWorld(); break;
      case 'edit-workshop-npc': editWorkshopNpc(element.dataset.creationId); break;
      case 'edit-workshop-world': editWorkshopWorld(element.dataset.creationId); break;
      case 'dismiss-calibration': weaverState().quota.lastNoticePeriod = weaverState().quota.period; render(); break;
      case 'creator-contact-wensheng': {
        const thread = state.campaign.echoLink.conversations.wensheng;
        if (echoThreadUnlocked(thread)) {
          state.activeCharacterId = 'wensheng';
          state.campaign.echoLink.hasOpened = true;
          state.campaign.echoLink.activeThreadId = 'wensheng';
          state.screen = 'echolink';
          render();
        }
        break;
      }
      case 'echolink-activate': state.campaign.echoLink.hasOpened = true; state.campaign.echoLink.lastOpenedAt = new Date().toISOString(); render(); break;
      case 'echolink-tab': state.campaign.echoLink.activeTab = element.dataset.tab; state.campaign.echoLink.activeThreadId = null; render(); break;
      case 'echolink-open-thread': {
        const thread = state.campaign.echoLink.conversations[element.dataset.threadId];
        if (echoThreadUnlocked(thread)) {
          state.campaign.echoLink.activeThreadId = thread.id;
          const contactId = thread.participantIds.find((id) => characters[id]);
          if (contactId) state.activeCharacterId = contactId;
          state.screen = 'echolink';
          render();
        }
        break;
      }
      case 'echolink-close-thread': state.campaign.echoLink.activeThreadId = null; render(); break;
      case 'echolink-channel': state.campaign.echoLink.composerChannel = element.dataset.channel; render(); requestAnimationFrame(() => document.getElementById('echo-message-input')?.focus()); break;
      case 'echolink-suggest': state.campaign.echoLink.privateIntent = element.dataset.intent; render(); requestAnimationFrame(() => document.getElementById('echo-message-input')?.focus()); break;
      case 'echolink-send': sendEchoMessage(); break;
      case 'echolink-silence': keepEchoSilence(); break;
      case 'echolink-invite': resolveNightTrain(element.dataset.choice); break;
      case 'echolink-resolve-promise': resolveEchoPromise(element.dataset.outcome); break;
      case 'echolink-call': echoLinkCall(); break;
      case 'echolink-like-moment': {
        const moment = state.campaign.echoLink.moments.find((item) => item.id === element.dataset.momentId);
        if (moment) moment.playerLiked = !moment.playerLiked;
        render();
        break;
      }
      case 'echolink-moment-private': {
        const thread = state.campaign.echoLink.conversations[element.dataset.authorId];
        if (echoThreadUnlocked(thread)) { state.campaign.echoLink.activeThreadId = thread.id; if (characters[element.dataset.authorId]) state.activeCharacterId = element.dataset.authorId; render(); }
        break;
      }
      case 'echolink-observer-mode': state.campaign.echoLink.observerMode = !state.campaign.echoLink.observerMode; render(); break;
      case 'echolink-select-bond': if (state.journeys?.[element.dataset.characterId]?.met) { state.activeCharacterId = element.dataset.characterId; render(); } break;
      case 'chat-quick': sendChat(element.dataset.text); break;
      case 'chat-send': sendChat(document.getElementById('chat-input')?.value); break;
      case 'save-message-memory': saveMessageMemory(element.dataset.messageId); break;
      case 'select-scene': if (journey) { journey.selectedSceneId = element.dataset.sceneId; journey.scenePreview = null; render(); } break;
      case 'generate-scene': generateSceneFromInput(); break;
      case 'adjust-scene': if (journey) { journey.scenePreview = null; render(); requestAnimationFrame(() => document.getElementById('scene-prompt')?.focus()); } break;
      case 'start-generated-scene': startGeneratedScene(); break;
      case 'generated-story-send': sendGeneratedStory(document.getElementById('generated-story-input')?.value); break;
      case 'save-scene': saveScene(element.dataset.timeline); break;
      case 'open-generated-scene': if (journey) { journey.activeGeneratedSceneId = element.dataset.sceneId; go('generatedStory'); } break;
      case 'add-memory': openMemoryModal(); break;
      case 'edit-memory': openMemoryModal(element.dataset.memoryId); break;
      case 'toggle-pin-memory': togglePin(element.dataset.memoryId); break;
      case 'delete-memory': deleteMemory(element.dataset.memoryId); break;
      case 'modal-cancel': closeModal(); break;
      case 'modal-save': saveModal(); break;
      case 'modal-backdrop': if (target === element) closeModal(); break;
      case 'export': exportRelationship(); break;
      case 'reset': resetPrototype(); break;
      case 'toggle-motion': state.settings.reduceMotion = !state.settings.reduceMotion; render(); break;
      default: break;
    }
  }

  app.addEventListener('click', (event) => handleAction(event.target));
  modalRoot.addEventListener('click', (event) => handleAction(event.target));
  app.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' || event.shiftKey || event.isComposing) return;
    if (event.target.id === 'story-input') { event.preventDefault(); sendStory(event.target.value); }
    if (event.target.id === 'chat-input') { event.preventDefault(); sendChat(event.target.value); }
    if (event.target.id === 'echo-message-input') { event.preventDefault(); sendEchoMessage(); }
    if (event.target.id === 'generated-story-input') { event.preventDefault(); sendGeneratedStory(event.target.value); }
    if (event.target.id === 'first-contact-input') { event.preventDefault(); sendFirstContact(); }
    if (event.target.id === 'player-name-input') { event.preventDefault(); handleAction(event.target.closest('.app-screen')?.querySelector('[data-action="save-player-name"]')); }
  });
  app.addEventListener('change', (event) => {
    if (event.target.id === 'language-select') { state.language = event.target.value; render(); }
    if (event.target.id === 'frequency-select') { state.settings.frequency = event.target.value; render(); }
    if (event.target.id === 'echo-private-intent') { state.campaign.echoLink.privateIntent = event.target.value; }
  });
  document.addEventListener('click', (event) => {
    const navButton = event.target.closest('[data-desktop-route]');
    if (navButton) go(navButton.dataset.desktopRoute);
    const control = event.target.closest('[data-desktop-action]');
    if (!control) return;
    const action = control.dataset.desktopAction;
    if (action === 'language') { state.language = state.language === 'zh' ? 'en' : 'zh'; render(); }
    if (action === 'export') exportRelationship();
    if (action === 'reset') resetPrototype();
    if (action === 'focus') { demoShell.classList.toggle('focus-mode'); fitPhone(); }
  });
  importFile.addEventListener('change', () => { if (importFile.files?.[0]) importRelationship(importFile.files[0]); });
  document.addEventListener('keydown', (event) => {
    const tag = document.activeElement?.tagName?.toLowerCase();
    if (['input', 'textarea', 'select'].includes(tag) || modalContext || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    const normalized = ['chat', 'home', 'relationship', 'sharedEvent', 'creator'].includes(state.screen) ? 'observatory-home' : state.screen === 'generatedStory' ? 'together' : state.screen;
    const current = routeSequence.indexOf(normalized);
    if (current < 0) return;
    const next = event.key === 'ArrowRight' ? Math.min(routeSequence.length - 1, current + 1) : Math.max(0, current - 1);
    go(routeSequence[next]);
  });

  function fitPhone() {
    if (window.innerWidth <= 820) { phoneFrame.style.transform = ''; return; }
    const availableHeight = window.innerHeight - 58;
    const scale = Math.min(1, Math.max(.68, availableHeight / 852));
    phoneFrame.style.transform = `scale(${scale})`;
    const stage = document.querySelector('.phone-stage');
    stage.style.minHeight = `${Math.ceil(852 * scale + 28)}px`;
    stage.style.minWidth = `${Math.ceil(393 * scale + 20)}px`;
  }

  window.addEventListener('resize', fitPhone);
  fitPhone();
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('./sw.js').catch((error) => console.info('Service worker skipped:', error));
  render();
})();
