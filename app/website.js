(() => {
  'use strict';

  const root = document.getElementById('website-home');
  if (!root) return;

  const copy = {
    zh: {
      skip: '跳转到主要内容', story: '故事', cast: '相遇', help: '游玩指南', play: '进入故事', resume: '继续我的故事',
      eyebrow: '故事始于相遇 · 关系延续于记忆', title: '有些相遇，<br>值得被记住。',
      intro: '一次 17 秒的世界校正，让许澄从所有记录中消失。只有你还记得她。与五位同行者追寻线索，在共同经历里，慢慢认识彼此。',
      secondary: '认识同行者', note: '免费浏览器体验 · 无需注册 · 进度保存在此设备',
      artAlt: '云端之上的命运观测站庭院，星轨环绕着黎明的天空', station: '命运观测站', invitation: '你的记忆，是故事的第一条线索。',
      prologue: '序章 / 未被校正的你', time: '17 秒后，世界忘记了她。', timeText: '一张姓名消失的通行卡，一封来自 37 天后的消息。你将走进梦境、档案与被删除的世界，寻找一个人真实存在过的证据。',
      featureA: '先有故事，再有关系', featureAText: '在共同调查与分歧里相识。友谊、亲近，或保持距离，都由你们的经历慢慢决定。',
      featureB: '用自己的话回应', featureBText: '剧情与对话中保留自由输入。意图提示给你方向，你决定真正想说什么。',
      featureC: '记忆有迹可循', featureCText: '查看记忆的来源，修正自己的信息，删除或导出档案。每段关系拥有独立的经历。',
      castEyebrow: '五种视角 · 同一个未解之谜', castTitle: '遇见有自己生活的人。', castLead: '他们会关心，也会质疑；会靠近，也有自己的边界。相遇不是一份预先写好的关系。',
      castHint: '向右滑动，认识每位同行者', howEyebrow: '从此刻开始', howTitle: '留一点时间，给一个故事。',
      steps: [
        ['走进观测站', '从序章认识许澄，留意那个只有你记得的名字。'],
        ['一起寻找线索', '探索场景、核对证据，在关键时刻选择自己的回应。'],
        ['让经历成为记忆', '解锁联系后继续交谈，在档案中查看关系与共同经历。']
      ],
      faqTitle: '开始之前，你可能想知道',
      faqs: [
        ['这是什么样的体验？', 'EchoLoom 是一个以故事为起点的关系模拟交互原型。你会探索场景、调查谜题、认识五位虚构角色，并在故事解锁联系后继续对话。角色可以表达不同意见，关系也不必发展为恋爱。'],
        ['需要付费、注册或 API key 吗？', '公开体验免费，无需账号，也无需填写 API key。剧情和模拟回复可以在浏览器内运行。此版本是交互原型，回复不等同于通用 AI 服务。'],
        ['我的进度和对话存在哪里？', '剧情进度、对话和记忆保存在当前浏览器的本地存储中，不会自动同步到其他设备。清除浏览器数据、使用无痕模式或更换浏览器可能让进度丢失。建议定期导出档案；在其他设备导入即可继续。'],
        ['怎样管理记忆或重新开始？', '进入故事后，可在档案和设置中查看、编辑或删除允许修改的记忆，导出与导入关系档案，或重置本地体验。导入档案会替换当前浏览器里的进度，请先导出需要保留的内容。'],
        ['可以随时离开吗？', '当然。这里没有连续签到，也不会因为你离开而惩罚关系。使用同一浏览器回来时，选择“继续我的故事”。']
      ],
      footerLine: '每一段相遇，都在记忆里继续。', footerInfo: '交互原型 · 虚构角色 · 中文 / English', privacy: '本地档案', export: '导出我的档案', import: '导入已有档案',
      offline: '本地模拟体验', localLive: '故事与关系交互原型', storage: '此浏览器暂时无法保存进度。你仍可以体验；离开前请导出档案。',
      unavailable: '故事正在准备中，请刷新页面后重试。', error: '暂时无法完成此操作，请刷新页面后重试。'
    },
    en: {
      skip: 'Skip to main content', story: 'The story', cast: 'The people', help: 'How to play', play: 'Begin the story', resume: 'Continue my story',
      eyebrow: 'A story to meet in. A memory to return to.', title: 'Some encounters<br>deserve to be remembered.',
      intro: 'A 17-second correction erases Xu Cheng from every record. Only you remember her. Follow the evidence with five companions, and discover one another through the moments you share.',
      secondary: 'Meet your companions', note: 'Free browser experience · No signup · Saved on this device',
      artAlt: 'The Fate Observatory courtyard above the clouds, with star trails circling a dawn sky', station: 'The Fate Observatory', invitation: 'Your memory is the first clue.',
      prologue: 'Prologue / The Uncorrected Observer', time: 'After 17 seconds, the world forgot her.', timeText: 'An access card with a missing name. A message from 37 days in the future. Enter dreams, archives, and deleted worlds to find the evidence of a life that really existed.',
      featureA: 'A story before a relationship', featureAText: 'Meet through shared investigations and disagreements. Friendship, closeness, and distance grow from what you experience together.',
      featureB: 'Reply in your own words', featureBText: 'Use free text in story conversations. Optional intent prompts offer direction; you decide what you actually want to say.',
      featureC: 'Memories with a source', featureCText: 'See where memories came from, correct your information, delete records, and export your archive. Each relationship has its own history.',
      castEyebrow: 'Five perspectives. One unanswered mystery.', castTitle: 'Meet people with lives of their own.', castLead: 'They care, question, and set boundaries. An encounter is a beginning, with no relationship assigned in advance.',
      castHint: 'Swipe to meet each companion', howEyebrow: 'Your first chapter', howTitle: 'Make a little room for a story.',
      steps: [
        ['Enter the Observatory', 'Meet Xu Cheng in the prologue. Remember the name the world forgets.'],
        ['Follow the evidence', 'Explore scenes, cross-check clues, and choose how you respond at turning points.'],
        ['Keep what you share', 'Continue talking once contact is unlocked. Explore shared memories in your archive.']
      ],
      faqTitle: 'A few things before you begin',
      faqs: [
        ['What kind of experience is this?', 'EchoLoom is a story-first relationship simulation prototype. Explore scenes, investigate a mystery, meet five fictional characters, and continue conversations as the story unlocks contact. Characters can disagree with you, and a relationship does not have to become romantic.'],
        ['Do I need to pay, sign up, or provide an API key?', 'The public experience is free. No account or API key is needed. The story and simulated replies run in your browser. This is an interactive prototype; its replies are not a general-purpose AI service.'],
        ['Where are my progress and conversations stored?', 'Your story, conversations, and memories stay in local storage in this browser. They do not automatically sync across devices. Clearing browser data, using private browsing, or switching browsers can lose your progress. Export your archive regularly, then import it on another device to continue.'],
        ['How do I manage memories or start again?', 'Inside the story, use the archive and settings to review, edit, or delete eligible memories, export or import relationship records, or reset the local experience. Importing an archive replaces progress in this browser. Export anything you want to keep first.'],
        ['Can I leave whenever I like?', 'Of course. There are no login streaks and no relationship penalties for being away. Return in the same browser and choose “Continue my story.”']
      ],
      footerLine: 'Every meeting continues through memory.', footerInfo: 'Interactive prototype · Fictional characters · 中文 / English', privacy: 'Your local archive', export: 'Export my archive', import: 'Import an archive',
      offline: 'Locally simulated experience', localLive: 'Story & relationship prototype', storage: 'This browser cannot save progress right now. You can still play; export your archive before leaving.',
      unavailable: 'The story is not ready yet. Refresh the page and try again.', error: 'This action is unavailable right now. Refresh the page and try again.'
    }
  };

  const characterIntros = {
    qian: { zh: '他习惯照顾别人，也在学习把自己留在答案里。', en: 'He is used to caring for others. Now he is learning to leave room for himself.' },
    shenyao: { zh: '他想找到正确答案，却开始发现，理解一个人需要更多。', en: 'He searches for the right answer, and discovers that understanding someone takes more.' },
    lichuan: { zh: '他总能找到下一条路。只是这一次，留下也是一种选择。', en: 'He always finds another road. This time, staying can be a choice too.' },
    zhoutang: { zh: '她相信清晰的边界，也愿意为可靠的合作留一扇门。', en: 'She believes in clear boundaries, and leaves a door open for trust earned together.' },
    wensheng: { zh: '她能编织无数世界，却希望被看见的，是故事之外的自己。', en: 'She weaves countless worlds, and hopes to be seen as more than the stories she creates.' }
  };
  const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
  const arrow = '<span aria-hidden="true">↗</span>';
  let renderKey = '';

  function render() {
    const bridge = window.EchoWebsiteBridge;
    const snapshot = bridge && typeof bridge.snapshot === 'function' ? bridge.snapshot() : {};
    const language = snapshot.language === 'en' ? 'en' : 'zh';
    const t = copy[language];
    const key = JSON.stringify([language, Boolean(snapshot.hasProgress), snapshot.offlineOnly, snapshot.storageAvailable, Boolean(bridge)]);
    if (renderKey === key) return;
    renderKey = key;
    const playLabel = snapshot.hasProgress ? t.resume : t.play;
    const characters = window.ECHOLOOM_DATA?.characters || {};
    const cards = ['qian', 'shenyao', 'lichuan', 'zhoutang', 'wensheng'].filter(id => characters[id]).map((id, index) => {
      const character = characters[id];
      return `<article class="website-character website-character-${id}">
        <div class="website-character-art"><span class="website-character-number" aria-hidden="true">0${index + 1}</span><img src="${escape(character.cardPortrait)}" alt="${escape(character.name[language])}" loading="lazy" width="590" height="720"></div>
        <div class="website-character-copy"><p class="website-character-role">${escape(character.role[language].split('／')[0].split(' / ')[0])}</p><h3>${escape(character.name[language])}</h3><p>${escape(characterIntros[id][language])}</p></div>
      </article>`;
    }).join('');

    root.className = 'website-root';
    root.lang = language === 'zh' ? 'zh-CN' : 'en';
    root.innerHTML = `
      <a class="website-skip" href="#website-main">${t.skip}</a>
      <header class="website-header">
        <a class="website-brand" href="#website-main" aria-label="EchoLoom"><img src="assets/logo.svg" alt="" width="38" height="38"><span>EchoLoom<span class="website-brand-caption">STORIES · CONNECTION · MEMORY</span></span></a>
        <nav class="website-nav" aria-label="${language === 'zh' ? '网站导航' : 'Website navigation'}"><a href="#website-story">${t.story}</a><a href="#website-cast">${t.cast}</a><a href="#website-help">${t.help}</a></nav>
        <div class="website-header-actions"><button class="website-language" type="button" data-website-action="language" aria-label="${language === 'zh' ? 'Switch to English' : '切换到中文'}">${language === 'zh' ? 'EN' : '中文'}<span aria-hidden="true"> ⌄</span></button><button class="website-button website-button-small" type="button" data-website-action="play" ${bridge ? '' : 'disabled'}>${playLabel}${arrow}</button></div>
      </header>

      <main id="website-main" tabindex="-1">
        <section class="website-hero" aria-labelledby="website-title">
          <div class="website-hero-copy"><p class="website-eyebrow"><span aria-hidden="true">✧</span> ${t.eyebrow}</p><h1 id="website-title" tabindex="-1">${t.title}</h1><p class="website-hero-description">${t.intro}</p>
            <div class="website-hero-actions"><button class="website-button" type="button" data-website-action="play" ${bridge ? '' : 'disabled'}>${playLabel}${arrow}</button><a class="website-text-link" href="#website-cast">${t.secondary}<span aria-hidden="true"> ↓</span></a></div>
            <p class="website-local-note"><span class="website-note-dot" aria-hidden="true"></span>${bridge ? t.note : t.unavailable}</p>
            ${snapshot.storageAvailable === false ? `<p class="website-storage-notice" role="status">${t.storage}</p>` : ''}
          </div>
          <figure class="website-hero-art"><img class="website-courtyard" src="assets/backgrounds/title-observatory-courtyard.png" alt="${t.artAlt}" width="941" height="1672" fetchpriority="high"><div class="website-art-index" aria-hidden="true">01 — THE FIRST THREAD</div><figcaption class="website-art-caption"><span>${t.station}</span><strong>${t.invitation}</strong><span class="website-caption-star" aria-hidden="true">✧</span></figcaption><span class="website-art-orbit" aria-hidden="true"></span></figure>
        </section>

        <section class="website-story" id="website-story" aria-labelledby="website-story-title"><div class="website-story-clock" aria-hidden="true"><span>00:17</span><small>CORRECTION COMPLETE</small></div><div class="website-story-copy"><p class="website-eyebrow">${t.prologue}</p><h2 id="website-story-title">${t.time}</h2><p>${t.timeText}</p></div></section>

        <section class="website-features" aria-label="${language === 'zh' ? '体验特点' : 'The experience'}">${[[t.featureA,t.featureAText,'✧'],[t.featureB,t.featureBText,'↳'],[t.featureC,t.featureCText,'⌁']].map(([title,text,icon]) => `<article class="website-feature"><span class="website-feature-icon" aria-hidden="true">${icon}</span><h3>${title}</h3><p>${text}</p></article>`).join('')}</section>

        <section class="website-cast" id="website-cast" aria-labelledby="website-cast-title"><div class="website-section-heading"><p class="website-eyebrow">${t.castEyebrow}</p><h2 id="website-cast-title">${t.castTitle}</h2><p>${t.castLead}</p></div><div class="website-character-list" tabindex="0" aria-label="${t.castHint}">${cards}</div><p class="website-cast-hint">${t.castHint} <span aria-hidden="true">→</span></p></section>

        <section class="website-how" id="website-help" aria-labelledby="website-how-title"><div class="website-how-heading"><p class="website-eyebrow">${t.howEyebrow}</p><h2 id="website-how-title">${t.howTitle}</h2><button class="website-button" type="button" data-website-action="play" ${bridge ? '' : 'disabled'}>${playLabel}${arrow}</button></div><ol class="website-steps">${t.steps.map(([title,text],index) => `<li><span class="website-step-number" aria-hidden="true">0${index + 1}</span><div><h3>${title}</h3><p>${text}</p></div></li>`).join('')}</ol></section>

        <section class="website-faq" aria-labelledby="website-faq-title"><h2 id="website-faq-title">${t.faqTitle}</h2><div class="website-faq-list">${t.faqs.map(([question,answer]) => `<details class="website-faq-item"><summary>${question}<span aria-hidden="true">+</span></summary><p>${answer}</p></details>`).join('')}</div></section>
      </main>

      <footer class="website-footer"><div class="website-footer-brand"><a class="website-brand" href="#website-main"><img src="assets/logo.svg" alt="" width="32" height="32"><span>EchoLoom</span></a><p>${t.footerLine}</p><small>${t.footerInfo}</small></div><div class="website-footer-archive"><p>${t.privacy}</p><div><button type="button" class="website-footer-link" data-website-action="export" ${bridge ? '' : 'disabled'}>${t.export}<span aria-hidden="true"> ↓</span></button><button type="button" class="website-footer-link" data-website-action="import" ${bridge ? '' : 'disabled'}>${t.import}<span aria-hidden="true"> ↑</span></button></div><small><span class="website-note-dot" aria-hidden="true"></span>${snapshot.offlineOnly === false ? t.localLive : t.offline}</small></div></footer>
      <p class="website-action-status" role="status" aria-live="polite"></p>`;
  }

  root.addEventListener('click', event => {
    const button = event.target.closest('[data-website-action]');
    if (!button || !root.contains(button)) return;
    const action = button.dataset.websiteAction;
    const bridge = window.EchoWebsiteBridge;
    if (!bridge || typeof bridge[action] !== 'function') return;
    try {
      bridge[action]();
      render();
      if (action === 'language') root.querySelector('[data-website-action="language"]')?.focus({ preventScroll: true });
    } catch {
      const language = bridge.snapshot?.().language === 'en' ? 'en' : 'zh';
      root.querySelector('.website-action-status').textContent = copy[language].error;
    }
  });

  window.addEventListener('echoloom:render', render);
  render();
})();
