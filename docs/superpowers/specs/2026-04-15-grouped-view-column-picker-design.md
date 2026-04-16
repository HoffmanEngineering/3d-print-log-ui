# Grouped View Column Picker Design

**Date:** 2026-04-15
**Branch:** feat/print-projects-story-61

## Goal

Add a "Change table layout" column picker to the Grouped By Project table view, separate from the All Prints column picker. Each view stores its own column preferences in localStorage. The shared `PrintTableLayoutComponent` dialog gains a `title` field so the modal heading reflects which view is being configured.

---

## What Is Changing

### `PrintTableLayoutComponent` (dialog)

- Add `title: string` to the `DialogData` interface
- Replace the hardcoded `<h1 mat-dialog-title>Print Table Layout</h1>` with `<h1 mat-dialog-title>{{ data.title }}</h1>`
- `PrintListComponent` updated to pass `title: 'All Prints Table Layout'` when opening the dialog

### `PrintGroupedViewComponent`

- **Remove** the `displayedColumns` input signal — column config becomes internal state
- Add a `displayedColumns` signal initialized from localStorage key `grouped_table_displayed_columns`
- Desktop default columns: `['title', 'status', 'printTime', 'filamentSummary', 'more']`
- Mobile default columns (viewport ≤ 800px via `MediaMatcher`): `['title', 'status', 'more']`
- Add `allPossibleGroupedColumns: ColumnDefinition[]` array covering all columns the grouped table supports (see list below), excluding `more`
- Add `openTableLayout()` method — opens `PrintTableLayoutComponent` with `title: 'Grouped View Table Layout'`, wires up the `changeEvent` Subject, saves to `grouped_table_displayed_columns` localStorage key, always appends `more` at the end
- Add "Change table layout" button to the `more` column `<th mat-header-cell>`, as a `mat-menu` item with a `table_rows` icon — matching the All Prints pattern exactly
- Log a `PrintGroupedViewLayoutChanged` analytics event on dialog close

### `PrintListComponent`

- Remove `[displayedColumns]="displayedColumns"` binding from `<app-print-grouped-view>` in the template
- No changes to `print-list.component.ts`

---

## Grouped View Possible Columns

The grouped table already defines `matColumnDef` for all of these. The picker offers all of them (except `more`, which is fixed):

| Key                  | Display Name    | Description                                           |
| -------------------- | --------------- | ----------------------------------------------------- |
| `image`              | Image (Small)   | Default image as a small thumbnail                    |
| `image-medium`       | Image (Medium)  | Default image as a medium thumbnail                   |
| `image-large`        | Image (Large)   | Default image as a large thumbnail                    |
| `title`              | Title           | Project name or print title                           |
| `printer`            | Printer         | Make and model (blank for project rows)               |
| `start-date`         | Start Date      | Start date (blank for project rows)                   |
| `start-time`         | Start Time      | Start time (blank for project rows)                   |
| `start-date-time`    | Start Date/Time | Start date/time (blank for project rows)              |
| `end-date`           | End Date        | End date (blank for project rows)                     |
| `end-time`           | End Time        | End time (blank for project rows)                     |
| `end-date-time`      | End Date/Time   | End date/time (blank for project rows)                |
| `status`             | Status          | Project status or print status                        |
| `printTime`          | Print Time      | Total time (projects) or individual time (prints)     |
| `filamentSummary`    | Filament        | Aggregated filaments (projects) or per-print (prints) |
| `totalFilamentUsage` | Total Filament  | Total filament weight                                 |
| `totalCost`          | Total Cost      | Total cost                                            |
| `commentCount`       | Comments        | Comment count                                         |

---

## localStorage Keys

| View               | Key                                         |
| ------------------ | ------------------------------------------- |
| All Prints         | `print_table_displayed_columns` (unchanged) |
| Grouped By Project | `grouped_table_displayed_columns` (new)     |

---

## What Is Not Changing

- The `PrintTableLayoutComponent` dialog behavior (drag-to-reorder, checkboxes, Reset to Default, Save, Close) is unchanged
- The `more` column is always fixed — it is excluded from the picker and always appended last
- All Prints column preferences are unaffected
- Mobile card view in the grouped view is unaffected
- The `displayedColumns` input is removed from `PrintGroupedViewComponent`; `PrintGroupedViewComponent.spec.ts` must be updated accordingly
