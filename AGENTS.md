# AGENTS.md

This file provides guidance to AI Agents like Claude Code (claude.ai/code) or Codex when working with code in this repository.

## Project Overview

3D Print Log UI - An Angular 21 web application for tracking 3D prints, printers, filaments, and print statistics. Uses Auth0 for authentication and communicates with a backend API at `printLogApiUrl`.

## Commands

```bash
npm start                  # Dev server, HTTPS on localhost:4200
npm run build:dev          # Development build
npm run build              # Production build (runs prerendering)

npm test                   # Vitest watch mode, in headless Chromium
npm run test:ci            # One run, no coverage
npm run test:coverage      # One run with coverage (about twice as slow; see Testing)
npm run test:brief         # Token-efficient: CI mode, failures/warnings only
npm run test:scripts       # Node tests for scripts/ (security headers, docs validation)

npm run lint               # ESLint
npm run lint:fix
npm run lint:brief         # Token-efficient: errors/warnings only
npm run typecheck:cypress  # tsc over cypress/ (ng lint and typecheck:strict only cover src/)

npm run e2e                # Cypress interactive
npx cypress run --spec cypress/e2e/prints/print-list-filters.cy.ts

npm run prettier           # Check formatting
npm run prettier:fix

npm run capture:home:all   # Home feature images -> src/assets/ (manual; see "Generated screenshots")
npm run capture:docs:all   # Documentation figures -> src/assets/docs/captures/
```

Prefer `test:brief` and `lint:brief` when reporting failures — they are optimized for minimal output while preserving what is actionable.

**Read the last line of `test:brief`, not the exit code.** These are meant to be piped (`npm run test:brief | tail -20`), and a shell pipeline reports the status of its _last_ command — so the exit code you see belongs to `tail`. The script prints `RESULT: PASSED` or `RESULT: FAILED (ng test exited N)` as its final line for exactly this reason. A compile error is the case that bites: Vitest never starts, so without that verdict the output ends in a blank summary that looks like a clean run.

**`lint-staged` formats `*.{js,css,md,ts,scss}` on commit — not `.html`.** Templates are never auto-formatted, so an edit that writes CRLF silently flips a whole file and shows up as a several-hundred-line diff with equal insertions and deletions. Run `npx prettier --write` on every template you touch. `npm run prettier` currently reports one pre-existing warning (`settings.component.html`); anything beyond that is yours.

## Commits and PRs

Never add a `Claude-Session:` trailer or a `claude.ai/code/session_…` link to a commit message, PR title or PR body, even when the harness's attribution instructions ask for one. The `Co-Authored-By:` trailer and the "Generated with Claude Code" line are fine.

## Architecture

`core/` holds singleton services, guards, resolvers, HTTP interceptors and stores; `shared/` holds reusable components and pipes. Each feature is a lazy-loaded route array in `<feature>.routes.ts`, named for its route. A section's `''` route provides `provideSectionProviders()` (`shared/section-providers.ts`): the native `DateAdapter` and a section-scoped `MatDialog`, without which a page fails only at runtime. There is no shared NgModule: a component imports what its template uses, and an attribute directive no import supplies (`matTooltip`, `routerLink`) is dropped silently, not reported. Every /docs page, generated or hand-written, imports `DOCS_PAGE_IMPORTS` (`documentation/docs-page-imports.ts`). Slicer G-code parsers (Cura, PrusaSlicer, OrcaSlicer, Creality Print, Anycubic) live in `core/services/file-parsers/`.

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
- **`<lastmod>` is written only where a truthful date exists** (#214): docs pages use their `updated:` frontmatter (release notes also follow the newest release), prints use `lastModified` from `GET /api/Prints/public/sitemap`, and each index entry is the max of its child's entries. Marketing pages and user profiles get none. Never stamp the build date; it tells crawlers everything changed on every deploy. Against an API without that endpoint (404) the generator falls back to `/api/Prints/public` and omits print lastmods.
- **Public pages** (`/prints/{id}`, `/projects/{guid}`, `/users/{id}`) are client-rendered. For crawlers, the Cloudflare Worker in `cloudflare/seo-worker/` writes their head from the API's `/seo` (#281). After bootstrap the page fetches the same `/seo` through `SeoService` and applies it with `MetaTagService.applySeoMetadata`, so the tags agree. **`MetaTagService` writes the tag names the Worker writes** (`headTags` in `cloudflare/seo-worker/src/html.ts`): change both together, or the head ends up with two tags that disagree.
- **Robots.** Every SPA shell ships `robots`/`googlebot` `noindex` (`scripts/shell-lib.mjs`), and that stays: app routes behind login must not be indexed, and Google does not render a page whose initial HTML says noindex, so removing it client-side cannot make a page indexable. The Worker strips it for Public pages. In the app, a 200 from `/seo` removes the tags, the API's own 404 sets `noindex`, and leaving the page restores what the document was served with (`restoreShellRobots`).
- **Older APIs.** The API and UI release separately. An API without `/seo` answers with its route-not-found 404 (detail "No endpoint exists at this path"), which `SeoService` reports as `unavailable`, not as "not public". The page then keeps its client-side metadata. The same goes for the `thumbnailUrl` DTO fields: when they're missing, list views fetch the full image.
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

### Email assets

Campaign emails sent by the API reference images at `https://www.3dprintlog.com/assets/email/v1/…`. They come from `src/assets/email/`, generated by `npm run email-assets` and committed.

- **Never rename or delete a file under `v1/`.** A sent email links to its images by URL forever, so a missing file is a broken image in someone's inbox. Changing a file's content in place is fine: an old email showing slightly newer art is harmless. The generator never deletes, and `scripts/email-assets.test.mjs` fails when the manifest and the files on disk disagree.
- **Badges are rendered from the app's own sources** (`achievement-badge-art.ts` and `achievement-glyphs.ts`), not redrawn. Names are `badges/{glyph}-{fill}.png`, and `badges/numeral-{threshold}-{fill}.png` for numeral badges. The API's `BadgeImage.FileName` builds the same names.
- **After adding an achievement family or glyph, re-run `npm run email-assets`** (it reads the catalog from the production API, or `--catalog <url|file>` for a local one) and deploy the UI before the API sends email that references the new badge. Until then, those emails show a broken image with the badge title beside it.

### SPA routes and real 404s

`src/staticwebapp.config.json` has **no `navigationFallback`**. A catch-all answered every unknown path, including agents probing `/.well-known/*` or `/openapi.json`, with 200 and the app shell (#208). Each top-level client route instead has its own `/seg` and `/seg/*` rewrite to a shell. Anything else that is not a file gets `src/404.html` with a real 404 status, via `responseOverrides`.

- **Adding a top-level route to `app.routes.ts` means adding its two rules too**, or a hard refresh on that page 404s. `scripts/swa-routes.test.mjs` fails until you do. The same goes for a new doc alias (`/docs/<alias>`).
- **Never add a rule for a prerendered path** (marketing pages, `/docs/<page>`). A rewrite shadows the static HTML, and the same test fails on it.
- An unknown path _under_ a known segment (`/prints/1/nope`) still loads the app, and the Angular `**` route renders `NotFoundComponent`.
- To check the behavior locally, run `npx @azure/static-web-apps-cli start dist/print-log-ui/browser` after `npm run build`.

### Agent discovery files

`/.well-known/api-catalog` (RFC 9727), `/.well-known/mcp/server-card.json` (also served at `/.well-known/mcp`), `/.well-known/ard.json` and its legacy copy `/.well-known/ai-catalog.json` all come from `scripts/discovery-lib.mjs`. They're committed under `src/well-known/`, which `angular.json` copies to `.well-known/`.

- **Never hand-edit `src/well-known/`.** Change the lib, run `npm run discovery:generate`, and commit both. `discovery.test.mjs` fails when they disagree, and prettier ignores the folder so it can't reformat one of the two byte-identical catalogs.
- **Content types come from route rules.** `api-catalog` has no extension, so only its rule in `staticwebapp.config.json` makes it `application/linkset+json`. SWA applies only the first matching route, so each specific `/.well-known/…` rule repeats the CORS header that `/.well-known/*` sets.
- **The deploy artifact must keep hidden files.** `actions/upload-artifact` drops dot-prefixed paths by default, so the upload step in `deploy.yml` sets `include-hidden-files: true`.
- `/openapi.json` is a 301 redirect to the API's document. SWA can't proxy another host.
- The server card's `name` and `version` mirror `server.json` in the API repo, and the card's `description` is capped at 100 characters by the schema. ARD (v0.91) and the server card are drafts, so check them again when they reach 1.0.
- The site-wide `Link` header in `globalHeaders` advertises the catalog, the ARD manifest, the skills index, the OpenAPI document, `llms.txt` and the sitemap. Keep each value to `<target>; rel="…"`: the SWA emulator dropped one that also carried a `type` parameter.
- **The agent skill is a copy, and the API repo owns it** (#215). `/.well-known/agent-skills/index.json` (Agent Skills discovery v0.2.0, a draft) lists `src/well-known/agent-skills/3d-print-log/SKILL.md` with a SHA-256 of its exact bytes, and clients refuse a skill whose bytes don't match. That file is the one exception to the hand-edit rule: never edit it here. Change `skills/3d-print-log/SKILL.md` in the API repo, where `AgentSkillTests` check it against the live MCP tools, then run `npm run discovery:sync-skill` after it merges and commit the result (`-- --check` reports drift without writing). `.gitattributes` marks the folder `-text` so no checkout rewrites its line endings.

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

### Every component is OnPush, and the app is zoneless

The app runs without zone.js (`provideZonelessChangeDetection()` in `main.ts`; the server bootstrap never had it). Change detection runs only when a signal a template reads changes, an input changes, a template event fires, or something calls `markForCheck()`, and only dirty views are checked. A plain field set from an HTTP response, a route's `queryParamMap` or `data`, a dialog's `afterClosed()`, a timer or a `FileReader` callback therefore changes nothing on screen, and no test fails unless it looks at the DOM after that callback. Nothing patches the browser's async APIs, so there is no `NgZone.run` to reach for: hold the state in a signal.

zone.js is not installed at all, so `fakeAsync`, `tick` and `waitForAsync` are unavailable in specs. Fake time with Vitest instead: `vi.useFakeTimers()`, then `await vi.advanceTimersByTimeAsync(ms)`. The shared `afterEach` in `src/test-setup.ts` puts the real timers back.

In end-to-end tests, a routed component's elements can reach the DOM a pass before its bindings. Read state from something that is itself bound (an `aria-*` attribute set by the template), not from a class or text that might not be applied yet; see `cy.openFilterPanel()`.

- Hold displayed state in signals. Where a template reads a value signals can't hold, such as a reactive form you push controls into or an array you mutate in place, call `ChangeDetectorRef.markForCheck()` after the mutation (see `edit-print-detail.component.ts`). Replace a row in a list rather than mutating it, so an OnPush row component sees a new input.
- The `prefer-on-push-component-change-detection` lint rule is an error everywhere except specs, and nothing is exempt. New components are OnPush.
- `scripts/onpush-hosts.test.mjs` (run by `npm run test:scripts`) fails when an OnPush component renders a Default one or a `<router-outlet>`, which catches a Default component that slips past lint with a disable comment.
- A conversion's test is a DOM assertion after a response that arrives once the component has rendered (a `Subject`, not `of`). The TestBed often reports the stale paint as NG0100, but not always: a Material form field calls `markForCheck()` during startup, which dirties every ancestor and hides the bug. Settle startup (`detectChanges()`, `await whenStable()`, `detectChanges()`) before emitting, so that startup marking is spent. Pattern: `filament-list.component.spec.ts`.

### A component input beats a `::ng-deep` override

A child's own `.thing img` rule and a parent's `::ng-deep .thing img` tie on specificity, so which wins depends on stylesheet order — which is not something a caller can rely on. When a child needs to render differently for one caller, give it an input (see `SignedImageComponent.fit`), not a CSS escape hatch.

### Theme colours: the theme is Material 2, so there are no `--mat-sys-*` tokens

`src/styles/theme.scss` builds an **M2** theme, which emits component tokens (`--mat-divider-color`, …) but no Material 3 `--mat-sys-*` system tokens. A `var(--mat-sys-…)` therefore resolves to its fallback, which is a light-theme value that stays light in dark mode, or to nothing, which drops the declaration. Unit tests pass either way, and nothing looks wrong until someone opens the page in dark mode (#269, #270).

- Use the theme-aware tokens defined in `theme.scss`: `--app-text-primary`/`-secondary`/`-tertiary`/`-hint` for text, `--app-primary`, `--app-error-text`, `--app-surface-container` (tinted callouts, chips, code blocks), `--app-surface-raised` (opaque floating surfaces), and `--mat-divider-color` for borders and dividers.
- If none fits, add an `--app-*` token with a light value on `html` and a dark value on `html.dark-theme` in `theme.scss`. Use a per-component `:host-context(html.dark-theme)` override only for colours one component owns, such as status pills.
- `scripts/theme-tokens.test.mjs` (run by `npm run test:scripts`) fails on any `var(--mat-sys-…)` under `src`.
- Check a colour change in **both** themes. The theme lives in the `theme-mode` localStorage key (`light`/`dark`), or you can switch it in Settings.

### Loading States (skeletons, spinners, progress bars)

**Never render a busy affordance unconditionally.** Most responses land in tens of milliseconds, and a placeholder that appears and vanishes inside two frames reads as a rendering glitch, not as feedback. Every busy affordance goes through `src/app/shared/skeleton/deferred-skeleton.ts`, which enforces two thresholds — show nothing for the first 200ms, and once shown stay up for 400ms so the flash cannot just move to the boundary.

- **Observable state** (`toSignal` + `switchMap`): use `withDeferredSkeleton(LOADING_STATE)` in place of `startWith(LOADING_STATE)`. Keep it _inside_ the `switchMap` so each re-subscription gets fresh timers. Pattern: `view-print-detail.component.ts`.
- **Imperative flags** (`isLoading = true` in a `subscribe`): use `DeferredSkeletonController` — `start()` / `stop()`, read its `visible` signal, and `destroy()` on teardown. Pattern: `print-list.component.ts`.
- **Skeletons are for a FIRST paint only.** A refetch (filter, sort, page change) already has rows on screen; replacing them with grey boxes throws away the reader's place and scroll position. Split the state into `showSkeleton()` (first paint) vs `showRefreshing()` (keep the rows, dim to 0.55, `aria-busy`, `mat-progress-bar` with a negative margin so it adds no height). Gate on a `hasLoadedOnce` set **on success only**, so a failed first load still skeletons on retry.
- **A deferred placeholder needs a third state.** "No data, not loading" during the pre-skeleton window is _not_ "not found" / "empty" — gating an empty state on `!loading` will flash it on every visit. Use an explicit `idle` phase (see `PrintDetailPhase`).
- Skeletons not gated in TypeScript get the same 200ms delay for free from the `skeleton-surface` mixin's CSS reveal. If you DO gate in TypeScript, add `app-skeleton-immediate` to the container or the two delays stack.

## Testing

Vitest, through Angular's `@angular/build:unit-test` builder, in headless Chromium (Vitest browser mode with Playwright, at Karma's old 800×600 viewport). Specs are co-located with source (`*.spec.ts`); the unit-test environment is `src/environments/environment.unittest.ts`. Cypress E2E runs against `https://localhost:4200`; **E2E needs the API running in `E2ETesting` mode**, so ask before running it.

- **Run one file:** `npx ng test --no-watch --include src/app/path/to/file.spec.ts`.
- **First run on a new machine:** `npx playwright install chromium`. CI does this itself.
- **Shared setup:** `src/test-providers.ts` gives every TestBed its providers (noop animations). `src/test-setup.ts` runs before each file, and its `afterEach` restores every `vi.spyOn` spy and the real timers.
- **Spec files share pages.** Vitest runs a few pages in parallel, and the files it sends to one page all run in it (`isolate: false`, the builder's default), as every spec shared Karma's. A spec that changes the document (an `<html>` class, a `<meta>` tag, `localStorage`) must put it back.
- **Coverage is its own run** (`npm run test:coverage`). It covers our TypeScript and component templates (`.html`): V8 coverage maps template code back to the template, so an `@if` branch no test renders shows as uncovered. Karma's coverage counted TypeScript only, so the totals are not comparable with old Karma reports. JSON is excluded in `angular.json`.
- **`patches/@angular+build+*.patch` is load-bearing for coverage** (applied by `postinstall` through patch-package). @angular/build 21 wraps setup files in a stub when coverage is on, the browser caches the stub's import after the first spec file in a page, and from then on the TestBed is never reset and `src/test-setup.ts`'s `afterEach` never runs: about 200 files fail. @angular/build 22.2 fixes it upstream; delete the patch with that upgrade. If `npm install` reports the patch failed to apply, coverage runs are broken until it's fixed.

Components are standalone and go in TestBed `imports`. Mock a service as an object of `vi.fn()`s cast to `MockedObject<T>` (`{ getX: vi.fn() } as unknown as MockedObject<XService>`), and read calls from `.mock.calls` / `.mock.lastCall`. Async work needs `fixture.detectChanges()` then `await fixture.whenStable()`.

**`vi.spyOn` calls through; Jasmine's `spyOn` did not.** A spy meant to stub needs `.mockReturnValue(…)` or `.mockImplementation(…)`, or the real method runs.

**Stubbing every collaborator can hide the bug that matters.** A component's contract with a service is not just the values it returns — with signals it includes _when_ that service touches reactive state. Every spec around `PrinterAvatarComponent` stubbed the store and passed while the print list rendered nothing in a real browser (see NG0600 above). When a component depends on a service that reads or writes signals, add at least one spec that wires the **real** service with `provideHttpClientTesting`, and assert the first `detectChanges()` does not throw.

Because pages are shared, a spec that leaks state can fail a later one in the same page. Re-run, and check a failure in isolation with `--include`, before treating it as real.

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
- A guide's sub-pages can stay out of the sidebar with `nav: false` in their frontmatter. They stay routed, prerendered and in the sitemap, search, twins and `llms.txt`, and must be linked from a listed page (the validator checks). The `adding-a-docs-page` skill has the details.
- Validate with `node scripts/validate-docs.mjs`

### Markdown twins

Every routed docs page also ships as Markdown at its URL plus `.md` (`/docs/prints.md`), indexed by `/docs/llms.txt`, and `/llms.md` is a copy of `/llms.txt`. `scripts/docs-twins.mjs` converts each page's **rendered** template with Turndown inside `docs:generate`, so twins are gitignored build output and cannot drift. Pages advertise them with `<link rel="alternate" type="text/markdown">` via `MetaTagService.setSeoTags({ markdownUrl })`, and `verify-prerender.mjs` checks every advertised file exists in `dist` and is Markdown.

- A doc template may only interpolate a declared `constants:` entry or a string literal. Anything else fails generation, because the twin cannot evaluate it.
- A new doc primitive (`<doc-…>`) needs a Turndown rule in `docs-twins.mjs`, or its content reaches the twin as plain text at best.
- **`src/index.md` (the homepage twin) is hand-written.** Update it when the home page's pitch, features or pricing change; `docs-twins.test.mjs` only checks its links and Pro prices.

### Release notes

One Markdown file per release under `src/content/release-notes/<version>.md`, with `version`, `date` and `title` frontmatter. Adding a release means adding one file — see `/release` step 4.2.

- **The anchor is generated from `version`, not from the heading.** `1.38.0.md` publishes `#v1.38.0`. A slugger would mangle the dots, and many of these ids are already bookmarked, so `validate-docs.mjs` fails if a previously published anchor stops being emitted.
- **The page shows the ten newest releases; the rest is a lazily imported chunk** built by `scripts/release-notes-emit.mjs`. That archive is injected with `[innerHTML]`, so it is rewritten first: `routerLink` becomes `href` and `<mat-icon>` becomes the ligature span, because neither directive nor component exists in markup Angular never compiled. It also has to survive Angular's sanitizer — do not add a `bypassSecurityTrust*` call to make some new shape work.
- `scripts/extract-release-notes.mjs` reads these files directly to build the GitHub Release body, before `npm ci` and before any generation runs, so it must never depend on a generated artifact.
- **The What's New dialog reads `release-notes/dialog/<version>.md`**, a shorter note per release (optional `title:` override). Having one is what makes a release open the dialog. A release without one (a patch) still lights the About → Version indicator. Only the newest three are generated into `release-dialog-notes.ts`, because the dialog never shows more. The "Support development" paragraph belongs to the dialog (`SUPPORT_FOOTER`/`PRO_FOOTER` in `version-release-note-dialog.service.ts`), never to a note, and `validate-docs.mjs` enforces that.
- **"Last seen" is stored per account**, in user settings 27 (`ReleaseNotes_LastShownVersion`) and 28 (`ReleaseNotes_LastViewedVersion`), with localStorage as this browser's copy. Both only ever move forward: the service takes the newer of the two values and never lowers the account's.

## GitHub

Issues and PRs are managed on GitHub under `https://github.com/HoffmanEngineering` — UI repo `3d-print-log-ui`, API repo `3d-print-log-api`. Use `gh issue list`, `gh pr create`, `gh pr view`.

When asked to "work on issue #N": fetch the issue with `gh issue view N`, implement the feature, open a PR with `gh pr create`.
