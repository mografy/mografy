import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sharedSkillFiles } from '@mografy/core';
import { EXTRAS } from '../src/extras.js';

// The Skill's extras.md is what agents read; keep it in step with what `mografy add <extra>` actually does.
test('every extra is documented in the Skill with its reference and import line', () => {
  const files = sharedSkillFiles().mografy;
  const catalog = files['references/extras.md'];
  assert.ok(catalog, 'references/extras.md is missing from the Skill');
  for (const [name, extra] of Object.entries(EXTRAS)) {
    assert.ok(`references/${extra.reference}` in files, `${name}: its reference ${extra.reference} is not in the Skill`);
    assert.ok(catalog.includes(`| \`${name}\` |`), `${name} has no row in extras.md`);
    if (extra.next.startsWith('import ')) assert.ok(catalog.includes(extra.next), `${name}: extras.md does not show "${extra.next}"`);
  }
});
