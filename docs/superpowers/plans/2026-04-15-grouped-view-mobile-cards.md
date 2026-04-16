# Grouped View Mobile Cards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a mobile card view to `PrintGroupedViewComponent` that mirrors the All Prints mobile card layout, showing project cards (folder icon + summary stats, tap to expand) and print cards (thumbnail + meta) on small screens.

**Architecture:** Inside `print-grouped-view.component.html`, add a `fxHide.gt-sm` card section above the existing table and add `fxHide.lt-md` to the table — same breakpoint pattern as `PrintListComponent`. The component TypeScript gains a `getStatusIcon()` helper. All card styles are added to `print-grouped-view.component.scss` (Angular style encapsulation means they cannot share CSS with `print-list.component.scss`).

**Tech Stack:** Angular 20, Angular Flex-Layout (`fxHide`), Angular Material cards/menus, Jasmine/Karma

---

## File Map

- **Modify:** `src/app/print/print-list/print-grouped-view/print-grouped-view.component.ts` — add `getStatusIcon()` helper method
- **Modify:** `src/app/print/print-list/print-grouped-view/print-grouped-view.component.html` — add `fxHide.lt-md` to `<table>`, add mobile card section
- **Modify:** `src/app/print/print-list/print-grouped-view/print-grouped-view.component.scss` — add all mobile card styles

---

## Task 1: Add `getStatusIcon()` to `PrintGroupedViewComponent`

**Files:**

- Modify: `src/app/print/print-list/print-grouped-view/print-grouped-view.component.ts`

The mobile print cards need a `getStatusIcon()` method that maps a `PrintStatus` value to a Material icon name. The component already has `getStatus()` — add the icon counterpart.

- [ ] **Step 1: Add `getStatusIcon()` after `getStatus()` in the component**

In `print-grouped-view.component.ts`, add after the `getStatus()` method (around line 208):

```typescript
getStatusIcon(status: PrintStatus | undefined): string {
  switch (status) {
    case PrintStatus.Pending:
      return 'pending_actions';
    case PrintStatus.Printing:
      return 'play_circle_outline';
    case PrintStatus.Success:
      return 'check_circle_outline';
    case PrintStatus.PartialSuccess:
      return 'rule';
    case PrintStatus.Cancelled:
      return 'remove_circle_outline';
    case PrintStatus.Failed:
      return 'error_outline';
    default:
      return 'help_outline';
  }
}
```

- [ ] **Step 2: Run lint**

```bash
cd D:/Development/3d-print-log/print-log-ui
npm run lint:brief
```

Expected: No errors.

- [ ] **Step 3: Run tests**

```bash
cd D:/Development/3d-print-log/print-log-ui
npm run test:brief
```

Expected: TOTAL: 431 SUCCESS

- [ ] **Step 4: Commit**

```bash
cd D:/Development/3d-print-log/print-log-ui
git add src/app/print/print-list/print-grouped-view/print-grouped-view.component.ts
git commit -m "feat: add getStatusIcon helper to PrintGroupedViewComponent"
```

---

## Task 2: Add mobile card styles to the grouped view SCSS

**Files:**

- Modify: `src/app/print/print-list/print-grouped-view/print-grouped-view.component.scss`

Angular style encapsulation means card styles from `print-list.component.scss` are not available here. Add them to the grouped view SCSS directly. Also add the `expanded-print-card` variant for visual distinction of expanded rows.

- [ ] **Step 1: Append mobile card styles to `print-grouped-view.component.scss`**

Add the following at the end of the file:

```scss
// ===================== MOBILE CARD VIEW =====================

.grouped-mobile-card-view {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 8px;
  width: 100%;
}

.print-card {
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  border-radius: 8px;

  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    transform: translateY(-2px);
  }

  &:active {
    transform: translateY(0);
  }
}

.expanded-print-card {
  border-left: 3px solid var(--mdc-theme-primary, #3f51b5);
  background-color: rgba(63, 81, 181, 0.04);
  cursor: pointer;
  border-radius: 8px;

  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
}

.card-layout {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 12px;
  align-items: start;
  padding: 4px;
}

.card-image {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 80px;
  height: 80px;
  min-width: 80px;
  min-height: 80px;
  overflow: hidden;
  border-radius: 4px;
  background-color: #f5f5f5;
}

.card-content {
  flex: 1;
  min-width: 0;
}

.card-title {
  margin: 0 0 12px 0;
  font-size: 16px;
  font-weight: 500;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  word-wrap: break-word;
}

.card-meta {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: rgba(0, 0, 0, 0.6);

  .meta-icon {
    font-size: 18px;
    width: 18px;
    height: 18px;
    flex-shrink: 0;
    color: rgba(0, 0, 0, 0.54);
  }

  span {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &.materials-section {
    align-items: center;
    padding-left: 0;

    .materials-container {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
    }
  }
}

.materials-container {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
}

.material-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
}

.material-color {
  width: 18px;
  height: 18px;
  min-width: 18px;
  min-height: 18px;
  border-radius: 3px;
  border: 1px solid rgba(0, 0, 0, 0.2);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  flex-shrink: 0;
}

.material-name {
  font-size: 14px;
  color: rgba(0, 0, 0, 0.6);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-actions {
  display: flex;
  align-items: flex-start;
}

.status-badge {
  font-weight: 500;
  padding: 4px 8px;
  border-radius: 12px;
  width: fit-content;

  &.status-1 {
    background-color: #f5f5f5;
    color: #616161;
    .meta-icon {
      color: #757575;
    }
  }
  &.status-2 {
    background-color: #e1f5fe;
    color: #0277bd;
    .meta-icon {
      color: #0277bd;
    }
  }
  &.status-3 {
    background-color: #e8f5e9;
    color: #2e7d32;
    .meta-icon {
      color: #2e7d32;
    }
  }
  &.status-4 {
    background-color: #f3e5f5;
    color: #6a1b9a;
    .meta-icon {
      color: #6a1b9a;
    }
  }
  &.status-5 {
    background-color: #ffebee;
    color: #c62828;
    .meta-icon {
      color: #c62828;
    }
  }
  &.status-6 {
    background-color: #fff9c4;
    color: #f57f17;
    .meta-icon {
      color: #f57f17;
    }
  }
}

.more-prints-mobile-row {
  text-align: center;
  color: rgba(0, 0, 0, 0.54);
  font-style: italic;
  font-size: 0.85em;
  padding: 4px 8px;
}

:host-context(body.dark-theme) {
  .card-image {
    background-color: #2a2a2a;
  }

  .meta-item {
    color: rgba(255, 255, 255, 0.6);
    .meta-icon {
      color: rgba(255, 255, 255, 0.54);
    }
  }

  .material-name {
    color: rgba(255, 255, 255, 0.6);
  }

  .status-badge {
    &.status-1 {
      background-color: rgba(97, 97, 97, 0.25);
      color: #bdbdbd;
      .meta-icon {
        color: #9e9e9e;
      }
    }
    &.status-2 {
      background-color: rgba(2, 119, 189, 0.2);
      color: #4fc3f7;
      .meta-icon {
        color: #4fc3f7;
      }
    }
    &.status-3 {
      background-color: rgba(46, 125, 50, 0.2);
      color: #81c784;
      .meta-icon {
        color: #81c784;
      }
    }
    &.status-4 {
      background-color: rgba(106, 27, 154, 0.2);
      color: #ce93d8;
      .meta-icon {
        color: #ce93d8;
      }
    }
    &.status-5 {
      background-color: rgba(198, 40, 40, 0.2);
      color: #ef9a9a;
      .meta-icon {
        color: #ef9a9a;
      }
    }
    &.status-6 {
      background-color: rgba(245, 127, 23, 0.2);
      color: #ffcc02;
      .meta-icon {
        color: #ffcc02;
      }
    }
  }
}
```

- [ ] **Step 2: Run lint**

```bash
cd D:/Development/3d-print-log/print-log-ui
npm run lint:brief
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
cd D:/Development/3d-print-log/print-log-ui
git add src/app/print/print-list/print-grouped-view/print-grouped-view.component.scss
git commit -m "feat: add mobile card styles to PrintGroupedViewComponent"
```

---

## Task 3: Add mobile card HTML and hide table on mobile

**Files:**

- Modify: `src/app/print/print-list/print-grouped-view/print-grouped-view.component.html`

Add `fxHide.lt-md` to the existing `<table>` so it hides on mobile. Add a sibling mobile card section above the table with `fxHide.gt-sm`. The card section loops over `flatRows()` and renders a different card for each row kind.

- [ ] **Step 1: Add `fxHide.lt-md` to the existing table element**

In `print-grouped-view.component.html`, replace:

```html
<table aria-label="Prints grouped by project" aria-live="polite" mat-table [dataSource]="flatRows()" [trackBy]="trackByRow"></table>
```

With:

```html
<table aria-label="Prints grouped by project" aria-live="polite" fxHide.lt-md mat-table [dataSource]="flatRows()" [trackBy]="trackByRow"></table>
```

- [ ] **Step 2: Add the mobile card section above the table**

Insert the following block immediately before the `<table` element (inside the `} @else {` block):

```html
<!-- Mobile Card View -->
<div class="grouped-mobile-card-view" fxHide.gt-sm>
  @for (row of flatRows(); track trackByRow($index, row)) { @if (row.kind === 'project') {
  <!-- Project card -->
  <mat-card class="print-card" (click)="onProjectToggle(row.item.projectId!, row.item.printCount ?? 0)">
    <mat-card-content>
      <div class="card-layout">
        <div class="card-image">
          <mat-icon style="font-size: 48px; width: 48px; height: 48px; opacity: 0.4">folder</mat-icon>
        </div>
        <div class="card-content">
          <h3 class="card-title">{{ row.item.projectName }}</h3>
          <app-project-chip [projectName]="row.item.projectName!" [projectStatus]="row.item.projectStatus!" />
          <div class="card-meta">
            <div class="meta-item">
              <mat-icon class="meta-icon">print</mat-icon>
              <span>{{ row.item.printCount ?? 0 }} print{{ (row.item.printCount ?? 0) === 1 ? '' : 's' }}</span>
            </div>
            <div class="meta-item">
              <mat-icon class="meta-icon">timer</mat-icon>
              <span>{{ row.item.totalPrintTimeInSeconds | duration }}</span>
            </div>
            @if (row.item.filamentUsage && row.item.filamentUsage.length > 0) {
            <div class="meta-item materials-section">
              <div class="materials-container">
                @for (fu of row.item.filamentUsage; track fu.id) {
                <div class="material-chip">
                  @if (fu.filament) {
                  <div class="material-color" [style.background-color]="'#' + fu.filament.colorHex" [title]="fu.filament.colorName || 'No color name'"></div>
                  <span class="material-name"> {{ fu.filament.displayName }} ({{ (fu.amountMg ?? 0) / 1000 | number:'1.0-1' }}g) </span>
                  }
                </div>
                }
              </div>
            </div>
            }
          </div>
        </div>
        <div class="card-actions" (click)="$event.stopPropagation()">
          <button mat-icon-button [matMenuTriggerFor]="projectCardMenu" attr.aria-label="More options for {{ row.item.projectName }}">
            <mat-icon>more_vert</mat-icon>
          </button>
          <mat-menu #projectCardMenu="matMenu">
            <a class="menu-link" mat-menu-item [routerLink]="['/projects', row.item.projectId]"> <mat-icon>launch</mat-icon>View Project </a>
          </mat-menu>
        </div>
      </div>
    </mat-card-content>
  </mat-card>
  } @if (row.kind === 'print') {
  <!-- Standalone print card -->
  @let p = row.item.print;
  <mat-card class="print-card" [routerLink]="['/prints', p?.id]">
    <mat-card-content>
      <div class="card-layout">
        <div class="card-image">
          <app-print-image [printId]="p?.id" [imageId]="p?.defaultPrintImageId" />
        </div>
        <div class="card-content">
          <h3 class="card-title">{{ p?.title }}</h3>
          <div class="card-meta">
            <div class="meta-item">
              <mat-icon class="meta-icon">print</mat-icon>
              <span>{{ getPrinterLabel(p?.printer) }}</span>
            </div>
            <div class="meta-item">
              <mat-icon class="meta-icon">calendar_today</mat-icon>
              <span>{{ p?.startDate | date }}</span>
            </div>
            <div class="meta-item">
              <mat-icon class="meta-icon">timer</mat-icon>
              <span> @if (p?.printTimeInSeconds && p.printTimeInSeconds > 0) { {{ p.printTimeInSeconds | duration }} } @else if (p?.estimatedPrintTimeInSeconds && p.estimatedPrintTimeInSeconds > 0) { {{ p.estimatedPrintTimeInSeconds | duration }} * } @else { -- } </span>
            </div>
            @if (p?.filamentUsage && p.filamentUsage.length > 0) {
            <div class="meta-item materials-section">
              <div class="materials-container">
                @for (fu of p.filamentUsage; track fu.id) {
                <div class="material-chip">
                  @if (fu.filament !== null) {
                  <div class="material-color" [style.background-color]="'#' + fu.filament.colorHex" [title]="fu.filament.colorName || 'No color name'"></div>
                  <span class="material-name"> {{ fu.filament?.displayName }} @if (fu.amountMg !== null && fu.amountMg > 0) { ({{ fu.amountMg / 1000 | number:'1.0-1' }}g) } @else if (fu.estimatedAmountMg !== null && fu.estimatedAmountMg > 0) { ({{ fu.estimatedAmountMg / 1000 | number:'1.0-1' }}g*) } </span>
                  } @else {
                  <span class="material-name">{{ fu.notes }}</span>
                  }
                </div>
                }
              </div>
            </div>
            }
            <div class="meta-item status-badge" [class]="'status-' + p?.status">
              <mat-icon class="meta-icon">{{ getStatusIcon(p?.status) }}</mat-icon>
              <span>{{ getStatus(p?.status) }}</span>
            </div>
          </div>
        </div>
        <div class="card-actions" (click)="$event.stopPropagation()">
          <button mat-icon-button [matMenuTriggerFor]="printCardMenu" attr.aria-label="More options for {{ p?.title }}">
            <mat-icon>more_vert</mat-icon>
          </button>
          <mat-menu #printCardMenu="matMenu">
            <a class="menu-link" mat-menu-item [routerLink]="['/prints', p?.id, 'edit']"><mat-icon>edit</mat-icon>Edit</a>
            <a class="menu-link" mat-menu-item [routerLink]="['/prints', p?.id]"><mat-icon>launch</mat-icon>View</a>
            <button type="button" mat-menu-item (click)="share(p)"><mat-icon>share</mat-icon>Share</button>
            <a class="menu-link" mat-menu-item [routerLink]="['/prints/copy', p?.id]"><mat-icon>file_copy</mat-icon>Duplicate</a>
            <button type="button" mat-menu-item (click)="deletePrint(p)"><mat-icon>delete</mat-icon>Delete</button>
            <hr />
            <button mat-menu-item [matMenuTriggerFor]="printCardStatusMenu">Change Print Status</button>
          </mat-menu>
          <mat-menu #printCardStatusMenu="matMenu">
            <button type="button" mat-menu-item (click)="changeStatus(p?.id, printStatusTypes.Pending)"><mat-icon>pending_actions</mat-icon>Pending</button>
            <button type="button" mat-menu-item (click)="changeStatus(p?.id, printStatusTypes.Printing)"><mat-icon>play_circle_outline</mat-icon>Printing</button>
            <button type="button" mat-menu-item (click)="changeStatus(p?.id, printStatusTypes.Success)"><mat-icon>done</mat-icon>Success</button>
            <button type="button" mat-menu-item (click)="changeStatus(p?.id, printStatusTypes.PartialSuccess)"><mat-icon>rule</mat-icon>Partial Success</button>
            <button type="button" mat-menu-item (click)="changeStatus(p?.id, printStatusTypes.Failed)"><mat-icon>phonelink_off</mat-icon>Failed</button>
            <button type="button" mat-menu-item (click)="changeStatus(p?.id, printStatusTypes.Cancelled)"><mat-icon>remove_circle_outline</mat-icon>Cancelled</button>
          </mat-menu>
        </div>
      </div>
    </mat-card-content>
  </mat-card>
  } @if (row.kind === 'expanded-print') {
  <!-- Expanded print card (child of a project) -->
  @let ep = row.print;
  <mat-card class="expanded-print-card" [routerLink]="['/prints', ep.id]">
    <mat-card-content>
      <div class="card-layout">
        <div class="card-image">
          <app-print-image [printId]="ep.id" [imageId]="ep.defaultPrintImageId" />
        </div>
        <div class="card-content">
          <h3 class="card-title">{{ ep.title }}</h3>
          <div class="card-meta">
            <div class="meta-item">
              <mat-icon class="meta-icon">print</mat-icon>
              <span>{{ getPrinterLabel(ep.printer) }}</span>
            </div>
            <div class="meta-item">
              <mat-icon class="meta-icon">calendar_today</mat-icon>
              <span>{{ ep.startDate | date }}</span>
            </div>
            <div class="meta-item">
              <mat-icon class="meta-icon">timer</mat-icon>
              <span> @if (ep.printTimeInSeconds && ep.printTimeInSeconds > 0) { {{ ep.printTimeInSeconds | duration }} } @else if (ep.estimatedPrintTimeInSeconds && ep.estimatedPrintTimeInSeconds > 0) { {{ ep.estimatedPrintTimeInSeconds | duration }} * } @else { -- } </span>
            </div>
            @if (ep.filamentUsage && ep.filamentUsage.length > 0) {
            <div class="meta-item materials-section">
              <div class="materials-container">
                @for (fu of ep.filamentUsage; track fu.id) {
                <div class="material-chip">
                  @if (fu.filament !== null) {
                  <div class="material-color" [style.background-color]="'#' + fu.filament.colorHex" [title]="fu.filament.colorName || 'No color name'"></div>
                  <span class="material-name"> {{ fu.filament?.displayName }} @if (fu.amountMg !== null && fu.amountMg > 0) { ({{ fu.amountMg / 1000 | number:'1.0-1' }}g) } @else if (fu.estimatedAmountMg !== null && fu.estimatedAmountMg > 0) { ({{ fu.estimatedAmountMg / 1000 | number:'1.0-1' }}g*) } </span>
                  } @else {
                  <span class="material-name">{{ fu.notes }}</span>
                  }
                </div>
                }
              </div>
            </div>
            }
            <div class="meta-item status-badge" [class]="'status-' + ep.status">
              <mat-icon class="meta-icon">{{ getStatusIcon(ep.status) }}</mat-icon>
              <span>{{ getStatus(ep.status) }}</span>
            </div>
          </div>
        </div>
        <div class="card-actions" (click)="$event.stopPropagation()">
          <button mat-icon-button [matMenuTriggerFor]="epCardMenu" attr.aria-label="More options for {{ ep.title }}">
            <mat-icon>more_vert</mat-icon>
          </button>
          <mat-menu #epCardMenu="matMenu">
            <a class="menu-link" mat-menu-item [routerLink]="['/prints', ep.id, 'edit']"><mat-icon>edit</mat-icon>Edit</a>
            <a class="menu-link" mat-menu-item [routerLink]="['/prints', ep.id]"><mat-icon>launch</mat-icon>View</a>
            <button type="button" mat-menu-item (click)="share(ep)"><mat-icon>share</mat-icon>Share</button>
            <a class="menu-link" mat-menu-item [routerLink]="['/prints/copy', ep.id]"><mat-icon>file_copy</mat-icon>Duplicate</a>
            <button type="button" mat-menu-item (click)="deletePrint(ep)"><mat-icon>delete</mat-icon>Delete</button>
            <hr />
            <button mat-menu-item [matMenuTriggerFor]="epCardStatusMenu">Change Print Status</button>
          </mat-menu>
          <mat-menu #epCardStatusMenu="matMenu">
            <button type="button" mat-menu-item (click)="changeStatus(ep.id, printStatusTypes.Pending)"><mat-icon>pending_actions</mat-icon>Pending</button>
            <button type="button" mat-menu-item (click)="changeStatus(ep.id, printStatusTypes.Printing)"><mat-icon>play_circle_outline</mat-icon>Printing</button>
            <button type="button" mat-menu-item (click)="changeStatus(ep.id, printStatusTypes.Success)"><mat-icon>done</mat-icon>Success</button>
            <button type="button" mat-menu-item (click)="changeStatus(ep.id, printStatusTypes.PartialSuccess)"><mat-icon>rule</mat-icon>Partial Success</button>
            <button type="button" mat-menu-item (click)="changeStatus(ep.id, printStatusTypes.Failed)"><mat-icon>phonelink_off</mat-icon>Failed</button>
            <button type="button" mat-menu-item (click)="changeStatus(ep.id, printStatusTypes.Cancelled)"><mat-icon>remove_circle_outline</mat-icon>Cancelled</button>
          </mat-menu>
        </div>
      </div>
    </mat-card-content>
  </mat-card>
  } @if (row.kind === 'more-prints') {
  <p class="more-prints-mobile-row">+ {{ row.count }} more print{{ row.count === 1 ? '' : 's' }} not shown by current filters</p>
  } } @if (!feed()?.items?.length) {
  <p class="empty-state">No prints found. Try adjusting your search or filters.</p>
  }
</div>
```

- [ ] **Step 3: Run lint**

```bash
cd D:/Development/3d-print-log/print-log-ui
npm run lint:brief
```

Expected: No errors.

- [ ] **Step 4: Run tests**

```bash
cd D:/Development/3d-print-log/print-log-ui
npm run test:brief
```

Expected: TOTAL: 431 SUCCESS

- [ ] **Step 5: Commit**

```bash
cd D:/Development/3d-print-log/print-log-ui
git add src/app/print/print-list/print-grouped-view/print-grouped-view.component.html
git commit -m "feat: add mobile card view to PrintGroupedViewComponent"
```

---

## Task 4: Browser verification

- [ ] **Step 1: Open DevTools mobile emulation**

With the dev server already running at `https://localhost:4200`, open Chrome DevTools, toggle device toolbar (Ctrl+Shift+M), and set to a mobile viewport (e.g. iPhone 12, 390px wide).

- [ ] **Step 2: Navigate to `/prints` and switch to Grouped view**

Verify:

1. The mat-table is hidden and the card list appears.
2. Project rows render as cards with: folder icon, project name, status chip, print count, total time, materials list, and a ⋮ menu with "View Project".
3. Tapping a project card expands it — print cards appear below with left border + tint.
4. Standalone print rows render as cards matching the All Prints mobile card layout.
5. Expanded print cards show the same fields as standalone cards (thumbnail, title, printer, date, time, materials, status, ⋮ menu).
6. When filters are active and a project has hidden prints, the "+ X more prints" text appears after expanded cards.
7. The ⋮ menu on print cards opens with Edit / View / Share / Duplicate / Delete / Change Print Status.
8. Switching back to desktop viewport restores the table.

- [ ] **Step 3: Commit any fixes**

```bash
cd D:/Development/3d-print-log/print-log-ui
git add -p
git commit -m "fix: mobile card view browser verification fixes"
```

---

## Self-Review

**Spec coverage:**

- ✅ `fxHide.gt-sm` mobile section / `fxHide.lt-md` on table
- ✅ Project card: folder icon, name, status chip, print count, total print time, materials, ⋮ menu (View Project), tap to expand
- ✅ Standalone print card: thumbnail, printer, date, time, materials, status badge, ⋮ full menu
- ✅ Expanded print card: same as standalone + left border + tint
- ✅ More-prints row rendered in mobile section
- ✅ `getStatusIcon()` added to component

**Placeholder scan:** None found.

**Type consistency:**

- `getStatusIcon(status: PrintStatus | undefined)` — takes a raw `PrintStatus` value, matching how it's called in the template with `p?.status` and `ep.status`
- `getStatus(status: PrintStatus | undefined)` — already exists on the component, called the same way
- `row.item.filamentUsage` on project rows — type is `PrintFilamentSummaryDto[]`, accessed as `fu.filament`, `fu.amountMg`, `fu.id` — matches the interface in `project.service.ts`
- `row.item.print` on print rows — type is `any` (PrintSummary shape) per the `GroupedFeedItemDto` interface — `p?.id`, `p?.title`, etc. all valid
- `row.print` on expanded-print rows — type is `PrintSummary` — `ep.id`, `ep.title`, `ep.filamentUsage` all valid
