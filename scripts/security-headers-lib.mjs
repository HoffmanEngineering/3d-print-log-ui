/**
 * Helpers for the response headers Azure Static Web Apps serves from
 * `src/staticwebapp.config.json`.
 *
 * The config file is the single source of truth — SWA reads it literally, so it
 * stays hand-edited JSON. This module exists so `security-headers.test.mjs` can
 * assert something stronger than "the file has some headers in it": it parses
 * the policy and checks the directives we actually depend on.
 */

/**
 * Parse a Content-Security-Policy value into a `Map` of directive name to
 * source list. Directive names are lowercased (they are case-insensitive);
 * sources are left alone, because host sources can be case-sensitive in paths.
 *
 * @param {string} value
 * @returns {Map<string, string[]>}
 */
export function parseCsp(value) {
  const directives = new Map();

  for (const raw of String(value).split(';')) {
    const parts = raw.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) continue;

    const name = parts[0].toLowerCase();
    if (directives.has(name)) {
      throw new Error(`Invalid CSP — duplicate directive: ${name}`);
    }
    directives.set(name, parts.slice(1));
  }

  return directives;
}

/**
 * Inverse of {@link parseCsp}. Round-trips a policy so a caller can normalize
 * one without hand-joining strings.
 *
 * @param {Map<string, string[]>} directives
 * @returns {string}
 */
export function serializeCsp(directives) {
  return [...directives]
    .map(([name, sources]) =>
      sources.length ? `${name} ${sources.join(' ')}` : name
    )
    .join('; ');
}

/**
 * Headers Azure Static Web Apps injects on its own, verified against
 * https://www.3dprintlog.com. Setting `globalHeaders` *overrides* these by
 * name, so anything we redeclare must be at least as strict as what the
 * platform already sends. This constant exists so a test can prove we never
 * regress one by accident.
 *
 * X-XSS-Protection and X-DNS-Prefetch-Control are also injected; we leave both
 * alone rather than redeclare them (the former is deprecated and superseded by
 * the CSP).
 */
export const SWA_DEFAULT_HEADERS = {
  'Strict-Transport-Security': 'max-age=10886400; includeSubDomains; preload',
  'Referrer-Policy': 'same-origin',
  'X-Content-Type-Options': 'nosniff',
};

/**
 * The non-CSP headers every response must carry, with their exact expected
 * values. Kept as literals rather than matchers so a reviewer can read the
 * shipped policy straight out of this file.
 *
 * HSTS keeps the `preload` token SWA already sends -- dropping it would signal
 * intent to leave the preload list -- and raises max-age to a year, which is
 * the minimum the preload list actually requires. The platform default of
 * 10886400 (126 days) does not qualify.
 *
 * Referrer-Policy stays at SWA's `same-origin` rather than the more common
 * `strict-origin-when-cross-origin`: it sends no referrer at all cross-origin,
 * which is stricter, and the site already runs on it.
 */
export const REQUIRED_GLOBAL_HEADERS = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'same-origin',
  'X-Frame-Options': 'DENY',
  'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
  'Permissions-Policy': [
    'accelerometer=()',
    'autoplay=(self "https://www.youtube.com" "https://www.youtube-nocookie.com")',
    'camera=(self)',
    'display-capture=()',
    'encrypted-media=(self "https://www.youtube.com" "https://www.youtube-nocookie.com")',
    'fullscreen=(self "https://www.youtube.com" "https://www.youtube-nocookie.com")',
    'geolocation=()',
    'gyroscope=()',
    'magnetometer=()',
    'microphone=()',
    'payment=()',
    'usb=()',
  ].join(', '),
};

/**
 * Check a parsed `staticwebapp.config.json` for the headers and CSP directives
 * this app depends on.
 *
 * @param {object} config
 * @returns {string[]} human-readable problems; empty means the config is good.
 */
export function validateSecurityHeaders(config) {
  const problems = [];
  const headers = config?.globalHeaders;

  if (!headers || typeof headers !== 'object') {
    problems.push('staticwebapp.config.json has no globalHeaders block');
    return problems;
  }

  for (const [name, expected] of Object.entries(REQUIRED_GLOBAL_HEADERS)) {
    if (!(name in headers)) {
      problems.push(`missing required header: ${name}`);
    } else if (headers[name] !== expected) {
      problems.push(
        `header ${name} is "${headers[name]}", expected "${expected}"`
      );
    }
  }

  const reportOnly = headers['Content-Security-Policy-Report-Only'];
  if (!reportOnly) {
    problems.push(
      'missing required header: Content-Security-Policy-Report-Only'
    );
    return problems;
  }

  let directives;
  try {
    directives = parseCsp(reportOnly);
  } catch (error) {
    problems.push(
      `Content-Security-Policy-Report-Only is malformed: ${error.message}`
    );
    return problems;
  }

  for (const name of REQUIRED_CSP_DIRECTIVES) {
    if (!directives.has(name)) {
      problems.push(`CSP is missing the ${name} directive`);
    }
  }

  for (const [name, expected] of Object.entries(PINNED_CSP_DIRECTIVES)) {
    const actual = directives.get(name);
    if (actual && actual.join(' ') !== expected) {
      problems.push(
        `CSP ${name} is "${actual.join(' ')}", expected "${expected}"`
      );
    }
  }

  for (const [name, sources] of Object.entries(REQUIRED_CSP_SOURCES)) {
    const actual = directives.get(name) ?? [];
    for (const source of sources) {
      if (!actual.includes(source)) {
        problems.push(`CSP ${name} is missing ${source}`);
      }
    }
  }

  // CSP Level 3: a nonce or hash makes browsers ignore 'unsafe-inline' in the
  // same directive. Mixing them silently disables every inline script that is
  // not itself hashed -- the gtag init, the pre-paint theme script, and the
  // font onload handlers.
  //
  // Checked across the -elem/-attr variants too, because script-src-elem
  // *overrides* script-src for script elements: adding a nonce there would slip
  // past a check that only looked at script-src.
  for (const name of INLINE_CAPABLE_DIRECTIVES) {
    const sources = directives.get(name);
    if (!sources?.includes("'unsafe-inline'")) {
      continue;
    }
    if (sources.some((source) => NONCE_OR_HASH.test(source))) {
      problems.push(
        `CSP ${name} mixes 'unsafe-inline' with a nonce/hash; CSP Level 3 ` +
          "ignores 'unsafe-inline' when either is present"
      );
    }
  }

  // A -elem override that drops 'unsafe-inline' has the same effect as mixing:
  // the inline scripts the app ships stop running under enforcement.
  for (const [name, base] of Object.entries(ELEM_OVERRIDES)) {
    const override = directives.get(name);
    if (!override) {
      continue;
    }
    if (
      directives.get(base)?.includes("'unsafe-inline'") &&
      !override.includes("'unsafe-inline'")
    ) {
      problems.push(
        `CSP ${name} overrides ${base} but drops 'unsafe-inline', which the ` +
          'inline scripts in index.prod.html depend on'
      );
    }
  }

  return problems;
}

/**
 * Directives that must be spelled out rather than inherited from `default-src`.
 * Fetch directives that do *not* fall back to `default-src` (`frame-ancestors`,
 * `form-action`, `base-uri`) are the reason this list is explicit.
 */
export const REQUIRED_CSP_DIRECTIVES = [
  'default-src',
  'script-src',
  'style-src',
  'font-src',
  'img-src',
  'connect-src',
  'frame-src',
  'frame-ancestors',
  'worker-src',
  'form-action',
  'base-uri',
  'object-src',
];

/**
 * Sources each directive must keep, and the feature that breaks without them.
 *
 * This is the part of validation with teeth: without it a reviewer can delete
 * an origin from the policy and every test still passes, because the rest of
 * the suite only compares the config against constants in this same file.
 *
 * Google's hosts were confirmed by capturing the network on
 * https://www.3dprintlog.com. Note CSP host wildcards require at least one
 * leading label, so `*.analytics.google.com` does NOT match the bare
 * `analytics.google.com` that gtag actually beacons to.
 */
export const REQUIRED_CSP_SOURCES = {
  'script-src': [
    "'self'",
    // AdSense and the gtag/Google Ads snippets are inline or inject inline.
    "'unsafe-inline'",
    'https://www.googletagmanager.com',
    'https://pagead2.googlesyndication.com',
    'https://www.googleadservices.com',
    // Google's CSP guidance lists www.google.com under script-src-elem for the
    // Conversion Linker and remarketing tags, not just as a beacon target.
    'https://www.google.com',
    // documentation.component.ts injects https://www.youtube.com/iframe_api.
    'https://www.youtube.com',
  ],
  'style-src': [
    "'self'",
    // Angular Material writes inline styles.
    "'unsafe-inline'",
    'https://fonts.googleapis.com',
  ],
  'font-src': ["'self'", 'https://fonts.gstatic.com'],
  // blob: for auth-image.pipe's createObjectURL, data: for generated QR codes,
  // and bare https: because Auth0 hands back `user.picture` on whatever origin
  // the identity provider uses (auth.service.ts stores it as profilePicture).
  'img-src': ["'self'", 'data:', 'blob:', 'https:'],
  'connect-src': [
    "'self'",
    'https://api.3dprintlog.com',
    // The prod Auth0 tenant lives in the ENVIRONMENT_PROD_TS secret.
    'https://*.auth0.com',
    // Print and project images.
    'https://*.blob.core.windows.net',
    // Application Insights.
    'https://dc.services.visualstudio.com',
    'https://*.in.applicationinsights.azure.com',
    // GA4 / Google Ads beacons, all observed live.
    'https://analytics.google.com',
    'https://www.google.com',
    'https://www.googletagmanager.com',
    // Conversion, remarketing and linker traffic.
    'https://www.googleadservices.com',
    'https://*.doubleclick.net',
    'https://*.googlesyndication.com',
  ],
  'frame-src': [
    // <youtube-player> leaves disableCookies at its false default, so the
    // Angular component passes host: undefined and the IFrame API embeds from
    // www.youtube.com -- NOT the nocookie host, which is only allowlisted so
    // setting disableCookies later does not break.
    'https://www.youtube.com',
    // GTM injects iframes for some tag types.
    'https://www.googletagmanager.com',
    // NOTE: https://*.auth0.com is in the policy but deliberately NOT pinned
    // here. Auth0 only frames for silent auth when useRefreshTokensFallback is
    // on, and auth.service.ts leaves it at the SDK default of false, so it is
    // headroom -- pinning it would contradict that.
  ],
  // The G-code viewer spawns a same-origin worker
  // (src/assets/js/gcode-viewer/ui.js:454), so 'self' is a real dependency.
  // The blob: in the policy is headroom: html5-qrcode's createObjectURL calls
  // produce image elements, which img-src blob: covers, not workers.
  'worker-src': ["'self'"],
  // Stripe checkout and the billing portal are reached with
  // `window.location.href = result.url`, a top-level navigation that
  // form-action does not govern at all. Only 'self' is a real dependency; the
  // Stripe hosts stay in the policy in case a real form post is ever added.
  'form-action': ["'self'"],
};

/** Matches a CSP nonce or hash source expression. */
const NONCE_OR_HASH = /^'(nonce|sha(256|384|512))-/;

/** Directives where 'unsafe-inline' is meaningful and can be cancelled out. */
const INLINE_CAPABLE_DIRECTIVES = [
  'script-src',
  'script-src-elem',
  'script-src-attr',
  'style-src',
  'style-src-elem',
  'style-src-attr',
];

/**
 * Directives that take precedence over a broader one for their resource kind.
 *
 * All four matter for this app, which is why none of them may drop
 * 'unsafe-inline' while the base directive still carries it:
 *   -elem  index.prod.html ships two inline <script> elements (the pre-paint
 *          theme swap and the gtag config), and Angular injects component CSS
 *          as <style> elements at runtime.
 *   -attr  the font <link>s carry onload="this.media='all'", and Angular style
 *          bindings and Material write inline style attributes.
 */
const ELEM_OVERRIDES = {
  'script-src-elem': 'script-src',
  'script-src-attr': 'script-src',
  'style-src-elem': 'style-src',
  'style-src-attr': 'style-src',
};

/** Directives whose value is a security decision, not a compatibility one. */
export const PINNED_CSP_DIRECTIVES = {
  'object-src': "'none'",
  'frame-ancestors': "'none'",
  'base-uri': "'self'",
};
