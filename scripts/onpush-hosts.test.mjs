import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const app = join(root, 'src', 'app');

function* componentFiles(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* componentFiles(path);
    else if (entry.name.endsWith('.component.ts')) yield path;
  }
}

function readComponent(file) {
  const source = readFileSync(file, 'utf8');
  const templateUrl = /templateUrl:\s*'([^']+)'/.exec(source)?.[1];
  return {
    file: relative(root, file).replaceAll('\\', '/'),
    selector: /selector:\s*'([^']+)'/.exec(source)?.[1],
    onPush: /ChangeDetectionStrategy\.OnPush/.test(source),
    template: templateUrl
      ? readFileSync(join(dirname(file), templateUrl), 'utf8')
      : (/template:\s*`([\s\S]*?)`/.exec(source)?.[1] ?? ''),
  };
}

// An OnPush component that is not dirty is skipped on a zone tick, and so is
// everything it renders. A Default child that sets a plain field from an HTTP
// response is waiting for exactly that tick, so it would stop repainting. The
// same goes for routed components under an OnPush <router-outlet> host. Convert
// the child first; this rule retires itself once nothing is left on Default.
test('no OnPush component renders a Default component or a router outlet', () => {
  const components = [...componentFiles(app)].map(readComponent);
  const defaults = components.filter((c) => !c.onPush && c.selector);

  const hosts = [];
  for (const host of components.filter((c) => c.onPush)) {
    for (const child of defaults) {
      if (new RegExp(`<${child.selector}[\\s>/]`).test(host.template)) {
        hosts.push(`${host.file} renders <${child.selector}>`);
      }
    }
    if (defaults.length > 0 && /<router-outlet[\s>/]/.test(host.template)) {
      hosts.push(`${host.file} renders <router-outlet>`);
    }
  }

  assert.deepEqual(hosts, []);
});
