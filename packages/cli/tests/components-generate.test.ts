// projects/.components is generated, not tracked: naming a built-in component before the first start creates the folder.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readdir, realpath, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { COMPONENT_PRESETS } from '@mografy/server';

const BIN = resolve(dirname(fileURLToPath(import.meta.url)), '../bin/mografy.js');
/** Run the CLI until `until` appears in its output (then stop it) or it exits. */
function run(args: string[], env: NodeJS.ProcessEnv, until?: RegExp) {
  return new Promise<{ code: number | null; output: string }>((done, reject) => {
    const child = spawn(process.execPath, [BIN, ...args], { env });
    let output = '';
    const timer = setTimeout(() => child.kill(), 60_000);
    const read = (chunk: Buffer) => { output += chunk; if (until?.test(output)) child.kill(); };
    child.stdout.on('data', read); child.stderr.on('data', read);
    child.once('error', reject);
    child.once('close', code => { clearTimeout(timer); done({ code, output }); });
  });
}

test('dev on a built-in component path generates projects/.components on a fresh library', async () => {
  const sandbox = await realpath(await mkdtemp(join(tmpdir(), 'mografy-components-')));
  const env = { ...process.env, MOGRAFY_HOME: join(sandbox, 'lib'), MOGRAFY_STATE: join(sandbox, 'state') };
  try {
    const missing = await run(['dev', join(sandbox, 'lib/not-a-film'), '--no-open'], env);
    assert.notEqual(missing.code, 0);
    assert.match(missing.output, /is not a Mografy project/);
    await assert.rejects(stat(join(sandbox, 'lib/.components')), 'a path outside .components generates nothing');

    const opened = await run(['dev', join(sandbox, 'lib/.components/count-up'), '--no-open'], env, /^Project: .*count-up/m);
    assert.match(opened.output, /^Project: .*\.components[\\/]count-up/m);
    const made = (await readdir(join(sandbox, 'lib/.components'))).sort();
    assert.deepEqual(made, COMPONENT_PRESETS.map(p => p.id).sort());
    for (const id of made) assert.ok((await stat(join(sandbox, 'lib/.components', id, 'mografy.json'))).isFile(), id);
  } finally { await rm(sandbox, { recursive: true, force: true }); }
});
