import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { foundationRoot, notices, fonts } from './foundation-files.mjs';

for (const name of notices) {
  assert.deepEqual(readFileSync(new URL('../dist/foundation/' + name, import.meta.url)), readFileSync(new URL(name, foundationRoot)), name);
}
const assets = new URL('../dist/assets/', import.meta.url);
const emitted = readdirSync(assets).filter(name => name.endsWith('.woff2'));
for (const name of fonts) {
  const original = readFileSync(new URL(name, foundationRoot));
  assert.ok(emitted.some(file => readFileSync(new URL(file, assets)).equals(original)), `Missing exact font: ${name}`);
}
console.log('Built Public Sans binaries and MIT/OFL notices match the installed foundation.');
