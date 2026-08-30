// Pure transforms to derive a non-hydrated loading shell from the built index.
// String-based (no HTML parser dependency), matching the repo's script style.
// The exact artifact shapes are confirmed by the Task 1 spike.

export function replaceAppRoot(html, bodyHtml) {
  // Replace the ENTIRE <app-root ...>...</app-root> element (drops ngh, _nghost,
  // ng-version, ng-server-context, and all prerendered DOM in one move).
  return html.replace(
    /<app-root\b[^>]*>[\s\S]*?<\/app-root>/i,
    `<app-root>${bodyHtml}</app-root>`
  );
}

export function stripSsrArtifacts(html) {
  let out = html;
  // Transfer-state hydration payload.
  out = out.replace(
    /<script\b[^>]*\bid=["']ng-state["'][\s\S]*?<\/script>/gi,
    ''
  );
  // Hydration marker comment.
  out = out.replace(/<!--nghm-->/g, '');
  // Event-replay bootstrap: inline (no src) script carrying an Angular hydration
  // token (confirmed in Task 1: __jsaction / __nghData). The inner
  // `(?:(?!<\/script>)[\s\S])*?` guards prevent the match from crossing a
  // </script> boundary and swallowing unrelated scripts/markup in between.
  out = out.replace(
    /<script\b(?![^>]*\bsrc=)[^>]*>(?:(?!<\/script>)[\s\S])*?(?:__jsaction|ngContracts|__nghData__)(?:(?!<\/script>)[\s\S])*?<\/script>/gi,
    ''
  );
  // SSR-injected component critical CSS.
  out = out.replace(
    /<style\b[^>]*\bng-app-id=["']ng["'][\s\S]*?<\/style>/gi,
    ''
  );
  // Flex-layout SSR styles.
  out = out.replace(
    /<style\b[^>]*\bclass=["']flex-layout-ssr["'][\s\S]*?<\/style>/gi,
    ''
  );
  return out;
}

export function setHeadMetadata(html, { title, description }) {
  let out = html;
  out = out.replace(/<title>[\s\S]*?<\/title>/i, `<title>${title}</title>`);
  out = out.replace(
    /<meta\s+name=["']description["'][^>]*>/i,
    `<meta name="description" content="${description}">`
  );
  // Drop Home identity metadata.
  out = out.replace(/<link\b[^>]*\brel=["']canonical["'][^>]*>/gi, '');
  out = out.replace(
    /<meta\b[^>]*\b(?:property=["']og:|name=["']twitter:)[^>]*>/gi,
    ''
  );
  out = out.replace(
    /<script\b[^>]*type=["']application\/ld\+json["'][\s\S]*?<\/script>/gi,
    ''
  );
  // Add noindex once, before </head>.
  if (!/name=["']robots["']/i.test(out)) {
    out = out.replace(
      /<\/head>/i,
      '<meta name="robots" content="noindex"><meta name="googlebot" content="noindex"></head>'
    );
  }
  return out;
}

export function buildShell(indexHtml, { bodyHtml, title, description }) {
  let out = replaceAppRoot(indexHtml, bodyHtml);
  out = stripSsrArtifacts(out);
  out = setHeadMetadata(out, { title, description });
  return out;
}

export function findSsrArtifacts(html) {
  const checks = [
    ['ngh', /\bngh=/],
    ['_nghost', /_nghost/],
    ['ng-version', /\bng-version=/],
    ['ng-server-context', /\bng-server-context=/],
    ['ng-state', /\bid=["']ng-state["']/],
    ['nghm-comment', /<!--nghm-->/],
    ['event-replay', /(?:__jsaction|ngContracts|__nghData__)/],
    ['ng-app-id-style', /<style\b[^>]*\bng-app-id=/i],
    ['flex-layout-ssr', /flex-layout-ssr/],
    ['home-content', /Home page content/],
  ];
  return checks.filter(([, re]) => re.test(html)).map(([name]) => name);
}

export function localAssetRefs(html) {
  const refs = [];
  const re = /\b(?:src|href)=["']([^"']+)["']/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const url = m[1];
    if (
      url.startsWith('data:') ||
      url.startsWith('#') ||
      url.startsWith('mailto:')
    )
      continue;
    if (/^[a-z]+:\/\//i.test(url) || url.startsWith('//')) continue; // external/absolute
    refs.push(url);
  }
  return refs;
}

export function resolveBrowserDir(angularJson) {
  const project = Object.values(angularJson.projects)[0];
  const base = project.architect.build.options.outputPath.base;
  return `${base}/browser`;
}
