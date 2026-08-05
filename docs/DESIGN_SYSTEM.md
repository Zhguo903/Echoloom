# EchoLoom Design System

## Visual direction

Premium 2D romance visual novel with an original luminous night-observatory interface rather than a copy of any existing game. Midnight indigo creates the cinematic base; moonlit ivory, champagne-gold linework, restrained glass panels, and soft star particles keep the experience elegant, legible, and emotionally intimate instead of heavy or game-like.

## Colour palette

The palette follows the user’s supplied chart reference:

- Slate blue: `#586580`
- Deep slate: `#344056`
- Champagne beige: `#C8B28D`
- Muted sage: `#789787`
- Ivory: `#FBF8F1`
- Paper white: `#FFFDF8`
- Charcoal: `#283241`

Slate communicates narrative seriousness, champagne marks important relationship actions, sage marks memory and continuity, and ivory keeps the experience bright.

The onboarding and in-world terminal also use a dark extension of these tokens:

- Observatory midnight: `#0F1324`
- Deep indigo: `#181D34`
- Moonlit text: `#F4F0E8`
- Muted starlight: `#B8BED1`
- Champagne linework: `#D6C49A`

Dark surfaces retain the established slate, champagne, sage, ivory, and charcoal identity; they are an atmospheric layer, not a replacement brand palette.

## Typography

- Story titles and character names: Georgia / serif fallback.
- Interface and conversation: system sans-serif.
- Text remains local and does not load external fonts.

## Layout

- Mobile reference frame: 393 × 852.
- Cards: 15–22 px radius.
- Primary actions: minimum 50 px height.
- Touch targets: at least 42 px.
- The opening signal screen uses one orderly five-card roster. Each card shows a portrait, name, independent role, current location, and signal order; selecting one changes only the first encounter.
- The Observatory home keeps its safe header and five-item navigation stationary while the dashboard cards scroll in a dedicated middle region; message previews wrap to two lines rather than widening the layout.
- The Fate Observation Station keeps the primary navigation: Home, Threads, Together, Echoes.
- EchoLink is a contained second interface with five internal tabs: Messages, Contacts, Moments, Bonds, and Archive.
- EchoLink uses the same palette, typography, and card language as the station so it feels like an in-world terminal rather than a separate chat product.

## Illustration system

The demo uses editable SVG scene artwork for an archive, station, conservatory, seaside promenade, café, observatory, library, and garden. Qi An appears at an archive table with a memory card, Shen Yao appears beside an observation display, and Li Chuan appears on a station platform with route maps. Initial compositions use ordinary social distance and work or travel props rather than romantic poses.

The supplied portrait-format background pack is applied only inside narrative canvases: visual-novel scene images, investigation chapter bodies, and the story-led Weaver sequence. The phone shell and the primary Home, Story, World, EchoLink, Archive, Workshop, relationship, memory, and settings pages retain their established backgrounds.

| Background | Prototype use |
| --- | --- |
| BG01 Fate Observatory | Prologue arrival and the seventeen-second correction scene |
| BG02 Private Archive | Missing-person chapter briefing and clue review |
| BG03 Rainy Old Station | Wen Sheng's damaged-dream verification and station-based character story scenes |
| BG04 Memory Repair Lab | Qi An's overwritten-memory restoration and deletion-log investigation |
| BG05 EchoLink Space | Future-message audit and story scenes inside the EchoLink core |
| BG06 Sealed EchoLoom | Forbidden Weaver Room discovery and first meeting with Echo 000 |
| BG07 Activated EchoLoom | Five stability threads and the first story-led NPC creation |
| BG08 Tide City Terminal | First custom world and Nan Xing opening sequence |
| BG09 Main Mirror Tribunal | Deleted-world evidence, primary-lens review, and the final Xu Cheng decision |

The brand reveal, title courtyard, phone presentation, and primary navigation pages remain unchanged. Each mapped narrative canvas uses a scene-specific brightness lift and restrained scrim so the supplied dark-indigo architecture remains visible, plus translucent ivory/champagne surfaces where copy needs separation. Environment art never sits above copy, controls, character art, clues, or interaction overlays.

## Interaction language

Use relationship-oriented nouns rather than game-economy nouns:

- Thread: a story or relationship path.
- Echo: a shared memory.
- Together: a user-initiated scene.
- Main timeline: an event that changes the long-term relationship.
- Extra: an event that does not alter the main relationship.
- Contact permission: a channel made available through story context, character willingness, and world rules.
- Communication pulse: a qualitative view of recent contact rhythm, kept separate from the long-term relationship.
- Private intent: player-side metadata used to interpret expression; it is never shown verbatim to a character.
