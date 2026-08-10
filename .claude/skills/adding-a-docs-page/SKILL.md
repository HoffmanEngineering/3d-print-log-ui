---
name: adding-a-docs-page
description: Use when adding a new page under /docs to the 3D Print Log UI (a new documentation or onboarding article), or when a docs page renders but is missing from the sidebar, SEO metadata, sitemap, or prerender output.
---

# Adding a /docs Page

## Overview

Writing the component is trivial; the trap is **wiring**. A new doc page must be registered
in **six** places, and its route count is asserted in **three** test locations — and only one
of those runs under `npm run test:brief`. Miss one and it either 404s, fails prerender, or
(most sneakily) passes locally and fails CI.

## The six registration points

For a page at `/docs/<name>` (component `Docs<Name>Component`):

1. **Component** — create `src/app/documentation/docs/docs-<name>/docs-<name>.component.{ts,html,scss,spec.ts}`.
   Use `standalone: false`, `ChangeDetectionStrategy.OnPush`. SSR-safe: no `window`/`document`/
   `localStorage` at construction (it may prerender + render logged-out).
2. **`documentation.module.ts`** — import + add to `declarations`.
3. **`documentation-routing.module.ts`** — import + add `{ path: '<name>', component: Docs<Name>Component }`
   under the `DocumentationComponent` children.
4. **`doc-sidebar/doc-sidebar.component.ts`** — add `{ name: '…', url: '/docs/<name>' }` to `navItems`.
5. **`doc-seo.config.ts`** — add `'docs/<name>': { title, description }`. Title AND description must be
   **globally unique** (pooled with marketing routes); description length **50–170 chars**.
6. **`scripts/marketing-routes.mjs`** — add `'docs/<name>'` to `DOC_ROUTES`.
7. **`src/app/app.routes.server.ts`** — add `{ path: 'docs/<name>', renderMode: RenderMode.Prerender }`.

(Metadata/canonical/OG/Twitter/JSON-LD come automatically from `doc-seo.config.ts` via the
parent `DocumentationComponent` — you do not set them in the component.)

## The three route-count assertions (bump ALL of them)

Adding a route changes a hard-coded count in three test runners:

| File                                           | Assertion                            | Runs in `test:brief`?                   |
| ---------------------------------------------- | ------------------------------------ | --------------------------------------- |
| `src/app/documentation/doc-seo.config.spec.ts` | `expect(paths.length).toBe(N)`       | ✅ yes                                  |
| `scripts/generate-sitemap.test.mjs`            | `assert.equal(DOC_ROUTES.length, N)` | ❌ **CI only** (`npm run test:sitemap`) |
| `scripts/verify-prerender.mjs`                 | route-count summary                  | ❌ **CI only** (after prod build)       |

Bump the count and add an inclusion assertion (`…includes('docs/<name>')`) in the first two.

## Verify locally BEFORE pushing (don't trust `test:brief` alone)

```bash
npm run test:sitemap        # the assertion that will bite you in CI
npm run build               # production prerender
node scripts/verify-prerender.mjs
```

## Common mistakes

- Ran only `test:brief`, saw green, pushed → CI fails on `generate-sitemap.test.mjs`. Always run
  `test:sitemap` too.
- Duplicated a title/description → `verify-prerender` uniqueness check fails.
- Set meta tags inside the component → they belong in `doc-seo.config.ts`.
- Forgot the server-route entry → page renders in dev but isn't prerendered.
