# Unified Print List — Grouped View Design

**Date:** 2026-04-15
**Branch:** feat/print-projects-story-61

## Context

The Print List has two view modes: All Prints (a `mat-table`) and Grouped By Project (an accordion). The grouped view is a completely independent component with its own data source, no search/filter support, no sorting, and no "Add New Print" button. Users switching to the grouped view lose all filtering and search capability.

The goal is to unify the two views so that search, filters, sorting, and "Add New Print" work identically in both modes, and the grouped view renders as a `mat-table` consistent with the All Prints view — project groups appearing as expandable rows rather than a separate accordion UI.

---

## Backend Changes

### Files

- `PrintLogApi/PrintLogApi/Controllers/PrintsController.cs` — `GetGrouped` action
- `PrintLogApi/PrintLogApi/Services/PrintService.cs` — `GetGroupedFeedAsync`
- `PrintLogApi/PrintLogApi/Models/DTOs/Print/GroupedFeedItemDto.cs`

### `GroupedFeedItemDto` additions

Add three new properties for project rows:

```csharp
public int? FilteredPrintCount { get; set; }  // prints matching current filters; null when no filters active
public ICollection<PrintFilamentSummaryDto> FilamentUsage { get; set; }  // aggregated across all project prints, grouped by FilamentId
public ICollection<PrinterSummary> Printers { get; set; }  // distinct printers used across all project prints
```

### `GetGrouped` controller action

Add the same query parameters used by `GetPrintSummary`:

```csharp
[HttpGet("grouped")]
public async Task<ActionResult<PagedList<GroupedFeedItemDto>>> GetGrouped(
    [FromQuery] int pageNumber = 1,
    [FromQuery] int pageSize = 20,
    [FromQuery] string searchText = null,
    [FromQuery] IEnumerable<long> filterByPrinterIds = null,
    [FromQuery] IEnumerable<Guid> filterByFilamentIds = null,
    [FromQuery] Print.PrintStatus? filterByStatus = null,
    [FromQuery] SortRequest<PrintSummarySortColumn> sortRequest = null)
```

Pass all params through to `GetGroupedFeedAsync`.

### `GetGroupedFeedAsync` service method

Rewrite to apply filters before grouping:

1. **Build filtered print IQueryable** — same chaining pattern as `SearchPrintSummary`: text search on `Title`/`Notes`, status filter, printer ID filter, filament ID filter. Scope to `CreatedById == userId`.

2. **Project rows:**

   - Group filtered prints by `ProjectId` (non-null) to get `{ ProjectId, FilteredPrintCount }` per project
   - Fetch those projects with `.Include(p => p.Prints).ThenInclude(pr => pr.FilamentUsage).ThenInclude(pf => pf.Filament)` and `.Include(p => p.Prints).ThenInclude(pr => pr.Printer)` and `.Include(p => p.Images)`
   - For each project, compute:
     - `FilteredPrintCount` from the grouped query result
     - `PrintCount` = `p.Prints.Count` (total, unfiltered)
     - `FilamentUsage` = group all `p.Prints.SelectMany(pr => pr.FilamentUsage)` by `FilamentId`, sum `AmountMg` (falling back to `EstimatedAmountMg` using the same precedence rule already in the codebase), project to `PrintFilamentSummaryDto`
     - `Printers` = `p.Prints.Select(pr => pr.Printer).DistinctBy(pr => pr.Id)`, mapped to `PrinterSummary`
     - `SortDate` = project `CreatedDate` (unchanged)
   - When no filters are active, all projects are included (matches current behavior)

3. **Ungrouped print rows:**

   - Apply the same filtered query with `.Where(p => p.ProjectId == null)`
   - Two-phase load: IDs first, then full data with includes (same pattern as `SearchPrintSummary`)

4. **Sorting the merged list:**

   - `StartDate` → `SortDate` on each item (existing behavior)
   - `Title` → project name for project rows, print title for print rows
   - `FilamentUsage` → `TotalFilamentWeightMg` for project rows, `TotalFilamentWeightMg` for print rows
   - Respect `SortDirection` (Asc/Desc)

5. **Paginate** the merged sorted list (existing in-memory approach is fine).

---

## Frontend Changes

### Files

- `src/app/print/print-list/print-list.component.html`
- `src/app/print/print-list/print-list.component.ts`
- `src/app/print/print-list/print-grouped-view/print-grouped-view.component.ts`
- `src/app/print/print-list/print-grouped-view/print-grouped-view.component.html`
- `src/app/core/services/project.service.ts` — update `getGroupedFeed()` to pass filter params

### PrintListComponent changes

- Ensure the search bar, filter panel, and "Add New Print" button are visible in both `viewMode === 'list'` and `viewMode === 'grouped'`. Remove any `@if (viewMode === 'list')` guards on those elements.
- Pass filter/sort/column state to `<app-print-grouped-view>` via `input()` bindings:
  ```html
  <app-print-grouped-view [searchText]="searchText" [filterByStatus]="filterByStatus()" [filterByPrinterIds]="filterByPrinterIds()" [filterByFilamentIds]="filterByFilamentIds()" [sortColumn]="sortColumn" [sortDirection]="sortDirection" [displayedColumns]="displayedColumns()" />
  ```

### PrintGroupedViewComponent changes

**Inputs (replace existing component interface):**

```typescript
searchText = input<string>('');
filterByStatus = input<PrintStatus | null>(null);
filterByPrinterIds = input<number[]>([]);
filterByFilamentIds = input<string[]>([]);
sortColumn = input<PrintSummarySortColumn>(PrintSummarySortColumn.StartDate);
sortDirection = input<SortDirection>(SortDirection.Desc);
displayedColumns = input<string[]>([]);
```

**State:**

```typescript
type GroupedRow = { kind: 'project'; item: GroupedFeedItemDto; expanded: boolean } | { kind: 'print'; item: GroupedFeedItemDto } | { kind: 'expanded-print'; print: PrintSummary; projectId: string } | { kind: 'more-prints'; projectId: string; count: number };

flatRows = signal<GroupedRow[]>([]);
expandedProjectPrints = signal<Map<string, PrintSummary[]>>(new Map());
loading = signal(true);
pageNumber = signal(1);
```

**Re-fetch on filter change:**
Use `effect()` watching all filter inputs. Debounce `searchText` changes (400ms, matching the list view). On change, reset `pageNumber` to 1, clear `expandedProjectPrints`, and re-call `getGroupedFeed()`. Rebuild `flatRows` from the response.

**Project expansion:**

- `onProjectToggle(projectId)`: if already expanded, collapse (remove its rows from `flatRows`). If not yet expanded, call `printService.getPrintSummaries({ filterByProjectId, ...currentFilters })`, cache in `expandedProjectPrints`, insert `expanded-print` rows and a `more-prints` row (if `filteredPrintCount < totalPrintCount`) into `flatRows` after the project row.
- Re-expanding a cached project re-inserts from cache without a network call.

**Template — mat-table with mixed row types:**

Three `matRowDef` entries with `when` predicates:

- `when: isProjectRow` — `kind === 'project'`
- `when: isPrintRow` — `kind === 'print'` (ungrouped)
- `when: isExpandedPrintRow` — `kind === 'expanded-print'`
- `when: isMorePrintsRow` — `kind === 'more-prints'` (spans all columns)

Each column def handles both project and print content via `@if (row.kind === 'project')`:

| Column                       | Project row content                                              | Print row content      |
| ---------------------------- | ---------------------------------------------------------------- | ---------------------- |
| image                        | Project default image (folder icon fallback)                     | Print image            |
| title                        | Project name + status chip + expand chevron                      | Print title            |
| printer                      | Combined list of distinct printers                               | Single printer         |
| start-date / start-date-time | Project created date                                             | Print start date       |
| status                       | Project status chip                                              | Print status chip      |
| printTime                    | Total print time (all prints)                                    | Print time             |
| filamentSummary              | Aggregated filament list (grouped by FilamentId, summed weights) | Filament summary       |
| totalFilamentUsage           | Total filament weight                                            | Print filament weight  |
| totalCost                    | Total cost if available                                          | Print cost             |
| commentCount                 | blank                                                            | Comment count          |
| more (actions menu)          | Link to project detail page                                      | Existing print actions |

Expanded print rows (`kind === 'expanded-print'`) use the same column defs as ungrouped print rows, with a left-border or indentation style to visually nest them under their project.

The `more-prints` row spans all columns and renders: `+ {count} more prints not shown by current filters`.

---

## Data Flow Summary

```
PrintListComponent
  searchText, filterByStatus, filterByPrinterIds,
  filterByFilamentIds, sortColumn, sortDirection
        │
        ▼ input() signals
PrintGroupedViewComponent
  effect() → getGroupedFeed(filters) → flatRows signal
        │
        ├─ project row clicked → getPrintSummaries(filters + projectId)
        │                        → insert expanded-print rows into flatRows
        └─ mat-table renders flatRows with matRowDef when predicates
```

---

## Verification

1. Start dev server (`npm start`) and open the Print List page
2. Switch to Grouped view — confirm search bar, filter panel, and "Add New Print" are visible
3. Type in the search box — confirm projects with no matching prints disappear; projects with matching prints remain; `+X more prints` footer appears under expanded projects when some prints are filtered out
4. Apply status filter — confirm same behavior
5. Apply printer filter and filament filter — confirm same behavior
6. Sort by Title — confirm project rows and ungrouped print rows sort correctly
7. Expand a project — confirm prints load, match the current filters, use the same columns as the list view, and are visually indented
8. Collapse and re-expand — confirm no second network call (cached)
9. Check project row columns: printer column shows all distinct printers; filament column aggregates usage by filament ID with correct summed weights
10. Run `npm run test:brief` — confirm no regressions
