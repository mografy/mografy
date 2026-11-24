import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sceneMetaSchema, shotIssues, shotLabelIssues, shotStops, validateSceneProject } from '../src/index.js';

const project = { version: 1, name: 'Film', scene: 'scenes/main.ts' };
const meta = { width: 1920, height: 1080, duration: 10, fps: 10, background: '#000000' };

test('settings of the former Present mode are kept when present and never read', () => {
  assert.equal(validateSceneProject(project).slides, undefined);
  const old = { hold: 'freeze', music: 'duck', pages: [{ title: 'Two' }] };
  assert.deepEqual(validateSceneProject({ ...project, slides: old }).slides, old);
});

test('shots are optional scene metadata and run forward in time', () => {
  assert.equal(sceneMetaSchema.parse(meta).shots, undefined);
  assert.equal(sceneMetaSchema.parse({ ...meta, shots: [{ end: 4, title: 'One' }, { end: 10 }] }).shots!.length, 2);
  assert.throws(() => sceneMetaSchema.parse({ ...meta, shots: [{ end: 4 }, { end: 4 }] }), /increasing time order/);
  assert.throws(() => sceneMetaSchema.parse({ ...meta, shots: [] }));
});

test('a scene without shots has no stops', () => {
  assert.deepEqual(shotStops(meta), []);
});

test('each shot stops at its own stop, else one frame before it ends; the last reachable shot stops at the end', () => {
  const shots = { ...meta, shots: [{ end: 2, title: 'Open' }, { end: 2.05 }, { end: 6, stop: 5.5 }, { end: 9 }, { end: 10 }, { end: 99 }] };
  const r = (t: number) => Number(t.toFixed(2));
  assert.deepEqual(shotStops(shots).map(s => [s.shot, r(s.start), r(s.at), s.title]),
    [[0, 0, 1.9, 'Open'], [1, 1.9, 1.95, 'Shot 2'], [2, 1.95, 5.5, 'Shot 3'], [3, 5.5, 8.9, 'Shot 4'], [4, 8.9, 10, 'Shot 5']]);
  assert.deepEqual(shotIssues(shots), ['Shot 6 ends at 99s, after the scene ends (10s).']);
  assert.deepEqual(shotIssues({ duration: 10, shots: [{ end: 4 }, { end: 8, stop: 3 }] }), ['Shot 2 stops at 3s, outside the shot.']);
  assert.deepEqual(shotIssues(meta), []);
});

test('check warns when shots lose their storyboard IDs or layers their tag colour', () => {
  const layer = (id: string, colour?: string) => ({ id, base: id, name: id, in: 0, out: 1, enter: 'none' as const, exit: 'none' as const, hidden: false, locked: false, subtitles: [], edited: [], ...(colour ? { colour } : {}) });
  const layers = (...list: ReturnType<typeof layer>[]) => ({ file: 'scenes/timeline.json', layers: list, edits: {} });
  assert.deepEqual(shotLabelIssues({ shots: [{ end: 2, title: 'S01 Open' }, { end: 4, title: 'S02 Screen' }], layers: layers(layer('s01-title', '#5fa37a'), layer('film-bg', '#8a8f98')) }), []);
  assert.match(shotLabelIssues({})[0]!, /No meta\.shots/);
  assert.match(shotLabelIssues({ shots: [{ end: 2, title: 'Open' }, { end: 4, title: 'S02' }, { end: 6 }] })[0]!, /^Shots 1, 3 have no storyboard ID/);
  assert.match(shotLabelIssues({ shots: [{ end: 2, title: 'S01 A' }, { end: 4, title: 'S01 B' }] })[0]!, /^Shot IDs run S01, S01/);
  assert.match(shotLabelIssues({ shots: [{ end: 2, title: 'S01' }], layers: layers(layer('s01-title'), layer('film-bg')) })[0]!, /^2 layers without a tag colour \(s01-title, film-bg\)/);
  assert.match(shotLabelIssues({ shots: [{ end: 2, title: 'S1 Open' }] })[0]!, /no storyboard ID/);
});
