import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  parseCsp,
  serializeCsp,
  REQUIRED_CSP_SOURCES,
  REQUIRED_GLOBAL_HEADERS,
  SWA_DEFAULT_HEADERS,
  validateSecurityHeaders,
} from './security-headers-lib.mjs';

/** Rebuild the config with one CSP source removed, to prove validation bites. */
function configWithout(directive, source) {
  const directives = parseCsp(csp);
  directives.set(
    directive,
    directives.get(directive).filter((s) => s !== source)
  );
  return {
    ...config,
    globalHeaders: {
      ...globalHeaders,
      'Content-Security-Policy-Report-Only': serializeCsp(directives),
    },
  };
}

const config = JSON.parse(
  readFileSync(
    new URL('../src/staticwebapp.config.json', import.meta.url),
    'utf8'
  )
);

const globalHeaders = config.globalHeaders ?? {};
const csp = globalHeaders['Content-Security-Policy-Report-Only'];

/* -------------------------------------------------------------------------- */
/* parseCsp / serializeCsp                                                     */
/* -------------------------------------------------------------------------- */

test('parseCsp splits a policy into directives and sources', () => {
  const directives = parseCsp("default-src 'self'; img-src 'self' data:");
  assert.deepEqual(directives.get('default-src'), ["'self'"]);
  assert.deepEqual(directives.get('img-src'), ["'self'", 'data:']);
});

test('parseCsp tolerates extra whitespace and a trailing semicolon', () => {
  const directives = parseCsp("  default-src   'self' ;  object-src 'none';  ");
  assert.equal(directives.size, 2);
  assert.deepEqual(directives.get('object-src'), ["'none'"]);
});

test('parseCsp lowercases directive names but preserves source case', () => {
  const directives = parseCsp('Frame-Src https://www.YouTube.com');
  assert.deepEqual(directives.get('frame-src'), ['https://www.YouTube.com']);
});

test('parseCsp keeps valueless directives as an empty source list', () => {
  const directives = parseCsp("upgrade-insecure-requests; object-src 'none'");
  assert.deepEqual(directives.get('upgrade-insecure-requests'), []);
});

test('parseCsp throws on a duplicate directive', () => {
  assert.throws(
    () => parseCsp("default-src 'self'; default-src 'none'"),
    /duplicate directive: default-src/i
  );
});

test('serializeCsp round-trips a parsed policy', () => {
  const policy =
    "default-src 'self'; img-src 'self' data:; upgrade-insecure-requests";
  assert.equal(serializeCsp(parseCsp(policy)), policy);
});

/* -------------------------------------------------------------------------- */
/* validateSecurityHeaders                                                     */
/* -------------------------------------------------------------------------- */

test('validateSecurityHeaders reports a missing globalHeaders block', () => {
  const problems = validateSecurityHeaders({ routes: [] });
  assert.ok(problems.some((p) => /globalHeaders/.test(p)));
});

test('validateSecurityHeaders reports each missing required header by name', () => {
  const problems = validateSecurityHeaders({ globalHeaders: {} });
  for (const name of Object.keys(REQUIRED_GLOBAL_HEADERS)) {
    assert.ok(
      problems.some((p) => p.includes(name)),
      `expected a problem mentioning ${name}`
    );
  }
});

test('validateSecurityHeaders reports a header whose value is wrong', () => {
  const problems = validateSecurityHeaders({
    globalHeaders: {
      ...REQUIRED_GLOBAL_HEADERS,
      'X-Content-Type-Options': 'sniff',
    },
  });
  assert.ok(
    problems.some((p) => /X-Content-Type-Options/.test(p) && /nosniff/.test(p))
  );
});

test('validateSecurityHeaders passes the checked-in config', () => {
  assert.deepEqual(validateSecurityHeaders(config), []);
});

/* -------------------------------------------------------------------------- */
/* The checked-in staticwebapp.config.json                                     */
/* -------------------------------------------------------------------------- */

test('config declares a globalHeaders block', () => {
  assert.ok(
    config.globalHeaders,
    'staticwebapp.config.json has no globalHeaders'
  );
});

test('every required non-CSP header is present with the expected value', () => {
  for (const [name, value] of Object.entries(REQUIRED_GLOBAL_HEADERS)) {
    assert.equal(globalHeaders[name], value, `header ${name}`);
  }
});

test('no header we declare is weaker than the one SWA already sends', () => {
  // globalHeaders overrides the platform defaults by name. Every value we
  // redeclare has to be at least as strict as what production sends today,
  // otherwise shipping this config is a downgrade.
  for (const [name, platformValue] of Object.entries(SWA_DEFAULT_HEADERS)) {
    const ours = REQUIRED_GLOBAL_HEADERS[name];
    if (ours === undefined) continue;

    if (name === 'Strict-Transport-Security') {
      const age = (value) => Number(/max-age=(\d+)/.exec(value)?.[1] ?? 0);
      assert.ok(
        age(ours) >= age(platformValue),
        `HSTS max-age drops from ${age(platformValue)} to ${age(ours)}`
      );
      // Dropping `preload` signals intent to leave the HSTS preload list.
      if (/preload/.test(platformValue)) {
        assert.match(ours, /preload/, 'HSTS lost the preload token');
      }
      continue;
    }

    assert.equal(ours, platformValue, `${name} must not be relaxed`);
  }
});

test('HSTS commits to at least one year and includes subdomains', () => {
  const hsts = globalHeaders['Strict-Transport-Security'];
  const maxAge = Number(/max-age=(\d+)/.exec(hsts)?.[1]);
  assert.ok(maxAge >= 31536000, `max-age ${maxAge} is under one year`);
  assert.match(hsts, /includeSubDomains/);
});

test('Permissions-Policy keeps camera available to self for the QR scanner', () => {
  // src/app/shared/qr-scanner + html5-qrcode needs getUserMedia on our own origin.
  assert.match(globalHeaders['Permissions-Policy'], /camera=\(self\)/);
});

test('Permissions-Policy denies microphone and geolocation outright', () => {
  const policy = globalHeaders['Permissions-Policy'];
  assert.match(policy, /microphone=\(\)/);
  assert.match(policy, /geolocation=\(\)/);
});

test('the CSP ships in report-only mode for this stage', () => {
  assert.ok(csp, 'no Content-Security-Policy-Report-Only header');
  assert.equal(
    globalHeaders['Content-Security-Policy'],
    undefined,
    'CSP must not be enforced yet — see issue for the staged rollout'
  );
});

test('the CSP parses and locks down the directives that cost nothing', () => {
  const directives = parseCsp(csp);
  assert.deepEqual(directives.get('object-src'), ["'none'"]);
  assert.deepEqual(directives.get('frame-ancestors'), ["'none'"]);
  assert.deepEqual(directives.get('base-uri'), ["'self'"]);
});

test('the CSP declares every directive we rely on rather than falling back to default-src', () => {
  const directives = parseCsp(csp);
  for (const name of [
    'default-src',
    'script-src',
    'style-src',
    'font-src',
    'img-src',
    'connect-src',
    'frame-src',
    'worker-src',
    'form-action',
  ]) {
    assert.ok(directives.has(name), `CSP is missing ${name}`);
  }
});

test('style-src and font-src cover the Google Fonts links in the shipped HTML', () => {
  const directives = parseCsp(csp);
  // index.prod.html is the file the production build ships -- index.html is the
  // dev entry point and does not carry the Google Ads tag.
  const indexHtml = readFileSync(
    new URL('../src/index.prod.html', import.meta.url),
    'utf8'
  );
  assert.match(indexHtml, /fonts\.googleapis\.com/);
  assert.ok(
    directives.get('style-src').includes('https://fonts.googleapis.com')
  );
  assert.ok(directives.get('font-src').includes('https://fonts.gstatic.com'));
});

test('style-src allows inline styles, which Angular Material requires', () => {
  assert.ok(parseCsp(csp).get('style-src').includes("'unsafe-inline'"));
});

test('connect-src reaches the production API and the Auth0 tenant', () => {
  const connect = parseCsp(csp).get('connect-src');
  assert.ok(connect.includes('https://api.3dprintlog.com'));
  // The prod Auth0 domain lives in the ENVIRONMENT_PROD_TS secret and is not
  // knowable here, so the tenant is matched by wildcard.
  assert.ok(connect.includes('https://*.auth0.com'));
});

test('frame-src covers the host the YouTube player actually embeds from', () => {
  // <youtube-player> leaves disableCookies false, so @angular/youtube-player
  // passes host: undefined and the IFrame API embeds www.youtube.com. Pinning
  // only the nocookie host would pass while the real player is blocked.
  const frameSrc = parseCsp(csp).get('frame-src');
  assert.ok(frameSrc.includes('https://www.youtube.com'));
});

test('script-src covers the YouTube IFrame API the docs page injects', () => {
  const docs = readFileSync(
    new URL(
      '../src/app/documentation/documentation.component.ts',
      import.meta.url
    ),
    'utf8'
  );
  assert.match(docs, /https:\/\/www\.youtube\.com\/iframe_api/);
  assert.ok(
    parseCsp(csp).get('script-src').includes('https://www.youtube.com')
  );
});

test('img-src allows the arbitrary origins Auth0 profile pictures come from', () => {
  // auth.service.ts persists Auth0's user.picture, whose host depends on the
  // identity provider (Google, Gravatar, ...).
  assert.ok(parseCsp(csp).get('img-src').includes('https:'));
});

test('validation catches a nonce smuggled into script-src-elem', () => {
  // script-src-elem overrides script-src for script elements, so a check that
  // only inspected script-src would miss this.
  const directives = parseCsp(csp);
  directives.set('script-src-elem', [
    "'self'",
    "'unsafe-inline'",
    "'nonce-abc'",
  ]);
  const problems = validateSecurityHeaders({
    ...config,
    globalHeaders: {
      ...globalHeaders,
      'Content-Security-Policy-Report-Only': serializeCsp(directives),
    },
  });

  assert.ok(
    problems.some((p) => p.includes('script-src-elem') && /nonce/.test(p)),
    'nonce in script-src-elem was not reported'
  );
});

test('validation catches an -attr override that drops unsafe-inline', () => {
  // script-src-attr takes precedence over script-src for inline event
  // handlers. index.prod.html's font links carry onload="this.media='all'",
  // so 'none' here would stop the fonts ever being applied.
  for (const name of ['script-src-attr', 'style-src-attr']) {
    const directives = parseCsp(csp);
    directives.set(name, ["'none'"]);
    const problems = validateSecurityHeaders({
      ...config,
      globalHeaders: {
        ...globalHeaders,
        'Content-Security-Policy-Report-Only': serializeCsp(directives),
      },
    });

    assert.ok(
      problems.some((p) => p.includes(name) && /unsafe-inline/.test(p)),
      `${name} dropping unsafe-inline was not reported`
    );
  }
});

test('validation catches a nonce smuggled into any inline-capable directive', () => {
  for (const name of ['script-src-attr', 'style-src-elem', 'style-src-attr']) {
    const directives = parseCsp(csp);
    directives.set(name, ["'self'", "'unsafe-inline'", "'sha512-xyz'"]);
    const problems = validateSecurityHeaders({
      ...config,
      globalHeaders: {
        ...globalHeaders,
        'Content-Security-Policy-Report-Only': serializeCsp(directives),
      },
    });

    assert.ok(
      problems.some((p) => p.includes(name) && /nonce\/hash/.test(p)),
      `hash in ${name} was not reported`
    );
  }
});

test('validation catches a script-src-elem override that drops unsafe-inline', () => {
  const directives = parseCsp(csp);
  directives.set('script-src-elem', ["'self'"]);
  const problems = validateSecurityHeaders({
    ...config,
    globalHeaders: {
      ...globalHeaders,
      'Content-Security-Policy-Report-Only': serializeCsp(directives),
    },
  });

  assert.ok(
    problems.some(
      (p) => p.includes('script-src-elem') && /unsafe-inline/.test(p)
    ),
    'script-src-elem dropping unsafe-inline was not reported'
  );
});

test('the CSP has no report-uri pointing at a host we do not control', () => {
  const directives = parseCsp(csp);
  const target = directives.get('report-uri');
  if (target) {
    for (const uri of target) {
      assert.match(uri, /^(\/|https:\/\/([a-z0-9-]+\.)*3dprintlog\.com)/);
    }
  }
});

test('script-src covers the Google Ads tag that only production HTML loads', () => {
  const indexProd = readFileSync(
    new URL('../src/index.prod.html', import.meta.url),
    'utf8'
  );
  // Production configures a Google Ads conversion tag; dev does not.
  assert.match(indexProd, /AW-\d+/);
  assert.ok(
    parseCsp(csp).get('script-src').includes('https://www.googletagmanager.com')
  );
});

test('every source a feature depends on is actually required by validation', () => {
  // Removing any one of them must be caught. Without this the rest of the
  // suite would happily pass a policy with Auth0 or telemetry deleted.
  for (const [directive, sources] of Object.entries(REQUIRED_CSP_SOURCES)) {
    for (const source of sources) {
      const problems = validateSecurityHeaders(
        configWithout(directive, source)
      );
      assert.ok(
        problems.some((p) => p.includes(directive) && p.includes(source)),
        `dropping ${source} from ${directive} was not reported`
      );
    }
  }
});

test('validation rejects mixing a nonce or hash with unsafe-inline', () => {
  // CSP Level 3 makes browsers ignore 'unsafe-inline' once either is present,
  // which would silently kill the gtag init and the pre-paint theme script.
  const directives = parseCsp(csp);
  directives.set('script-src', [
    ...directives.get('script-src'),
    "'sha256-abc123'",
  ]);
  const problems = validateSecurityHeaders({
    ...config,
    globalHeaders: {
      ...globalHeaders,
      'Content-Security-Policy-Report-Only': serializeCsp(directives),
    },
  });

  assert.ok(
    problems.some((p) => /unsafe-inline/.test(p) && /nonce\/hash/.test(p)),
    'mixing a hash with unsafe-inline was not reported'
  );
});

/* -------------------------------------------------------------------------- */
/* Regressions in the rest of the config                                       */
/* -------------------------------------------------------------------------- */

test('the app-shell rewrites and navigation fallback are untouched', () => {
  const routes = Object.fromEntries(
    config.routes.filter((r) => r.rewrite).map((r) => [r.route, r.rewrite])
  );
  assert.equal(routes['/prints'], '/shells/list-skeleton.html');
  assert.equal(routes['/materials'], '/shells/list-skeleton.html');
  assert.equal(routes['/filament'], '/shells/list-skeleton.html');
  assert.equal(routes['/printers'], '/shells/list-skeleton.html');
  assert.equal(config.navigationFallback.rewrite, '/shells/app-shell.html');
});

test('the shells route still opts out of caching', () => {
  const shells = config.routes.find((r) => r.route === '/shells/*');
  assert.equal(shells.headers['cache-control'], 'no-cache');
});
