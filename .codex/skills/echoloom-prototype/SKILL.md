---
name: echoloom-prototype
description: Design, implement, review, or extend the EchoLoom story-first AI relationship prototype. Use for EchoLoom UI, character stories, persistent memory, scene generation, relationship timelines, product experiments, usability fixes, and research-aligned feature work. Do not use to add manipulative retention, copy another romance game's protected design, or expose API secrets in browser code.
---

# EchoLoom Prototype Workflow

## Start by grounding the task

1. Read the closest applicable `AGENTS.md`.
2. Read `docs/PRODUCT_BRIEF.md` and the relevant section of `docs/RESEARCH_BASIS.md`.
3. Inspect the current screen and state path before proposing a change.
4. Distinguish direct interview support from a new design hypothesis.

## Translate the request into a product outcome

State:

- the user problem;
- the target interaction;
- which relationship principle it supports;
- how success would be observed in a prototype test;
- which existing behaviour must remain unchanged.

For ambiguous feature requests, ask focused product questions or propose one testable default. Do not silently turn the product into a generic chatbot or game economy.

## Plan when needed

Use `PLANS.md` before coding when the task:

- changes more than two core files;
- changes exported relationship data;
- adds a character, route, timeline type, or AI provider;
- introduces a dependency or server;
- affects memory or identity continuity.

## Implementation rules

- Preserve the free-text path.
- Preserve offline operation unless the user explicitly changes that requirement.
- Keep the character psychologically consistent.
- Keep relationship changes explainable in natural language.
- Keep user-entered text escaped.
- Keep important memory user-controllable.
- Prefer small additions to broad rewrites.
- Do not add dependencies without approval.

## Validation

Always run:

```bash
npm test
```

Then manually verify the affected path at mobile reference size and desktop size. For state changes, test export, reset, and import.

## Handoff

Report:

1. user-visible result;
2. files changed;
3. tests and manual checks;
4. data migration or compatibility notes;
5. remaining product hypothesis or risk.
