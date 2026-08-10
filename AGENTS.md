# AGENTS.md

This file provides guidance to AI Agents like Claude Code (claude.ai/code) or Codex when working with code in this repository.

## Project Overview

3D Print Log UI - An Angular 21 web application for tracking 3D prints, printers, filaments, and print statistics. Uses Auth0 for authentication and communicates with a backend API at `printLogApiUrl`.

## Commands

```bash
# Development server (HTTPS on localhost:4200)
npm start

# Build
npm run build:dev          # Development build
npm run build              # Production build

# Testing
npm test                   # Run unit tests with Karma (watch mode)
npm run test:ci            # CI tests with ChromeHeadless and coverage
npm run test:brief         # Token-efficient test output (CI mode, failures/warnings only)

# Linting
npm run lint               # Run ESLint
npm run lint:fix           # Auto-fix lint issues
npm run lint:brief         # Token-efficient lint output (errors/warnings only)

# E2E Tests
npm run e2e                # Open Cypress interactively
npx cypress run            # Run all E2E tests headlessly
npx cypress run --spec cypress/e2e/prints/print-list-filters.cy.ts  # Run a single spec

# Formatting
npm run prettier           # Check formatting
npm run prettier:fix       # Fix formatting
```

### Token-Efficient Commands

When communicating with Claude about test or lint failures, use these token-efficient variants to reduce output:

- **`npm run test:brief`** - Runs tests in CI mode with only failures/warnings displayed
- **`npm run lint:brief`** - Runs linting with only errors/warnings displayed

These commands are optimized for minimal token usage while preserving actionable information about failures and warnings.

## Architecture

### Module Structure

- **app-routing.module.ts** - Main routes with lazy-loaded feature modules
- **core/** - Singleton services, guards, resolvers, HTTP interceptors, and stores
- **shared/** - Reusable components, pipes, and SharedModule (exports Angular Material modules)
- **Feature modules** (lazy-loaded): `print/`, `printer/`, `filament/`, `analytics/`, `users/`, `settings/`, `feed/`, `apikeys/`, `printer-maintenance/`, `documentation/`, `home/`

### Key Services (in `core/services/`)

- **auth.service.ts** - Auth0 authentication, user profile management
- **print.service.ts** - CRUD for prints, image uploads, cost calculations
- **printer.service.ts**, **filament.service.ts** - Entity management
- **file-parsers/** - Slicer G-code parsers (Cura, PrusaSlicer, OrcaSlicer, Creality Print, Anycubic)

### Authentication Flow

- Auth0 SPA SDK with token caching in localStorage
- `AuthInterceptorService` adds Bearer tokens to API requests
- `allow-anonymous-request` header bypasses authentication for public endpoints
- `AuthGuard` protects authenticated routes

### Public / Anonymous Routes (don't break these)

Routes without `AuthGuard` (e.g. `/prints/:id`, public profiles/materials) must render for logged-out visitors. A **rejected resolver cancels navigation and bounces to `/`** (#66) — and this only shows up logged-out, so it's easy to miss.

- On a public route, resolvers/services must degrade to a default/`null` for anonymous users, never throw. Fix in the **service** (also protects `ngOnInit` callers), and keep settings consumers null-tolerant (`?.value`, `?? default`). Auth-required endpoints reject with `missing_refresh_token` unless the request sets `allow-anonymous-request` **and** the API marks them `[AllowAnonymous]`.
- Test logged-out without Auth0: append `?devUserId=anonymous` (dev only; `isDevAnonymous`/`resolveDevUserId` in `core/utils/dev-user.ts`, persisted per-tab in sessionStorage). Regression pattern: `cypress/e2e/prints/public-print-anonymous.cy.ts` (a public-route E2E with no `cy.login()`).

### Environment Configuration

- `src/environments/environment.ts` - Development (localhost:5001 API)
- `src/environments/environment.prod.ts` - Production
- `src/environments/environment.unittest.ts` - Unit tests

### Prerendering & Sitemap (SEO)

Marketing/SEO routes are prerendered to static HTML at build time via `@angular/ssr` with `outputMode: "static"` (production config only). In `src/app/app.routes.server.ts`, marketing routes use `RenderMode.Prerender` and everything else uses `RenderMode.Client`. `npm run build` runs the marketing routes through Node to emit static `index.html` files.

- **SSR-safety (important):** prerendering executes components in Node, so any browser global (`window`, `document`, `localStorage`, `navigator`) touched during construction/init crashes the build. Guard it with `isPlatformBrowser(inject(PLATFORM_ID))`.
- **Marketing routes** are defined once in `scripts/marketing-routes.mjs`. To add a prerendered page, add it there AND in `app.routes.server.ts`.
- **Verification:** `scripts/verify-prerender.mjs` runs in CI and gates prerendered output (unique titles/descriptions, OG/Twitter, canonicals, internal link graph, crawl files).
- **Sitemap** is generated at deploy time by `scripts/generate-sitemap.mjs` (fetches public print/user IDs, writes a `<sitemapindex>` plus chunked child sitemaps into `dist/`). It is not committed; there is no static `src/sitemap.xml`. Unit tests: `npm run test:sitemap`.
- **Deploy** ships the prebuilt `dist` with `skip_app_build: true` (no Oryx rebuild) so the generated sitemap reaches production; `refresh-sitemap.yml` redeploys the latest release tag daily.

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

### Loading States (skeletons, spinners, progress bars)

**Never render a busy affordance unconditionally.** Most responses land in tens of milliseconds, and a placeholder that appears and vanishes inside two frames reads as a rendering glitch, not as feedback. Every busy affordance goes through `src/app/shared/skeleton/deferred-skeleton.ts`, which enforces two thresholds — show nothing for the first 200ms, and once shown stay up for 400ms so the flash cannot just move to the boundary.

- **Observable state** (`toSignal` + `switchMap`): use `withDeferredSkeleton(LOADING_STATE)` in place of `startWith(LOADING_STATE)`. Keep it _inside_ the `switchMap` so each re-subscription gets fresh timers. Pattern: `view-print-detail.component.ts`.
- **Imperative flags** (`isLoading = true` in a `subscribe`): use `DeferredSkeletonController` — `start()` / `stop()`, read its `visible` signal, and `destroy()` on teardown. Pattern: `print-list.component.ts`.
- **Skeletons are for a FIRST paint only.** A refetch (filter, sort, page change) already has rows on screen; replacing them with grey boxes throws away the reader's place and scroll position. Split the state into `showSkeleton()` (first paint) vs `showRefreshing()` (keep the rows, dim to 0.55, `aria-busy`, `mat-progress-bar` with a negative margin so it adds no height). Gate on a `hasLoadedOnce` set **on success only**, so a failed first load still skeletons on retry.
- **A deferred placeholder needs a third state.** "No data, not loading" during the pre-skeleton window is _not_ "not found" / "empty" — gating an empty state on `!loading` will flash it on every visit. Use an explicit `idle` phase (see `PrintDetailPhase`).
- Skeletons not gated in TypeScript get the same 200ms delay for free from the `skeleton-surface` mixin's CSS reveal. If you DO gate in TypeScript, add `app-skeleton-immediate` to the container or the two delays stack.

## Testing

- Unit tests use Jasmine + Karma with Chrome
- Test files are co-located with source files (`*.spec.ts`)
- E2E tests use Cypress with base URL `https://localhost:4200`

### Unit Test Patterns

**Standalone components** use `imports` in TestBed:

```typescript
await TestBed.configureTestingModule({
  imports: [MyComponent, NoopAnimationsModule],
  providers: [{ provide: MyService, useValue: mockService }],
}).compileComponents();
```

**Module-based components** use `declarations`:

```typescript
await TestBed.configureTestingModule({
  declarations: [MyComponent],
  imports: [MatDialogModule],
  providers: [...],
}).compileComponents();
```

**Mocking services** with Jasmine:

```typescript
const mockService = jasmine.createSpyObj<MyService>('MyService', ['methodName']);
mockService.methodName.and.returnValue(of(mockData));
```

**Async operations** require `fixture.detectChanges()` and `await fixture.whenStable()`:

```typescript
fixture.detectChanges();
await fixture.whenStable();
expect(component.data()).toEqual(expected);
```

## Analytics & Metrics

Use `LoggingService` to track user actions and errors.

### Logging Events

```typescript
private readonly loggingService = inject(LoggingService);

// Track user action with properties
this.loggingService.logEvent('ComponentName_ActionName', {
  property1: value1,
  property2: value2,
});

// Track exceptions
this.loggingService.logException(error);
```

### Naming Convention

- Event names follow `ComponentName_ActionName` pattern (e.g., `QrLabelDialog_Print`, `FilamentSearchModal_FilamentSelected`)
- Use descriptive action names: `Opened`, `Closed`, `Selected`, `Error`, `Success`
- Include relevant context in properties (counts, IDs, settings used)

## Documentation

All user-facing documentation lives in the `src/documentation` directory.

- Each main page should has it's own angular component for documentation (Prints, printers, filaments/materials, etc)
- Each integration should have it's own documentation page (integrations, mobile app, etc)
- Update existing documentation with new functionality
- Documentation should be written in clear english, designed to be understandable by the user.

## GitHub

Issues and PRs are managed on GitHub.

- **Org:** `https://github.com/HoffmanEngineering`
- **UI repo:** `https://github.com/HoffmanEngineering/3d-print-log-ui`
- **API repo:** `https://github.com/HoffmanEngineering/3d-print-log-api`

Use `gh issue list`, `gh pr create`, `gh pr view` for CLI operations.

When asked to "work on issue #N": fetch the issue with `gh issue view N`, implement the feature, open a PR with `gh pr create`.
