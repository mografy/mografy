import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { createProject, ensureAgentFiles } from '@mografy/server';
import { fillWorkspace, ignoreNodeModules, insideFolder, isWorkspace, runningProject, useProjectTools, workspaceProjectDir, writeProjectManifest, writeProjectSkill, writeWorkspace } from '../src/project-install.js';
import { VERSION } from '../src/commands/help.js';
import { EXTRAS } from '../src/extras.js';

test('init writes a private package.json with mografy and the scripts, keeping what the project already has', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'mografy-local-'));
  try {
    await writeProjectManifest(dir, 'My Film!', `mografy@${VERSION}`);
    const fresh = JSON.parse(await readFile(join(dir, 'package.json'), 'utf8'));
    assert.equal(fresh.name, 'my-film');
    assert.equal(fresh.private, true);
    assert.equal(fresh.devDependencies.mografy, VERSION);
    assert.equal(fresh.scripts.dev, 'mografy dev');
    await writeFile(join(dir, 'package.json'), JSON.stringify({ name: 'kept', scripts: { dev: 'custom' }, dependencies: { other: '1.0.0' } }));
    await writeProjectManifest(dir, 'ignored', `mografy@${VERSION}`);
    const merged = JSON.parse(await readFile(join(dir, 'package.json'), 'utf8'));
    assert.equal(merged.name, 'kept');
    assert.equal(merged.scripts.dev, 'custom', 'an existing script wins');
    assert.equal(merged.scripts.check, 'mografy check');
    assert.deepEqual(merged.dependencies, { other: '1.0.0' });
    assert.equal(merged.devDependencies.mografy, VERSION);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('init adds node_modules to .gitignore once', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'mografy-ignore-'));
  try {
    await writeFile(join(dir, '.gitignore'), '.mografy/\nrenders/');
    await ignoreNodeModules(dir);
    await ignoreNodeModules(dir);
    assert.equal(await readFile(join(dir, '.gitignore'), 'utf8'), '.mografy/\nrenders/\nnode_modules/\n');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('init writes the Skill for both hosts, and opening the project keeps it', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'mografy-skill-'));
  try {
    await createProject(join(dir, 'film'));
    await writeProjectSkill(join(dir, 'film'));
    await ensureAgentFiles(join(dir, 'film'));
    for (const host of ['.agents', '.claude']) {
      assert.match(await readFile(join(dir, 'film', host, 'skills', 'mografy', 'SKILL.md'), 'utf8'), /^---\nname: mografy/);
      await readFile(join(dir, 'film', host, 'skills', 'mografy', 'references', 'scene-authoring.md'), 'utf8');
    }
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test("a project's own copy keeps its tools in the project and ignores PATH's ffmpeg; explicit settings win", async () => {
  const dir = await mkdtemp(join(tmpdir(), 'mografy-tools-'));
  try {
    await writeFile(join(dir, 'mografy.json'), '{}');
    const root = join(dir, 'node_modules', 'mografy');
    assert.equal(runningProject(root, 'package'), dir);
    assert.equal(runningProject(root, 'source'), undefined);
    assert.equal(runningProject(join(dir, 'lib', 'mografy'), 'package'), undefined);
    const env: NodeJS.ProcessEnv = { MOGRAFY_TOOLS: '/custom' };
    assert.equal(useProjectTools(env, dir), true);
    assert.equal(env.MOGRAFY_TOOLS, '/custom');
    assert.equal(env.MOGRAFY_SYSTEM_FFMPEG, '0');
    assert.equal(env.PLAYWRIGHT_BROWSERS_PATH, join(dir, 'node_modules', '.cache', 'mografy', 'browsers'));
    const fresh: NodeJS.ProcessEnv = {};
    useProjectTools(fresh, dir);
    assert.equal(fresh.MOGRAFY_TOOLS, join(dir, 'node_modules', '.cache', 'mografy', 'tools'));
    assert.equal(useProjectTools({}, undefined), false);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('a workspace gets projects/, examples/ and templates/ with notes and a guide, and no project of its own', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'mografy-workspace-'));
  try {
    const ws = join(dir, 'mografy');
    await writeWorkspace(ws, 'mografy');
    assert.ok(isWorkspace(ws));
    assert.equal(JSON.parse(await readFile(join(ws, 'mografy.workspace.json'), 'utf8')).version, 1);
    for (const folder of ['projects', 'showcase', 'examples', 'templates']) assert.match(await readFile(join(ws, folder, 'README.md'), 'utf8'), new RegExp(`^# ${folder}`));
    assert.match(await readFile(join(ws, 'AGENTS.md'), 'utf8'), /^# Mografy workspace[\s\S]*npx mografy init projects\/<name>/);
    // Without the Skill, an agent still learns which extras came with Mografy and the command that adds one.
    const workspaceGuide = await readFile(join(ws, 'AGENTS.md'), 'utf8');
    assert.match(workspaceGuide, /npx mografy add <extra\.\.\.> projects\/<name>/);
    for (const name of Object.keys(EXTRAS)) assert.match(workspaceGuide, new RegExp(`^  ${name} +\\S`, 'm'), name);
    assert.match(workspaceGuide, /npx skills add mografy\/mografy[\s\S]*read_guide/);
    assert.equal(await readFile(join(ws, 'CLAUDE.md'), 'utf8'), '@AGENTS.md\n');
    await assert.rejects(readFile(join(ws, 'mografy.json')), 'the workspace is not a project');
    // No templates at first: the user installs the ones they pick (`npx mografy add <template> templates/`).
    assert.deepEqual(await readdir(join(ws, 'templates')), ['README.md']);
    // Again (an update): a custom AGENTS.md and the notes stay; projects are never touched.
    await writeFile(join(ws, 'AGENTS.md'), '# mine\n');
    await writeFile(join(ws, 'projects', 'README.md'), 'edited');
    await writeWorkspace(ws, 'mografy');
    assert.equal(await readFile(join(ws, 'AGENTS.md'), 'utf8'), '# mine\n');
    assert.equal(await readFile(join(ws, 'projects', 'README.md'), 'utf8'), 'edited');
    assert.equal(runningProject(join(ws, 'node_modules', 'mografy'), 'package'), ws);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('init <name> in a workspace root makes projects/<name>; deeper paths are kept', () => {
  const ws = join(tmpdir(), 'ws');
  assert.equal(workspaceProjectDir(ws, join(ws, 'film')), join(ws, 'projects', 'film'));
  assert.equal(workspaceProjectDir(ws, join(ws, 'projects', 'film')), join(ws, 'projects', 'film'));
  assert.equal(workspaceProjectDir(ws, join(ws, 'examples', 'mine')), join(ws, 'examples', 'mine'));
  assert.ok(insideFolder(ws, join(ws, 'projects', 'a')));
  assert.ok(insideFolder(ws, ws));
  assert.ok(!insideFolder(ws, join(tmpdir(), 'wsx')));
});

test('init fills a workspace from the package bundle: templates, reference films, deduplicated files, never overwriting', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'mografy-fill-'));
  try {
    const pkg = join(dir, 'pkg'), ws = join(dir, 'ws');
    const write = async (path: string, text: string) => { await mkdir(dirname(join(pkg, path)), { recursive: true }); await writeFile(join(pkg, path), text); };
    await write('examples/catalog.json', JSON.stringify({ examples: [{ name: 'stage-a', files: [] }, { name: 'stage-b', files: [] }] }));
    await write('bundle/blobs/font.otf', 'FONT');
    await write('bundle/blobs/a.json', '{"name":"a"}');
    await write('bundle/blobs/b.json', '{"name":"b"}');
    await write('bundle/blobs/hook.ts', 'export const hook = 1;');
    await write('bundle/blobs/catalog.json', JSON.stringify({ templates: [{ id: 'hook', name: 'Hook', agentHint: 'x' }] }));
    await write('bundle/files.json', JSON.stringify({ version: 1, files: {
      'examples/stage-a/mografy.json': 'blobs/a.json', 'examples/stage-a/assets/Inter.otf': 'blobs/font.otf',
      'examples/stage-b/mografy.json': 'blobs/b.json', 'examples/stage-b/assets/Inter.otf': 'blobs/font.otf',
      'templates/hook.ts': 'blobs/hook.ts', 'templates/catalog.json': 'blobs/catalog.json', 'templates/README.md': 'blobs/a.json',
    } }));
    await writeWorkspace(ws, 'ws');
    await mkdir(join(ws, 'examples', 'stage-b'));
    await writeFile(join(ws, 'examples', 'stage-b', 'mine.txt'), 'mine');
    assert.deepEqual(await fillWorkspace(ws, pkg), { templates: 1, examples: 1 });
    // One stored font becomes a file in each film that needs it; a film folder that exists is left alone.
    assert.equal(await readFile(join(ws, 'examples/stage-a/assets/Inter.otf'), 'utf8'), 'FONT');
    assert.deepEqual(await readdir(join(ws, 'examples/stage-b')), ['mine.txt']);
    assert.equal(await readFile(join(ws, 'templates/hook.ts'), 'utf8'), 'export const hook = 1;');
    assert.match(await readFile(join(ws, 'templates/README.md'), 'utf8'), /^# templates/);
    assert.deepEqual(JSON.parse(await readFile(join(ws, 'templates/installed.json'), 'utf8')).templates, [{ id: 'hook', name: 'Hook' }]);
    assert.deepEqual(await fillWorkspace(ws, pkg), { templates: 0, examples: 0 });
    // Without a bundle (a checkout) nothing is added.
    assert.deepEqual(await fillWorkspace(join(dir, 'other'), join(dir, 'none')), { templates: 0, examples: 0 });
  } finally { await rm(dir, { recursive: true, force: true }); }
});
