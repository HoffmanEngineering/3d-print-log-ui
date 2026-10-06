// Copies the agent skill (#215) from the API repo into src/well-known/ and
// regenerates the discovery files, so /.well-known/agent-skills/index.json
// carries the digest of the bytes the site now serves.
//
//   npm run discovery:sync-skill            fetch from the API repo's main, write, regenerate
//   npm run discovery:sync-skill -- --check exit 1 if the copy here differs from main
//
// The API repo is the source of truth: it owns the MCP tools the skill names,
// and its AgentSkillTests fail when the skill and the tools disagree. Commit
// the result. discovery.test.mjs checks the index against the copy offline.
import { writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import {
  SKILL_MIRROR_FILE,
  SKILL_SOURCE_URL,
  readMirroredSkill,
} from './discovery-lib.mjs';

const mirror = fileURLToPath(SKILL_MIRROR_FILE);

const response = await fetch(SKILL_SOURCE_URL);
if (!response.ok) {
  console.error(`GET ${SKILL_SOURCE_URL} -> ${response.status}`);
  process.exit(1);
}
const upstream = Buffer.from(await response.arrayBuffer());
const local = readMirroredSkill();

if (process.argv.includes('--check')) {
  if (upstream.equals(local)) {
    console.log(`${mirror} matches main`);
    process.exit(0);
  }
  console.error(
    `The served skill differs from ${SKILL_SOURCE_URL}; run npm run discovery:sync-skill`
  );
  process.exit(1);
}

writeFileSync(SKILL_MIRROR_FILE, upstream);
console.log(upstream.equals(local) ? 'skill unchanged' : `wrote ${mirror}`);
execFileSync(
  process.execPath,
  [fileURLToPath(new URL('./generate-discovery.mjs', import.meta.url))],
  { stdio: 'inherit' }
);
