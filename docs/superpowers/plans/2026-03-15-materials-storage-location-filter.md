# Materials Storage Location Filter — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Filter by Storage Location" single-select dropdown to the `/materials` filter panel, backed by a new API query parameter.

**Architecture:** The storage location list is fetched at route resolution via a new `ResolveFn` resolver, pre-populating the dropdown. The selected location is passed as a query param through the Angular router → service → API chain, matching the existing `filterByMaterialCategory` pattern. A sentinel value (`__unassigned__`) enables filtering for filaments with no storage location.

**Tech Stack:** Angular 20 (module-based component, `ngModel`, `MatSelect`, `ResolveFn`), C# ASP.NET Core Web API, Entity Framework Core.

**Spec:** `docs/superpowers/specs/2026-03-15-materials-storage-location-filter-design.md`

---

## Chunk 1: Backend + Angular Service

### Task 1: Update C# API Controller

**Files:**

- Modify: `D:/Development/3d-print-log/PrintLogApi/PrintLogApi/Controllers/FilamentsController.cs:47-72`

- [ ] **Step 1: Add `filterByStorageLocation` parameter to the controller action**

  Open `FilamentsController.cs`. Find the `GetFilamentSummariesForUser` action (starts around line 47). Add `[FromQuery] string filterByStorageLocation` alongside `filterByMaterialCategoryNickname`, then pass it to the service call.

  The method signature should look like:

  ```csharp
  public async Task<ActionResult<PagedList<FilamentSummaryDto>>> GetFilamentSummariesForUser(
      [FromQuery] PagedRequest pagingRequest,
      [FromQuery] SortRequest<FilamentSummarySortColumn> sortRequest,
      [FromQuery] string searchText,
      [FromQuery] string filterByMaterialCategoryNickname,
      [FromQuery] string filterByStorageLocation,
      [FromQuery] bool? includeInactive,
      [FromQuery] bool? showFavoritesOnly,
      [FromQuery] bool? showLoadedFilamentOnly)
  ```

  The service call inside (around line 62) should become:

  ```csharp
  return await _filamentService.GetFilamentSummaryForUser(currentUserId.Value,
      sortRequest.SortDirection,
      sortRequest.SortColumn,
      pagingRequest.PageNumber,
      pagingRequest.PageSize,
      searchText,
      filterByMaterialCategoryNickname,
      filterByStorageLocation,
      includeInactive,
      showFavoritesOnly,
      showLoadedFilamentOnly);
  ```

- [ ] **Step 2: Commit**
  ```bash
  git add PrintLogApi/PrintLogApi/Controllers/FilamentsController.cs
  git commit -m "feat: add filterByStorageLocation query param to FilamentsController"
  ```
  _(Run from the `PrintLogApi` repo root, not the UI root)_

---

### Task 2: Update C# Service Filter Logic

**Files:**

- Modify: `D:/Development/3d-print-log/PrintLogApi/PrintLogApi/Services/FilamentService.cs`

- [ ] **Step 1: Add `filterByStorageLocation` to the service method signature**

  Find `GetFilamentSummaryForUser` in `FilamentService.cs`. The current signature is:

  ```csharp
  public async Task<PagedList<FilamentSummaryDto>> GetFilamentSummaryForUser(
      long userId,
      SortDirection sortDirection,
      FilamentSummarySortColumn sortColumn,
      int pageNumber,
      int pageSize,
      string searchText,
      string filterByMaterialCategoryNickname,
      bool? includeInactive,
      bool? showFavoritesOnly,
      bool? showLoadedFilamentOnly)
  ```

  Add `string filterByStorageLocation` after `filterByMaterialCategoryNickname` and before `bool? includeInactive`:

  ```csharp
  public async Task<PagedList<FilamentSummaryDto>> GetFilamentSummaryForUser(
      long userId,
      SortDirection sortDirection,
      FilamentSummarySortColumn sortColumn,
      int pageNumber,
      int pageSize,
      string searchText,
      string filterByMaterialCategoryNickname,
      string filterByStorageLocation,
      bool? includeInactive,
      bool? showFavoritesOnly,
      bool? showLoadedFilamentOnly)
  ```

- [ ] **Step 2: Add the filter clause after the `filterByMaterialCategoryNickname` block**

  Locate the existing block:

  ```csharp
  if (!string.IsNullOrEmpty(filterByMaterialCategoryNickname))
  {
      filament = filament.Where(f => f.MaterialCategory.Nickname == filterByMaterialCategoryNickname);
  }
  ```

  Add directly after it:

  ```csharp
  if (!string.IsNullOrEmpty(filterByStorageLocation))
  {
      if (filterByStorageLocation == "__unassigned__")
          filament = filament.Where(f => f.StorageLocation == null || f.StorageLocation == "");
      else
          filament = filament.Where(f => f.StorageLocation == filterByStorageLocation);
  }
  ```

- [ ] **Step 3: Build the API to confirm no compile errors**

  ```bash
  dotnet build
  ```

  Expected: `Build succeeded. 0 Error(s)`

- [ ] **Step 4: Commit**
  ```bash
  git add PrintLogApi/PrintLogApi/Services/FilamentService.cs
  git commit -m "feat: add filterByStorageLocation filter clause to FilamentService"
  ```

---

### Task 3: Update Angular `FilamentService`

**Files:**

- Modify: `src/app/core/services/filament.service.ts:143-192`

- [ ] **Step 1: Add `filterByStorageLocation` parameter**

  Open `filament.service.ts`. In `getCurrentUserFilamentSummaries()`, add `filterByStorageLocation?: string` as the last parameter (after `filterByMaterialCategoryNickname`).

  Full updated signature:

  ```typescript
  getCurrentUserFilamentSummaries(
    pageNumber: number = 1,
    pageSize: number = 10,
    sortColumn: FilamentSortColumns = FilamentSortColumns.FilamentRemaining,
    sortDirection: SortDirection = SortDirection.Desc,
    searchText?: string,
    includeInactive?: boolean,
    showFavoritesOnly?: boolean,
    showLoadedFilamentOnly?: boolean,
    filterByMaterialCategoryNickname?: string,
    filterByStorageLocation?: string
  ): Observable<PagedList<FilamentSummary>>
  ```

- [ ] **Step 2: Append the query param when non-empty**

  After the existing `filterByMaterialCategoryNickname` block (lines ~166-174) and before the `includeInactive` block (line ~176), insert:

  ```typescript
  if (filterByStorageLocation !== undefined && filterByStorageLocation !== '') {
    params = params.set('filterByStorageLocation', filterByStorageLocation.trim());
  }
  ```

- [ ] **Step 3: Run lint to confirm no issues**

  ```bash
  npm run lint:brief
  ```

  Expected: no errors.

- [ ] **Step 4: Commit**
  ```bash
  git add src/app/core/services/filament.service.ts
  git commit -m "feat: add filterByStorageLocation param to Angular FilamentService"
  ```

---

## Chunk 2: Resolver, Routing, and List Resolver

### Task 4: Create the Storage Location Resolver

**Files:**

- Create: `src/app/filament/resolvers/filament-storage-location-resolver.service.ts`

- [ ] **Step 1: Create the resolver file**

  Create `src/app/filament/resolvers/filament-storage-location-resolver.service.ts` with this exact content:

  ```typescript
  import { inject } from '@angular/core';
  import { ResolveFn } from '@angular/router';
  import { of } from 'rxjs';
  import { catchError, map } from 'rxjs/operators';
  import { FilamentService } from 'src/app/core/services/filament.service';

  export const FilamentStorageLocationResolverService: ResolveFn<string[]> = (route, state, filamentService = inject(FilamentService)) => {
    return filamentService.getFilamentStorageLocations().pipe(
      map((result) => result.storageLocations),
      catchError(() => of([]))
    );
  };
  ```

  Note: `ResolveFn` is a function-style resolver — no `@Injectable()` decorator, no class, and no entry in `filament.module.ts` providers. This matches the pattern used by `MaterialCategoryResolverService` in `src/app/core/resolvers/material-category-resolver.service.ts`.

- [ ] **Step 2: Run lint**

  ```bash
  npm run lint:brief
  ```

  Expected: no errors.

- [ ] **Step 3: Commit**
  ```bash
  git add src/app/filament/resolvers/filament-storage-location-resolver.service.ts
  git commit -m "feat: add FilamentStorageLocationResolverService"
  ```

---

### Task 5: Register Resolver on Route + Fix List Resolver

**Files:**

- Modify: `src/app/filament/filament-routing.module.ts`
- Modify: `src/app/filament/resolvers/filament-list-resolver.service.ts`

- [ ] **Step 1: Register the new resolver in the routing module**

  Open `filament-routing.module.ts`. Find the list route's `resolve` object (currently has `filamentList` and `materialCategories`). Add the import and the new resolver:

  Import at the top:

  ```typescript
  import { FilamentStorageLocationResolverService } from './resolvers/filament-storage-location-resolver.service';
  ```

  Updated resolve object:

  ```typescript
  resolve: {
    filamentList: FilamentListResolverService,
    materialCategories: MaterialCategoryResolverService,
    storageLocations: FilamentStorageLocationResolverService,
  },
  ```

- [ ] **Step 2: Fix the list resolver — add missing `filterByMaterialCategory` and new `filterByStorageLocation`**

  Open `filament-list-resolver.service.ts`. The `resolve()` method destructures `route.queryParams` but currently omits `filterByMaterialCategory` entirely. Fix that omission and add `filterByStorageLocation` at the same time.

  > **URL param name note:** The component writes `filterByMaterialCategory` (not `filterByMaterialCategoryNickname`) to the URL. The service method parameter is named `filterByMaterialCategoryNickname`. The resolver correctly bridges them: extract `filterByMaterialCategory` from query params, pass it positionally as the `filterByMaterialCategoryNickname` argument. The same approach applies to `filterByStorageLocation` — same name in URL and service.

  Replace the destructuring block:

  ```typescript
  const { pageNumber = 1, pageSize = defaultPageSize, searchText = '', includeInactive, showFavoritesOnly, showLoadedFilamentOnly, sortDirection = SortDirection.Desc, sortColumn = FilamentSortColumns.FilamentRemaining } = route.queryParams;
  ```

  With:

  ```typescript
  const { pageNumber = 1, pageSize = defaultPageSize, searchText = '', includeInactive, showFavoritesOnly, showLoadedFilamentOnly, filterByMaterialCategory = '', filterByStorageLocation = '', sortDirection = SortDirection.Desc, sortColumn = FilamentSortColumns.FilamentRemaining } = route.queryParams;
  ```

  Replace the service call:

  ```typescript
  return this.filamentService.getCurrentUserFilamentSummaries(pageNumber, pageSize, sortColumn, sortDirection, searchText, includeInactive, showFavoritesOnly, showLoadedFilamentOnly);
  ```

  With:

  ```typescript
  return this.filamentService.getCurrentUserFilamentSummaries(pageNumber, pageSize, sortColumn, sortDirection, searchText, includeInactive, showFavoritesOnly, showLoadedFilamentOnly, filterByMaterialCategory, filterByStorageLocation);
  ```

- [ ] **Step 3: Run lint**

  ```bash
  npm run lint:brief
  ```

  Expected: no errors.

- [ ] **Step 4: Commit**
  ```bash
  git add src/app/filament/filament-routing.module.ts src/app/filament/resolvers/filament-list-resolver.service.ts
  git commit -m "feat: register storage location resolver and fix list resolver filter params"
  ```

---

## Chunk 3: Component Changes + Tests

### Task 6: Update Component Tests First (TDD)

**Files:**

- Modify: `src/app/filament/filament-list-container/filament-list-container.component.spec.ts`

The component spec uses isolated unit tests — no TestBed. The component is constructed directly with stubs. All tests live in `filament-list-container.component.spec.ts`.

- [ ] **Step 1: Add the failing `filterByStorageLocation` test to `activeFilterCount`**

  In the `describe('activeFilterCount')` block, add a new test after the existing `counts filterByMaterialCategory when set` test:

  ```typescript
  it('counts filterByStorageLocation when set', () => {
    component.showFavoritesOnly = false;
    component.showLoadedFilamentOnly = false;
    component.includeInactive = false;
    component.filterByMaterialCategory = '';
    component.filterByStorageLocation = 'Box 1';
    expect(component.activeFilterCount).toBe(1);
  });
  ```

  Also rename the existing `counts all four active filters` test to `counts all five active filters` and update its body in place (do not add a second test — duplicate test names cause Jasmine warnings):

  ```typescript
  it('counts all five active filters', () => {
    component.showFavoritesOnly = true;
    component.showLoadedFilamentOnly = true;
    component.includeInactive = true;
    component.filterByMaterialCategory = 'PETG';
    component.filterByStorageLocation = 'Box 1';
    expect(component.activeFilterCount).toBe(5);
  });
  ```

- [ ] **Step 2: Add the failing `filterByStorageLocation` assertion to `resetFilters`**

  In the `describe('resetFilters')` → `'resets all filter fields to defaults'` test, add:

  ```typescript
  component.filterByStorageLocation = 'Box 2';
  ```

  to the setup block, and:

  ```typescript
  expect(component.filterByStorageLocation).toBe('');
  ```

  to the assertions.

- [ ] **Step 3: Run the tests — expect failures**

  ```bash
  npm run test:brief
  ```

  Expected: failures mentioning `filterByStorageLocation` does not exist on component. This confirms the tests are wired correctly before implementation.

- [ ] **Step 4: Commit the failing tests**
  ```bash
  git add src/app/filament/filament-list-container/filament-list-container.component.spec.ts
  git commit -m "test: add failing tests for filterByStorageLocation filter"
  ```

---

### Task 7: Implement Component Logic

**Files:**

- Modify: `src/app/filament/filament-list-container/filament-list-container.component.ts`

- [ ] **Step 1: Add the two new class properties**

  After the existing `filterByMaterialCategory: string = '';` property (line ~76), add:

  ```typescript
  public storageLocations: string[] = [];
  public filterByStorageLocation: string = '';
  ```

- [ ] **Step 2: Read `filterByStorageLocation` from query params in `ngOnInit`**

  In the `activatedRoute.queryParamMap.subscribe()` block (lines ~112-147), add after the `filterByMaterialCategory` block:

  ```typescript
  if (params.has('filterByStorageLocation')) {
    this.filterByStorageLocation = params.get('filterByStorageLocation') ?? '';
  }
  ```

- [ ] **Step 3: Populate `storageLocations` from resolved route data**

  In the `activatedRoute.data.subscribe()` block (lines ~149-154), add:

  ```typescript
  this.storageLocations = data.storageLocations ?? [];
  ```

  The full block should look like:

  ```typescript
  this.activatedRoute.data.subscribe((data) => {
    this.materialCategories = data.materialCategories;
    this.storageLocations = data.storageLocations ?? [];

    const pagedResponse: PagedList<FilamentSummary> = data.filamentList;
    this.handlePagedList(pagedResponse);
  });
  ```

- [ ] **Step 4: Add `filterByStorageLocation` to `updateFilter()`**

  In `updateFilter()`, add to the `router.navigate()` queryParams object (after `filterByMaterialCategory`):

  ```typescript
  filterByStorageLocation: this.filterByStorageLocation || '',
  ```

  Add to the `getCurrentUserFilamentSummaries()` call (as the last argument, after `filterByMaterialCategory`):

  ```typescript
  this.filterByStorageLocation;
  ```

- [ ] **Step 5: Add to `resetFilters()`**

  In `resetFilters()`, add after `this.filterByMaterialCategory = '';`:

  ```typescript
  this.filterByStorageLocation = '';
  ```

- [ ] **Step 6: Add to `activeFilterCount` getter**

  In the `activeFilterCount` getter, add after the `filterByMaterialCategory` check:

  ```typescript
  if (this.filterByStorageLocation) count++;
  ```

- [ ] **Step 7: Run the tests — expect them to pass now**

  ```bash
  npm run test:brief
  ```

  Expected: all tests pass, no failures.

- [ ] **Step 8: Commit**
  ```bash
  git add src/app/filament/filament-list-container/filament-list-container.component.ts
  git commit -m "feat: add filterByStorageLocation field and wiring to filament list component"
  ```

---

### Task 8: Add the Filter Dropdown to the Template

**Files:**

- Modify: `src/app/filament/filament-list-container/filament-list-container.component.html:122-138`

- [ ] **Step 1: Add the `mat-select` below "Filter by Category"**

  In the filter panel `<div class="filter-panel-inner">`, locate the existing "Filter by Category" `mat-form-field` block (ends around line 138, just before the Reset Filters button). Insert the following directly after it, before the Reset Filters button:

  ```html
  <mat-form-field class="filter-field" subscriptSizing="dynamic">
    <mat-label>Filter by Storage Location</mat-label>
    <mat-select [(ngModel)]="filterByStorageLocation" (ngModelChange)="updateFilter()">
      <mat-option value="">No Filter</mat-option>
      @for (location of storageLocations; track location) {
      <mat-option [value]="location">{{ location }}</mat-option>
      }
      <mat-option value="__unassigned__">Unassigned</mat-option>
    </mat-select>
  </mat-form-field>
  ```

  The `filter-field` CSS class and the wrapping flex layout already handle desktop and mobile — no new CSS is needed.

- [ ] **Step 2: Run lint and tests**

  ```bash
  npm run lint:brief && npm run test:brief
  ```

  Expected: no lint errors, all tests pass.

- [ ] **Step 3: Commit**
  ```bash
  git add src/app/filament/filament-list-container/filament-list-container.component.html
  git commit -m "feat: add Filter by Storage Location dropdown to materials filter panel"
  ```

---

## Manual Verification Checklist

After all tasks are complete, verify end-to-end:

- [ ] Navigate to `/materials` — the filter panel has a "Filter by Storage Location" dropdown
- [ ] Open the dropdown — it lists your storage locations alphabetically with "Unassigned" at the bottom and "No Filter" at the top
- [ ] Select a named location — the table/cards update to show only filaments in that location; the URL contains `filterByStorageLocation=Box+1` (or similar)
- [ ] Select "Unassigned" — only filaments with no storage location are shown; URL contains `filterByStorageLocation=__unassigned__`
- [ ] The filter badge count on the "Filters" button increments when a storage location is selected
- [ ] Click "Reset Filters" — the storage location filter clears along with all others
- [ ] Reload the page with `?filterByStorageLocation=Box+1` in the URL — the filter is pre-selected and data is pre-filtered (verifies resolver fix)
- [ ] On mobile width (< 600px) — dropdown is visible and functional in the filter panel
- [ ] "Print Labels" button with a storage location filter active — opens QR label dialog for the filtered set
