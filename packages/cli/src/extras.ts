// `mografy add <helper>`: copy an optional helper (cinema, cjk, three, d3, p5, music, walkthrough, stage) into a project.
// Extras are not part of the project template. They come from the checkout's or workspace's extras/ folder, else the
// npm package's own extras/ (installed by init), else GitHub, so a project gets only the helpers it asks for.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { EXTRAS } from '@mografy/core';
import type { ExtraFont } from '@mografy/core';
import { installation } from '@mografy/server';
import { exists, repoFile } from './github.js';
import { displayPath } from './paths.js';
import { SKILL_INSTALL, skillLocations } from './skill-hint.js';

export { EXTRAS } from '@mografy/core';
export type { Extra } from '@mografy/core';

export function extrasList() {
  const width = Math.max(...Object.keys(EXTRAS).map(name => name.length));
  return Object.entries(EXTRAS).map(([name, extra]) => `  ${name.padEnd(width)}  ${extra.summary}`).join('\n');
}

const source = async (workspaceRoot: string, path: string) => {
  const packaged = join(installation.root, 'extras', ...path.split('/'));
  if (!await exists(join(workspaceRoot, 'extras', ...path.split('/'))) && await exists(packaged)) return readFile(packaged);
  return repoFile(workspaceRoot, `extras/${path}`);
};

export interface AddResult { written: string[]; unchanged: string[]; kept: string[]; fonts: string[] }

/** Copy an extra into `dir`. Files that differ from the extra are kept unless `force` is set. */
export async function addExtra(workspaceRoot: string, dir: string, name: string, force = false): Promise<AddResult> {
  const extra = EXTRAS[name];
  if (!extra) throw new Error(`Unknown helper: ${name}\nAvailable helpers:\n${extrasList()}`);
  const result: AddResult = { written: [], unchanged: [], kept: [], fonts: [] };
  for (const [from, to] of extra.files) {
    const target = join(dir, to), data = await source(workspaceRoot, from);
    const current = await readFile(target).catch(() => undefined);
    if (current?.equals(data)) { result.unchanged.push(to); continue; }
    if (current && !force) { result.kept.push(to); continue; }
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, data);
    result.written.push(to);
  }
  if (extra.fonts?.length) {
    const file = join(dir, 'mografy.json');
    const project = JSON.parse(await readFile(file, 'utf8')) as { fonts?: ExtraFont[] };
    const fonts = project.fonts ?? [];
    for (const font of extra.fonts) {
      if (fonts.some(f => f.path === font.path)) continue;
      fonts.push(font); result.fonts.push(`${font.family} ${font.weight}`);
    }
    if (result.fonts.length) { project.fonts = fonts; await writeFile(file, JSON.stringify(project, null, 2) + '\n'); }
  }
  return result;
}

/**
 * Where the extra's guide is: the Skill's reference beside the project, in the workspace or the user's folders, or,
 * when no agent can find the Skill (init does not install it), the command that installs it.
 */
export function guideLine(reference: string, places: string[], home?: string) {
  const skill = places.flatMap(place => skillLocations(place, home)).find(file => existsSync(file));
  if (skill) return `Guide: ${displayPath(join(dirname(skill), 'references', reference))}`;
  return `Guide: references/${reference} in the Mografy Skill, which is not installed here. Install it with: ${SKILL_INSTALL}`;
}

export function printAdd(name: string, dir: string, result: AddResult, workspaceRoot = dir) {
  const extra = EXTRAS[name]!;
  console.log(`Added ${name} to ${displayPath(dir)}`);
  for (const file of result.written) console.log(`  + ${file}`);
  for (const file of result.unchanged) console.log(`  = ${file} (already up to date)`);
  for (const file of result.kept) console.log(`  ! ${file} differs from the extra and was kept. Use --force to replace it.`);
  if (result.fonts.length) console.log(`  + fonts in mografy.json: ${result.fonts.join(', ')}`);
  console.log(`\nNext: ${extra.next}\n${guideLine(extra.reference, [dir, workspaceRoot])}`);
}
