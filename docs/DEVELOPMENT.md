# EchoLoom development guide

EchoLoom uses plain HTML, CSS, and JavaScript. The website has no production dependencies and works without an account or API key.

## Run and validate

Use Node.js 18 or newer from the project root:

```bash
npm start
npm test
npm run build:public
```

`npm start` opens the development version at `http://127.0.0.1:5173`. `npm run serve` starts it without opening a browser. The public static build is written to `dist/`; see [public website notes](PUBLIC_WEBSITE.md) for its local-only provider policy and deployment boundary.

## Find the right files

| Change | Files |
| --- | --- |
| Website entrance | `app/website.js`, `app/website.css` |
| Story screens, navigation, and events | `app/app.js` |
| Bilingual copy and character definitions | `app/data.js` |
| Local save, migration, import, and export | `app/storage.js` |
| Deterministic story replies | `app/story-engine.js` |
| Optional live-provider adapter | `app/api-engine.js`, `server/` |
| Palette and story layout | `app/styles.css`, `design-tokens.json` |
| Original artwork | `assets/` |
| Automated checks and public build | `tools/` |

Read [the product brief](PRODUCT_BRIEF.md), [research basis](RESEARCH_BASIS.md), and [architecture](ARCHITECTURE.md) before changing behavior. `AGENTS.md` holds the repository's product and implementation constraints. Record multi-step changes in `PLANS.md`.

## Preserve the product contract

- Keep story-led attraction, independent character lives, and coherent boundaries.
- Keep free text available; suggested replies express intent only.
- Keep each character's messages, memories, knowledge, and branches isolated.
- Keep memories source-linked, visible, editable where appropriate, deletable, and exportable.
- Preserve `EchoEngine`'s `storyReply`, `chatReply`, `generateScene`, and `sceneReply` methods and compatible relationship exports.
- Escape user text, keep credentials server-side, and retain the offline engine.
- Use existing palette tokens and original artwork; preserve keyboard access and touch targets of at least 42 px.
- Avoid streaks, coins, message quotas, guilt, and punishment for absence.

After runtime or asset-path changes, run `npm test` and check the affected flow at 393 × 852 and a desktop viewport. Check the console and, for state changes, export/reset/import. Document user-visible behavior and schema changes.

## Optional services and report tooling

Copy `.env.example` to your own ignored `.env` only when testing live services. See [optional AI setup](OPTIONAL_REAL_AI_UPGRADE.md); never add credentials to browser code or commits.

The optional coursework report generator needs Python 3.10+ and `python-docx`. These are separate from the dependency-free website. It resolves inputs relative to its own project location and accepts a custom output:

```bash
python3 tmp/report_work/build_a3_report.py --output /path/to/report.docx
```

Without `--output`, it writes `output/report/EchoLoom_A3_Report.docx`.
