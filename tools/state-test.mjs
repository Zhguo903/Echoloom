import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const storageMap = new Map();
const context = vm.createContext({
  console,
  Date,
  JSON,
  Math,
  Object,
  Array,
  Number,
  String,
  Boolean,
  window: {},
  localStorage: {
    getItem: (key) => storageMap.get(key) ?? null,
    setItem: (key, value) => storageMap.set(key, String(value)),
    removeItem: (key) => storageMap.delete(key)
  }
});

for (const relative of ['app/data.js', 'app/storage.js', 'app/story-engine.js', 'app/reply-timing.js']) {
  vm.runInContext(await readFile(path.join(root, relative), 'utf8'), context, { filename: relative });
}

const data = context.window.ECHOLOOM_DATA;
const storage = context.window.EchoStorage;
const engine = context.window.EchoEngine;
const replyTiming = context.window.EchoReplyTiming;

assert.equal(data.defaultState.version, 8);
assert.equal(data.defaultState.screen, 'splash');
assert.equal(data.defaultState.onboardingCompleted, false);
assert.equal(data.defaultState.knownNpcIds.length, 0);
assert.equal(Object.keys(data.onboardingContent.rescues).length, 5);
assert.equal(data.onboardingContent.prologueChoiceBeat, 3);
assert.equal(data.onboardingContent.identityBeat, 7);
assert.ok(JSON.stringify(data.onboardingContent.prologue).includes('许澄'));
assert.deepEqual(Array.from(data.mainlineContent.signalOrder), ['wensheng', 'qian', 'zhoutang', 'lichuan', 'shenyao']);
assert.equal(data.mainlineContent.chapters.length, 5);
assert.equal(data.createMainline().phase, 'briefing');
assert.deepEqual(Array.from(data.createMainline().confirmedAnchorIds), []);
assert.equal(data.createCampaign().mainline.id, data.mainlineContent.id);
const mainlineAnchorIds = new Set();
for (const [index, chapter] of data.mainlineContent.chapters.entries()) {
  assert.equal(chapter.characterId, data.mainlineContent.signalOrder[index]);
  assert.equal(chapter.intents.length, 3);
  assert.ok(chapter.question.zh.length > 0);
  assert.ok(chapter.investigationAction.zh.length > 0);
  assert.ok(chapter.nextAction.zh.length > 0);
  assert.ok(chapter.anchor.id.startsWith('anchor-'));
  assert.equal(mainlineAnchorIds.has(chapter.anchor.id), false);
  mainlineAnchorIds.add(chapter.anchor.id);
  for (const intent of chapter.intents) {
    for (const key of Object.keys(intent.delta)) assert.ok(['familiarity', 'trust', 'reciprocity', 'compatibility', 'safety', 'strain'].includes(key));
  }
}
assert.equal(data.mainlineContent.finale.choices.length, 3);
assert.equal(data.weaverContent.threads.length, 5);
assert.deepEqual(Array.from(data.weaverContent.threads.map((thread) => thread.id)), ['identity', 'desire', 'memory', 'boundary', 'world']);
assert.deepEqual(Array.from(data.weaverContent.threads.map((thread) => thread.guideId)), ['sui', 'wensheng', 'qian', 'zhoutang', 'lichuan']);
assert.equal(data.weaverContent.verifier.guideId, 'shenyao');
const freshWeaver = data.createWeaverState(new Date('2026-08-04T12:00:00'));
assert.equal(freshWeaver.phase, 'locked');
assert.equal(freshWeaver.observerLevel, 1);
assert.equal(freshWeaver.quota.period, '2026-08');
assert.equal(freshWeaver.quota.npcLimit, 3);
assert.equal(freshWeaver.quota.worldLimit, 1);
freshWeaver.quota.npcUsed = 3;
freshWeaver.quota.worldUsed = 1;
freshWeaver.createdNpcs.push({ id: 'kept-npc', name: 'Kept' });
freshWeaver.createdWorlds.push({ id: 'kept-world', name: 'Kept World' });
data.syncWeaverQuota(freshWeaver, new Date('2026-09-01T00:00:00'));
assert.equal(freshWeaver.quota.period, '2026-09');
assert.equal(freshWeaver.quota.npcUsed, 0);
assert.equal(freshWeaver.quota.worldUsed, 0);
assert.equal(freshWeaver.createdNpcs[0].id, 'kept-npc');
assert.equal(freshWeaver.createdWorlds[0].id, 'kept-world');
const allowedRescueKeys = new Set(['familiarity', 'trust', 'reciprocity', 'compatibility', 'safety', 'strain']);
for (const rescue of Object.values(data.onboardingContent.rescues)) {
  assert.equal(rescue.supportIds.length, 2);
  assert.equal(rescue.choices.length, 4);
  assert.ok(rescue.clue.id.startsWith('clue-xucheng-'));
  for (const choice of rescue.choices) {
    for (const delta of Object.values(choice.deltas)) {
      for (const key of Object.keys(delta)) assert.ok(allowedRescueKeys.has(key), `first rescue must not change ${key}`);
    }
  }
}
assert.deepEqual(Object.keys(data.characters), ['qian', 'shenyao', 'lichuan', 'zhoutang', 'wensheng']);
assert.equal(data.characters.qian.portrait, 'assets/character/qian-memory-restorer.png');
assert.equal(data.characters.qian.cardPortrait, 'assets/character/qian-memory-restorer-card.png');
assert.equal(data.characters.qian.avatar, 'assets/character/qian-memory-restorer-avatar.png');
assert.equal(data.characters.shenyao.portrait, 'assets/character/shenyao-observer.png');
assert.equal(data.characters.shenyao.cardPortrait, 'assets/character/shenyao-observer-card.png');
assert.equal(data.characters.shenyao.avatar, 'assets/character/shenyao-observer-avatar.png');
assert.equal(data.characters.lichuan.portrait, 'assets/character/lichuan-traveller.png');
assert.equal(data.characters.lichuan.cardPortrait, 'assets/character/lichuan-traveller-card.png');
assert.equal(data.characters.lichuan.avatar, 'assets/character/lichuan-traveller-avatar.png');
assert.equal(data.characters.zhoutang.portrait, 'assets/character/zhoutang-architect.png');
assert.equal(data.characters.zhoutang.cardPortrait, 'assets/character/zhoutang-architect-card.png');
assert.equal(data.characters.zhoutang.avatar, 'assets/character/zhoutang-architect-avatar.png');
assert.equal(data.characters.wensheng.portrait, 'assets/character/wensheng-weaver.png');
assert.equal(data.characters.wensheng.cardPortrait, 'assets/character/wensheng-weaver-card.png');
assert.equal(data.characters.wensheng.avatar, 'assets/character/wensheng-weaver-avatar.png');
assert.equal(Object.keys(data.createJourney('qian').relationship).includes('sexualAttraction'), true);
assert.equal(data.createJourney('qian').agreements.label, 'unconfirmed');
assert.equal(data.createCampaign().knowledge[0].knownBy.length, 6);
assert.ok(JSON.stringify(data.createCampaign().knowledge).includes('许澄'));
assert.ok(!JSON.stringify(data.createCampaign().knowledge).includes('三份互相冲突'));
assert.equal(Object.keys(data.createEchoLink().contacts).length, 7);
assert.equal(data.createEchoLink().contacts.sui.name.zh, '许澄');
assert.ok(data.createEchoLink().conversations['delayed-w17'].messages[0].text.zh.includes('你还记得我吗'));
assert.equal(Object.keys(data.createEchoLink().conversations).includes('group-seven'), true);
assert.equal(data.createEchoLink().conversations['group-seven'].participantIds.length, 6);
assert.equal(data.createJourney('qian').communicationPulse.channelComfort.text, 6);
assert.equal(data.createJourney('zhoutang').routeFlags.length, 0);
assert.equal(data.createJourney('wensheng').openingDecision, null);

const distantTimingState = data.createJourney('qian');
const closeTimingState = data.createJourney('qian');
Object.assign(closeTimingState.relationship, { familiarity: 8, trust: 8, intimacy: 7, reciprocity: 8, safety: 8, romanticAttraction: 4, strain: 1 });
closeTimingState.communicationPulse.responseReliability = 8;
const distantDelay = replyTiming.calculate({ contactId: 'qian', relationship: distantTimingState.relationship, communicationPulse: distantTimingState.communicationPulse });
const closeDelay = replyTiming.calculate({ contactId: 'qian', relationship: closeTimingState.relationship, communicationPulse: closeTimingState.communicationPulse });
assert.ok(closeDelay < distantDelay);
assert.ok(replyTiming.calculate({ contactId: 'shenyao', relationship: closeTimingState.relationship, communicationPulse: closeTimingState.communicationPulse }) > replyTiming.calculate({ contactId: 'lichuan', relationship: closeTimingState.relationship, communicationPulse: closeTimingState.communicationPulse }));
assert.ok(replyTiming.calculate({ contactId: 'qian', relationship: closeTimingState.relationship, communicationPulse: closeTimingState.communicationPulse, channel: 'voice' }) > closeDelay);
assert.ok(replyTiming.calculate({ contactId: 'wensheng', relationship: closeTimingState.relationship, communicationPulse: closeTimingState.communicationPulse }) > replyTiming.calculate({ contactId: 'zhoutang', relationship: closeTimingState.relationship, communicationPulse: closeTimingState.communicationPulse }));
assert.ok(closeDelay >= 650 && distantDelay <= 2600);

const v2 = {
  version: 2,
  language: 'en',
  route: 'home',
  activeCharacterId: 'qian',
  journeys: {
    qian: {
      onboardingComplete: true,
      relationship: { stage: 'ordinary-friends', familiarity: 5, trust: 4, comfort: 3, compatibility: 4, attraction: 2, unresolved: 2 },
      memories: [{ id: 'old-memory', section: 'aboutUser', text: 'A fact', source: 'v2', pinned: false, permanent: true }]
    }
  }
};
const migratedV2 = storage.importState(JSON.stringify({ schemaVersion: 2, state: v2 }));
assert.equal(migratedV2.version, 8);
assert.equal(migratedV2.journeys.qian.met, true);
assert.equal(migratedV2.journeys.qian.relationship.intimacy, 3);
assert.equal(migratedV2.journeys.qian.relationship.romanticAttraction, 2);
assert.equal(migratedV2.journeys.qian.relationship.sexualAttraction, 0);
assert.equal(migratedV2.journeys.qian.agreements.label, 'unconfirmed');
assert.equal(migratedV2.journeys.qian.memories[0].type, 'fact');
assert.equal(migratedV2.journeys.qian.communicationPulse.responseReliability, 5);
assert.equal(migratedV2.campaign.echoLink.activeTab, 'messages');

const v3 = {
  version: 3,
  language: 'zh',
  route: 'station',
  activeCharacterId: 'qian',
  journeys: { qian: { ...data.createJourney('qian'), communicationPulse: undefined, met: true } },
  campaign: { ...data.createCampaign(), echoLink: undefined, firstSignal: 'qian' },
  archives: []
};
const migratedV3 = storage.importState(JSON.stringify({ schemaVersion: 3, state: v3 }));
assert.equal(migratedV3.version, 8);
assert.equal(migratedV3.campaign.echoLink.conversations.lichuan.messages[0].type, 'photo');
assert.equal(migratedV3.campaign.echoLink.conversations.zhoutang.messages[1].type, 'photo');
assert.equal(migratedV3.journeys.qian.communicationPulse.pendingReply, false);

const v4 = {
  version: 4,
  language: 'zh',
  route: 'echolink',
  activeCharacterId: 'qian',
  journeys: { qian: { ...data.createJourney('qian'), met: true } },
  campaign: { ...data.createCampaign(), firstSignal: 'qian' },
  archives: []
};
delete v4.campaign.echoLink.contacts.zhoutang;
delete v4.campaign.echoLink.contacts.wensheng;
delete v4.campaign.echoLink.conversations.zhoutang;
delete v4.campaign.echoLink.conversations.wensheng;
v4.campaign.echoLink.conversations['group-seven'].participantIds = ['player', 'qian', 'shenyao', 'lichuan'];
const migratedV4 = storage.importState(JSON.stringify({ schemaVersion: 4, state: v4 }));
assert.equal(migratedV4.version, 8);
assert.equal(migratedV4.campaign.echoLink.contacts.zhoutang.characterId, 'zhoutang');
assert.equal(migratedV4.campaign.echoLink.contacts.wensheng.characterId, 'wensheng');
assert.equal(migratedV4.campaign.echoLink.conversations['group-seven'].participantIds.length, 6);

const v5 = {
  version: 5,
  language: 'zh',
  route: 'station',
  activeCharacterId: 'qian',
  journeys: { qian: { ...data.createJourney('qian'), met: true, onboardingComplete: true } },
  campaign: { ...data.createCampaign(), firstSignal: 'qian', prologueComplete: true },
  archives: []
};
const migratedV5 = storage.importState(JSON.stringify({ schemaVersion: 5, state: v5 }));
assert.equal(migratedV5.version, 8);
assert.equal(migratedV5.screen, 'observatory-home');
assert.equal(Object.hasOwn(migratedV5, 'route'), false);
assert.equal(migratedV5.onboardingCompleted, true);
assert.equal(migratedV5.knownNpcIds[0], 'qian');

const v6 = {
  version: 6,
  language: 'zh',
  screen: 'observatory-home',
  onboardingCompleted: true,
  activeCharacterId: 'wensheng',
  knownNpcIds: ['wensheng'],
  contactNpcIds: ['wensheng'],
  journeys: { wensheng: { ...data.createJourney('wensheng'), met: true, onboardingComplete: true } },
  campaign: { ...data.createCampaign(), mainline: undefined, firstSignal: 'wensheng', prologueComplete: true },
  archives: []
};
const migratedV6 = storage.importState(JSON.stringify({ schemaVersion: 6, state: v6 }));
assert.equal(migratedV6.version, 8);
assert.equal(migratedV6.screen, 'observatory-home');
assert.equal(migratedV6.campaign.mainline.phase, 'briefing');
assert.deepEqual(Array.from(migratedV6.campaign.mainline.confirmedAnchorIds), []);
assert.equal(migratedV6.campaign.mainline.chapterIndex, 0);

const v7 = {
  version: 7,
  language: 'zh',
  screen: 'observatory-home',
  onboardingCompleted: true,
  activeCharacterId: 'shenyao',
  knownNpcIds: [...data.characterIds],
  contactNpcIds: [...data.characterIds],
  journeys: Object.fromEntries(data.characterIds.map((id) => [id, { ...data.createJourney(id), met: true, onboardingComplete: true }])),
  campaign: { ...data.createCampaign(), weaver: undefined, mainline: { ...data.createMainline(), phase: 'resolved', completed: true, finalDecision: 'echo', confirmedAnchorIds: data.mainlineContent.chapters.map((chapter) => chapter.anchor.id) } },
  archives: []
};
const migratedV7 = storage.importState(JSON.stringify({ schemaVersion: 7, state: v7 }));
assert.equal(migratedV7.version, 8);
assert.equal(migratedV7.campaign.mainline.completed, true);
assert.equal(migratedV7.campaign.weaver.phase, 'locked');
assert.equal(migratedV7.campaign.weaver.workshopUnlocked, false);
assert.equal(migratedV7.campaign.weaver.createdNpcs.length, 0);

const migratedV1 = storage.importState(JSON.stringify({ version: 1, memories: [{ id: 'aren-old' }], language: 'zh' }));
assert.equal(migratedV1.version, 8);
assert.equal(migratedV1.screen, 'title');
assert.equal(migratedV1.legacyArchive.sourceSchemaVersion, 1);
assert.deepEqual(Object.keys(migratedV1.journeys), []);

const current = structuredClone(data.defaultState);
current.journeys.qian = data.createJourney('qian');
current.journeys.qian.met = true;
current.activeCharacterId = 'qian';
current.campaign.firstSignal = 'qian';
current.campaign.echoLink.hasOpened = true;
current.campaign.mainline.chapterIndex = 2;
current.campaign.mainline.phase = 'result';
current.campaign.mainline.confirmedAnchorIds = data.mainlineContent.chapters.slice(0, 3).map((chapter) => chapter.anchor.id);
Object.assign(current.campaign.weaver, {
  phase: 'complete', observerLevel: 8, completed: true, workshopUnlocked: true, tutorialNpcCreated: true, tutorialWorldCreated: true,
  confirmedThreadIds: data.weaverContent.threads.map((thread) => thread.id),
  createdNpcs: [{ id: 'tutorial-npc-nanxing', name: '南星', tutorial: true }],
  createdWorlds: [{ id: 'tutorial-world-tide-city', name: '潮汐城', tutorial: true }]
});
current.campaign.echoLink.conversations.qian.messages.push({ id: 'roundtrip-message', sender: 'player', type: 'voice', text: 'hello' });
current.archives.push({ id: 'branch-test', snapshot: { journeys: current.journeys, campaign: current.campaign } });
const roundTrip = storage.importState(storage.exportState(current));
assert.equal(roundTrip.version, 8);
assert.equal(roundTrip.campaign.firstSignal, 'qian');
assert.equal(roundTrip.archives.length, 1);
assert.equal(roundTrip.campaign.echoLink.hasOpened, true);
assert.equal(roundTrip.campaign.echoLink.conversations.qian.messages.at(-1).type, 'voice');
assert.equal(roundTrip.campaign.mainline.chapterIndex, 2);
assert.equal(roundTrip.campaign.mainline.phase, 'result');
assert.equal(roundTrip.campaign.mainline.confirmedAnchorIds.length, 3);
assert.equal(roundTrip.campaign.weaver.observerLevel, 8);
assert.equal(roundTrip.campaign.weaver.createdNpcs[0].name, '南星');
assert.equal(roundTrip.campaign.weaver.createdWorlds[0].name, '潮汐城');

storage.save(current);
assert.equal(storage.load().campaign.firstSignal, 'qian');
const resetState = storage.reset();
assert.equal(resetState.version, 8);
assert.equal(resetState.campaign.firstSignal, null);
assert.equal(storage.load().campaign.firstSignal, null);

const journey = data.createJourney('qian');
const romanticSignal = engine.storyReply('我喜欢你', { ...journey, language: 'zh', activeCharacterId: 'qian' });
assert.equal(romanticSignal.intent, 'flirt');
assert.equal(romanticSignal.playerSignalDelta.romantic, 1);
assert.equal(Object.hasOwn(romanticSignal.relationshipDelta, 'romanticAttraction'), true);
assert.equal(Object.hasOwn(romanticSignal.relationshipDelta, 'attraction'), false);
assert.equal(journey.agreements.label, 'unconfirmed');

const sexualSignal = engine.storyReply('我想和你有更亲密的身体接触', { ...journey, language: 'zh', activeCharacterId: 'qian' });
assert.equal(sexualSignal.intent, 'sexual_signal');
assert.equal(sexualSignal.playerSignalDelta.sexual, 1);
assert.match(sexualSignal.response, /同意|关系|默认/);

const deceptionQi = engine.storyReply('我故意骗你', { ...data.createJourney('qian'), language: 'zh', activeCharacterId: 'qian' });
const deceptionShen = engine.storyReply('我故意骗你', { ...data.createJourney('shenyao'), language: 'zh', activeCharacterId: 'shenyao' });
assert.notEqual(deceptionQi.relationshipDelta.trust, deceptionShen.relationshipDelta.trust);

const privacyBoundary = engine.storyReply('你必须把完整日志交给我', { ...data.createJourney('zhoutang'), language: 'zh', activeCharacterId: 'zhoutang' });
assert.equal(privacyBoundary.intent, 'control');
assert.match(privacyBoundary.response, /越权|权限|决定/);

const projectionBoundary = engine.storyReply('你必须成为我故事里的理想角色', { ...data.createJourney('wensheng'), language: 'zh', activeCharacterId: 'wensheng' });
assert.equal(projectionBoundary.intent, 'control');
assert.match(projectionBoundary.response, /故事|角色|共同创作/);

const zhouScene = engine.generateScene('共同检查一份权限日志', 'cafe', { ...data.createJourney('zhoutang'), language: 'zh', activeCharacterId: 'zhoutang' });
const wenScene = engine.generateScene('让 NPC 选择自己的结尾', 'garden', { ...data.createJourney('wensheng'), language: 'zh', activeCharacterId: 'wensheng' });
assert.match(zhouScene.opening, /周棠/);
assert.match(wenScene.opening, /闻笙/);

console.log('EchoLoom state and engine test: PASS');
console.log('Checked schema-v8 Weaver defaults, five stability threads, monthly rollover without deletion, v7/v6/v5/v4/v3/v2/v1 migration, save/load/reset, round-trip mainline and created content, rescue constraints, reply timing, consent boundaries, and character-specific engine behavior.');
