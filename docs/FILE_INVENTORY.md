# EchoLoom project file inventory

This repository contains the EchoLoom website source and original artwork.

| Path | Contents |
| --- | --- |
| `index.html`, `manifest.webmanifest`, `sw.js` | Website entry, installation metadata, offline cache |
| `app/` | Story UI, bilingual website, characters, local storage and story engine |
| `assets/` | Original brand, character and background artwork |
| `server/` | Optional local server-side AI services; no credentials |
| `supabase/` | Optional database migration and seed |
| `tools/` | Development server, public builder and automated tests |
| `docs/` | Product, architecture, design and research text documentation |
| `AGENTS.md`, `docs/DEVELOPMENT.md` | Repository development guidance |

Run `npm test`, `npm start`, or `npm run build:public` with Node.js 18+. No dependency installation is needed.

Git and the public build exclude `.env`, Git history, managed hosting checkouts, caches, personal relationship exports, machine-specific file inventories, presentation/report binaries, and unrelated research data. Keep API keys in your own ignored `.env` only.

GitHub: https://github.com/Zhguo903/Echoloom

Public story experience: https://echoloom-stories.zestybloom32.chatgpt.site
