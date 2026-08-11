# EchoLoom Interactive Demo

A dependency-free, locally runnable mobile prototype for a story-first, multi-character relationship simulation with reversible narrative branches.

## Run

Node.js 18+ is recommended.

```bash
npm start
```

No dependency installation is required. The local server opens `http://127.0.0.1:5173`.

The deterministic `EchoEngine` is the default and needs no account or API key. An optional server-only live loop is also available:

```bash
cp .env.example .env
# Add only the providers you want to test, then:
npm start
```

- Gemini returns a validated structured Game Event for Story, Chat, generated-scene chat, and private EchoLink replies.
- Supabase can persist isolated character context, relationship changes, story state, messages, and meaningful memories.
- Cloudflare Workers AI can generate a background only when a validated event changes the scene; identical prompts reuse a local fingerprint cache.
- Long conversations keep the full local transcript while sending only a bounded recent-and-relevant context window. Oversized requests retry automatically; a primary-model rate limit switches to a stable Flash-Lite fallback. A final provider failure falls back for that turn and the next message tries live mode again. Secrets remain in `.env` and never enter browser JavaScript.

Apply `supabase/migrations/202608100001_api_foundation.sql`, then `supabase/seed.sql`, before enabling Supabase. See `docs/OPTIONAL_REAL_AI_UPGRADE.md` for exact setup and API contracts.

Platform launchers are included:

- macOS: `run-mac.command`
- Windows: `run-windows.bat`
- Linux: `run-linux.sh`

## Test

```bash
npm test
```

## What is interactive

The prototype now opens with a brand/title sequence and a persistent visual-novel onboarding: the 17-second outage, player naming, a five-signal orbital scan, one three-character rescue, a qualitative result, EchoLink activation, first free-text contact, the formal Observatory home, and isolated branch creation. EchoLink remains a second main interface with Messages, Contacts, Moments, Bonds, and Archive tabs; story-dependent permissions; private/group/delayed threads; avatar-based typing feedback; relationship-aware reply timing; and branch-aware history. Existing relationship analysis, shared events, typed and source-linked memories, world/scene generation, custom NPC creation, bilingual UI, and schema-v10 JSON export/import remain available from the five-part primary navigation and desktop feature-demo group. Schema v10 automatically uses Gemini when a server key is configured while retaining a force-offline setting.

Relationship dimensions are never presented as an affection score, and attraction or player wording never confirms romance, exclusivity, or consent automatically.

See `README_ZH.md` for detailed Chinese instructions and `CODEX_START_HERE.md` for Codex workflows.
