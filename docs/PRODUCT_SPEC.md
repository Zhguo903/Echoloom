# EchoLoom product specification

## One-sentence positioning

A story-first multi-character relationship simulation where a trainee observer remembers Xu Cheng after the Fate Observation Station erases her from every record, then meets five psychologically coherent people through the five consequences of that correction and explores friendship, partnership, attraction, distance, or romance through free conversation, explicit confirmation, reversible branches, and persistent memory.

## Problem

Traditional romance games offer strong character writing but constrain expression to fixed choices. Generic AI companions allow free text but often assume immediate intimacy, flatten character boundaries, lose long-term memory, and place all narrative work on the user.

## Product hypothesis

Combining authored character cores with free interaction and inspectable state can create relationships that feel responsive without making a selected character instantly romantic or compliant. The prototype tests whether users understand five distinct interpretations of a shared event, distinguish attraction from agreement, and value reversible consequences.

## MVP experience

- An ordinary 9:41 meeting with Xu Cheng, an interrupted trainee identity binding, a 17-second correction, and a damaged message sent from 37 days later.
- Five independent characters: Qi An, Shen Yao, Li Chuan, Zhou Tang, and Wen Sheng.
- Five first-response rescues that establish different ordinary collaborations without assigning a romantic route.
- A fixed, player-legible investigation chain through Wen Sheng, Qi An, Zhou Tang, Li Chuan, and Shen Yao. It produces five source-linked existence anchors: shared dream, overwritten memory, future message, deleted-world fragment, and primary-lens log.
- A dynamic station hub that always presents one current question, one next ally, and one exact action; Story, World, and Archive mirror the same chapter state.
- A three-outcome finale—restore Xu Cheng, preserve her echo, or publish the Unique Line Protocol—with no canonical romantic answer. Publication depends on basic trust across the investigation team.
- A second mainline, *The First Free Thread*, where the player stabilises Echo 000 through identity, desire, memory, boundary, and world scenes before gaining creation access.
- One editable, free NPC/world tutorial that creates Nan Xing and Tide City, raises the observer to Lv.8, and grants the Weaver identity.
- A formal Weaver Workshop with transparent monthly capacity: three confirmed NPCs and one confirmed world; drafts, previews, edits, tutorial content, and mainline use no capacity, and existing creations never reset.
- Non-blocking chapter evidence: relationship wording changes character response and qualitative state, while mistakes can be retried and never close the mainline.
- A separate opening chapter, relationship home, chat, memory timeline, and generated scenes for each.
- Free-text and intent-based responses in every story interaction.
- Eleven hidden character-to-player dimensions: familiarity, trust, intimacy, reciprocity, compatibility, romantic attraction, sexual attraction, safety, commitment, strain, and repair.
- Separate player-expression signals: friendship, romantic, sexual, avoidance, and uncertainty.
- A mutually confirmed layer for relationship label, romantic agreement, sexual agreement, exclusivity, and consent notes.
- Natural-language relationship summaries instead of numerical affection UI; thresholds may suggest a conversation but never change labels automatically.
- Source-linked knowledge with confidence and `knownBy`, plus character-to-character relationships.
- Character-specific refusals, disappointments, repair paths, and independent-life events.
- Friendship remains a complete relationship path; flirting does not guarantee attraction.
- Typed, source-linked memories whose edit permissions differ by type.
- Recoverable local archive snapshots with branch-isolated relationship, memory, and NPC state.
- Story-gated world and NPC creation with source threads, desire, character tension, core memory, initial relationship, boundary, world rules, conflicts, and companion/parallel-projection/fate-echo continuity modes.
- EchoLink as a second main interface with Messages, Contacts, Moments, Bonds, and Archive tabs.
- Story-dependent contact sources and per-channel permissions for five core characters plus Xu Cheng and Ye Cheng. The legacy internal contact ID remains compatible with existing exports.
- Private messages, the Seventh Anomaly Observation Group, and one delayed W-17 cross-world thread.
- Text, simulated photo and voice-note channels. Call and location permissions can be visible without pretending that a real media service exists.
- Three intent suggestions, free text, silence/later, and a private intent selector that is not shown verbatim to NPCs.
- A recent communication pulse—response reliability, initiative balance, topic depth, and channel comfort—separate from long-term relationship state.
- Character moments that can be viewed, reacted to, or answered privately without treating every public reaction as affection gain.
- A Li Chuan invitation that creates a promise only when the player offers one; trust is settled by fulfilment, early explanation, or unexplained absence.
- Local persistence plus schema-versioned JSON export and import.
- Schema-v8 persistence for ordered investigation, Weaver arc, quota use, tutorial/formal creations, and schema-v7/v6 migration.

## Character cores

### Qi An — memory archive restorer

- Starting relationship: temporary colleague / ordinary friend.
- Core movement: from everyday care to mutual care.
- Strength: attentive, patient, and good at making difficult work feel manageable.
- Weakness: habitually hides his own exhaustion while caring for others.
- Boundary: he will listen and help, but will not make every decision or carry every emotion for the user.

### Shen Yao — worldline observer

- Starting relationship: research collaborator / distant friend.
- Core movement: from rational cooperation to intellectual and emotional understanding.
- Strength: honest, rigorous, and willing to revise a conclusion when evidence changes.
- Weakness: may analyse a feeling before understanding what the other person needs.
- Boundary: he accepts challenge but not deliberate deception, and will not abandon facts to please the user.

### Li Chuan — world-travelling courier

- Starting relationship: temporary travel companion / casual friend.
- Core movement: from shared experiences to freely choosing to return.
- Strength: adaptable, welcoming, and comfortable giving others choices.
- Weakness: uses movement and novelty to avoid the vulnerability of staying.
- Boundary: he accepts refusal without guilt, but steps away if someone attempts to control his freedom.

### Zhou Tang — EchoLink core architect and privacy auditor

- Starting relationship: technical support contact / co-investigator.
- Core movement: from explicit boundaries and equal cooperation toward verifiable trust.
- Strength: direct, technically rigorous, and willing to document her own mistakes.
- Weakness: competitive and reluctant to rely on anyone when control is uncertain.
- Boundary: she refuses privacy overreach, concealed copies, and decisions made for her in the name of protection.

### Wen Sheng — world narrative weaver and dream sampler

- Starting relationship: temporary creative partner / narrative anomaly subject.
- Core movement: from co-creation and understanding toward authentic self-expression.
- Strength: imaginative, observant, and attentive to the agency of people inside a story.
- Weakness: hides personal sadness in unfinished work and fears endings after losing a created world.
- Boundary: she refuses to be reduced to a fantasy projection or forced into another person's preferred ending.

## Relationship rules

1. Selection begins an acquaintance, not a romance.
2. High trust does not imply attraction; friendship is never treated as failure.
3. Respecting boundaries, keeping promises, and repairing conflict matter more than praise or frequent messaging.
4. Relationships can improve, stagnate, or lose trust.
5. Characters preserve their work, friendships, values, flaws, and right to refuse at every stage.
6. Romantic intimacy appears only after explicit confirmation; a threshold can only suggest starting that conversation.
7. Sexual wording is recorded as a player signal, never as consent or a mutual agreement.
8. Rewind creates a recoverable snapshot before restoring an older node.
9. A character reacts only to knowledge attributed to them in the current branch.
10. Meeting a character does not automatically grant private contact, calling, location, or every media channel.
11. Ordinary unanswered chat does not reduce the bond; only an accepted responsibility, emergency, or explicit promise can affect response reliability.
12. Group content updates knowledge only for members who received it, and deleting a local record does not make an NPC forget.
13. A single EchoLink send creates one player message and one scheduled reply. While waiting, the correct speaker appears beside an accessible three-dot typing bubble.
14. Simulated reply time is derived from the character's stable communication habit, current channel, long-term familiarity/trust/intimacy/reciprocity/safety, a small romantic-attraction contribution, relationship strain, and recent response reliability. It is never presented as an affection score or a promise of availability.

## Success signals for concept testing

- Users can distinguish all five characters through care, understanding, freedom, boundaries, and expression—not gender or surface temperament alone.
- Users understand the starting relationship for the selected character.
- Early flirting receives a character-consistent boundary instead of instant reciprocation.
- Switching characters preserves separate histories and memories.
- Generated scenes feel connected to the selected character’s unresolved conflict.
- Users understand and can edit, delete, export, and restore relationship memories.
- Users can explain why all five characters interpret the same shared NPC decision differently.
- Users understand that a rewind restores relationship, memory, knowledge, and NPC state together.
- Users can explain why the same character entered their contacts through a different source after a different first signal.
- Users distinguish long-term relationship state from a recent low-frequency communication period.
- Users understand that private intent metadata helps the story system but does not reveal their inner state directly to an NPC.
- Users understand that typing feedback confirms their single send was received and do not press send a second time.
