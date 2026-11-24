import { test } from 'node:test';
import assert from 'node:assert/strict';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { displayPath, fromHome, within, workspaceRoot } from '../src/paths.js';
import { delay, exists } from '../src/util.js';

test('one helper each for home-relative and workspace-relative paths', () => {
  assert.equal(fromHome(homedir()), '~');
  assert.equal(fromHome(join(homedir(), 'Films', 'a')), join('~', 'Films', 'a'));
  assert.equal(fromHome(join(homedir(), '..foo')), join('~', '..foo'), 'a folder named ..foo is still inside home');
  assert.equal(fromHome(resolve(homedir(), '..', 'elsewhere')), resolve(homedir(), '..', 'elsewhere'));
  assert.equal(displayPath(workspaceRoot), '.');
  assert.equal(displayPath(join(workspaceRoot, 'projects', 'a')), join('projects', 'a'));
  assert.equal(within('/a/b', '/a/b/c'), 'c');
  assert.equal(within('/a/b', '/a/bc'), undefined);
  assert.equal(within('/a/b', '/a'), undefined);
});
test('exists and delay', async () => {
  assert.equal(await exists(workspaceRoot), true);
  assert.equal(await exists(join(workspaceRoot, 'no-such-file-here')), false);
  const start = Date.now(); await delay(20); assert.ok(Date.now() - start >= 15);
});
