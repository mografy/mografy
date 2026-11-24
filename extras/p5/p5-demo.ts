// An eight-second tour of p5.ts: a noise flow field whose particle paths are integrated once in prepare and read
// back by time, noise ridgelines that roll forward, and a recursive tree that grows with the time, with Mografy
// type laid over the sketch.
import { at, ease, text } from '@mografy/runtime';
import type { FrameContext, SetupContext } from '@mografy/runtime';
import { prepareSketch, sketch } from './p5.js';
import type { P5, Sketch } from './p5.js';

export const meta = {
  width: 1920, height: 1080, duration: 8, fps: 30, background: '#0e0d12',
  shots: [{ end: 8, title: 'S01 Sketch' }],
};
export const params = {
  accent: { name: 'Accent colour', type: 'color' as const, default: '#ff8a3d' },
};
type Values = { accent: string };

const PARTICLES = 260, STEPS = 8 * 30 + 1;
interface Flow { paths: Float32Array }

export async function setup(ctx: SetupContext) {
  ctx.assets.sketch = await prepareSketch<Flow>(ctx, {
    fps: meta.fps,
    // State that would grow frame by frame in a p5 draw loop is integrated here, once, and stored per frame.
    prepare: p => {
      const paths = new Float32Array(PARTICLES * STEPS * 2);
      for (let i = 0; i < PARTICLES; i++) {
        let x = p.random(0, 1920), y = p.random(0, 1080);
        for (let k = 0; k < STEPS; k++) {
          paths[(i * STEPS + k) * 2] = x; paths[(i * STEPS + k) * 2 + 1] = y;
          const a = p.noise(x * 0.0022, y * 0.0022, k * 0.004) * p.TWO_PI * 2;
          x += Math.cos(a) * 2.4; y += Math.sin(a) * 2.4;
        }
      }
      return { paths };
    },
  });
}

function branch(p: P5, length: number, depth: number, grow: number, sway: number) {
  if (depth === 0 || length < 2) return;
  const k = Math.min(1, Math.max(0, grow * 7 - (7 - depth)));
  if (k <= 0) return;
  p.strokeWeight(depth * 1.1);
  p.line(0, 0, 0, -length * k);
  p.translate(0, -length * k);
  if (k < 1) return;
  for (const side of [-1, 1]) {
    p.push(); p.rotate(side * (0.42 + sway) + p.noise(depth, side) * 0.2 - 0.1);
    branch(p, length * 0.74, depth - 1, grow, sway); p.pop();
  }
}

function draw(p: P5, t: number, frame: number, data: Flow, accent: string) {
  // Stars: p.random() restarts from the seed on every call of sketch(), so they twinkle in place instead of jumping.
  p.noStroke();
  for (let i = 0; i < 90; i++) {
    const x = p.random(860, 1860), y = p.random(300, 520), twinkle = 0.5 + 0.5 * Math.sin(t * 2 + p.random(p.TWO_PI));
    p.fill(255, 255, 255, 40 + 120 * twinkle); p.circle(x, y, p.random(1.5, 3.5));
  }
  // Flow field: each particle's last 18 positions up to this frame, from the table made in prepare.
  const step = Math.min(STEPS - 1, frame), k = Math.floor(step);
  p.noFill();
  for (let i = 0; i < PARTICLES; i++) {
    p.stroke(i % 9 === 0 ? accent : 'rgba(255,255,255,0.35)'); p.strokeWeight(i % 9 === 0 ? 2.2 : 1.2);
    p.beginShape();
    for (let j = Math.max(0, k - 18); j <= k; j++) p.vertex(data.paths[(i * STEPS + j) * 2]!, data.paths[(i * STEPS + j) * 2 + 1]!);
    p.endShape();
  }
  // Ridgelines: noise sampled along x, the field moving with t.
  for (let r = 0; r < 14; r++) {
    const baseY = 560 + r * 30, ridge: [number, number][] = [];
    for (let x = 860; x <= 1860; x += 10) {
      const n = p.noise(x * 0.004, r * 0.3, t * 0.35), bell = Math.exp(-(((x - 1360) / 260) ** 2));
      ridge.push([x, baseY - n * 220 * bell]);
    }
    // Fill under the line to hide the lines behind it, then stroke only the ridge itself.
    p.noStroke(); p.fill('#0e0d12');
    p.beginShape(); p.vertex(860, 1080); for (const [x, y] of ridge) p.vertex(x, y); p.vertex(1860, 1080); p.endShape(p.CLOSE);
    p.noFill(); p.stroke(r === 6 ? accent : 'rgba(255,255,255,0.55)'); p.strokeWeight(1.6);
    p.beginShape(); for (const [x, y] of ridge) p.vertex(x, y); p.endShape();
  }
  // Recursive tree: grows with time; random() would restart from the seed each frame, so the shape stays put.
  p.push(); p.translate(1560, 520); p.stroke(255); p.strokeCap(p.ROUND);
  branch(p, 92, 8, at(t, 0.5, 5.5, ease.inOutCubic), 0.04 * Math.sin(t * 1.3));
  p.pop();
}

export function renderFrame(ctx: FrameContext, time: number, input: Readonly<Record<string, unknown>>) {
  const { accent } = input as Values, s = ctx.assets.sketch as Sketch<Flow>;
  sketch(ctx, s, (p, t, frame, data) => draw(p, t, frame, data, accent), time);
  const k = at(time, 0.4, 1.4);
  text(ctx, 'p5.js in Mografy', 96, 140, { size: 72, weight: 700, color: '#ffffff', alpha: k });
  text(ctx, 'Seeded, frame by frame, the same pixels every time.', 96, 210, { size: 30, color: 'rgba(255,255,255,0.7)', alpha: at(time, 0.8, 1.8) });
}
