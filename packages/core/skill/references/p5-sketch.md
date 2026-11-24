# Generative sketches with p5.js

[p5.ts](__REPOSITORY__/extras/p5/p5.ts) runs a [p5.js](https://p5js.org/) sketch as a layer inside a Mografy frame. p5's own draw loop never runs: Mografy calls your `draw(p, t, frame)` once for each moment it needs, with `random()` reseeded every time, so the sketch exports the same pixels on every machine and every run. [p5-demo.ts](__REPOSITORY__/extras/p5/p5-demo.ts) is an eight-second tour: a noise flow field, rolling ridgelines, a growing recursive tree and twinkling stars, with Mografy type on top.

## When to use it

Use p5 for generative or creative-coding visuals: flow fields, noise landscapes, organic geometry, particle drawings, pattern backgrounds, and when the user brings an existing p5 sketch to put in a film. UI, type animation, cards and charts stay in Mografy's own layers (and D3 for charts, [data-viz.md](data-viz.md)); real 3D goes to [three-d.md](three-d.md).

## Add to a project

If the project already has `scenes/p5.ts` and `assets/p5.module.js`, reuse them. Otherwise:

```sh
npx mografy add p5 projects/<name>
```

It copies `scenes/p5.ts`, the tour `scenes/p5-demo.ts` (nothing imports it; delete it unless the user wants the tour), `assets/p5.module.js` and `assets/LICENSE-p5.txt`. `p5.module.js` is the official, unmodified p5.js 2.4.0 ES module build (about 1.2 MB). p5.js is **LGPL-2.1**: keep the file unmodified and keep `LICENSE-p5.txt` beside it. It stays a separate file the scene loads at runtime, so anyone can swap in another p5 build. Videos made with it are not covered by the licence. The rest of Mografy is MIT.

## Contract

| p5 habit | In Mografy |
| --- | --- |
| `function setup()` | `prepareSketch(ctx, { fps: meta.fps, prepare })` in the scene's `setup`; `prepare(p, { asset })` loads images and fonts and builds tables. |
| `function draw()` | `sketch(ctx, s, (p, t, frame, data) => { … }, time)` in `renderFrame`. |
| `frameCount`, `millis()`, `deltaTime` | `frame` (t × fps, may be fractional) and `t` in seconds. `millis()` throws in a frame. |
| `random()` | Works, and restarts from the project seed on every `sketch()` call: the same calls give the same values every frame. Use it for things that should stay put; vary them with `t`. |
| `noise()` | Works and is seeded in setup. Animate with a time coordinate: `p.noise(x * 0.01, y * 0.01, t * 0.3)`. |
| Objects that move by updating themselves (`particle.update()`) | Integrate them once in `prepare` into a table indexed by frame, and read the table in draw ([p5-demo.ts](__REPOSITORY__/extras/p5/p5-demo.ts) does this for its flow field), or write the motion as a function of `t`. |
| Trails from not clearing the background | `trail(t, count, spacing, (time, k) => …)` draws the last moments again, oldest first. The sketch canvas is cleared before every call, so nothing from an earlier frame survives. |
| `mouseX`, `keyPressed`, DOM (`createButton`, `createSlider`) | Not available. Use params, or a drawn cursor ([product-walkthrough.md](product-walkthrough.md)). |
| `loop()`, `frameRate()`, `saveCanvas()`, `loadJSON(url)` from the web | Not used. Mografy owns time and export; data comes from project files. |
| `preload()` (p5 1.x) | p5 2.x has no preload: `await p.loadImage(asset('assets/x.png'))` inside `prepare`. |

The canvas is transparent by default: draw the film's background in Mografy first, then `sketch()`, then type on top. Call `p.background(...)` inside draw only when the sketch should cover everything behind it. `p.textFont('Family')` uses the fonts registered in `mografy.json`.

## API

| Helper | Use |
| --- | --- |
| `prepareSketch(ctx, { width?, height?, renderer?, fps?, prepare?, library? })` | In setup: load p5, create a hidden instance-mode sketch (`noLoop`, `randomSeed`, `noiseSeed`), run `prepare`. `renderer: 'webgl'` gives p5's WEBGL mode (origin at the centre; slow without a GPU). |
| `sketch(ctx, s, draw, time, { x?, y?, width?, height?, alpha? })` | In renderFrame: reseed, run `draw(p, t, frame, data)` inside `push`/`pop`, and lay the sketch into the frame at output resolution. |
| `trail(t, count, spacing, draw)` | Redraw the last `count` moments `spacing` seconds apart; `k` goes 0 (oldest) → 1 (now) for fading. |

```ts
import { prepareSketch, sketch } from './p5.js';
import type { Sketch } from './p5.js';

export async function setup(ctx: SetupContext) {
  ctx.assets.s = await prepareSketch(ctx, { fps: meta.fps });
}

export function renderFrame(ctx: FrameContext, time: number) {
  sketch(ctx, ctx.assets.s as Sketch, (p, t) => {
    p.noFill(); p.stroke(255, 160);
    for (let i = 0; i < 40; i++) {
      p.beginShape();
      for (let x = 0; x <= p.width; x += 12) p.vertex(x, 200 + i * 18 + 80 * (p.noise(x * 0.003, i * 0.1, t * 0.4) - 0.5));
      p.endShape();
    }
  }, time);
}
```

## Porting an existing sketch

1. Wrap it: move `setup()` work into `prepare`, the body of `draw()` into the draw callback, and global variables into the object `prepare` returns.
2. Replace `frameCount`/`millis()` with `frame`/`t`, and every `p5.` global call with `p.` (instance mode).
3. Find state that grows each frame (positions updated in place, arrays pushed to, a background that is never cleared) and turn it into a table built in `prepare` or a formula of `t`.
4. Run `npx mografy check`: it renders the middle frame twice and stops with "depends on earlier calls" if any state still leaks.

## Rendering and review

- The 2D renderer is Canvas 2D: it exports to every format and follows the output resolution (`pixelDensity` is set from the render scale).
- Review out of order and at the end of each move; check that dense line work still reads at the export size and after motion blur.

## Cost

- p5 adds per-call overhead to each shape; thousands of `line()` calls cost more than one `beginShape` with many vertices. Batch.
- Size the sketch to the area it covers (`width`, `height` in `prepareSketch` and the layer box in `sketch`) instead of the whole frame when it is small.
- Heavy integrations belong in `prepare`, which runs once; check setup time with `npx mografy check`.
