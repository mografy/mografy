// Replace assets/p5.module.js (extras/p5/p5.module.js) with another p5.js release from npm, unmodified.
// Films never need this.   node extras/p5/update-p5.mjs [version]     (default 2.4.0; needs npm and network)
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url)), version = process.argv[2] ?? '2.4.0';
const work = mkdtempSync(join(tmpdir(), 'mografy-p5-'));
try {
  writeFileSync(join(work, 'package.json'), '{"private":true}');
  execFileSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['install', '--silent', '--no-audit', '--no-fund', `p5@${version}`], { cwd: work, stdio: 'inherit', shell: process.platform === 'win32' });
  copyFileSync(join(work, 'node_modules/p5/lib/p5.esm.min.js'), join(here, 'p5.module.js'));
  const head = readFileSync(join(here, 'LICENSE-p5.txt'), 'utf8').split('                    GNU LESSER')[0].replace(/p5\.js \d[\w.-]*/g, `p5.js ${version}`).replace(/tree\/v[\w.-]+/, `tree/v${version}`);
  writeFileSync(join(here, 'LICENSE-p5.txt'), head + readFileSync(join(work, 'node_modules/p5/license.txt'), 'utf8'));
  console.log(`Wrote extras/p5/p5.module.js (p5.js ${version})`);
} finally { rmSync(work, { recursive: true, force: true }); }
