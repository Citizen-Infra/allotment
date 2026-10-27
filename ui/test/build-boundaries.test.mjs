import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL('../../' + path, import.meta.url), 'utf8');

test('private design review artifacts never enter the Docker build context', () => {
  const patterns = read('.dockerignore').split(/\r?\n/).map(line => line.trim());
  assert.ok(patterns.includes('.impeccable/'), 'Exclude the whole development-only design directory before sending a build context');
  assert.equal(patterns.some(line => line.startsWith('!') && line.includes('.impeccable')), false);
});
