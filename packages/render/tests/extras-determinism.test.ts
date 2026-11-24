// The extras that wrap an outside library (d3, p5) must draw the same pixels for the same time however the frames
// are visited: in order, backwards, jumping around, and on a fresh page. That is what motion blur samples, scrubbing,
// page recycling and parallel export segments rely on. Each demo is copied into a project exactly as `mografy add`
// lays it out (EXTRAS file map), then rendered at quarter scale.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { EXTRAS, validateSceneProject } from '@mografy/core';
import { buildScene, SceneHost } from '../src/index.js';

const root = resolve(fileURLToPath(import.meta.url), '../../../..');
const template = join(root, 'packages/server/template');
let base: string;
before(async () => { base = await mkdtemp(join(tmpdir(), 'mografy-extras-')); });
after(async () => { await rm(base, { recursive: true, force: true }); });

async function projectWith(name: string) {
  const dir = join(base, name);
  await cp(template, dir, { recursive: true });
  for (const [from, to] of EXTRAS[name]!.files) {
    await mkdir(dirname(join(dir, to)), { recursive: true });
    await cp(join(root, 'extras', from), join(dir, to));
  }
  const file = join(dir, 'mografy.json'), json = JSON.parse(await readFile(file, 'utf8'));
  json.scene = `scenes/${name}-demo.ts`;
  await writeFile(file, JSON.stringify(json));
  return { dir, project: validateSceneProject(json) };
}

for (const name of ['d3', 'p5']) {
  test(`${name} demo: same pixels for the same time in any order and on a fresh page`, { timeout: 180_000 }, async () => {
    const { dir, project } = await projectWith(name);
    const host = await SceneHost.start(dir);
    try {
      const build = await buildScene(dir, project);
      const scene = await host.inspect(build, project);
      const d = scene.meta.duration, times = [0, 0.37, d * 0.25, d * 0.5 + 1 / 120, d * 0.75, d - 0.01];
      const visit = async (order: number[]) => {
        const page = await host.open(build, project, { renderScale: 0.25 });
        try {
          const hashes = new Map<number, string>();
          for (const t of order) hashes.set(t, await page.rawHash(t));
          return times.map(t => hashes.get(t));
        } finally { await page.close(); }
      };
      const forward = await visit(times);
      assert.equal(new Set(forward).size, times.length, 'every sampled moment should look different');
      assert.deepEqual(await visit([...times].reverse()), forward, 'backwards');
      assert.deepEqual(await visit([times[3]!, times[0]!, times[5]!, times[1]!, times[4]!, times[2]!]), forward, 'jumping');
      assert.deepEqual(await visit(times), forward, 'fresh page');
    } finally { await host.close(); }
  });
}
