import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile, appendFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { addExtra, EXTRAS, guideLine } from '../src/extras.js';

const workspace = resolve(fileURLToPath(import.meta.url), '../../../..');

test('mografy add copies an extra, registers its fonts once and keeps changed files', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'mografy-add-'));
  try {
    await writeFile(join(dir, 'mografy.json'), JSON.stringify({ version: 1, name: 'x', scene: 'scenes/main.ts', fonts: [] }));
    const first = await addExtra(workspace, dir, 'cjk');
    assert.deepEqual(first.written, EXTRAS.cjk!.files.map(([, to]) => to));
    assert.equal(first.fonts.length, 2);
    assert.deepEqual(await readFile(join(dir, 'scenes/cjk.ts')), await readFile(join(workspace, 'extras/cjk/cjk.ts')));
    const again = await addExtra(workspace, dir, 'cjk');
    assert.equal(again.written.length, 0); assert.equal(again.fonts.length, 0);
    assert.equal(JSON.parse(await readFile(join(dir, 'mografy.json'), 'utf8')).fonts.length, 2);
    await appendFile(join(dir, 'scenes/cjk.ts'), '\n// mine\n');
    assert.deepEqual((await addExtra(workspace, dir, 'cjk')).kept, ['scenes/cjk.ts']);
    assert.match(await readFile(join(dir, 'scenes/cjk.ts'), 'utf8'), /\/\/ mine/);
    assert.deepEqual((await addExtra(workspace, dir, 'cjk', true)).written, ['scenes/cjk.ts']);
    await assert.rejects(addExtra(workspace, dir, 'nope'), /Unknown helper: nope[\s\S]*walkthrough/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('every extra lists files that exist in the checkout', async () => {
  for (const [name, extra] of Object.entries(EXTRAS))
    for (const [from] of extra.files) await readFile(join(workspace, 'extras', from)).catch(() => assert.fail(`${name}: missing extras/${from}`));
});

test('each helper module ships with its demo, so "copy the demo" works in a workspace too', () => {
  for (const name of ['cinema', 'cjk', 'three', 'd3', 'p5', 'walkthrough'])
    assert.ok(EXTRAS[name]!.files.some(([, to]) => to === `scenes/${name}-demo.ts`), name);
});

test('the guide line after add points at the Skill, or says how to install it', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'mografy-guide-'));
  try {
    const home = join(dir, 'home'), ws = join(dir, 'ws'), project = join(ws, 'projects', 'film');
    await mkdir(project, { recursive: true }); await mkdir(home);
    assert.match(guideLine('cjk-typography.md', [project, ws], home), /not installed here\. Install it with: npx skills add mografy\/mografy$/);
    await mkdir(join(ws, '.agents/skills/mografy'), { recursive: true });
    await writeFile(join(ws, '.agents/skills/mografy/SKILL.md'), '# Mografy');
    assert.match(guideLine('cjk-typography.md', [project, ws], home), /^Guide: .*\.agents\/skills\/mografy\/references\/cjk-typography\.md$/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
