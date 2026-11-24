// `npx mografy add <template> templates/` in a workspace: templates download into its templates/ (none are bundled),
// installed.json lists them for the player, and films named with a folder go inside it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readTemplates, isProject } from '@mografy/server';

const repo = join(import.meta.dirname, '..', '..', '..');
const quiet = async <T>(run: () => Promise<T>) => { const log = console.log; console.log = () => {}; try { return await run(); } finally { console.log = log; } };

test('templates install into the workspace templates/ and the player lists them', async () => {
  const requests: string[] = [];
  const server = createServer((request, response) => {
    const path = decodeURIComponent(new URL(request.url ?? '/', 'http://x').pathname).replace(/^\/main\//, '');
    requests.push(path);
    void readFile(join(repo, path)).then(data => { response.writeHead(200); response.end(data); }, () => { response.writeHead(404); response.end(); });
  });
  await new Promise<void>(done => server.listen(0, '127.0.0.1', done));
  const address = server.address() as { port: number };
  process.env.MOGRAFY_GITHUB_URL = `http://127.0.0.1:${address.port}/main`;
  const dir = await mkdtemp(join(tmpdir(), 'mografy-tpl-'));
  try {
    const { writeWorkspace } = await import('../src/project-install.js');
    const { planAdd, runAdd } = await import('../src/add.js');
    const ws = join(dir, 'mografy');
    await writeWorkspace(ws, 'mografy');
    assert.deepEqual(await readTemplates(join(ws, 'templates')), [], 'none installed at first');
    const noProject = async () => undefined;
    await quiet(async () => runAdd(await planAdd(['hook-impact', join(ws, 'templates')]), ws, noProject, false, isProject));
    await readFile(join(ws, 'templates', 'hook-impact.ts'));
    await readFile(join(ws, 'templates', 'kit.ts'));
    const listed = await readTemplates(join(ws, 'templates'));
    assert.deepEqual(listed.map(t => t.id), ['hook-impact']);
    assert.ok(listed[0]!.summary.length > 0);
    // Using it in a film reads the installed copy: no template file is downloaded again.
    const before = requests.filter(r => r.startsWith('templates/hook-impact')).length;
    const film = join(ws, 'projects', 'my-film');
    await quiet(async () => runAdd(await planAdd(['hook-impact', film]), ws, async name => name, false, isProject));
    assert.ok(await isProject(film));
    await readFile(join(film, 'scenes', 'templates', 'hook-impact.ts'));
    assert.equal(requests.filter(r => r.startsWith('templates/hook-impact')).length, before);
  } finally {
    delete process.env.MOGRAFY_GITHUB_URL;
    server.close();
    await rm(dir, { recursive: true, force: true });
  }
});

test('a film named with a folder goes inside it', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'mografy-into-'));
  try {
    const { planAdd } = await import('../src/add.js');
    await mkdir(join(dir, 'examples'));
    await writeFile(join(dir, 'examples', 'README.md'), '# examples\n');
    const plan = await planAdd(['film-starter', 'mografy-montage', join(dir, 'examples') + '/']);
    assert.deepEqual(plan.films, ['film-starter', 'mografy-montage'], 'several films may share a folder');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('the folder may come first: add templates/ <template...>', async () => {
  const { planAdd } = await import('../src/add.js');
  const plan = await planAdd(['templates/', 'hook-impact', 'cta-endcard']);
  assert.deepEqual(plan.templates, ['hook-impact', 'cta-endcard']);
  assert.equal(plan.target, 'templates/');
  const film = await planAdd(['examples/', 'film-starter']);
  assert.deepEqual(film.films, ['film-starter']);
  assert.equal(film.target, 'examples/');
});

test('a film started from templates titles its shots with storyboard IDs (S01, S02…)', async () => {
  const { sequenceScene } = await import('../src/templates.js');
  const source = sequenceScene([{ id: 'hook-impact', aspect: '9:16' }, { id: 'cta-endcard', aspect: '9:16' }] as never);
  assert.match(source, /title: `S\$\{String\(i \+ 1\)\.padStart\(2, '0'\)\} \$\{template\.template\.name\}`/);
  const title = (i: number, name: string) => `S${String(i + 1).padStart(2, '0')} ${name}`;
  assert.equal(title(0, 'Impact headline'), 'S01 Impact headline');
  assert.match(title(1, 'Call to action'), /^S(\d{2,3})(?![\w])/);
});
