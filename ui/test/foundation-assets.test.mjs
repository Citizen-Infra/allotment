import test from 'node:test';
import assert from 'node:assert/strict';
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { foundationRoot, notices, fonts } from '../scripts/foundation-files.mjs';

function fixture(t) {
  const directory = mkdtempSync(join(tmpdir(), 'allotment-foundation-test-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const source = join(directory, 'node_modules/@citizen-infra/design-system');
  const build = join(directory, 'dist');
  mkdirSync(join(directory, 'scripts'), { recursive: true });
  mkdirSync(join(build, 'assets'), { recursive: true });
  for (const name of ['foundation-files.mjs', 'check-foundation-assets.mjs']) {
    copyFileSync(new URL('../scripts/' + name, import.meta.url), join(directory, 'scripts', name));
  }
  for (const name of [...notices, ...fonts]) {
    mkdirSync(dirname(join(source, name)), { recursive: true });
    copyFileSync(new URL(name, foundationRoot), join(source, name));
  }
  for (const name of notices) {
    const destination = join(build, 'foundation', name);
    mkdirSync(dirname(destination), { recursive: true });
    copyFileSync(join(source, name), destination);
  }
  fonts.forEach((name, i) => copyFileSync(join(source, name), join(build, 'assets', `emitted-${i}.woff2`)));
  return {
    build,
    check: () => spawnSync(process.execPath, [join(directory, 'scripts/check-foundation-assets.mjs')], {
      encoding: 'utf8',
      timeout: 10_000,
    }),
  };
}

function fails(result) {
  assert.equal(result.error, undefined);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /AssertionError|ENOENT/);
}

test('asset gate accepts exact notice/font bytes independently of emitted filenames', t => {
  const { check } = fixture(t);
  const result = check();
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, result.stderr);
});

fonts.forEach((name, i) => {
  test(`asset gate rejects a missing font: ${name}`, t => {
    const { build, check } = fixture(t);
    unlinkSync(join(build, 'assets', `emitted-${i}.woff2`));
    fails(check());
  });
  test(`asset gate rejects a changed font: ${name}`, t => {
    const { build, check } = fixture(t);
    writeFileSync(join(build, 'assets', `emitted-${i}.woff2`), 'not the pinned font');
    fails(check());
  });
});

for (const name of notices) {
  test(`asset gate rejects a missing notice: ${name}`, t => {
    const { build, check } = fixture(t);
    unlinkSync(join(build, 'foundation', name));
    fails(check());
  });
  test(`asset gate rejects a changed notice: ${name}`, t => {
    const { build, check } = fixture(t);
    writeFileSync(join(build, 'foundation', name), 'not the pinned notice');
    fails(check());
  });
}
