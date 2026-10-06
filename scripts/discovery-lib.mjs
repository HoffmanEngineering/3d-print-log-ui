/**
 * The machine-readable discovery files served from https://www.3dprintlog.com
 * (#210), built from one set of constants so the URLs they share cannot drift.
 *
 *   /.well-known/api-catalog               RFC 9727 API catalog (Linkset)
 *   /.well-known/mcp/server-card.json      MCP Server Card (SEP-2127)
 *   /.well-known/mcp                       the same card (rewritten in SWA)
 *   /.well-known/ard.json                  Agentic Resource Discovery manifest
 *   /.well-known/ai-catalog.json           byte-identical legacy copy of ard.json
 *   /.well-known/agent-skills/index.json   Agent Skills discovery index (#215)
 *
 * The files are committed under `src/well-known/` (copied to `.well-known/` by
 * the Angular assets config) and regenerated with `npm run discovery:generate`.
 * `discovery.test.mjs` fails when the committed files and this module disagree.
 *
 * Spec versions these were built against. All three are drafts or proposals;
 * recheck them when each reaches a stable release:
 *   - ARD v0.91 (Proposal, 2026-08-26): https://agenticresourcediscovery.org/spec/
 *     The manifest is `{ entries: [...] }`; other top-level members are ignored.
 *   - AI Catalog 1.0 (https://github.com/Agent-Card/ai-catalog): requires
 *     `specVersion` and `entries`, so the one document satisfies both specs.
 *   - MCP Server Card, SEP-2127 / experimental-ext-server-card `schema.ts`:
 *     `$schema`, `name`, `version`, `description` are required; no tools list.
 *   - Agent Skills Discovery via Well-Known URIs v0.2.0 (Draft, updated
 *     2026-03-12): https://github.com/cloudflare/agent-skills-discovery-rfc
 *     Its `$schema` URI is an opaque identifier; nothing is published at it,
 *     so there is no JSON Schema to vendor and the tests check the fields.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { parseFrontmatter } from './docs-frontmatter.mjs';
import { SITE_ORIGIN } from './marketing-routes.mjs';

export const API_ORIGIN = 'https://api.3dprintlog.com';

/** The OpenAPI document published by the API (api#126). */
export const OPENAPI_URL = `${API_ORIGIN}/swagger/v1/swagger.json`;
/** The REST API base. Every operation in the OpenAPI document lives under it. */
export const REST_API_URL = `${API_ORIGIN}/api`;
/** Liveness probe; answers `Healthy` as text/plain without touching the database. */
export const API_HEALTH_URL = `${API_ORIGIN}/health`;
/** Streamable HTTP MCP endpoint. */
export const MCP_URL = `${API_ORIGIN}/mcp`;
/**
 * The anonymous docs MCP endpoint (api#129): the docs tools and `docs://`
 * resources only, no sign-in. `/mcp` serves the same docs tools to signed-in
 * clients, so this is for agents that want the docs without an account.
 */
export const MCP_DOCS_SERVER_URL = `${API_ORIGIN}/mcp/docs`;
/** The Markdown docs index the docs endpoint serves its content from (#211). */
export const DOCS_LLMS_URL = `${SITE_ORIGIN}/docs/llms.txt`;

export const API_DOCS_URL = `${SITE_ORIGIN}/docs/api`;
export const MCP_DOCS_URL = `${SITE_ORIGIN}/docs/mcp`;

export const API_CATALOG_PATH = '/.well-known/api-catalog';
export const SERVER_CARD_PATH = '/.well-known/mcp/server-card.json';
export const ARD_PATH = '/.well-known/ard.json';
export const AI_CATALOG_PATH = '/.well-known/ai-catalog.json';
export const AGENT_SKILLS_INDEX_PATH = '/.well-known/agent-skills/index.json';

/**
 * The one published skill (#215). Its source of truth is the API repo, which
 * owns the MCP tools it describes and tests the skill against them; the site
 * serves a byte-identical copy so the index can carry a digest of bytes it
 * controls. `npm run discovery:sync-skill` refreshes the copy from `main`.
 */
export const SKILL_NAME = '3d-print-log';
export const SKILL_PATH = `/.well-known/agent-skills/${SKILL_NAME}/SKILL.md`;
/** The repo `npx skills add` installs from, and the home of the plugin manifests. */
export const SKILL_REPOSITORY = 'HoffmanEngineering/3d-print-log-api';
export const SKILL_SOURCE_URL = `https://raw.githubusercontent.com/${SKILL_REPOSITORY}/main/skills/${SKILL_NAME}/SKILL.md`;

/** Agent Skills discovery v0.2.0 identifies its index format by this URI. */
export const AGENT_SKILLS_SCHEMA =
  'https://schemas.agentskills.io/discovery/0.2.0/schema.json';
/** ARD's example media type for a skill (ARD v0.91 §4.4); not yet registered. */
export const SKILL_MEDIA_TYPE = 'application/ai-skill+md';

/** RFC 9727 §4.2: the Linkset SHOULD carry this profile parameter. */
export const API_CATALOG_CONTENT_TYPE =
  'application/linkset+json; profile="https://www.rfc-editor.org/info/rfc9727"';
/** AI Catalog spec: the catalog document's media type. */
export const AI_CATALOG_CONTENT_TYPE = 'application/ai-catalog+json';

/**
 * The IANA-registered OpenAPI media type. ARD asks for an IANA media type and
 * lists none for OpenAPI; `application/vnd.oai.openapi+json` is the one OAI
 * registered. (The API itself serves the file as plain application/json.)
 */
export const OPENAPI_MEDIA_TYPE = 'application/vnd.oai.openapi+json';
export const MCP_SERVER_CARD_MEDIA_TYPE = 'application/mcp-server-card+json';

/**
 * Must stay equal to `name` in the API repo's `server.json`, which is what the
 * MCP Registry listing (api#128) publishes, so the card and the registry entry
 * describe the same server.
 */
export const MCP_SERVER_NAME = 'com.3dprintlog/printlog';
/**
 * Mirrors `version` in the API repo's `server.json`. That version belongs to
 * the registry listing, not to API releases: it changes only when `server.json`
 * does, and the API's publish job refuses a changed `server.json` whose version
 * was not bumped. Change it here in the same breath.
 */
export const MCP_SERVER_VERSION = '1.1.0';

/**
 * Must stay equal to `description` in the API repo's `server.json`. Both the
 * Server Card schema and the MCP Registry schema cap it at 100 characters.
 */
export const MCP_DESCRIPTION =
  'Log and query 3D prints, printers, filament, and projects on 3dprintlog.com, and search its docs.';

/** The committed copy of SKILL.md that the build serves at SKILL_PATH. */
export const SKILL_MIRROR_FILE = new URL(
  `../src/well-known${SKILL_PATH.slice('/.well-known'.length)}`,
  import.meta.url
);

/** The mirrored SKILL.md, as the exact bytes the site serves. */
export function readMirroredSkill() {
  return readFileSync(SKILL_MIRROR_FILE);
}

/** `sha256:{hex}` over raw bytes, the digest format discovery v0.2.0 requires. */
export function skillDigest(bytes) {
  return `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
}

/** The skill's frontmatter `name` and `description`. */
export function readSkillFrontmatter(bytes) {
  const { data } = parseFrontmatter(bytes.toString('utf8'));
  return { name: data.name, description: data.description };
}

/**
 * The Agent Skills discovery index. One `skill-md` entry, served from this
 * origin: the digest covers bytes this repo commits, so it cannot be broken by
 * a change in another repo, only made stale.
 */
export function buildAgentSkillsIndex(skillBytes = readMirroredSkill()) {
  const { name, description } = readSkillFrontmatter(skillBytes);
  return {
    $schema: AGENT_SKILLS_SCHEMA,
    skills: [
      {
        name,
        type: 'skill-md',
        description,
        url: SKILL_PATH,
        digest: skillDigest(skillBytes),
      },
    ],
  };
}

/** RFC 9727 API catalog, Linkset format (RFC 9264). */
export function buildApiCatalog() {
  return {
    linkset: [
      {
        anchor: `${SITE_ORIGIN}${API_CATALOG_PATH}`,
        item: [
          { href: REST_API_URL },
          { href: MCP_URL },
          { href: MCP_DOCS_SERVER_URL },
        ],
      },
      {
        anchor: REST_API_URL,
        'service-desc': [{ href: OPENAPI_URL, type: OPENAPI_MEDIA_TYPE }],
        'service-doc': [{ href: API_DOCS_URL, type: 'text/html' }],
        status: [{ href: API_HEALTH_URL, type: 'text/plain' }],
      },
      {
        anchor: MCP_URL,
        'service-desc': [
          {
            href: `${SITE_ORIGIN}${SERVER_CARD_PATH}`,
            type: MCP_SERVER_CARD_MEDIA_TYPE,
          },
        ],
        'service-doc': [{ href: MCP_DOCS_URL, type: 'text/html' }],
        status: [{ href: API_HEALTH_URL, type: 'text/plain' }],
      },
      {
        // No server card of its own: a card describes one server, and the
        // docs endpoint is a subset of the one above. Its content is the
        // Markdown docs index, which is the closest thing to a description.
        anchor: MCP_DOCS_SERVER_URL,
        'service-doc': [
          { href: MCP_DOCS_URL, type: 'text/html' },
          { href: DOCS_LLMS_URL, type: 'text/plain' },
        ],
        status: [{ href: API_HEALTH_URL, type: 'text/plain' }],
      },
    ],
  };
}

/**
 * MCP Server Card. Deliberately lists no tools: clients get those from the
 * live `tools/list`, and a static copy would go stale. Auth is left out too,
 * because clients discover it from the 401 and the RFC 9728 metadata.
 */
export function buildServerCard() {
  return {
    $schema:
      'https://static.modelcontextprotocol.io/schemas/v1/server-card.schema.json',
    name: MCP_SERVER_NAME,
    title: '3D Print Log',
    description: MCP_DESCRIPTION,
    version: MCP_SERVER_VERSION,
    websiteUrl: MCP_DOCS_URL,
    repository: {
      url: 'https://github.com/HoffmanEngineering/3d-print-log-api',
      source: 'github',
    },
    remotes: [{ type: 'streamable-http', url: MCP_URL }],
  };
}

/**
 * The anonymous docs endpoint, as a Server Card. Embedded in the ARD manifest
 * only. Its name is not a registry name: the registry lists the main server,
 * whose `/mcp` carries the same docs tools.
 */
export function buildDocsServerCard() {
  return {
    $schema:
      'https://static.modelcontextprotocol.io/schemas/v1/server-card.schema.json',
    name: `${MCP_SERVER_NAME}-docs`,
    title: '3D Print Log Docs',
    description:
      'Search and read the 3D Print Log user documentation. No sign-in needed.',
    version: MCP_SERVER_VERSION,
    websiteUrl: MCP_DOCS_URL,
    repository: {
      url: 'https://github.com/HoffmanEngineering/3d-print-log-api',
      source: 'github',
    },
    remotes: [{ type: 'streamable-http', url: MCP_DOCS_SERVER_URL }],
  };
}

/**
 * The ARD manifest, also served as the legacy AI Catalog. `specVersion` and
 * `host` are AI Catalog members that ARD ignores, which is what lets one
 * document be byte-identical at both paths.
 *
 * `representativeQueries` follow the jobs in the "When to use" section of
 * src/llms.txt; ARD recommends 2 to 5 per entry.
 */
export function buildArdManifest() {
  return {
    specVersion: '1.0',
    host: {
      displayName: '3D Print Log',
      identifier: '3dprintlog.com',
      documentationUrl: `${SITE_ORIGIN}/docs/getting-started`,
    },
    entries: [
      {
        identifier: 'urn:air:3dprintlog.com:server:printlog',
        displayName: '3D Print Log',
        type: MCP_SERVER_CARD_MEDIA_TYPE,
        url: `${SITE_ORIGIN}${SERVER_CARD_PATH}`,
        description:
          'Log and query your 3D prints, printers and filament inventory.',
        tags: ['3d-printing', 'filament', 'print-log', 'mcp'],
        representativeQueries: [
          'log the print I just finished',
          'how much PLA do I have left',
          "what's my success rate on the Prusa MK4",
          'what settings did I use for my last benchy',
          'add these prints to my cosplay project',
        ],
      },
      {
        // Inline (ARD `data`) rather than a second card file: the anonymous
        // docs endpoint is listed nowhere else, and a card URL would be one
        // more document to keep in step with the API.
        identifier: 'urn:air:3dprintlog.com:server:printlog-docs',
        displayName: '3D Print Log docs',
        type: MCP_SERVER_CARD_MEDIA_TYPE,
        data: buildDocsServerCard(),
        description:
          'Search and read the 3D Print Log user documentation over MCP, ' +
          'with no sign-in.',
        tags: ['3d-printing', 'documentation', 'mcp'],
        representativeQueries: [
          'how do I connect Klipper to 3D Print Log',
          'what does 3D Print Log Pro include',
          'how do I log prints from OctoPrint automatically',
        ],
      },
      {
        identifier: 'urn:air:3dprintlog.com:api:rest',
        displayName: '3D Print Log REST API',
        type: OPENAPI_MEDIA_TYPE,
        url: OPENAPI_URL,
        description:
          'The HTTP API behind 3D Print Log, for scripts and integrations. ' +
          'Authenticate with a personal API key or an OAuth 2.0 token.',
        tags: ['3d-printing', 'filament', 'openapi', 'rest'],
        representativeQueries: [
          'export my 3D print history with a script',
          'record a print automatically when my printer finishes',
          'sync my filament spool inventory from another tool',
        ],
      },
      {
        identifier: `urn:air:3dprintlog.com:skill:${SKILL_NAME}`,
        displayName: '3D Print Log agent skill',
        type: SKILL_MEDIA_TYPE,
        url: `${SITE_ORIGIN}${SKILL_PATH}`,
        description:
          'Instructions for an agent using the 3D Print Log MCP server: which ' +
          'tools to call for each job, in what order, and what they never do.',
        tags: ['3d-printing', 'filament', 'agent-skill', 'mcp'],
        representativeQueries: [
          'log the print I just finished with the filament it used',
          'do I have enough blue PLA for a 300 g print',
          'I weighed my spool, update how much is left',
        ],
      },
    ],
  };
}

/** Pretty JSON, with a trailing newline, as committed. */
export function serialize(document) {
  return `${JSON.stringify(document, null, 2)}\n`;
}

/**
 * Each file under `src/well-known/`, keyed by its path relative to that folder
 * (which is also its path under `/.well-known/` on the site).
 */
export function buildDiscoveryFiles() {
  const ard = serialize(buildArdManifest());
  return {
    'api-catalog': serialize(buildApiCatalog()),
    'mcp/server-card.json': serialize(buildServerCard()),
    'ard.json': ard,
    'ai-catalog.json': ard,
    'agent-skills/index.json': serialize(buildAgentSkillsIndex()),
  };
}

/**
 * The site-level relations the `Link` header in `globalHeaders` must carry
 * (RFC 8288), as target to relation. Page-level alternates belong to #211.
 */
export const SITE_LINK_RELATIONS = [
  { href: API_CATALOG_PATH, rel: 'api-catalog' },
  { href: ARD_PATH, rel: 'ard' },
  // Not defined by the discovery RFC; the relation its adopters use to point
  // at the index from any page.
  { href: AGENT_SKILLS_INDEX_PATH, rel: 'agent-skills' },
  { href: OPENAPI_URL, rel: 'service-desc' },
  { href: '/llms.txt', rel: 'describedby' },
  { href: '/sitemap.xml', rel: 'sitemap' },
];

/**
 * Parse an RFC 8288 `Link` header value into `{ href, rel }` pairs. Handles
 * what this site emits (quoted or bare `rel`, other parameters ignored); it
 * is not a general-purpose parser. A `rel` with several space-separated
 * relations yields one pair per relation.
 *
 * @param {string} value
 * @returns {{ href: string, rel: string }[]}
 */
export function parseLinkHeader(value) {
  const links = [];
  // Each parameter starts at a literal `;` and runs to the next `;` or `,`, so
  // there is exactly one way to match a string (no backtracking blow-up).
  const pattern = /<([^>]*)>\s*((?:;[^;,]*)*)(?:,|$)/gy;
  const source = String(value).trim();
  let match;
  while (pattern.lastIndex < source.length) {
    pattern.lastIndex += /^\s*/.exec(source.slice(pattern.lastIndex))[0].length;
    match = pattern.exec(source);
    if (!match) {
      throw new Error(`Malformed Link header near: ${source.slice(0, 80)}`);
    }
    const rel = /;\s*rel\s*=\s*(?:"([^"]*)"|([^\s;,]+))/i.exec(match[2]);
    for (const name of (rel?.[1] ?? rel?.[2] ?? '').split(/\s+/)) {
      if (name) links.push({ href: match[1], rel: name.toLowerCase() });
    }
  }
  return links;
}
