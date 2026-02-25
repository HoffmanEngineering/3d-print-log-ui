# Materials Page Redesign

**Date:** 2026-02-24
**Branch:** FilamentListMobileRedesign
**Scope:** `filament-list-container` component only — no changes to shared components

## Problem

The `/materials` page uses a mat-table with a custom filter layout that does not match the mobile card view recently introduced in the filament-search modals, nor the filter row pattern used on the `/prints` page.

## Goals

1. Add a mobile card view (< 600px) to `filament-list-container` that matches the card style from the shared `filament-list` component
2. Restructure the filter row to match the print-list two-row header pattern (search + toggle button / collapsible panel)

## Approach

**Approach A — Modify `filament-list-container` directly.** The desktop mat-table is unchanged. A parallel mobile card template is added under the same data, gated by CSS media query. The filter row is restructured in the HTML template with matching TypeScript additions.

Rejected alternatives: extending the shared `filament-list` component (would bloat it with many conditional action inputs) and extracting a `filament-card` sub-component (over-engineering for two usages).

---

## Section 1: Filter Row Restructure

The existing filter layout is replaced with a two-row header matching `print-list`:

```
┌─────────────────────────────────────────────────────────────┐
│ [Add New Material ▾]  [Print Labels]  [Search___]  [⚙ Filters 2] │  ← header-top
├─────────────────────────────────────────────────────────────┤
│ ☐ Include Inactive  ☐ Favorites Only  ☐ Loaded Only         │
│ [Category ▾]  [Reset Filters]                               │  ← filter-panel (collapsible)
└─────────────────────────────────────────────────────────────┘
```

- "Add New Material" and "Print Labels" buttons move into `header-top`
- Search field stays in `header-top`
- "Filters" toggle button: icon `tune` → `expand_less` when open, `matBadge` shows `activeFilterCount()`
- Filter controls (Include Inactive, Favorites Only, Loaded Only, Category, Reset) move into collapsible `filter-panel`
- Same CSS transition pattern as `filament-list` filter panel

**TypeScript additions:**

- `isFilterPanelOpen: boolean` — default `false`
- `toggleFilterPanel()` — flips `isFilterPanelOpen`
- `activeFilterCount()` — counts active non-default filters: `showFavoritesOnly`, `showLoadedFilamentOnly`, `includeInactive` (when true), `filterByCategory` (when set)

---

## Section 2: Mobile Card View

At `< 600px`, the mat-table is hidden and a card list renders instead.

**Card layout:**

```
┌──────────────────────────────────────────────────┐
│ ▓▓▓ │ PLA+ Black (1.75mm)        240g  │ ☐  ★  ⋮ │
│ ▓▓▓ │ [PLA+]  [Inactive]               │          │
│ ▓▓▓ │ Polymaker · Black · Shelf A      │          │
└──────────────────────────────────────────────────┘
```

- **Swatch:** 40px wide, `align-self: stretch`, border-radius 4px, background = filament color
- **Content (3 rows):**
  - Row 1: Name + spacer + remaining weight
  - Row 2: Material type chip + Inactive badge (conditional)
  - Row 3: Brand · Color name · Storage location · Loaded printer (secondary gray, ellipsis)
- **Actions column** (right, `align-self: center`):
  - Checkbox — multi-select for batch QR label printing
  - Favorite star button — calls `toggleFavorite()`
  - Kebab `⋮` button → `mat-menu`:
    - Edit → navigate to `/filament/:id`
    - Duplicate → navigate to `/filament/copy/:id`
    - Mark as Empty → calls `markAsEmpty()`
    - Print QR Label → calls `printQrLabel()`
    - Delete → calls `deleteFilament()`
- **Tap card body** → navigates to filament detail (`/filament/:id`)
- SCSS adapted from `filament-list.component.scss` card styles (same class names, same breakpoint)

---

## Section 3: TypeScript / Logic Changes

All existing methods remain unchanged. Additions only:

| Addition                 | Details                                                |
| ------------------------ | ------------------------------------------------------ |
| `isFilterPanelOpen`      | `boolean`, default `false`                             |
| `toggleFilterPanel()`    | Flips `isFilterPanelOpen`                              |
| `activeFilterCount()`    | Counts active non-default filter values                |
| `navigateToFilament(id)` | Navigates to `/filament/:id` (reuse if already exists) |

No new services, API calls, resolver changes, or routing changes.

---

## Files Changed

- `src/app/filament/filament-list-container/filament-list-container.component.html` — filter row restructure + mobile card template
- `src/app/filament/filament-list-container/filament-list-container.component.ts` — add `isFilterPanelOpen`, `toggleFilterPanel()`, `activeFilterCount()`
- `src/app/filament/filament-list-container/filament-list-container.component.scss` — mobile card styles + filter panel styles
