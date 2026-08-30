# Cypress E2E Testing Guide

## Setup

- `@testing-library/cypress` is installed — use semantic role/label selectors throughout
- Custom commands are registered in `cypress/support/commands.js`; types in `cypress/support/index.d.ts`
- `Cypress.on('uncaught:exception', () => false)` is set globally to suppress AdSense errors on cold-start

## Authentication

All tests start with `cy.login()`, which uses `cy.session('dev-bypass', ...)` to cache the session (cookies, localStorage, sessionStorage) after a single real browser visit. The uncaught-exception suppressor matters on that first cold visit.

## Selector Strategy

Prefer `@testing-library/cypress` semantic selectors over `data-cy` attributes. Angular Material `mat-select` renders with `role="combobox"` and `aria-labelledby` pointing to its `mat-label`:

```typescript
cy.findByRole('combobox', { name: /status/i });
cy.findByRole('option', { name: 'Success' });
```

Fall back to `data-cy` or `id` selectors for elements without meaningful ARIA roles.

## Angular Material Gotchas

### mat-badge visibility

`[matBadgeHidden]` adds `mat-badge-hidden` to the **host element** — the badge `<span>` stays in DOM. Check the host class, not the span:

```typescript
// ✗ fails — span stays in DOM
cy.get('.mat-badge-content').should('not.exist');

// ✓ check the host class
cy.get('.filter-toggle-btn').should('have.class', 'mat-badge-hidden');
```

### mat-select multi-select panels

After clicking a `mat-option` inside a multi-select, the panel stays open. Close it with:

```typescript
cy.get('body').type('{esc}');
```

### FilamentSearchModal in multi-select mode

Clicking a filament row selects it but does **not** close the dialog — you must click the confirm button:

```typescript
cy.get('[data-cy-filament-row]').first().click();
cy.contains('button', /add.*filament/i).click(); // "Add 1 Filament" / "Add 2 Filaments"
```

Single-select mode (e.g. editing a print's filament usage) closes on row click — no confirm step needed.

## Print List Specifics

### Filter panel auto-opens on wide viewports

`isFilterPanelOpen` initializes to `window.innerWidth >= 600`. Headless Cypress runs at 1280×720, so the panel is **always open on page load**. Tests that need the closed state must close it explicitly before asserting.

### Filter state can leak between tests

Cypress sessions preserve localStorage. Always reset filters at the start of any test that depends on an unfiltered list:

```typescript
cy.visit('/prints');
cy.findByRole('button', { name: /reset filters/i }).click();
```

### Clicking print rows safely

Print rows (`[cy-print-row]`) contain two kinds of intercepting elements:

1. **Filament summary links** — have `[routerLink]` and navigate to `/materials/{id}`
2. **Project chips** — have `(click)` with `event.stopPropagation()`, which prevents the row's `routerLink` from firing

The safest pattern when you know the print title is `.find('.mat-column-title')` **only if the title cell has no project chip**. When in doubt, or when the print may already have a project assigned, navigate by ID instead:

```typescript
// ✓ always safe — works regardless of filament links or project chips
cy.get('[cy-print-row]')
  .first()
  .invoke('attr', 'cy-print-row')
  .then((printId) => {
    cy.visit(`/prints/${printId}`);
  });

// ✓ safe when you know the print title and it has no project chip
cy.contains('[cy-print-row]', printTitle).find('.mat-column-title').click();

// ✗ may navigate to filament detail
cy.contains('[cy-print-row]', printTitle).click();
```

## Common Patterns

Always `cy.wait('@alias')` after an action that triggers a mutation — don't rely on UI updates alone:

```typescript
cy.intercept('PUT', '/api/Prints/*').as('updatePrint');
cy.get('#edit-print-submit-btn').click();
cy.wait('@updatePrint');
```

Use a timestamp suffix for test data to avoid collisions between runs:

```typescript
const ts = new Date().getTime();
const printTitle = 'My Test Print - ' + ts;
```

When multiple names share the same timestamp (e.g. a filament + print created in the same test), capture `ts` once and reuse it — don't call `getTime()` twice.

## Custom Commands

- **`cy.seedPrint(title, options?)`** — creates a print through the API. Does **not** navigate. Use this whenever the spec just needs prints to exist; it is roughly 3.5s per print cheaper than driving the form, which is why the two list specs moved to it. Seeds `status: Pending` and `viewStatus: Private`, matching the new-print form's defaults for a user with no saved preferences — the status matters, because the status-filter and bulk-status tests assert against prints that are _not_ yet Success. Pass `{ printer: 'Name' }` to attach a specific printer; defaults to the first.
- **`cy.createPrint(title, options?)`** — creates a new print via `/prints/new/edit`, waits for the POST to complete, and leaves you on `/prints`. Pass `{ printer: 'Name' }` to select a specific printer; defaults to the first available option. **Prefer `cy.seedPrint` unless the test is about the form itself** — this drives a page load and a form fill per print.
- **`cy.openFilterPanel()`** — ensures the filter panel is open. Idempotent — safe to call even if the panel is already open.

### Intercept ordering

Always register `cy.intercept` **before** the action that triggers the request. The filament search modal fires a GET when it opens — register the intercept before clicking `#add-new-filament-usage-btn`, not after:

```typescript
// ✓ correct — intercept registered before the trigger
cy.intercept('GET', '/api/Filaments*').as('getFilamentsModal');
cy.get('#add-new-filament-usage-btn').click();
cy.get('[data-cy="select-filament-btn"]').click();
cy.wait('@getFilamentsModal');
```

## Generated screenshots (home page and doc figures)

Two sets of images are generated from the real app against committed fixtures,
not hand-captured:

| Set    | Command                    | Output                                           |
| ------ | -------------------------- | ------------------------------------------------ |
| `home` | `npm run capture:home:all` | 3 feature images (light + dark) in `src/assets/` |
| `docs` | `npm run capture:docs:all` | doc figures in `src/assets/docs/captures/`       |

Both run the same harness — `cypress/support/capture.ts` — over a `CaptureSet`
declared in `cypress/fixtures/demo/manifest.ts`. The spec files are three lines
each. Everything below applies to both sets unless it says otherwise.

**Nothing runs this for you.** No workflow invokes it, and the images are
committed WebP, so they stay as they are until someone re-runs the capture and
commits the result. Refresh a set when you change a view it captures — the
images go stale silently, since nothing compares them against the current UI.

If a dev server is already running on 4200, run the two steps directly:
`npm run capture:docs` then `npm run capture:docs:process`.

### Adding a doc figure

1. Give the view a capture boundary if it has none: `data-cy="capture-<thing>"`.
2. Add a target to `DOC_CAPTURE_TARGETS` in `cypress/fixtures/demo/manifest.ts`.
   `name` is the contract — it is both the `<doc-figure name>` value and the
   published asset's basename.
3. `npm run capture:docs:all`.
4. Reference it from the Markdown. No path, no dimensions:

   ```html
   <doc-figure name="print-list-table" alt="What the screenshot shows, for a reader who cannot see it" caption="Optional"></doc-figure>
   ```

`src` still works for a hand-placed asset (the Android app screenshots), and
then `width` and `height` are required. `validate-docs.mjs` rejects a figure
that binds both or neither, a `name` with no asset, and hand-typed dimensions
beside a `name` — those go stale on the next recapture without touching the
Markdown that carries them.

The pipeline: capture → process + hash → commit → `docs:generate` reads
`src/content/docs-captures.json` to emit `docs-captures.ts`, which
`<doc-figure>` resolves through the `DOC_CAPTURE_MAP` token.

### Things that have already gone wrong here

- Runs in **Chrome** (`--browser chrome`); Electron ignores
  `--force-device-scale-factor`, so the DPR hook only takes effect in Chrome.
- The capture specs are **excluded from the normal E2E config** — they are
  generators, not tests. Left in the default glob the home one ran in
  `npx cypress run` and the nightly job at device-scale-factor 1 (that flag lives
  only in `cypress.config.capture.ts`) and overwrote the same PNG filenames the
  processing step reads, at half resolution.
- **The device-scale guard is a ratio, not a floor.** Each test records the
  boundary's CSS width into `cypress/captures/<set>.json`; the processing step
  divides the PNG width by it and refuses anything under `MIN_DEVICE_SCALE`. The
  floor it replaced could only be tuned to the narrowest target in a set, so a 1×
  capture of a 1280px-wide desktop figure sailed straight over it.
- That sidecar also lists what the run was **supposed** to produce, written
  before the first test. A run that died halfway leaves an expectation with no
  result and the processing step says so, instead of publishing a mix of two
  runs. It is gitignored and regenerated every run.
- Demo data is fixture-driven (`FIXTURE_ROUTES` in the manifest); a capture
  **fails** if any `/api/**` request escapes the fixtures, and `afterEach` prints
  the offending URLs. When you add a page call, add its stub.
- **A `FIXTURE_ROUTES` glob is matched with minimatch, which is a _path_
  matcher.** `*` never crosses a `/`, so a query value containing an unencoded
  slash silently stops matching — Angular's `HttpParams` leaves `/` alone, which
  is how `timeZone=America/New_York` broke the analytics stub. Use a `RegExp` for
  those; `url` accepts either. The symptom is not a stub error, it is the page
  rendering its own error state while the ready steps time out.
- **Element captures taller than the viewport are stitched, and the seam tears
  whatever crosses it.** The harness grows the viewport to fit the boundary and
  then asserts it fit, because `cy.viewport()` is _clamped_ to the browser window
  and reports nothing when it clamps. It asserts the **width** was not clamped
  too: a narrowed viewport does not tear the shot, it re-lays-out the page, so
  you get a clean screenshot of the wrong breakpoint. Both failures point at
  `WINDOW_SIZE` in `cypress.config.capture.ts`, which must stay above 2× the
  widest and 2× the tallest viewport across every set.
- **`ready` steps must assert on content, not containers.** A stat tile renders
  an em dash and a chart frame keeps its size when its request failed, so
  counting elements passes on a page that loaded nothing. Build them from the
  predicates in `cypress/support/capture.ts` (`rendered`, `atLeast`, `absent`,
  `noPlaceholders`, `imagesRendered`) rather than writing a closure per target.
- The home set hides the filter panel and the analytics export button through its
  own `css`; the docs set deliberately does not, because those are things the
  docs document. Per-set CSS, not one global block.
- A doc figure needs **both** themes. The processing step refuses to write an
  index entry with only one, since the missing one renders as a broken image that
  a reader will assume is their fault.
- Theme swap is class-based (`html.dark-theme`) so the correct variant shows at
  first paint — do not switch to a hydration-gated `@if`. `<doc-figure>` renders
  both images and hides one in CSS for the same reason.

### Fixture facts the images depend on

- Demo print photos and their provenance live in `cypress/fixtures/demo/images/`
  (fetched by `scripts/fetch-demo-images.mjs`).
- The demo prints carry `filamentUsage`, because material tracking is what the
  home copy beside that image is selling and what the prints doc describes. The
  rows embed whole `FilamentSummary` objects copied from `filaments.json`, so the
  swatches match the materials capture exactly. **`filamentUsage` is the
  driver**; the per-print `sumActualFilamentWeightMg` /
  `sumEstimatedFilamentWeightMg` / `totalFilamentWeightMg` are the deprecated
  mirror of it and are derived from the rows, never the reverse.
- Each row records the unit it was measured in.
  `Prints_PreferredFilamentDisplayUnit` is `0` (as-recorded) in
  `user-settings.json`, so a row renders off its own `source`: filament in grams,
  resin in millilitres. Set a real unit there instead and the resin row gets
  converted to grams via density, which is not what the materials it represents
  are sold or measured in. Resin also carries no `lengthInM` — no diameter, so no
  strand length.
- **A list fixture must be ordered the way that list's resolver asks the API to
  order it**, because a stub returns whatever the file says and the page does not
  re-sort. `prints-summary.json` is `StartDate` descending and `filaments.json`
  is `filamentRemaining` descending — see `print-list-resolver.service.ts` and
  `filament-list-resolver.service.ts`. Both were unsorted and so stubbed a
  response neither endpoint would ever return.
- **Print timestamps are midday UTC, not midnight.** `localeDate` renders in the
  capture machine's timezone, so a `T00:00:00+00:00` date shows the day before
  anywhere west of Greenwich — the image would differ by machine. Midday holds
  the same calendar date from UTC-11 to UTC+12.
- The home prints capture is taken inside the print list's handset breakpoint
  (`max-width: 959.98px`), where the mat-table is not rendered at all and
  `app-print-card` is; the desktop doc figures sit above it and get the table.
  Home analytics is captured at 720px, wide enough for its tiles to go three
  across, which keeps the image near the other two slots' aspect.
- The post-process caps intrinsic width per set — 1400px for home (the feature
  grid's ~676px column at 2×, which also avoids NgOptimizedImage "oversized"
  warnings) and 1700px for docs (the prose column at 2×).
- Out of scope: the 4th "Cura marketplace" integration image is not regenerated.

## Running in CI

`.github/workflows/e2e.yml` runs the suite nightly, on `workflow_dispatch`, and
on PRs labeled `run-e2e`. CI differs from local in two ways that matter when
writing specs:

- **Both servers are plain HTTP** — the UI on `http://localhost:4200` (the
  Angular `e2e` configuration) and the API on `http://localhost:5000`. Never
  hardcode an API URL in a spec; import `apiUrl()` from
  `cypress/support/api-url.js`, which reads `CYPRESS_apiUrl` and falls back to
  the local HTTPS default.
- **The database is seeded, not your dev data.** It is dropped and re-seeded on
  every API boot by `E2EDataSeeder` in the API repo. A spec that depends on data
  no one seeded will pass locally and fail in CI. Either create what you need in
  the spec, or add it to the seeder.
