// Writes the discovery files (#210) into src/well-known/ from discovery-lib.mjs.
// The Angular assets config copies that folder to /.well-known/ in the build.
//
//   npm run discovery:generate
//
// Commit the result. discovery.test.mjs fails when the files and the lib differ.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildDiscoveryFiles } from './discovery-lib.mjs';

const WELL_KNOWN_SOURCE = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'src',
  'well-known'
);

for (const [relativePath, contents] of Object.entries(buildDiscoveryFiles())) {
  const target = join(WELL_KNOWN_SOURCE, relativePath);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, contents);
  console.log(`wrote src/well-known/${relativePath}`);
}
