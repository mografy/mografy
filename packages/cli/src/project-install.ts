// `npx mografy@latest init [folder]` without a global install: the project gets its own copy of the `mografy`
// package, so `npx mografy dev` inside it runs that copy (no download, works offline) and `npm run dev` does the same.
// Running `npx mografy@latest init` again in the project only moves that copy to the newer version; the scene,
// mografy.json and the user's files are never touched. The Skill is not written here: init tells the user to install
// it with `npx skills add mografy/mografy` in the folder. A source checkout has no package to install, so it skips this.
import { spawnSync } from 'node:child_process';
import { mkdir, readFile } from 'node:fs/promises';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { existsSync } from 'node:fs';
import { sharedSkillFiles } from '@mografy/core';
import { atomicWrite, installation, queueProjectWrite, WORKSPACE_FILE } from '@mografy/server';
import { VERSION } from './commands/help.js';
import { extrasList } from './extras.js';
import { bundleManifest, bundledFile, bundledFolder, copyBundledFolder } from './bundle.js';
import { INSTALLED_TEMPLATES } from './templates.js';
import type { TemplateEntry } from './templates.js';
import { newerVersion } from './package-update.js';

/** The scripts a project gets; existing scripts with the same name are kept. */
const SCRIPTS = { dev: 'mografy dev', check: 'mografy check', review: 'mografy review', export: 'mografy export' };

/** What `npm install` installs: this exact version, or `MOGRAFY_PACKAGE_SPEC` (a tarball path, for tests). */
export const packageSpec = () => process.env.MOGRAFY_PACKAGE_SPEC || `mografy@${VERSION}`;

/** Write or merge the project's package.json: private, with `mografy` as a dev dependency and the shortcuts. */
export function writeProjectManifest(dir: string, name: string, spec = packageSpec()) {
  return queueProjectWrite(dir, async () => {
    const file = join(dir, 'package.json');
    const current = await readFile(file, 'utf8').then(text => JSON.parse(text) as Record<string, unknown>, () => undefined);
    const manifest: Record<string, unknown> = current ?? { name: npmName(name), private: true };
    manifest.scripts = { ...SCRIPTS, ...(manifest.scripts as Record<string, string> | undefined) };
    // npm install rewrites the range; a tarball path stays as given.
    manifest.devDependencies = { ...(manifest.devDependencies as Record<string, string> | undefined), mografy: spec.startsWith('mografy@') ? VERSION : spec };
    await atomicWrite(file, JSON.stringify(manifest, null, 2) + '\n');
  });
}

/** Keep node_modules out of Git next to the template's entries. */
export function ignoreNodeModules(dir: string) {
  return queueProjectWrite(dir, async () => {
    const file = join(dir, '.gitignore');
    const text = await readFile(file, 'utf8').catch(() => '');
    if (text.split(/\r?\n/).some(line => /^\/?node_modules\/?$/.test(line.trim()))) return;
    await atomicWrite(file, `${text}${text && !text.endsWith('\n') ? '\n' : ''}node_modules/\n`);
  });
}

/** Write this version's Skill into the project for both hosts; links in it point to GitHub. */
export function writeProjectSkill(dir: string) {
  return queueProjectWrite(dir, async () => {
    for (const host of ['.agents', '.claude']) {
      for (const [file, contents] of Object.entries(sharedSkillFiles().mografy as Record<string, string>)) {
        const path = join(dir, host, 'skills', 'mografy', file);
        if (await readFile(path, 'utf8').catch(() => undefined) !== contents) await atomicWrite(path, contents);
      }
    }
  });
}

const npmName = (name: string) => name.toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^[._-]+|-+$/g, '') || 'mografy-project';

/**
 * Give the project its own copy of Mografy. Returns false (with the reason printed) when npm fails, so `init`
 * still leaves a usable project that `npx mografy@latest dev` can open.
 */
export async function installIntoProject(dir: string, name: string, log = (line: string) => console.log(line)) {
  if (installation.kind !== 'package') return false;
  const spec = packageSpec();
  await writeProjectManifest(dir, name, spec);
  await ignoreNodeModules(dir);
  log(`Installing ${spec.startsWith('mografy@') ? spec : 'mografy'} into this folder (not global)…`);
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const result = spawnSync(npm, ['install', '--save-dev', '--no-audit', '--no-fund', spec], { cwd: dir, stdio: 'inherit', shell: process.platform === 'win32' });
  if (result.status === 0) return true;
  log(`npm install did not finish${result.error ? ` (${result.error.message})` : ''}. The project is ready; run \`npm install\` in it later, or open it with \`npx mografy@latest dev\`.`);
  return false;
}

/**
 * `npx mografy@latest` (a bare `dev`) inside a project that has its own copy: when that copy is older than the
 * running version, install this version into the project and say so. Nothing happens from a source checkout, from
 * the project's own copy, or in a project without one.
 */
export async function updateProjectCopy(dir: string, log = (line: string) => console.log(line)) {
  if (installation.kind !== 'package') return false;
  const local = join(dir, 'node_modules', 'mografy');
  if (resolve(installation.root) === resolve(local)) return false;
  const installed = await readFile(join(local, 'package.json'), 'utf8').then(text => (JSON.parse(text) as { version?: string }).version, () => undefined);
  if (!installed || !newerVersion(VERSION, installed)) return false;
  log(`This project has Mografy ${installed}; updating it to ${VERSION}.`);
  const name = await folderLabel(dir);
  if (isWorkspace(dir)) await writeWorkspace(dir, name);
  return installIntoProject(dir, name, log);
}

/** The workspace or project whose own copy of Mografy is running (`<folder>/node_modules/mografy`), if it is one. */
export function runningProject(root = installation.root, kind = installation.kind) {
  if (kind !== 'package' || basename(dirname(root)) !== 'node_modules') return undefined;
  const project = dirname(dirname(root));
  return existsSync(join(project, WORKSPACE_FILE)) || existsSync(join(project, 'mografy.json')) ? project : undefined;
}

/**
 * A project's own copy keeps its tools in the project too, untouched by PATH: FFmpeg downloads into
 * node_modules/.cache/mografy/tools (kept across updates, removed with the folder) and PATH's ffmpeg is not used;
 * a Chromium shell, needed only when there is no Chrome or Edge, goes next to it. Explicit settings still win.
 */
export function useProjectTools(env: NodeJS.ProcessEnv = process.env, project = runningProject()) {
  if (!project) return false;
  const cache = join(project, 'node_modules', '.cache', 'mografy');
  env.MOGRAFY_TOOLS ??= join(cache, 'tools');
  env.MOGRAFY_SYSTEM_FFMPEG ??= '0';
  env.PLAYWRIGHT_BROWSERS_PATH ??= join(cache, 'browsers');
  return true;
}

// ---------------------------------------------------------------- workspace

/** The folders every workspace has, with the note each one carries (an empty folder would not show what it is for). */
export const WORKSPACE_FOLDERS: Record<string, string> = {
  projects: `# projects

Your films, one folder each (a folder with a mografy.json). Ask Claude or Codex in the workspace for a new animation and
it is created here, or run \`npx mografy init projects/<name>\`. The built-in components are in projects/.components.

Open the player: \`npx mografy dev\` (or \`npx mografy dev projects/<name>\`). Export: \`npx mografy export projects/<name>\`;
the video is saved in projects/<name>/renders/.
`,
  examples: `# examples

Reference films to watch, study and build on. They come with Mografy: init puts every one here, offline.
\`npx mografy add <film> projects/<name>\` makes one a project of your own; \`npx mografy add examples/ <film>\` brings one
back if you deleted it. The player lists them as examples. Do not edit them here.
`,
  showcase: `# showcase

Films from the website's showcase (https://www.mografy.app/showcase), downloaded with \`npx mografy add showcase/ <film>\`.
Watch them in the player, read their scenes and build on them. None are downloaded at first.
`,
  templates: `# templates

Mografy Templates you installed: finished scene modules (hooks, captions, product screens, end cards) with their fonts.
They come with Mografy: init installs every one here, offline (browse them on https://www.mografy.app/docs/templates).
\`npx mografy add <template...> projects/<name>\` copies templates into a project, where they are yours to change.
Do not edit them here.
`,
};

const WORKSPACE_GUIDE = `# Mografy workspace

This folder is a Mografy workspace, set up by \`npx mografy@latest init\`. Mografy and its extras are installed here
(node_modules/mografy), not globally. The Mografy Skill is installed separately: \`npx skills add mografy/mografy\` in this
folder (.agents/skills/mografy, .claude/skills/mografy). Every command below runs from this folder or any folder inside
it, and defaults to it.

- projects/   the user's films, one project each (mografy.json + scenes/). Create a new film with
              \`npx mografy init projects/<name>\`, never in the workspace root.
- examples/   reference films, all installed by init (offline). Read them, do not edit them in place;
              \`npx mografy add <film> projects/<name>\` copies one into a film of your own.
- showcase/   films from the website's showcase: \`npx mografy add showcase/ <film>\` downloads one (none at first).
- templates/  Mografy Templates, all installed by init (offline). \`npx mografy add <template...> projects/<name>\`
              copies templates into a film. Do not edit them here.
- projects/.components  the built-in components (hidden). Mografy's own folders inside projects/ start with a dot.

Extras came with Mografy (node_modules/mografy/extras) and are copied into one film only when it needs them, offline:
\`npx mografy add <extra...> projects/<name>\`. A scene can import an extra (\`./cinema.js\`) only after that.
${extrasList()}
\`npx mografy add\` and \`npx mografy --help\` list them too. Each extra's guide is in the Mografy Skill's references/.

Open the player: \`npx mografy dev\`. Check, review and export a project: \`npx mografy check|review|export projects/<name>\`.
MCP: \`npx -y mografy mcp\` started in this folder works with this workspace. Update: \`npx mografy@latest init\` here.
Before writing a scene, use the Mografy Skill. If it is missing, ask the user to run \`npx skills add mografy/mografy\` here,
or read it with the MCP read_guide tool.
`;

/**
 * Fill a workspace from the npm package's bundle: every template into templates/ and every reference film into
 * examples/<film>, so it works offline from the start (showcase films still download on `add`). Only
 * what is missing is added: a film folder that exists is never touched, nor is an installed template's file.
 * Does nothing without a bundle (a checkout). Returns what was added.
 */
export async function fillWorkspace(dir: string, root = installation.root) {
  const added = { templates: 0, examples: 0 };
  if (!await bundleManifest(root)) return added;
  // Templates: the bundled templates/ files the workspace lacks (its own README.md stays), and every template listed
  // in installed.json, which is what the player and `add` read.
  const catalog = await bundledFile('templates/catalog.json', root);
  if (catalog) {
    for (const file of await bundledFolder('templates', root)) {
      const target = join(dir, 'templates', ...file.split('/'));
      if (file === 'README.md' || existsSync(target)) continue;
      await mkdir(dirname(target), { recursive: true });
      await atomicWrite(target, (await bundledFile(`templates/${file}`, root))!);
    }
    const index = join(dir, ...INSTALLED_TEMPLATES.split('/'));
    const installed = await readFile(index, 'utf8').then(text => (JSON.parse(text) as { templates?: { id: string }[] }).templates ?? [], () => []);
    const known = new Set(installed.map(t => t.id));
    const fresh = ((JSON.parse(catalog.toString('utf8')) as { templates?: TemplateEntry[] }).templates ?? [])
      .filter(t => !known.has(t.id)).map(({ agentHint: _, ...entry }) => entry);
    if (fresh.length) await atomicWrite(index, JSON.stringify({ version: 1, templates: [...installed, ...fresh] }, null, 2) + '\n');
    added.templates = fresh.length;
  }
  const films = await readFile(join(root, 'examples', 'catalog.json'), 'utf8')
    .then(text => ((JSON.parse(text) as { examples?: { name: string }[] }).examples ?? []).map(film => film.name), () => []);
  for (const name of films) {
    const dest = join(dir, 'examples', name);
    if (existsSync(dest) || !(await bundledFolder(`examples/${name}`, root)).length) continue;
    await copyBundledFolder(`examples/${name}`, dest, root);
    added.examples++;
  }
  return added;
}

export const isWorkspace = (dir: string) => existsSync(join(dir, WORKSPACE_FILE));

/** `<target>` is `workspace` itself or inside it. */
export function insideFolder(workspace: string, target: string) {
  const rel = relative(resolve(workspace), resolve(target));
  return rel === '' || (rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel));
}

/**
 * Where `init <name>` creates a project inside a workspace: a folder named directly in the workspace root
 * (`init my-film` typed there) goes into projects/, so a project never sits beside node_modules; any deeper path is
 * used as given.
 */
export function workspaceProjectDir(workspace: string, target: string) {
  const ws = resolve(workspace), dir = resolve(target);
  return dirname(dir) === ws && !(basename(dir) in WORKSPACE_FOLDERS) ? join(ws, 'projects', basename(dir)) : dir;
}

async function folderLabel(dir: string) {
  for (const file of [WORKSPACE_FILE, 'mografy.json']) {
    const name = await readFile(join(dir, file), 'utf8').then(text => (JSON.parse(text) as { name?: string }).name, () => undefined);
    if (name) return name;
  }
  return basename(resolve(dir)) || 'mografy-project';
}

/**
 * Make `dir` a workspace, or bring one up to this version: the marker, projects/, examples/ and templates/ with their
 * notes and the guide for agents. Templates are not installed: the user adds the ones they pick. Never creates a project and never touches projects/ or
 * examples/ contents.
 */
export function writeWorkspace(dir: string, name = basename(resolve(dir))) {
  return queueProjectWrite(dir, async () => {
    await mkdir(dir, { recursive: true });
    const marker = join(dir, WORKSPACE_FILE);
    const current = await readFile(marker, 'utf8').then(text => JSON.parse(text) as Record<string, unknown>, () => undefined);
    if (!current) await atomicWrite(marker, JSON.stringify({ version: 1, name }, null, 2) + '\n');
    for (const [folder, note] of Object.entries(WORKSPACE_FOLDERS)) {
      await mkdir(join(dir, folder), { recursive: true });
      // Our own note (it starts with the folder's heading) follows the version; a README the user wrote stays.
      const readme = join(dir, folder, 'README.md'), text = await readFile(readme, 'utf8').catch(() => undefined);
      if (text === undefined || (text.startsWith(`# ${folder}\n`) && text !== note)) await atomicWrite(readme, note);
    }
    const agents = join(dir, 'AGENTS.md');
    const guide = await readFile(agents, 'utf8').catch(() => undefined);
    if (guide === undefined || guide.startsWith('# Mografy workspace')) await atomicWrite(agents, WORKSPACE_GUIDE);
    if (!existsSync(join(dir, 'CLAUDE.md'))) await atomicWrite(join(dir, 'CLAUDE.md'), '@AGENTS.md\n');
    const ignore = join(dir, '.gitignore');
    const text = await readFile(ignore, 'utf8').catch(() => '');
    const missing = ['.mografy/', 'renders/'].filter(entry => !text.split(/\r?\n/).some(line => line.trim() === entry));
    if (missing.length) await atomicWrite(ignore, `${text}${text && !text.endsWith('\n') ? '\n' : ''}${missing.join('\n')}\n`);
  });
}
