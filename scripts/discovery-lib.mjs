/**
 * The machine-readable discovery files served from https://www.3dprintlog.com
 * (#210), built from one set of constants so the URLs they share cannot drift.
 *
 *   /.well-known/api-catalog               RFC 9727 API catalog (Linkset)
 *   /.well-known/mcp/server-card.json      MCP Server Card (SEP-2127)
 *   /.well-known/mcp                       the same card (rewritten in SWA)
 *   /.well-known/ard.json                  Agentic Resource Discovery manifest
 *   /.well-known/ai-catalog.json           byte-identical legacy copy of ard.json
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
 */
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

export const API_DOCS_URL = `${SITE_ORIGIN}/docs/api`;
export const MCP_DOCS_URL = `${SITE_ORIGIN}/docs/mcp`;

export const API_CATALOG_PATH = '/.well-known/api-catalog';
export const SERVER_CARD_PATH = '/.well-known/mcp/server-card.json';
export const ARD_PATH = '/.well-known/ard.json';
export const AI_CATALOG_PATH = '/.well-known/ai-catalog.json';

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
/** Mirrors `version` in the API repo's `server.json`. */
export const MCP_SERVER_VERSION = '1.0.0';

/**
 * The Server Card schema caps `description` at 100 characters, so this is
 * shorter than the description in the API repo's `server.json`.
 */
export const MCP_DESCRIPTION =
  'Log and query your 3D prints, printers, filament inventory, and projects on 3dprintlog.com.';

/** RFC 9727 API catalog, Linkset format (RFC 9264). */
export function buildApiCatalog() {
  return {
    linkset: [
      {
        anchor: `${SITE_ORIGIN}${API_CATALOG_PATH}`,
        item: [{ href: REST_API_URL }, { href: MCP_URL }],
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
  };
}

/**
 * The site-level relations the `Link` header in `globalHeaders` must carry
 * (RFC 8288), as target to relation. Page-level alternates belong to #211.
 */
export const SITE_LINK_RELATIONS = [
  { href: API_CATALOG_PATH, rel: 'api-catalog' },
  { href: ARD_PATH, rel: 'ard' },
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
  const pattern = /<([^>]*)>((?:\s*;\s*[^;,]+)*)\s*(?:,|$)/gy;
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
