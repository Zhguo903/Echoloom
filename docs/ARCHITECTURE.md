# Technical Architecture

## Stack

The project uses plain HTML, CSS, browser JavaScript, editable SVG assets, and a small Node.js server built only with standard modules. There is no build step or runtime dependency.

## Runtime flow

1. `index.html` creates the desktop presentation shell and mobile viewport.
2. `app/data.js` loads bilingual copy, five character profiles, five data-driven rescue routes, the five ordered investigation chapters, the five-thread Weaver arc, first-contact copy, journey factories, creation-capacity helpers, and scene metadata.
3. `app/storage.js` loads schema version 8 from `echoloom.demo.v2`, adds default Weaver progress to schema-version-7 archives, adds default investigation progress to schema-version-6 archives, migrates older routes and EchoLink rosters, or isolates imported schema-version-1 state.
4. `app/story-engine.js` provides character-specific deterministic offline simulation and emits behaviour tags, directional relationship deltas, and player-expression signals.
5. `app/app.js` renders the onboarding state machine, dynamic Observatory task, sequential investigation, *The First Free Thread*, free tutorial creation, the quota-aware Weaver Workshop, Story/World hubs, EchoLink terminal, selected character journey, relationship/knowledge dossier, and archive tree.
6. `localStorage` persists every character journey, campaign state, and up to six non-recursive archive snapshots together.
7. Export/import serializes the full local state as one relationship archive.

## State schema version 8

Important top-level fields:

- `version`
- `language`
- `screen` (the single persisted navigation source of truth)
- `onboardingStarted`, `onboardingCompleted`, and `resumeScreen`
- `playerName`, `prologueChoice`, `selectedNpcId`, and `selectedRescueChoice`
- `knownNpcIds`, `contactNpcIds`, and `unreadCount`
- `currentBranchId`, `hiddenFlags`, and `saves`
- `activeCharacterId`
- `journeys`
- `campaign`
- `archives`
- `legacyArchive`
- `settings`

Each `journeys[characterId]` entry contains:

- `met`, `storyStep`, `storyMessages`, and `onboardingComplete`
- `chatMessages`
- `relationship` (character-to-player state)
- `playerSignals`
- `agreements`
- `behaviorHistory`
- `openingDecision` and `routeFlags`
- `communicationPulse`
- `memories`
- `generatedScenes`, `scenePreview`, and scene selection state
- `interactionCount`

The relationship object stores eleven internal dimensions: familiarity, trust, intimacy, reciprocity, compatibility, romantic attraction, sexual attraction, safety, commitment, strain, and repair. `playerSignals` stores only expressed friendship, romantic, sexual, avoidance, and uncertainty signals. `agreements` stores the mutually confirmed label, romantic/sexual agreement, exclusivity, and consent notes. UI copy describes dimensions qualitatively and no threshold can alter `agreements` automatically.

`communicationPulse` stores recent response reliability, initiative balance, topic depth, channel comfort, pending-reply state, and the most recent communication timestamp. It is deliberately separate from the long-term relationship object, so low-frequency contact does not imply relationship decay.

`campaign` stores the first signal, current world and branch, Xu Cheng evidence, source/confidence/`knownBy` knowledge, character-to-character relationships, final Xu Cheng decision, observation insight, local world/NPC drafts, `mainline`, `weaver`, and `echoLink`. `campaign.mainline` contains the ordered investigation. `campaign.weaver` contains observer level, current arc phase, intent/free-text responses, five selected and confirmed stability threads, editable tutorial NPC/world data, tutorial confirmation flags, workshop permission, monthly capacity state, editing targets, and permanent created-character/world collections.

Monthly capacity is local and deterministic. `quota.period` uses `YYYY-MM`; a new local calendar month sets only `npcUsed` and `worldUsed` to zero while leaving `createdNpcs` and `createdWorlds` untouched. Limits remain three NPCs and one world. The first tutorial records are tagged `tutorial` and bypass quota. Formal creation increments usage only after validation and explicit confirmation; editing an existing ID does not increment it.

EchoLink contains seven contact records, private/group/delayed conversations, unread counts, moments, active tab/thread, observer mode, pending events, commitments, and hidden flags. The compact onboarding `saves` retain isolated first-rescue branches; advanced archives store `journeys` and `campaign` snapshots without recursively containing the archive list. The side-contact key `sui` remains internal for schema compatibility but presents Xu Cheng in current UI and content.

The onboarding sequence ends at `observatory-home`. The investigation repeats `observatory-home ↔ mainline-chapter`, then advances through `finale` and `resolved`. The second arc uses `weaver-mainline` phases `arrival → threads → review → npc → world → complete`; only then does `creator` become the formal Weaver Workshop. Story, World, Archive, and EchoLink remain accessible without changing mainline order.

Memories use five types (`fact`, `event`, `promiseBoundary`, `relationshipJudgement`, and `reflection`) plus world, branch, source, confidence, and provenance metadata. Player-correctable facts, events, and promises/boundaries can be edited; character judgements and reflections cannot be directly rewritten.

## Compatibility

Schema-version-8 exports restore onboarding, all five journeys, investigation progress, Weaver progress, quota use, tutorial and formal creations, EchoLink, campaign, and branches. Schema-version-7 files preserve their completed Xu Cheng outcome and receive a locked Weaver arc ready to open from that outcome. Schema-version-6 files receive a fresh investigation at Wen Sheng’s briefing while preserving their existing first-response route, journeys, messages, and archives. Older migrations remain conservative and unchanged.

EchoLink uses the existing `chatReply` engine for core-character private messages. Group, side-NPC, delayed delivery, contact permission, promises, and high-risk relationship transitions remain rules-controlled. Private player-intent metadata is stored on the player message but is not inserted into NPC-visible text.

`app/reply-timing.js` calculates a bounded 650–2600 ms prototype delay from a character-specific base habit, message channel, several long-term relationship dimensions, strain, and recent response reliability. `app/app.js` keeps pending callbacks in a runtime-only map keyed by thread ID; the map is never exported or archived. Token checks make each scheduled callback commit at most one reply, while reset, import, and rewind cancel outstanding callbacks.

## Replacing the offline engine

The UI retains the four-function `EchoEngine` contract:

- `storyReply(input, state)`
- `chatReply(input, state)`
- `generateScene(prompt, selectedSceneId, state)`
- `sceneReply(input, scene, state)`

A server-backed model must receive the selected character ID and only that character’s relevant journey data. Private model credentials must never be placed in browser code, and the offline engine should remain available for demonstrations and automated testing.

Before production world generation, the server design must add rule validation, scoped NPC memory, branch-aware retrieval, moderation, and identity-continuity checks. The current workshop stores local structured creations and opening hooks only; it does not call a model or claim that an NPC is conscious.
