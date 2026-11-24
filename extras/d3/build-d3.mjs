// Rebuild assets/d3.module.js (extras/d3/d3.module.js) from npm. Films never need this; run it to change the D3 version.
//   node extras/d3/build-d3.mjs [version]     (default 7.9.2; needs npm and network)
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url)), version = process.argv[2] ?? '7.9.2';
const work = mkdtempSync(join(tmpdir(), 'mografy-d3-'));
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
try {
  writeFileSync(join(work, 'package.json'), '{"private":true,"type":"module"}');
  execFileSync(npm, ['install', '--silent', '--no-audit', '--no-fund', `d3@${version}`, 'esbuild@0.28.2'], { cwd: work, stdio: 'inherit', shell: process.platform === 'win32' });
  copyFileSync(join(here, 'd3-entry.js'), join(work, 'entry.js'));
  const { build } = await import(join(work, 'node_modules/esbuild/lib/main.js'));
  const banner = `/* D3 ${version} (https://d3js.org), ISC licence: see LICENSE-d3.txt. Bundled for Mografy by extras/d3/build-d3.mjs. */`;
  await build({ entryPoints: [join(work, 'entry.js')], bundle: true, format: 'esm', minify: true, target: 'es2022', legalComments: 'none', banner: { js: banner }, outfile: join(here, 'd3.module.js') });
  writeFileSync(join(here, 'LICENSE-d3.txt'), readFileSync(join(work, 'node_modules/d3/LICENSE'), 'utf8'));
  console.log(`Wrote extras/d3/d3.module.js (D3 ${version})`);
} finally { rmSync(work, { recursive: true, force: true }); }
