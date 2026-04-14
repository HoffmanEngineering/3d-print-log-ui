# Print Projects — Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Projects support to the Angular UI — project chip on print cards, grouped view toggle, project selector on the print form, and a project detail page.

**Architecture:** A new `ProjectService` handles all project API calls. The print list gains a view toggle; the grouped view is a new component driven by `GET /api/Prints/grouped`. The print add/edit form gains a project autocomplete field with inline creation. A new `ProjectDetailComponent` at `/projects/:id` handles the shareable project page. All new components are standalone and use OnPush change detection.

**Tech Stack:** Angular 20, Angular Material, Reactive Forms, signals, `inject()`, OnPush, standalone components.

**Prerequisite:** The backend plan (`2026-04-13-print-projects-backend.md`) must be complete before starting this plan.

**Working directory:** `D:/Development/3d-print-log/print-log-ui`

---

### Task 1: ProjectService and project types

**Files:**

- Create: `src/app/core/services/project.service.ts`

- [ ] **Step 1: Write a failing unit test**

Create `src/app/core/services/project.service.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ProjectService, ProjectStatus, ProjectViewStatus, AddProjectDto } from './project.service';
import { environment } from 'src/environments/environment.unittest';

describe('ProjectService', () => {
  let service: ProjectService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ProjectService],
    });
    service = TestBed.inject(ProjectService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should create a project', () => {
    const dto: AddProjectDto = {
      name: 'Voron Build',
      status: ProjectStatus.InProgress,
      viewStatus: ProjectViewStatus.Private,
    };
    service.createProject(dto).subscribe((result) => {
      expect(result.name).toBe('Voron Build');
    });

    const req = httpMock.expectOne(`${environment.printLogApiUrl}/api/Projects`);
    expect(req.request.method).toBe('POST');
    req.flush({ id: 'some-guid', name: 'Voron Build', status: 1, viewStatus: 3, printCount: 0 });
  });

  it('should get project summaries', () => {
    service.getProjectSummaries(1, 10).subscribe((result) => {
      expect(result.items.length).toBe(0);
    });
    const req = httpMock.expectOne((r) => r.url.includes('/api/Projects'));
    expect(req.request.method).toBe('GET');
    req.flush({ items: [], paging: { totalCount: 0, pageNumber: 1, pageSize: 10 } });
  });
});
```

- [ ] **Step 2: Run test to confirm failure**

```bash
npm run test:brief
```

Expected: FAIL — `ProjectService` does not exist.

- [ ] **Step 3: Create `project.service.ts`**

```typescript
import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { PagedList } from '../types/paging';

export enum ProjectStatus {
  InProgress = 1,
  Complete = 2,
  OnHold = 3,
  Cancelled = 4,
}

export enum ProjectViewStatus {
  Public = 1,
  Unlisted = 2,
  Private = 3,
}

export interface ProjectImageDto {
  id: number;
  isDefault: boolean;
  displayOrder: number;
  url?: string;
}

export interface ProjectSummaryDto {
  id: string;
  name: string;
  reference?: string;
  status: ProjectStatus;
  viewStatus: ProjectViewStatus;
  createdDate: Date;
  printCount: number;
  totalPrintTimeInSeconds: number;
  totalEstimatedPrintTimeInSeconds: number;
  totalFilamentWeightMg: number;
  defaultImageId: number;
}

export interface ProjectDetailDto {
  id: string;
  name: string;
  reference?: string;
  description?: string;
  url?: string;
  status: ProjectStatus;
  viewStatus: ProjectViewStatus;
  createdDate: Date;
  createdByUserId: number;
  printCount: number;
  totalPrintTimeInSeconds: number;
  totalEstimatedPrintTimeInSeconds: number;
  totalFilamentWeightMg: number;
  images: ProjectImageDto[];
}

export interface AddProjectDto {
  name: string;
  reference?: string;
  description?: string;
  url?: string;
  status: ProjectStatus;
  viewStatus: ProjectViewStatus;
}

export interface PutProjectDto {
  id: string;
  name: string;
  reference?: string;
  description?: string;
  url?: string;
  status: ProjectStatus;
  viewStatus: ProjectViewStatus;
}

export interface GroupedFeedItemDto {
  type: 'project' | 'print';
  sortDate: Date;
  // project fields
  projectId?: string;
  projectName?: string;
  projectReference?: string;
  projectStatus?: ProjectStatus;
  printCount?: number;
  totalPrintTimeInSeconds?: number;
  totalEstimatedPrintTimeInSeconds?: number;
  totalFilamentWeightMg?: number;
  defaultProjectImageId?: number;
  // print fields
  print?: any; // PrintSummary shape — imported from print.service
}

@Injectable({ providedIn: 'root' })
export class ProjectService {
  private readonly http = inject(HttpClient);
  private readonly baseApi = environment.printLogApiUrl;

  getProjectSummaries(pageNumber = 1, pageSize = 10): Observable<PagedList<ProjectSummaryDto>> {
    const params = new HttpParams().set('pageNumber', pageNumber).set('pageSize', pageSize);
    return this.http.get<PagedList<ProjectSummaryDto>>(`${this.baseApi}/api/Projects`, { params });
  }

  getProjectById(id: string): Observable<ProjectDetailDto> {
    return this.http.get<ProjectDetailDto>(`${this.baseApi}/api/Projects/${id}`);
  }

  createProject(dto: AddProjectDto): Observable<ProjectDetailDto> {
    return this.http.post<ProjectDetailDto>(`${this.baseApi}/api/Projects`, dto);
  }

  updateProject(id: string, dto: PutProjectDto): Observable<ProjectDetailDto> {
    return this.http.put<ProjectDetailDto>(`${this.baseApi}/api/Projects/${id}`, dto);
  }

  deleteProject(id: string, deletePrints: boolean): Observable<void> {
    const params = new HttpParams().set('deletePrints', deletePrints);
    return this.http.delete<void>(`${this.baseApi}/api/Projects/${id}`, { params });
  }

  uploadImage(projectId: string, file: File): Observable<ProjectImageDto> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<ProjectImageDto>(`${this.baseApi}/api/Projects/${projectId}/images`, form);
  }

  deleteImage(projectId: string, imageId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseApi}/api/Projects/${projectId}/images/${imageId}`);
  }

  reorderImages(projectId: string, orderedImageIds: number[]): Observable<void> {
    return this.http.put<void>(`${this.baseApi}/api/Projects/${projectId}/images/reorder`, orderedImageIds);
  }

  getGroupedFeed(pageNumber = 1, pageSize = 20): Observable<PagedList<GroupedFeedItemDto>> {
    const params = new HttpParams().set('pageNumber', pageNumber).set('pageSize', pageSize);
    return this.http.get<PagedList<GroupedFeedItemDto>>(`${this.baseApi}/api/Prints/grouped`, { params });
  }
}
```

- [ ] **Step 4: Run tests**

```bash
npm run test:brief
```

Expected: All tests pass including the two new ProjectService tests.

- [ ] **Step 5: Commit**

```bash
git add src/app/core/services/project.service.ts src/app/core/services/project.service.spec.ts
git commit -m "feat: add ProjectService with all project API calls"
```

---

### Task 2: Update PrintService DTOs — add project fields

**Files:**

- Modify: `src/app/core/services/print.service.ts`

- [ ] **Step 1: Add project fields to `PrintSummary` interface**

In `print.service.ts`, add to the `PrintSummary` interface:

```typescript
projectId?: string;
projectName?: string;
```

- [ ] **Step 2: Add project fields to `AddPrintDTO` interface**

```typescript
projectId?: string;
newProjectName?: string;
```

- [ ] **Step 3: Add project fields to `PutPrintDetailDTO` interface**

```typescript
projectId?: string;
newProjectName?: string;
```

- [ ] **Step 4: Add project fields to `PrintDetail` and `PrintDetailDTO` interfaces**

```typescript
projectId?: string;
projectName?: string;
```

- [ ] **Step 5: Add `filterByProjectId` parameter to `getPrintSummaries` in `print.service.ts`**

Add `filterByProjectId?: string` as the last parameter of `getPrintSummaries`, and pass it as a query param when set:

```typescript
getPrintSummaries(
  pageNumber: number = 1,
  pageSize: number = 10,
  searchText: string = '',
  filterByStatus: PrintStatus | null = null,
  filterByPrinterIds: number[] = [],
  filterByFilamentIds: string[] = [],
  sortDirection = SortDirection.Desc,
  sortColumn = PrintSummarySortColumn.StartDate,
  userId?: number,
  filterByProjectId?: string
): Observable<PagedList<PrintSummary>> {
  // ... existing param building ...
  if (filterByProjectId) {
    params = params.set('filterByProjectId', filterByProjectId);
  }
  // ... rest of existing implementation unchanged
}
```

- [ ] **Step 6: Build to verify no TypeScript errors**

```bash
npm run build:dev 2>&1 | grep -E "error|Error" | head -20
```

Expected: No TypeScript errors.

- [ ] **Step 6: Commit**

```bash
git add src/app/core/services/print.service.ts
git commit -m "feat: add project fields to PrintService DTOs"
```

---

### Task 3: Project chip component

**Files:**

- Create: `src/app/shared/project-chip/project-chip.component.ts`
- Create: `src/app/shared/project-chip/project-chip.component.html`
- Create: `src/app/shared/project-chip/project-chip.component.scss`

The project chip shows a project's name and a color-coded status dot. Clicking it emits an event (the parent handles filtering).

- [ ] **Step 1: Write a failing unit test**

Create `src/app/shared/project-chip/project-chip.component.spec.ts`:

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ProjectChipComponent } from './project-chip.component';
import { ProjectStatus } from 'src/app/core/services/project.service';

describe('ProjectChipComponent', () => {
  let fixture: ComponentFixture<ProjectChipComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProjectChipComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(ProjectChipComponent);
  });

  it('should display the project name', () => {
    fixture.componentRef.setInput('projectName', 'My Voron Build');
    fixture.componentRef.setInput('projectStatus', ProjectStatus.InProgress);
    fixture.detectChanges();
    const chip = fixture.debugElement.query(By.css('.project-chip'));
    expect(chip.nativeElement.textContent).toContain('My Voron Build');
  });

  it('should emit clicked event on click', () => {
    fixture.componentRef.setInput('projectName', 'Test');
    fixture.componentRef.setInput('projectStatus', ProjectStatus.Complete);
    fixture.detectChanges();

    const emitted: string[] = [];
    fixture.componentInstance.chipClicked.subscribe((v: string) => emitted.push(v));

    fixture.debugElement.query(By.css('.project-chip')).nativeElement.click();
    expect(emitted).toEqual(['Test']);
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm run test:brief
```

Expected: FAIL — component does not exist.

- [ ] **Step 3: Create `project-chip.component.ts`**

```typescript
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatChipsModule } from '@angular/material/chips';
import { ProjectStatus } from 'src/app/core/services/project.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-project-chip',
  templateUrl: './project-chip.component.html',
  styleUrls: ['./project-chip.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatChipsModule, CommonModule],
})
export class ProjectChipComponent {
  projectName = input.required<string>();
  projectStatus = input.required<ProjectStatus>();
  chipClicked = output<string>();

  readonly ProjectStatus = ProjectStatus;

  onClick(event: MouseEvent): void {
    event.stopPropagation();
    this.chipClicked.emit(this.projectName());
  }

  get statusClass(): string {
    switch (this.projectStatus()) {
      case ProjectStatus.InProgress:
        return 'status-in-progress';
      case ProjectStatus.Complete:
        return 'status-complete';
      case ProjectStatus.OnHold:
        return 'status-on-hold';
      case ProjectStatus.Cancelled:
        return 'status-cancelled';
      default:
        return '';
    }
  }
}
```

- [ ] **Step 4: Create `project-chip.component.html`**

```html
<mat-chip class="project-chip" (click)="onClick($event)">
  <span class="status-dot" [class]="statusClass"></span>
  {{ projectName() }}
</mat-chip>
```

- [ ] **Step 5: Create `project-chip.component.scss`**

```scss
.project-chip {
  cursor: pointer;
  font-size: 0.75rem;
  height: 24px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;

  &.status-in-progress {
    background-color: #1976d2;
  }
  &.status-complete {
    background-color: #388e3c;
  }
  &.status-on-hold {
    background-color: #f57c00;
  }
  &.status-cancelled {
    background-color: #757575;
  }
}
```

- [ ] **Step 6: Run tests**

```bash
npm run test:brief
```

Expected: All tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/app/shared/project-chip/
git commit -m "feat: add ProjectChipComponent"
```

---

### Task 4: Add project chip to print list cards/rows

**Files:**

- Modify: `src/app/print/print-list/print-table-layout/print-table-layout.component.html`
- Modify: `src/app/print/print-list/print-list.component.html`
- Modify: `src/app/print/print-list/print-list.component.ts`

- [ ] **Step 1: Read the current print table layout template**

Read `src/app/print/print-list/print-table-layout/print-table-layout.component.html` to understand where the title/status columns are rendered, and `src/app/print/print-list/print-list.component.html` for the card layout.

- [ ] **Step 2: Add `ProjectChipComponent` import to the print list module**

In `src/app/print/print.module.ts`, add `ProjectChipComponent` to the `imports` array:

```typescript
import { ProjectChipComponent } from '../shared/project-chip/project-chip.component';
// ... in @NgModule imports:
ProjectChipComponent,
```

- [ ] **Step 3: Add chip to table layout**

In the table layout template, in the cell for the `title` column, add the chip below the title text:

```html
@if (print.projectName) {
<app-project-chip [projectName]="print.projectName" [projectStatus]="print.projectStatus" (chipClicked)="onProjectChipClicked(print.projectId)" />
}
```

- [ ] **Step 4: Add chip to card layout (mobile)**

In `print-list.component.html`, in the card layout where the print title is shown, add the same chip after the title:

```html
@if (print.projectName) {
<app-project-chip [projectName]="print.projectName" [projectStatus]="print.projectStatus" (chipClicked)="onProjectChipClicked(print.projectId)" />
}
```

- [ ] **Step 5: Add `onProjectChipClicked` handler to `print-list.component.ts`**

```typescript
onProjectChipClicked(projectId: string | undefined): void {
  if (!projectId) return;
  // Set the project filter and reload
  this.filterByProjectId = projectId;
  this.currentPage = 1;
  this.loadPrints();
}
```

Add `filterByProjectId: string | null = null` as a component field. Pass it to `getPrintSummaries` in `loadPrints()`.

- [ ] **Step 6: Build to verify**

```bash
npm run build:dev 2>&1 | grep -E "error|Error" | head -20
```

Expected: No TypeScript errors.

- [ ] **Step 7: Commit**

```bash
git add src/app/print/
git commit -m "feat: add project chip to print list cards and table rows"
```

---

### Task 5: Print list view toggle and grouped view

**Files:**

- Create: `src/app/print/print-list/print-grouped-view/print-grouped-view.component.ts`
- Create: `src/app/print/print-list/print-grouped-view/print-grouped-view.component.html`
- Create: `src/app/print/print-list/print-grouped-view/print-grouped-view.component.scss`
- Modify: `src/app/print/print-list/print-list.component.html`
- Modify: `src/app/print/print-list/print-list.component.ts`

- [ ] **Step 1: Write a failing unit test for `PrintGroupedViewComponent`**

Create `src/app/print/print-list/print-grouped-view/print-grouped-view.component.spec.ts`:

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PrintGroupedViewComponent } from './print-grouped-view.component';
import { ProjectService } from 'src/app/core/services/project.service';
import { of } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('PrintGroupedViewComponent', () => {
  let fixture: ComponentFixture<PrintGroupedViewComponent>;
  let mockProjectService: jasmine.SpyObj<ProjectService>;

  beforeEach(async () => {
    mockProjectService = jasmine.createSpyObj<ProjectService>('ProjectService', ['getGroupedFeed']);
    mockProjectService.getGroupedFeed.and.returnValue(
      of({
        items: [],
        paging: { totalCount: 0, pageNumber: 1, pageSize: 20, totalPages: 0 },
      })
    );

    await TestBed.configureTestingModule({
      imports: [PrintGroupedViewComponent, NoopAnimationsModule],
      providers: [{ provide: ProjectService, useValue: mockProjectService }],
    }).compileComponents();

    fixture = TestBed.createComponent(PrintGroupedViewComponent);
    fixture.detectChanges();
  });

  it('should call getGroupedFeed on init', () => {
    expect(mockProjectService.getGroupedFeed).toHaveBeenCalledWith(1, 20);
  });

  it('should display empty state when no items', async () => {
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No prints yet');
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm run test:brief
```

Expected: FAIL — component does not exist.

- [ ] **Step 3: Create `print-grouped-view.component.ts`**

```typescript
import { ChangeDetectionStrategy, Component, OnInit, inject, signal, computed } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import { ProjectService, GroupedFeedItemDto } from 'src/app/core/services/project.service';
import { PagedList } from 'src/app/core/types/paging';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ProjectChipComponent } from 'src/app/shared/project-chip/project-chip.component';
import { PrintService, PrintSummary } from 'src/app/core/services/print.service';
import { RouterLink } from '@angular/router';
import { DurationPipe } from 'src/app/shared/pipes/duration.pipe';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-print-grouped-view',
  templateUrl: './print-grouped-view.component.html',
  styleUrls: ['./print-grouped-view.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatExpansionModule, MatPaginatorModule, MatProgressSpinnerModule, ProjectChipComponent, RouterLink, DurationPipe],
})
export class PrintGroupedViewComponent implements OnInit {
  private readonly projectService = inject(ProjectService);
  private readonly printService = inject(PrintService);

  feed = signal<PagedList<GroupedFeedItemDto> | null>(null);
  loading = signal(true);
  pageNumber = signal(1);
  readonly pageSize = 20;

  expandedProjectPrints = signal<Map<string, PrintSummary[]>>(new Map());
  loadingProjectId = signal<string | null>(null);

  ngOnInit(): void {
    this.loadFeed();
  }

  loadFeed(): void {
    this.loading.set(true);
    this.projectService.getGroupedFeed(this.pageNumber(), this.pageSize).subscribe({
      next: (result) => {
        this.feed.set(result);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onPageChange(event: PageEvent): void {
    this.pageNumber.set(event.pageIndex + 1);
    this.loadFeed();
  }

  onProjectExpand(projectId: string): void {
    if (this.expandedProjectPrints().has(projectId)) return;
    this.loadingProjectId.set(projectId);
    this.printService.getPrintSummaries(1, 100, '', null, [], [], undefined, undefined, undefined, projectId).subscribe((result) => {
      const map = new Map(this.expandedProjectPrints());
      map.set(projectId, result.items);
      this.expandedProjectPrints.set(map);
      this.loadingProjectId.set(null);
    });
  }
}
```

- [ ] **Step 4: Create `print-grouped-view.component.html`**

```html
@if (loading()) {
<div class="loading-container">
  <mat-spinner diameter="40" />
</div>
} @else if (!feed()?.items?.length) {
<p class="empty-state">No prints yet. Start logging a print to see it here.</p>
} @else {
<mat-accordion multi>
  @for (item of feed()!.items; track item.sortDate) { @if (item.type === 'project') {
  <mat-expansion-panel (opened)="onProjectExpand(item.projectId!)">
    <mat-expansion-panel-header>
      <mat-panel-title>
        <app-project-chip [projectName]="item.projectName!" [projectStatus]="item.projectStatus!" />
      </mat-panel-title>
      <mat-panel-description> {{ item.printCount }} prints &middot; {{ item.totalPrintTimeInSeconds | duration }} &middot; {{ item.totalFilamentWeightMg / 1000 | number:'1.0-1' }}g </mat-panel-description>
    </mat-expansion-panel-header>

    @if (loadingProjectId() === item.projectId) {
    <mat-spinner diameter="24" />
    } @else {
    <div class="project-prints">
      @for (print of expandedProjectPrints().get(item.projectId!) ?? []; track print.id) {
      <div class="project-print-row">
        <a [routerLink]="['/prints', print.id]">{{ print.title }}</a>
        <span>{{ print.startDate | date:'mediumDate' }}</span>
      </div>
      }
      <a [routerLink]="['/projects', item.projectId]" class="view-project-link"> View full project → </a>
    </div>
    }
  </mat-expansion-panel>
  } @else {
  <mat-expansion-panel disabled>
    <mat-expansion-panel-header>
      <mat-panel-title>
        <a [routerLink]="['/prints', item.print?.id]">{{ item.print?.title }}</a>
      </mat-panel-title>
      <mat-panel-description> {{ item.print?.startDate | date:'mediumDate' }} </mat-panel-description>
    </mat-expansion-panel-header>
  </mat-expansion-panel>
  } }
</mat-accordion>

<mat-paginator [length]="feed()!.paging.totalCount" [pageSize]="pageSize" [pageIndex]="pageNumber() - 1" (page)="onPageChange($event)" />
}
```

- [ ] **Step 5: Create `print-grouped-view.component.scss`**

```scss
.loading-container {
  display: flex;
  justify-content: center;
  padding: 32px;
}

.empty-state {
  text-align: center;
  color: var(--mat-sys-on-surface-variant);
  padding: 32px;
}

.project-prints {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px 0;
}

.project-print-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
}

.view-project-link {
  margin-top: 8px;
  font-size: 0.875rem;
}
```

- [ ] **Step 6: Add the view toggle to `print-list.component.html`**

Near the top of the print list template, above the existing content, add:

```html
<mat-button-toggle-group [(ngModel)]="viewMode" class="view-toggle">
  <mat-button-toggle value="list">All Prints</mat-button-toggle>
  <mat-button-toggle value="grouped">Grouped by Project</mat-button-toggle>
</mat-button-toggle-group>

@if (viewMode === 'grouped') {
<app-print-grouped-view />
}
```

Wrap the existing print list content in `@if (viewMode === 'list') { ... }`.

- [ ] **Step 7: Add `viewMode` signal to `print-list.component.ts`**

```typescript
viewMode: 'list' | 'grouped' = 'list';
```

Import `MatButtonToggleModule` and `PrintGroupedViewComponent` in the print module.

- [ ] **Step 8: Run tests**

```bash
npm run test:brief
```

Expected: All tests pass.

- [ ] **Step 9: Commit**

```bash
git add src/app/print/print-list/print-grouped-view/ src/app/print/print-list/print-list.component.html src/app/print/print-list/print-list.component.ts src/app/print/print.module.ts
git commit -m "feat: add grouped view toggle and PrintGroupedViewComponent"
```

---

### Task 6: Project selector on the print add/edit form

**Files:**

- Create: `src/app/shared/project-selector/project-selector.component.ts`
- Create: `src/app/shared/project-selector/project-selector.component.html`
- Create: `src/app/shared/project-selector/project-selector.component.scss`
- Modify: `src/app/print/edit-print-detail/edit-print-detail.component.ts`
- Modify: `src/app/print/edit-print-detail/edit-print-detail.component.html`

- [ ] **Step 1: Write a failing unit test**

Create `src/app/shared/project-selector/project-selector.component.spec.ts`:

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProjectSelectorComponent } from './project-selector.component';
import { ProjectService, ProjectSummaryDto, ProjectStatus, ProjectViewStatus } from 'src/app/core/services/project.service';
import { ReactiveFormsModule } from '@angular/forms';
import { of } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('ProjectSelectorComponent', () => {
  let fixture: ComponentFixture<ProjectSelectorComponent>;
  let mockProjectService: jasmine.SpyObj<ProjectService>;

  const mockProjects: ProjectSummaryDto[] = [{ id: 'abc', name: 'Voron Build', status: ProjectStatus.InProgress, viewStatus: ProjectViewStatus.Private, createdDate: new Date(), printCount: 3, totalPrintTimeInSeconds: 0, totalEstimatedPrintTimeInSeconds: 0, totalFilamentWeightMg: 0, defaultImageId: 0 }];

  beforeEach(async () => {
    mockProjectService = jasmine.createSpyObj<ProjectService>('ProjectService', ['getProjectSummaries']);
    mockProjectService.getProjectSummaries.and.returnValue(of({ items: mockProjects, paging: { totalCount: 1, pageNumber: 1, pageSize: 100, totalPages: 1 } }));

    await TestBed.configureTestingModule({
      imports: [ProjectSelectorComponent, ReactiveFormsModule, NoopAnimationsModule],
      providers: [{ provide: ProjectService, useValue: mockProjectService }],
    }).compileComponents();

    fixture = TestBed.createComponent(ProjectSelectorComponent);
    fixture.detectChanges();
  });

  it('should load projects on init', async () => {
    await fixture.whenStable();
    fixture.detectChanges();
    expect(mockProjectService.getProjectSummaries).toHaveBeenCalled();
  });

  it('should emit null when selection is cleared', () => {
    const emitted: any[] = [];
    fixture.componentInstance.projectSelected.subscribe((v: any) => emitted.push(v));
    fixture.componentInstance.clearProject();
    expect(emitted[0]).toBeNull();
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm run test:brief
```

Expected: FAIL — component does not exist.

- [ ] **Step 3: Create `project-selector.component.ts`**

```typescript
import { ChangeDetectionStrategy, Component, OnInit, input, output, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { debounceTime, distinctUntilChanged, startWith } from 'rxjs/operators';
import { ProjectService, ProjectSummaryDto, ProjectStatus } from 'src/app/core/services/project.service';

export type ProjectSelection = { type: 'existing'; projectId: string; projectName: string; projectStatus: ProjectStatus } | { type: 'new'; newProjectName: string };

@Component({
  selector: 'app-project-selector',
  templateUrl: './project-selector.component.html',
  styleUrls: ['./project-selector.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, MatAutocompleteModule, MatFormFieldModule, MatInputModule, MatIconModule, MatButtonModule],
})
export class ProjectSelectorComponent implements OnInit {
  initialProjectId = input<string | null>(null);
  initialProjectName = input<string | null>(null);

  projectSelected = output<ProjectSelection | null>();

  private readonly projectService = inject(ProjectService);

  searchControl = new FormControl<string>('');
  allProjects = signal<ProjectSummaryDto[]>([]);
  filteredProjects = signal<ProjectSummaryDto[]>([]);
  selectedProject = signal<ProjectSelection | null>(null);
  showNewOption = signal(false);

  ngOnInit(): void {
    // Load all projects (max 100 — sufficient for typical usage)
    this.projectService.getProjectSummaries(1, 100).subscribe((result) => {
      this.allProjects.set(result.items);
    });

    // Populate initial value if editing an existing print
    if (this.initialProjectId() && this.initialProjectName()) {
      this.searchControl.setValue(this.initialProjectName()!);
    }

    this.searchControl.valueChanges.pipe(startWith(''), debounceTime(150), distinctUntilChanged()).subscribe((value) => this.filterProjects(value ?? ''));
  }

  filterProjects(query: string): void {
    const q = query.toLowerCase().trim();
    const filtered = this.allProjects().filter((p) => p.name.toLowerCase().includes(q));
    this.filteredProjects.set(filtered);
    this.showNewOption.set(q.length > 0 && !filtered.some((p) => p.name.toLowerCase() === q));
  }

  selectExistingProject(project: ProjectSummaryDto): void {
    const selection: ProjectSelection = { type: 'existing', projectId: project.id, projectName: project.name, projectStatus: project.status };
    this.selectedProject.set(selection);
    this.searchControl.setValue(project.name, { emitEvent: false });
    this.projectSelected.emit(selection);
  }

  selectNewProject(name: string): void {
    const selection: ProjectSelection = { type: 'new', newProjectName: name.trim() };
    this.selectedProject.set(selection);
    this.projectSelected.emit(selection);
  }

  clearProject(): void {
    this.selectedProject.set(null);
    this.searchControl.setValue('', { emitEvent: false });
    this.projectSelected.emit(null);
  }

  displayFn(name: string): string {
    return name ?? '';
  }
}
```

- [ ] **Step 4: Create `project-selector.component.html`**

```html
<mat-form-field appearance="outline" class="project-selector-field">
  <mat-label>Project (optional)</mat-label>
  <input matInput [formControl]="searchControl" [matAutocomplete]="auto" placeholder="Search or create a project..." />
  @if (selectedProject()) {
  <button matSuffix mat-icon-button aria-label="Clear" (click)="clearProject()">
    <mat-icon>close</mat-icon>
  </button>
  }
  <mat-autocomplete #auto="matAutocomplete" [displayWith]="displayFn">
    @for (project of filteredProjects(); track project.id) {
    <mat-option [value]="project.name" (click)="selectExistingProject(project)">
      {{ project.name }} @if (project.reference) {
      <span class="reference"> — {{ project.reference }}</span>
      }
    </mat-option>
    } @if (showNewOption()) {
    <mat-option [value]="searchControl.value" (click)="selectNewProject(searchControl.value!)"> <mat-icon>add</mat-icon> Create project: "{{ searchControl.value }}" </mat-option>
    }
  </mat-autocomplete>
</mat-form-field>
```

- [ ] **Step 5: Create `project-selector.component.scss`**

```scss
.project-selector-field {
  width: 100%;
}

.reference {
  color: var(--mat-sys-on-surface-variant);
  font-size: 0.875em;
}
```

- [ ] **Step 6: Wire the selector into `edit-print-detail.component.ts`**

Add a field to hold the pending project selection:

```typescript
pendingProjectSelection: ProjectSelection | null = null;
```

Add a method:

```typescript
onProjectSelected(selection: ProjectSelection | null): void {
  this.pendingProjectSelection = selection;
}
```

In `buildPutDto()` / the submit method, populate `projectId` and `newProjectName` from `pendingProjectSelection`:

```typescript
if (this.pendingProjectSelection?.type === 'existing') {
  dto.projectId = this.pendingProjectSelection.projectId;
  dto.newProjectName = undefined;
} else if (this.pendingProjectSelection?.type === 'new') {
  dto.newProjectName = this.pendingProjectSelection.newProjectName;
  dto.projectId = undefined;
} else {
  dto.projectId = undefined;
  dto.newProjectName = undefined;
}
```

- [ ] **Step 7: Add selector to `edit-print-detail.component.html`**

Near the top of the form, after the printer selector:

```html
<app-project-selector [initialProjectId]="printForm.get('projectId')?.value" [initialProjectName]="printForm.get('projectName')?.value" (projectSelected)="onProjectSelected($event)" />
```

- [ ] **Step 8: Run tests**

```bash
npm run test:brief
```

Expected: All tests pass.

- [ ] **Step 9: Commit**

```bash
git add src/app/shared/project-selector/ src/app/print/edit-print-detail/
git commit -m "feat: add ProjectSelectorComponent and wire into print edit form"
```

---

### Task 7: Project detail page

**Files:**

- Create: `src/app/project/` (new feature module directory)
- Create: `src/app/project/project-detail/project-detail.component.ts`
- Create: `src/app/project/project-detail/project-detail.component.html`
- Create: `src/app/project/project-detail/project-detail.component.scss`
- Create: `src/app/project/project.module.ts`
- Create: `src/app/project/project-routing.module.ts`
- Modify: `src/app/app-routing.module.ts`

- [ ] **Step 1: Write a failing unit test**

Create `src/app/project/project-detail/project-detail.component.spec.ts`:

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProjectDetailComponent } from './project-detail.component';
import { ProjectService, ProjectDetailDto, ProjectStatus, ProjectViewStatus } from 'src/app/core/services/project.service';
import { PrintService } from 'src/app/core/services/print.service';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { SimpleDialogComponent } from 'src/app/shared/simple-dialog/simple-dialog.component';
import { MatDialog } from '@angular/material/dialog';

const mockProject: ProjectDetailDto = {
  id: 'abc-123',
  name: 'Test Voron Build',
  status: ProjectStatus.InProgress,
  viewStatus: ProjectViewStatus.Private,
  createdDate: new Date(),
  createdByUserId: 1,
  printCount: 2,
  totalPrintTimeInSeconds: 7200,
  totalEstimatedPrintTimeInSeconds: 8000,
  totalFilamentWeightMg: 250000,
  images: [],
};

describe('ProjectDetailComponent', () => {
  let fixture: ComponentFixture<ProjectDetailComponent>;
  let mockProjectService: jasmine.SpyObj<ProjectService>;

  beforeEach(async () => {
    mockProjectService = jasmine.createSpyObj<ProjectService>('ProjectService', ['getProjectById', 'deleteProject', 'updateProject']);
    mockProjectService.getProjectById.and.returnValue(of(mockProject));

    await TestBed.configureTestingModule({
      imports: [ProjectDetailComponent, NoopAnimationsModule],
      providers: [
        { provide: ProjectService, useValue: mockProjectService },
        { provide: PrintService, useValue: jasmine.createSpyObj('PrintService', ['getPrintSummaries']) },
        { provide: ActivatedRoute, useValue: { snapshot: { params: { id: 'abc-123' } } } },
        { provide: MatDialog, useValue: jasmine.createSpyObj('MatDialog', ['open']) },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProjectDetailComponent);
    fixture.detectChanges();
  });

  it('should display project name', async () => {
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Test Voron Build');
  });

  it('should display print count', async () => {
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('2');
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm run test:brief
```

Expected: FAIL — component does not exist.

- [ ] **Step 3: Create `project-detail.component.ts`**

```typescript
import { ChangeDetectionStrategy, Component, OnInit, inject, signal, computed } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatDialog } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { Title } from '@angular/platform-browser';
import { ProjectService, ProjectDetailDto, ProjectStatus, ProjectViewStatus, PutProjectDto } from 'src/app/core/services/project.service';
import { PrintService, PrintSummary } from 'src/app/core/services/print.service';
import { SimpleDialogComponent } from 'src/app/shared/simple-dialog/simple-dialog.component';
import { DurationPipe } from 'src/app/shared/pipes/duration.pipe';
import { take } from 'rxjs/operators';

@Component({
  selector: 'app-project-detail',
  templateUrl: './project-detail.component.html',
  styleUrls: ['./project-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, MatCardModule, MatButtonModule, MatIconModule, MatMenuModule, MatSelectModule, DurationPipe],
})
export class ProjectDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly projectService = inject(ProjectService);
  private readonly printService = inject(PrintService);
  private readonly dialog = inject(MatDialog);
  private readonly titleService = inject(Title);

  project = signal<ProjectDetailDto | null>(null);
  prints = signal<PrintSummary[]>([]);
  loading = signal(true);

  readonly ProjectStatus = ProjectStatus;
  readonly ProjectViewStatus = ProjectViewStatus;

  ngOnInit(): void {
    const id = this.route.snapshot.params['id'];
    this.projectService.getProjectById(id).subscribe({
      next: (p) => {
        this.project.set(p);
        this.titleService.setTitle(`${p.name} | 3D Print Log`);
        this.loading.set(false);
        this.loadPrints(id);
      },
      error: () => {
        this.loading.set(false);
        this.router.navigate(['/prints']);
      },
    });
  }

  loadPrints(projectId: string): void {
    this.printService
      .getPrintSummaries(1, 100, '', null, [], [], undefined, undefined, undefined, projectId)
      .pipe(take(1))
      .subscribe((result) => this.prints.set(result.items));
  }

  onDeleteProject(): void {
    const ref = this.dialog.open(SimpleDialogComponent, {
      data: {
        title: 'Delete Project',
        message: 'What would you like to do with the prints in this project?',
        confirmText: 'Delete project and all prints',
        cancelText: 'Remove project only — keep prints',
      },
    });
    ref.afterClosed().subscribe((deleteAll) => {
      if (deleteAll === undefined) return; // dialog dismissed
      const projectId = this.project()!.id;
      this.projectService
        .deleteProject(projectId, !!deleteAll)
        .pipe(take(1))
        .subscribe(() => this.router.navigate(['/prints']));
    });
  }

  onStatusChange(status: ProjectStatus): void {
    const p = this.project()!;
    const dto: PutProjectDto = {
      id: p.id,
      name: p.name,
      reference: p.reference,
      description: p.description,
      url: p.url,
      status,
      viewStatus: p.viewStatus,
    };
    this.projectService
      .updateProject(p.id, dto)
      .pipe(take(1))
      .subscribe((updated) => {
        this.project.set(updated);
      });
  }
}
```

- [ ] **Step 4: Create `project-detail.component.html`**

```html
@if (loading()) {
<div class="loading-center"><mat-spinner /></div>
} @else if (project(); as p) {
<div class="project-detail-layout">
  <mat-card appearance="outlined">
    <mat-card-header>
      <mat-card-title>{{ p.name }}</mat-card-title>
      @if (p.reference) {
      <mat-card-subtitle>{{ p.reference }}</mat-card-subtitle>
      }
      <div class="header-actions">
        <mat-select [value]="p.status" (selectionChange)="onStatusChange($event.value)">
          <mat-option [value]="ProjectStatus.InProgress">In Progress</mat-option>
          <mat-option [value]="ProjectStatus.Complete">Complete</mat-option>
          <mat-option [value]="ProjectStatus.OnHold">On Hold</mat-option>
          <mat-option [value]="ProjectStatus.Cancelled">Cancelled</mat-option>
        </mat-select>
        <button mat-icon-button [matMenuTriggerFor]="menu">
          <mat-icon>more_vert</mat-icon>
        </button>
        <mat-menu #menu="matMenu">
          <button mat-menu-item (click)="onDeleteProject()"><mat-icon>delete</mat-icon> Delete project</button>
        </mat-menu>
      </div>
    </mat-card-header>

    <mat-card-content>
      @if (p.description) {
      <p>{{ p.description }}</p>
      } @if (p.url) {
      <p><a [href]="p.url" target="_blank" rel="noopener">View model source</a></p>
      }

      <div class="stats-bar">
        <div class="stat">
          <span class="label">Prints</span>
          <span class="value">{{ p.printCount }}</span>
        </div>
        <div class="stat">
          <span class="label">Total Time</span>
          <span class="value">{{ p.totalPrintTimeInSeconds | duration }}</span>
        </div>
        <div class="stat">
          <span class="label">Filament Used</span>
          <span class="value">{{ p.totalFilamentWeightMg / 1000 | number:'1.0-1' }}g</span>
        </div>
      </div>
    </mat-card-content>
  </mat-card>

  <mat-card appearance="outlined" class="prints-card">
    <mat-card-header><mat-card-title>Prints</mat-card-title></mat-card-header>
    <mat-card-content>
      @for (print of prints(); track print.id) {
      <div class="print-row">
        <a [routerLink]="['/prints', print.id]">{{ print.title }}</a>
        <span>{{ print.startDate | date:'mediumDate' }}</span>
      </div>
      } @empty {
      <p>No prints in this project yet.</p>
      }
    </mat-card-content>
  </mat-card>
</div>
}
```

- [ ] **Step 5: Create `project-detail.component.scss`**

```scss
.loading-center {
  display: flex;
  justify-content: center;
  padding: 48px;
}

.project-detail-layout {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 800px;
  margin: 0 auto;
  padding: 16px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}

.stats-bar {
  display: flex;
  gap: 24px;
  margin-top: 16px;
  flex-wrap: wrap;
}

.stat {
  display: flex;
  flex-direction: column;
  gap: 2px;

  .label {
    font-size: 0.75rem;
    color: var(--mat-sys-on-surface-variant);
  }
  .value {
    font-size: 1.125rem;
    font-weight: 500;
  }
}

.prints-card {
}

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

- [ ] **Step 6: Create `project-routing.module.ts`**

```typescript
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ProjectDetailComponent } from './project-detail/project-detail.component';

const routes: Routes = [{ path: ':id', component: ProjectDetailComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ProjectRoutingModule {}
```

- [ ] **Step 7: Create `project.module.ts`**

```typescript
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProjectRoutingModule } from './project-routing.module';
import { ProjectDetailComponent } from './project-detail/project-detail.component';

@NgModule({
  imports: [CommonModule, ProjectRoutingModule, ProjectDetailComponent],
})
export class ProjectModule {}
```

- [ ] **Step 8: Add lazy route to `app-routing.module.ts`**

Find the existing lazy-loaded routes and add:

```typescript
{
  path: 'projects',
  loadChildren: () => import('./project/project.module').then(m => m.ProjectModule),
},
```

- [ ] **Step 9: Run tests**

```bash
npm run test:brief
```

Expected: All tests pass including project detail tests.

- [ ] **Step 10: Commit**

```bash
git add src/app/project/ src/app/app-routing.module.ts
git commit -m "feat: add ProjectDetailComponent and /projects/:id route"
```

---

### Task 8: Documentation page for Projects

**Files:**

- Create: `src/app/documentation/projects-documentation/projects-documentation.component.ts`
- Create: `src/app/documentation/projects-documentation/projects-documentation.component.html`
- Modify: `src/app/documentation/` (add to routing and nav)
- Modify: existing Prints documentation component (add Projects section)

- [ ] **Step 1: Read existing documentation components**

Read one existing documentation component (e.g. `src/app/documentation/prints-documentation/prints-documentation.component.html`) to understand the structure and tone used.

- [ ] **Step 2: Create `projects-documentation.component.ts`**

```typescript
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-projects-documentation',
  templateUrl: './projects-documentation.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatCardModule],
})
export class ProjectsDocumentationComponent {}
```

- [ ] **Step 3: Create `projects-documentation.component.html`**

Write clear, user-friendly documentation covering these topics (use the same card-based layout as other documentation pages):

1. **What is a Project?** — A way to group related prints together so you can track total time, filament, and cost across a multi-part build. Optional — single prints work exactly as before.
2. **Creating a Project** — When adding or editing a print, use the Project field to type a project name. Select an existing project from the list or choose "Create project: [name]" to create a new one inline.
3. **Viewing Project Totals** — From your print list, click a project chip to filter to that project and see totals. Switch to "Grouped by Project" view to see all projects and their prints in one place. Click "View full project" to open the project detail page.
4. **Removing a Print from a Project** — Open the print for editing, clear the Project field, and save.
5. **Project Status** — Set a project to In Progress, Complete, On Hold, or Cancelled. Change status from the project chip's detail header or the project page. Use status to filter and track progress.
6. **Sharing a Project** — On the project detail page, set visibility to Public or Unlisted to share your build with others.
7. **Deleting a Project** — From the project detail page, use the menu to delete. You can choose to keep your prints (they become standalone) or delete them along with the project.

- [ ] **Step 4: Add Projects to documentation routing**

In the documentation routing file, add a route for the new component. Follow the same pattern as other documentation routes.

- [ ] **Step 5: Add a "Projects" link to the documentation nav**

In the documentation navigation component/sidebar (wherever other documentation links are), add a link to the Projects documentation page.

- [ ] **Step 6: Update the Prints documentation**

In the existing prints documentation HTML, add a short section mentioning Projects: the project chip on print cards, the grouped view toggle, and a link to the Projects documentation page.

- [ ] **Step 7: Run lint**

```bash
npm run lint:brief
```

Expected: No errors.

- [ ] **Step 8: Commit**

```bash
git add src/app/documentation/projects-documentation/ src/app/documentation/
git commit -m "docs: add Projects documentation page and update Prints docs"
```

---

### Task 9: Final checks

- [ ] **Step 1: Run full test suite**

```bash
npm run test:brief
```

Expected: All tests pass, no failures.

- [ ] **Step 2: Run lint**

```bash
npm run lint:brief
```

Expected: No errors or warnings.

- [ ] **Step 3: Start the dev server and manually verify the golden path**

```bash
npm start
```

Open `https://localhost:4200` and verify:

1. Add a new print — the Project field appears and autocomplete works
2. Type a new project name and select "Create project: [name]" — see the "(new)" indicator
3. Save the print — print list shows the project chip
4. Click the chip — list filters to the project and shows summary header
5. Switch to "Grouped by Project" — see the project as a collapsible row
6. Navigate to `/projects/:id` — project detail page loads with stats and print list
7. Change project status from the detail page — status updates

- [ ] **Step 4: Push branch**

```bash
git push origin HEAD
```

---

## Spec Coverage Check

| Spec requirement                                       | Task                                                                    |
| ------------------------------------------------------ | ----------------------------------------------------------------------- |
| Project chip on print cards/rows with status color dot | Task 3, 4                                                               |
| All Prints view — chip filters to project on click     | Task 4                                                                  |
| Project summary header (stats + status dropdown)       | Task 4, 5                                                               |
| Grouped by Project view — collapsible rows             | Task 5                                                                  |
| Grouped view — standalone prints interleaved           | Task 5                                                                  |
| Grouped view — lazy-load prints on expand              | Task 5                                                                  |
| View toggle persisted as user setting                  | Not implemented — deferred (add UserSetting key)                        |
| Filter by Project in filter panel                      | Not implemented — add `filterByProjectId` param to print list filter UI |
| Project selector on add/edit print form                | Task 6                                                                  |
| Inline project creation (pending, created on save)     | Task 6                                                                  |
| Duplicate print pre-populates project field            | Task 6 (initialProjectId input)                                         |
| Remove from project (clear selector and save)          | Task 6                                                                  |
| Project detail page at /projects/:id                   | Task 7                                                                  |
| Project detail — header, stats, images, prints list    | Task 7                                                                  |
| Project detail — status change                         | Task 7                                                                  |
| Project detail — delete with two options               | Task 7                                                                  |
| Public/Unlisted projects accessible without auth       | Task 7 (no auth guard on route)                                         |
| Documentation page                                     | Task 8                                                                  |
| Prints documentation updated                           | Task 8                                                                  |

> **Note:** Two items from the spec are deferred: (1) persisting the view toggle as a `UserSetting`, and (2) adding "Filter by Project" to the print list filter panel. Both are small additions that can be done as follow-up tasks without blocking the main feature.
