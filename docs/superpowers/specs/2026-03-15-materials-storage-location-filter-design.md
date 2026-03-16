# Materials Page: Filter by Storage Location

**Date:** 2026-03-15
**Status:** Approved

## Overview

Add a "Filter by Storage Location" single-select dropdown to the `/materials` filter panel. Storage locations are pre-populated from the existing `GET /api/Filaments/storage-locations` endpoint via a new resolver. The filter is passed as a query param to the API, which applies a server-side `WHERE` clause. An "Unassigned" option lets users filter for filaments with no storage location set.

Primary use case: filtering the list to a single storage box before printing QR labels for everything in it.

## Backend Changes

### `FilamentsController.cs`

Add `filterByStorageLocation` as a `[FromQuery] string` parameter to `GetFilamentSummariesForUser` and pass it through to the service.

```csharp
[HttpGet]
public async Task<ActionResult<PagedList<FilamentSummaryDto>>> GetFilamentSummariesForUser(
    [FromQuery] PagedRequest pagingRequest,
    [FromQuery] SortRequest<FilamentSummarySortColumn> sortRequest,
    [FromQuery] string searchText,
    [FromQuery] string filterByMaterialCategoryNickname,
    [FromQuery] string filterByStorageLocation,   // NEW
    [FromQuery] bool? includeInactive,
    [FromQuery] bool? showFavoritesOnly,
    [FromQuery] bool? showLoadedFilamentOnly)
```

### `FilamentService.cs`

Add `filterByStorageLocation` to `GetFilamentSummaryForUser` and apply filter logic:

```csharp
if (!string.IsNullOrEmpty(filterByStorageLocation))
{
    if (filterByStorageLocation == "__unassigned__")
        filament = filament.Where(f => f.StorageLocation == null || f.StorageLocation == "");
    else
        filament = filament.Where(f => f.StorageLocation == filterByStorageLocation);
}
```

Sentinel value `"__unassigned__"` filters for filaments with a null or empty storage location.

## Frontend Changes

### New File: `FilamentStorageLocationResolverService`

Location: `src/app/filament/resolvers/filament-storage-location-resolver.service.ts`

A `ResolveFn<string[]>` that calls `filamentService.getFilamentStorageLocations()` and returns the `storageLocations` string array. Mirrors the shape of `MaterialCategoryResolverService`.

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

Add `filterByStorageLocation?: string` parameter to `getCurrentUserFilamentSummaries()`. When non-empty, append it as a `filterByStorageLocation` query param.

### `filament-list-resolver.service.ts`

Extract `filterByStorageLocation` from `route.queryParams` and pass it to `getCurrentUserFilamentSummaries()`.

### `filament-list-container.component.ts`

- Add `storageLocations: string[] = []` populated from `activatedRoute.data.storageLocations`
- Add `filterByStorageLocation: string = ''`
- Read `filterByStorageLocation` from query params in `ngOnInit`
- Include in `updateFilter()` (query param + service call)
- Include in `resetFilters()` (reset to `''`)
- Include in `activeFilterCount` getter (increment when non-empty)

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

The existing filter panel already wraps responsively on mobile, so no additional layout changes are needed.

## Data Flow

1. User navigates to `/materials` → resolver fetches storage locations and filament list in parallel
2. Filter panel shows "Filter by Storage Location" dropdown pre-populated with the user's locations
3. User selects a location → `updateFilter()` updates the URL query params and calls the API with `filterByStorageLocation`
4. API applies WHERE clause, returns filtered paged results
5. User clicks "Print Labels" → prints QR labels for all filtered filaments on the current page (or selected subset)

## Not In Scope

- Multi-select storage location filtering
- Creating/renaming storage locations from the filter panel (managed on individual filament detail pages)
