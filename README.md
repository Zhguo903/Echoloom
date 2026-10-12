# EchoLoom Interactive Demo

A dependency-free, locally runnable mobile prototype for a story-first, multi-character relationship simulation with reversible narrative branches.

## Public website

[Play EchoLoom](https://echoloom-stories.zestybloom32.chatgpt.site) in a mobile or desktop browser. The public story edition needs no installation, account, or API key. It uses the local story engine and keeps each visitor's save in their own browser; online model generation and account synchronization are not enabled.

Use `npm run build:public` to produce the reviewed static website in `dist/`. See [the file inventory](docs/FILE_INVENTORY.md) and [public website deployment notes](docs/PUBLIC_WEBSITE.md). The local development mode below retains optional server-side AI.

## Run

Node.js 18+ is recommended.

```bash
npm start
```

No dependency installation is required. The local server opens `http://127.0.0.1:5173`.

Core-character free-form conversations now try the server-only Gemini loop first. The deterministic `EchoEngine` remains an automatic per-turn fallback, so the demo still works without an account, network connection, or API key:

```bash
cp .env.example .env
# Add only the providers you want to test, then:
npm start
```

- Gemini returns a validated bilingual structured Game Event for first contact, Story, Chat, generated-scene chat, and private EchoLink replies. Dialogue, intent suggestions, and saved-memory content can rerender immediately when the interface language changes.
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

The prototype now opens with a brand/title sequence and a persistent visual-novel onboarding: the 17-second outage, player naming, a five-signal orbital scan, one three-character rescue, a qualitative result, EchoLink activation, first free-text contact, the formal Observatory home, and isolated branch creation. Chapters 2–6 use scene-led investigation beats with five different mechanics instead of one repeated question form; free text remains available as an optional custom response, while evidence comes only from world interaction. EchoLink remains a second main interface with Messages, Contacts, Moments, Bonds, and Archive tabs; story-dependent permissions; private/group/delayed threads; avatar-based typing feedback; relationship-aware reply timing; and branch-aware history. Existing relationship analysis, shared events, typed and source-linked memories, world/scene generation, custom NPC creation, bilingual UI, and schema-v12 JSON export/import remain available from the five-part primary navigation and desktop feature-demo group. Schema v12 migrates schema-v11 chapter progress, normalizes legacy provider preferences to Gemini-first mode, stores new generated content bilingually, and retains automatic offline fallback. Player-authored text is always preserved exactly as entered.

Relationship dimensions are never presented as an affection score, and attraction or player wording never confirms romance, exclusivity, or consent automatically.

See `README_ZH.md` for detailed Chinese instructions and `CODEX_START_HERE.md` for Codex workflows.
