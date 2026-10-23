# Corso Buenos Aires · Quinto piano

**Live:** https://azaj01.github.io/ai-demo/casa-buenos-aires/ · part of [AI Demos](https://azaj01.github.io/ai-demo/)

A scroll-driven walkthrough built from a cadastral floor plan. The page opens on the plan as an architect would print it; scrolling raises the walls, brings the camera down to the front door and walks through the flat, and each room turns from a line drawing into real materials as you reach it.

**Run it:** serve this folder over http, for example `node ../tools/serve-static.mjs . 4410`, then open http://localhost:4410. Add `?p=0.5` to jump to a point in the walk.

## What it was built from

`assets/plan-original.png`, the cadastral plan *Piano quinto H. 2.90*, Corso Buenos Aires, Milan, registered as an office. The plan has no dimensions, so the scale was estimated (about 0.04 m per pixel of the scan, so roughly 16 × 17 m). The page says so. The layout and room proportions follow the plan; the furniture, finishes and the view from the windows are invented and labelled "illustrative".

## Reusing it for another property

The engine is generic. Everything about this flat lives in `js/property.js`:

| Field | What it holds |
|---|---|
| `walls` | Centre lines in metres (x east, y south, like the drawing), thickness, and openings: doors (`swing`, `side`) and windows (`sill`, `head`) |
| `rooms` | Floor outline, floor finish (`parquet`, `terrazzo`, `marble`, `stone`), name, caption, and the scroll range + direction in which its materials sweep in |
| `furniture` | Items by type (`meetingTable`, `bench`, `desk`, `sofa`, `armchair`, `shelf`, `fireplace`, `art`, `plant`, `vanity`, `toilet`, …) with position and rotation |
| `path` | Camera keyframes along the scroll: plan view, the descent, then eye-level stops |
| `context` | What is drawn around the flat on the plan sheet: street names, stairs, lifts, neighbouring lots |

For a new property: read the plan into `walls` and `rooms`, place furniture, write the camera path, and swap `assets/plan-original.png`. Nothing in `build.js`, `main.js` or `textures.js` needs to change.

## How it works

- **The plan is the 3D model.** A camera far above with a 12° lens looks straight down; a clipping plane cuts everything at 1.2 m. Cut walls are filled with ink (the back faces of the clipped geometry), so it reads as a real plan.
- **The drawing-to-materials sweep** uses one small "reveal mask" canvas laid over the plan. Each room's area goes from black to white as you scroll, along the direction you enter it. Every material samples the mask at its own position (walls sample on the side they face) and mixes flat paper with its real colour.
- **Textures:** CC0 scans from [Poly Haven](https://polyhaven.com), reused from the Casa Serra demo folder. The chevron parquet, terrazzo, the Milanese facades and the paintings are drawn in code (`js/textures.js`).
- **Stack:** three.js 0.170 and Lenis 1.1.14 from jsDelivr. Plain files, no build step. Lighter textures and no shadows on phones; a still of the plan if WebGL 2 is missing.

## Visual layer (v2)

- **Opening plan, split in two:** the west half is the pencil drawing, the east half the same model rendered under a high soft sun. Scrolling wipes the render away before the walls rise. The sheet has a structural grid with bubbles, dimension chains, monospace room labels with sizes, and faint floor patterns in the drawing.
- **Post-processing** (desktop): bloom and a grade pass (ACES, light warmth and vignette indoors, film grain). Ambient occlusion is opt-in (`?ao=1`): it conflicts with the section cut. Drawing colours go through the inverse tone curve so the paper stays exactly as designed. `?post=0` turns it off; phones skip it.
- **Light:** the sun drops from midday (rendered plan) to a low golden sun for the walk, with light shafts through the street windows and dust in the sunny rooms.
- **Room stops:** the scroll holds at six rooms. A marker appears on a real point in the room, with a leader line and a title that slides in; clicking it opens the room's file (text and facts). Edit them in `stops` in `property.js`.
- Furniture has rounded edges and textures mapped in real metres; sheer curtains hang at the street windows.

## Credits

The idea of a floor plan that becomes a house as you scroll comes from [Casa Serra](https://github.com/sam1983aing/casa-serra) by Sam Aing. This is an independent implementation; none of that project's code is used.
