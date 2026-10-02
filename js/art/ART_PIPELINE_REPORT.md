# v1.8 Art Pipeline Report — Gold-Standard Swordsman

## 1. Original cause of the quality gap
- All troops were drawn with **runtime canvas primitives** (`arc`, `ellipse`, `fillRect`).
- Folders `assets/sprites/` and `assets/avatars/` were **empty** (no PNG/SVG character art).
- There was **no sprite sheet, no skeletal animation, no painted textures**.
- Prior versions only added gradients/shadows on the same primitive approach — not production character art.

## 2. Rendering & asset pipeline used
| Layer | Implementation |
|-------|----------------|
| Animation system | `js/art/SpriteAnimator.js` — state machine, frame timing, flip, non-looping attack/death |
| Swordsman frames | `js/art/SwordsmanRenderer.js` — **pre-rendered** unique poses baked to offscreen canvases at load |
| Integration | `Troop` uses animator **only when `id === 'swordsman'`**; other classes keep procedural draw |
| Future PNGs | `SpriteAnimator.fromSpriteSheet(url, fw, fh, stateMap)` ready for real sheets |

Frames are **not** “rotate the same stick figure”: each state has distinct pose parameters (legs, arms, torso lean, sword angle, bob).

## 3. Files changed
- `js/art/SpriteAnimator.js` (new)
- `js/art/SwordsmanRenderer.js` (new)
- `js/entities/Troop.js` (swordsman path + animator hooks)
- `index.html` (script includes)
- `assets/sprites/swordsman/` (reserved for future PNG drop-in)

## 4. Animation states implemented
| State | Frames | Loop | Notes |
|-------|--------|------|-------|
| spawn | 4 | no | scale-in + settle |
| idle | 4 | yes | breathing bob |
| walk | 4 | yes | (available; troops currently idle when no target) |
| attack | 6 | no | anticipation → strike → recovery |
| hit | 2 | no | recoil |
| death | 4 | no | collapse |

## 5. Remaining limitations
- Frames are still **vector-constructed** (high-detail procedural), not hand-painted/AI-painted bitmaps.
- True Clash-level polish needs **external asset production**: paint or AI-generate 96×112 (or higher) frames per state, export PNG sheet, load via `fromSpriteSheet`.
- Only **Swordsman** is on the new pipeline; other troops unchanged by design (benchmark-first).
- No Figma-exported character sheets were available in the project; Figma connector cannot invent full sprite production without a design file + export workflow.

## 6. How to verify in-game
1. Open `index.html` (or `npx serve .`).
2. Start a level and deploy **شمشیرزن / Swordsman**.
3. Watch: spawn pop, idle breathing, attack windup + slash, hit flash, death fall.
4. Compare side-by-side with any non-swordsman troop (still old pipeline).
5. To plug real art later: put a horizontal sheet in `assets/sprites/swordsman/sheet.png` and switch `SwordsmanArt.createAnimator()` to `SpriteAnimator.fromSpriteSheet(...)`.

## Missing asset-production step (honest)
To reach true premium painted quality:
1. Produce character concept + turnaround (Figma or art tool).
2. Paint or generate **frame-by-frame** or use Spine/DragonBones for skeletal export.
3. Export transparent PNGs / sprite sheet @ 2x resolution.
4. Replace baked canvases with loaded images in `SwordsmanArt.createAnimator()`.
