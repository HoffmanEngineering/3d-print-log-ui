import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { buildShell, resolveBrowserDir } from './shell-lib.mjs';

const TITLE = 'Loading… — 3D Print Log';
const DESCRIPTION = 'Loading your 3D Print Log.';

const SHELLS = [
  { out: 'app-shell.html', body: 'src/shells/app-shell.body.html' },
  { out: 'list-skeleton.html', body: 'src/shells/list-skeleton.body.html' },
];

function main() {
  const angularJson = JSON.parse(readFileSync('angular.json', 'utf8'));
  const browserDir = resolveBrowserDir(angularJson);
  const indexHtml = readFileSync(join(browserDir, 'index.html'), 'utf8');
  const shellsDir = join(browserDir, 'shells');
  mkdirSync(shellsDir, { recursive: true });

  for (const shell of SHELLS) {
    const bodyHtml = readFileSync(shell.body, 'utf8').trim();
    const html = buildShell(indexHtml, {
      bodyHtml,
      title: TITLE,
      description: DESCRIPTION,
    });
    writeFileSync(join(shellsDir, shell.out), html);
    console.log(`Wrote ${join(shellsDir, shell.out)}`);
  }
}

main();
