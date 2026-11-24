import { homedir } from 'node:os';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';
import { installation, isProject, workspaceDir } from '@mografy/server';

/**
 * Where Mografy's folders are: the repository root of a checkout, or the workspace `npx mografy@latest init` made
 * (found from the current folder), else the installation's own folder. See `workspaceDir` in @mografy/server.
 */
export const workspaceRoot = workspaceDir() ?? installation.root;
/** `target` relative to `base` when it is `base` itself ('') or inside it; otherwise undefined. */
export function within(base: string, target: string) {
  const path = relative(resolve(base), resolve(target));
  return path === '' || (path !== '..' && !path.startsWith(`..${sep}`) && !isAbsolute(path)) ? path : undefined;
}
/** Show a path from the user's home (`~/…`), so it is clear which checkout or repository it is in; else absolute. */
export function fromHome(value: string) {
  const path = within(homedir(), value);
  return path === undefined ? resolve(value) : path === '' ? '~' : join('~', path);
}
/** Keep terminal output useful without exposing the user's absolute home path: workspace-relative, else from home. */
export function displayPath(value: string) {
  const path = within(workspaceRoot, value);
  return path === undefined ? fromHome(value) : path === '' ? '.' : path;
}

export async function requireProject(dir: string) {
  if (!await isProject(dir)) throw new Error(`${displayPath(dir)} has no mografy.json. Open the player with \`mografy dev\`, or ask Claude or Codex to create the animation.`);
}

