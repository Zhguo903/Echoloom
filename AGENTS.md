# EchoLoom Repository Guidance

## Product intent

EchoLoom is a story-first AI relationship prototype. The product must feel like a premium, bright 2D romance visual novel combined with persistent AI interaction. It is not a generic chatbot, a dating swipe app, or a resource-grinding mobile game.

## Non-negotiable UX principles

- Establish character attraction through story before asking for daily intimacy.
- Preserve each character’s stable core conflict: Qi An balances caring with self-preservation, Shen Yao balances accurate answers with emotional understanding, and Li Chuan balances freedom with choosing to stay.
- Let the character disagree, refuse, and remain imperfect for psychologically coherent reasons.
- Keep free-text input available in every story interaction.
- Suggested replies must express intent, not speak a full line for the user.
- Keep replies concise, conversational, and information-dense by default.
- Give the character an independent life outside the user.
- Treat memory as relationship infrastructure: visible, editable, deletable, exportable, and source-linked.
- Explain relationship change in natural language. Do not add a single affection score as the primary model.
- Do not add streaks, daily chores, coins, message quotas, guilt, manipulative jealousy, or punishment for absence.
- Do not claim the character is conscious or human.

## Visual constraints

- Keep the interface bright and airy.
- Use the existing palette tokens in `app/styles.css` and `docs/design-tokens.json`.
- Primary colours: slate blue, champagne beige, muted sage, ivory, charcoal.
- Preserve the original visual direction; do not copy a copyrighted game’s exact characters, logo, layout, or assets.
- Maintain 393 × 852 as the reference mobile frame.
- Keep touch targets at least 42 px and preserve keyboard accessibility.

## Technical constraints

- The current prototype is dependency-free: plain HTML, CSS, and JavaScript.
- Do not add a framework or production dependency without explicit user approval.
- Keep the offline demo fully functional with no API key.
- Never place secret API keys in browser code.
- Preserve the `EchoEngine` interface when replacing the mock engine:
  - `storyReply(input, state)`
  - `chatReply(input, state)`
  - `generateScene(prompt, selectedSceneId, state)`
  - `sceneReply(input, scene, state)`
- Preserve backward compatibility for exported relationship JSON whenever possible.
- Escape user-generated text before inserting it into HTML.
- Keep all user data local unless a task explicitly introduces a reviewed server architecture.

## Repository map

- `index.html`: desktop presentation shell and app mount.
- `app/app.js`: render functions, events, navigation, and state updates.
- `app/data.js`: bilingual copy, three character profiles, journey defaults, and scene metadata.
- `app/story-engine.js`: deterministic offline AI simulation.
- `app/storage.js`: persistence, migration, export, and import.
- `app/styles.css`: design tokens and all visual styles.
- `assets/`: original vector character and scene artwork.
- `docs/`: product, research, demo, and architecture documentation.
- `docs/DEVELOPMENT.md`: contributor workflow and validation guidance.

## Work process

1. Read the relevant product and research docs before changing user-facing behaviour.
2. For multi-file or multi-step work, write or update an execution plan using `PLANS.md`.
3. Make the smallest coherent change and avoid unrelated rewrites.
4. Verify mobile and desktop behaviour.
5. Run `npm test` after every JavaScript, CSS, HTML, or asset-path change.
6. Update documentation when user-facing behaviour, state schema, or run instructions change.
7. Summarize changed files, validation performed, and any unresolved risk.

## Definition of done

A task is complete only when:

- the requested flow works in the browser;
- the offline demo still starts with `npm start`;
- `npm test` passes;
- there are no obvious console errors;
- the layout remains usable at 393 × 852 and on a desktop viewport;
- the change respects the product principles above;
- documentation is updated when needed.

## Code review rules

Flag changes that:

- weaken character or memory continuity;
- mix one character’s messages, memories, relationship state, or generated scenes into another character’s journey;
- add manipulative retention mechanics;
- expose secrets in the client;
- insert unescaped user text into `innerHTML`;
- break exported JSON without a migration;
- add dependencies without a clear reason and approval;
- replace free input with fixed choices;
- copy protected visual assets or exact layouts from another product.
