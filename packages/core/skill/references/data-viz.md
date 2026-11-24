# Data visualisation with D3

[d3.ts](__REPOSITORY__/extras/d3/d3.ts) lets a scene use [D3](https://d3js.org/) for what it is best at, the maths of charts (scales, shape generators, layouts, projections, colour, number formats), and draws the result on the frame's canvas. [d3-demo.ts](__REPOSITORY__/extras/d3/d3-demo.ts) is a ten-second tour: bars grow on a canvas axis, a line draws itself and changes data, a donut sweeps open, a force network settles and a globe turns.

## When to use it

Use D3 when the film shows data: a trend, a ranking, shares of a whole, a map, a hierarchy or a network. One or two numbers do not need it; use the built-in `count-up` or `progress-bar`. For a chart that is only decoration, a few runtime shapes are lighter.

## Add to a project

If the project already has `scenes/d3.ts` and `assets/d3.module.js`, reuse them. Otherwise:

```sh
npx mografy add d3 projects/<name>
```

It copies `scenes/d3.ts`, the tour `scenes/d3-demo.ts` (nothing imports it; delete it unless the user wants the tour), `assets/d3.module.js` and `assets/LICENSE-d3.txt`. `d3.module.js` is D3 7.9.2 (ISC) bundled to about 0.23 MB with these modules: array, scale, scale-chromatic, shape, path, interpolate, color, format, time, time-format, dsv, hierarchy, force, geo, delaunay, contour, chord, polygon, quadtree, random. It sits in `assets/` and `loadD3` imports it at runtime, because scenes may import only project sources and `@mografy/runtime`.

Not included, on purpose: `d3-selection`, `d3-transition`, `d3-timer`, `d3-axis`, `d3-zoom`, `d3-brush`, `d3-drag`, `d3-fetch`. They build SVG or DOM trees or run their own clock. A Mografy frame is drawn from `t` on a canvas; use `axis` for axes and `tweenData` for transitions.

## Contract

- **Load and prepare in `setup`.** `const d3 = await loadD3(ctx)`, read data, build hierarchies and layouts, run simulations, project map paths; store them in `ctx.assets`. `renderFrame` uses scales, generators and those tables.
- **Draw from `t`.** Every frame computes its picture from time: progress values from `at`/`win`, data from `tweenData`, positions from `positionsAt`. Never keep "the previous frame" in a variable.
- **Seed every random.** D3 falls back to `Math.random` in `d3.shuffle`, the `d3-random` generators and `forceSimulation`. Use `seeded(d3, ctx.seed)` in setup and pass its `source`: `sim.randomSource(rand.source)`, `d3.shuffler(rand.source)`. A force simulation created inside `renderFrame` throws (it reads the clock).
- **Simulate ahead.** Run force layouts to the end in setup with `simulate(sim, ticks)` and show any moment with `positionsAt(track, progress)`. The same applies to anything iterative.
- **Data stays in the project, under `assets/`.** Put CSV, TSV or JSON in `assets/data/` and read it in setup with `loadData(ctx, d3, 'assets/data/sales.csv')`, or import a JSON file from `scenes/`. Files in `assets/` are part of the scene's version, so editing the data re-renders the film; a file read from anywhere else would leave the player and review showing the old numbers. Never fetch from the network: exports must be reproducible offline.

## API

| Helper | Use |
| --- | --- |
| `loadD3(ctx, library?)` | In setup: the D3 namespace from `assets/d3.module.js`. |
| `loadData(ctx, d3, path)` | In setup: rows from a CSV/TSV (`d3.autoType` turns numbers and dates into values) or JSON file in the project. |
| `seeded(d3, seed)` | `{ source, random, shuffle, normal }`: seeded randomness to hand to D3. |
| `simulate(sim, ticks?)` → `positionsAt(track, progress)` | Record a force simulation once; read interpolated node positions for any progress 0..1. |
| `shape(ctx, c => gen.context(c)(data), { fill?, stroke?, alpha? })` | Draw with any generator that takes a canvas context: `d3.line`, `d3.area`, `d3.arc`, `d3.geoPath(projection, c)`, `d3.linkHorizontal`, `d3.ribbon`. |
| `trimPoints(points, progress)` | Cut screen points to the first part of their length with an interpolated end: feed it to `d3.line`/`d3.area` to grow a line. |
| `strokeReveal(ctx, d, progress, style)` | Draw the first part of an SVG path string (a generator without `.context`), for map borders, links and curves. |
| `sweepArcs(arcs, progress, stagger?)` | Pie/donut arcs from `d3.pie` swept open from their start angles. |
| `tweenData(d3, from, to, progress)` | Interpolate between two data states (numbers, arrays, objects, colours) for a chart change. |
| `axis(ctx, scale, { side, at, ticks?, format?, grid?, progress?, label?, noLine? })` | Canvas axis for linear, time, band and point scales; `progress` draws the line, then ticks and labels in turn. |
| `zhNumber(value, digits?)` | 繁中 numbers with 萬 and 億: `12345 → 1.2 萬`. For other locales use `d3.format`. |

```ts
import { at, ease } from '@mografy/runtime';
import type { FrameContext, SetupContext } from '@mografy/runtime';
import { loadD3, loadData, axis, shape, trimPoints } from './d3.js';
import type { D3 } from './d3.js';

export async function setup(ctx: SetupContext) {
  const d3 = await loadD3(ctx);
  ctx.assets.chart = { d3, rows: await loadData(ctx, d3, 'assets/data/users.csv') };
}

export function renderFrame(ctx: FrameContext, t: number) {
  const { d3, rows } = ctx.assets.chart as { d3: D3; rows: { month: Date; users: number }[] };
  const x = d3.scaleUtc(d3.extent(rows, r => r.month), [160, 1760]), y = d3.scaleLinear([0, d3.max(rows, r => r.users)], [900, 200]).nice();
  axis(ctx, y, { side: 'left', at: 150, ticks: 4, grid: 1610, noLine: true, progress: at(t, 0, 0.8) });
  const points = trimPoints(rows.map(r => [x(r.month), y(r.users)]), at(t, 0.4, 2.4, ease.inOutCubic));
  shape(ctx, c => d3.line().curve(d3.curveMonotoneX).context(c)(points), { stroke: { color: '#12b5a5', width: 5 } });
}
```

## Direction

- **One finding per shot.** Lead with the sentence the chart proves ("用戶一年成長三倍"), then let the chart draw it. Highlight the one bar or point that carries it in the accent colour; everything else stays neutral grey.
- **Build in reading order:** frame and axis (0.5–0.8 s), then the data (1–2 s, eased in-out for lines, staggered out-cubic for bars), then the label or number at the end of the motion. Hold the finished chart at least 1.5 s.
- **Label directly** at line ends and on bars; use legends only for three or more series. Keep tick labels at 16–20 px on 1080p and units in the title.
- **Change data, not charts.** For "before → after", keep the axes and tween the data with `tweenData` so the eye follows the change; re-scale axes only when the range really changes, and tween the domain too.
- **Rankings that re-order:** interpolate each row's rank between the two orders with the same eased progress as the values, draw the row that carries the story last so it passes in front, and dim the other moving rows' labels mid-swap (`1 - 0.85 * sin(π·k)`) so passing names never stack.
- **Numbers:** `d3.format(',')`, `d3.format('.0%')`, or `zhNumber` for 繁中. Round to what matters; the exact figure goes in the caption if needed.
- **Maps:** pick a projection that suits the region (`geoMercator` for city/country close-ups, `geoEqualEarth` for the world, `geoOrthographic` for a turning globe). GeoJSON files go in `assets/data/`; simplify them first, as big files slow setup.
- Pair with `count-up` for a headline number and with the film camera to push in on the key point.

## Rendering and review

- D3 adds no rendering of its own: everything is Canvas 2D, so it exports to every format and stays sharp at any scale.
- `npx mografy check` catches a randomness or clock leak (it renders the middle frame twice); review frames out of order and at the end of each build, and check that labels never collide with bars or each other.

## Cost

- Scales and generators are cheap; draw thousands of points in one path (`beginPath` once, many `moveTo`/`arc`) instead of a path per point.
- Project map paths once in setup when the projection does not move (store `new Path2D(d)`); a rotating globe projects per frame, which is fine for one country layer but slow for detailed world borders.
- Shadows on large panels are expensive on CPU canvases: use `surface(..., { elevation: 0 })` for flat dashboard cards.
