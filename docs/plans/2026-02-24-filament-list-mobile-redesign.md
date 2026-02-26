# Filament List Mobile Redesign

**Date:** 2026-02-24
**Status:** Approved

## Problem

The `filament-list` component renders a 9-column Material table that requires both vertical and horizontal scrolling on mobile. The filter controls (3 checkboxes + dropdown) are inline and equally cramped. This affects both the standalone filament list page and the `filament-search-modal` used when selecting filaments for a print or printer.

## Goals

- Mobile-friendly card layout for screens < 600px
- Collapsible filter panel (open by default on desktop, closed by default on mobile)
- All existing functionality preserved: search, filters, sorting, pagination, favorites, multi-select, QR scanner
- Consistent with existing print list card/filter patterns
- Keep the paginator as-is on mobile (no infinite scroll)

---

## Architecture

All changes are confined to `filament-list.component` (HTML, SCSS, TS), with minor updates to `print-list.component` (filter panel default) and the three dialog call sites (max-width fix).

**Breakpoint:** `600px` (matches Angular Material `sm`, consistent with print list).

The template renders **both** the table and the card list. CSS hides/shows the appropriate layout — no TS signal needed for layout switching, avoiding flash on resize.

---

## Filter Controls

Replaces the current inline `.search-fields` div.

**Always-visible row:**

- Search input (full-width on mobile, inline on desktop)
- `Filters` toggle button with `filter_list` icon
- Active filter count badge on button when any filter is active (e.g. `Filters (2)`)

**Collapsible panel** (same `max-height` CSS transition as print list):

- Include Inactive checkbox
- Show Favorites Only checkbox
- Show Loaded Filament Only checkbox
- Filter by Category dropdown

**Default state:**

- Desktop (≥ 600px): panel open by default
- Mobile (< 600px): panel closed by default

The `isFilterPanelOpen` signal initializes based on `window.innerWidth >= 600`.

**Print list consistency:** `print-list.component` will be updated so its `isFilterPanelOpen` also defaults to `true` on desktop.

---

## Mobile Card Layout (< 600px)

Each filament renders as a flat card (no elevation) with a bottom border separator. Full-width, tappable.

```
┌─────────────────────────────────────────────┐
│ ┌──────┐  Name (bold)  [PLA chip]  145g  ★ │
│ │color │  Brand · Red · Drawer 2            │
│ └──────┘                                    │
└─────────────────────────────────────────────┘
```

### Card anatomy

- **Color swatch**: 40×48px bordered rectangle, left-aligned, vertically centered
- **Row 1 (primary)**: bold display name | material type as small `mat-chip` | remaining weight (right-aligned) | favorite star button (far right)
- **Row 2 (secondary)**: muted smaller text — `Brand · Color Name · Storage Location` and if loaded: `Loaded: Printer Name`
- **Inactive badge**: small chip after the name on row 1 when `isActive` is false
- **Hover/tap**: subtle background highlight (same as table rows)

### Multi-select on mobile

A `mat-checkbox` appears in the top-right of the card. Tapping anywhere on the card toggles selection.

### Sorting

Not exposed on mobile. Default sort (filament remaining, descending) stays in effect. Search + filter covers primary discovery needs.

### Paginator

`mat-paginator` renders below the card list unchanged — same as desktop.

---

## Dialog Sizing Fix

All three dialog open call sites add `maxWidth: '100vw'` to prevent clipping on narrow screens:

- `edit-print-detail.component.ts`
- `print-list.component.ts`
- `printer-detail.component.ts`

---

## Files Changed

| File                                                             | Change                                                                               |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `src/app/shared/filament-list/filament-list.component.html`      | Add card list template alongside table; redesign filter area                         |
| `src/app/shared/filament-list/filament-list.component.scss`      | Card styles, filter panel styles, `@media` breakpoints                               |
| `src/app/shared/filament-list/filament-list.component.ts`        | `isFilterPanelOpen` signal with viewport-aware default; active filter count computed |
| `src/app/print/print-list/print-list.component.ts`               | `isFilterPanelOpen` defaults to `true` on desktop                                    |
| `src/app/print/edit-print-detail/edit-print-detail.component.ts` | Add `maxWidth: '100vw'` to dialog config                                             |
| `src/app/print/print-list/print-list.component.ts`               | Add `maxWidth: '100vw'` to dialog config                                             |
| `src/app/printer/printer-detail/printer-detail.component.ts`     | Add `maxWidth: '100vw'` to dialog config                                             |

---

## Out of Scope

- Infinite scroll / load-more (kept as paginator for simplicity)
- Changes to the QR scanner view (already mobile-friendly)
- Changes to `filament-search-modal` wrapper (already works correctly)
