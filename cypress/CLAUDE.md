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

- **`cy.createPrint(title, options?)`** — creates a new print via `/prints/new/edit`, waits for the POST to complete, and leaves you on `/prints`. Pass `{ printer: 'Name' }` to select a specific printer; defaults to the first available option.
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

## Refreshing home-page screenshots

The three home feature images (`Homepage_PrinterList`, `Homepage_Filament`,
`Homepage_Analytics`, each light + dark) are generated, not hand-captured.

**To refresh after a UI change:**

    npm run capture:home:all

This boots the dev server, runs `cypress/e2e/home/capture-home-screenshots.cy.ts`
under `cypress.config.capture.ts` (Chrome at 2× device-scale-factor) to produce
6 PNGs from the fixtures in `cypress/fixtures/demo/`, then runs
`scripts/process-home-screenshots.mjs` to write hashed WebP into `src/assets/`
and rewrite the `ngSrc` refs in `home.component.html`. Review the diff (6 images

- the template) and commit.

If a dev server is already running on 4200, just run the two steps directly:
`npm run capture:home` then `npm run capture:home:process`.

- Runs in **Chrome** (`--browser chrome`); Electron ignores
  `--force-device-scale-factor`, so the DPR hook only takes effect in Chrome.
- Demo data is fixture-driven (`cypress/fixtures/demo/manifest.ts`); the capture
  **fails** if any `/api/**` request escapes the fixtures. When you add a page
  call, add its stub to `FIXTURE_ROUTES`.
- Demo print photos and their provenance live in `cypress/fixtures/demo/images/`
  (fetched by `scripts/fetch-demo-images.mjs`).
- The spec hides the nav bar, ad slots, and the filter panel, neutralizes
  AdSense, and waits for async print thumbnails and the d3 status-donut
  animation to settle before shooting.
- The post-process caps intrinsic width at 1400px so images stay crisp on HiDPI
  without tripping NgOptimizedImage "oversized" warnings.
- Theme swap is class-based (`html.dark-theme`) so the correct variant shows at
  first paint — do not switch to a hydration-gated `@if`.
- Out of scope: the 4th "Cura marketplace" integration image is not regenerated.
