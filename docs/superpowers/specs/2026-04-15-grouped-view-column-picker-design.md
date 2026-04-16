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

| Key                  | Display Name    | Description                                                                                                   |
| -------------------- | --------------- | ------------------------------------------------------------------------------------------------------------- |
| `image`              | Image (Small)   | Folder icon for project rows; small print thumbnail for print rows                                            |
| `image-medium`       | Image (Medium)  | Folder icon for project rows; medium print thumbnail for print rows                                           |
| `image-large`        | Image (Large)   | Folder icon for project rows; large print thumbnail for print rows                                            |
| `title`              | Title           | Expand/collapse button + project name + status chip for project rows; print title for print rows              |
| `printer`            | Printer         | List of all printers used in the project for project rows; individual printer for print rows                  |
| `start-date`         | Start Date      | Most recent print date (`sortDate`) for project rows; individual start date for print rows                    |
| `start-time`         | Start Time      | Blank for project rows; start time for print rows                                                             |
| `start-date-time`    | Start Date/Time | Blank for project rows; start date/time for print rows                                                        |
| `end-date`           | End Date        | Blank for all rows (not implemented)                                                                          |
| `end-time`           | End Time        | Blank for all rows (not implemented)                                                                          |
| `end-date-time`      | End Date/Time   | Blank for all rows (not implemented)                                                                          |
| `status`             | Status          | Project status label for project rows; print status for print rows                                            |
| `printTime`          | Print Time      | Total project print time for project rows; individual print time (actual or estimated\*) for print rows       |
| `filamentSummary`    | Filament        | Aggregated filament list with color swatches and weights for project rows; per-print filament list for prints |
| `totalFilamentUsage` | Total Material  | Total filament weight in grams for all row types                                                              |
| `totalCost`          | Total Cost      | Blank for project rows; em-dash for print rows (not yet implemented)                                          |
| `commentCount`       | Comments        | Blank for project rows; comment count for print rows                                                          |

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
