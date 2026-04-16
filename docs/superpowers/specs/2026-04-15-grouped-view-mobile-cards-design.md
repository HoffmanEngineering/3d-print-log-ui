# Grouped View Mobile Cards Design

**Date:** 2026-04-15
**Branch:** feat/print-projects-story-61

## Goal

Add a mobile card view to `PrintGroupedViewComponent` that mirrors the card layout of the All Prints mobile view. On small screens (`lt-md`) the mat-table is hidden and cards are shown; on medium+ screens the table is shown and cards are hidden. Uses the same `fxHide.gt-sm` / `fxHide.lt-md` breakpoints as the all-prints view.

---

## Row Types and Card Layouts

### Project card

Mirrors the print card structure:

```
┌─────────────────────────────────────────┐
│ [thumbnail]  Project Name               │
│ or [folder]  [Status chip]              │
│              Prints: 5  •  Total: 2h 34m│
│              [materials list]           │
│                              [⋮ menu]   │
└─────────────────────────────────────────┘
```

- **Thumbnail:** fetched via `ProjectService.getProjectImage(projectId, imageId)` if `defaultProjectImageId` is set; otherwise a `folder` mat-icon. Fetched images cached in a `projectImages = signal<Map<string, string>>(new Map())` on the component to avoid re-fetching on expand/collapse.
- **Status chip:** `<app-project-chip>` with project name and status.
- **Meta row:** print count (e.g. "5 prints"), total print time via `duration` pipe.
- **Materials:** aggregated `filamentUsage` list — color dot, display name, summed weight in grams.
- **Options menu (⋮):** single item — "View Project" link to `/projects/:id`.
- **Tap behavior:** tapping anywhere on the card (except the ⋮ button) calls `onProjectToggle()` to expand/collapse prints.

### Standalone print card

Identical to the all-prints mobile card:

- Thumbnail (`app-print-image`), title, project chip (if any), printer, date, print time (actual if non-zero, else estimated with `*`), materials, status badge.
- Tapping navigates to `/prints/:id`.
- ⋮ menu: Edit, View, Share, Duplicate, Delete, Change Print Status (same as desktop `more` column).

### Expanded print card

Same layout as the standalone print card, with two visual differences:

- `border-left: 3px solid primary` on the card
- A `background-color: rgba(63, 81, 181, 0.04)` tint

Tapping navigates to `/prints/:id`. Appears immediately below its parent project card when the project is expanded.

---

## Data Changes

### `ProjectService.getProjectImage()`

New method added to `project.service.ts`:

```typescript
getProjectImage(projectId: string, imageId: number): Observable<string>
```

Same implementation pattern as `PrintService.getPrintImage()`: GET `/api/Projects/{projectId}/images/{imageId}` as a blob, convert to base64 data URL via `FileReader`. Uses `allow-anonymous-request` header.

### Component state

Add to `PrintGroupedViewComponent`:

```typescript
projectImages = signal<Map<string, string>>(new Map());
```

When a project card is rendered with a non-zero `defaultProjectImageId`, and no cache entry exists yet, call `getProjectImage()` and store the result in the map. Use a simple `ngOnInit`-style effect or an `effect()` tied to the feed signal to trigger loads for visible project rows.

---

## Template Structure

```html
<!-- Mobile card view -->
<div class="grouped-mobile-card-view" fxHide.gt-sm>@for (row of flatRows(); track trackByRow($index, row)) { @if (row.kind === 'project') { ... project card ... } @if (row.kind === 'print') { ... print card ... } @if (row.kind === 'expanded-print') { ... expanded print card ... } @if (row.kind === 'more-prints') { ... "+X more" text ... } }</div>

<!-- Desktop table (existing) — hide on mobile -->
<table fxHide.lt-md mat-table [dataSource]="flatRows()" [trackBy]="trackByRow">
  ...
</table>
```

---

## Files Changed

- **Modify:** `src/app/core/services/project.service.ts` — add `getProjectImage()`
- **Modify:** `src/app/print/print-list/print-grouped-view/print-grouped-view.component.ts` — add `projectImages` signal, image loading logic
- **Modify:** `src/app/print/print-list/print-grouped-view/print-grouped-view.component.html` — add mobile card section, add `fxHide.lt-md` to table
- **Modify:** `src/app/print/print-list/print-grouped-view/print-grouped-view.component.scss` — add mobile card styles matching all-prints card CSS

---

## What Is Not Changing

- Desktop table layout is unchanged.
- Pagination is shared — both views use the same `feed()` signal and `onPageChange()`.
- Filter/search state is unchanged — mobile cards react to the same inputs as the table.
