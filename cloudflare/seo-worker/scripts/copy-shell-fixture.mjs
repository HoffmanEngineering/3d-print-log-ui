// Refreshes test/fixtures/app-shell.html from the UI's production build, so the tests run
// against the shell Static Web Apps actually serves for /prints/*, /projects/* and /users/*.
//
//   cd ../..                      # the UI repo root
//   npm run build                 # writes dist/print-log-ui/browser/shells/
//   cd cloudflare/seo-worker && npm run fixture:shell
//
// The checked-in fixture was taken from https://www.3dprintlog.com/prints/1 (the same file,
// as deployed). Either source is fine; a hand-written shell is not.
import { copyFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const source = join(
  here,
  '../../../dist/print-log-ui/browser/shells/app-shell.html'
);
const target = join(here, '../test/fixtures/app-shell.html');

if (!existsSync(source)) {
  console.error(
    `No built shell at ${source}. Run \`npm run build\` in the UI repo root first.`
  );
  process.exit(1);
}
copyFileSync(source, target);
console.log(`Copied ${source} -> ${target}`);
