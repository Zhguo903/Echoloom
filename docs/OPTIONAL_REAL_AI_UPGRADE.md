# Optional Gemini + Supabase + Cloudflare loop

EchoLoom now includes a deliberately constrained live path while keeping the deterministic `EchoEngine` as the default and automatic fallback. The UI and its four-method contract remain unchanged:

- `storyReply(input, state)`
- `chatReply(input, state)`
- `generateScene(prompt, selectedSceneId, state)`
- `sceneReply(input, scene, state)`

The optional loop is:

```text
free-text input
  → selected-character context + recent messages + relevant memories
  → Gemini structured Game Event
  → shape/length/delta validation
  → application-owned story rules
  → optional atomic Supabase persistence
  → visible reply, intent choices, qualitative relationship explanation, and source-linked memory
  → Cloudflare FLUX only when scene.changed is true
  → SHA-256 disk cache or packaged-background fallback
```

## Local setup

1. Copy `.env.example` to `.env`. The zero-dependency server reads `.env` automatically; process environment variables take precedence.
2. Add `GEMINI_API_KEY` to enable live dialogue. `GEMINI_MODEL` defaults to `gemini-3.6-flash`; `GEMINI_FALLBACK_MODEL` defaults to the stable, higher-throughput `gemini-3.5-flash-lite` and is tried when the primary model returns 429.
3. Optionally add Supabase and/or Cloudflare values described below.
4. Run `npm start`. Schema v10's default **Automatic** mode detects the server key and enables Gemini; Settings also offers **Always try Gemini** and **Force offline simulation**. Never open a live test by serving the browser files from a different server.

Do not commit `.env`. The provider-status endpoint reports only whether a provider is configured and which public model name is selected; it never returns a credential.

## Supabase setup

1. Create a Supabase project and enable the `vector` extension if the migration cannot create it automatically.
2. Apply `supabase/migrations/202608100001_api_foundation.sql` in the SQL editor or with the Supabase CLI.
3. Apply `supabase/seed.sql` to create the five shared, server-only character personas.
4. Create a demo user in Supabase Auth and copy its UUID.
5. Add a matching profile row:

```sql
insert into public.users (id, username)
values ('YOUR_AUTH_USER_UUID', 'local-demo');
```

6. Set `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `ECHOLOOM_DEMO_USER_ID` in `.env`.

This feasibility build intentionally uses one server-owned demo user. A browser-supplied `userId` is accepted only for request compatibility and is never used for database authorization. A multi-user deployment must replace this with verified session authentication before launch.

The migration creates users, worlds, characters, relationships, chat messages, memories, story states, story choices, save slots, and scene-background metadata. RLS is enabled. Browser roles cannot read system prompts or cached-scene records. `apply_validated_game_event` atomically stores the two messages, clamped relationship changes, rule-approved story state, and an eligible memory.

## Gemini Game Event

`POST /api/chat` accepts only a known character ID, a 1–1000 character message, up to 24 recent messages, and the current branch. The complete transcript stays in local state; the browser sends a rolling context of at most 20 recent turns plus up to 16 byte-bounded memories ranked by pinning, current-topic relevance, importance, and recency. The normal serialized request is capped at 28 KB. The server's 96 KiB envelope leaves compatibility headroom while field-level validation remains authoritative, then retrieves at most six relevant non-obsolete memories and builds the official persona prompt.

If a request still receives HTTP 413, the browser automatically retries once with at most 10 turns and six compact memories. Gemini 408, 429, and 5xx responses retry up to two times within the original request timeout, respecting a bounded `Retry-After` delay. A primary-model 429 switches the next attempt to `GEMINI_FALLBACK_MODEL`; the response metadata records the model that actually succeeded. If those attempts still fail, only the current turn uses the offline engine; the next message automatically attempts Gemini again. Successful responses use JSON structured output, read the current Interactions `steps[].content[]` response, and are validated again before use. The prompt must answer the current message first, treats terse clarification as a follow-up to the latest character reply, permits ordinary conversation, and forbids repeating recent character output.

The normalized event contains:

```json
{
  "dialogue": "Concise in-character reply",
  "emotion": "gentle",
  "expression": "concerned",
  "relationship": {
    "intimacy_delta": 1,
    "trust_delta": 1.5,
    "romance_delta": 0,
    "tension_delta": -0.5
  },
  "story": {
    "chapter": "character_story_1",
    "event": "quiet-company",
    "unlock_event": null,
    "requested_flags": ["shared_memory_acknowledged"],
    "flags": { "shared_memory_acknowledged": true }
  },
  "scene": {
    "changed": false,
    "location": "archive",
    "time": "evening",
    "weather": "rain",
    "mood": "quiet"
  },
  "memory": {
    "save": true,
    "importance": 8,
    "content": "User prefers quiet company before advice.",
    "memory_type": "preference",
    "emotion": "tired"
  },
  "choices": [{ "text": "先安静陪伴", "intent": "quiet_company" }]
}
```

Relationship deltas are clamped server-side. Model choices are at most three short intent labels; free text remains available. The model can propose only four known story flags. The application confirms them from observable prerequisites, preserves the canonical chapter, and never lets the model unlock an arbitrary finale.

## Memory rules

The first version saves only `profile`, `preference`, `relationship`, or `emotional` memories. A memory must be explicitly proposed, have importance 6 or higher, and contain meaningful content. Local memories preserve character, branch, world, provider provenance, and the triggering message ID. They remain visible, editable where user-authored facts/events are editable, deletable, pinnable, and exportable.

Supabase currently uses bounded keyword/recent retrieval. The `embedding vector(768)` column and indexes prepare for a later Gemini Embedding + pgvector RPC, but the current build does not pretend keyword matching is semantic search.

## Cloudflare scene backgrounds

`POST /api/scene` rejects requests unless the validated event has `scene.changed: true`. The server converts only location, time, weather, and mood into an original EchoLoom visual-novel background prompt. It requests the configured Workers AI model, validates the JPEG response, and stores it under `.cache/echoloom-scenes/<sha256>.jpg`.

The response URL is `GET /api/scenes/<sha256>.jpg`. The fingerprint makes identical prompts immutable and reusable, so a repeated scene does not consume another image generation. If Cloudflare is missing, times out, returns an error, or returns an invalid image, the current packaged background remains visible.

## HTTP endpoints

- `GET /api/health` — local server health.
- `GET /api/provider-status` — secret-free configuration status.
- `POST /api/chat` — validated Gemini Game Event; returns typed `provider_*` errors with `fallback: "offline"`.
- `POST /api/scene` — scene-change-gated Cloudflare generation/cache lookup.
- `GET /api/scenes/<fingerprint>.jpg` — immutable cached scene image.

## Security and current limits

- Gemini, Supabase service-role, and Cloudflare credentials exist only in the Node process.
- User and model strings are bounded; UI output is HTML-escaped.
- Live request size is independent of total transcript length; long local histories are reduced to a recent-and-relevant context window without deleting user data.
- Each request receives only the selected character's context. EchoLink group rules, delayed delivery, permissions, and private intent separation remain deterministic.
- Story progress, memory acceptance, relationship agreements, consent, and unlocks are application-owned. A relationship delta cannot confirm romance or exclusivity.
- The offline demo, import/export, and packaged assets continue to work with every provider disabled.
- Authentication, rate limiting, moderation operations, production observability, Supabase Storage mirroring, vector embedding generation, TTS, speech input, and AI-created custom NPCs/worlds are intentionally later phases.

Provider references: [Gemini structured output](https://ai.google.dev/gemini-api/docs/structured-output), [Supabase pgvector](https://supabase.com/docs/guides/ai/vector-columns), and [Cloudflare FLUX.1 Schnell](https://developers.cloudflare.com/workers-ai/models/flux-1-schnell/).
