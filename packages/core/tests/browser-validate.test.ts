// The browser entry's hand-written validators must accept and reject exactly what the zod schemas do, with the same output.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { exportSizeSchema, parameterDefinitionsSchema, sceneMetaSchema, resolveParams as resolveWithZod, sceneMetaForAspect as forAspectWithZod } from '../src/index.js';
import * as browser from '../src/browser.js';

const layers = {
  file: 'scenes/timeline.json',
  layers: [{ id: 'S01-title', base: 'S01-title', name: 'Title', in: 0, out: 2, enter: 'fade', exit: 'pop', hidden: false, locked: false, colour: '#ff0000', source: 'scenes/main.ts', subtitles: ['Hi'], edited: ['name', 'in'] }],
  edits: { layers: { 'S01-title': { name: '  Title  ', in: 0.5, hidden: true } }, added: [{ id: 'copy-1', base: 'S01-title' }], removed: ['x'], order: ['S01-title'], shots: [1, 2] },
  sequence: true,
};
const meta = { width: 1920, height: 1080, duration: 6, fps: 60, background: '#101010', shots: [{ end: 2, stop: 1.9, title: 'S01 Open' }, { end: 6 }], tempo: { bpm: 120 }, loop: false, layers };
const params = {
  speed: { name: 'Speed', type: 'number', default: 1, min: 0, max: 2, step: 0.1 },
  tint: { name: 'Tint', type: 'color', default: '#00ff00' },
  on: { name: 'On', type: 'boolean', default: true },
  caption: { name: 'Caption', type: 'string', default: 'Hello', role: 'subtitle' },
  mode: { name: 'Mode', type: 'enum', default: 'a', options: ['a', 'b'] },
};
const size = { width: 1280, height: 720, fit: 'cover' };

// Values that probe every kind of field: types, bounds, formats, nesting.
const POOL: unknown[] = [
  undefined, null, true, false, 0, -1, 0.5, 1, 2, 3, 4, 7, 32, 33, 60, 120, 240, 241, 1000, 1001, 3600, 3601, 7680, 7681, 1e300,
  Number.NaN, Number.POSITIVE_INFINITY, 2 ** 53, '', ' ', 'a', 'b', '#ff0000', '#FF00aa', '#fff', 'red', 'fade', 'wipe', 'slide', 'number', 'color',
  'enum', 'string', 'boolean', 'subtitle', 'contain', 'cover', 'reflow', 'stretch', 'scenes/t.json', '/abs.json', '../up.json', 'c:/x.json',
  'scenes\\t.json', 'x.txt', 'S01', 'bad id!', 'x'.repeat(121), 'x'.repeat(4097), [], [1], [2, 1], [1, 2], ['a'], ['name'], ['nope'], {}, { end: 1 },
  { bpm: 90 }, { bpm: 90, beatsPerBar: 0 }, { id: 'a', base: 'b' }, { name: 'X' }, { name: '   ' }, { unknown: 1 },
];
function rng(seed: number) { return () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 2 ** 32); }
function mutate(value: unknown, random: () => number, depth = 0): unknown {
  if (Array.isArray(value)) {
    const copy = value.map(v => (random() < 0.3 ? mutate(v, random, depth + 1) : v));
    if (random() < 0.1) copy.push(POOL[Math.floor(random() * POOL.length)]);
    if (random() < 0.1) copy.reverse();
    return copy;
  }
  if (value && typeof value === 'object') {
    const copy: Record<string, unknown> = { ...(value as Record<string, unknown>) }, keys = Object.keys(copy);
    const key = keys[Math.floor(random() * keys.length)];
    const roll = random();
    if (key === undefined || roll < 0.08) copy[random() < 0.5 ? 'extra' : 'bad key!'] = 1;
    else if (roll < 0.2) delete copy[key];
    else if (roll < 0.6 || depth > 3) copy[key] = POOL[Math.floor(random() * POOL.length)];
    else copy[key] = mutate(copy[key], random, depth + 1);
    return copy;
  }
  return POOL[Math.floor(random() * POOL.length)];
}
function outcome(parse: (v: unknown) => unknown, value: unknown) {
  try { return { ok: true as const, value: parse(value) }; } catch { return { ok: false as const }; }
}
function same(label: string, zod: (v: unknown) => unknown, plain: (v: unknown) => unknown, base: unknown, count: number) {
  const random = rng(label.length * 7919);
  let accepted = 0, rejected = 0;
  for (let i = 0; i < count; i++) {
    let value = base;
    for (let n = 1 + Math.floor(random() * 3); n > 0; n--) value = mutate(value, random);
    const a = outcome(zod, value), b = outcome(plain, value);
    assert.equal(b.ok, a.ok, `${label} #${i} ${a.ok ? 'accepted by zod only' : 'accepted by the browser only'}: ${JSON.stringify(value)}`);
    if (a.ok) { accepted++; assert.deepEqual(b.value, a.value, `${label} #${i} output: ${JSON.stringify(value)}`); } else rejected++;
  }
  // The fixtures must exercise both sides.
  assert.ok(accepted > count * 0.05 && rejected > count * 0.05, `${label}: ${accepted} accepted, ${rejected} rejected`);
}

test('browser validators accept the valid fixtures with the same output as zod', () => {
  assert.deepEqual(browser.parseSceneMeta(meta), sceneMetaSchema.parse(meta));
  assert.deepEqual(browser.parseSceneMeta({ width: 2, height: 2, duration: 1, fps: 1, background: '#000000' }), sceneMetaSchema.parse({ width: 2, height: 2, duration: 1, fps: 1, background: '#000000' }));
  assert.deepEqual(browser.parseParameterDefinitions(params), parameterDefinitionsSchema.parse(params));
  assert.deepEqual(browser.parseExportSize({ width: 2, height: 4 }), exportSizeSchema.parse({ width: 2, height: 4 }));
  assert.equal(browser.parseSceneMeta(meta).tempo?.beatsPerBar, 4);
  assert.equal(browser.parseSceneMeta(meta).layers?.edits.layers?.['S01-title']?.name, 'Title');
});
test('browser validators reject what zod rejects (named cases)', () => {
  const bad: [string, unknown][] = [
    ['unknown key', { ...meta, extra: 1 }], ['infinite duration', { ...meta, duration: Infinity }], ['fractional fps', { ...meta, fps: 29.97 }],
    ['short colour', { ...meta, background: '#fff' }], ['shots out of order', { ...meta, shots: [{ end: 2 }, { end: 1 }] }], ['empty shots', { ...meta, shots: [] }],
    ['bad tempo', { ...meta, tempo: { bpm: 0 } }], ['bad layer motion', { ...meta, layers: { ...layers, layers: [{ ...layers.layers[0], enter: 'slide' }] } }],
    ['absolute timeline file', { ...meta, layers: { ...layers, file: '/t.json' } }], ['timeline file not json', { ...meta, layers: { ...layers, file: 'scenes/t.txt' } }],
    ['blank edit name', { ...meta, layers: { ...layers, edits: { layers: { a: { name: '   ' } } } } }], ['bad edited key', { ...meta, layers: { ...layers, layers: [{ ...layers.layers[0], edited: ['nope'] }] } }],
    ['array', []], ['null', null],
  ];
  for (const [label, value] of bad) {
    assert.throws(() => sceneMetaSchema.parse(value), undefined, `zod ${label}`);
    assert.throws(() => browser.parseSceneMeta(value), /Invalid scene meta/, label);
  }
  for (const value of [{ ...params, speed: { ...params.speed, default: 3 } }, { ...params, mode: { ...params.mode, default: 'c' } }, { '1bad': params.on }, { x: { name: 'X', type: 'date', default: 1 } }]) {
    assert.throws(() => parameterDefinitionsSchema.parse(value));
    assert.throws(() => browser.parseParameterDefinitions(value), /Invalid scene params/);
  }
  assert.throws(() => browser.parseExportSize({ width: 1, height: 2 }), /Invalid export size at width/);
});
test('browser validators match zod on 6000 mutated inputs', () => {
  same('meta', v => sceneMetaSchema.parse(v), browser.parseSceneMeta, meta, 3000);
  same('params', v => parameterDefinitionsSchema.parse(v), browser.parseParameterDefinitions, params, 2000);
  same('size', v => exportSizeSchema.parse(v), browser.parseExportSize, size, 1000);
});
test('browser resolveParams and sceneMetaForAspect match the zod versions', () => {
  const parsed = sceneMetaSchema.parse(meta);
  for (const aspect of [undefined, '16:9', '9:16'] as const) assert.deepEqual(browser.sceneMetaForAspect(parsed, aspect), forAspectWithZod(parsed, aspect));
  for (const values of [{}, { speed: 2 }, { speed: 3 }, { nope: 1 }, { mode: 'b', on: false }, { tint: 'red' }] as const) {
    const a = outcome(() => resolveWithZod(params as never, values), 0), b = outcome(() => browser.resolveParams(params as never, values), 0);
    assert.deepEqual(b, a, JSON.stringify(values));
  }
});
