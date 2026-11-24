// A ten-second tour of d3.ts: four panels build in turn on one dark board. Bars grow on a canvas axis, a line
// draws itself and then changes data, a donut sweeps open, a force network settles, and a globe turns.
import { at, ease, stagger, surface, roundRect, text, win } from '@mografy/runtime';
import type { FrameContext, SetupContext } from '@mografy/runtime';
import { loadD3, seeded, simulate, positionsAt, trimPoints, sweepArcs, tweenData, axis, shape, zhNumber } from './d3.js';
import type { D3, Track } from './d3.js';

export const meta = {
  width: 1920, height: 1080, duration: 10, fps: 30, background: '#0f1115',
  shots: [{ end: 2, title: 'S01 Bars' }, { end: 4, title: 'S02 Line' }, { end: 6, title: 'S03 Donut' }, { end: 10, title: 'S04 Network and globe' }],
};
export const params = {
  accent: { name: 'Accent colour', type: 'color' as const, default: '#12b5a5' },
};
type Values = { accent: string };

const SALES = [42, 58, 51, 73, 66, 88, 97], MONTHS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月'];
const SHARE = [{ name: '訂閱', value: 46 }, { name: '授權', value: 31 }, { name: '服務', value: 23 }];
const INK = 'rgba(255,255,255,0.9)', MUTED = 'rgba(255,255,255,0.5)';
const PANELS = { bars: [80, 80, 860, 440], line: [980, 80, 860, 440], donut: [80, 560, 560, 440], network: [680, 560, 560, 440], globe: [1280, 560, 560, 440] } as const;

interface Prepared { d3: D3; series: [number, number][][]; links: [number, number][]; track: Track; fit: number; graticule: unknown; sphere: unknown }

export async function setup(ctx: SetupContext) {
  const d3 = await loadD3(ctx), rand = seeded(d3, ctx.seed);
  // Two line series to morph between, made once from seeded randomness.
  const walk = (base: number) => d3.range(24).map((i: number) => [i, base + 30 * Math.sin(i / 3.2) + 18 * rand.random()] as [number, number]);
  const series = [walk(60), walk(90)];
  // A small tree network settled by d3-force, recorded tick by tick.
  const nodes = d3.range(36).map((i: number) => ({ id: i }));
  const links = nodes.slice(1).map((n: { id: number }) => ({ source: n.id, target: Math.floor(rand.random() * n.id) }));
  const sim = d3.forceSimulation(nodes).randomSource(rand.source)
    .force('link', d3.forceLink(links).distance(34).strength(1))
    .force('charge', d3.forceManyBody().strength(-60))
    .force('x', d3.forceX(0).strength(0.06)).force('y', d3.forceY(0).strength(0.09));
  const track = simulate(sim, 240);
  // Scale the settled layout to fit its panel (440 × 300 units), measured once from the last recorded tick.
  const last = positionsAt(track, 1), [x0, x1] = d3.extent(last, (p: number[]) => p[0]), [y0, y1] = d3.extent(last, (p: number[]) => p[1]);
  const fit = Math.min(440 / (x1 - x0), 300 / (y1 - y0), 3);
  const pairs = links.map((l: { source: { index: number }; target: { index: number } }) => [l.source.index, l.target.index] as [number, number]);
  const prepared: Prepared = { d3, series, links: pairs, track, fit, graticule: d3.geoGraticule10(), sphere: { type: 'Sphere' } };
  ctx.assets.d3 = prepared;
}

function panel(ctx: FrameContext, box: readonly number[], title: string, k: number) {
  const [x, y, w, h] = box as [number, number, number, number];
  surface(ctx, roundRect(x, y + (1 - k) * 24, w, h, 22), `rgba(255,255,255,${0.045 * k})`, { elevation: 0 });
  text(ctx, title, x + 32, y + 30 + (1 - k) * 24, { size: 24, weight: 600, color: INK, alpha: k, baseline: 'top' });
}

export function renderFrame(ctx: FrameContext, time: number, input: Readonly<Record<string, unknown>>) {
  const { accent } = input as Values, t = time, s = ctx.assets.d3 as Prepared, d3 = s.d3;

  // S01 Bars: band scale, linear scale, canvas axis; bars rise one by one.
  {
    const k = at(t, 0, 0.6), [x, y, w, h] = PANELS.bars;
    panel(ctx, PANELS.bars, '每月營收（萬元）', k);
    const xs = d3.scaleBand(MONTHS, [x + 90, x + w - 40]).padding(0.28), ys = d3.scaleLinear([0, 100], [y + h - 60, y + 90]);
    axis(ctx, ys, { side: 'left', at: x + 80, ticks: 4, grid: w - 130, progress: at(t, 0.2, 1.2), noLine: true, label: { size: 16, color: MUTED } });
    axis(ctx, xs, { side: 'bottom', at: y + h - 60, progress: at(t, 0.3, 1.3), label: { size: 18, color: MUTED } });
    SALES.forEach((v, i) => {
      const grow = at(t, 0.5 + stagger(i, SALES.length, 0.12), 1.4 + stagger(i, SALES.length, 0.12), ease.outCubic);
      const top = ys(v * grow), bx = xs(MONTHS[i]);
      ctx.withCanvas(c => { c.fillStyle = i === SALES.length - 1 ? accent : 'rgba(255,255,255,0.22)'; c.fill(roundRect(bx, top, xs.bandwidth(), ys(0) - top, [8, 8, 0, 0])); });
      if (grow > 0.98) text(ctx, String(v), bx + xs.bandwidth() / 2, top - 10, { size: 18, weight: 600, color: INK, align: 'center', baseline: 'bottom', alpha: at(t, 1.4 + i * 0.05, 1.7 + i * 0.05) });
    });
  }

  // S02 Line: the first series draws itself, then the data changes to the second one.
  {
    const k = at(t, 2, 2.6), [x, y, w, h] = PANELS.line;
    panel(ctx, PANELS.line, '活躍用戶', k);
    const xs = d3.scaleLinear([0, 23], [x + 60, x + w - 50]), ys = d3.scaleLinear([0, 140], [y + h - 60, y + 90]);
    axis(ctx, ys, { side: 'left', at: x + 50, ticks: 4, grid: w - 100, noLine: true, progress: at(t, 2.1, 3), label: { size: 16, color: MUTED } });
    const data = tweenData(d3, s.series[0]!, s.series[1]!, at(t, 4.6, 5.6, ease.inOutCubic));
    const points = trimPoints(data.map(([i, v]) => [xs(i), ys(v)] as [number, number]), at(t, 2.4, 3.8, ease.inOutCubic));
    const line = d3.line().curve(d3.curveCatmullRom), area = d3.area().curve(d3.curveCatmullRom).y0(ys(0));
    if (points.length > 1) {
      const fill = ctx.draw.linearGradient(0, y + 90, 0, y + h - 60, [[0, accent + '55'], [1, accent + '00']]);
      shape(ctx, c => area.context(c)(points), { fill });
      shape(ctx, c => line.context(c)(points), { stroke: { color: accent, width: 4 } });
      const [ex, ey] = points[points.length - 1]!;
      ctx.withCanvas(c => { c.fillStyle = '#ffffff'; c.beginPath(); c.arc(ex, ey, 7, 0, Math.PI * 2); c.fill(); });
      const last = data[data.length - 1]![1] * 1000 * win(t, 3.6, 4, 99, 100);
      if (last > 0) text(ctx, zhNumber(last), ex - 14, ey - 18, { size: 22, weight: 600, color: INK, align: 'right', baseline: 'bottom' });
    }
  }

  // S03 Donut: d3.pie arcs swept open with a stagger, labels after.
  {
    const k = at(t, 4, 4.6), [x, y, w, h] = PANELS.donut;
    panel(ctx, PANELS.donut, '營收組成', k);
    const cx = x + w * 0.38, cy = y + h * 0.56, colors = [accent, 'rgba(255,255,255,0.45)', 'rgba(255,255,255,0.18)'];
    const arcs = sweepArcs(d3.pie().sort(null).value((d: { value: number }) => d.value)(SHARE), at(t, 4.3, 5.5, ease.inOutCubic), 0.25);
    const arc = d3.arc().innerRadius(88).outerRadius(140).cornerRadius(6).padAngle(0.02);
    arcs.forEach((a: object, i: number) => shape(ctx, c => { c.translate(cx, cy); arc.context(c)(a); }, { fill: colors[i] }));
    SHARE.forEach((d, i) => {
      const a = at(t, 5.3 + i * 0.12, 5.7 + i * 0.12), ly = y + 150 + i * 60;
      ctx.withCanvas(c => { c.globalAlpha = a; c.fillStyle = colors[i]!; c.fillRect(x + w - 190, ly - 8, 16, 16); });
      text(ctx, `${d.name} ${d.value}%`, x + w - 162, ly, { size: 20, color: INK, baseline: 'middle', alpha: a });
    });
  }

  // S04 Network: positions read from the recorded simulation, so any frame shows the same moment.
  {
    const k = at(t, 6, 6.6), [x, y, w, h] = PANELS.network;
    panel(ctx, PANELS.network, '合作網絡', k);
    const pos = positionsAt(s.track, at(t, 6.2, 9.2, ease.outCubic)).map(([px, py]) => [px * s.fit, py * s.fit] as [number, number]), cx = x + w / 2, cy = y + h / 2 + 24;
    const appear = at(t, 6.2, 7);
    ctx.withCanvas(c => {
      c.globalAlpha = appear; c.strokeStyle = 'rgba(255,255,255,0.25)'; c.lineWidth = 1.5; c.beginPath();
      for (const [a, b] of s.links) { c.moveTo(cx + pos[a]![0], cy + pos[a]![1]); c.lineTo(cx + pos[b]![0], cy + pos[b]![1]); }
      c.stroke();
      pos.forEach(([px, py], i) => { c.fillStyle = i === 0 ? accent : '#e8e8ea'; c.beginPath(); c.arc(cx + px, cy + py, i === 0 ? 10 : 5, 0, Math.PI * 2); c.fill(); });
    });
  }

  // S04 Globe: an orthographic projection turned by time; graticule and sphere need no data file.
  {
    const k = at(t, 6.4, 7), [x, y, w, h] = PANELS.globe;
    panel(ctx, PANELS.globe, '全球市場', k);
    const projection = d3.geoOrthographic().scale(150).translate([x + w / 2, y + h / 2 + 24]).rotate([t * 24, -18]);
    const path = (c: CanvasRenderingContext2D) => d3.geoPath(projection, c);
    shape(ctx, c => path(c)(s.sphere), { fill: 'rgba(255,255,255,0.04)', stroke: { color: 'rgba(255,255,255,0.35)', width: 1.5 }, alpha: k });
    shape(ctx, c => path(c)(s.graticule), { stroke: { color: accent, width: 1 }, alpha: k * 0.7 });
  }
}
