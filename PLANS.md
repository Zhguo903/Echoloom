# EchoLink MVP Plan

## Optional Gemini + Supabase + Cloudflare API loop — 2026-08-10

### Product outcome

Add one deliberately constrained live-AI path to the existing dependency-free prototype: a selected character can answer through a validated structured Game Event, remember only meaningful user disclosures, advance only rules-approved story flags, and request a cached background only when the scene actually changes. The deterministic `EchoEngine` remains the default and the automatic fallback, so the demo continues to work without accounts, network access, or keys.

### Compatibility and safety decisions

- Preserve the current HTML/CSS/JavaScript UI, navigation, five independent journeys, schema-v8 imports, and the four-method `EchoEngine` contract. Do not migrate to React/Next or add a production dependency.
- Keep the browser's relationship archive authoritative in offline mode. Supabase synchronization is optional and server-owned; browser code never receives the service role key or model/image credentials.
- Map the live event's trust, intimacy, and romance directions into the existing eleven-dimensional qualitative model. Do not derive or rename a relationship agreement from a score.
- Treat model-proposed story changes, memories, choices, expressions, and scene changes as untrusted suggestions. Validate shapes and lengths, clamp deltas, filter allowed flags, and apply database changes only through application rules.
- Keep free text primary. Model choices must be short intent labels, not complete dialogue written on the player's behalf.
- Keep memory visible, editable/deletable, source-linked, branch-scoped, and exportable. Save only profile facts, preferences, shared relationship events, and emotionally important disclosures.
- Do not claim consciousness, add retention mechanics, or send one character's private journey data to another character.

### Implementation plan

1. Add the Supabase migration for users, characters, relationships, chat messages, memories, story states, story choices, worlds, save slots, and cached scene metadata; add RLS and a validated-event RPC boundary.
2. Add environment parsing, bounded JSON request handling, provider status, Gemini structured-output calls, semantic validation, timeouts, and safe error responses.
3. Add a browser provider adapter and connect Story, Chat, generated-scene chat, and private EchoLink messages while retaining typing feedback and deterministic fallback.
4. Add schema-v9 live-event state, rules-approved story flags, four-class meaningful memory conversion, model intent choices, expression state, and backward-compatible import/export tests.
5. Add deterministic scene prompts, Cloudflare FLUX calls only for `scene.changed`, disk caching by prompt fingerprint, and packaged-background fallback.
6. Update architecture, optional-AI, setup, cache, and testing documentation; run `npm test`; verify direct/offline, live-fallback, export/reset/import, 393 × 852, desktop, and console behaviour.

Status: In progress — Phase 1.

## Four-week validation plan from the current MVP — 2026-08-07 to 2026-09-03

### Current baseline

The schema-v8 offline MVP is complete and testable end to end: Xu Cheng's five-anchor investigation, five first-response routes, EchoLink, source-linked and user-controllable memories, branch rewind, relationship archives, the Weaver tutorial and Workshop, narrative-only packaged backgrounds, bilingual copy, and local export/import. The automated smoke, migration, state, and character-engine suites pass. The remaining work is product validation, targeted refinement, a deliberately constrained live-AI feasibility spike, and a pilot-ready hand-off—not expansion of the character or chapter catalogue.

### Week 1 — Aug. 7–13: evidence baseline

- Freeze the schema-v8 demo and define success measures for comprehension, continuity, trust, task completion, and emotional credibility.
- Recruit 6–8 target participants and test the opening, first rescue, first investigation chapter, EchoLink, memory controls, and branch recovery.
- Produce a ranked issue log with direct observations, severity, affected journey, and a clear keep/change/cut decision.
- Saria owns the test build, lightweight event logging, bug triage, and mobile/desktop fixes; Roxy owns the screener, recruitment, moderation, synthesis, and presentation update.

### Week 2 — Aug. 14–20: continuity and trust refinement

- Fix the highest-impact usability issues without changing the product concept or adding new journeys.
- Simplify relationship and memory language where needed; verify source links, edit/delete controls, branch rewind, and export/import recovery.
- Run a focused five-user retest on the revised trust and continuity interactions.
- Saria owns state/storage fixes, accessibility, and regression coverage; Roxy owns UX copy, sessions, findings, and prioritisation.

### Week 3 — Aug. 21–27: constrained live-AI spike

- Add one optional server-side provider for one character while preserving the existing `EchoEngine` contract and deterministic offline default/fallback.
- Scope context to the selected character and relevant source-linked memories; add timeouts, error states, disclosure, and privacy boundaries.
- Compare offline and live responses for character consistency, responsiveness, disagreement, safety, and user understanding.
- Saria owns the proxy, adapter, privacy, and failure handling; Roxy owns prompt/character QA, consent review, and a five-user comparison.

### Week 4 — Aug. 28–Sep. 3: pilot and hand-off

- Run an eight-user pilot on the complete demo and resolve the top P0/P1 issues.
- Deliver a demo-ready build, updated research traceability, a clean GitHub hand-off, the final presentation, and a documented next-step decision.
- Saria owns release QA, evidence instrumentation, the technical hand-off, and the analytics summary; Roxy owns recruitment, synthesis, the final narrative, and product recommendations.

### Explicit scope cuts and fallbacks

- Do not add characters, chapters, real calls/audio, background notifications, community sharing, cloud accounts, a native app, or infinite procedural worlds during these four weeks.
- If live AI is unstable, unsafe, or late, keep the deterministic offline engine as the demo default and ship the spike separately; it must not block the pilot.
- If recruitment is slow, prioritise campus and friends-of-friends, then reduce the Week 3 comparison sample before reducing the final pilot.
- If memory or relationship controls remain confusing, simplify labels and surface source/edit controls before adding more dimensions or visual metrics.

Status: Planned.

## Follow-up: packaged-background path portability — 2026-08-04

### Product outcome

Load every packaged narrative PNG both through `npm start` and when the prototype `index.html` is opened directly from disk. Eliminate the broken-image fallback that made the dark phone background appear empty while preserving the current scene mapping and visual treatments.

### Plan

1. Verify ZIP integrity and confirm all extracted PNG dimensions and formats.
2. Store project-relative asset paths and resolve them against the current document URL before applying them to image elements or CSS backgrounds.
3. Refresh offline versions, run `npm test`, and verify HTTP plus direct-file loading paths.

Status: Completed on 2026-08-04.

Validation:

- `unzip -t` reports no errors for all eleven archive members. Every extracted BG01–BG09 file is a valid, non-interlaced 1080 × 1920 RGB PNG.
- Replaced root-relative `/assets/...` values with project-relative paths resolved through `new URL(assetPath, document.baseURI)`, producing valid HTTP URLs under `npm start` and valid adjacent `file:///.../assets/...` URLs when `index.html` is opened directly.
- The live rescue scene reports `complete: true`, `naturalWidth: 1080`, `naturalHeight: 1920`, zero broken images, and no horizontal overflow at 393 × 852. Desktop verification preserves the 393 × 852 phone frame and also reports zero broken images.
- The browser warning/error log is empty, and `npm test` passes with 31 required files and 25 served resources. No story state or schema changed.

## Follow-up: narrative-background visibility correction — 2026-08-04

### Product outcome

Make the supplied dark-indigo narrative PNGs visibly readable in every plot canvas. Preserve the unchanged phone shell and primary pages, while reducing legacy blackout overlays only on mapped narrative scenes so architecture, light paths, rain, shelves, and celestial geometry remain visible behind the UI.

### Plan

1. Add a scene-specific brightness lift and a light atmospheric wash to the packaged background layer.
2. Reduce the legacy prologue, rescue, signal-preview, and result overlays only when a packaged narrative scene is present.
3. Refresh offline style versions, run `npm test`, and visually verify representative light, rain, lab, tribunal, and Weaver scenes at mobile and desktop sizes.

Status: Completed on 2026-08-04.

Validation:

- Confirmed the original pack assets are intrinsically near-black indigo illustrations; the visibility issue was amplified by legacy blackout, rescue, preview, and result gradients.
- Added per-scene brightness, contrast, and saturation lifts for image-based narrative scenes, reduced legacy overlays, and added a screen-blended blue lift for investigation and Weaver canvases.
- Browser screenshots at 393 × 852 confirm visible observatory geometry, repair-lab panels, tribunal architecture, Tide City skyline, moon, rails, and platform lines. Text remains legible, no visible button is covered, and there is no horizontal overflow.
- The 1440 × 1000 desktop presentation keeps its 393 × 852 phone frame, the browser warning/error log is empty, and `npm test` passes with 31 required files and 25 served resources.

## Follow-up: narrative-only background correction — 2026-08-04

### Product outcome

Keep the phone presentation and all primary functional pages on their established backgrounds. Apply the supplied environment pack to the actual plot canvases—visual-novel rescue scenes, character story scenes, investigation chapters, and the story-led Weaver arc—so the location changes are visible where the narrative happens without restyling navigation hubs.

### Plan

1. Remove Observatory home, Story/World hubs, EchoLink, Branch Archive, and Workshop from the packaged-background resolver.
2. Map character-specific rescue/story image layers and state-specific investigation/Weaver narrative canvases to the supplied backgrounds.
3. Scope scrims and translucent surfaces to plot canvases only, while preserving buttons, free-text inputs, headers, and the phone shell.
4. Refresh offline asset versions, run `npm test`, and verify unchanged primary pages plus changed plot scenes at 393 × 852 and desktop size.

Status: Completed on 2026-08-04.

Validation:

- Confirmed that the title, phone shell, Observatory home, five-signal roster, Story and World hubs, EchoLink, Branch Archive, and formal Workshop receive no packaged scene attribute and retain their original computed backgrounds.
- Confirmed that the prologue replaces its visual-novel image with BG01; character signal previews and rescue scenes replace their own scene images; investigation and Weaver backgrounds are confined to their scrollable plot canvases instead of the whole app screen.
- Live browser checks at 393 × 852 found no horizontal overflow or covered visible buttons on the signal preview, rescue, investigation, and main-page paths. The 1440 × 1000 desktop shell retains the 393 × 852 phone frame, and the browser warning/error log is empty.
- All nine narrative-background URLs return HTTP 200. `npm test` passes with 31 required files and 25 served resources; story state and the schema remain unchanged.

## Follow-up: packaged narrative-background system — 2026-08-04

### Product outcome

Apply the supplied `EchoLoom_Background_Pack.zip` as a state-aware environment system across the established Xu Cheng investigation, EchoLink, Weaver arc, and first personal-world opening. The opening brand/title background remains unchanged; subsequent narrative surfaces should communicate the current location without reducing text contrast or blocking any control.

### Scene mapping and compatibility

- Keep the existing brand reveal and title courtyard exactly as they are.
- Use BG01 for Observatory arrival, identity registration, the seventeen-second correction context, signal routing, and daily return; use BG02 for missing-person and branch-archive review.
- Use BG03 for Wen Sheng's damaged-dream verification, BG04 for memory restoration and deletion-log work, BG05 for future-message/EchoLink surfaces, and BG09 for the deleted-world investigation, primary-lens review, and finale.
- Use BG06 when the sealed Weaver Room and Echo 000 are first discovered, BG07 after EchoLoom activation through stability threads, NPC creation, Lv.8 workshop access, and monthly calibration, then BG08 for the free Tide City world and Nan Xing opening.
- Preserve navigation, copy, story state, storage schema, free-text inputs, touch targets, and offline behaviour. Scene art stays behind existing content with coordinated scrims and translucent content surfaces.

### Implementation plan

1. Import the nine supplied portrait-format scene backgrounds with descriptive local filenames and preserve the pack README mapping in project documentation.
2. Add one state-derived scene-background resolver and apply it only to mapped screens; retain character-specific legacy screens and the unchanged first title surface.
3. Add per-scene positioning and legibility treatments, update cache versions/offline assets, and document the visual mapping.
4. Run `npm test`, then verify the title, opening, dream, memory, EchoLink, tribunal, Weaver, Tide City, and core controls at 393 × 852 and desktop size with no console errors.

Status: Completed on 2026-08-04; page-level scope was subsequently narrowed by the narrative-only correction above.

Validation:

- Imported all nine supplied PNG environments with descriptive local filenames, documented the pack mapping, and added every asset to the offline cache.
- Confirmed that the brand/title courtyard remains unchanged and receives no scene-background attribute; mapped screens resolve to the intended Observatory, Archive, Station, Repair Lab, EchoLink, Weaver, Tide City, or Tribunal art from their current route and story state.
- Verified the title, prologue, Observatory home, Branch Archive, investigation finale, Weaver completion/workshop, EchoLink list/thread, free-text composer, and desktop shell in the live browser. At 393 × 852 and 1440 × 1000 there is no horizontal overflow, no covered visible button, and no browser warning or error.
- Added scene-specific scrims, translucent content surfaces, and Tide City ending-copy contrast without moving controls or changing story/state behaviour. All nine background URLs return HTTP 200, and `npm test` passes with 31 required files and 25 served resources.

## Follow-up: “The First Free Thread” and Weaver Workshop — 2026-08-04

### Product outcome

Turn world/NPC creation from an always-visible settings form into a story-earned identity transition. After resolving Xu Cheng’s existing five-evidence investigation, the observer enters the sealed Weaver Room, stabilises Echo 000 through identity, desire, memory, boundary, and world threads, completes one free NPC and world creation, and reaches Observer Lv.8 as an authorised Weaver.

### Narrative and compatibility decisions

- Preserve the implemented Xu Cheng prologue, five first-response routes, fixed five-chapter evidence chain, finale choices, relationship state, and exported schema-v7 data. The new arc begins after that finale instead of replacing it.
- Map the five stability threads to the existing cast without inventing disposable tutors: Xu Cheng anchors identity, Wen Sheng desire, Qi An memory, Zhou Tang boundary, and Li Chuan world. Shen Yao verifies the resulting person is not merely a compliant system profile.
- Keep free text available in every stability-thread scene; optional chips express intent only. Narrative evidence and tutorial completion cannot be lost because of wording, caution, or relationship score.
- Treat the requested monthly creation limits as transparent offline capacity windows, not a grind or sales mechanic: three confirmed NPC creations and one confirmed world creation per local calendar month, first tutorial creations free, drafts and edits free, existing creations permanent, and mainline progress never quota-gated.

### Implementation plan

1. Add bilingual Weaver arc definitions, Echo 000 stability state, observer-level derivation, tutorial NPC/world drafts, created-item collections, and monthly quota state.
2. Add a locked-workshop explanation, a dedicated scrollable “First Free Thread” screen, five story-led stability scenes, and free first NPC/world creation confirmation.
3. Upgrade the existing creator into EchoLoom · Weaver Workshop with quota timing, source-line selection, confirm-only consumption, editable local creations, and explicit permanence copy.
4. Add schema-v8 migration and tests for ordered unlock, free tutorial creation, monthly rollover, confirm-only quota use, created-content persistence, and v7 import/export compatibility.
5. Update product/story/architecture/demo documentation, refresh offline cache versions, run `npm test`, and manually verify the full mobile and desktop path.

Status: Completed on 2026-08-04.

Validation:

- Ran the complete story path in the browser from the sealed Weaver Room through Xu Cheng, Wen Sheng, Qi An, Zhou Tang, and Li Chuan’s five ordered stability threads, followed by Shen Yao’s Lv.7 stability review.
- Confirmed the Nan Xing NPC tutorial and Tide City world tutorial are free, permanent, and unlock Observer Lv.8 plus the formal Weaver Workshop.
- Verified workshop capacity behaviour in the live UI: saving a draft left capacity at NPC 3/3 and world 1/1; confirming a new NPC changed it to 2/3; editing that NPC remained 2/3; confirming a world changed world capacity to 0/1. Reloading preserved the creations and capacity.
- Verified the 393 × 852 reference phone frame, internal vertical scrolling, absence of horizontal overflow, desktop presentation layout, top safe-area spacing, and an empty browser warning/error log.
- Schema-v8 migration, monthly rollover without deletion, export/import round-trip, save/load/reset, mainline ordering, and created-content persistence pass the automated state suite. `npm test` passes with 31 required files and 25 served resources.

## Follow-up: sequential mainline “After the Seventeenth Second” — 2026-08-04

### Product outcome

Turn the post-onboarding mystery into one legible investigation chain: the Observatory home always states what happened, the one current objective, why it matters, and the exact next action. Wen Sheng, Qi An, Zhou Tang, Li Chuan, and Shen Yao provide five sequential existence anchors that lead to an explicit final decision about Xu Cheng.

### Narrative and compatibility decisions

- Keep the implemented trainee-day meeting with Xu Cheng and the 17-second outage. The attachment's later “erased group photo” opening is treated as an alternative draft, not combined with the established prologue.
- Preserve all five original first-response rescue routes and their relationship effects; the new fixed investigation begins after that onboarding choice and does not retroactively assign a romantic route.
- Keep free text and intent-only suggestions in every new character investigation scene. Mainline evidence cannot be missed because of tone or relationship choices.
- Add schema-v7 mainline progress with a schema-v6 migration; preserve existing journeys, messages, branches, contact permissions, and the internal Xu Cheng side-contact key.

### Implementation plan

1. Add bilingual five-chapter mainline definitions, existence-anchor metadata, clear home-task states, and final outcomes.
2. Add persistent mainline progress and migration, then implement the dynamic Observatory home and a dedicated scrollable investigation/result/finale screen.
3. Align Story, World, and Archive summaries with the current mainline question, confirmed anchors, and next location without removing their existing tools.
4. Add tests for ordered progression, non-blocking evidence, final decisions, export/import, and schema-v6 migration; update story, architecture, product, and demo documentation.
5. Refresh offline asset versions, run `npm test`, and manually verify the complete five-anchor path at the reference phone frame and desktop presentation size.

Status: Completed on 2026-08-04.

Validation:

- Completed all five investigation chapters in the browser through the intended Wen Sheng → Qi An → Zhou Tang → Li Chuan → Shen Yao order, confirming one source-linked existence anchor per chapter and the final preserve-echo outcome.
- Verified that free-text responses remain available, intent choices only change relationship dimensions, and an incorrect dream fragment displays a retry explanation without closing the mainline.
- Confirmed the finale contains restore, preserve-echo, and trust-gated publication choices; Xu Cheng’s consent-based EchoLink thread opens after resolution.
- The Observatory home, chapter view, Story, World, and Branch Archive use the bright white-and-champagne-gold system, have no horizontal overflow, and keep growing content inside the 373 × 832 inner viewport of the 393 × 852 phone frame. The Story body scrolls through all five anchors while the navigation remains visible.
- Schema-v6 import, schema-v7 export/import round-trip, save/load/reset, ordered progress, anchors, and messages pass the state suite. `npm test` passes with 31 required files and 25 served resources.

## Follow-up: white-and-gold Story, World, and Branch Archive — 2026-08-04

### Outcome

Extend the bright white-and-champagne-gold visual system to the Story hub, World hub, and Branch Archive without changing their narrative content, navigation, branch state, or offline behavior.

### Plan

1. Scope the existing warm-white and champagne-gold tokens to the three remaining dark hub screens.
2. Restyle page headers, evidence/action cards, branch nodes, archive actions, and persistent navigation while retaining illustrated hero cards as visual anchors.
3. Refresh cached stylesheet references, run the automated suite, and verify all three screens at the 393 × 852 phone frame and desktop presentation size.

Status: Completed on 2026-08-04.

Validation:

- Story, World, and Branch Archive render with warm-white page surfaces, champagne-gold borders and controls, dark readable copy, and the shared white-and-gold navigation.
- The Story evidence card, World action cards, current branch card, and saved branch node were inspected in the browser; each screen remains 373 × 832 inside the 393 × 852 phone frame with no horizontal overflow.
- All three screens retain internal vertical scrolling, existing routes, narrative content, branch state, and illustrated hero assets.
- Browser console verification found no warnings or errors, and `npm test` passes.

## A3 submission report package — 2026-08-04

### Outcome

Produce a submission-ready report that converts every Assignment 3 slide and rubric requirement into evidence-backed EchoLoom content. The report will distinguish verified project facts, six-interview findings, external market research, and items that still require the student's personal details or raw notes.

### Plan

1. Extract and visually inspect the complete Assignment 3 brief and build a requirement-to-section checklist.
2. Audit the current prototype, research traceability, build history, architecture, demo flow, and visual evolution assets for defensible evidence.
3. Research current market, competitor, pricing, and channel evidence using linked sources; mark any calculated estimates and product hypotheses explicitly.
4. Draft a polished English report covering company, team, users, problem, persona, solution/demo, build plan, feasibility, competition, market, go-to-market, roadmap, ask, presentation timing, and appendices.
5. Generate DOCX and PDF deliverables, render every page, inspect layout, run document and project validation, and record any remaining placeholders or evidence gaps.

Status: Completed.

### Validation and hand-off

- Generated `output/report/EchoLoom_A3_Report.docx` and `output/report/EchoLoom_A3_Report.pdf` (37 pages).
- Visually inspected every rendered page; corrected table-row splits, numbering continuation, appendix pagination, and screenshot/caption separation.
- Document audits passed: 27 tables have consistent 9,360-DXA geometry, accessibility audit reports zero findings, headings use semantic styles, all 13 images have alt text, and the DOCX archive opens cleanly.
- `npm test` passes both the smoke suite and state/engine suite; the tested 393 x 852 browser path showed no console warnings or errors.
- Two truthful hand-in gaps remain: replace team identity/photo placeholders and insert the six participant-level interview notes/quotes from the team's private records.

## Follow-up: Xu Cheng mainline opening — 2026-08-04

### Product outcome

Replace the abstract “special observer” opening with a concrete memory contradiction: on their first morning as a trainee observer, the player meets Xu Cheng, borrows her cracked access card, survives the 17-second outage, and discovers that every record denies she existed. The five simultaneous signals become five consequences of the same correction and five different kinds of evidence about Xu Cheng.

### Compatibility constraints

- Preserve the five selectable initial NPCs, their independent relationship state, the first-rescue delta allowlist, EchoLink free text, branch rewind, and schema-v6 export/import.
- Keep the player-name step, but frame it as ordinary trainee identity registration before the outage rather than proof of multiple identities.
- Delay the player’s conflicting identity records to later chapters; do not surface birth/death-record exposition in the opening.
- Reuse the existing internal side-contact ID for backward compatibility while changing its story identity from Sui to Xu Cheng.

### Implementation plan

1. Rebuild the prologue state machine around the Xu Cheng meeting, lightweight reply, trainee registration, outage, blank access card, failed search, and damaged message from 37 days later.
2. Rewrite all five first-rescue routes so each location contains a distinct Xu Cheng clue, then align first-contact messages, Observatory copy, and Story hub naming.
3. Reframe the later shared event and EchoLink side contact around Xu Cheng’s agency while accepting old saved decision IDs.
4. Update product/demo documentation and regression tests, refresh offline cache versions, and manually verify the complete opening at the reference phone size and desktop presentation.

Status: Completed on 2026-08-04.

Validation:

- A fresh browser run reached Xu Cheng’s 9:41 first meeting, paused for one lightweight response, resumed through trainee name registration, and completed the 17-second correction, blank access card, failed search, and damaged 37-day message in the intended order.
- The five evidence cards render together in the 373 × 832 inner phone viewport with no horizontal overflow; the tested Shen Yao route exposes four 42–45 px actions and records physical evidence without changing romance, attraction, or commitment.
- The result screen scrolls internally, EchoLink opens with Xu Cheng-specific evidence prompts, the Observatory home independently scrolls, and Chapter Two “There Is No Such Name” appears after the first route. “Xu Cheng’s Choice” remains locked until all five people are known.
- The shared-event renderer and resolver accept the new return/stay/new-name decisions while retaining legacy decision IDs and the internal side-contact key for schema-v6 export compatibility.
- Browser console verification found no warnings or errors; `npm test` passes with the refreshed offline cache manifest.

## Follow-up: scrollable Observatory home — 2026-08-04

### Outcome

Keep the status bar and five-item Observatory navigation stable while the home dashboard scrolls independently. Rebalance the duty contact, mainline, EchoLink preview, and five-person network so long character replies wrap cleanly instead of widening or compressing the cards.

### Plan

1. Introduce a dedicated scroll container between the system status bar and the persistent bottom navigation.
2. Prevent long EchoLink previews from expanding their grid column, clamp the preview to two readable lines, and align the five relationship portraits in a consistent row.
3. Refresh offline asset versions, run automated tests, and manually verify touch scrolling, bottom reachability, and desktop presentation.

Status: Completed on 2026-08-04.

Validation:

- The Observatory screen is fixed to the 832 px inner phone viewport; its 660 px dashboard area has an independent 25 px scroll range while the 104 px safe header and 68 px bottom navigation remain stationary.
- The EchoLink preview uses a shrinkable text column and two-line wrapping, so the supplied long reply stays inside its card with no horizontal overflow.
- Five relationship portraits render as an even 42 px row, and every visible home action keeps a minimum 42 px touch target.
- Browser verification reached the bottom of the dashboard, preserved the header and navigation positions, and reported no console warnings or errors.

## Follow-up: luminous night-observatory redesign — 2026-08-04

### Product outcome

Translate the supplied visual direction into an original EchoLoom night-observatory system: luminous midnight blue, moonlit ivory, champagne-gold linework, restrained glass panels, clearer typography, and a consistent visual hierarchy from the title sequence through the Observatory and EchoLink. The first signal screen must present all five existing NPCs as distinct people with their own work, location, and boundaries rather than reducing the opening to a three-character romance choice.

### Product and compatibility constraints

- Keep Qi An, Shen Yao, Li Chuan, Zhou Tang, and Wen Sheng as the five initial signals, using the existing original portraits, roles, rescue stories, relationship state, and contact rules.
- Preserve the current route graph, offline engine, free-text paths, branch/export schema, accessibility labels, and minimum 42 px touch targets.
- Adapt atmosphere and component principles from the references without copying their exact layout, character art, logo treatment, or protected visual assets.
- Keep the dark palette luminous and spacious enough to preserve EchoLoom's bright, airy product direction.

### Implementation plan

1. Add a scoped night-observatory token layer and reusable starfield, glass-card, gold-line, button, and navigation treatments.
2. Replace the orbital signal scatter with a legible five-card initial roster that exposes name, role, location, and signal state at 393 × 852.
3. Harmonize title, prologue, identity, signal detail/confirmation, rescue, result, activation, first contact, Observatory home, Story/World/Archive, and EchoLink surfaces without changing their behavior.
4. Refresh cache versions, run automated checks, and manually verify the five-person selection plus the primary mobile and desktop paths.

### Completion checks

- All five NPCs are visible and individually selectable on the initial signal screen, with no overlap, truncated identity, or horizontal overflow.
- Core screens share one readable type scale, one glass/gold component language, and clear foreground contrast over existing artwork.
- Title, rescue, home, contacts, and chat remain usable at the 393 × 852 reference frame and on desktop.
- `npm test` passes and the browser console has no errors.

Status: Completed on 2026-08-04.

Validation:

- The initial roster renders Qi An, Shen Yao, Li Chuan, Zhou Tang, and Wen Sheng as five 84 px cards in one 373 × 832 inner phone viewport; each card opens the correct independent signal detail.
- The signal roster, rescue choice screen, Observatory home, EchoLink list, seven-contact directory, and private conversation were exercised in the browser with no horizontal overflow or console errors.
- All visible signal actions remain at least 42 px; the Observatory home fits the reference viewport, while content-heavy contact views scroll internally without expanding the phone shell.
- The new night-observatory visual layer uses existing portraits and product state, so no NPC story, relationship model, route, or export schema was replaced.
- `npm test` passes with 31 required files, 25 served resources, and the schema-v6 state/engine suite.

## Follow-up: compact identity-record form — 2026-08-04

### Outcome

Redesign the player-name step as a compact identity form rather than three full-width rectangles. Keep the editable name field and primary continuation action, replace the oversized secondary row with a 48 px back icon beside the primary action, and tighten card spacing while preserving mobile touch targets and the explanation that the name remains editable.

### Plan

1. Group the confirmation and back controls into one clear primary/secondary action row.
2. Reduce decorative card padding, input radius, title scale, and vertical gaps without shrinking controls below 44 px.
3. Refresh offline asset versions, run automated tests, and verify the player-name screen in the reference phone frame.

Status: Completed on 2026-08-04.

Validation:

- The form card now renders at 317 × 289 px with tighter 20–21 px padding and no horizontal overflow.
- The editable name field remains 48 px high; the action row contains a 218 × 48 px primary action and one 48 × 48 px accessible back control.
- The former full-width secondary rectangle and the extra stacked action row have been removed.
- The 373 × 832 inner phone viewport remains exact, and the refreshed offline cache references the updated CSS and JavaScript assets.
- `npm test` passes.

## Follow-up: EchoLink thread safe header and legible type — 2026-08-04

### Outcome

Separate the EchoLink conversation identity bar from the system status area and restore readable mobile typography without removing the fixed composer, free-text input, intent suggestions, or asynchronous story cards.

Status: Completed on 2026-08-04.

Validation:

- The 100 px conversation header reserves the first 48 px for system chrome; the 17 px contact title begins below it and does not intersect the status bar or Dynamic Island.
- Conversation text and input text render at 14 px, story-card copy at 13 px, and supporting controls at 10–12 px.
- Li Chuan's Night Train card retains three 44 px actions with no text or horizontal overflow.
- The 373 × 832 inner phone viewport remains exact: header, scrollable message body, and fixed composer sum to the available height.
- `npm test` passes.

## Follow-up: event-result internal scrolling — 2026-08-03

### Outcome

Keep the qualitative event-result page inside the clipped phone viewport and make its full content vertically scrollable. Preserve the 232 px story hero, the complete relationship interpretation, the contact-permission explanation, a 44 px continuation action, and bottom safe-area spacing.

Status: Completed on 2026-08-03.

Validation:

- Before the fix, the result screen expanded to 932 px inside an 832 px clipped viewport and produced no internal scroll range.
- After the fix, the screen remains 832 px tall with 112 px of internal vertical scroll, touch panning enabled, and no app-level overflow.
- A real downward scroll reached the maximum scroll position, exposed the full continuation button with a 42 px bottom gap, and the button successfully opened EchoLink activation.
- `npm test` passes.

## Follow-up: onboarding typography and spacing audit — 2026-08-03

### Product outcome

Make the new story-first onboarding and archive screens feel like one composed mobile product instead of a series of oversized presentation cards. Establish a consistent mobile type hierarchy, compact information cards without crowding, readable line lengths, stable action spacing, and a denser archive that describes branches in human language instead of exposing internal timestamp IDs.

### Plan

1. Repair the two reported screens first: simplify the priority-confirmation composition and replace the raw current-branch identifier with a readable label plus a quiet short reference.
2. Normalize related onboarding headings, dialogue panels, result cards, hub headers, buttons, and bottom-navigation spacing while preserving 42 px touch targets.
3. Verify the complete new flow at 393 × 852 and the desktop presentation size, checking overflow, clipping, text wrapping, console output, and automated tests.

### Completion checks

- The priority-response confirmation fits comfortably within the reference frame with clear separation between identity, incident context, note, and actions.
- The archive shows a readable branch title, compact metadata, and scannable saved nodes without truncating essential information.
- Major headings no longer compete with body copy, buttons remain at least 42 px, and no audited screen scrolls because of decorative excess alone.
- `npm test` passes and the browser console is clean.

Status: Completed on 2026-08-03.

Validation:

- Rebuilt the priority-response card as a compact identity row plus incident context, relationship note, and two consistent actions; its rendered card height is 367 px in the reference app viewport and both actions are 48 px high.
- Replaced the raw timestamp branch heading with a readable event title, short secondary reference, branch number, participant context, and correct active-node matching for snapshot-suffixed IDs.
- Audited the new prologue, signal scan, confirmation, rescue, first contact, Observatory home, Story, World, and Archive screens. Major headings now range from 23–30 px; the audited app views have no horizontal overflow.
- Restored all audited compact controls to at least 42 px, including VN controls, rescue controls, intent chips, header icon buttons, and the relationship-network action.
- Removed the duplicate 82 px space below in-flow navigation and verified Home and Archive render at 832 px with the navigation aligned to the viewport bottom.
- `npm test` passes with 31 required files, 25 served resources, and the schema-v6 state/engine suite.

## Follow-up: story-first onboarding and observatory shell — 2026-08-03

### Product outcome

Replace the prototype-first opening with a persistent visual-novel onboarding: brand reveal, title, the 17-second outage prologue, player naming, a five-signal orbital scan, one data-driven rescue, a qualitative result, EchoLink activation, first contact, and a formal Observatory home. Keep the existing relationship, EchoLink, shared-scene, memory, world, and NPC tools available as later feature demonstrations.

### State and compatibility

- Schema v6 uses one persisted `screen` field as the navigation source of truth and migrates schema-v5 `route` values.
- The new local key is `echoloom.demo.v2`; the old key is read once and migrated so previous local demos are not discarded.
- Onboarding stores the player name, prologue intent, selected signal/rescue decision, known/contact people, unread state, hidden flags, and branch snapshots.
- First-rescue changes are restricted to familiarity, trust, reciprocity, compatibility, safety, and strain. Romance, physical attraction, and commitment remain untouched.

### Implementation plan

1. Add five rescue definitions, signal presentation data, first-contact copy, schema-v6 defaults, and backward-compatible storage migration.
2. Implement the complete onboarding state machine with refresh persistence, reduced-motion handling, VN controls, and no free-text input before first contact.
3. Add the Observatory home, Story and World hubs, centered EchoLink navigation, shared-event discovery rules, and isolated branch archive entry.
4. Reorganize desktop navigation into core narrative and feature-demo groups while retaining every existing feature page.
5. Update settings, documentation, cache versions, and automated checks; verify a complete mobile flow plus desktop layout and persistence.

### Completion checks

- Clear storage starts at the brand page and every primary action advances exactly once.
- All five signal details and rescue definitions render; one rescue can be completed end to end.
- Refresh restores the exact current screen and data.
- The 393 × 852 frame remains usable, interactive controls are at least 44 px, and desktop navigation reflects completion/lock state.
- `npm test` passes and the browser console is clean.

## Product outcome

Add **EchoLink / 回声终端** as a second main interface beside the Fate Observation Station. It should make contact permission, asynchronous communication, independent NPC lives, knowledge propagation, recent communication context, and branch history visible without turning EchoLoom into a generic chat app.

Prototype success means a tester can: understand why each contact is available through a different channel; distinguish private, group, and delayed cross-world messages; send free text with a private intent tag; see a reply or a character-consistent delayed state; interact with an NPC moment; inspect long-term relationship versus recent communication pulse; and rewind the entire communication state with the existing archive.

## Evidence status

The supplied small-sample interviews support daily conversation, emotionally responsive replies, shared activities, voice/call interest, gradual relationship development, and the harm caused by memory/personality discontinuity. The five-tab structure, exact permissions, communication-pulse model, event triggers, interval estimates, and channel rules are design deductions that require usability testing. They are not presented as validated psychology.

## MVP boundary

- EchoLink lock/notification entry plus five internal tabs: Messages, Contacts, Moments, Bonds, and Archive.
- Qi An, Shen Yao, Li Chuan, Sui, and Ye Cheng as contact records; availability depends on story state and contact source rather than a level.
- Private core-character threads, the Seventh Anomaly Observation Group, and one delayed cross-world/unknown-number thread.
- Text, simulated photo, and simulated voice-note messages; real-time audio/video and location sharing remain permission states rather than media services.
- Three intent suggestions, silence/later, free text, and a private player-intent selector. Intent updates player-expression signals but is not revealed verbatim to NPCs.
- Recent communication pulse (response reliability, initiative balance, topic depth, channel comfort) separate from long-term relationship state.
- Immersive qualitative relationship mode and observer-analysis interval mode; neither confirms a relationship automatically.
- Character-specific moments with like, reply-in-private, and view-only choices.
- Existing branch snapshots include all EchoLink contacts, conversations, unread state, moments, promises, and pending events.

This iteration does not add real audio recording, real calls, background notifications, wall-clock punishment, payment gates, infinite contacts, or production AI/network services.

## State and compatibility

Schema version 4 adds `communicationPulse` to each journey and `campaign.echoLink` containing contacts, conversations, moments, active tab/thread, observer mode, and pending events. Schema-v3/v2 journeys migrate with neutral pulse defaults; schema-v1 Aren state remains isolated in `legacyArchive`. Export/import stays local.

## Implementation steps

1. Add EchoLink defaults, contact-route variants, conversations, moments, channel permissions, and neutral pulse values.
2. Add schema-v4 deep migration for EchoLink state and communication pulses.
3. Render EchoLink entry, five tabs, conversation list, private/group/delayed threads, contacts, moments, bonds, and embedded archive nodes.
4. Route free-text and intent input through the existing offline engine; apply pulse and relationship effects, group knowledge attribution, silence without affection punishment, and one commitment record.
5. Update automated checks and product/architecture/demo documentation.
6. Verify the full flow at 393 × 852 and desktop size, plus export/reset/import and console state.

## Safety and UX invariants

- No message quota, streak, daily punishment, or guilt for ordinary silence.
- Suggested replies express intent rather than writing the player's full line.
- Contact access depends on story, NPC willingness, and world rules—not a spendable level.
- Player intent is private system metadata; NPC interpretation still uses visible language and context.
- Relationship labels, romantic agreement, sexual agreement, exclusivity, and consent remain explicit-confirmation states.
- Group messages update knowledge only for participants who receive them.
- Deleting local history does not imply NPC forgetting.
- All user-generated text is escaped.

## Current status

Completed on 2026-08-02.

- Implemented schema-v4 EchoLink state, migration, five-tab interface, story-derived permissions, private/group/delayed messaging, moments, communication pulses, commitments, and archive rewind.
- Added automated schema, migration, engine, rendering, and asset checks; `npm test` passes.
- Verified the complete flow at 393 × 852 and 1440 × 1000: no horizontal overflow, visible EchoLink touch targets are at least 42 px, rewind isolates branch messages, and the browser console has no errors or warnings.
- Kept real recording, calls, background notifications, and production AI outside this offline MVP; voice/photo/call behavior is deliberately simulated.

## Follow-up: single-send reply feedback — 2026-08-03

### Product outcome

Fix EchoLink so one send action always paints the player's message immediately and produces exactly one visible reply without another interaction. While the deterministic offline reply is pending, show an avatar-aligned three-dot typing bubble. Reply timing should vary modestly with the character's established communication habit, current work/channel context, long-term trust/familiarity/reciprocity/safety, and recent response reliability.

This supports responsive daily contact and relationship legibility. It does not introduce a single affection bar: romantic attraction alone cannot control availability, and closeness cannot erase a character's work, boundaries, or delayed-channel rules. The exact delay formula and timing range are a prototype hypothesis rather than an interview-validated measure.

### Success criteria

1. A single click or Enter press adds one player message and, after the visible typing state, one character reply.
2. The typing bubble identifies the correct private or group speaker and is announced as a live status.
3. Repeat sends are blocked only for the thread currently awaiting a reply; delayed-worldline and deliberate 17-minute voice states remain explicit rather than pretending to type.
4. Higher relationship continuity can shorten the simulated delay within each character's stable reply habit, while strain, low reliability, and heavier channels can lengthen it.
5. The flow remains offline, free-text-first, keyboard accessible, usable at 393 × 852, and compatible with schema-v4 exports.

### Implementation plan

1. Replace the shared EchoLink typing flag with thread-scoped pending-reply state and one reply scheduler.
2. Add the relationship-aware delay calculation and avatar-based three-dot bubble.
3. Disable only the affected composer while pending and prevent duplicate callbacks.
4. Add regression checks and document the timing hypothesis.
5. Run automated tests and manually verify private, group, side-contact, and special delayed paths on mobile and desktop.

Status: Completed on 2026-08-03.

Validation:

- Automated tests pass with 15 required files and 7 served resources; timing tests confirm closer continuity shortens the bounded wait, Shen Yao retains a slower base habit than Li Chuan, and voice remains slower than text.
- Browser regression confirmed one click adds exactly one player message, shows one correctly attributed typing bubble, disables repeat send/silence actions for that thread, and adds exactly one reply before clearing the bubble.
- Group chat identifies the responding member, side-contact replies use the same scheduler, W-17 keeps an unknown-delivery system state, and Shen Yao's task-delayed voice keeps its explicit 17-minute estimate instead of showing a false typing state.
- At 393 × 852, the app and thread have no horizontal overflow and the send control remains 42 × 42 px. The default desktop viewport also has no page-level horizontal overflow.
- Schema remains version 4 because pending timers are runtime-only; export/import compatibility is unchanged.

## Follow-up: chronological story replies — 2026-08-03

### Product outcome

Keep the cinematic character card for the untouched opening line, then switch to one chronological message stream as soon as the player responds. A player message, typing state, and character reply must always appear in that order in both the opening chapter and generated scenes.

The existing implementation removed the latest character message from the history and promoted it into the scene card. That split the reply from the player message that caused it, so later replies appeared spatially above earlier player messages.

### Plan

1. Add one shared presentation helper for opening and generated-story messages.
2. Show a spotlight card only before the first player message; afterwards render every message in insertion order.
3. Add a regression check, refresh cached assets, and verify two consecutive exchanges at 393 × 852 and desktop size.

Status: Completed on 2026-08-03.

Validation:

- A fresh story keeps one cinematic opening card and an empty message history.
- After the first send, the opening moves into the chronological stream and the spotlight card is removed; the resulting order is character → player → character.
- Two consecutive exchanges end in player → character → player → character order in both the DOM and the visible scrolled history.
- The shared helper is also used by generated-story conversations, preventing the same split-order defect there.
- At 393 × 852 the history and app have no horizontal overflow; the desktop viewport also remains free of page-level horizontal overflow.
- No state schema or export format changed.

## Follow-up: five-character foundation — 2026-08-03

### Product outcome

Add Zhou Tang and Wen Sheng as complete initial NPCs alongside Qi An, Shen Yao, and Li Chuan. Zhou Tang should make trust legible through privacy boundaries, equal technical cooperation, and shared responsibility. Wen Sheng should make intimacy legible through co-creation, authentic self-expression, and respect for the difference between a real person and a projected fantasy.

Both characters begin as ordinary collaborators rather than assigned romantic targets. They retain independent work, refusal rights, character-specific communication rhythms, separate memories, and multiple possible relationship outcomes. Zhou Tang enters the main EchoLink anomaly investigation; Wen Sheng also guides the World & NPC creation surface.

### Evidence status

The existing research supports distinct character identities, gradual relationships, persistent memory, boundaries, independent lives, and responsive communication. The exact two character concepts, five-route opening, choice weights, color palettes, phone content, and creator-guide placement come from the supplied design brief and remain product hypotheses to validate in usability testing. They are not presented as interview findings or psychological measurements.

### Implementation plan

1. Add bilingual character profiles, four opening intents each, route clues, relationship impacts, editable SVG portraits, and distinct scene backgrounds.
2. Extend the offline story engine with character-specific disagreement, repair, consent boundaries, memory-aware replies, and generated-scene openings.
3. Add both characters to EchoLink contacts, asynchronous private threads, moments, group knowledge, reply timing, shared events, and the relationship network; connect Wen Sheng to World & NPC creation.
4. Upgrade local state to schema v5 with opening-decision metadata and backwards-compatible migration of schema-v4 exports.
5. Update automated checks and product, architecture, research, demo, and run documentation; verify mobile, desktop, reset, export, and import flows.

### Safety and UX invariants

- The new characters are not gender-swapped copies of existing roles and do not begin romantically attached to the player.
- Suggested choices state action intent; free text remains available.
- A choice can affect several relationship dimensions without becoming a visible single affection score.
- Zhou Tang can refuse privacy violations or unilateral decisions; Wen Sheng can reject projection and forced narrative closure.
- Phone response timing follows work context and established communication habits, not absence punishment.
- User text remains escaped and local; the demo stays dependency-free and offline.

Status: Completed on 2026-08-03.

Validation:

- Added five complete initial routes and seven EchoLink contacts; Zhou Tang and Wen Sheng have distinct profiles, editable SVG portraits/backgrounds, private threads, moments, memories, boundaries, response styles, generated-scene lines, and communication habits.
- Zhou Tang's four opening choices record route metadata; the concealed-copy route is revealed on a later exchange and produces a substantial trust/safety loss. Wen Sheng's four choices preserve different forms of truth and connect her to the World & NPC creator.
- Schema v5 tests cover fresh state, v4/v3/v2/v1 migration, six-member group upgrades, reset, save/load, export/import round trips, reply timing, consent boundaries, and character-specific engine behavior. `npm test` passes with 19 required files and 10 served resources.
- Browser verification at 393 × 852 confirmed five discovery cards, both new openings, four touch targets above 42 px, neutral gender copy, chronological story messages, one-send EchoLink replies with one typing state, seven contacts, and no horizontal overflow.
- Desktop verification at 1440 × 1000 confirmed the 393 × 852 phone frame and both presentation panels fit without page or app overflow. The browser console reported no warnings or errors.

## Follow-up: Qi An portrait refresh — 2026-08-03

### Product outcome

Refresh Qi An's visual identity from the supplied portrait and full-body references: warm brown layered hair, amber-brown eyes, an ivory cable-knit layer, a muted sage-grey long coat, and restrained golden memory-thread details. Keep a transparent full-body illustration for cinematic character surfaces and a separate close portrait for circular avatars so his face remains legible in story and EchoLink views.

### Plan

1. Generate one original full-body, chroma-keyed visual-novel illustration from the two references and convert it to a clean transparent PNG.
2. Add a dedicated close portrait based on the supplied face reference and route full-body versus avatar usage through the character metadata.
3. Refresh cached asset versions and automated checks, then verify crop, loading, and overflow at 393 × 852 and desktop size.

Status: Completed on 2026-08-03.

Validation:

- Added a 1024 × 1536 transparent full-body PNG generated from both supplied references and an 800 × 800 close portrait based on the supplied face reference.
- Discovery and home surfaces use the full-body illustration; story, station, chat, EchoLink, moments, and bond selectors use the dedicated close portrait with fallback support for characters that only define one image.
- Automated tests pass with 20 required files and 11 served resources, including PNG content-type and minimum-size checks.
- Browser verification confirmed both resources load at their natural dimensions, the app has no horizontal overflow, the 393 × 852 reference phone frame remains intact, desktop has no page overflow, and the console contains no errors or warnings.

## Follow-up: discovery-card portrait scale and alignment — 2026-08-03

### Product outcome

Make Qi An immediately readable on the five-signal discovery screen. The compact card should use a dedicated waist-up transparent crop instead of shrinking his full-body home illustration, while the card copy follows a consistent left-column rhythm with legible event text, aligned tags, and one stable action position.

### Plan

1. Derive a transparent discovery-card crop from the approved full-body illustration and expose it as separate character metadata.
2. Rebalance the card artwork column and copy spacing without changing the full-body home portrait or close-avatar surfaces.
3. Refresh offline asset caching and regression checks, then verify the discovery screen in the 393 × 852 reference frame and desktop presentation.

Status: Completed on 2026-08-03.

Validation:

- Qi An now uses a dedicated 590 × 720 close discovery portrait, while his full-body home illustration and 800 × 800 small-avatar source remain unchanged.
- All five discovery cards render at an equal height with the action button on the same baseline; event descriptions use readable charcoal text and the copy column no longer collides with the artwork.
- Automated tests pass with 21 required files and 12 served resources.
- Browser verification confirmed the enlarged face crop loads correctly, all five card heights and button offsets match, the action target remains 42 px, the 393 × 852 reference frame and desktop page have no horizontal overflow, and the console contains no errors or warnings.

## Follow-up: unified EchoLoom company logo — 2026-08-03

### Product outcome

Replace every rendered company-brand occurrence with the supplied purple-blue EchoLoom identity while preserving its exact mark, wordmark, and “STORIES WEAVE. COMPANIONS STAY.” tagline. Use the complete lockup where the brand is introduced and the isolated mark where space is icon-sized, so small controls remain legible instead of shrinking the full wordmark.

### Plan

1. Deterministically extract a transparent full lockup and isolated mark from the supplied image, plus a maskable square app icon; do not generatively redraw branded text.
2. Route splash, desktop presentation, summary emblem, relationship thumbnail, fallback avatar, favicon, and PWA manifest to the appropriate new asset.
3. Refresh offline caching and asset tests, then verify logo clarity and layout at the 393 × 852 reference frame and desktop size.

Status: Completed on 2026-08-03.

Validation:

- Added a transparent 710 × 580 complete lockup, a 440 × 400 isolated mark, and a 512 × 512 maskable app icon, all derived deterministically from the supplied artwork without redrawing the brand text.
- Replaced every rendered company-logo occurrence across the splash, desktop presentation, summary emblem, relationship thumbnail, fallback avatar, favicon, PWA manifest, and offline asset cache.
- Automated tests pass with 23 required files and 15 served resources.
- Browser verification confirmed the full lockup renders at its natural aspect ratio, icon-sized marks load at 64 × 64 and 42 × 37 presentation sizes, the 393 × 852 reference frame and desktop page have no horizontal overflow, and the console contains no errors or warnings.

## Follow-up: Shen Yao portrait refresh — 2026-08-03

### Product outcome

Bring Shen Yao into the same three-asset presentation system as Qi An: a large close portrait for discovery cards, a dedicated square avatar for story and EchoLink, and a transparent full-body illustration for the personal home. Preserve the supplied dark indigo hair, cool eyes, celestial analyst clothing, star-compass details, and reserved adult expression.

### Plan

1. Generate one original full-body chroma-key illustration from the supplied identity and outfit references, then convert it to a transparent project asset.
2. Derive separate close-card and avatar resources from the supplied face reference so small surfaces never shrink the full-body art.
3. Update character metadata, Qi-style crop rules, offline caching, and regression checks.
4. Verify discovery, opening story, personal home, EchoLink avatar, mobile reference size, and desktop layout.

Status: Completed on 2026-08-03.

Validation:

- Added a 1024 × 1536 transparent full-body illustration generated from both supplied references, plus a 591 × 720 discovery crop and an 800 × 800 close avatar derived directly from the supplied face artwork.
- Discovery cards now give Qi An and Shen Yao the same artwork dimensions and mask treatment; story, station, chat, and EchoLink use the close avatar, while the home uses the full-body cutout.
- Automated tests pass with 25 required files and 18 served resources.
- Browser verification confirmed the discovery crop matches Qi An's presentation size, the story avatar has no accidental zoom transform, the home portrait sits below the top sensor area, EchoLink uses the close avatar, the 393 × 852 reference frame and desktop page have no horizontal overflow, and the console contains no errors or warnings.

## Follow-up: Li Chuan portrait refresh — 2026-08-03

### Product outcome

Bring Li Chuan into the same three-asset presentation system as Qi An and Shen Yao: a large close portrait for discovery cards, a dedicated square avatar for story and EchoLink, and a transparent full-body illustration for the personal home. Preserve the supplied tousled auburn hair, teal-green eyes, coral travel jacket, camera, ticket, courier bag, and warm independent-traveller energy.

### Plan

1. Generate one original full-body chroma-key illustration from the supplied identity and outfit references, then convert it to a transparent project asset.
2. Derive separate close-card and avatar resources from the supplied face reference so small surfaces never shrink the full-body art.
3. Update character metadata, shared crop rules, offline caching, and regression checks.
4. Verify discovery, opening story, personal home, EchoLink avatar, mobile reference size, and desktop layout.

Status: Completed on 2026-08-03.

Validation:

- Added a 1024 × 1536 transparent full-body illustration generated from both supplied references, plus a 590 × 720 discovery crop and an 800 × 800 close avatar derived directly from the supplied face artwork.
- Discovery cards now give Qi An, Shen Yao, and Li Chuan the same artwork dimensions and mask treatment; story, station, chat, and EchoLink use the close avatar, while the home uses the full-body cutout.
- Automated tests pass with 27 required files and 21 served resources.
- Browser verification confirmed equal discovery-card heights and action alignment, an unscaled 800 × 800 story/EchoLink avatar, the home portrait below the top sensor area, a 393 × 852 reference phone frame, no horizontal overflow on app or desktop page, and no console errors or warnings.

## Follow-up: Zhou Tang portrait refresh — 2026-08-03

### Product outcome

Bring Zhou Tang into the same three-asset presentation system as Qi An, Shen Yao, and Li Chuan: a large close portrait for discovery cards, a dedicated square avatar for story and EchoLink, and a transparent full-body illustration for the personal home. Preserve the supplied shoulder-length black hair with teal underlights, olive-gold eyes, dark technical jacket, ivory top, gold hardware, privacy-interface details, and controlled adult confidence.

### Plan

1. Generate one original full-body chroma-key illustration from the supplied identity and outfit references, then convert it to a transparent project asset.
2. Derive separate close-card and avatar resources from the supplied face reference so small surfaces never shrink the full-body art.
3. Update character metadata, shared crop rules, offline caching, and regression checks.
4. Verify discovery, opening story, personal home, EchoLink avatar, mobile reference size, and desktop layout.

Status: Completed on 2026-08-03.

Validation:

- Added a 1024 × 1536 transparent full-body illustration generated from both supplied references, plus a 590 × 720 discovery crop and an 800 × 800 close avatar derived directly from the supplied face artwork.
- Discovery cards now give Qi An, Shen Yao, Li Chuan, and Zhou Tang the same artwork dimensions and mask treatment; story, station, chat, and EchoLink use the close avatar, while the home uses the full-body cutout.
- Automated tests pass with 29 required files and 23 served resources.
- Browser verification confirmed equal discovery-card heights and action alignment, an unscaled 800 × 800 story/EchoLink avatar, the home portrait below the top sensor area, a 393 × 852 reference phone frame, no horizontal overflow on app or desktop page, and no console errors or warnings.

## Follow-up: Wen Sheng portrait refresh — 2026-08-03

### Product outcome

Bring Wen Sheng into the same three-asset presentation system as Qi An, Shen Yao, Li Chuan, and Zhou Tang: a large close portrait for discovery cards, a dedicated square avatar for story and EchoLink, and a transparent full-body illustration for the personal home. Preserve the supplied long dusk-purple hair, grey-green eyes, gold leaf hair ornament, ivory layered dress, translucent violet outer layers, paper-crane motif, and thoughtful narrative-weaver presence.

### Plan

1. Generate one original full-body chroma-key illustration from the supplied identity and outfit references, then convert it to a transparent project asset.
2. Derive separate close-card and avatar resources from the supplied face reference so small surfaces never shrink the full-body art.
3. Update character metadata, shared crop rules, offline caching, and regression checks.
4. Verify discovery, opening story, personal home, EchoLink avatar, mobile reference size, and desktop layout.

Status: Completed on 2026-08-03.

Validation:

- Added a 1024 × 1536 transparent full-body illustration generated from both supplied references, plus a 590 × 720 discovery crop and an 800 × 800 close avatar derived directly from the supplied face artwork.
- All five initial characters now use the same three-asset presentation system and discovery-card mask treatment; story, station, chat, and EchoLink use close avatars, while homes use transparent full-body cutouts.
- Automated tests pass with 31 required files and 25 served resources.
- Browser verification confirmed equal discovery-card heights and action alignment, an unscaled 800 × 800 story/EchoLink avatar, the home portrait below the top sensor area, clean long-hair and translucent-clothing edges on the live background, a 393 × 852 reference phone frame, no horizontal overflow on app or desktop page, and no console errors or warnings.

## GitHub repository import — 2026-08-05

### Product outcome

Place the complete EchoLoom project in `Zhguo903/Echoloom` so the prototype, original assets, documentation, project-specific Codex guidance, and final A3 report are versioned together without publishing local credentials or redundant render caches.

### Plan

1. Audit the workspace for secrets, oversized files, generated caches, and project deliverables.
2. Keep source code, authored assets, documentation, the final report, and its generation source; ignore repeat report renders and extracted temporary pages.
3. Initialize Git with a `main` branch, run the complete test suite, and create the initial project commit.
4. Inspect and merge any existing remote history before a normal, non-forced push.

Status: In progress; local project preparation is complete and GitHub authentication is pending.

## Technical feasibility presentation slide — 2026-08-06

### Product outcome

Create one English presentation slide that explains the technology required to turn the current EchoLoom offline demo into a secure, production-ready relationship product. Match the supplied pale-pink four-card visual style, remain truthful about the current implementation, and omit the prohibited product-building-tool name from all slide content.

### Plan

1. Ground the technology categories in the current architecture and optional live-AI upgrade documentation.
2. Build a 16:9 PowerPoint slide with four balanced cards for client experience, backend and memory, AI and safety, and build operations.
3. Add primary-source references in speaker notes and distinguish the current offline prototype from the production path.
4. Render, visually inspect, and run presentation and repository validation before delivery.

Status: Completed on 2026-08-06.

Validation:

- Generated a one-slide 16:9 PowerPoint and matching PNG preview in the supplied pale-pink four-card style.
- The slide separates the current offline web prototype from the production mobile and server path, and covers client experience, backend and source-linked memory, AI safety, and build operations.
- Added internal architecture references and primary technical sources in speaker notes; the prohibited product-building-tool name does not appear in slide content or notes.
- PowerPoint rendering completed successfully, the slide test reported no overflow, and the repository smoke and schema-v8 engine suites pass.
