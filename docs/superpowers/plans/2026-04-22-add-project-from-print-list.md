# Add a Project from Print List — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add "Add a Project" to the Print List dropdown, navigating to `/projects/new` which renders `ProjectDetailComponent` in inline create mode — edit form pre-populated, images supported, saves via POST and navigates to the new project.

**Architecture:** A `/projects/new` route re-uses `ProjectDetailComponent` with a synthetic empty `ProjectDetailDto` (id `''`). A computed `isCreating` signal gates create vs update logic throughout. `onSave()` delegates to a new `onCreate()` (calls `createProject`, uploads images, navigates) or the extracted `onUpdate()` (existing PUT logic, unchanged).

**Tech Stack:** Angular 20, Angular Material, RxJS, Jasmine/Karma

---

## Files Modified

| File                                                              | Change                                                                                                                                                        |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/app/project/project-routing.module.ts`                       | Add `{ path: 'new', ... }` before `{ path: ':id', ... }`                                                                                                      |
| `src/app/print/print-list/print-list.component.ts`                | Add `navigateToNewProject()` method                                                                                                                           |
| `src/app/print/print-list/print-list.component.html`              | Add "Add a Project" menu item                                                                                                                                 |
| `src/app/print/print-list/print-list.component.spec.ts`           | Add test for `navigateToNewProject()`                                                                                                                         |
| `src/app/project/project-detail/project-detail.component.ts`      | Add `isCreating`, `emptyProject()`, branch `ngOnInit`, update `onCancelEdit()`, refactor `onSave()` → `onUpdate()` + add `onCreate()`, import `AddProjectDto` |
| `src/app/project/project-detail/project-detail.component.html`    | Wrap status selector and prints card in `@if (!isCreating())`                                                                                                 |
| `src/app/project/project-detail/project-detail.component.spec.ts` | Add create-mode describe block                                                                                                                                |

---

## Task 1: PrintListComponent — add handler and menu item

**Files:**

- Modify: `src/app/print/print-list/print-list.component.spec.ts`
- Modify: `src/app/print/print-list/print-list.component.ts`
- Modify: `src/app/print/print-list/print-list.component.html`

- [ ] **Step 1.1: Write the failing test**

Open `src/app/print/print-list/print-list.component.spec.ts`. After the last `it(...)` block and before the closing `});` of the top-level `describe`, add:

```typescript
it('should navigate to /projects/new when navigateToNewProject is called', () => {
  fixture.detectChanges();
  const router = TestBed.inject(Router);
  const navigateSpy = spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
  component.navigateToNewProject();
  expect(navigateSpy).toHaveBeenCalledWith(['/projects', 'new']);
});
```

`Router` is already importable via `@angular/router` — it's already imported in the spec file.

- [ ] **Step 1.2: Run test to verify it fails**

```bash
npm run test:brief
```

Expected: FAIL — `component.navigateToNewProject is not a function`

- [ ] **Step 1.3: Add `navigateToNewProject()` to the component**

Open `src/app/print/print-list/print-list.component.ts`. After the `searchFilament()` method and before the closing `}` of the class, add:

```typescript
public navigateToNewProject(): void {
  this.router.navigate(['/projects', 'new']);
}
```

`this.router` is already injected in the constructor as `private router: Router`.

- [ ] **Step 1.4: Add the menu item to the template**

Open `src/app/print/print-list/print-list.component.html`. Find the `<mat-menu #printAddOptions="matMenu">` block (around line 27). It currently contains one item. Add a second item after it:

```html
<mat-menu #printAddOptions="matMenu">
  <button mat-menu-item color="accent" (click)="gcodeInput.click()">Add Print From Gcode</button>
  <button mat-menu-item (click)="navigateToNewProject()">Add a Project</button>
</mat-menu>
```

- [ ] **Step 1.5: Run tests to verify they pass**

```bash
npm run test:brief
```

Expected: all tests pass

- [ ] **Step 1.6: Commit**

```bash
git add src/app/print/print-list/print-list.component.ts \
        src/app/print/print-list/print-list.component.html \
        src/app/print/print-list/print-list.component.spec.ts
git commit -m "feat: add 'Add a Project' option to Print List dropdown menu"
```

---

## Task 2: Add `/projects/new` route

**Files:**

- Modify: `src/app/project/project-routing.module.ts`

- [ ] **Step 2.1: Add the route**

Open `src/app/project/project-routing.module.ts`. Replace the routes array so `new` comes before `:id`:

```typescript
const routes: Routes = [
  { path: 'new', component: ProjectDetailComponent },
  { path: ':id', component: ProjectDetailComponent },
];
```

`new` must be first — Angular matches routes in order and `:id` would otherwise swallow the literal string `new`.

- [ ] **Step 2.2: Run tests to confirm nothing broke**

```bash
npm run test:brief
```

Expected: all tests pass

- [ ] **Step 2.3: Commit**

```bash
git add src/app/project/project-routing.module.ts
git commit -m "feat: add /projects/new route to project routing module"
```

---

## Task 3: `ProjectDetailComponent` — `isCreating` + `ngOnInit` create mode

**Files:**

- Modify: `src/app/project/project-detail/project-detail.component.spec.ts`
- Modify: `src/app/project/project-detail/project-detail.component.ts`

- [ ] **Step 3.1: Write the failing tests**

Open `src/app/project/project-detail/project-detail.component.spec.ts`. Add these imports at the top of the file (after existing imports):

```typescript
import { Router } from '@angular/router';
import { provideRouter } from '@angular/router';
```

Then, after the closing `});` of the existing top-level `describe('ProjectDetailComponent', ...)` block, add a new describe block:

```typescript
describe('ProjectDetailComponent — create mode (id === "new")', () => {
  let fixture: ComponentFixture<ProjectDetailComponent>;
  let component: ProjectDetailComponent;
  let mockProjectService: jasmine.SpyObj<ProjectService>;

  beforeEach(async () => {
    mockProjectService = jasmine.createSpyObj<ProjectService>('ProjectService', ['getProjectById', 'createProject', 'deleteProject', 'updateProject', 'uploadImage', 'deleteImage', 'reorderImages', 'setDefaultImage']);
    mockProjectService.createProject.and.returnValue(of({ ...mockProject, id: 'new-guid-123' }));

    const mockPrintService = jasmine.createSpyObj('PrintService', ['getPrintSummaries', 'deletePrint', 'updatePrintStatus']);
    mockPrintService.getPrintSummaries.and.returnValue(
      of({
        items: [],
        paging: { totalCount: 0, currentPage: 1, pageSize: 100, totalPages: 0 },
      })
    );

    const currentUserSubject = new BehaviorSubject({ id: 1 });
    const mockAuthService = {
      userProfile$: currentUserSubject.asObservable(),
    };

    await TestBed.configureTestingModule({
      imports: [ProjectDetailComponent, NoopAnimationsModule],
      providers: [
        { provide: ProjectService, useValue: mockProjectService },
        { provide: PrintService, useValue: mockPrintService },
        { provide: AuthService, useValue: mockAuthService },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { params: { id: 'new' } } },
        },
        {
          provide: MatDialog,
          useValue: jasmine.createSpyObj('MatDialog', ['open']),
        },
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProjectDetailComponent);
    fixture.detectChanges();
    component = fixture.componentInstance;
  });

  it('should not call getProjectById', () => {
    expect(mockProjectService.getProjectById).not.toHaveBeenCalled();
  });

  it('should be in editing mode immediately', () => {
    expect(component.isEditing()).toBe(true);
  });

  it('isCreating should be true', () => {
    expect(component.isCreating()).toBe(true);
  });

  it('should not be loading', () => {
    expect(component.loading()).toBe(false);
  });
});
```

Note: `mockProject`, `BehaviorSubject`, `of`, `provideHttpClient`, `provideHttpClientTesting` are all already defined/imported earlier in the file.

- [ ] **Step 3.2: Run tests to verify they fail**

```bash
npm run test:brief
```

Expected: FAIL — `component.isCreating is not a function` (or similar)

- [ ] **Step 3.3: Add `isCreating`, `emptyProject()`, and `ngOnInit` branching to the component**

Open `src/app/project/project-detail/project-detail.component.ts`.

**3.3a — Add `isCreating` signal** after the `selectedImageIndex` signal declaration (around line 94):

```typescript
readonly isCreating = computed(() => this.project()?.id === '');
```

**3.3b — Add `emptyProject()` private helper** before `ngOnInit`:

```typescript
private emptyProject(): ProjectDetailDto {
  return {
    id: '',
    name: '',
    status: ProjectStatus.InProgress,
    viewStatus: ProjectViewStatus.Private,
    createdDate: new Date(),
    createdByUserId: 0,
    printCount: 0,
    totalPrintTimeInSeconds: 0,
    totalEstimatedPrintTimeInSeconds: 0,
    totalFilamentWeightMg: 0,
    images: [],
  };
}
```

**3.3c — Replace the body of `ngOnInit`** with branching logic. The current `ngOnInit` body starts at `const id = this.route.snapshot.params['id'];`. Replace everything from there through the closing `});` of the `projectService.getProjectById` subscription with:

```typescript
ngOnInit(): void {
  this.authService.userProfile$
    .pipe(takeUntilDestroyed(this.destroyRef))
    .subscribe((user) => this.currentUserId.set(user?.id ?? null));

  const id = this.route.snapshot.params['id'];

  if (id === 'new') {
    this.project.set(this.emptyProject());
    this.titleService.setTitle('New Project | 3D Print Log');
    this.loading.set(false);
    this.isEditing.set(true);
  } else {
    this.projectService
      .getProjectById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (p) => {
          this.project.set(p);
          this.titleService.setTitle(`${p.name} | 3D Print Log`);
          this.loading.set(false);
          this.loadPrints(id);
          this.preloadImages(
            id,
            p.images.map((i) => i.id)
          );
        },
        error: () => {
          this.loading.set(false);
          this.router.navigate(['/prints']);
        },
      });
  }
}
```

- [ ] **Step 3.4: Run tests to verify they pass**

```bash
npm run test:brief
```

Expected: all tests pass (including the 4 new create-mode tests)

- [ ] **Step 3.5: Commit**

```bash
git add src/app/project/project-detail/project-detail.component.ts \
        src/app/project/project-detail/project-detail.component.spec.ts
git commit -m "feat: add isCreating signal and create-mode init to ProjectDetailComponent"
```

---

## Task 4: `onCancelEdit()` — navigate to `/prints` in create mode

**Files:**

- Modify: `src/app/project/project-detail/project-detail.component.spec.ts`
- Modify: `src/app/project/project-detail/project-detail.component.ts`

- [ ] **Step 4.1: Write the failing test**

In the create-mode describe block added in Task 3, add a new test (inside the same `describe` block, after the `should not be loading` test):

```typescript
it('should navigate to /prints when onCancelEdit is called in create mode', () => {
  const router = TestBed.inject(Router);
  const navigateSpy = spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
  component.onCancelEdit();
  expect(navigateSpy).toHaveBeenCalledWith(['/prints']);
});
```

- [ ] **Step 4.2: Run test to verify it fails**

```bash
npm run test:brief
```

Expected: FAIL — navigate called with wrong args or not called

- [ ] **Step 4.3: Update `onCancelEdit()` in the component**

In `project-detail.component.ts`, replace the current `onCancelEdit()` method with:

```typescript
onCancelEdit(): void {
  if (this.isCreating()) {
    this.router.navigate(['/prints']);
    return;
  }
  this.isEditing.set(false);
  this.images.set([]);
  this.imageIdsToDelete = [];
  this.loggingService.logEvent('ProjectDetail_EditCancelled');
}
```

- [ ] **Step 4.4: Run tests to verify they pass**

```bash
npm run test:brief
```

Expected: all tests pass

- [ ] **Step 4.5: Commit**

```bash
git add src/app/project/project-detail/project-detail.component.ts \
        src/app/project/project-detail/project-detail.component.spec.ts
git commit -m "feat: navigate to /prints when cancelling project creation"
```

---

## Task 5: `onCreate()` + refactor `onSave()` → `onUpdate()`

This is the largest task. It refactors `onSave()` into two private methods and adds the create POST path.

**Files:**

- Modify: `src/app/project/project-detail/project-detail.component.spec.ts`
- Modify: `src/app/project/project-detail/project-detail.component.ts`

- [ ] **Step 5.1: Write failing tests for `onCreate()`**

In the create-mode describe block in `project-detail.component.spec.ts`, add two more tests:

```typescript
it('should call createProject with form values on save', async () => {
  mockProjectService.reorderImages.and.returnValue(of(void 0));

  component.onSave({
    name: 'My New Project',
    reference: '',
    description: '',
    url: '',
    viewStatus: ProjectViewStatus.Private,
  });

  await fixture.whenStable();

  expect(mockProjectService.createProject).toHaveBeenCalledWith(
    jasmine.objectContaining({
      name: 'My New Project',
      status: ProjectStatus.InProgress,
      viewStatus: ProjectViewStatus.Private,
    })
  );
});

it('should navigate to the new project after successful creation', async () => {
  const router = TestBed.inject(Router);
  const navigateSpy = spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
  mockProjectService.reorderImages.and.returnValue(of(void 0));

  component.onSave({
    name: 'My New Project',
    reference: '',
    description: '',
    url: '',
    viewStatus: ProjectViewStatus.Private,
  });

  await fixture.whenStable();

  expect(navigateSpy).toHaveBeenCalledWith(['/projects', 'new-guid-123']);
});
```

Also add `ProjectViewStatus` to the imports at the top of the file if not already present — it is already imported via the existing `mockProject` setup.

- [ ] **Step 5.2: Run tests to verify they fail**

```bash
npm run test:brief
```

Expected: FAIL — `createProject` not called, navigation not triggered

- [ ] **Step 5.3: Add `AddProjectDto` to the import in the component**

In `project-detail.component.ts`, find the import from `project.service` and add `AddProjectDto`:

```typescript
import { ProjectService, ProjectDetailDto, ProjectImageDto, ProjectImageValue, ProjectEditFormValue, ProjectStatus, ProjectViewStatus, AddProjectDto, PutProjectDto } from 'src/app/core/services/project.service';
```

- [ ] **Step 5.4: Refactor `onSave()` and add `onCreate()` / `onUpdate()`**

In `project-detail.component.ts`, replace the current `onSave()` method with these three methods:

```typescript
onSave(formValue: ProjectEditFormValue): void {
  if (this.isCreating()) {
    this.onCreate(formValue);
  } else {
    this.onUpdate(formValue);
  }
}

private onCreate(formValue: ProjectEditFormValue): void {
  const dto: AddProjectDto = {
    name: formValue.name,
    reference: formValue.reference || undefined,
    description: formValue.description || undefined,
    url: formValue.url || undefined,
    status: ProjectStatus.InProgress,
    viewStatus: formValue.viewStatus,
  };

  const stagedImages = [...this.images()].sort(
    (a, b) => a.displayOrder - b.displayOrder
  );

  this.isSaving.set(true);
  let createdId: string;
  let uploadedIds: number[] = [];

  this.projectService
    .createProject(dto)
    .pipe(
      mergeMap((created) => {
        createdId = created.id;
        return stagedImages.length === 0
          ? of([] as ProjectImageDto[])
          : concat(
              ...stagedImages.map((img) =>
                this.projectService.uploadImage(createdId, img.file!)
              )
            ).pipe(toArray());
      }),
      mergeMap((uploadResults: ProjectImageDto[]) => {
        uploadedIds = uploadResults.map((r) => r.id);
        const defaultImage = stagedImages.find((img) => img.isDefault);
        if (!defaultImage) return of(null);
        const defaultIdx = stagedImages.indexOf(defaultImage);
        const defaultId = uploadedIds[defaultIdx];
        return defaultId
          ? this.projectService.setDefaultImage(createdId, defaultId)
          : of(null);
      }),
      mergeMap(() =>
        uploadedIds.length === 0
          ? of(null)
          : this.projectService.reorderImages(createdId, uploadedIds)
      ),
      take(1)
    )
    .subscribe({
      next: () => {
        this.isSaving.set(false);
        this.loggingService.logEvent('ProjectDetail_Created', {
          hasImages: stagedImages.length > 0,
        });
        this.router.navigate(['/projects', createdId]);
      },
      error: () => {
        this.isSaving.set(false);
      },
    });
}

private onUpdate(formValue: ProjectEditFormValue): void {
  const p = this.project()!;
  const dto: PutProjectDto = {
    id: p.id,
    name: formValue.name,
    reference: formValue.reference || undefined,
    description: formValue.description || undefined,
    url: formValue.url || undefined,
    status: p.status,
    viewStatus: formValue.viewStatus,
  };

  const snapshot = this.images();
  const newImages = snapshot
    .filter((img) => !img.id)
    .sort((a, b) => a.displayOrder - b.displayOrder);
  const existingImages = snapshot.filter((img) => !!img.id);
  const defaultImage = snapshot.find((img) => img.isDefault);
  const idsToDelete = [...this.imageIdsToDelete];

  this.isSaving.set(true);

  let uploadedIds: number[] = [];

  const upload$ =
    newImages.length === 0
      ? of([] as ProjectImageDto[])
      : concat(
          ...newImages.map((img) =>
            this.projectService.uploadImage(p.id, img.file!)
          )
        ).pipe(toArray());

  this.projectService
    .updateProject(p.id, dto)
    .pipe(
      mergeMap(() => upload$),
      mergeMap((uploadResults: ProjectImageDto[]) => {
        uploadedIds = uploadResults.map((r) => r.id);

        let defaultId: number | null = defaultImage?.id ?? null;
        if (!defaultId) {
          const newDefaultIdx = newImages.findIndex((img) => img.isDefault);
          if (newDefaultIdx >= 0)
            defaultId = uploadedIds[newDefaultIdx] ?? null;
        }
        const defaultChanged =
          defaultId !== null && defaultId !== this.defaultImageIdOnLoad;

        return defaultChanged && defaultId
          ? this.projectService.setDefaultImage(p.id, defaultId)
          : of(null);
      }),
      mergeMap(() =>
        idsToDelete.length === 0
          ? of(null)
          : forkJoin(
              idsToDelete.map((id) =>
                this.projectService.deleteImage(p.id, id)
              )
            )
      ),
      mergeMap(() => {
        const existingOrdered = existingImages
          .filter((img) => !idsToDelete.includes(img.id!))
          .map((img) => ({ id: img.id!, displayOrder: img.displayOrder }));

        const newOrdered = newImages
          .map((img, i) => ({
            id: uploadedIds[i],
            displayOrder: img.displayOrder,
          }))
          .filter((x) => x.id !== undefined) as {
          id: number;
          displayOrder: number;
        }[];

        const orderedIds = [...existingOrdered, ...newOrdered]
          .sort((a, b) => a.displayOrder - b.displayOrder)
          .map((x) => x.id);

        return orderedIds.length === 0
          ? of(null)
          : this.projectService.reorderImages(p.id, orderedIds);
      }),
      mergeMap(() => this.projectService.getProjectById(p.id)),
      take(1)
    )
    .subscribe({
      next: (updated) => {
        this.project.set(updated);
        this.isEditing.set(false);
        this.isSaving.set(false);
        this.images.set([]);
        this.imageIdsToDelete = [];
        this.preloadImages(
          p.id,
          updated.images.map((i) => i.id)
        );
        this.loggingService.logEvent('ProjectDetail_Saved', {
          hasNewImages: newImages.length > 0,
          deletedImageCount: idsToDelete.length,
          reordered: snapshot.length > 1,
        });
      },
      error: () => {
        this.isSaving.set(false);
      },
    });
}
```

- [ ] **Step 5.5: Run tests to verify they pass**

```bash
npm run test:brief
```

Expected: all tests pass. The existing `'should call updateProject and re-fetch project on save'` test must still pass — it creates the component with `id: 'abc-123'` so `isCreating()` is false and `onUpdate()` runs.

- [ ] **Step 5.6: Commit**

```bash
git add src/app/project/project-detail/project-detail.component.ts \
        src/app/project/project-detail/project-detail.component.spec.ts
git commit -m "feat: add onCreate() and refactor onSave() into create/update branches"
```

---

## Task 6: Template — hide status selector and prints card in create mode

**Files:**

- Modify: `src/app/project/project-detail/project-detail.component.html`

No new tests — the existing DOM tests (viewing project name, print count, edit button) all run with `id: 'abc-123'` so `isCreating()` is false and these elements remain visible. The create-mode tests already verify `isEditing()` is true, which implicitly confirms the edit form renders.

- [ ] **Step 6.1: Wrap the status selector**

In `project-detail.component.html`, find the `<mat-select [value]="p.status" ...>` block (lines ~14–25). Wrap it with `@if (!isCreating())`:

```html
@if (!isCreating()) {
<mat-select [value]="p.status" panelWidth="" (selectionChange)="onStatusChange($event.value)">
  <mat-option [value]="ProjectStatus.InProgress">In Progress</mat-option>
  <mat-option [value]="ProjectStatus.Complete">Complete</mat-option>
  <mat-option [value]="ProjectStatus.OnHold">On Hold</mat-option>
  <mat-option [value]="ProjectStatus.Cancelled">Cancelled</mat-option>
</mat-select>
}
```

- [ ] **Step 6.2: Wrap the prints card**

Find the `<mat-card appearance="outlined" class="prints-card">` block (lines ~146–160). Wrap it with `@if (!isCreating())`:

```html
@if (!isCreating()) {
<mat-card appearance="outlined" class="prints-card">
  <mat-card-header>
    <mat-card-title>Prints</mat-card-title>
  </mat-card-header>
  <mat-card-content>
    @for (print of prints(); track print.id) {
    <app-print-card [print]="print" (deleted)="onPrintDeleted($event)" (statusChanged)="onPrintStatusChanged($event)" />
    } @empty {
    <p>No prints in this project yet.</p>
    }
  </mat-card-content>
</mat-card>
}
```

- [ ] **Step 6.3: Run tests to confirm nothing broke**

```bash
npm run test:brief
```

Expected: all tests pass

- [ ] **Step 6.4: Commit**

```bash
git add src/app/project/project-detail/project-detail.component.html
git commit -m "feat: hide status selector and prints card when creating a new project"
```

---

## Task 7: Final verification

- [ ] **Step 7.1: Run full test suite**

```bash
npm run test:ci
```

Expected: all tests pass, no regressions

- [ ] **Step 7.2: Start the dev server and manually verify the happy path**

```bash
npm start
```

1. Navigate to the Prints list (`/prints`)
2. Click the `expand_more` dropdown button next to "Add New Print"
3. Verify "Add a Project" appears as a second menu item
4. Click "Add a Project" — verify navigation to `/projects/new`
5. Verify the edit form renders immediately (name, reference, description, url, viewStatus fields visible)
6. Verify the status selector is NOT visible
7. Verify the prints card is NOT visible
8. Verify you can add an image using the thumbnail strip's add button
9. Fill in a project name and click Save
10. Verify navigation to `/projects/<new-id>` with the project displayed in view mode
11. Verify clicking Cancel on the new project form navigates back to `/prints`
