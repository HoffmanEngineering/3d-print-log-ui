# Filament List Mobile Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the wide 9-column table in `filament-list.component` with a mobile-friendly card layout (< 600px) and a collapsible filter panel, while keeping the existing table unchanged on desktop.

**Architecture:** CSS media queries at 600px hide/show the table vs. card list — no TS signal needed for layout switching. The filter panel uses the same `max-height` CSS transition pattern already used in `print-list`. All changes stay in `filament-list.component` plus minor updates to `print-list.component.ts` and three dialog call sites.

**Tech Stack:** Angular 20, Angular Material (mat-button, mat-icon, mat-checkbox, mat-chip), SCSS media queries, Jasmine/Karma unit tests.

---

### Task 1: Add filter panel TS logic to `filament-list`

**Files:**

- Modify: `src/app/shared/filament-list/filament-list.component.ts`
- Test: `src/app/shared/filament-list/filament-list.component.spec.ts`

**Step 1: Set up the spec with mocked services**

The existing spec is disabled with `xdescribe` and has no service mocks — it will never pass. Replace the entire contents of `filament-list.component.spec.ts` with:

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { FilamentListComponent } from './filament-list.component';
import { FilamentService } from 'src/app/core/services/filament.service';
import { MaterialCategoryService } from 'src/app/core/services/material-categories.service';

describe('FilamentListComponent', () => {
  let component: FilamentListComponent;
  let fixture: ComponentFixture<FilamentListComponent>;

  const mockFilamentService = jasmine.createSpyObj<FilamentService>('FilamentService', ['getCurrentUserFilamentSummaries', 'changeFavorite']);
  mockFilamentService.getCurrentUserFilamentSummaries.and.returnValue(of({ items: [], paging: { currentPage: 1, pageSize: 10, totalCount: 0 } } as any));

  const mockMaterialCategoryService = jasmine.createSpyObj<MaterialCategoryService>('MaterialCategoryService', ['getMaterialCategories']);
  mockMaterialCategoryService.getMaterialCategories.and.returnValue(of([]));

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FilamentListComponent],
      providers: [
        { provide: FilamentService, useValue: mockFilamentService },
        { provide: MaterialCategoryService, useValue: mockMaterialCategoryService },
      ],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(FilamentListComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  describe('isFilterPanelOpen', () => {
    it('should default to true when viewport is >= 600px', () => {
      Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1024 });
      const c = new FilamentListComponent(mockFilamentService, mockMaterialCategoryService);
      expect(c.isFilterPanelOpen).toBeTrue();
    });

    it('should default to false when viewport is < 600px', () => {
      Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 400 });
      const c = new FilamentListComponent(mockFilamentService, mockMaterialCategoryService);
      expect(c.isFilterPanelOpen).toBeFalse();
    });

    it('toggleFilterPanel should flip the value', () => {
      Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1024 });
      const c = new FilamentListComponent(mockFilamentService, mockMaterialCategoryService);
      expect(c.isFilterPanelOpen).toBeTrue();
      c.toggleFilterPanel();
      expect(c.isFilterPanelOpen).toBeFalse();
      c.toggleFilterPanel();
      expect(c.isFilterPanelOpen).toBeTrue();
    });
  });

  describe('activeFilterCount', () => {
    beforeEach(() => {
      Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1024 });
    });

    it('should return 0 when no filters are active', () => {
      const c = new FilamentListComponent(mockFilamentService, mockMaterialCategoryService);
      expect(c.activeFilterCount).toBe(0);
    });

    it('should count includeInactive', () => {
      const c = new FilamentListComponent(mockFilamentService, mockMaterialCategoryService);
      c.includeInactive = true;
      expect(c.activeFilterCount).toBe(1);
    });

    it('should count showFavoritesOnly', () => {
      const c = new FilamentListComponent(mockFilamentService, mockMaterialCategoryService);
      c.showFavoritesOnly = true;
      expect(c.activeFilterCount).toBe(1);
    });

    it('should count showLoadedFilamentOnly', () => {
      const c = new FilamentListComponent(mockFilamentService, mockMaterialCategoryService);
      c.showLoadedFilamentOnly = true;
      expect(c.activeFilterCount).toBe(1);
    });

    it('should count non-empty filterByMaterialCategory', () => {
      const c = new FilamentListComponent(mockFilamentService, mockMaterialCategoryService);
      c['_filterByMaterialCategory'] = 'PLA';
      expect(c.activeFilterCount).toBe(1);
    });

    it('should count all active filters together', () => {
      const c = new FilamentListComponent(mockFilamentService, mockMaterialCategoryService);
      c.includeInactive = true;
      c.showFavoritesOnly = true;
      c.showLoadedFilamentOnly = true;
      c['_filterByMaterialCategory'] = 'PETG';
      expect(c.activeFilterCount).toBe(4);
    });
  });
});
```

**Step 2: Run tests to confirm they fail**

```bash
npm run test:brief 2>&1 | grep -A 3 "FilamentListComponent"
```

Expected: failures on `isFilterPanelOpen` and `activeFilterCount` — those properties don't exist yet.

**Step 3: Add `isFilterPanelOpen`, `toggleFilterPanel`, and `activeFilterCount` to the component**

In `filament-list.component.ts`, add these three members to the class body (after the existing `showLoadedFilamentOnly = false;` line):

```typescript
public isFilterPanelOpen = typeof window !== 'undefined' && window.innerWidth >= 600;

public toggleFilterPanel(): void {
  this.isFilterPanelOpen = !this.isFilterPanelOpen;
}

public get activeFilterCount(): number {
  let count = 0;
  if (this.includeInactive) count++;
  if (this.showFavoritesOnly) count++;
  if (this.showLoadedFilamentOnly) count++;
  if (this._filterByMaterialCategory) count++;
  return count;
}
```

**Step 4: Run tests to confirm they pass**

```bash
npm run test:brief 2>&1 | grep -A 3 "FilamentListComponent"
```

Expected: all `FilamentListComponent` tests pass.

**Step 5: Commit**

```bash
git add src/app/shared/filament-list/filament-list.component.ts src/app/shared/filament-list/filament-list.component.spec.ts
git commit -m "feat: add filter panel state and active filter count to filament-list"
```

---

### Task 2: Redesign the filter area HTML in `filament-list`

**Files:**

- Modify: `src/app/shared/filament-list/filament-list.component.html`

**Step 1: Replace the `.header` div**

The current `<div class="header">` block (lines 2–61) contains the Add Filament button and all inline filter fields. Replace the entire block with this new structure:

```html
<div class="header">
  @if (showAddFilamentButton) {
  <button mat-raised-button routerLink="new" type="button" color="accent" id="add-new-filament">Add New Filament</button>
  }
  <div class="filter-bar">
    <mat-form-field class="search-field" subscriptSizing="dynamic">
      <mat-label>Search</mat-label>
      <input id="filament-list-search-input" matInput type="text" [(ngModel)]="searchText" (ngModelChange)="debouncedUpdateFilter()" autocomplete="off" />
    </mat-form-field>
    <button mat-button class="filter-toggle-btn" (click)="toggleFilterPanel()" [attr.aria-expanded]="isFilterPanelOpen" aria-controls="filament-filter-panel">
      <mat-icon>filter_list</mat-icon>
      Filters @if (activeFilterCount > 0) {
      <span class="filter-count-badge">({{ activeFilterCount }})</span>
      }
    </button>
  </div>
  <div id="filament-filter-panel" class="filter-panel" [class.filter-panel--open]="isFilterPanelOpen">
    <div class="filter-panel-inner">
      <mat-checkbox type="checkbox" [(ngModel)]="includeInactive" (ngModelChange)="updateFilter()">Include Inactive</mat-checkbox>
      <mat-checkbox type="checkbox" [(ngModel)]="showFavoritesOnly" (ngModelChange)="updateFilter()">Show Favorites Only</mat-checkbox>
      <mat-checkbox type="checkbox" [(ngModel)]="showLoadedFilamentOnly" (ngModelChange)="updateFilter()">Show Loaded Filament Only</mat-checkbox>
      <mat-form-field subscriptSizing="dynamic">
        <mat-label>Filter by Category</mat-label>
        <mat-select [(ngModel)]="_filterByMaterialCategory" (ngModelChange)="updateFilter()">
          <mat-option value="">No Filter</mat-option>
          @for ( materialCategory of materialCategories; track materialCategory ) {
          <mat-option [value]="materialCategory.nickname">{{ materialCategory.name }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
    </div>
  </div>
</div>
```

**Step 2: Verify the app compiles**

```bash
npm run build:dev 2>&1 | tail -5
```

Expected: Build succeeds (or only pre-existing warnings).

**Step 3: Commit**

```bash
git add src/app/shared/filament-list/filament-list.component.html
git commit -m "feat: redesign filament-list filter area with collapsible panel"
```

---

### Task 3: Add mobile card list HTML to `filament-list`

**Files:**

- Modify: `src/app/shared/filament-list/filament-list.component.html`

**Step 1: Add the card list template after the closing `</table>` tag and before `@if (totalCount === 0)`**

Insert this block between the `</table>` and the `@if (totalCount === 0)` empty-state block:

```html
<!-- Mobile card list (shown < 600px via CSS, table hidden) -->
<div class="filament-cards">
  @for (filament of filaments; track filament.id) {
  <div class="filament-card" tabindex="0" [class.filament-card--selected]="selectedFilaments.has(filament.id)" (click)="multiSelect ? toggleSelection(filament) : filamentSelected.emit(filament)" (keyup.enter)="multiSelect ? toggleSelection(filament) : filamentSelected.emit(filament)" (keyup.space)="multiSelect ? toggleSelection(filament) : filamentSelected.emit(filament)" data-cy-filament-card>
    <div class="card-swatch" [style.background-color]="'#' + filament.colorHex"></div>
    <div class="card-content">
      <div class="card-row-primary">
        <span class="card-name">{{ filament.displayName }}</span>
        @if (!filament.isActive) {
        <span class="card-chip card-chip--inactive">Inactive</span>
        }
        <span class="card-chip">{{ filament.materialType }}</span>
        <span class="card-spacer"></span>
        <span class="card-weight"> {{ filament.filamentRemaining / 1000 | number: '1.0-0' }}g </span>
        @if (multiSelect) {
        <mat-checkbox [checked]="selectedFilaments.has(filament.id)" (click)="$event.stopPropagation()" (change)="toggleSelection(filament)"></mat-checkbox>
        } @else {
        <button
          mat-button
          class="transparent card-favorite-btn"
          [class.not-favorite-icon]="!filament.isFavorite"
          [attr.aria-label]="
                filament.isFavorite
                  ? 'Remove ' + filament.displayName + ' from favorites'
                  : 'Add ' + filament.displayName + ' to favorites'
              "
          (click)="
                $event.preventDefault();
                $event.stopPropagation();
                toggleFavorite(filament)
              "
        >
          <mat-icon>{{ filament.isFavorite ? 'star' : 'star_border' }}</mat-icon>
        </button>
        }
      </div>
      <div class="card-row-secondary">{{ filament.brand }}@if (filament.colorName) { &nbsp;·&nbsp;{{ filament.colorName }} }@if (filament.storageLocation) { &nbsp;·&nbsp;{{ filament.storageLocation }} }@if (filament.loadedInPrinter) { &nbsp;·&nbsp;Loaded: {{ getPrinterLabel(filament) }} }</div>
    </div>
  </div>
  }
</div>
```

**Step 2: Verify the app compiles**

```bash
npm run build:dev 2>&1 | tail -5
```

Expected: Build succeeds.

**Step 3: Commit**

```bash
git add src/app/shared/filament-list/filament-list.component.html
git commit -m "feat: add mobile card list template to filament-list"
```

---

### Task 4: Add filter panel and card SCSS to `filament-list`

**Files:**

- Modify: `src/app/shared/filament-list/filament-list.component.scss`

**Step 1: Replace the entire SCSS file**

The existing file has only minor styles. Replace it in full with the following (preserving all existing rules, adding new ones):

```scss
table {
  width: 100%;
  th,
  td {
    padding-right: 5px;
  }
  [mat-row]:hover {
    cursor: pointer;
    background-color: rgba(0, 0, 0, 0.05);
  }
}

.header {
  margin-left: 5px;
  margin-top: 5px;
}

// ── Filter bar ──────────────────────────────────────────────────────────────

.filter-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 4px;
}

.search-field {
  flex: 1;
  min-width: 160px;
}

.filter-toggle-btn {
  flex-shrink: 0;
  white-space: nowrap;
}

.filter-count-badge {
  margin-left: 2px;
}

// ── Collapsible filter panel ────────────────────────────────────────────────

.filter-panel {
  overflow: hidden;
  max-height: 0;
  opacity: 0;
  transition:
    max-height 0.25s ease,
    opacity 0.2s ease;

  &.filter-panel--open {
    max-height: 200px;
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
}

// ── Existing column/cell styles ─────────────────────────────────────────────

.mat-column-colorHex {
  flex: 0 0 70px !important;
  width: 70px !important;
}

.filament-color-cell {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 60px;
  height: 30px;
  position: relative;
  margin-right: 10px;
  border: 1px solid rgba(0, 0, 0, 0.15);
}

.no-filament {
  font-size: 16px;
  line-height: 28px;
  margin-left: 20px;
}

.mat-column-more {
  flex: 0 0 1% !important;
  width: 1% !important;
}

mat-checkbox {
  margin-right: 25px;
}

.not-favorite-icon {
  opacity: 25%;
}

.not-favorite-icon:hover {
  opacity: 100%;
}

// ── Mobile card list ─────────────────────────────────────────────────────────

// Cards hidden on desktop; table shown.
.filament-cards {
  display: none;
}

@media screen and (max-width: 599px) {
  // Hide table, show cards.
  table.filament-table {
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

    &:hover,
    &:focus {
      background-color: rgba(0, 0, 0, 0.05);
      outline: none;
    }

    &--selected {
      background-color: rgba(0, 0, 0, 0.04);
    }
  }

  .card-swatch {
    width: 40px;
    min-width: 40px;
    height: 48px;
    border: 1px solid rgba(0, 0, 0, 0.15);
    border-radius: 4px;
    flex-shrink: 0;
  }

  .card-content {
    flex: 1;
    min-width: 0;
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

  .card-favorite-btn {
    flex-shrink: 0;
    min-width: unset;
    padding: 0 4px;
  }

  .card-row-secondary {
    font-size: 12px;
    color: rgba(0, 0, 0, 0.54);
    margin-top: 2px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  // Small screen paginator padding fix (keep existing behavior).
  th.mat-mdc-header-cell:last-of-type,
  td.mat-mdc-cell:last-of-type,
  td.mat-mdc-footer-cell:last-of-type {
    padding-right: 5px !important;
  }

  .mat-column-more > button {
    width: 15px !important;
    padding: 0 5px !important;
  }
}
```

**Step 2: Run lint to catch any issues**

```bash
npm run lint:brief 2>&1 | tail -10
```

Expected: no new errors.

**Step 3: Verify the app builds**

```bash
npm run build:dev 2>&1 | tail -5
```

Expected: Build succeeds.

**Step 4: Commit**

```bash
git add src/app/shared/filament-list/filament-list.component.scss
git commit -m "feat: add mobile card styles and collapsible filter panel styles to filament-list"
```

---

### Task 5: Print list filter panel defaults open on desktop

**Files:**

- Modify: `src/app/print/print-list/print-list.component.ts:184`

**Step 1: Update `isFilterPanelOpen` initialization**

Find this line (line 184):

```typescript
public isFilterPanelOpen = false;
```

Replace with:

```typescript
public isFilterPanelOpen = typeof window !== 'undefined' && window.innerWidth >= 600;
```

**Step 2: Verify tests still pass**

```bash
npm run test:brief 2>&1 | grep -i "print-list\|FAILED\|ERROR" | head -10
```

Expected: no failures related to `print-list`.

**Step 3: Commit**

```bash
git add src/app/print/print-list/print-list.component.ts
git commit -m "feat: default filter panel open on desktop in print-list"
```

---

### Task 6: Add `maxWidth: '100vw'` to all three dialog call sites

**Files:**

- Modify: `src/app/print/edit-print-detail/edit-print-detail.component.ts`
- Modify: `src/app/print/print-list/print-list.component.ts`
- Modify: `src/app/printer/printer-detail/printer-detail.component.ts`

**Step 1: Fix `edit-print-detail.component.ts`**

Find the dialog open call (search for `FilamentSearchModalComponent`). The config currently looks like:

```typescript
{
  data: { ... },
  height: '80vh',
  width: '80vw',
}
```

Add `maxWidth: '100vw'`:

```typescript
{
  data: { ... },
  height: '80vh',
  width: '80vw',
  maxWidth: '100vw',
}
```

**Step 2: Fix `print-list.component.ts`**

Find the `dialog.open(FilamentSearchModalComponent, ...)` call. Add `maxWidth: '100vw'` to the config object alongside the existing `height`, `width`, and `position` properties.

**Step 3: Fix `printer-detail.component.ts`**

Find the `dialog.open(FilamentSearchModalComponent, ...)` call. It currently has no size config. Add:

```typescript
{
  data: { otherFilamentOption: null },
  maxWidth: '100vw',
}
```

**Step 4: Verify the app builds**

```bash
npm run build:dev 2>&1 | tail -5
```

Expected: Build succeeds.

**Step 5: Commit**

```bash
git add src/app/print/edit-print-detail/edit-print-detail.component.ts src/app/print/print-list/print-list.component.ts src/app/printer/printer-detail/printer-detail.component.ts
git commit -m "fix: prevent filament search dialog from clipping on narrow screens"
```

---

### Task 7: Run full test suite and lint

**Step 1: Run all tests**

```bash
npm run test:brief
```

Expected: All tests pass (no new failures).

**Step 2: Run lint**

```bash
npm run lint:brief
```

Expected: No new errors or warnings.

**Step 3: If any failures**, investigate and fix before proceeding.
