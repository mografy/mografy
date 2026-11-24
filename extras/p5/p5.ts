// p5.js sketches for Mografy scenes, driven frame by frame instead of by p5's own draw loop.
// Make the sketch once in setup with prepareSketch; renderFrame calls sketch(), which reseeds random(), runs your
// draw(p, t, frame) for exactly this time and lays the result into the frame. p5.js is loaded at runtime from the
// project's assets/p5.module.js (LGPL-2.1, see assets/LICENSE-p5.txt and p5-sketch.md).
import type { FrameContext, SetupContext } from '@mografy/runtime';

/** A p5 instance. Typed loosely so projects need no extra packages. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type P5 = any;

export interface SketchOptions {
  /** Project-relative path of the p5.js build. Default `assets/p5.module.js`. */
  library?: string;
  /** Logical size of the sketch. Default: the whole canvas. */
  width?: number; height?: number;
  /** '2d' (default) or 'webgl' (p5's WEBGL mode: origin at the centre; slow on machines without a GPU). */
  renderer?: '2d' | 'webgl';
  /** Frames per second used for the `frame` number draw receives. Pass the scene's meta.fps. Default 30. */
  fps?: number;
  /**
   * Runs once, after the canvas exists and the seeds are set: load images and fonts (await p.loadImage(asset(path))),
   * build particle tables with p.random(), set styles that never change. Return what draw needs.
   */
  prepare?: (p: P5, tools: { asset: (path: string) => string; setup: SetupContext }) => unknown;
}

export interface Sketch<T = unknown> { p: P5; data: T; width: number; height: number; fps: number; seed: number; density: number }

const libraries = new Map<string, Promise<P5>>();

/**
 * In setup: load p5.js, create a hidden instance-mode sketch with noLoop(), randomSeed(seed) and noiseSeed(seed),
 * and run `prepare`. The p5 draw loop never runs; renderFrame draws it with sketch().
 */
export async function prepareSketch<T = unknown>(ctx: SetupContext, o: SketchOptions = {}): Promise<Sketch<T>> {
  const url = ctx.asset(o.library ?? 'assets/p5.module.js');
  let pending = libraries.get(url);
  if (!pending) { pending = import(/* @vite-ignore */ url).then(m => m.default ?? m.p5); libraries.set(url, pending); }
  const P5Class = await pending.catch((error: unknown) => {
    libraries.delete(url);
    throw new Error(`p5.js failed to load from ${o.library ?? 'assets/p5.module.js'}. Copy extras/p5/p5.module.js into the project's assets/ (npx mografy add p5). (${String(error)})`);
  });
  const width = o.width ?? ctx.width, height = o.height ?? ctx.height, seed = ctx.seed >>> 0;
  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;left:-100000px;top:0;width:1px;height:1px;overflow:hidden;visibility:hidden';
  host.dataset.mografy = 'p5';
  document.body.append(host);
  let p!: P5;
  await new Promise<void>((resolve, reject) => {
    try {
      p = new P5Class((s: P5) => {
        s.setup = () => {
          s.createCanvas(width, height, o.renderer === 'webgl' ? s.WEBGL : s.P2D);
          s.pixelDensity(1);
          s.noLoop();
          s.randomSeed(seed); s.noiseSeed(seed);
          s.noise(0); // build the noise table now: an unseeded first call would reach for Math.random in a frame
          resolve();
        };
        s.draw = () => {};
      }, host);
    } catch (error) { reject(error); }
  });
  const data = o.prepare ? await o.prepare(p, { asset: ctx.asset, setup: ctx }) as T : undefined as T;
  return { p, data, width, height, fps: o.fps ?? 30, seed, density: 1 };
}

export interface LayerOptions {
  /** Where the sketch lands in logical canvas units. Default: covering the canvas. */
  x?: number; y?: number; width?: number; height?: number;
  alpha?: number;
}

/**
 * In renderFrame: draw the sketch for time `t` (seconds) and lay it into the frame. `frame` is t × fps and can be
 * fractional (motion blur samples between frames). Everything draw shows must come from t, frame and `s.data`:
 * p.random() restarts from the seed every call, p.noise() is a pure function, and nothing carries over between calls.
 */
export function sketch<T>(ctx: FrameContext, s: Sketch<T>, draw: (p: P5, t: number, frame: number, data: T) => void, t: number, o: LayerOptions = {}) {
  const p = s.p, density = ctx.renderScale;
  // Draw at the output's device resolution so previews and 4K exports stay sharp.
  if (s.density !== density) { p.pixelDensity(density); s.density = density; }
  p.randomSeed(s.seed);
  p.push();
  p.clear(); // always: pixels kept from an earlier call would make this frame depend on the frames before it
  try { draw(p, t, t * s.fps, s.data); } finally { p.pop(); }
  const x = o.x ?? 0, y = o.y ?? 0, w = o.width ?? s.width, h = o.height ?? s.height;
  ctx.withCanvas(c => {
    c.globalAlpha = Math.min(1, Math.max(0, o.alpha ?? 1));
    c.imageSmoothingQuality = 'high';
    c.drawImage(p.canvas as HTMLCanvasElement, x, y, w, h);
  });
}

/**
 * Trails without keeping old frames: call `draw` for `count` moments from `t - (count - 1) × spacing` up to `t`,
 * oldest first, with `k` from 0 (oldest) to 1 (now). Use it where a p5 sketch would skip background() to smear.
 */
export function trail(t: number, count: number, spacing: number, draw: (time: number, k: number, index: number) => void) {
  for (let i = 0; i < count; i++) {
    const k = count === 1 ? 1 : i / (count - 1);
    draw(t - (count - 1 - i) * spacing, k, i);
  }
}
