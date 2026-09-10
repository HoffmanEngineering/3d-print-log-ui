# AGENTS.md

This file provides guidance to AI Agents like Claude Code (claude.ai/code) or Codex when working with code in this repository.

## Project Overview

3D Print Log UI - An Angular 21 web application for tracking 3D prints, printers, filaments, and print statistics. Uses Auth0 for authentication and communicates with a backend API at `printLogApiUrl`.

## Commands

```bash
npm start                  # Dev server, HTTPS on localhost:4200
npm run build:dev          # Development build
npm run build              # Production build (runs prerendering)

npm test                   # Karma watch mode
npm run test:ci            # ChromeHeadless + coverage
npm run test:brief         # Token-efficient: CI mode, failures/warnings only
npm run test:scripts       # Node tests for scripts/ (security headers, docs validation)

npm run lint               # ESLint
npm run lint:fix
npm run lint:brief         # Token-efficient: errors/warnings only

npm run e2e                # Cypress interactive
npx cypress run --spec cypress/e2e/prints/print-list-filters.cy.ts

npm run prettier           # Check formatting
npm run prettier:fix

npm run capture:home:all   # Home feature images -> src/assets/ (manual; see "Generated screenshots")
npm run capture:docs:all   # Documentation figures -> src/assets/docs/captures/
```

Prefer `test:brief` and `lint:brief` when reporting failures — they are optimized for minimal output while preserving what is actionable.

**Read the last line of `test:brief`, not the exit code.** These are meant to be piped (`npm run test:brief | tail -20`), and a shell pipeline reports the status of its _last_ command — so the exit code you see belongs to `tail`. The script prints `RESULT: PASSED` or `RESULT: FAILED (ng test exited N)` as its final line for exactly this reason. A compile error is the case that bites: Karma never reaches a `TOTAL:` line, so without that verdict the output ends in a blank summary that looks like a clean run.

**`lint-staged` formats `*.{js,css,md,ts,scss}` on commit — not `.html`.** Templates are never auto-formatted, so an edit that writes CRLF silently flips a whole file and shows up as a several-hundred-line diff with equal insertions and deletions. Run `npx prettier --write` on every template you touch. `npm run prettier` currently reports one pre-existing warning (`settings.component.html`); anything beyond that is yours.

## Architecture

`core/` holds singleton services, guards, resolvers, HTTP interceptors and stores; `shared/` holds reusable components, pipes and `SharedModule` (which re-exports Angular Material). Feature modules are lazy-loaded and named for their route. Slicer G-code parsers (Cura, PrusaSlicer, OrcaSlicer, Creality Print, Anycubic) live in `core/services/file-parsers/`.

### Authentication Flow

- Auth0 SPA SDK with token caching in localStorage
- `AuthInterceptorService` adds Bearer tokens to API requests
- `allow-anonymous-request` header bypasses authentication for public endpoints
- `AuthGuard` protects authenticated routes

### Public / Anonymous Routes (don't break these)

Routes without `AuthGuard` (e.g. `/prints/:id`, public profiles/materials) must render for logged-out visitors. A **rejected resolver cancels navigation and bounces to `/`** (#66) — and this only shows up logged-out, so it's easy to miss.

- On a public route, resolvers/services must degrade to a default/`null` for anonymous users, never throw. Fix in the **service** (also protects `ngOnInit` callers), and keep settings consumers null-tolerant (`?.value`, `?? default`). Auth-required endpoints reject with `missing_refresh_token` unless the request sets `allow-anonymous-request` **and** the API marks them `[AllowAnonymous]`.
- Test logged-out without Auth0: append `?devUserId=anonymous` (dev only; `isDevAnonymous`/`resolveDevUserId` in `core/utils/dev-user.ts`, persisted per-tab in sessionStorage). Regression pattern: `cypress/e2e/prints/public-print-anonymous.cy.ts` (a public-route E2E with no `cy.login()`).
- **Prefer a structural guarantee over a per-surface guard.** Printer photos stay off public print pages because the endpoint feeding them is authenticated-only, so an anonymous visitor's map is empty — not because seven templates each remember to check `isOwner()`.

### Route Preloading

Lazy chunks are preloaded **opt-in**, via `SelectivePreloadStrategy` (`core/routing/selective-preload.strategy.ts`) wired into `RouterModule.forRoot`.

- A route preloads only when it carries `data: { preload: true }`. Today that is `prints`, `materials`, and `printers` — the sections a signed-in user reaches first. `preload-route-matrix.spec.ts` pins that list, so widening it is a deliberate, reviewed change.
- Preloading is skipped entirely when `navigator.connection` reports `saveData` or an effective type of `slow-2g`/`2g`/`3g`, and during prerender (fetching a chunk in Node buys nothing).
- Do **not** reach for `PreloadAllModules`. It pulls every feature chunk right after first paint, including the documentation site and the d3-backed analytics bundle.
- `navigator.connection` is read through the `NETWORK_INFORMATION` injection token, which is the one guarded home for that global — see the SSR-safety note below.

### Prerendering & Sitemap (SEO)

Marketing/SEO routes are prerendered to static HTML at build time via `@angular/ssr` with `outputMode: "static"` (production config only). In `src/app/app.routes.server.ts`, marketing routes use `RenderMode.Prerender` and everything else uses `RenderMode.Client`.

- **SSR-safety (important):** prerendering executes components in Node, so any browser global (`window`, `document`, `localStorage`, `navigator`) touched during construction/init crashes the build. Guard it with `isPlatformBrowser(inject(PLATFORM_ID))`.
- **Marketing routes** are defined once in `scripts/marketing-routes.mjs`. To add a prerendered page, add it there AND in `app.routes.server.ts`.
- **Verification:** `scripts/verify-prerender.mjs` runs in CI and gates prerendered output (unique titles/descriptions, OG/Twitter, canonicals, internal link graph, crawl files).
- **Sitemap** is generated at deploy time by `scripts/generate-sitemap.mjs` (fetches public print/user IDs, writes a `<sitemapindex>` plus chunked child sitemaps into `dist/`). It is not committed; there is no static `src/sitemap.xml`.
- **Deploy** ships the prebuilt `dist` with `skip_app_build: true` (no Oryx rebuild) so the generated sitemap reaches production; `refresh-sitemap.yml` redeploys the latest release tag daily.

### Generated screenshots

Two sets of images are captured from the real app against Cypress fixtures and post-processed into hashed WebP: the home page's feature images (`src/assets/`) and the documentation figures (`src/assets/docs/captures/`). Both are committed, and **no workflow regenerates them**. Nothing compares them to the current UI either, so they go stale silently: the analytics image once advertised a page that had been deleted.

Both sets run the same harness (`cypress/support/capture.ts`) over a `CaptureSet` declared in `cypress/fixtures/demo/manifest.ts`; the spec files are three lines each.

- **If you change a view either set captures, re-run that set's capture in the same change.** Home covers the print list, the materials list and the analytics overview tab (`npm run capture:home:all`); docs covers whatever `DOC_CAPTURE_TARGETS` lists (`npm run capture:docs:all`). Commit the images, plus `src/app/home/home.component.html` for the home set (the processing step rewrites its `ngSrc`/`width`/`height`) or `src/content/docs-captures.json` for the docs set.
- **A doc figure is referenced by name, never by path:** `<doc-figure name="print-list-table" alt="…"></doc-figure>` resolves its src and both intrinsic dimensions from the generated map, so adding a figure never touches a template. `src` remains for hand-placed assets and then requires `width`/`height`. `validate-docs.mjs` fails on both-or-neither, on a `name` with no asset, and on hand-typed dimensions beside a `name`.
- **Callouts on a figure are `<doc-marker>` children, never arrows burned into the image:** `<doc-marker x="7" y="9.7" label="Title">` places a numbered disc at a **percentage** of the image box, so a recapture leaves it valid. Reach for one only when the prose sends the reader hunting for regions the surrounding UI does not distinguish — a tighter capture boundary is the cheaper fix and usually the right one.
- **The capture harness is also the only end-to-end check this repo runs by default.** It drives the real app in a real browser against fixtures, so it catches template-level failures no unit test sees. If a target that used to pass starts failing, suspect the app before the fixture.
- **`ready` steps must assert on content, not containers**, and on _decode_ rather than presence for images — `imagesRendered` counts DOM nodes, which a still-loading `<img>` already satisfies; `imagesLoaded` waits for pixels.
- Requires **Chrome**; `--force-device-scale-factor=2` is a no-op in Electron. Each capture records its boundary's CSS width, and the processing step refuses anything whose PNG-to-CSS ratio is under `MIN_DEVICE_SCALE`.
- The capture specs are excluded from the normal Cypress config — they are generators, not tests. Do not add them back to the E2E run.
- If a dev server is already running on 4200, run the two steps directly (`npm run capture:docs` then `npm run capture:docs:process`) — the `:all` variants use `wait-on`, which times out against the self-signed cert.
- Full detail and the traps already hit (minimatch globs vs unencoded `/` in query values, viewport clamping, fixture ordering that must match each list's default sort): `cypress/CLAUDE.md`.

### Security Headers & CSP

Response headers are served by Azure Static Web Apps from `src/staticwebapp.config.json` (`globalHeaders`), which ships as a build asset — SWA reads it literally, so it stays hand-edited JSON.

- **SWA injects its own defaults**, whether or not we declare any: HSTS (with `preload`), `Referrer-Policy: same-origin`, `X-Content-Type-Options: nosniff`, `X-XSS-Protection`, and `X-DNS-Prefetch-Control`. `globalHeaders` **overrides them by name**, so redeclaring one with a laxer value is a silent downgrade. `SWA_DEFAULT_HEADERS` in `scripts/security-headers-lib.mjs` records the platform baseline and a test asserts we never fall below it. Verify with `curl -sI https://www.3dprintlog.com/` before changing a value.
- **Validation:** `scripts/security-headers.test.mjs` parses the checked-in config and asserts the headers and CSP directives the app depends on. It runs in CI and at deploy via `npm run test:scripts`. `REQUIRED_CSP_SOURCES` maps each directive to the sources a real feature needs, and a test proves that removing any one of them fails — so adding a third-party origin means updating the CSP _and_ that map.
- **The CSP is report-only.** It ships as `Content-Security-Policy-Report-Only` so a missed origin degrades to a console warning rather than a broken page.
- **Two things must be solved before enforcing it**, and neither is done:
  1. There is no `report-uri`/`report-to`, so violations surface only in each visitor's own console. Collecting them needs an endpoint on the API side.
  2. **AdSense cannot be made to work by host allowlist.** Google states its ad-serving domains change and officially supports only a nonce-based strict CSP (`'nonce-…'` + `'strict-dynamic'` + `'unsafe-eval'`). The current allowlist is best-effort for the report-only stage; enforcing it as written will eventually blank ad slots.
- **Never add a nonce or hash to `script-src` while `'unsafe-inline'` is present.** CSP Level 3 makes browsers ignore `'unsafe-inline'` as soon as either appears, which would silently kill the gtag init, the pre-paint theme script, and the font `onload` handlers. `validateSecurityHeaders` fails on that combination.
- **Adding an external origin** (a new analytics vendor, embed, or API host): add it to the narrowest directive that covers it, not to `default-src`. `frame-ancestors`, `form-action`, and `base-uri` do _not_ fall back to `default-src`, which is why they are spelled out.
- The production Auth0 tenant lives in the `ENVIRONMENT_PROD_TS` secret and is not knowable from the repo, so `connect-src`/`frame-src` match it with `https://*.auth0.com`.

## Angular Conventions

Follow the patterns in `.github/copilot-instructions.md`:

- **Standalone components** are the default (do NOT set `standalone: true` explicitly)
- Use **signals** for state management with `input()`, `output()`, `computed()`
- Use **`inject()`** function instead of constructor injection
- Set `changeDetection: ChangeDetectionStrategy.OnPush`
- Use native control flow (`@if`, `@for`, `@switch`) instead of structural directives
- Use `class` and `style` bindings instead of `ngClass`/`ngStyle`
- Use **Reactive forms** over template-driven forms
- Put host bindings in the `host` object of decorators, not `@HostBinding`/`@HostListener`
- Use `NgOptimizedImage` for static images

### Signals: never write one while a computed is evaluating

Angular throws **NG0600** for a signal write during `computed()` evaluation, and the throw propagates out of the template that read it — so the failure is not a console warning, it is _the whole subtree failing to render_. A store whose getter lazily kicks off a fetch is the usual way this happens: setting a `loading` phase inside that getter is a write, and any component reading it from a `computed` takes the error. `PrinterThumbnailStore.thumbnailFor()` defers its fetch to a `queueMicrotask` for exactly this reason; that one cost a fully-green suite and a print list that rendered zero rows.

If a lazily-loading store must be readable from a computed, keep the read pure and schedule the work.

### A component input beats a `::ng-deep` override

A child's own `.thing img` rule and a parent's `::ng-deep .thing img` tie on specificity, so which wins depends on stylesheet order — which is not something a caller can rely on. When a child needs to render differently for one caller, give it an input (see `SignedImageComponent.fit`), not a CSS escape hatch.

### Loading States (skeletons, spinners, progress bars)

**Never render a busy affordance unconditionally.** Most responses land in tens of milliseconds, and a placeholder that appears and vanishes inside two frames reads as a rendering glitch, not as feedback. Every busy affordance goes through `src/app/shared/skeleton/deferred-skeleton.ts`, which enforces two thresholds — show nothing for the first 200ms, and once shown stay up for 400ms so the flash cannot just move to the boundary.

- **Observable state** (`toSignal` + `switchMap`): use `withDeferredSkeleton(LOADING_STATE)` in place of `startWith(LOADING_STATE)`. Keep it _inside_ the `switchMap` so each re-subscription gets fresh timers. Pattern: `view-print-detail.component.ts`.
- **Imperative flags** (`isLoading = true` in a `subscribe`): use `DeferredSkeletonController` — `start()` / `stop()`, read its `visible` signal, and `destroy()` on teardown. Pattern: `print-list.component.ts`.
- **Skeletons are for a FIRST paint only.** A refetch (filter, sort, page change) already has rows on screen; replacing them with grey boxes throws away the reader's place and scroll position. Split the state into `showSkeleton()` (first paint) vs `showRefreshing()` (keep the rows, dim to 0.55, `aria-busy`, `mat-progress-bar` with a negative margin so it adds no height). Gate on a `hasLoadedOnce` set **on success only**, so a failed first load still skeletons on retry.
- **A deferred placeholder needs a third state.** "No data, not loading" during the pre-skeleton window is _not_ "not found" / "empty" — gating an empty state on `!loading` will flash it on every visit. Use an explicit `idle` phase (see `PrintDetailPhase`).
- Skeletons not gated in TypeScript get the same 200ms delay for free from the `skeleton-surface` mixin's CSS reveal. If you DO gate in TypeScript, add `app-skeleton-immediate` to the container or the two delays stack.

## Testing

Jasmine + Karma with Chrome, specs co-located with source (`*.spec.ts`), unit-test environment in `src/environments/environment.unittest.ts`. Cypress E2E against `https://localhost:4200`; **E2E needs the API running in `E2ETesting` mode**, so ask before running it.

Standalone components go in TestBed `imports`, module-declared ones in `declarations`. Mock services with `jasmine.createSpyObj<T>`. Async work needs `fixture.detectChanges()` then `await fixture.whenStable()`.

**Stubbing every collaborator can hide the bug that matters.** A component's contract with a service is not just the values it returns — with signals it includes _when_ that service touches reactive state. Every spec around `PrinterAvatarComponent` stubbed the store and passed while the print list rendered nothing in a real browser (see NG0600 above). When a component depends on a service that reads or writes signals, add at least one spec that wires the **real** service with `provideHttpClientTesting`, and assert the first `detectChanges()` does not throw.

The suite also flakes under Karma's random ordering — re-run and check a failure in isolation before treating it as real.

## Analytics & Metrics

Track user actions with `loggingService.logEvent(name, properties)` and errors with `logException(error)`.

- Event names follow `ComponentName_ActionName` (e.g. `QrLabelDialog_Print`, `FilamentSearchModal_FilamentSelected`)
- Use descriptive action names: `Opened`, `Closed`, `Selected`, `Error`, `Success`
- Include relevant context in properties (counts, IDs, settings used)

## Documentation

User-facing documentation is authored as Markdown in **`src/content/docs/*.md`**. `src/app/documentation/generated/` is build output — never edit it.

- Each main page gets its own doc page (Prints, printers, filaments/materials, etc.), as does each integration (mobile app, MCP, etc.)
- Update existing documentation with new functionality; write for the user, not the developer
- Screenshots use `<doc-figure name="...">`, which resolves a generated capture. See "Generated screenshots" above.
- Validate with `node scripts/validate-docs.mjs`

### Release notes

One Markdown file per release under `src/content/release-notes/<version>.md`, with `version`, `date` and `title` frontmatter. Adding a release means adding one file — see `/release` step 4.2.

- **The anchor is generated from `version`, not from the heading.** `1.38.0.md` publishes `#v1.38.0`. A slugger would mangle the dots, and many of these ids are already bookmarked, so `validate-docs.mjs` fails if a previously published anchor stops being emitted.
- **The page shows the ten newest releases; the rest is a lazily imported chunk** built by `scripts/release-notes-emit.mjs`. That archive is injected with `[innerHTML]`, so it is rewritten first: `routerLink` becomes `href` and `<mat-icon>` becomes the ligature span, because neither directive nor component exists in markup Angular never compiled. It also has to survive Angular's sanitizer — do not add a `bypassSecurityTrust*` call to make some new shape work.
- `scripts/extract-release-notes.mjs` reads these files directly to build the GitHub Release body, before `npm ci` and before any generation runs, so it must never depend on a generated artifact.

## GitHub

Issues and PRs are managed on GitHub under `https://github.com/HoffmanEngineering` — UI repo `3d-print-log-ui`, API repo `3d-print-log-api`. Use `gh issue list`, `gh pr create`, `gh pr view`.

When asked to "work on issue #N": fetch the issue with `gh issue view N`, implement the feature, open a PR with `gh pr create`.
