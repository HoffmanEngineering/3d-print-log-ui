# Materials Page: Filter by Storage Location

**Date:** 2026-03-15
**Status:** Approved

## Overview

Add a "Filter by Storage Location" single-select dropdown to the `/materials` filter panel. Storage locations are pre-populated from the existing `GET /api/Filaments/storage-locations` endpoint via a new resolver. The filter is passed as a query param to the API, which applies a server-side `WHERE` clause. An "Unassigned" option lets users filter for filaments with no storage location set.

Primary use case: filtering the list to a single storage box before printing QR labels for everything in it.

## Known Limitations

- Storage locations are fetched once at route resolution. If the user adds or renames a storage location without navigating away and back, the dropdown list will be stale. Acceptable — users can navigate away and back to refresh.
- Selecting a filter from the dropdown does not reset the current page to page 1. This matches the existing behavior of the "Filter by Category" dropdown.
- A user who literally names a storage box `__unassigned__` would be unable to filter for it by name — the sentinel value would match the "Unassigned" filter instead. This edge case is considered acceptable.

## Files Changed

| File                                                                                 | Change                                                                   |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| `PrintLogApi/Controllers/FilamentsController.cs`                                     | Add `filterByStorageLocation` query param                                |
| `PrintLogApi/Services/FilamentService.cs`                                            | Add filter clause                                                        |
| `src/app/filament/resolvers/filament-storage-location-resolver.service.ts`           | New `ResolveFn`                                                          |
| `src/app/filament/filament-routing.module.ts`                                        | Register new resolver on list route                                      |
| `src/app/core/services/filament.service.ts`                                          | Add `filterByStorageLocation` param                                      |
| `src/app/filament/resolvers/filament-list-resolver.service.ts`                       | Pass `filterByStorageLocation` and `filterByMaterialCategory` to service |
| `src/app/filament/filament-list-container/filament-list-container.component.ts`      | New filter field + wiring                                                |
| `src/app/filament/filament-list-container/filament-list-container.component.html`    | New `mat-select` in filter panel                                         |
| `src/app/filament/filament-list-container/filament-list-container.component.spec.ts` | Update `activeFilterCount` and `resetFilters` tests                      |

Note: `filament.module.ts` does NOT need updating. The new resolver uses the `ResolveFn` style (same as `MaterialCategoryResolverService`), which does not require registration in module `providers`.

## Backend Changes

### `FilamentsController.cs`

Add `filterByStorageLocation` as a `[FromQuery] string` parameter to `GetFilamentSummariesForUser`, alongside the existing `filterByMaterialCategoryNickname`, and pass it through to the service call.

### `FilamentService.cs`

Add `filterByStorageLocation` to `GetFilamentSummaryForUser` and apply filter logic after the existing `filterByMaterialCategoryNickname` block:

```csharp
if (!string.IsNullOrEmpty(filterByStorageLocation))
{
    if (filterByStorageLocation == "__unassigned__")
        filament = filament.Where(f => f.StorageLocation == null || f.StorageLocation == "");
    else
        filament = filament.Where(f => f.StorageLocation == filterByStorageLocation);
}
```

Sentinel value `"__unassigned__"` is intentional and will appear as-is in the URL. This is acceptable.

## Frontend Changes

### New File: `FilamentStorageLocationResolverService`

Location: `src/app/filament/resolvers/filament-storage-location-resolver.service.ts`

Use the `ResolveFn<string[]>` style (same as `MaterialCategoryResolverService`) — no `@Injectable()` class, no entry in `filament.module.ts` providers.

1. Call `filamentService.getFilamentStorageLocations()` — returns `Observable<FilamentStorageLocations>` where `FilamentStorageLocations = { storageLocations: string[] }`
2. Pipe with `map(result => result.storageLocations)` to extract the string array
3. Use `catchError(() => of([]))` so a failed API call returns an empty array and allows navigation to proceed

```typescript
export const FilamentStorageLocationResolverService: ResolveFn<string[]> = (route, state, filamentService = inject(FilamentService)) => {
  return filamentService.getFilamentStorageLocations().pipe(
    map((result) => result.storageLocations),
    catchError(() => of([]))
  );
};
```

### `filament-routing.module.ts`

Register the new resolver on the list route alongside `materialCategories`:

```typescript
resolve: {
  filamentList: FilamentListResolverService,
  materialCategories: MaterialCategoryResolverService,
  storageLocations: FilamentStorageLocationResolverService,  // NEW
},
```

### `filament.service.ts`

Add `filterByStorageLocation?: string` parameter to `getCurrentUserFilamentSummaries()`. Follow the same pattern as `filterByMaterialCategoryNickname`: when non-empty, append it as a `filterByStorageLocation` query param.

### `filament-list-resolver.service.ts`

This resolver currently does not extract `filterByMaterialCategory` from query params — it only extracts paging, sort, and text/boolean filters. As part of this change, fix that omission and add `filterByStorageLocation` at the same time:

```typescript
const {
  pageNumber = 1,
  pageSize = defaultPageSize,
  searchText = '',
  includeInactive,
  showFavoritesOnly,
  showLoadedFilamentOnly,
  filterByMaterialCategory = '', // FIX: was missing
  filterByStorageLocation = '', // NEW
  sortDirection = SortDirection.Desc,
  sortColumn = FilamentSortColumns.FilamentRemaining,
} = route.queryParams;

return this.filamentService.getCurrentUserFilamentSummaries(
  pageNumber,
  pageSize,
  sortColumn,
  sortDirection,
  searchText,
  includeInactive,
  showFavoritesOnly,
  showLoadedFilamentOnly,
  filterByMaterialCategory, // FIX
  filterByStorageLocation // NEW
);
```

### `filament-list-container.component.ts`

This is a module-based (non-standalone) component using class properties (not signals).

- Add `storageLocations: string[] = []`
- Add `filterByStorageLocation: string = ''`
- In the existing `activatedRoute.data.subscribe()` block in `ngOnInit`, add: `this.storageLocations = data.storageLocations ?? [];`
- In the existing `activatedRoute.queryParamMap.subscribe()` block, add: `if (params.has('filterByStorageLocation')) { this.filterByStorageLocation = params.get('filterByStorageLocation'); }`
- In `updateFilter()`: pass `filterByStorageLocation` to the service call and include `filterByStorageLocation: this.filterByStorageLocation || ''` in the `router.navigate()` query params
- In `resetFilters()`: add `this.filterByStorageLocation = '';`
- In `activeFilterCount` getter: add `if (this.filterByStorageLocation) count++;`

### `filament-list-container.component.html`

Add a second `mat-select` in the filter panel, directly below "Filter by Category":

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

The "Unassigned" option appears at the bottom with no visual separator — consistent with how "No Filter" sits at the top without one. The existing `filter-field` class and wrapping flex layout handle both desktop and mobile without additional CSS.

### `filament-list-container.component.spec.ts`

- Update the `activeFilterCount` test: the maximum count is now 5 (was 4); add a case for `filterByStorageLocation`
- Update the `resetFilters` test: assert that `filterByStorageLocation` is reset to `''`
- Add a test that verifies `storageLocations` is populated from `activatedRoute.data`

## Data Flow

1. User navigates to `/materials` → resolver fetches storage locations and filament list in parallel; on storage location API failure, resolver returns `[]` and navigation proceeds
2. Filter panel shows "Filter by Storage Location" dropdown with named locations and "Unassigned" at the bottom
3. User selects a location → `updateFilter()` updates URL query params and calls the API with `filterByStorageLocation`
4. API applies WHERE clause, returns filtered paged results
5. User clicks "Print Labels" → prints QR labels for filaments on current page (or selected subset)

## Not In Scope

- Multi-select storage location filtering
- Creating/renaming storage locations from the filter panel (managed on individual filament detail pages)
