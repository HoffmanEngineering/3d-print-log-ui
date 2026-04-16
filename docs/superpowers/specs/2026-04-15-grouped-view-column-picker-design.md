# Grouped View Column Picker Design

**Date:** 2026-04-15
**Branch:** feat/print-projects-story-61

## Goal

Add a "Change table layout" column picker to the Grouped By Project table view, separate from the All Prints column picker. Each view stores its own column preferences in localStorage. The shared `PrintTableLayoutComponent` dialog gains a `title` field so the modal heading reflects which view is being configured. As part of this work, implement the three currently-blank columns (`end-date`, `end-time`, `end-date-time`) for print rows, and implement `totalCost` for both project rows (aggregate) and print rows.

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
- Add `defaultFilamentPriceSetting = input<UserSetting | null>(null)` and `preferredCurrencySymbolSetting = input<UserSetting | null>(null)` inputs (passed from `PrintListComponent`, used for cost calculation)
- Add `getPrintEndDate(print: PrintSummary): Date | null` — same logic as `PrintListComponent`: `startDate + actual print time` (or estimated if no actual); returns `null` if neither time is set
- Add `getTotalFilamentCost(filamentUsage: PrintFilamentSummaryDto[]): string` — calls `PrintService.calculateTotalPrintCost()` using the `defaultFilamentPriceSetting` and `preferredCurrencySymbolSetting` inputs; returns the formatted price string or empty string if not calculable
- **Implement `end-date` column**: blank for project rows; `getPrintEndDate(print) | date` for print/expanded-print rows
- **Implement `end-time` column**: blank for project rows; `getPrintEndDate(print) | date:'mediumTime'` for print/expanded-print rows
- **Implement `end-date-time` column**: blank for project rows; `getPrintEndDate(print) | date:'medium'` for print/expanded-print rows
- **Implement `totalCost` column**: `getTotalFilamentCost(row.item.filamentUsage)` for project rows; `getTotalFilamentCost(print.filamentUsage)` for print/expanded-print rows

### `PrintListComponent`

- Remove `[displayedColumns]="displayedColumns"` binding from `<app-print-grouped-view>` in the template
- Pass `[defaultFilamentPriceSetting]="defaultFilamentPriceSetting"` and `[preferredCurrencySymbolSetting]="preferredCurrencySymbolSetting"` to `<app-print-grouped-view>`

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
| `end-date`           | End Date        | Blank for project rows; computed end date (`startDate + print time`) for print rows                           |
| `end-time`           | End Time        | Blank for project rows; computed end time for print rows                                                      |
| `end-date-time`      | End Date/Time   | Blank for project rows; computed end date/time for print rows                                                 |
| `status`             | Status          | Project status label for project rows; print status for print rows                                            |
| `printTime`          | Print Time      | Total project print time for project rows; individual print time (actual or estimated\*) for print rows       |
| `filamentSummary`    | Filament        | Aggregated filament list with color swatches and weights for project rows; per-print filament list for prints |
| `totalFilamentUsage` | Total Material  | Total filament weight in grams for all row types                                                              |
| `totalCost`          | Total Cost      | Aggregate filament cost across all project prints for project rows; per-print filament cost for print rows    |
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
- End date/time columns remain blank for project rows — a project spans multiple prints so there is no single meaningful end date
