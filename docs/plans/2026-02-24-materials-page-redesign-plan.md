# Materials Page Mobile Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Update the `/materials` page (`filament-list-container`) with a mobile card view matching the filament modal cards, and a filter row matching the `/prints` page two-row header pattern.

**Architecture:** Add three TypeScript methods to `FilamentListContainerComponent`, restructure the HTML header into `header-top` + collapsible `filter-panel`, then add a parallel mobile card template after the existing mat-table, gated by CSS. Desktop behavior is unchanged.

**Tech Stack:** Angular 20, Angular Material (mat-table, mat-menu, mat-badge, mat-checkbox), SCSS media queries, ngModel two-way binding

---

### Task 1: Add TypeScript methods and unit tests

**Files:**

- Modify: `src/app/filament/filament-list-container/filament-list-container.component.ts`
- Test: `src/app/filament/filament-list-container/filament-list-container.component.spec.ts`

The spec file currently uses `xdescribe` (all tests skipped) with an incomplete TestBed setup. We'll add isolated unit tests for the new pure methods using a simpler pattern — instantiate the component directly without TestBed for pure method tests.

**Step 1: Write the failing tests**

Open `filament-list-container.component.spec.ts` and replace the entire file contents with:

```typescript
import { FilamentListContainerComponent } from './filament-list-container.component';

// Isolated unit tests for pure methods — no TestBed needed
describe('FilamentListContainerComponent (isolated)', () => {
  let component: FilamentListContainerComponent;

  beforeEach(() => {
    // Construct with null injections — only testing pure methods
    component = new FilamentListContainerComponent(
      null as any, // ActivatedRoute
      null as any, // FilamentService
      null as any, // Title
      null as any, // Router
      null as any, // MatDialog
      null as any // ToastrService
    );
  });

  describe('toggleFilterPanel', () => {
    it('opens the filter panel when closed', () => {
      component.isFilterPanelOpen = false;
      component.toggleFilterPanel();
      expect(component.isFilterPanelOpen).toBeTrue();
    });

    it('closes the filter panel when open', () => {
      component.isFilterPanelOpen = true;
      component.toggleFilterPanel();
      expect(component.isFilterPanelOpen).toBeFalse();
    });
  });

  describe('activeFilterCount', () => {
    it('returns 0 when no filters are active', () => {
      component.showFavoritesOnly = false;
      component.showLoadedFilamentOnly = false;
      component.includeInactive = false;
      component.filterByMaterialCategory = '';
      expect(component.activeFilterCount).toBe(0);
    });

    it('counts showFavoritesOnly', () => {
      component.showFavoritesOnly = true;
      component.showLoadedFilamentOnly = false;
      component.includeInactive = false;
      component.filterByMaterialCategory = '';
      expect(component.activeFilterCount).toBe(1);
    });

    it('counts showLoadedFilamentOnly', () => {
      component.showFavoritesOnly = false;
      component.showLoadedFilamentOnly = true;
      component.includeInactive = false;
      component.filterByMaterialCategory = '';
      expect(component.activeFilterCount).toBe(1);
    });

    it('counts includeInactive', () => {
      component.showFavoritesOnly = false;
      component.showLoadedFilamentOnly = false;
      component.includeInactive = true;
      component.filterByMaterialCategory = '';
      expect(component.activeFilterCount).toBe(1);
    });

    it('counts filterByMaterialCategory when set', () => {
      component.showFavoritesOnly = false;
      component.showLoadedFilamentOnly = false;
      component.includeInactive = false;
      component.filterByMaterialCategory = 'PLA';
      expect(component.activeFilterCount).toBe(1);
    });

    it('counts all four active filters', () => {
      component.showFavoritesOnly = true;
      component.showLoadedFilamentOnly = true;
      component.includeInactive = true;
      component.filterByMaterialCategory = 'PETG';
      expect(component.activeFilterCount).toBe(4);
    });
  });

  describe('resetFilters', () => {
    it('resets all filter fields to defaults', () => {
      component.showFavoritesOnly = true;
      component.showLoadedFilamentOnly = true;
      component.includeInactive = true;
      component.filterByMaterialCategory = 'PLA';

      // Stub updateFilter so it doesn't throw (router is null)
      spyOn(component, 'updateFilter');

      component.resetFilters();

      expect(component.showFavoritesOnly).toBeFalse();
      expect(component.showLoadedFilamentOnly).toBeFalse();
      expect(component.includeInactive).toBeFalse();
      expect(component.filterByMaterialCategory).toBe('');
    });

    it('calls updateFilter after resetting', () => {
      spyOn(component, 'updateFilter');
      component.resetFilters();
      expect(component.updateFilter).toHaveBeenCalled();
    });
  });
});
```

**Step 2: Run the tests — expect FAIL (methods not yet added)**

```bash
npm run test:brief -- --include="**/filament-list-container/**"
```

Expected output: `FilamentListContainerComponent (isolated)` — multiple failures about `toggleFilterPanel`, `activeFilterCount`, `resetFilters` not existing.

**Step 3: Add the three methods to the TypeScript component**

In `filament-list-container.component.ts`, after the `clearSelection()` method (line ~409), add:

```typescript
  public isFilterPanelOpen = false;

  public toggleFilterPanel(): void {
    this.isFilterPanelOpen = !this.isFilterPanelOpen;
  }

  public get activeFilterCount(): number {
    let count = 0;
    if (this.showFavoritesOnly) count++;
    if (this.showLoadedFilamentOnly) count++;
    if (this.includeInactive) count++;
    if (this.filterByMaterialCategory) count++;
    return count;
  }

  public resetFilters(): void {
    this.showFavoritesOnly = false;
    this.showLoadedFilamentOnly = false;
    this.includeInactive = false;
    this.filterByMaterialCategory = '';
    this.currentPage = 1;
    this.updateFilter();
  }
```

**Step 4: Run tests — expect PASS**

```bash
npm run test:brief -- --include="**/filament-list-container/**"
```

Expected: All tests in `FilamentListContainerComponent (isolated)` pass.

**Step 5: Commit**

```bash
git add src/app/filament/filament-list-container/filament-list-container.component.ts
git add src/app/filament/filament-list-container/filament-list-container.component.spec.ts
git commit -m "feat: add filter panel state and activeFilterCount to filament-list-container"
```

---

### Task 2: Restructure the filter row HTML

**Files:**

- Modify: `src/app/filament/filament-list-container/filament-list-container.component.html`

Replace the entire `<div class="header">...</div>` block (lines 22–109) with the new two-row layout. The new block is a drop-in replacement — same outer `<div class="header">`, restructured contents.

**Step 1: Replace the header block**

Find this in the HTML (lines 22–109):

```html
<div class="header">
  <div class="header-buttons">...</div>
  <div class="search-fields">...</div>
</div>
```

Replace with:

```html
<div class="header">
  <!-- Row 1: Always visible — action buttons, search, filter toggle -->
  <div class="header-top">
    <div class="action-buttons">
      <button mat-raised-button routerLink="new" type="button" color="accent" id="add-new-filament">Add New Material</button>
      <button
        mat-raised-button
        type="button"
        (click)="printAllLabels()"
        [disabled]="filaments.length === 0 && !hasSelection()"
        [matTooltip]="
            hasSelection()
              ? 'Print QR labels for selected materials'
              : 'Print QR labels for all materials on this page'
          "
      >
        <mat-icon>qr_code_2</mat-icon>
        @if (hasSelection()) { Print Labels ({{ getSelectionCount() }}) } @else { Print Labels }
      </button>
      @if (hasSelection()) {
      <span class="selection-info" aria-live="polite">
        <span class="selection-count">{{ getSelectionCount() }} selected</span>
        <button mat-button type="button" (click)="clearSelection()" class="clear-selection-btn">
          <mat-icon>close</mat-icon>
          Clear
        </button>
      </span>
      }
    </div>
    <mat-form-field class="search-field" subscriptSizing="dynamic">
      <mat-label>Search</mat-label>
      <input id="filament-list-search-input" matInput type="text" [(ngModel)]="searchText" (ngModelChange)="debouncedUpdateFilter()" autocomplete="off" />
    </mat-form-field>
    <button mat-raised-button type="button" class="filter-toggle-btn" [matBadge]="activeFilterCount || null" matBadgeColor="accent" matBadgeSize="small" [matBadgeHidden]="activeFilterCount === 0" [attr.aria-expanded]="isFilterPanelOpen" aria-controls="filter-panel" (click)="toggleFilterPanel()">
      <mat-icon>{{ isFilterPanelOpen ? 'expand_less' : 'tune' }}</mat-icon>
      Filters
    </button>
  </div>

  <!-- Row 2: Collapsible filter panel -->
  <div id="filter-panel" class="filter-panel" [class.filter-panel--open]="isFilterPanelOpen">
    <div class="filter-panel-inner">
      <mat-checkbox type="checkbox" [(ngModel)]="includeInactive" (ngModelChange)="updateFilter()">Include Inactive</mat-checkbox>
      <mat-checkbox type="checkbox" [(ngModel)]="showFavoritesOnly" (ngModelChange)="updateFilter()">Show Favorites Only</mat-checkbox>
      <mat-checkbox type="checkbox" [(ngModel)]="showLoadedFilamentOnly" (ngModelChange)="updateFilter()">Show Loaded Materials Only</mat-checkbox>
      <mat-form-field class="filter-field" subscriptSizing="dynamic">
        <mat-label>Filter by Category</mat-label>
        <mat-select [(ngModel)]="filterByMaterialCategory" (ngModelChange)="updateFilter()">
          <mat-option value="">No Filter</mat-option>
          @for ( materialCategory of materialCategories; track materialCategory ) {
          <mat-option [value]="materialCategory.nickname">{{ materialCategory.name }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
      <button type="button" mat-raised-button (click)="resetFilters()">Reset Filters</button>
    </div>
  </div>
</div>
```

**Step 2: Verify the app builds**

```bash
npm run build:dev 2>&1 | tail -20
```

Expected: Build succeeds with no errors. If there are template binding errors about unknown properties, check that `MatBadgeModule` is already exported from `SharedModule` — it should be since print-list uses it.

**Step 3: Commit**

```bash
git add src/app/filament/filament-list-container/filament-list-container.component.html
git commit -m "feat: restructure filament-list-container filter row to match print-list pattern"
```

---

### Task 3: Update SCSS for the header / filter row

**Files:**

- Modify: `src/app/filament/filament-list-container/filament-list-container.component.scss`

**Step 1: Replace the old header SCSS**

Remove these blocks from the SCSS:

- `.header` (lines 19–22) — keep the selector but update it
- `.header-buttons` (lines 24–30) — remove entirely
- `.search-fields` (lines 68–71) — remove entirely
- `.search-fields mat-checkbox` (lines 110–112) — remove entirely

Replace the header section with:

```scss
.header {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 8px 0;
}

.header-top {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.action-buttons {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  flex-wrap: wrap;
}

.search-field {
  flex: 1;
  min-width: 160px;
}

.filter-toggle-btn {
  flex-shrink: 0;
  white-space: nowrap;

  ::ng-deep .mat-badge-content {
    display: flex;
    align-items: center;
    justify-content: center;
  }
}

.filter-panel {
  overflow: hidden;
  max-height: 0;
  opacity: 0;
  transition:
    max-height 0.25s ease,
    opacity 0.2s ease;

  &.filter-panel--open {
    max-height: 300px;
    opacity: 1;
  }
}

.filter-panel-inner {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  padding: 8px 0;
  border-top: 1px solid rgba(0, 0, 0, 0.08);

  mat-checkbox {
    margin-right: 0;
  }
}

.filter-field {
  min-width: 150px;
}
```

Also update the existing `.selection-info`, `.selection-count`, `.clear-selection-btn` classes — these already exist in the SCSS and can stay as-is.

**Step 2: Run lint**

```bash
npm run lint:brief
```

Expected: No errors.

**Step 3: Commit**

```bash
git add src/app/filament/filament-list-container/filament-list-container.component.scss
git commit -m "feat: update filament-list-container header SCSS to match print-list pattern"
```

---

### Task 4: Add mobile card HTML template

**Files:**

- Modify: `src/app/filament/filament-list-container/filament-list-container.component.html`

Add the mobile card list immediately after the closing `</table>` tag (currently at line 347, now shifted down from Task 2's changes). Insert before the `@if (totalCount === 0)` block.

**Step 1: Add card template after `</table>`**

```html
<!-- Mobile card list (shown < 600px via CSS, table hidden) -->
<div class="filament-cards">
  @for (filament of filaments; track filament.id) {
  <div class="filament-card" [class.filament-card--selected]="isSelected(filament)" tabindex="0" [routerLink]="[filament.id]" data-cy-filament-card>
    <div class="card-swatch" [style.background-color]="'#' + filament.colorHex"></div>
    <div class="card-content">
      <div class="card-row-primary">
        <span class="card-name">{{ filament.displayName }}</span>
        <span class="card-spacer"></span>
        <span class="card-weight"> {{ filament.filamentRemaining / 1000 | number: '1.0-0' }}g </span>
      </div>
      <div class="card-row-material">
        <span class="card-chip">{{ filament.materialType }}</span>
        @if (!filament.isActive) {
        <span class="card-chip card-chip--inactive">Inactive</span>
        }
      </div>
      <div class="card-row-secondary">{{ filament.brand }}@if (filament.colorName) { &nbsp;·&nbsp;{{ filament.colorName }} }@if (filament.storageLocation) { &nbsp;·&nbsp;{{ filament.storageLocation }} }@if (filament.loadedInPrinter) { &nbsp;·&nbsp;Loaded: {{ getPrinterLabel(filament) }} }</div>
    </div>
    <div class="card-actions" (click)="$event.preventDefault(); $event.stopPropagation()">
      <mat-checkbox [checked]="isSelected(filament)" (change)="toggleSelection(filament)" [attr.aria-label]="'Select ' + filament.displayName"></mat-checkbox>
      <button
        mat-button
        class="transparent card-favorite-btn"
        [class.not-favorite-icon]="!filament.isFavorite"
        [attr.aria-label]="
              filament.isFavorite
                ? 'Remove ' + filament.displayName + ' from favorites'
                : 'Add ' + filament.displayName + ' to favorites'
            "
        (click)="toggleFavorite(filament)"
      >
        <mat-icon>{{ filament.isFavorite ? 'star' : 'star_border' }}</mat-icon>
      </button>
      <button mat-button class="transparent" [attr.aria-label]="'More options for ' + filament.displayName" [matMenuTriggerFor]="cardMenu" data-cy-more-button>
        <mat-icon>more_vert</mat-icon>
      </button>
      <mat-menu #cardMenu="matMenu">
        <a class="menu-link" mat-menu-item [routerLink]="[filament.id]" [attr.aria-label]="'Edit Material ' + filament.displayName"> <mat-icon>edit</mat-icon>Edit </a>
        <a class="menu-link" mat-menu-item [routerLink]="['copy', filament.id]" [attr.aria-label]="'Duplicate Material ' + filament.displayName"> <mat-icon>file_copy</mat-icon>Duplicate </a>
        <button type="button" mat-menu-item [attr.aria-label]="'Print QR Label for ' + filament.displayName" (click)="printQrLabel(filament)"><mat-icon>qr_code_2</mat-icon>Print QR Label</button>
        @if (filament?.loadedInPrinter?.id) {
        <a class="menu-link" mat-menu-item [routerLink]="['/', 'printers', filament.loadedInPrinter.id]"> <mat-icon>open_in_browser</mat-icon>Go To Loaded Printer </a>
        }
        <hr />
        <button
          type="button"
          mat-menu-item
          [attr.aria-label]="
                'Mark Material ' + filament.displayName + ' as empty.'
              "
          (click)="markAsEmpty(filament)"
        >
          <mat-icon>hide_source</mat-icon>Mark As Empty
        </button>
        <button type="button" mat-menu-item [attr.aria-label]="'Delete Material ' + filament.displayName" (click)="deleteFilament(filament)"><mat-icon>delete</mat-icon>Delete</button>
      </mat-menu>
    </div>
  </div>
  }
</div>
```

**Step 2: Verify the build**

```bash
npm run build:dev 2>&1 | tail -20
```

Expected: Builds successfully. The cards won't be visible yet (no CSS to show them).

**Step 3: Commit**

```bash
git add src/app/filament/filament-list-container/filament-list-container.component.html
git commit -m "feat: add mobile card template to filament-list-container"
```

---

### Task 5: Add mobile card SCSS

**Files:**

- Modify: `src/app/filament/filament-list-container/filament-list-container.component.scss`

**Step 1: Add card styles to the SCSS**

Add the following at the end of the SCSS file, after the existing `@media screen and (max-width: 550px)` block:

```scss
// ── Mobile card list ──────────────────────────────────────────────────────────

// Cards hidden on desktop; table shown.
.filament-cards {
  display: none;
}

@media screen and (max-width: 599px) {
  // Hide table, show cards.
  table {
    display: none;
  }

  .filament-cards {
    display: block;
  }

  .filament-card {
    display: flex;
    align-items: center;
    padding: 10px 8px;
    border-bottom: 1px solid rgba(0, 0, 0, 0.08);
    cursor: pointer;
    gap: 10px;
    text-decoration: none;
    color: inherit;

    &:hover,
    &:focus {
      background-color: rgba(0, 0, 0, 0.05);
      outline: none;
    }

    &--selected {
      background-color: rgba(63, 81, 181, 0.08);
    }
  }

  .card-swatch {
    width: 40px;
    min-width: 40px;
    align-self: stretch;
    border: 1px solid rgba(0, 0, 0, 0.15);
    border-radius: 4px;
    flex-shrink: 0;
  }

  .card-content {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .card-row-primary {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
  }

  .card-name {
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    flex-shrink: 1;
    min-width: 0;
  }

  .card-chip {
    font-size: 11px;
    padding: 2px 6px;
    border-radius: 10px;
    background: rgba(0, 0, 0, 0.08);
    white-space: nowrap;
    flex-shrink: 0;
    line-height: 1.4;

    &--inactive {
      background: #ffccbc;
      color: #bf360c;
    }
  }

  .card-spacer {
    flex: 1;
  }

  .card-weight {
    font-size: 13px;
    color: rgba(0, 0, 0, 0.6);
    white-space: nowrap;
    flex-shrink: 0;
  }

  .card-actions {
    flex-shrink: 0;
    align-self: center;
    display: flex;
    align-items: center;

    mat-checkbox {
      margin-right: -4px;
    }
  }

  .card-favorite-btn {
    flex-shrink: 0;
    min-width: unset;
    padding: 0 4px;
  }

  .card-row-material {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .card-row-secondary {
    font-size: 12px;
    color: rgba(0, 0, 0, 0.54);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}
```

Also update the existing `@media screen and (max-width: 550px)` block — change the breakpoint to `599px` so it aligns with the card breakpoint, and it can be merged into the new block or left as-is if the padding rules are only needed for the table (which is hidden at 599px). Since the table is hidden at 599px, the `max-width: 550px` table-specific rules are now dead code — remove that block entirely.

**Step 2: Run lint**

```bash
npm run lint:brief
```

Expected: No errors.

**Step 3: Commit**

```bash
git add src/app/filament/filament-list-container/filament-list-container.component.scss
git commit -m "feat: add mobile card SCSS to filament-list-container"
```

---

### Task 6: Manual verification

**Step 1: Start the dev server**

```bash
npm start
```

**Step 2: Check desktop view at `/materials`**

- Table still renders with all columns
- Header shows: "Add New Material" + "Print Labels" buttons, search field, "Filters" button
- Clicking "Filters" reveals the collapsible panel with Include Inactive / Show Favorites / Show Loaded / Category / Reset
- Filter badge shows count of active filters
- Icon toggles between `tune` and `expand_less`
- "Reset Filters" button resets all filters and refreshes

**Step 3: Check mobile view (devtools → 375px width)**

- Cards render, table is hidden
- Each card shows: color swatch, name + weight, material type chip, brand/color/storage/loaded secondary row, actions column
- Checkbox on each card — checking multiple cards increments the "Print Labels (N)" count
- Star button toggles favorite
- Kebab menu shows: Edit, Duplicate, Print QR Label, (Go To Loaded Printer if loaded), hr, Mark As Empty, Delete
- Tapping the card body navigates to `/filament/:id`
- Inactive filaments show the Inactive chip

**Step 4: Run full test suite**

```bash
npm run test:brief
```

Expected: All tests pass (the new isolated tests + existing suite).

**Step 5: Final commit if any fixes were needed**

```bash
git add -p
git commit -m "fix: <describe what was fixed>"
```
