# Technical notes

## Current implementation

- Static HTML, CSS, and JavaScript.
- No build step and no third-party runtime dependency.
- State is stored in browser `localStorage` under `echoloom-demo-state-v1`.
- Scene generation is deterministic and keyword-based so it works offline.
- Content is separated into `app/data.js` to keep bilingual copy, character profiles, journey defaults, and scene metadata editable.
- Schema version 5 stores separate journeys for Qi An, Shen Yao, Li Chuan, Zhou Tang, and Wen Sheng plus opening decisions, EchoLink, shared campaign, and recoverable archive state.
- The app uses a small state machine rather than URL routing.
- Opening chapters and generated scenes use a cinematic spotlight only before the first player message. Once conversation begins, every character and player message stays in one insertion-ordered history so a reply cannot appear above the message that triggered it.
- The service worker caches the prototype when served over HTTP.
- Archive snapshots include `journeys` and `campaign` but not the archive collection itself; rewinding snapshots the branch being left first.
- Relationship state, player-expression signals, and mutual agreements are separate objects. Only explicit agreement actions change the relationship label.
- Knowledge carries source, confidence, and `knownBy`; memories carry type, world, branch, source, confidence, and provenance.
- The world/NPC creator is a local setting-card prototype, not a procedural generation service.
- Wen Sheng is the in-world collaborator for the creator entry; meeting her opens a direct path from the setting cards to her EchoLink thread.
- EchoLink contact access is derived from the current story state; seeing an NPC does not grant every private channel.
- Core private messages reuse `EchoEngine.chatReply`; group attribution, delayed delivery, side-NPC replies, promises, and call availability are deterministic offline rules.
- EchoLink replies use one thread-scoped scheduler: the player message renders immediately, an avatar-based three-dot status appears, and a token-checked callback inserts exactly one reply. Pending timers are runtime-only and are cancelled by reset, import, or rewind.
- `app/reply-timing.js` bounds simulated waits to 650–2600 ms. Character habit and channel remain primary context; relationship continuity and recent communication rhythm adjust the wait without creating a single affection score.
- Simulated voice/photo messages are typed narrative records. The prototype does not capture media or claim a real call occurred.
- Each journey stores a recent communication pulse separately from its long-term relationship dimensions.
- EchoLink is nested inside `campaign`, so contacts, unread counts, conversations, moments, promises, and pending events are automatically included in branch snapshots.

## Replacing the local narrative engine

A production implementation should keep the browser UI separate from any model credential. Recommended architecture:

1. Browser sends the latest user message plus a small structured relationship state to a secure backend.
2. Backend retrieves only relevant memories.
3. Backend applies the official character core, current life state, and event constraints.
4. Model produces short dialogue plus optional structured memory candidates.
5. Backend validates and returns content.
6. User confirms or edits durable memories before they become part of the relationship timeline.

The offline engine should remain available for classroom demos and automated testing.

Production relationship and world simulation should treat the exact dimensions, weights, and thresholds as configurable product hypotheses rather than validated psychological measures.
