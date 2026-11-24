// `pnpm test:package`: pack the npm package, install it globally into a temporary prefix the way a user would
// (`npm install -g`), and run it from outside any checkout: version, setup check, start a project from a template
// (downloaded from GitHub, like every film and helper), check it, open the player from a folder that is not a project,
// and the no-global flow: `init` (a workspace) → `cd mografy` → `npx mografy dev`, a project and a template in
// projects/, then `init` again.
// Needs the npm registry for the package's dependencies. Leaves nothing behind.
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const temp = mkdtempSync(join(tmpdir(), 'mografy-smoke-'));
const win = process.platform === 'win32';
const run = (command, args, options = {}) => execFileSync(command, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'], shell: win, ...options });
try {
  const out = join(temp, 'pack'), prefix = join(temp, 'prefix'), home = join(temp, 'Mografy');
  run(process.execPath, [join(here, 'pack.mjs'), '--out', out], { stdio: 'inherit' });
  const tarball = readdirSync(out).find(name => name.endsWith('.tgz'));
  run('npm', ['install', '--global', '--prefix', prefix, '--no-audit', '--no-fund', join(out, tarball)], { stdio: 'inherit' });
  const root = win ? join(prefix, 'node_modules', 'mografy') : join(prefix, 'lib', 'node_modules', 'mografy');
  const size = dir => readdirSync(dir, { withFileTypes: true }).reduce((sum, e) => sum + (e.isDirectory() ? size(join(dir, e.name)) : statSync(join(dir, e.name)).size), 0);
  console.log(`Installed: ${(size(root) / 1048576).toFixed(1)} MB in ${root}`);
  const bin = join(root, 'bin', 'mografy.js');
  // Run from the temporary folder, so no checkout around the current folder is used instead.
  const mografy = (...args) => run(process.execPath, [bin, ...args], { cwd: temp, env: { ...process.env, MOGRAFY_HOME: home }, shell: false });
  console.log(mografy('--version').trim());
  console.log(mografy('setup', '--check').trim());
  console.log(mografy('add', 'hook-impact', join(home, 'hook')).trim().split('\n')[0]);
  console.log(mografy('check', join(home, 'hook')).trim());
  // `mografy dev` from a folder that is not a project opens the player on the library (the built-in components).
  const plain = join(temp, 'Documents');
  mkdirSync(plain);
  const env = { ...process.env, MOGRAFY_HOME: home, MOGRAFY_STATE: join(temp, 'state') };
  /** Start `dev`, wait for the project it opens to match `expected`, then stop it. */
  const devOpens = (command, args, cwd, expected, environment = env) => new Promise((done, fail) => {
    const child = spawn(command, args, { cwd, env: environment, stdio: ['ignore', 'pipe', 'pipe'], shell: win && command !== process.execPath });
    let text = '';
    const timer = setTimeout(() => { child.kill(); fail(new Error(`mografy dev did not start:\n${text}`)); }, 90_000);
    const read = chunk => { text += chunk; if (expected.test(text)) { clearTimeout(timer); child.kill(); done(text); } };
    child.stdout.on('data', read);
    child.stderr.on('data', read);
    child.once('exit', code => { clearTimeout(timer); if (!expected.test(text)) fail(new Error(`mografy dev exited with ${code}:\n${text}`)); });
  }).then(text => console.log(text.split('\n').filter(line => /^(Mografy dev server|Project|This project has):?/.test(line)).join('\n')));
  await devOpens(process.execPath, [bin, 'dev', '--no-open'], plain, /^Project: .*\.components/m);
  // `npx mografy@latest init` → `cd mografy` → `npx mografy dev`: a workspace with its own copy, no global install.
  // The workspace installs this tarball (the registry does not have this version yet). No MOGRAFY_HOME here: inside
  // a workspace everything defaults to the workspace's own folders.
  const work = join(temp, 'work'), ws = join(work, 'mografy');
  const wsEnv = { ...process.env, MOGRAFY_STATE: join(temp, 'ws-state'), MOGRAFY_PACKAGE_SPEC: join(out, tarball) };
  mkdirSync(work);
  const init = (cwd, ...args) => run(process.execPath, [bin, 'init', ...args], { cwd, env: wsEnv, shell: false });
  const initOut = init(work);
  console.log(initOut.trim().split('\n').filter(line => !/^npm /.test(line)).join('\n'));
  if (!initOut.includes('npx skills add mografy/mografy')) throw new Error('init does not say how to install the Skill');
  const local = join(ws, 'node_modules', 'mografy', 'bin', 'mografy.js');
  statSync(join(ws, 'mografy.workspace.json')); statSync(local);
  for (const folder of ['projects', 'showcase', 'examples', 'templates']) statSync(join(ws, folder));
  // Templates and every reference film come from the package's bundle, offline; showcase films do not.
  statSync(join(ws, 'templates', 'hook-impact.ts')); statSync(join(ws, 'templates', 'installed.json')); statSync(join(ws, 'templates', 'fonts', 'Inter-500-latin.ttf'));
  for (const film of JSON.parse(readFileSync(join(here, '..', '..', 'examples', 'catalog.json'), 'utf8')).examples) statSync(join(ws, 'examples', film.name, 'mografy.json'));
  statSync(join(ws, 'examples', 'stage-bento', 'assets', 'Inter-Regular.otf'));
  if (readdirSync(join(ws, 'showcase')).join() !== 'README.md') throw new Error('init installed showcase films');
  // The Skill is installed separately (`npx skills add mografy/mografy`), not by init.
  for (const host of ['.agents', '.claude']) if (existsSync(join(ws, host, 'skills', 'mografy'))) throw new Error('init wrote the Skill');
  if (existsSync(join(ws, 'mografy.json'))) throw new Error('init made the workspace a project');
  if (readdirSync(join(ws, 'projects')).some(name => !name.startsWith('.') && name !== 'README.md')) throw new Error('init created a project');
  // With no film yet the player opens on the workspace's start screen (the built-in components stay in projects/.components).
  await devOpens('npx', ['--no-install', 'mografy', 'dev', '--no-open'], ws, /^No project open yet/m, wsEnv);
  // A new film inside the workspace goes into projects/; templates, films and extras then go into films offline
  // (GitHub unreachable here).
  init(ws, 'first-film');
  statSync(join(ws, 'projects', 'first-film', 'mografy.json'));
  const wsRun = (url, ...args) => run(process.execPath, [local, ...args], { cwd: ws, env: { ...wsEnv, MOGRAFY_GITHUB_URL: url }, shell: false });
  wsRun('http://127.0.0.1:9/', 'add', 'hook-impact', 'projects/');
  wsRun('http://127.0.0.1:9/', 'add', 'stage-phone', 'projects/');
  statSync(join(ws, 'projects', 'stage-phone', 'assets', 'Inter-Regular.otf'));
  statSync(join(ws, 'projects', 'hook-impact', 'mografy.json'));
  // Extras ship in the package: they install offline, each with its demo.
  const added = wsRun('http://127.0.0.1:9/', 'add', 'cinema', 'cjk', 'projects/hook-impact');
  if (!added.includes('+ scenes/cinema-demo.ts') || !added.includes('Guide: ')) throw new Error(`add cinema: no demo or guide line:\n${added}`);
  statSync(join(ws, 'projects', 'hook-impact', 'scenes', 'cinema.ts')); statSync(join(ws, 'projects', 'hook-impact', 'assets', 'NotoSansCJKtc-Medium-subset.otf'));
  // Running init again keeps the projects and only updates Mografy.
  const scene = readFileSync(join(ws, 'projects', 'first-film', 'scenes', 'main.ts'), 'utf8');
  init(join(ws, 'projects', 'first-film'));
  if (readFileSync(join(ws, 'projects', 'first-film', 'scenes', 'main.ts'), 'utf8') !== scene) throw new Error('init again changed a scene');
  if (readdirSync(work).length !== 1) throw new Error('init again created another folder');
  console.log('✓ npx mografy@latest init, cd mografy, npx mografy dev (workspace)');
  console.log('✓ The npm package installs and runs.');
} finally {
  rmSync(temp, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
