// D3 for Mografy scenes: scales, shapes, layouts, geography and colour, drawn on the frame's canvas.
// Load D3 once in setup with loadD3; renderFrame only uses scales, generators and the tables setup prepared.
// D3 itself is loaded at runtime from the project's assets/d3.module.js (see data-viz.md).
import { clamp, text } from '@mografy/runtime';
import type { FrameContext, SetupContext, TextStyle } from '@mografy/runtime';

/** The D3 module namespace. Typed loosely so projects need no extra packages. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type D3 = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Scale = any;
type Canvas = CanvasRenderingContext2D;

const loaded = new Map<string, Promise<D3>>();

/** In setup: load D3 from the project. Every helper below takes the namespace this returns. */
export async function loadD3(ctx: SetupContext, library = 'assets/d3.module.js'): Promise<D3> {
  const url = ctx.asset(library);
  let pending = loaded.get(url);
  if (!pending) { pending = import(/* @vite-ignore */ url); loaded.set(url, pending); }
  return pending.catch((error: unknown) => {
    loaded.delete(url);
    throw new Error(`D3 failed to load from ${library}. Copy extras/d3/d3.module.js into the project's assets/ (npx mografy add d3). (${String(error)})`);
  });
}

/**
 * In setup: read a CSV, TSV or JSON file from the project and parse it (CSV rows get d3.autoType numbers and dates).
 * Keep data in assets/ (assets/data/…): those files are part of the scene's version, so edits re-render.
 */
export async function loadData<T = Record<string, unknown>>(ctx: SetupContext, d3: D3, path: string): Promise<T[]> {
  const response = await fetch(ctx.asset(path));
  if (!response.ok) throw new Error(`Could not read ${path} (${response.status}). Keep data files in the project's assets/ folder.`);
  const body = await response.text();
  if (/\.json$/i.test(path)) return JSON.parse(body) as T[];
  return (/\.tsv$/i.test(path) ? d3.tsvParse(body, d3.autoType) : d3.csvParse(body, d3.autoType)) as T[];
}

/**
 * Seeded randomness for D3 in setup: `random()` in [0, 1), and `source` to hand to D3 wherever it would use
 * Math.random (d3.shuffler(source), d3.randomNormal.source(source), simulation.randomSource(source)).
 */
export function seeded(d3: D3, seed: number) {
  const source = d3.randomLcg(((seed >>> 0) % 1e9) / 1e9);
  return {
    source, random: () => source() as number,
    shuffle: <T>(items: T[]) => d3.shuffler(source)(items.slice()) as T[],
    normal: (mu = 0, sigma = 1) => d3.randomNormal.source(source)(mu, sigma) as () => number,
  };
}

/** Node positions recorded by `simulate`, one [x, y] pair per node per recorded tick. */
export interface Track { ticks: number; nodes: number; data: Float32Array }

/**
 * In setup: run a force simulation to the end and record every tick, so renderFrame can show any moment of it
 * without carrying state between frames. Pass a simulation built with `seeded(...).source` as its randomSource.
 */
export function simulate(simulation: D3, ticks = 300): Track {
  simulation.stop();
  const nodes = simulation.nodes() as { x: number; y: number }[];
  const data = new Float32Array((ticks + 1) * nodes.length * 2);
  const record = (k: number) => nodes.forEach((n, i) => { data[(k * nodes.length + i) * 2] = n.x; data[(k * nodes.length + i) * 2 + 1] = n.y; });
  record(0);
  for (let k = 1; k <= ticks; k++) { simulation.tick(); record(k); }
  return { ticks, nodes: nodes.length, data };
}

/** In renderFrame: positions at `progress` 0..1 through a recorded simulation, interpolated between ticks. */
export function positionsAt(track: Track, progress: number): [number, number][] {
  const f = clamp(progress) * track.ticks, k = Math.min(track.ticks - 1, Math.floor(f)), u = track.ticks ? f - k : 0;
  const a = Math.max(0, k) * track.nodes * 2, b = Math.min(track.ticks, k + 1) * track.nodes * 2, d = track.data;
  return Array.from({ length: track.nodes }, (_, i) => [d[a + i * 2]! + (d[b + i * 2]! - d[a + i * 2]!) * u, d[a + i * 2 + 1]! + (d[b + i * 2 + 1]! - d[a + i * 2 + 1]!) * u]);
}

/**
 * Points cut to the first `progress` 0..1 of their length, ending on an interpolated point: feed the result to a
 * d3.line or d3.area to draw a line that grows. Points are [x, y] in canvas units.
 */
export function trimPoints(points: [number, number][], progress: number): [number, number][] {
  const k = clamp(progress);
  if (k >= 1 || points.length < 2) return points.slice();
  if (k <= 0) return points.slice(0, 1);
  const lengths = [0];
  for (let i = 1; i < points.length; i++) lengths.push(lengths[i - 1]! + Math.hypot(points[i]![0] - points[i - 1]![0], points[i]![1] - points[i - 1]![1]));
  const target = lengths[lengths.length - 1]! * k;
  let i = 1; while (i < points.length - 1 && lengths[i]! < target) i++;
  const span = lengths[i]! - lengths[i - 1]!, u = span ? (target - lengths[i - 1]!) / span : 0;
  const [ax, ay] = points[i - 1]!, [bx, by] = points[i]!;
  return [...points.slice(0, i), [ax + (bx - ax) * u, ay + (by - ay) * u]];
}

const pathLengths = new Map<string, number>();
/** Length of an SVG path string in its own units (cached; measured with an SVG element). */
export function pathLength(d: string) {
  let length = pathLengths.get(d);
  if (length === undefined) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    el.setAttribute('d', d);
    length = el.getTotalLength();
    if (pathLengths.size > 2000) pathLengths.clear();
    pathLengths.set(d, length);
  }
  return length;
}

export interface StrokeStyle { color: string; width?: number; cap?: CanvasLineCap; join?: CanvasLineJoin; alpha?: number }

/**
 * Stroke an SVG path string (what a D3 generator returns without .context) so its first `progress` 0..1 is drawn:
 * the line-drawing reveal for maps, links and curves whose points you do not have.
 */
export function strokeReveal(ctx: FrameContext, d: string, progress: number, s: StrokeStyle) {
  const k = clamp(progress);
  if (k <= 0 || !d) return;
  ctx.withCanvas(c => {
    applyStroke(c, s);
    if (k < 1) { const length = pathLength(d); c.setLineDash([length * k, length + 1]); }
    c.stroke(new Path2D(d));
  });
}

function applyStroke(c: Canvas, s: StrokeStyle) {
  c.strokeStyle = s.color; c.lineWidth = s.width ?? 2; c.lineCap = s.cap ?? 'round'; c.lineJoin = s.join ?? 'round';
  if (s.alpha !== undefined) c.globalAlpha *= clamp(s.alpha);
}

/**
 * Draw with a D3 generator that takes a canvas context (d3.line, d3.area, d3.arc, d3.geoPath, d3.linkHorizontal…):
 * `draw` calls the generator after `.context(c)`, then the path is filled and/or stroked.
 *   shape(ctx, c => line.context(c)(points), { stroke: { color: '#12b5a5', width: 4 } })
 */
export function shape(ctx: FrameContext, draw: (c: Canvas) => void, o: { fill?: string | CanvasGradient; stroke?: StrokeStyle; alpha?: number } = {}) {
  ctx.withCanvas(c => {
    if (o.alpha !== undefined) c.globalAlpha *= clamp(o.alpha);
    c.beginPath(); draw(c);
    if (o.fill) { c.fillStyle = o.fill; c.fill(); }
    if (o.stroke) { applyStroke(c, o.stroke); c.stroke(); }
  });
}

/** Pie or donut arcs (from d3.pie) swept open to `progress` 0..1 from each arc's start, all together or staggered. */
export function sweepArcs<A extends { startAngle: number; endAngle: number }>(arcs: A[], progress: number, stagger = 0): A[] {
  const n = arcs.length, span = 1 + stagger * Math.max(0, n - 1);
  return arcs.map((a, i) => {
    const k = clamp(progress * span - i * stagger);
    return { ...a, endAngle: a.startAngle + (a.endAngle - a.startAngle) * k };
  });
}

/** Data between two states for a chart change (d3.interpolate over objects, arrays and colours); replaces d3-transition. */
export function tweenData<T>(d3: D3, from: T, to: T, progress: number): T {
  return d3.interpolate(from, to)(clamp(progress)) as T;
}

export interface AxisOptions {
  side: 'bottom' | 'top' | 'left' | 'right';
  /** Where the axis line sits: y for bottom/top, x for left/right. */
  at: number;
  ticks?: number | unknown[];
  format?: (value: never) => string;
  tickSize?: number;
  /** Grid lines across the plot, this long (towards the plot). 0 = none. */
  grid?: number;
  /** Draws the axis in, 0..1: the line grows, then ticks and labels follow one by one. */
  progress?: number;
  color?: string; gridColor?: string;
  label?: Partial<TextStyle>;
  /** Hide the axis line itself (labels and grid only). */
  noLine?: boolean;
}

/** A D3-style axis drawn on canvas (d3-axis is SVG only). Works with continuous, time, band and point scales. */
export function axis(ctx: FrameContext, scale: Scale, o: AxisOptions) {
  const k = clamp(o.progress ?? 1);
  if (k <= 0) return;
  const horizontal = o.side === 'bottom' || o.side === 'top', sign = o.side === 'bottom' || o.side === 'right' ? 1 : -1;
  const values: unknown[] = Array.isArray(o.ticks) ? o.ticks : scale.ticks ? scale.ticks(o.ticks ?? 5) : scale.domain();
  const format = o.format ?? (scale.tickFormat ? scale.tickFormat(typeof o.ticks === 'number' ? o.ticks : 5) : String);
  const offset = scale.bandwidth ? scale.bandwidth() / 2 : 0;
  const [r0, r1] = (scale.range() as number[]).slice(0, 2) as [number, number];
  const color = o.color ?? 'rgba(255,255,255,0.55)', tick = o.tickSize ?? 6;
  const lineK = clamp(k / 0.5);
  ctx.withCanvas(c => {
    c.strokeStyle = color; c.lineWidth = 1.5;
    if (!o.noLine) {
      const end = r0 + (r1 - r0) * lineK;
      c.beginPath();
      if (horizontal) { c.moveTo(r0, o.at); c.lineTo(end, o.at); } else { c.moveTo(o.at, r0); c.lineTo(o.at, end); }
      c.stroke();
    }
  });
  values.forEach((value, i) => {
    const local = clamp((k - 0.3) / 0.7 * values.length - i * 0.6);
    if (local <= 0) return;
    const p = (scale(value) as number) + offset;
    if (o.grid) ctx.withCanvas(c => {
      c.strokeStyle = o.gridColor ?? 'rgba(255,255,255,0.08)'; c.lineWidth = 1; c.globalAlpha *= local;
      c.beginPath();
      if (horizontal) { c.moveTo(p, o.at); c.lineTo(p, o.at - sign * o.grid! * local); } else { c.moveTo(o.at, p); c.lineTo(o.at - sign * o.grid! * local, p); }
      c.stroke();
    });
    ctx.withCanvas(c => {
      c.strokeStyle = color; c.lineWidth = 1.5; c.globalAlpha *= local; c.beginPath();
      if (horizontal) { c.moveTo(p, o.at); c.lineTo(p, o.at + sign * tick); } else { c.moveTo(o.at, p); c.lineTo(o.at + sign * tick, p); }
      c.stroke();
    });
    const style: TextStyle = { size: 18, color, ...o.label, alpha: (o.label?.alpha ?? 1) * local,
      align: horizontal ? 'center' : sign > 0 ? 'left' : 'right', baseline: horizontal ? (sign > 0 ? 'top' : 'bottom') : 'middle' };
    const gap = tick + 6;
    text(ctx, (format as (v: unknown) => string)(value), horizontal ? p : o.at + sign * gap, horizontal ? o.at + sign * gap : p, style);
  });
}

/**
 * Traditional Chinese number formatting with 萬 and 億 (12,345 → 1.2 萬, 350000000 → 3.5 億). `digits` = decimals
 * kept after the unit; values under 10,000 get thousands separators.
 */
export function zhNumber(value: number, digits = 1) {
  const abs = Math.abs(value), sign = value < 0 ? '-' : '';
  const fixed = (n: number) => String(Math.round(n * 10 ** digits) / 10 ** digits);
  if (abs >= 1e8) return `${sign}${fixed(abs / 1e8)} 億`;
  if (abs >= 1e4) return `${sign}${fixed(abs / 1e4)} 萬`;
  return `${sign}${abs.toLocaleString('en-US', { maximumFractionDigits: digits })}`;
}
