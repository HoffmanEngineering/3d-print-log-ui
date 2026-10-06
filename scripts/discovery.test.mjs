import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { MANIFEST_JSON } from './docs-paths.mjs';
import {
  AI_CATALOG_CONTENT_TYPE,
  API_CATALOG_CONTENT_TYPE,
  API_DOCS_URL,
  API_HEALTH_URL,
  MCP_DOCS_URL,
  MCP_SERVER_CARD_MEDIA_TYPE,
  MCP_URL,
  OPENAPI_MEDIA_TYPE,
  OPENAPI_URL,
  REST_API_URL,
  SERVER_CARD_PATH,
  SITE_LINK_RELATIONS,
  buildApiCatalog,
  buildArdManifest,
  buildDiscoveryFiles,
  buildServerCard,
  parseLinkHeader,
} from './discovery-lib.mjs';
import { SITE_ORIGIN } from './marketing-routes.mjs';
import { resolveSwaRewrite, matchSwaRoute } from './swa-routes-lib.mjs';

const read = (path) =>
  readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const config = JSON.parse(read('src/staticwebapp.config.json'));
const files = buildDiscoveryFiles();

/** The first SWA route rule matching a path; SWA applies only that one. */
const ruleFor = (path) =>
  (config.routes ?? []).find((r) => matchSwaRoute(r.route, path));

/* -------------------------------------------------------------------------- */
/* Committed files                                                             */
/* -------------------------------------------------------------------------- */

test('the committed discovery files match the generator', () => {
  // Fails after editing discovery-lib.mjs without `npm run discovery:generate`,
  // or after hand-editing a generated file.
  for (const [path, expected] of Object.entries(files)) {
    assert.equal(
      read(`src/well-known/${path}`),
      expected,
      `src/well-known/${path} is stale; run npm run discovery:generate`
    );
  }
});

test('ai-catalog.json is a byte-identical copy of ard.json', () => {
  assert.equal(
    read('src/well-known/ai-catalog.json'),
    read('src/well-known/ard.json')
  );
});

test('the discovery folder ships as a build asset in every configuration', () => {
  const angular = JSON.parse(read('angular.json'));
  const build = Object.values(angular.projects)[0].architect.build;
  const assetLists = [
    build.options.assets,
    ...Object.values(build.configurations).map((c) => c.assets),
  ].filter(Boolean);
  assert.ok(assetLists.length > 0);
  for (const assets of assetLists) {
    assert.ok(
      assets.some(
        (a) =>
          typeof a === 'object' &&
          a.input === 'src/well-known' &&
          a.output === '.well-known' &&
          a.glob === '**/*'
      ),
      'src/well-known is not copied to .well-known'
    );
  }
});

test('the deploy artifact keeps the hidden .well-known folder', () => {
  // actions/upload-artifact skips dot-prefixed paths by default, which would
  // drop every discovery file between the build job and the deploy job.
  const workflow = read('.github/workflows/deploy.yml');
  const upload = /name: Upload built site\n([\s\S]*?)\n\n/.exec(workflow);
  assert.ok(upload, 'deploy.yml has no "Upload built site" step');
  assert.match(upload[1], /^\s+include-hidden-files: true$/m);
});

/* -------------------------------------------------------------------------- */
/* RFC 9727 API catalog                                                        */
/* -------------------------------------------------------------------------- */

test('api-catalog is a Linkset that lists both APIs as items', () => {
  const { linkset } = buildApiCatalog();
  assert.ok(Array.isArray(linkset));
  const index = linkset.find(
    (l) => l.anchor === `${SITE_ORIGIN}/.well-known/api-catalog`
  );
  assert.ok(index, 'no item anchored at the catalog itself');
  assert.deepEqual(
    index.item.map((i) => i.href),
    [REST_API_URL, MCP_URL]
  );
});

test('api-catalog describes the REST API with its OpenAPI, docs and status', () => {
  const rest = buildApiCatalog().linkset.find((l) => l.anchor === REST_API_URL);
  assert.deepEqual(rest['service-desc'], [
    { href: OPENAPI_URL, type: OPENAPI_MEDIA_TYPE },
  ]);
  assert.equal(rest['service-doc'][0].href, API_DOCS_URL);
  assert.equal(rest.status[0].href, API_HEALTH_URL);
});

test('api-catalog points the MCP endpoint at its server card and docs', () => {
  const mcp = buildApiCatalog().linkset.find((l) => l.anchor === MCP_URL);
  assert.deepEqual(mcp['service-desc'], [
    {
      href: `${SITE_ORIGIN}${SERVER_CARD_PATH}`,
      type: MCP_SERVER_CARD_MEDIA_TYPE,
    },
  ]);
  assert.equal(mcp['service-doc'][0].href, MCP_DOCS_URL);
});

test('every link target in the catalog is absolute https', () => {
  for (const context of buildApiCatalog().linkset) {
    assert.match(context.anchor, /^https:\/\//);
    for (const [rel, targets] of Object.entries(context)) {
      if (rel === 'anchor') continue;
      for (const { href } of targets) assert.match(href, /^https:\/\//);
    }
  }
});

test('api-catalog is served as an RFC 9727 Linkset', () => {
  // The file has no extension, so only this route rule gives it a type.
  assert.equal(
    API_CATALOG_CONTENT_TYPE,
    'application/linkset+json; profile="https://www.rfc-editor.org/info/rfc9727"'
  );
  assert.equal(
    ruleFor('/.well-known/api-catalog')?.headers?.['content-type'],
    API_CATALOG_CONTENT_TYPE
  );
});

/* -------------------------------------------------------------------------- */
/* MCP Server Card                                                             */
/* -------------------------------------------------------------------------- */

test('the server card has the fields the Server Card schema requires', () => {
  const card = buildServerCard();
  assert.equal(
    card.$schema,
    'https://static.modelcontextprotocol.io/schemas/v1/server-card.schema.json'
  );
  assert.match(card.name, /^[a-zA-Z0-9.-]+\/[a-zA-Z0-9._-]+$/);
  assert.match(card.version, /^\d+\.\d+\.\d+$/);
  // The schema caps both at 100 characters.
  assert.ok(card.description.length >= 1 && card.description.length <= 100);
  assert.ok(card.title.length <= 100);
  assert.deepEqual(card.remotes, [{ type: 'streamable-http', url: MCP_URL }]);
});

test('the server card does not list tools or auth', () => {
  // Agents trust the live tools/list; auth comes from the 401 + RFC 9728.
  const card = buildServerCard();
  for (const key of ['tools', 'resources', 'prompts', 'capabilities']) {
    assert.equal(card[key], undefined, `server card carries ${key}`);
  }
});

test('/.well-known/mcp serves the same card', () => {
  assert.equal(resolveSwaRewrite(config, '/.well-known/mcp'), SERVER_CARD_PATH);
  for (const path of ['/.well-known/mcp', SERVER_CARD_PATH]) {
    assert.equal(
      ruleFor(path)?.headers?.['content-type'],
      MCP_SERVER_CARD_MEDIA_TYPE,
      `${path} has the wrong content type`
    );
  }
});

/* -------------------------------------------------------------------------- */
/* ARD manifest                                                                */
/* -------------------------------------------------------------------------- */

test('every ARD entry has the required members and 2 to 5 queries', () => {
  const { entries } = buildArdManifest();
  assert.ok(entries.length > 0);
  const identifiers = new Set();
  for (const entry of entries) {
    assert.match(entry.identifier, /^urn:air:3dprintlog\.com:[a-z-]+:[a-z-]+$/);
    assert.ok(!identifiers.has(entry.identifier), 'duplicate identifier');
    identifiers.add(entry.identifier);
    assert.ok(entry.displayName);
    assert.match(entry.type, /^[a-z]+\/[a-z0-9.+-]+$/);
    // Exactly one of url or data.
    assert.notEqual('url' in entry, 'data' in entry);
    assert.ok(
      entry.representativeQueries.length >= 2 &&
        entry.representativeQueries.length <= 5
    );
  }
});

test('the ARD manifest points at the server card and the OpenAPI document', () => {
  const { entries, specVersion } = buildArdManifest();
  // AI Catalog requires specVersion; ARD ignores it.
  assert.equal(specVersion, '1.0');
  const mcp = entries.find((e) => e.type === MCP_SERVER_CARD_MEDIA_TYPE);
  assert.equal(mcp?.url, `${SITE_ORIGIN}${SERVER_CARD_PATH}`);
  const rest = entries.find((e) => e.type === OPENAPI_MEDIA_TYPE);
  assert.equal(rest?.url, OPENAPI_URL);
});

test('the legacy AI Catalog copy is served with its own media type', () => {
  assert.equal(
    ruleFor('/.well-known/ai-catalog.json')?.headers?.['content-type'],
    AI_CATALOG_CONTENT_TYPE
  );
});

/* -------------------------------------------------------------------------- */
/* SWA routing                                                                 */
/* -------------------------------------------------------------------------- */

test('/openapi.json redirects permanently to the API OpenAPI document', () => {
  // SWA can only rewrite to files in the app (or a linked backend under
  // /api), so it cannot proxy another host; a redirect is what it supports.
  const rule = ruleFor('/openapi.json');
  assert.equal(rule?.redirect, OPENAPI_URL);
  assert.equal(rule?.statusCode, 301);
});

test('discovery files are readable cross-origin', () => {
  for (const path of [
    '/.well-known/api-catalog',
    '/.well-known/mcp',
    SERVER_CARD_PATH,
    '/.well-known/ard.json',
    '/.well-known/ai-catalog.json',
  ]) {
    assert.equal(
      ruleFor(path)?.headers?.['access-control-allow-origin'],
      '*',
      `${path} has no CORS header`
    );
    assert.doesNotMatch(
      resolveSwaRewrite(config, path) ?? '',
      /^\/shells\//,
      `${path} is rewritten to the app`
    );
  }
});

/* -------------------------------------------------------------------------- */
/* Link header                                                                 */
/* -------------------------------------------------------------------------- */

test('parseLinkHeader reads quoted, bare and multi-valued rel parameters', () => {
  assert.deepEqual(parseLinkHeader('<a>; rel=x, <b>; type="t"; rel="y z"'), [
    { href: 'a', rel: 'x' },
    { href: 'b', rel: 'y' },
    { href: 'b', rel: 'z' },
  ]);
  assert.throws(() => parseLinkHeader('not a link'));
});

test('the Link header advertises the site-level discovery relations', () => {
  const links = parseLinkHeader(config.globalHeaders.Link);
  assert.deepEqual(links, SITE_LINK_RELATIONS);
});

test('every same-origin Link target ships with the site', () => {
  for (const { href } of SITE_LINK_RELATIONS) {
    if (!href.startsWith('/')) continue;
    if (href === '/sitemap.xml') continue; // generated at deploy time
    if (href.startsWith('/.well-known/')) {
      const name = href.slice('/.well-known/'.length);
      assert.ok(name in files, `${href} is not generated`);
    } else {
      assert.ok(read(`src${href}`).length > 0, `src${href} is missing`);
    }
  }
});

/* -------------------------------------------------------------------------- */
/* llms.txt                                                                    */
/* -------------------------------------------------------------------------- */

const llms = read('src/llms.txt');
const llmsLinks = [...llms.matchAll(/\]\((https:\/\/[^)\s]+)\)/g)].map(
  (m) => m[1]
);

test('llms.txt follows the llmstxt.org layout with agent sections', () => {
  assert.match(llms, /^# 3D Print Log\n\n> \S/);
  for (const heading of [
    'When to use 3D Print Log',
    'MCP',
    'API',
    'Docs',
    'Source',
  ]) {
    assert.match(llms, new RegExp(`^## ${heading}$`, 'm'));
  }
  // Says what it is not for, so an agent does not reach for it to drive a printer.
  assert.match(llms, /^Don't use it to control a printer/m);
});

test('llms.txt links the API, MCP and discovery surfaces', () => {
  for (const url of [
    OPENAPI_URL,
    MCP_URL,
    API_DOCS_URL,
    MCP_DOCS_URL,
    `${SITE_ORIGIN}/auth.md`,
    `${SITE_ORIGIN}${SERVER_CARD_PATH}`,
    `${SITE_ORIGIN}/.well-known/api-catalog`,
    'https://github.com/HoffmanEngineering/3d-print-log-ui',
    'https://github.com/HoffmanEngineering/3d-print-log-api',
  ]) {
    assert.ok(
      llmsLinks.some((link) => link === url),
      `llms.txt does not link ${url}`
    );
  }
});

test('llms.txt links every published docs page', () => {
  const manifest = JSON.parse(readFileSync(MANIFEST_JSON, 'utf8'));
  for (const page of manifest.pages.filter((p) => !p.dormant)) {
    const url = `${SITE_ORIGIN}/docs/${page.slug}`;
    assert.ok(
      llmsLinks.some((link) => link === url),
      `llms.txt does not link ${url}`
    );
  }
});
