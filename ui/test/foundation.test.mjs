import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { foundationRoot, notices } from '../scripts/foundation-files.mjs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const pin = 'git+https://github.com/Citizen-Infra/design-system.git#6df5682711d11d1dde20453d0e06a78aca48b34f';

test('shared foundation is immutable, HTTPS-only, and opt-in', () => {
  const pkg = JSON.parse(read('package.json'));
  const lock = JSON.parse(read('package-lock.json')).packages;
  assert.equal(pkg.dependencies['@citizen-infra/design-system'], pin);
  assert.equal(lock[''].dependencies['@citizen-infra/design-system'], pin);
  assert.equal(lock['node_modules/@citizen-infra/design-system'].resolved, pin);
  assert.equal(lock['node_modules/@citizen-infra/design-system'].version, '0.2.0-draft.1');
});

test('fonts and tokens enter through Vite, without remote stylesheets or literal palette copies', () => {
  const main = read('src/main.tsx'), css = read('src/index.css');
  for (const file of ['tokens.css', 'fonts.css']) assert.ok(main.includes('@citizen-infra/design-system/' + file));
  assert.doesNotMatch(css, /https?:|#[\da-f]{3,8}\b|oklch\(/i);
  assert.doesNotMatch(css, /font-size:\s*\d+px/);
  assert.ok(css.includes('var(--cibc-font-sans)'));
  assert.ok(css.includes('var(--cibc-color-control-border)'));
});

test('public font/package notices exactly match the installed foundation', () => {
  for (const name of notices) assert.deepEqual(readFileSync(new URL('../public/foundation/' + name, import.meta.url)), readFileSync(new URL(name, foundationRoot)));
});

test('wizard progress and mobile forms have text states, focus and labels', () => {
  const app = read('src/App.tsx'), css = read('src/index.css'), quotas = read('src/steps/Quotas.tsx');
  assert.ok(app.includes("aria-current={i === step ? 'step' : undefined}"));
  for (const state of ['Complete', 'Current', 'Upcoming']) assert.ok(app.includes(state));
  assert.ok(app.includes('mainRef.current?.focus()'));
  assert.ok(css.includes(':focus-visible'));
  assert.ok(css.includes('prefers-reduced-motion'));
  for (const name of ['Feature', 'Value', 'Min', 'Max']) assert.ok(quotas.includes(`<span className="field-label">${name}</span>`));
});
