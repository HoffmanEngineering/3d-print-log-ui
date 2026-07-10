import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  findSsrArtifacts,
  localAssetRefs,
  resolveBrowserDir,
} from './shell-lib.mjs';

const SHELLS = ['app-shell.html', 'list-skeleton.html'];
const errors = [];

function check(cond, msg) {
  if (!cond) errors.push(msg);
}

function main() {
  const angularJson = JSON.parse(readFileSync('angular.json', 'utf8'));
  const browserDir = resolveBrowserDir(angularJson);
  const shellsDir = join(browserDir, 'shells');

  for (const name of SHELLS) {
    const path = join(shellsDir, name);
    check(existsSync(path), `${name}: missing at ${path}`);
    if (!existsSync(path)) continue;
    const html = readFileSync(path, 'utf8');

    const artifacts = findSsrArtifacts(html);
    check(
      artifacts.length === 0,
      `${name}: SSR artifacts present: ${artifacts.join(', ')}`
    );
    check(/theme-mode/.test(html), `${name}: missing pre-paint theme script`);
    check(
      /type=["']module["']/.test(html),
      `${name}: missing module bootstrap script`
    );
    check(
      /name=["']robots["'][^>]*noindex/i.test(html),
      `${name}: missing noindex`
    );
    check(!/rel=["']canonical["']/i.test(html), `${name}: canonical present`);
    check(
      !/property=["']og:|name=["']twitter:/i.test(html),
      `${name}: social meta present`
    );
    check(!/application\/ld\+json/i.test(html), `${name}: JSON-LD present`);

    for (const ref of localAssetRefs(html)) {
      const assetPath = join(browserDir, ref.replace(/^\//, '').split('?')[0]);
      check(existsSync(assetPath), `${name}: referenced asset missing: ${ref}`);
    }
  }

  // Config rewrite targets must exist as output files.
  const config = JSON.parse(readFileSync('src/staticwebapp.config.json', 'utf8'));
  const targets = [
    ...(config.routes || []).map((r) => r.rewrite).filter(Boolean),
    config.navigationFallback?.rewrite,
  ].filter(Boolean);
  for (const t of [...new Set(targets)]) {
    check(
      existsSync(join(browserDir, t.replace(/^\//, ''))),
      `config rewrite target missing: ${t}`
    );
  }

  // Regression: prerendered Home still has hydration info.
  const homeHtml = readFileSync(join(browserDir, 'index.html'), 'utf8');
  check(
    /\bngh=|id=["']ng-state["']/.test(homeHtml),
    'home index.html lost hydration info'
  );

  if (errors.length) {
    console.error(
      'verify-shells FAILED:\n' + errors.map((e) => ` - ${e}`).join('\n')
    );
    process.exit(1);
  }
  console.log('verify-shells passed.');
}

main();
