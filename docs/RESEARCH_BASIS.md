# Research Basis

This prototype translates six qualitative interviews and the consolidated product report into testable interaction hypotheses. The sample is small and skewed toward young women with prior interest in otome games, interactive fiction, AI companionship, or character co-creation. Therefore, these are prototype assumptions rather than population estimates.

## Directly supported user needs

1. Character identity and relationship history matter more than a large character catalogue.
2. Users often need story and character credibility before they want daily conversation.
3. Psychological consistency matters more than visual realism alone.
4. A believable character can disagree, refuse, make mistakes, and maintain values.
5. The character should have work, friends, goals, pressure, and unresolved decisions outside the user.
6. Pure open-ended chat often becomes repetitive and puts all narrative labour on the user.
7. Fixed dialogue options often fail to express the user’s real intent.
8. Long-term memory must include user facts, character facts, shared experiences, relationship state, promises, and unresolved issues.
9. Memory should be visible, correctable, deletable, and exportable.
10. Most users do not want to fill out long setup forms before they care about the character.
11. Natural language can support both one-sentence users and detailed co-creators.
12. Default replies should be shorter and more conversational than ornate AI essays.
13. Daily chores, message quotas, manipulative jealousy, and guilt-based re-engagement damage the relationship experience.

## How these findings appear in the demo

| Research need | Demo behaviour |
|---|---|
| Story before relationship | A conflict-based chapter comes before the relationship home. |
| Character consistency | Qi An, Shen Yao, Li Chuan, Zhou Tang, and Wen Sheng have different stable conflicts, boundaries, and response styles. |
| Multiple characters without flattening identity | One station mystery exposes five different roles, knowledge sets, sensitivities, and interpretations. Zhou Tang adds boundary-led technical trust; Wen Sheng adds expression-led co-creation. |
| Independent life | Each home screen shows work, obligations, and plans that do not revolve around the user. |
| Free expression | Every story and chat screen accepts free text. |
| Lightweight guidance | Suggested responses describe intent rather than full dialogue. |
| Persistent memory | Echoes distinguishes facts, events, promises/boundaries, relationship judgements, and reflections, with source and branch metadata. |
| Memory control | Users can add, pin, delete, export, and import memories; player-authored facts can be edited while a character's judgement cannot be directly rewritten. |
| Relationship legibility | Character state, player expression, and mutual confirmation are displayed as separate layers without an affection score. |
| Consequence without destructive lock-in | The archive saves the current branch before rewind and restores relationship, knowledge, memory, and NPC state together. |
| Responsive daily contact | EchoLink combines free-text private messages, character-specific asynchronous availability, simulated voice/photo channels, and replies grounded in existing memory. |
| Clear response feedback | A thread-scoped avatar and three-dot typing bubble confirms a single send while the offline reply is being prepared. |
| Character life outside the user | Moments and availability states show work, travel, public notices, and delayed replies without punishing the player for absence. |
| Communication is not relationship totality | Recent response reliability, initiative balance, topic depth, and channel comfort are displayed separately from long-term relationship dimensions. |
| Gradual relationship development | Contact source and channel permissions change through story and willingness rather than automatically unlocking every intimate channel. |
| Different effort levels | Together accepts a single sentence but can also take detailed direction. |
| Story progress | Generated scenes can become main-timeline events or extras. |
| Ethical retention | No streaks, coins, punishment, or guilt when the user leaves. |

## Product hypotheses that still require testing

The following are design deductions, not directly proven by the interviews:

- the ideal length of the opening story;
- whether five initial characters improve choice without weakening identity continuity;
- whether users understand that choosing a character begins an acquaintance rather than a romance;
- whether eleven internal dimensions are understandable and useful, or unnecessarily complex;
- whether the separation of player signals and mutual confirmation prevents false romantic inference;
- whether users understand source, confidence, and `knownBy` without feeling that the experience has become a database;
- whether a five-step, source-linked evidence chain and the restore/echo/publish finale create meaningful disagreement without reducing Xu Cheng to a rescue object;
- whether branch rewind increases experimentation without reducing emotional consequence;
- whether companion, parallel-projection, and fate-echo continuity modes are distinguishable;
- whether EchoLink is understood as a second main interface rather than a duplicate chat page;
- whether five tabs are learnable at mobile size;
- whether communication pulses clarify recent context or create a new optimisation target;
- whether private intent confirmation feels useful rather than intrusive;
- whether users understand the difference between delayed replies and relationship withdrawal;
- whether simulated voice/photo cards are sufficient for concept testing before real media exists;
- whether the avatar typing bubble prevents repeat sends without making every character seem constantly available;
- whether relationship-aware simulated delays feel emotionally legible or encourage users to optimise relationship dimensions;
- whether users understand the “Together” entry immediately;
- how visible memory mechanics should be before they break immersion;
- how much disagreement users accept from the character;
- whether scene preview adds control or unnecessary friction;
- whether timeline classification should happen before or after a scene;
- the ideal frequency of character-initiated events;
- subscription and pricing structure.

The Fate Observation Station fiction, EchoLink navigation, communication pulses, contact/channel rules, eleven dimensions, weighting rules, thresholds, branch UX, and world/NPC creator were supplied as design proposals. They are implemented as inspectable MVP hypotheses and are not validated psychological measures.

Zhou Tang, Wen Sheng, their exact choice effects, palettes, phone habits, five-route opening, and Wen Sheng's creator-guide placement also come from the supplied design brief rather than the interview sample. They operationalise supported needs—distinct identity, boundaries, independent life, gradual trust, and creative expression—but their effectiveness still requires testing.
