# Technical notes

## Current implementation

- Static HTML, CSS, and JavaScript.
- No build step and no third-party runtime dependency.
- State is stored in browser `localStorage` under `echoloom.demo.v2` and migrates through schema version 10. Automatic mode uses Gemini when the local server reports a configured key and otherwise remains offline.
- The default scene generator is deterministic and keyword-based. Optional live events can request a server-generated FLUX background only after `scene.changed`, with a SHA-256 disk cache and packaged fallback.
- Content is separated into `app/data.js` to keep bilingual copy, character profiles, journey defaults, and scene metadata editable.
- Schema version 10 stores separate journeys for Qi An, Shen Yao, Li Chuan, Zhou Tang, and Wen Sheng plus automatic/live/offline preference, live story/scene metadata, opening decisions, EchoLink, shared campaign, and recoverable archive state.
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

## Optional live narrative engine

The implemented feasibility architecture keeps the browser UI separate from every model and persistence credential:

1. Browser sends the latest user message plus a small structured relationship state to a secure backend.
2. Backend retrieves only relevant, non-obsolete memories for the selected character.
3. Backend applies the official character core, current life state, and event constraints.
4. Gemini produces a structured Game Event containing concise dialogue and bounded suggestions.
5. Backend validates shape, enums, lengths, deltas, canonical story state, and allowed flags; optional Supabase persistence is atomic.
6. Eligible memories enter a visible, source-linked local timeline where the user can edit applicable facts/events or delete any memory.
7. A separate Cloudflare call occurs only for an actual scene change and reuses the fingerprint cache.

The complete transcript and editable memory archive remain local, while each live request uses a fixed byte-bounded rolling context. Current-topic and pinned memories are preferred, so conversation history can grow without making the request grow indefinitely. Oversized requests retry once with an emergency compact context; short-lived Gemini rate limits and provider errors retry within the original timeout. A primary-model 429 automatically tries the configured stable Flash-Lite fallback. A final failure falls back only for that turn and does not disable the next live attempt.

The offline engine remains available for classroom demos and automated testing. Missing configuration, timeouts, rate limits, malformed output, persistence failures, and scene failures have typed recovery paths.

Production relationship and world simulation should treat the exact dimensions, weights, and thresholds as configurable product hypotheses rather than validated psychological measures.
