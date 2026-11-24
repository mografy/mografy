// Templates and reference films ship inside the npm package (bundle/), so a new workspace has
// them without a download. Many films carry the same font files, so each distinct file is stored once:
// bundle/files.json maps every bundled path (templates/…, examples/<film>/…) to the file under
// bundle/ that holds its bytes. `apps/cli/pack.mjs` writes it; a checkout has no bundle and reads its own folders.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve, sep } from 'node:path';
import { installation } from '@mografy/server';

export const BUNDLE_MANIFEST = 'files.json';
export interface BundleManifest { version: 1; files: Record<string, string> }

const loaded = new Map<string, Promise<BundleManifest | undefined>>();
/** The manifest of the bundle in `root` (default: this installation), or undefined without one. */
export function bundleManifest(root = installation.root): Promise<BundleManifest | undefined> {
  if (!loaded.has(root)) loaded.set(root, readFile(join(root, 'bundle', BUNDLE_MANIFEST), 'utf8')
    .then(text => JSON.parse(text) as BundleManifest, () => undefined));
  return loaded.get(root)!;
}

/** A bundled file by its repository path (`examples/stage-bento/mografy.json`), or undefined when it is not bundled. */
export async function bundledFile(path: string, root = installation.root): Promise<Buffer | undefined> {
  const stored = (await bundleManifest(root))?.files[path];
  return stored === undefined ? undefined : readFile(join(root, 'bundle', ...stored.split('/')));
}

/** The bundled paths inside `folder` (`examples/stage-bento`), relative to it. */
export async function bundledFolder(folder: string, root = installation.root): Promise<string[]> {
  const prefix = folder.replace(/\/$/, '') + '/';
  return Object.keys((await bundleManifest(root))?.files ?? {}).filter(path => path.startsWith(prefix)).map(path => path.slice(prefix.length));
}

/** Write the bundled `folder` into `dest` (created). Returns the number of files and their bytes; 0 when not bundled. */
export async function copyBundledFolder(folder: string, dest: string, root = installation.root) {
  let bytes = 0;
  const files = await bundledFolder(folder, root);
  for (const file of files) {
    const target = resolve(dest, ...file.split('/'));
    if (!target.startsWith(resolve(dest) + sep)) throw new Error(`Refusing a bundled file outside its folder: ${file}`);
    const data = (await bundledFile(`${folder.replace(/\/$/, '')}/${file}`, root))!;
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, data);
    bytes += data.length;
  }
  return { files: files.length, bytes };
}
