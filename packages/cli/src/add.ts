// `mografy add`: one command for everything optional. A name is either a reference film, copied into
// the library as a project of its own (from this installation, downloaded from GitHub, or from the website's showcase), a helper
// (extra), or a template from Mografy Templates, both copied into a project. Several helpers and templates can be
// added at once, and a folder or project may follow the names.
import { addExtra, EXTRAS, extrasList, guideLine, printAdd } from './extras.js';
import { copyExample, examplesList, listExamples, printExample } from './examples.js';
import { installShowcase, isShowcaseFilm, printShowcase, SHOWCASE_URL, showcaseList } from './showcase.js';
import { addTemplate, installTemplate, isTemplate, listTemplates, printTemplate, printTemplatesDone, ROOT, templateProject, templatesList } from './templates.js';
import { existsSync, statSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { isWorkspace } from './project-install.js';
import { displayPath } from './paths.js';

/** A folder named with a trailing slash, or an existing folder that is not a project: the film goes inside it. */
function intoFolder(target: string) {
  if (/[\\/]$/.test(target)) return true;
  try { return statSync(target).isDirectory() && !existsSync(join(target, 'mografy.json')); } catch { return false; }
}
const sameDir = (a: string, b: string) => resolve(a) === resolve(b);

export type AddKind = 'film' | 'helper' | 'template';
export interface AddPlan { films: string[]; helpers: string[]; templates?: string[]; target?: string }

export async function addKind(name: string): Promise<AddKind | undefined> {
  if (EXTRAS[name]) return 'helper';
  if ((await listExamples()).some(e => e.name === name) || isShowcaseFilm(name)) return 'film';
  return await isTemplate(ROOT, name) ? 'template' : undefined;
}

/** Split `mografy add` arguments into known names and an optional trailing folder or project. */
export async function planAdd(args: string[]): Promise<AddPlan> {
  const plan: AddPlan = { films: [], helpers: [] };
  const templates: string[] = [];
  // The folder may come first: `npx mografy add templates/ hook-impact cta-endcard` (a name ending in a slash).
  if (args.length > 1 && /[\\/]$/.test(args[0]!) && !await addKind(args[0]!)) args = [...args.slice(1), args[0]!];
  for (const [i, arg] of args.entries()) {
    const kind = await addKind(arg);
    if (kind === 'film') plan.films.push(arg);
    else if (kind === 'helper') plan.helpers.push(arg);
    else if (kind === 'template') templates.push(arg);
    else if (i === args.length - 1 && i > 0) plan.target = arg;
    else throw new Error(`Nothing called ${arg} can be added.\n\n${await addList()}`);
  }
  if (templates.length) plan.templates = templates;
  if (plan.films.length && (plan.helpers.length || templates.length) || plan.target !== undefined && plan.films.length > 1 && !intoFolder(plan.target))
    throw new Error('Add reference films and helpers separately; a folder can follow one film:\n  npx mografy add <film> [folder]\n  npx mografy add <helper...> [project]');
  return plan;
}

export async function addList() {
  return [
    'Reference films, copied into your library as a new project (those marked "from GitHub" download the first time):',
    await examplesList(),
    '',
    `Showcase films, downloaded from ${SHOWCASE_URL} (into showcase/ in a workspace):`,
    showcaseList(),
    '',
    'Helpers, copied into the current project or the one you name:',
    extrasList(),
    '',
    'Mografy Templates, ready-made templates copied into the current project or the one you name:',
    await templatesList(),
    '',
    'Usage (the folder can come first or last):',
    '  npx mografy add examples/ <film>          (in a workspace; any folder works)',
    '  npx mografy add templates/ <template...>  (in a workspace: install templates to use later)',
    '  npx mografy add showcase/ <showcase film> (in a workspace: films from the website showcase)',
    '  npx mografy add projects/ <film>          (a film of your own to change, in projects/<film>)',
    '  npx mografy add <film> [folder]',
    '  npx mografy add <helper...> [project]   for example: npx mografy add music cjk',
    '  npx mografy add <template...> [project] for example: npx mografy add hook-impact cta-endcard projects/my-film',
    '                                      (a missing project is created for the templates)',
  ].join('\n');
}

/**
 * Run a plan. `target` resolves where helpers and templates go: the named folder, or the current project, or undefined
 * when there is none. Helpers need an existing project. Templates create one when the folder has no project yet (in the
 * library, named after the first template, when no folder was named), so a missing project is never an error for templates
 * and nothing is ever added silently to another, last-opened project.
 */
export async function runAdd(plan: AddPlan, workspaceRoot: string, target: (name?: string) => Promise<string | undefined>, force = false,
  isProject: (dir: string) => Promise<boolean> = async () => true) {
  const local = new Set((await listExamples()).map(e => e.name));
  const workspace = isWorkspace(workspaceRoot) ? workspaceRoot : undefined;
  for (const [i, name] of plan.films.entries()) {
    if (i) console.log('');
    // `add <film> examples/` (any folder that is not a project): the film goes inside it, as examples/<film>.
    const dest = plan.target !== undefined && intoFolder(plan.target) ? join(plan.target, name) : plan.target;
    if (local.has(name)) printExample(name, await copyExample(name, dest));
    else { const { dest: written, bytes } = await installShowcase(name, dest); printShowcase(name, written, bytes); }
  }
  const templates = plan.templates ?? [];
  if (!plan.helpers.length && !templates.length) return;
  // In a workspace, templates without a project go into its templates/: `add <template> templates/`, or no folder at all
  // outside a project. `add <template> projects/` starts projects/<template>.
  if (workspace && templates.length && !plan.helpers.length) {
    const named = plan.target !== undefined ? resolve(plan.target) : undefined;
    const current = named ? undefined : await target(undefined);
    const toTemplates = named ? sameDir(named, join(workspace, 'templates')) : !(current && await isProject(current));
    if (toTemplates) return installTemplates(workspace, templates);
    if (named && sameDir(named, join(workspace, 'projects'))) plan = { ...plan, target: join(named, templates[0]!) };
  }
  let dir = await target(plan.target), created = false;
  if (templates.length) ({ dir, created } = await templateProject(workspaceRoot, dir, templates));
  if (!dir || !await isProject(dir)) {
    const named = plan.target ?? 'projects/<name>';
    throw new Error(`${dir ? `${dir} has no mografy.json` : 'This folder is not a Mografy project'}, so there is nowhere to add ${plan.helpers.join(', ')}.\n`
      + `  Name the project:   npx mografy add ${plan.helpers.join(' ')} ${named}\n`
      + `  Or start one from templates, which creates the project: npx mografy add hook-impact ${named}`);
  }
  for (const [i, name] of plan.helpers.entries()) {
    if (i) console.log('');
    printAdd(name, dir, await addExtra(workspaceRoot, dir, name, force), workspaceRoot);
  }
  if (!templates.length) return;
  if (plan.helpers.length) console.log('');
  console.log(`Adding ${templates.length === 1 ? 'a template' : `${templates.length} templates`}:`);
  for (const id of templates) await printTemplate(workspaceRoot, id, dir, await addTemplate(workspaceRoot, dir, id, force));
  const all = await listTemplates(workspaceRoot), aspect = all.find(s => s.id === templates[0])!.aspect;
  printTemplatesDone(dir, templates, created, aspect, created ? templates.filter(id => all.find(s => s.id === id)!.aspect !== aspect) : []);
}


/** Download templates into the workspace's templates/ and say how to use them. */
async function installTemplates(workspace: string, ids: string[]) {
  console.log(`Installing ${ids.length === 1 ? 'a template' : `${ids.length} templates`} into ${displayPath(join(workspace, 'templates'))}/:`);
  for (const id of ids) {
    const { entry } = await installTemplate(workspace, id);
    console.log(`  + ${id}  ${entry.name}, ${entry.aspect}, ${entry.duration} s`);
  }
  console.log(['', 'The player lists them under Templates. Start a film with them:', `  npx mografy add ${ids.join(' ')} projects/${basename(ids[0]!)}`,
    guideLine('templates.md', [workspace])].join('\n'));
}
