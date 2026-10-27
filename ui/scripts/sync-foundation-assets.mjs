import { copyFileSync, mkdirSync } from 'node:fs';
import { foundationRoot, notices } from './foundation-files.mjs';

for (const name of notices) {
  const target = new URL('../public/foundation/' + name, import.meta.url);
  mkdirSync(new URL('.', target), { recursive: true });
  copyFileSync(new URL(name, foundationRoot), target);
}
console.log('Foundation MIT / Public Sans OFL notices synced from the installed pin.');
