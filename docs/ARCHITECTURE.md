# Technical Architecture

## Stack

The project uses plain HTML, CSS, browser JavaScript, editable SVG assets, and a small Node.js server built only with standard modules. There is no build step or runtime dependency.

## Runtime flow

1. `index.html` creates the desktop presentation shell and mobile viewport.
2. `app/data.js` loads bilingual copy, five character profiles, five data-driven rescue routes, the five ordered investigation chapters, the five-thread Weaver arc, first-contact copy, journey factories, creation-capacity helpers, and scene metadata.
3. `app/storage.js` loads schema version 12 from `echoloom.demo.v2`, migrates schema-version-11 `briefing/sample` progress into the scene-led chapter state, preserves bilingual generated values, tags schema-version-10 single-language live choices for safe localization, normalizes legacy provider preferences to Gemini-first mode, and conservatively migrates all older archives.
4. `app/story-engine.js` provides character-specific deterministic offline simulation and emits behaviour tags, directional relationship deltas, and player-expression signals.
5. `app/api-engine.js` calls the local server first for core-character free-form replies and eligible scene backgrounds. It maps validated events into the existing UI result shape and falls back to `EchoEngine` on every provider failure.
6. `server/` keeps provider credentials, selected-character retrieval, prompt assembly, semantic validation, story rules, optional Supabase persistence, and Cloudflare image caching outside the browser.
7. `app/app.js` renders the onboarding state machine, dynamic Observatory task, sequential investigation, *The First Free Thread*, free tutorial creation, the quota-aware Weaver Workshop, Story/World hubs, EchoLink terminal, selected character journey, relationship/knowledge dossier, and archive tree.
8. `localStorage` persists every character journey, campaign state, live-event metadata, and up to six non-recursive archive snapshots together. Export/import serializes the full local state as one relationship archive.

## State schema version 12

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
- `liveStory` with canonical chapter/scene, four rule-owned flags, completed-event provenance, and model unlock proposals that still require an application rule
- `liveChoices`, `liveExpression`, and `liveEmotion`
- `liveScene` with a validated internal image URL, descriptor, fingerprint, and cache status
- `interactionCount`

The relationship object stores eleven internal dimensions: familiarity, trust, intimacy, reciprocity, compatibility, romantic attraction, sexual attraction, safety, commitment, strain, and repair. `playerSignals` stores only expressed friendship, romantic, sexual, avoidance, and uncertainty signals. `agreements` stores the mutually confirmed label, romantic/sexual agreement, exclusivity, and consent notes. UI copy describes dimensions qualitatively and no threshold can alter `agreements` automatically.

`communicationPulse` stores recent response reliability, initiative balance, topic depth, channel comfort, pending-reply state, and the most recent communication timestamp. It is deliberately separate from the long-term relationship object, so low-frequency contact does not imply relationship decay.

`campaign` stores the first signal, current world and branch, Xu Cheng evidence, source/confidence/`knownBy` knowledge, character-to-character relationships, final Xu Cheng decision, observation insight, local world/NPC drafts, `mainline`, `weaver`, and `echoLink`. `campaign.mainline` contains the ordered investigation plus `discoveredClues`, `currentHypothesis`, `chapterFlags`, `memoryStability`, `relationshipStats`, `archiveClassification`, and per-chapter `interactionState`. Scene interactions own clue confirmation; provider-generated dialogue cannot add a canonical mainline clue. `campaign.weaver` contains observer level, current arc phase, intent/free-text responses, five selected and confirmed stability threads, editable tutorial NPC/world data, tutorial confirmation flags, workshop permission, monthly capacity state, editing targets, and permanent created-character/world collections.

Monthly capacity is local and deterministic. `quota.period` uses `YYYY-MM`; a new local calendar month sets only `npcUsed` and `worldUsed` to zero while leaving `createdNpcs` and `createdWorlds` untouched. Limits remain three NPCs and one world. The first tutorial records are tagged `tutorial` and bypass quota. Formal creation increments usage only after validation and explicit confirmation; editing an existing ID does not increment it.

EchoLink contains seven contact records, private/group/delayed conversations, unread counts, moments, active tab/thread, observer mode, pending events, commitments, and hidden flags. The compact onboarding `saves` retain isolated first-rescue branches; advanced archives store `journeys` and `campaign` snapshots without recursively containing the archive list. The side-contact key `sui` remains internal for schema compatibility but presents Xu Cheng in current UI and content.

The onboarding sequence ends at `observatory-home`. Every investigation chapter advances through `entry → investigation → anomaly → conversation → decision → result`, repeats `observatory-home ↔ mainline-chapter`, then advances through `finale` and `resolved`. Chapters share state semantics but not interaction mechanics. The second arc uses `weaver-mainline` phases `arrival → threads → review → npc → world → complete`; only then does `creator` become the formal Weaver Workshop. Story, World, Archive, and EchoLink remain accessible without changing mainline order.

Memories use five UI types (`fact`, `event`, `promiseBoundary`, `relationshipJudgement`, and `reflection`) plus world, branch, source, confidence, and provenance metadata. Validated live memories additionally preserve one of `profile`, `preference`, `relationship`, or `emotional`, importance, emotion, and the triggering message ID. Player-correctable facts, events, and promises/boundaries can be edited; character judgements and reflections cannot be directly rewritten.

Generated dialogue, live intent choices, memory content/sources, relationship explanations, and deterministic system records may use `{ zh, en }` values. Rendering always selects the current interface language. Player-authored messages and manually edited memory text remain plain strings and are never translated automatically. After importing a schema-version-10 archive, a server-only `POST /api/localize` request can translate legacy NPC/system-generated strings once; the bilingual result is then cached in local state. With no Gemini key, the original generated string remains intact and stale-language live choices are replaced visually by the built-in localized suggestions.

## Optional live-provider flow

`POST /api/chat` validates a bounded request and sends only the selected character's current relationship, story state, recent messages, and relevant memories. The browser keeps the complete local transcript but builds each request from a byte-bounded rolling window: up to 20 newest turns and 16 ranked non-obsolete memories, with pinned and current-topic memories preferred. Normal requests stay below 28 KB; the server accepts at most 96 KiB and still applies field-level validation. Gemini returns structured JSON with the selected-language primary fields plus Chinese and English versions of dialogue, intent choices, and memory content. `server/game-event.mjs` validates enums, bilingual fields, and lengths and clamps relationship deltas. `server/story-rules.mjs` preserves the canonical chapter and confirms only known flags whose application prerequisites are true. If configured, a security-definer Supabase RPC stores the event atomically using a server-owned demo-user UUID.

When the validated event contains `scene.changed: true`, the browser separately calls `POST /api/scene`. `server/scene-service.mjs` builds a deterministic visual prompt, fingerprints it with SHA-256, reuses `.cache/echoloom-scenes`, or calls Cloudflare Workers AI. Dynamic image URLs are restricted to `/api/scenes/<64 hex>.jpg`; imported archives cannot inject an arbitrary image URL. A scene error never changes or blocks the dialogue result.

Provider configuration is read from process variables or the ignored root `.env`. The status route never returns secrets. The user-facing app always passes `aiMode: live` for first contact, Story, Chat, generated-scene chat, private EchoLink, localization, and eligible scene requests. Legacy `auto` and `offline` archive values normalize to `live`; provider failure still returns the deterministic result for that turn. With every provider disabled, all pre-existing flows remain functional.

Gemini Interactions responses are read from the current `steps[] → model_output → content[]` structure, with older `output_text`, `outputs`, and candidate formats retained as compatibility fallbacks. The server accepts up to 24 recent messages after removing a duplicate copy of the current input; the browser normally selects up to 20 within its byte budget. An HTTP 413 triggers one emergency retry with at most 10 turns and six memories. Gemini 408, 429, and 5xx responses receive bounded retries inside the original timeout. A 429 from the primary model moves the next attempt to the configured stable Flash-Lite fallback; metadata reports the model that actually answered. A final failure affects only that turn, and the next user message tries live mode again. Prompt rules prioritize the current message, interpret terse clarification turns from immediate context, allow ordinary non-plot conversation, and reject recent-response repetition.

## Compatibility

Schema-version-12 exports restore onboarding, all five journeys, bilingual live content, scene-level investigation progress and choices, Weaver progress, live events/memories/cached-scene metadata, the normalized provider marker, quota use, tutorial and formal creations, EchoLink, campaign, and branches. Schema-version-11 `briefing` resumes at scene entry and its former `sample` phase resumes at the anomaly beat without discarding confirmed anchors. Schema-version-10 and older archives preserve existing generated strings while any legacy `auto` or `offline` provider value normalizes to `live`. Older relationship, story, and archive migrations remain conservative.

EchoLink uses the existing `chatReply` engine for core-character private messages. Group, side-NPC, delayed delivery, contact permission, promises, and high-risk relationship transitions remain rules-controlled. Private player-intent metadata is stored on the player message but is not inserted into NPC-visible text.

`app/reply-timing.js` calculates a bounded 650–2600 ms prototype delay from a character-specific base habit, message channel, several long-term relationship dimensions, strain, and recent response reliability. `app/app.js` keeps pending callbacks in a runtime-only map keyed by thread ID; the map is never exported or archived. Token checks make each scheduled callback commit at most one reply, while reset, import, and rewind cancel outstanding callbacks.

## Provider boundary

The UI retains the four-function `EchoEngine` contract:

- `storyReply(input, state)`
- `chatReply(input, state)`
- `generateScene(prompt, selectedSceneId, state)`
- `sceneReply(input, scene, state)`

A server-backed provider receives the selected character ID and only that character’s relevant journey data. Private model credentials never enter browser code, and the offline engine remains available for demonstrations and automated testing. `EchoApiEngine` is additive; it does not replace or mutate the public `EchoEngine` contract.

Before production deployment, add verified user sessions, per-user authorization, rate limiting, operational moderation, embedding generation/retrieval evaluation, production object storage, observability, and deletion/export synchronization. The current workshop still stores local structured creations and opening hooks only; it does not call a model or claim that an NPC is conscious.
