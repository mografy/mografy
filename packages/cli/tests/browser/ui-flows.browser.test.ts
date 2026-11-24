// Key player flows in a real Chromium: open a project from the sidebar, read its shots and layers in the timeline,
// open the export dialog and change the format. Run with `pnpm test:browser` (each case owns its server and browser).
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { createProject } from '@mografy/server';
import { browserFixture } from '../helpers/browser-fixture.js';
import type { BrowserFixture } from '../helpers/browser-fixture.js';

// Three shots and two declared layers: the timeline shows the layers, the shots mark the ruler.
const SCENE = `import { timeline } from '@mografy/runtime';
import type { FrameContext } from '@mografy/runtime';
const tl = timeline([
  { id: 'S01-title', name: 'S01 Title', in: 0, out: 2, enter: 'fade', colour: '#e5484d' },
  { id: 'S02-card', name: 'S02 Card', in: 2, out: 4.5, enter: 'pop', colour: '#3e9b4f' },
]);
export const meta = {
  width: 640, height: 360, duration: 6, fps: 30, background: '#14161a',
  shots: [{ end: 2, title: 'S01 Open' }, { end: 4.5, title: 'S02 Card' }, { end: 6, title: 'S03 End' }],
  layers: tl.meta,
};
export const params = {};
export function renderFrame(ctx: FrameContext, time: number) {
  const c = ctx.canvas;
  c.fillStyle = '#14161a'; c.fillRect(0, 0, ctx.width, ctx.height);
  for (const { layer, look } of tl.visible(time)) {
    c.globalAlpha = look.opacity; c.fillStyle = layer.colour ?? '#ffffff';
    c.fillRect(layer.base === 'S01-title' ? 80 : 360, 120 + look.y, 200, 120);
  }
  c.globalAlpha = 1;
}
`;

let fixture: BrowserFixture | undefined;
beforeEach(async () => { fixture = undefined; fixture = await browserFixture(); });
afterEach(async () => { await fixture?.close(); });

async function openLayered(f: BrowserFixture) {
  const dir = join(process.env.MOGRAFY_HOME!, 'layered');
  await createProject(dir, 'Layered film', SCENE);
  const { page } = f;
  const before = (await f.stage()).version;
  // The sidebar lists library projects; clicking one switches the player to it.
  await page.reload();
  await page.getByRole('button', { name: /Layered film/ }).first().click();
  await page.waitForFunction(v => { const s = document.querySelector<HTMLElement>('[data-testid=stage]'); return s?.dataset.version && s.dataset.version !== v; }, before, { timeout: 30_000 });
  await page.frameLocator('iframe.stage-frame:visible >> nth=-1').locator('canvas.stage-canvas').waitFor();
  return dir;
}

test('open a project from the sidebar: the player switches to it', { timeout: 90_000 }, async () => {
  const f = fixture!;
  const dir = await openLayered(f);
  assert.equal((await f.api('snapshot')).data.projectDir, dir, 'the server opened the clicked project');
  await f.page.locator('.project', { hasText: 'Layered film' }).first().waitFor();
  assert.equal(await f.banner(), 0, 'no error banner');
  assert.equal((await f.stage()).t, 0, 'a project opens at 0 s');
});

test('timeline shows the scene\'s shots and declared layers', { timeout: 90_000 }, async () => {
  const f = fixture!, { page } = f;
  await openLayered(f);
  const names = page.locator('.tl-names li.layer');
  await names.first().waitFor();
  assert.deepEqual((await names.allInnerTexts()).map(s => s.trim().split('\n')[0]), ['S01 Title', 'S02 Card']);
  // Each layer has one bar on its track, placed by its in and out times.
  const bars = page.locator('.tl-row.layer .solid');
  assert.equal(await bars.count(), 2);
  const [a, b] = [await bars.nth(0).boundingBox(), await bars.nth(1).boundingBox()];
  assert.ok(a && b && a.x < b.x, 'S01 starts before S02');
  assert.ok(Math.abs((b!.width / a!.width) - 2.5 / 2) < 0.1, `bar widths follow durations (${a!.width} : ${b!.width})`);
  // The shots reach the player too: the snapshot carries all three, and the review sheet would show their stop frames.
  const meta = (await f.api('snapshot')).data.scene.meta;
  assert.deepEqual(meta.shots.map((s: { title: string }) => s.title), ['S01 Open', 'S02 Card', 'S03 End']);
  assert.match(await page.locator('.timeline').innerText(), /2 layers/);
});

test('export dialog opens and changes format', { timeout: 90_000 }, async () => {
  const f = fixture!, { page } = f;
  await openLayered(f);
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const modal = page.getByRole('dialog', { name: 'Export animation' });
  await modal.waitFor();
  const selected = () => modal.locator('.export-formats button.selected').innerText();
  assert.match(await selected(), /^MP4/, 'MP4 is the default format');
  for (const format of ['WebM', 'Lottie', 'SVGA', 'MP4']) {
    await modal.getByRole('button', { name: new RegExp('^' + format) }).click();
    assert.match(await selected(), new RegExp('^' + format));
  }
  await modal.getByRole('button', { name: /^Lottie/ }).click();
  const resolution = modal.getByRole('combobox', { name: 'Resolution', exact: true });
  assert.match(await resolution.innerText(), /× /, 'a Lottie size is offered');
  await page.keyboard.press('Escape');
  await modal.waitFor({ state: 'hidden' });
  assert.equal(await f.banner(), 0);
});
