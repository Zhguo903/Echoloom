# EchoLoom public website

EchoLoom has a public website entry point and the existing bilingual story experience. Visitors can start a story, return to their progress, inspect and correct memories, export or import an archive, and reset their local data. The reference mobile frame remains 393 × 852; the website also provides a desktop presentation.

## Run and validate

Node.js 18 or newer is sufficient. There are no production dependencies or build-time packages to install.

```bash
npm start
```

This starts the local development server and opens the site at `http://127.0.0.1:5173`. `npm run serve` starts the same server without opening a browser. Local development retains the optional server-side provider flow documented in [OPTIONAL_REAL_AI_UPGRADE.md](OPTIONAL_REAL_AI_UPGRADE.md).

```bash
npm test
npm run build:public
```

The public build is written to `dist/`. An external absolute output directory can be supplied with `npm run build:public -- --out /absolute/path/dist`. The builder refuses repository source directories. Only generated build directories should be used as output destinations.

Serve `dist/` as the document root of an ordinary static HTTPS host. For a local static preview when Python is available:

```bash
python3 -m http.server 4173 --directory dist
```

Open `http://127.0.0.1:4173` to verify the public version. The repository's `npm start` command serves the development version, so its optional provider behavior differs from the public build.

## Public runtime and privacy

The builder inserts `app/public-config.js` before every other script, setting `window.ECHOLOOM_PUBLIC = Object.freeze({ offlineOnly: true })`. It also adds that file to the generated service worker's offline asset list. In this mode, provider discovery, character replies, legacy-text localization, and generated scene backgrounds make **zero provider API requests**, even if an imported archive contains a live-provider preference. Character interaction uses the deterministic local `EchoEngine`; the public website does not offer unrestricted live model generation.

Relationship progress, messages, memories, character journeys, and branches remain in the visitor's browser under the existing schema version 12. Different browsers and devices have independent saves. No account or cross-device synchronization is provided. People sharing the same browser profile can access that profile's local save. Exporting an archive deliberately downloads the visitor's relationship data; visitors should store or share that file accordingly.

If browser storage is blocked or full, EchoLoom retains the current session in memory and keeps export and reset available. Such a session may be lost when the page closes, so the website exposes the storage status and export controls. Reset clears the local EchoLoom save where browser access permits it; exported files remain under the visitor's control.

The service worker caches public application assets, excludes API requests, and removes only EchoLoom's own old caches. The local development server restricts static access to the public entry files and allowlisted files under `app/` and `assets/`, denies symbolic links and traversal paths, and accepts only GET and HEAD for static files.

## Deployment package

The build contains only:

- `index.html`, `manifest.webmanifest`, and `sw.js`;
- public runtime and website files under `app/`, including generated `public-config.js`;
- the original public artwork and assets under `assets/`.

It excludes `.env`, `.git`, private documentation, reports and presentations, `server/`, `supabase/`, `tools/`, caches, dependency directories, and project instructions. There is no API implementation in the static package. Do not deploy the full repository or enable its development API as an unauthenticated public backend.

The Sites working directory is `sites/echoloom-public/`. Copy the sanitized `dist/` into `sites/echoloom-public/dist/`; Sites owns the `.openai` hosting configuration in that working directory. Rebuild and replace the copied artifact before each deployment so it matches the validated source.

Deployment tracking:

- Visibility: public, as requested for use by other people.
- Sites project ID: `appgprj_6acbcacd96388191ab92d19e282fd316`.
- Published website: [EchoLoom Stories](https://echoloom-stories.zestybloom32.chatgpt.site).
- Release: version 1, deployed successfully on 2026-10-11 with source commit `177247df65a45c7e0c2f73f6b08babe8b0956430`.
- Live verification: the native deployment returned `succeeded`; an unauthenticated HTTP request returned 200 without a login redirect; the public config contains `offlineOnly: true`. The live entrance and story render in the browser at mobile 393 × 852 and desktop 1440 × 1000 with no horizontal overflow, broken visible images, or console errors. Hosting returns the entry HTML for unknown routes; excluded paths do not return repository files.

## Validation and remaining scope

The automated public website suite checks the package allowlist and index resource references, private-file and symbolic-link exclusion, encoded traversal denial, static HTTP methods and HEAD responses, zero-network public provider behavior, and session/export/reset recovery when local storage throws. The existing state migration, character isolation, structured provider boundary, background, and offline suites remain in `npm test`.

Reply handlers now retain their originating character and check state, branch, and journey ownership after asynchronous replies. EchoLink validates its pending-reply token after waiting for a provider. Generated-scene conversation updates target the captured journey. These protections prevent late replies after reset, import, or branch restoration from becoming part of a replacement relationship archive.

Browser checks completed: bilingual entrance and language persistence; first play; trainee-name input; five-signal selection; Qi An rescue and qualitative result; EchoLink activation; a free-text offline reply; return to the Observatory; refresh recovery; public engine/privacy settings; return-home focus and continue labeling. The deployed entrance and desktop story shell also passed visual checks. Archive migration, export/import/reset, character isolation, memory provenance, and blocked-storage recovery pass automated tests. The in-app browser did not emit a download event for the existing Blob export action, so an actual downloaded-file round trip was not manually confirmed in that browser. Full mainline usability research and broad browser/device coverage remain ongoing product work.

Live AI remains a separate future release decision: the optional Supabase implementation uses one shared demo user and is unsuitable for a public multi-user service. Enabling a public live backend requires verified per-user sessions and authorization, isolation, abuse and cost controls, operational monitoring, and reviewed data disclosure and deletion behavior.
