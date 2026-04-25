# PrintCardComponent + Project Detail Card View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract the print list mobile card into a reusable standalone `PrintCardComponent`, then use it in both `PrintListComponent` and `ProjectDetailComponent`.

**Architecture:** A new standalone `PrintCardComponent` in `src/app/print/print-card/` accepts a `PrintSummary` input and emits `deleted` and `statusChanged` outputs; it handles share internally via `MatDialog` and uses absolute `RouterLink`s for navigation. `PrintListComponent` (module-based) uses the card via `PrintModule` imports; `ProjectDetailComponent` (standalone) imports it directly.

**Tech Stack:** Angular 20, Angular Material, `moment-js`, `SharedModule` (provides `PrintImageComponent`, `DurationPipe`, Material modules), `ProjectChipComponent` (standalone).

---

## File Map

| Action | Path                                                              |
| ------ | ----------------------------------------------------------------- |
| Create | `src/app/print/print-card/print-card.component.ts`                |
| Create | `src/app/print/print-card/print-card.component.html`              |
| Create | `src/app/print/print-card/print-card.component.scss`              |
| Create | `src/app/print/print-card/print-card.component.spec.ts`           |
| Modify | `src/app/print/print.module.ts`                                   |
| Modify | `src/app/print/print-list/print-list.component.html`              |
| Modify | `src/app/print/print-list/print-list.component.ts`                |
| Modify | `src/app/print/print-list/print-list.component.scss`              |
| Modify | `src/app/project/project-detail/project-detail.component.ts`      |
| Modify | `src/app/project/project-detail/project-detail.component.html`    |
| Modify | `src/app/project/project-detail/project-detail.component.scss`    |
| Modify | `src/app/project/project-detail/project-detail.component.spec.ts` |

**Design note:** Share is handled inside `PrintCardComponent` (injects `MatDialog`, opens `PrintShareDialogComponent` directly) — no `shared` output needed. Duplicate is an absolute `RouterLink` in the template — no `duplicated` output needed. Only `deleted` and `statusChanged` are emitted to parents.

---

## Task 1: Write failing test + create PrintCardComponent skeleton

**Files:**

- Create: `src/app/print/print-card/print-card.component.spec.ts`
- Create: `src/app/print/print-card/print-card.component.ts`
- Create: `src/app/print/print-card/print-card.component.html`
- Create: `src/app/print/print-card/print-card.component.scss`

- [ ] **Step 1: Write the failing test**

Create `src/app/print/print-card/print-card.component.spec.ts`:

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialog } from '@angular/material/dialog';
import { By } from '@angular/platform-browser';
import { PrintCardComponent } from './print-card.component';
import { PrintSummary, PrintStatus } from 'src/app/core/services/print.service';
import { LoggingService } from 'src/app/core/services/logging.service';

const mockPrint: PrintSummary = {
  id: 42,
  title: 'Benchy Test Print',
  printer: { id: 1, name: 'Voron', make: 'Voron Design', model: '2.4' } as any,
  startDate: new Date('2026-04-01'),
  status: PrintStatus.Success,
  defaultPrintImageId: 0,
  createdByUserId: 1,
  estimatedPrintTimeInSeconds: 3600,
  printTimeInSeconds: 3500,
  sumActualFilamentWeightMg: 15000,
  sumEstimatedFilamentWeightMg: 14000,
  totalFilamentWeightMg: 15000,
  filamentUsage: [],
  commentCount: 0,
};

describe('PrintCardComponent', () => {
  let component: PrintCardComponent;
  let fixture: ComponentFixture<PrintCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PrintCardComponent, NoopAnimationsModule],
      providers: [provideRouter([]), { provide: MatDialog, useValue: jasmine.createSpyObj('MatDialog', ['open']) }, { provide: LoggingService, useValue: jasmine.createSpyObj('LoggingService', ['logEvent']) }],
    }).compileComponents();

    fixture = TestBed.createComponent(PrintCardComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('print', mockPrint);
    fixture.detectChanges();
  });

  it('should render the print title', () => {
    const title = fixture.debugElement.query(By.css('.card-title'));
    expect(title.nativeElement.textContent.trim()).toBe('Benchy Test Print');
  });

  it('should render the printer label', () => {
    const content = fixture.nativeElement.textContent as string;
    expect(content).toContain('Voron - (Voron Design 2.4)');
  });

  it('should show the correct status text', () => {
    const content = fixture.nativeElement.textContent as string;
    expect(content).toContain('Success');
  });

  it('should emit deleted output when delete is triggered', () => {
    const deletedSpy = jasmine.createSpy('deleted');
    component.deleted.subscribe(deletedSpy);
    component.onDeleteClicked();
    expect(deletedSpy).toHaveBeenCalledWith(mockPrint);
  });

  it('should emit statusChanged when changeStatus is called', () => {
    const spy = jasmine.createSpy('statusChanged');
    component.statusChanged.subscribe(spy);
    component.onStatusChange(PrintStatus.Failed);
    expect(spy).toHaveBeenCalledWith({ id: 42, status: PrintStatus.Failed });
  });
});
```

- [ ] **Step 2: Create empty component files so the import resolves**

Create `src/app/print/print-card/print-card.component.ts`:

```typescript
import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import moment from 'moment';
import { PrintSummary, PrintStatus } from 'src/app/core/services/print.service';
import { PrinterSummary } from 'src/app/core/services/printer.service';
import { LoggingService } from 'src/app/core/services/logging.service';
import { SharedModule } from 'src/app/shared/shared.module';
import { ProjectChipComponent } from 'src/app/shared/project-chip/project-chip.component';
import { PrintShareDialogComponent } from 'src/app/print/print-share-dialog/print-share-dialog.component';

@Component({
  selector: 'app-print-card',
  templateUrl: './print-card.component.html',
  styleUrls: ['./print-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, SharedModule, ProjectChipComponent],
})
export class PrintCardComponent {
  private readonly dialog = inject(MatDialog);
  private readonly loggingService = inject(LoggingService);

  readonly print = input.required<PrintSummary>();
  readonly deleted = output<PrintSummary>();
  readonly statusChanged = output<{ id: number; status: PrintStatus }>();
  readonly printStatusTypes = PrintStatus;

  onDeleteClicked(): void {
    this.deleted.emit(this.print());
  }

  onStatusChange(status: PrintStatus): void {
    this.statusChanged.emit({ id: this.print().id, status });
  }

  onShareClicked(): void {
    this.loggingService.logEvent('PrintCard_ShareClicked', { printId: this.print().id });
    this.dialog.open(PrintShareDialogComponent, {
      width: '300px',
      minWidth: '300px',
      data: { printId: this.print().id },
    });
  }

  protected getPrinterLabel(printer: PrinterSummary): string {
    if (printer.name && printer.name !== '') {
      return `${printer.name} - (${(printer.make + ' ' + printer.model).trim()})`;
    }
    return `${(printer.make + ' ' + printer.model).trim()}`;
  }

  protected getStatus(print: PrintSummary): string {
    if (print.status === PrintStatus.Cancelled) return 'Cancelled';
    if (print.status === PrintStatus.Failed) return 'Failed';
    if (print.status === PrintStatus.Pending) return 'Pending';
    if (print.status === PrintStatus.Printing) return 'Printing';
    if (print.status === PrintStatus.Success) return 'Success';
    if (print.status === PrintStatus.PartialSuccess) return 'Partial Success';
    return 'Unknown';
  }

  protected getStatusIcon(print: PrintSummary): string {
    if (print.status === PrintStatus.Cancelled) return 'remove_circle_outline';
    if (print.status === PrintStatus.Failed) return 'error_outline';
    if (print.status === PrintStatus.Pending) return 'pending_actions';
    if (print.status === PrintStatus.Printing) return 'play_circle_outline';
    if (print.status === PrintStatus.Success) return 'check_circle_outline';
    if (print.status === PrintStatus.PartialSuccess) return 'rule';
    return 'help_outline';
  }

  protected getPrintEndDate(print: PrintSummary): Date | null {
    if (print.startDate && ((print.estimatedPrintTimeInSeconds ?? 0) > 0 || (print.printTimeInSeconds ?? 0) > 0)) {
      const printTime = (print.printTimeInSeconds ?? 0) > 0 ? print.printTimeInSeconds! : (print.estimatedPrintTimeInSeconds ?? 0) > 0 ? print.estimatedPrintTimeInSeconds! : 0;
      return moment(print.startDate).add(printTime, 'seconds').toDate();
    }
    return null;
  }
}
```

Create `src/app/print/print-card/print-card.component.html` (minimal for now):

```html
<mat-card class="print-card" [routerLink]="['/prints', print().id]">
  <mat-card-content>
    <div class="card-layout">
      <div class="card-content">
        <h3 class="card-title">{{ print().title }}</h3>
        <div class="card-meta">
          <div class="meta-item">
            <mat-icon class="meta-icon">print</mat-icon>
            <span>{{ getPrinterLabel(print().printer) }}</span>
          </div>
          <div class="meta-item status-badge" [class]="'status-' + print().status">
            <mat-icon class="meta-icon">{{ getStatusIcon(print()) }}</mat-icon>
            <span>{{ getStatus(print()) }}</span>
          </div>
        </div>
      </div>
    </div>
  </mat-card-content>
</mat-card>
```

Create `src/app/print/print-card/print-card.component.scss` (empty for now):

```scss

```

- [ ] **Step 3: Run the failing test to confirm the spec file loads but tests fail**

```bash
npm run test:brief -- --include=src/app/print/print-card/print-card.component.spec.ts
```

Expected: `onDeleteClicked` and `onStatusChange` should pass; `card-title` and printer label tests may need the full template — note which fail.

- [ ] **Step 4: Commit the skeleton**

```bash
git add src/app/print/print-card/
git commit -m "feat: add PrintCardComponent skeleton with tests"
```

---

## Task 2: Implement full PrintCardComponent template and styles

**Files:**

- Modify: `src/app/print/print-card/print-card.component.html`
- Modify: `src/app/print/print-card/print-card.component.scss`

- [ ] **Step 1: Replace the minimal template with the full card template**

Replace the entire contents of `src/app/print/print-card/print-card.component.html` with:

```html
<mat-card class="print-card" [routerLink]="['/prints', print().id]">
  <mat-card-content>
    <div class="card-layout">
      <!-- Image Section -->
      <div class="card-image">
        <app-print-image [printId]="print().id" [imageId]="print().defaultPrintImageId" />
      </div>

      <!-- Content Section -->
      <div class="card-content">
        <h3 class="card-title">{{ print().title }}</h3>
        @if (print().projectName) {
        <app-project-chip [projectName]="print().projectName!" [projectStatus]="print().projectStatus!" [projectId]="print().projectId" />
        }

        <div class="card-meta">
          <div class="meta-item">
            <mat-icon class="meta-icon">print</mat-icon>
            <span>{{ getPrinterLabel(print().printer) }}</span>
          </div>

          <div class="meta-item">
            <mat-icon class="meta-icon">calendar_today</mat-icon>
            <span>{{ print().startDate | date }}</span>
          </div>

          <div class="meta-item">
            <mat-icon class="meta-icon">timer</mat-icon>
            <span> @if ( print().printTimeInSeconds !== null && print().printTimeInSeconds! > 0 ) { {{ print().printTimeInSeconds | duration }} } @else if ( print().estimatedPrintTimeInSeconds !== null && print().estimatedPrintTimeInSeconds! > 0 ) { {{ print().estimatedPrintTimeInSeconds | duration }} * } @else { -- } </span>
          </div>

          @if (print().filamentUsage && print().filamentUsage.length > 0) {
          <div class="meta-item materials-section">
            <div class="materials-container">
              @for (fu of print().filamentUsage; track fu; let i = $index) {
              <div class="material-chip">
                @if (fu.filament !== null) {
                <div class="material-color" [style.background-color]="'#' + fu.filament.colorHex" [title]="fu.filament.colorName || 'No color name'"></div>
                <span class="material-name"> {{ fu.filament?.displayName }} @if (fu.amountMg !== null && fu.amountMg > 0) { ({{ fu.amountMg / 1000 | number: '1.0-1' }}g) } @else if ( fu.estimatedAmountMg !== null && fu.estimatedAmountMg > 0 ) { ({{ fu.estimatedAmountMg / 1000 | number: '1.0-1' }}g*) } </span>
                } @else {
                <span class="material-name">{{ fu.notes }}</span>
                }
              </div>
              }
            </div>
          </div>
          }

          <div class="meta-item status-badge" [class]="'status-' + print().status">
            <mat-icon class="meta-icon">{{ getStatusIcon(print()) }}</mat-icon>
            <span>{{ getStatus(print()) }}</span>
          </div>
        </div>
      </div>

      <!-- Actions Section -->
      <div class="card-actions" (click)="$event.stopPropagation()">
        <button mat-icon-button [matMenuTriggerFor]="cardMenu" [attr.aria-label]="'More options for ' + print().title">
          <mat-icon>more_vert</mat-icon>
        </button>
        <mat-menu #cardMenu="matMenu">
          <a class="menu-link" mat-menu-item [routerLink]="['/prints', print().id, 'edit']"> <mat-icon>edit</mat-icon>Edit </a>
          <a class="menu-link" mat-menu-item [routerLink]="['/prints', print().id]"> <mat-icon>launch</mat-icon>View </a>
          <button type="button" mat-menu-item (click)="onShareClicked()"><mat-icon>share</mat-icon>Share</button>
          <a class="menu-link" mat-menu-item [routerLink]="['/prints', 'copy', print().id]"> <mat-icon>file_copy</mat-icon>Duplicate </a>
          <button type="button" mat-menu-item (click)="onDeleteClicked()"><mat-icon>delete</mat-icon>Delete</button>
          <hr />
          <button mat-menu-item [matMenuTriggerFor]="printStatusMenu">Change Print Status</button>
        </mat-menu>
        <mat-menu #printStatusMenu="matMenu">
          <button type="button" mat-menu-item (click)="onStatusChange(printStatusTypes.Pending)"><mat-icon>pending_actions</mat-icon>Pending</button>
          <button type="button" mat-menu-item (click)="onStatusChange(printStatusTypes.Printing)"><mat-icon>play_circle_outline</mat-icon>Printing</button>
          <button type="button" mat-menu-item (click)="onStatusChange(printStatusTypes.Success)"><mat-icon>done</mat-icon>Success</button>
          <button type="button" mat-menu-item (click)="onStatusChange(printStatusTypes.PartialSuccess)"><mat-icon>rule</mat-icon>Partial Success</button>
          <button type="button" mat-menu-item (click)="onStatusChange(printStatusTypes.Failed)"><mat-icon>phonelink_off</mat-icon>Failed</button>
          <button type="button" mat-menu-item (click)="onStatusChange(printStatusTypes.Cancelled)"><mat-icon>remove_circle_outline</mat-icon>Cancelled</button>
        </mat-menu>
      </div>
    </div>
  </mat-card-content>
</mat-card>
```

- [ ] **Step 2: Add card styles to `print-card.component.scss`**

Replace the empty file with the card-specific styles moved from `print-list.component.scss`:

```scss
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

.card-actions {
  display: flex;
  align-items: flex-start;
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

- [ ] **Step 3: Run the tests**

```bash
npm run test:brief -- --include=src/app/print/print-card/print-card.component.spec.ts
```

Expected: All 5 tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/app/print/print-card/
git commit -m "feat: implement PrintCardComponent with full template and styles"
```

---

## Task 3: Register PrintCardComponent in PrintModule and refactor PrintListComponent

**Files:**

- Modify: `src/app/print/print.module.ts`
- Modify: `src/app/print/print-list/print-list.component.html`
- Modify: `src/app/print/print-list/print-list.component.ts`
- Modify: `src/app/print/print-list/print-list.component.scss`

- [ ] **Step 1: Add `PrintCardComponent` to `PrintModule` imports**

In `src/app/print/print.module.ts`, add the import and add it to the `imports` array:

```typescript
// Add this import near the top:
import { PrintCardComponent } from './print-card/print-card.component';

// In the @NgModule, add to imports array (after PrintGroupedViewComponent):
imports: [
  CommonModule,
  PrintRoutingModule,
  FormsModule,
  ReactiveFormsModule,
  SharedModule,
  AdsenseModule,
  FileAttachmentSectionComponent,
  ProjectChipComponent,
  ProjectSelectorComponent,
  MatButtonToggleModule,
  PrintGroupedViewComponent,
  PrintCardComponent,   // <-- add this
],
```

- [ ] **Step 2: Replace the mobile card `@for` block in `print-list.component.html`**

In `src/app/print/print-list/print-list.component.html`, find the mobile card view section (the `<div class="mobile-card-view" fxHide.gt-sm>` block, approximately lines 174–381) and replace it entirely with:

```html
<!-- Mobile Card View -->
<div class="mobile-card-view" fxHide.gt-sm>
  @for (print of prints; track print.id) {
  <app-print-card [print]="print" (deleted)="deletePrint($event)" (statusChanged)="changeStatus($event.id, $event.status)" />
  } @if (totalCount === 0) {
  <div class="no-prints">No prints found. Add a new print or try a different search.</div>
  }
</div>
```

- [ ] **Step 3: Remove card-specific styles from `print-list.component.scss`**

In `src/app/print/print-list/print-list.component.scss`, delete the following blocks — they now live in `print-card.component.scss`:

- `.print-card { ... }` (and its `&:hover`, `&:active` nested rules)
- `.card-layout { ... }`
- `.card-image { ... }`
- `.card-content { ... }`
- `.card-title { ... }`
- `.card-meta { ... }`
- `.meta-item { ... }` (and its nested `.meta-icon`, `span`, `&.materials-section` rules)
- `.materials-container { ... }` (the standalone one below `.meta-item`)
- `.material-chip { ... }`
- `.material-color { ... }`
- `.material-name { ... }`
- `.status-badge { ... }` (and all nested `&.status-N` rules)
- `.card-actions { ... }`
- The entire `:host-context(body.dark-theme)` block (moved to `print-card.component.scss`)

Keep: table styles, `.header`, `.header-top`, `.action-buttons`, `.search-field`, `.filter-toggle-btn`, `.filter-panel`, `.filter-panel-inner`, `.filter-field`, `.filament-chips`, `.filament-color-cell`, `.filament-color-dot`, `.filament-chip-label`, `.print-image`, `.print-image-medium`, `.print-image-large`, `.no-prints`, `.mat-column-more`, media queries for table, `.mobile-card-view`, zebra striping.

- [ ] **Step 4: Run the full test suite to confirm no regressions**

```bash
npm run test:brief
```

Expected: All tests pass. The `PrintListComponent` tests don't test the mobile card directly so no updates are needed there.

- [ ] **Step 5: Commit**

```bash
git add src/app/print/print.module.ts src/app/print/print-list/
git commit -m "refactor: use PrintCardComponent in PrintListComponent mobile view"
```

---

## Task 4: Update ProjectDetailComponent to use PrintCardComponent

**Files:**

- Modify: `src/app/project/project-detail/project-detail.component.ts`
- Modify: `src/app/project/project-detail/project-detail.component.html`
- Modify: `src/app/project/project-detail/project-detail.component.scss`
- Modify: `src/app/project/project-detail/project-detail.component.spec.ts`

- [ ] **Step 1: Write failing tests in `project-detail.component.spec.ts`**

Add the following tests to the existing `describe('ProjectDetailComponent')` block in `src/app/project/project-detail/project-detail.component.spec.ts`.

First, extend the existing import from `print.service` to include `PrintStatus` and `PrintSummary`:

```typescript
import { PrintService, PrintSummary, PrintStatus } from 'src/app/core/services/print.service';
```

Then declare `mockPrintService` at the outer `describe` scope (next to the existing `mockProjectService` declaration):

```typescript
let mockPrintService: jasmine.SpyObj<PrintService>;
```

Expand the `mockPrintService` setup in `beforeEach` to include the new methods needed. Find the existing `mockPrintService` setup and replace it:

```typescript
// Replace the mockPrintService block (currently creates spy with just getPrintSummaries):
const mockPrintService = jasmine.createSpyObj('PrintService', ['getPrintSummaries', 'deletePrint', 'updatePrintStatus']);
mockPrintService.getPrintSummaries.and.returnValue(
  of({
    items: [],
    paging: { totalCount: 0, pageNumber: 1, pageSize: 100, totalPages: 0 },
  })
);
mockPrintService.deletePrint.and.returnValue(of(null));
mockPrintService.updatePrintStatus.and.returnValue(of(null));
```

Then add a `let mockPrintService: jasmine.SpyObj<PrintService>;` in the outer `describe` scope and assign it in `beforeEach`. Also expose `fixture` and `component` at the outer scope so the new tests can access them.

Add these new `it` blocks after the existing tests:

```typescript
it('should call PrintService.deletePrint when onPrintDeleted is called and confirmed', async () => {
  const mockDialog = TestBed.inject(MatDialog) as jasmine.SpyObj<MatDialog>;
  const mockDialogRef = { afterClosed: () => of(true) } as any;
  mockDialog.open.and.returnValue(mockDialogRef);

  const print: PrintSummary = {
    id: 7,
    title: 'Test Print',
    printer: { id: 1, make: 'Prusa', model: 'MK4', name: '' } as any,
    status: PrintStatus.Success,
    defaultPrintImageId: 0,
    createdByUserId: 1,
    estimatedPrintTimeInSeconds: 0,
    printTimeInSeconds: 0,
    sumActualFilamentWeightMg: 0,
    sumEstimatedFilamentWeightMg: 0,
    totalFilamentWeightMg: 0,
    filamentUsage: [],
    commentCount: 0,
  };

  component.onPrintDeleted(print);
  await fixture.whenStable();

  expect(mockPrintService.deletePrint).toHaveBeenCalledWith(7);
});

it('should call PrintService.updatePrintStatus when onPrintStatusChanged is called', async () => {
  component.onPrintStatusChanged({ id: 7, status: PrintStatus.Failed });
  await fixture.whenStable();
  expect(mockPrintService.updatePrintStatus).toHaveBeenCalledWith(7, PrintStatus.Failed);
});
```

- [ ] **Step 2: Run the new tests to confirm they fail**

```bash
npm run test:brief -- --include=src/app/project/project-detail/project-detail.component.spec.ts
```

Expected: FAIL — `onPrintDeleted` and `onPrintStatusChanged` do not exist yet.

- [ ] **Step 3: Update `project-detail.component.ts`**

Add the following imports at the top of `src/app/project/project-detail/project-detail.component.ts`:

```typescript
// Extend the existing print.service import to include PrintStatus:
import {
  PrintService,
  PrintSummary,
  PrintStatus, // <-- add PrintStatus
} from 'src/app/core/services/print.service';
// Add new standalone component import:
import { PrintCardComponent } from 'src/app/print/print-card/print-card.component';
```

Add `PrintCardComponent` to the `imports` array in the `@Component` decorator:

```typescript
imports: [
  RouterLink,
  MatCardModule,
  MatButtonModule,
  MatIconModule,
  MatMenuModule,
  MatSelectModule,
  MatProgressSpinnerModule,
  SharedModule,
  ProjectEditFormComponent,
  ImageCarouselComponent,
  ImageThumbnailStripComponent,
  PrintCardComponent,   // <-- add this
],
```

Add two new methods to the `ProjectDetailComponent` class (after `loadPrints`):

```typescript
onPrintDeleted(print: PrintSummary): void {
  const dialogRef = this.dialog.open(SimpleDialogComponent, { maxWidth: '350px' });
  dialogRef.componentInstance.title = 'Delete?';
  dialogRef.componentInstance.body = `Are you sure you want to delete print "${print.title}"?<br /><br />This action cannot be undone.`;
  dialogRef.componentInstance.yesText = 'Delete';
  dialogRef.componentInstance.yesColor = 'warn';
  dialogRef.componentInstance.noText = 'Cancel';
  dialogRef.afterClosed().pipe(take(1)).subscribe((shouldDelete) => {
    if (shouldDelete) {
      this.printService.deletePrint(print.id).pipe(take(1)).subscribe(() => {
        this.loadPrints(this.project()!.id);
      });
    }
  });
}

onPrintStatusChanged(event: { id: number; status: PrintStatus }): void {
  this.printService.updatePrintStatus(event.id, event.status).pipe(take(1)).subscribe(() => {
    this.loadPrints(this.project()!.id);
  });
}
```

Note: `SimpleDialogComponent` is declared in `SharedModule` which is already imported. `take` is already imported in the file. Share is handled internally by `PrintCardComponent`. Duplication uses an absolute `RouterLink` inside the card — no handler needed here.

- [ ] **Step 4: Update the template in `project-detail.component.html`**

In `src/app/project/project-detail/project-detail.component.html`, find the "Prints" `mat-card-content` block (currently lines 148–158):

```html
<mat-card appearance="outlined" class="prints-card">
  <mat-card-header><mat-card-title>Prints</mat-card-title></mat-card-header>
  <mat-card-content>
    @for (print of prints(); track print.id) {
    <div class="print-row">
      <a [routerLink]="['/prints', print.id]">{{ print.title }}</a>
      <span>{{ print.startDate | date: 'mediumDate' }}</span>
    </div>
    } @empty {
    <p>No prints in this project yet.</p>
    }
  </mat-card-content>
</mat-card>
```

Replace only the `mat-card-content` inner block:

```html
<mat-card appearance="outlined" class="prints-card">
  <mat-card-header><mat-card-title>Prints</mat-card-title></mat-card-header>
  <mat-card-content>
    @for (print of prints(); track print.id) {
    <app-print-card [print]="print" (deleted)="onPrintDeleted($event)" (statusChanged)="onPrintStatusChanged($event)" />
    } @empty {
    <p>No prints in this project yet.</p>
    }
  </mat-card-content>
</mat-card>
```

- [ ] **Step 5: Remove `.print-row` styles from `project-detail.component.scss`**

In `src/app/project/project-detail/project-detail.component.scss`, delete the `.print-row` block:

```scss
// DELETE this entire block:
.print-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid var(--mat-sys-outline-variant);

  &:last-child {
    border-bottom: none;
  }
}
```

- [ ] **Step 6: Run the tests**

```bash
npm run test:brief -- --include=src/app/project/project-detail/project-detail.component.spec.ts
```

Expected: All tests pass including the two new ones.

- [ ] **Step 7: Run the full test suite**

```bash
npm run test:brief
```

Expected: All tests pass with no regressions.

- [ ] **Step 8: Commit**

```bash
git add src/app/project/project-detail/
git commit -m "feat: show print cards in project detail view using PrintCardComponent"
```
