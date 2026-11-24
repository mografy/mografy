# Extras: optional helpers and what they add

Read this when a film needs a helper that is not in `@mografy/runtime`, or the user asks what extras exist. It lists each extra, the files `npx mografy add` copies, and the reference to read next. Read only the reference for the extra you add.

Common motion and drawing helpers (springs, easing, eased time windows, tempo grids, keyed curves, the film camera, layers, one-pass blur and bloom, the shot table, rounded surfaces, word reveals, gradients) are already in `@mografy/runtime`; use those first. Extras build on them. An installation contains only the sixteen built-in components; extras are copied into one project when its brief needs them, so add an extra only when the film uses it.

## Which extra

| Extra | Use it for | Copies into the project | Then read |
| --- | --- | --- | --- |
| `cinema` | Camera moves on stills or key art, wipes, iris, particle wipes, atmosphere | `scenes/cinema.ts` and its tour `scenes/cinema-demo.ts` | [camera-transitions.md](https://github.com/mografy/mografy/blob/main/.agents/skills/mografy/references/camera-transitions.md) |
| `cjk` | Chinese or Japanese copy, vertical text, CJK punctuation | `scenes/cjk.ts` and `scenes/cjk-demo.ts`; Noto Sans CJK TC Medium and Noto Serif CJK TC Bold subsets (about 9.5 MB, OFL) into `assets/`, registered under `fonts` in `mografy.json` | [cjk-typography.md](https://github.com/mografy/mografy/blob/main/.agents/skills/mografy/references/cjk-typography.md) |
| `three` | Real 3D: a product that turns, depth, an orbiting camera | `scenes/three.ts` and `scenes/three-demo.ts`; `assets/three.module.js` (Three.js r186, MIT) and its licence | [three-d.md](https://github.com/mografy/mografy/blob/main/.agents/skills/mografy/references/three-d.md) |
| `d3` | Charts, maps, hierarchies and networks from data: scales, shapes, layouts, canvas axes | `scenes/d3.ts` and `scenes/d3-demo.ts`; `assets/d3.module.js` (D3 7.9.2, ISC, about 0.23 MB) and its licence | [data-viz.md](https://github.com/mografy/mografy/blob/main/.agents/skills/mografy/references/data-viz.md) |
| `p5` | Generative sketches (flow fields, noise, organic geometry) and porting a user's p5 sketch | `scenes/p5.ts` and `scenes/p5-demo.ts`; `assets/p5.module.js` (p5.js 2.4.0, unmodified, LGPL-2.1, about 1.2 MB) and its licence | [p5-sketch.md](https://github.com/mografy/mografy/blob/main/.agents/skills/mografy/references/p5-sketch.md) |
| `music` | A score composed to the film's moments when the user supplies no track | `music-src/score.py`, `music-src/music.json` (an example to rewrite) | [music.md](https://github.com/mografy/mografy/blob/main/.agents/skills/mografy/references/music.md) |
| `walkthrough` | Product demos from screenshots: redrawn app screens, detail shots, camera, cursor and taps | `scenes/walkthrough.ts` and `scenes/walkthrough-demo.ts` | [product-walkthrough.md](https://github.com/mografy/mografy/blob/main/.agents/skills/mografy/references/product-walkthrough.md) |
| `stage` | Short product UI loops (4–12 s): a script over state, windows and phones, placeholder lines, rolling numbers, looks | `scenes/stage.ts` | [ui-stage.md](https://github.com/mografy/mografy/blob/main/.agents/skills/mografy/references/ui-stage.md); the ten `stage-*` reference films in [examples.md](https://github.com/mografy/mografy/blob/main/.agents/skills/mografy/references/examples.md) |

Ready-made beats (hooks, captions, device screens, numbers, end cards) are templates, not extras: see [templates.md](https://github.com/mografy/mografy/blob/main/.agents/skills/mografy/references/templates.md). Finished films to learn from are reference films: see [examples.md](https://github.com/mografy/mografy/blob/main/.agents/skills/mografy/references/examples.md).

## Adding one

A `*-demo.ts` tour is copied beside its helper; nothing imports it, so it costs the film nothing. Delete it when the film does not need it. A scene that imports an extra the project does not have yet fails to compile with the exact `npx mografy add <extra> <project>` to run.

```sh
npx mografy add                          # list extras, templates and reference films
npx mografy add cinema projects/my-film  # copy one extra into a project
npx mografy add cinema cjk projects/my-film
```

`add` copies from the current checkout's `extras/` folder, else from the npm package's own `extras/` (every extra ships with Mografy, so this works offline), else from GitHub at the installed version's tag (falling back to `main`). It registers the CJK fonts in `mografy.json`, prints the import line to use next and where the guide is (or how to install the Skill when it is missing), and keeps any copied file the project has changed unless you pass `--force`. Without the `mografy` command, download a file directly, for example:

```sh
curl -fsSL -o scenes/cinema.ts https://raw.githubusercontent.com/mografy/mografy/main/extras/cinema/cinema.ts
```

The import lines `add` prints:

| Extra | Import |
| --- | --- |
| `cinema` | `import { plate, move, crossfade, iris, particleWipe, drift } from './cinema.js';` |
| `cjk` | `import { cjkText, verticalText, CJK_SANS, CJK_SERIF } from './cjk.js';` |
| `three` | `import { prepareStage, stage, orbit, studioLight } from './three.js';` |
| `d3` | `import { loadD3, axis, shape, trimPoints, sweepArcs, tweenData, simulate, positionsAt, seeded } from './d3.js';` |
| `p5` | `import { prepareSketch, sketch, trail } from './p5.js';` |
| `walkthrough` | `import { createKit, camAt, withCamera, cursorAt, drawCursor } from './walkthrough.js';` |
| `stage` | `import { play, wait, set, click, tap, type, focus, mark, withStage, createKit, look, pin } from './stage.js';` |

## Rules that come with them

- The scene modules (`cinema.ts`, `cjk.ts`, `three.ts`, `d3.ts`, `p5.ts`, `walkthrough.ts`, `stage.ts`) import only `@mografy/runtime` and their local siblings, so they work as soon as they are in `scenes/`. Change the project's copy freely; it is the project's code now.
- `three.module.js` is Three.js 0.186.1 plus `GLTFLoader`, `RoomEnvironment` and `RoundedBoxGeometry`, bundled and minified with esbuild. It sits in `assets/` and is loaded at runtime with `import(ctx.asset(...))`, because scene modules may import only project sources and `@mografy/runtime`, and `npx mografy check` would flag the randomness inside three.js. Create every Three.js object in `setup`, never in `renderFrame` ([three-d.md](https://github.com/mografy/mografy/blob/main/.agents/skills/mografy/references/three-d.md)).
- `d3.module.js` and `p5.module.js` follow the same pattern: libraries in `assets/`, loaded in setup by `loadD3` / `prepareSketch`, drawing from `t` in renderFrame. Seed their randomness and precompute anything iterative in setup ([data-viz.md](https://github.com/mografy/mografy/blob/main/.agents/skills/mografy/references/data-viz.md), [p5-sketch.md](https://github.com/mografy/mografy/blob/main/.agents/skills/mografy/references/p5-sketch.md)). `p5.module.js` is LGPL-2.1: keep it unmodified, with `LICENSE-p5.txt` beside it. `extras/d3/build-d3.mjs` and `extras/p5/update-p5.mjs` rebuild them from npm; films never need those scripts.
- `music/score.py` is not a scene module. It runs on your machine and needs Python 3 with numpy (`pip install numpy`; ffmpeg for MP3): `python3 music-src/score.py music-src/music.json assets/music.mp3`, then point `audio` in `mografy.json` at the file ([music.md](https://github.com/mografy/mografy/blob/main/.agents/skills/mografy/references/music.md)).
- Shrink CJK fonts to the characters the film draws before delivery: `python3 node_modules/mografy/extras/cjk/subset-film-fonts.py <project>` from a workspace, `python3 extras/cjk/subset-film-fonts.py <project>` from a checkout (needs `pip install fonttools`). It writes `<font>-film.<ext>` beside each font and points `mografy.json` at them, always rebuilding from the originals, so run it again after every copy change. `subset-cjk-fonts.py` beside it rebuilds the shipped subsets from the Noto CJK sources; films never need it.
- `motion-design.ts` (`node_modules/mografy/extras/` in a workspace, `extras/` in a checkout) is a worked example for [motion-design.md](https://github.com/mografy/mografy/blob/main/.agents/skills/mografy/references/motion-design.md), not something to add.
