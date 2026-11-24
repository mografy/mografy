// Read-only discovery and explicit library-level operations.
import { projectPaths } from '@mografy/render/fs-util';
import { mkdir, readdir, readFile, realpath, stat } from 'node:fs/promises';
import { basename, join, resolve, sep } from 'node:path';
import { validateSceneProject } from '@mografy/core';
import type { AspectRatio, ProjectList, ProjectSummary, TemplateSummary, WorkspaceFolders } from '@mografy/core';
import { exampleDirs, libraryDir, workspaceDir } from './installation.js';
import { lastProject, readRecent } from './workspace-state.js';
import { COMPONENT_PRESETS, componentRoot, ensureComponentsProject } from './components.js';
import { createProject, exists, folderName, isProject } from './project-scaffold.js';
import { queueProjectWrite } from './files.js';

export * from './installation.js';
export * from './workspace-state.js';
export * from './components.js';
export * from './project-scaffold.js';

/** Current project, last opened project, or the bundled component showcase on first launch. */
export async function defaultProject(cwd = process.cwd()) {
  if (await isProject(cwd)) return cwd;
  const last = await lastProject();
  // Upgrade the former six-in-one showcase without overwriting its scene or user edits.
  return last && resolve(last) !== componentRoot() ? last : await ensureComponentsProject();
}

/**
 * What `mografy dev` opens from a folder that is not a project: the last project when it is in the library
 * (~/Mografy, or projects/ in a checkout), else the built-in components. Never a project from another repository.
 */
export async function libraryProject() {
  const last = await lastProject();
  if (last && resolve(last).startsWith(resolve(libraryDir()) + sep) && resolve(last) !== componentRoot()) return last;
  return ensureComponentsProject();
}

/** Create a project named `name` in the library folder, picking a free folder name. */
export async function createInLibrary(name: string, aspectRatio?: AspectRatio) {
  const base = folderName(name);
  const root = libraryDir();
  await mkdir(root, { recursive: true });
  return queueProjectWrite(root, async () => {
    let dir = join(root, base);
    for (let i = 2; await exists(dir); i++) dir = join(root, `${base}-${i}`);
    return createProject(dir, name, undefined, aspectRatio);
  });
}

async function summarize(dir: string, kind: ProjectSummary['kind']): Promise<ProjectSummary | undefined> {
  try {
    const file = join(dir, 'mografy.json');
    const [raw, info] = await Promise.all([readFile(file, 'utf8'), stat(file)]);
    let name = basename(dir), valid = true;
    try { name = validateSceneProject(JSON.parse(raw)).name; } catch { valid = false; }
    const thumb = await stat(projectPaths(dir).thumb).then(s => s.mtimeMs, () => null);
    return { dir: await realpath(dir), name, kind, valid, updatedAt: new Date(info.mtimeMs).toISOString(), thumb };
  } catch { return undefined; }
}
async function subfolders(root: string) {
  const entries = await readdir(root, { withFileTypes: true }).catch(() => []);
  return entries.filter(e => e.isDirectory() && !e.name.startsWith('.')).map(e => join(root, e.name));
}
/** Recent projects first, then the library folder, then examples; each project listed once. */
export async function listProjects(current?: string): Promise<ProjectList> {
  const seen = new Set<string>(), projects: ProjectSummary[] = [];
  const add = async (dir: string, kind: ProjectSummary['kind']) => {
    const real = await realpath(dir).catch(() => undefined);
    if (!real || seen.has(real) || !await isProject(real)) return;
    const summary = await summarize(real, kind);
    if (summary) { seen.add(real); projects.push(summary); }
  };
  const examples = new Set((await Promise.all(exampleDirs().map(subfolders))).flat().map(d => resolve(d)));
  const workspace = workspaceFolders();
  const showcase = new Set(workspace ? (await subfolders(workspace.showcase)).map(d => resolve(d)) : []);
  // Films made from templates into templates/<name> (`npx mografy add <template> templates/<name>`) list with the templates.
  const templateFilms = new Set(workspace ? (await subfolders(workspace.templates)).map(d => resolve(d)) : []);
  for (const preset of COMPONENT_PRESETS) await add(join(componentRoot(), preset.id), 'component');
  // Projects in the library folder always list as library, opened or not, so that section never empties out.
  const library = await subfolders(libraryDir());
  const inLibrary = new Set(await Promise.all(library.map(d => realpath(d).catch(() => resolve(d)))));
  for (const dir of (await readRecent()).projects) {
    if (resolve(dir) === componentRoot() || inLibrary.has(await realpath(dir).catch(() => resolve(dir)))) continue;
    await add(dir, examples.has(resolve(dir)) ? 'example' : showcase.has(resolve(dir)) ? 'showcase' : templateFilms.has(resolve(dir)) ? 'template' : 'recent');
  }
  for (const dir of library) await add(dir, 'library');
  for (const dir of examples) await add(dir, 'example');
  for (const dir of showcase) await add(dir, 'showcase');
  for (const dir of templateFilms) await add(dir, 'template');
  return { current: current ?? null, library: libraryDir(), projects, workspace, templates: workspace ? await readTemplates(workspace.templates) : [] };
}

/** The folders of the npx workspace the player runs in, or null outside one (a checkout, ~/Mografy). */
export function workspaceFolders(): WorkspaceFolders | null {
  const dir = workspaceDir();
  return dir ? { dir, projects: join(dir, 'projects'), examples: join(dir, 'examples'), templates: join(dir, 'templates'), showcase: join(dir, 'showcase') } : null;
}

/**
 * The templates installed in a workspace's `folder` (installed.json, written by `npx mografy add <template> templates/`);
 * a workspace from 0.1.2, which copied every template, lists its catalog.json. None installed lists none.
 */
export async function readTemplates(folder: string): Promise<TemplateSummary[]> {
  const raw = await readFile(join(folder, 'installed.json'), 'utf8').catch(() => readFile(join(folder, 'catalog.json'), 'utf8')).catch(() => '');
  try {
    const list = (JSON.parse(raw) as { templates?: unknown }).templates;
    if (!Array.isArray(list)) return [];
    const text = (value: unknown) => typeof value === 'string' ? value : '';
    return list.filter(t => t && typeof t === 'object' && typeof (t as { id?: unknown }).id === 'string').map(t => {
      const item = t as Record<string, unknown>;
      return { id: text(item.id), name: text(item.name) || text(item.id), category: text(item.category), aspect: text(item.aspect), summary: text(item.summary),
        ...(typeof item.duration === 'number' ? { duration: item.duration } : {}) };
    });
  } catch { return []; }
}
