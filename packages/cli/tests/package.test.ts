import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { newerVersion, packageUpdate } from '../src/package-update.js';

const workspace = resolve(fileURLToPath(import.meta.url), '../../../..');

test('versions compare numerically, and a release is newer than its betas', () => {
  assert.ok(newerVersion('0.2.0', '0.1.9'));
  assert.ok(newerVersion('0.10.0', '0.9.0'));
  assert.ok(newerVersion('0.2.0', '0.2.0-beta.3'));
  assert.ok(newerVersion('0.2.0-beta.10', '0.2.0-beta.9'));
  assert.ok(!newerVersion('0.2.0-beta.1', '0.2.0'));
  assert.ok(!newerVersion('0.2.0', '0.2.0'));
});

test('mografy update in the package checks the registry and prints the npm command', async () => {
  const lines: string[] = [];
  const registry = (async () => new Response(JSON.stringify({ version: '9.0.0' }))) as typeof fetch;
  await packageUpdate(false, registry, line => lines.push(line));
  assert.match(lines.join('\n'), /Mografy 9\.0\.0 is available[\s\S]*npm install -g mografy@latest/);
  const none = (async () => new Response('{}', { status: 404 })) as typeof fetch;
  await assert.rejects(packageUpdate(true, none, () => {}), /no latest release is published/);
});

test('the npm package holds only what runs: no sources, sourcemaps or dev tools, and stays small', async () => {
  const out = await mkdtemp(join(tmpdir(), 'mografy-pack-'));
  try {
    const report = execFileSync(process.execPath, [join(workspace, 'apps/cli/pack.mjs'), '--out', out, '--version', '0.0.0-test'], { cwd: workspace, encoding: 'utf8' });
    assert.match(report, /MB packed/);
    const files = execFileSync('tar', ['tzf', join(out, 'mografy-0.0.0-test.tgz')], { encoding: 'utf8' }).split('\n').filter(Boolean).map(f => f.replace(/^package\//, ''));
    for (const required of ['bin/mografy.js', 'package.json', 'examples/catalog.json',
      'lib/node_modules/@mografy/cli/dist/index.js', 'lib/node_modules/@mografy/cli/bin/locate.mjs', 'lib/node_modules/@mografy/server/template/mografy.json',
      'lib/node_modules/@mografy/render/dist/host-page.js', 'lib/node_modules/@mografy/runtime/dist/scene.js', 'lib/node_modules/@mografy/web/dist/index.html'])
      assert.ok(files.includes(required), `missing ${required}`);
    assert.deepEqual(files.filter(f => /\.map$|\.tsbuildinfo$|\/src\/|\/tests?\//.test(f)), []);
    // Templates and reference films ship only in bundle/ (never where the player lists films), and no Skill.
    assert.deepEqual(files.filter(f => /^(templates|showcase|showreel|docs|\.agents|\.claude)\//.test(f) || /^examples\/.+\//.test(f)), [], 'films and templates only in bundle/, no Skill');
    const bundle = JSON.parse(execFileSync('tar', ['xzOf', join(out, 'mografy-0.0.0-test.tgz'), 'package/bundle/files.json'], { encoding: 'utf8', maxBuffer: 1 << 26 })) as { files: Record<string, string> };
    const catalog = JSON.parse(await readFile(join(workspace, 'examples/catalog.json'), 'utf8')) as { examples: { name: string; files: string[] }[] };
    for (const film of catalog.examples) for (const file of film.files)
      assert.ok(bundle.files[`examples/${film.name}/${file}`], `reference film file in the bundle: ${film.name}/${file}`);
    assert.ok(bundle.files['templates/catalog.json'] && bundle.files['templates/kit.ts'], 'templates in the bundle');
    assert.ok(Object.keys(bundle.files).every(path => /^(templates|examples)\//.test(path)), 'no showcase films in the bundle');
    for (const stored of new Set(Object.values(bundle.files))) assert.ok(files.includes(`bundle/${stored}`), `stored file shipped: ${stored}`);
    // Identical files are stored once: the ten stage films share one copy of each Inter font.
    const inter = Object.entries(bundle.files).filter(([path]) => /^examples\/stage-[^/]+\/assets\/Inter-Regular\.otf$/.test(path));
    assert.equal(inter.length, 10); assert.equal(new Set(inter.map(([, stored]) => stored)).size, 1);
    for (const extra of ['extras/cinema/cinema.ts', 'extras/cjk/cjk.ts', 'extras/cjk/fonts/NotoSansCJKtc-Medium-subset.otf', 'extras/three/three.module.js', 'extras/music/score.py', 'extras/walkthrough/walkthrough.ts', 'extras/stage/stage.ts'])
      assert.ok(files.includes(extra), `extras ship in the package: missing ${extra}`);
    const manifest = JSON.parse(execFileSync('tar', ['xzOf', join(out, 'mografy-0.0.0-test.tgz'), 'package/package.json'], { encoding: 'utf8' }));
    assert.deepEqual(Object.keys(manifest.dependencies).sort(), ['esbuild', 'protobufjs', 'ws', 'zod']);
    assert.equal(manifest.bundleDependencies, undefined);
    assert.equal(manifest.scripts, undefined, 'no install scripts');
  } finally { await rm(out, { recursive: true, force: true }); }
});
