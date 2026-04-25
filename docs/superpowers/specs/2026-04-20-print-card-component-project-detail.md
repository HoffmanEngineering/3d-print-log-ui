# Spec: PrintCardComponent + Project Detail Card View

**Date:** 2026-04-20
**Branch:** feat/print-projects-story-61

## Goal

Replace the simple link/date print list in the Project Detail view with rich print cards matching those shown in the Print List mobile view. Extract the card into a reusable `PrintCardComponent` to eliminate duplication.

## New Component: `PrintCardComponent`

**Location:** `src/app/print/print-card/print-card.component.ts`

**Type:** Standalone, `ChangeDetectionStrategy.OnPush`

**Inputs:**

- `print: PrintSummary` — the print to display

**Outputs:**

- `deleted: OutputEmitterRef<PrintSummary>` — user clicked Delete
- `statusChanged: OutputEmitterRef<{ id: number; status: PrintStatus }>` — user changed status
- `shared: OutputEmitterRef<PrintSummary>` — user clicked Share
- `duplicated: OutputEmitterRef<PrintSummary>` — user clicked Duplicate

**Template:** Lifted verbatim from the `fxHide.gt-sm` mobile card block in `print-list.component.html` (lines 174–381). Displays:

- Print image (`app-print-image`)
- Title
- Project chip (if present)
- Printer label
- Start date
- Print time (actual or estimated, with `*` indicator)
- Materials/filament usage with color dots
- Status badge
- Action menu: Edit (absolute routerLink `/prints/:id/edit`), View (absolute routerLink `/prints/:id`), Share, Duplicate (absolute routerLink `/prints/copy/:id`), Delete, Change Print Status submenu
- All navigation uses absolute paths so the card works correctly from any parent route

**Helper methods** (moved from `PrintListComponent`):

- `getPrinterLabel(printer)`
- `getStatus(print)`
- `getStatusIcon(print)`
- `getPrintEndDate(print)`

These are self-contained and have no dependency on `PrintListComponent`'s state — they can live as `protected` methods on `PrintCardComponent`.

## Changes to `PrintListComponent`

- Replace the inline `@for` mobile card block with `@for (print of prints; track print.id) { <app-print-card [print]="print" (deleted)="deletePrint($event)" (statusChanged)="changeStatus($event.id, $event.status)" (shared)="share($event)" (duplicated)="navigateToDuplicate($event)" /> }`
- Keep helper methods on `PrintListComponent` for the desktop table view; also expose them on `PrintCardComponent` independently
- No visible behavior change

## Changes to `ProjectDetailComponent`

**Template (`project-detail.component.html`):**
Replace the "Prints" `mat-card-content` block:

```html
<!-- before -->
@for (print of prints(); track print.id) {
<div class="print-row">
  <a [routerLink]="['/prints', print.id]">{{ print.title }}</a>
  <span>{{ print.startDate | date: 'mediumDate' }}</span>
</div>
}

<!-- after -->
@for (print of prints(); track print.id) {
<app-print-card [print]="print" (deleted)="onPrintDeleted($event)" (statusChanged)="onPrintStatusChanged($event)" (shared)="onPrintShared($event)" (duplicated)="onPrintDuplicated($event)" />
} @empty {
<p>No prints in this project yet.</p>
}
```

**Component (`project-detail.component.ts`):**
Add four event handlers:

- `onPrintDeleted(print)` — calls `PrintService.deletePrint(print.id)`, then reloads prints via `loadPrints()`
- `onPrintStatusChanged({ id, status })` — calls `PrintService.updatePrintStatus(id, status)`, then reloads prints
- `onPrintShared(print)` — opens `PrintShareDialogComponent` with the print
- `onPrintDuplicated(print)` — navigates to `/prints/copy/${print.id}`

Remove the `.print-row` CSS from `project-detail.component.scss`.

## File Structure

```
src/app/print/
  print-card/
    print-card.component.ts
    print-card.component.html
    print-card.component.scss
    print-card.component.spec.ts
  print-list/
    print-list.component.html   (updated)
    print-list.component.ts     (updated)
  ...
src/app/project/
  project-detail/
    project-detail.component.html  (updated)
    project-detail.component.ts    (updated)
    project-detail.component.scss  (updated)
```

## Testing

- `PrintCardComponent` unit test: verify card renders print title, image inputs, status badge, and that clicking Delete emits `deleted`
- `ProjectDetailComponent` unit test: verify `app-print-card` is rendered for each print, and that `onPrintDeleted` calls `PrintService.deletePrint`
- No changes to E2E tests required (existing print list Cypress tests cover the card behavior)

## Out of Scope

- Card layout on project detail is single-column only (no grid option)
- No pagination on the project detail prints list (already loads up to 100)
- No search/filter controls on the project detail prints section
