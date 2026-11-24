// Which project a command means, from its arguments and the current folder.
import { isAbsolute, resolve } from 'node:path';
import { defaultProject, isProject as hasProject, libraryProject } from '@mografy/server';
import { displayPath, fromHome, within, workspaceRoot } from './paths.js';

export { hasProject };

const isInsideWorkspace = (value: string) => within(workspaceRoot, value) !== undefined;

/**
 * Bare project commands are convenient inside Mografy's own workspace, where
 * the player can resume the last library project. Elsewhere a bare `dev` opens
 * the player on the library (its last project, or the built-in components), the
 * way `npx mografy dev` is meant to start; other commands require an actual
 * project context, so none of them can act on a scene from another checkout.
 */
export async function implicitProject(command: string) {
  const cwd = process.cwd();
  if (await hasProject(cwd)) return cwd;
  if (isInsideWorkspace(cwd)) return defaultProject(cwd);
  if (command === 'dev') return libraryProject();
  throw new Error(`No mografy.json found in ${displayPath(cwd)}. Run \`mografy ${command} <project>\` or change into a Mografy project.`);
}

/**
 * A relative project path is read from the current folder first. When it is not a
 * project there but is one inside this Mografy installation (for example
 * `mografy dev projects/launch` typed from another repository's terminal), open the
 * installation's project.
 */
export async function resolveProjectArg(arg: string) {
  const local = resolve(arg);
  if (isAbsolute(arg) || await hasProject(local)) return local;
  const installed = resolve(workspaceRoot, arg);
  if (installed !== local && await hasProject(installed)) {
    console.log(`${arg} is not in ${fromHome(process.cwd())}; using ${fromHome(installed)} from the Mografy installation.`);
    return installed;
  }
  return local;
}
