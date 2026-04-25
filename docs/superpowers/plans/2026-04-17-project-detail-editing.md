# Project Detail Editing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add full in-place editing to the Project Detail page — name, reference, description, URL, view status, and images — while keeping the read-only view clean for non-owners who arrive via a shared link.

**Architecture:** Single `ProjectDetailComponent` with an `isEditing` signal toggles between read-only and edit mode. A new `ProjectEditFormComponent` owns the metadata fields and emits a partial DTO. Image state is tracked locally in a signal and flushed on save via a sequential RxJS pipeline (PUT metadata → upload → set-default → delete → reorder → re-fetch). A new backend endpoint enables setting a default image independently of display order.

**Tech Stack:** Angular 20, Angular Material, Angular CDK (`moveItemInArray`), Reactive Forms, RxJS (`concat`, `forkJoin`, `mergeMap`, `toArray`), Jasmine/Karma, ASP.NET Core

---

## File Map

**Backend (`PrintLogApi/`):**

- Modify: `PrintLogApi/Services/IProjectService.cs` — add `SetDefaultImageAsync` signature
- Modify: `PrintLogApi/Services/ProjectService.cs` — implement `SetDefaultImageAsync`
- Modify: `PrintLogApi/Controllers/ProjectsController.cs` — add `POST {id}/images/{imageId}/set-as-default`

**Frontend (`src/`):**

- Modify: `src/app/core/services/project.service.ts` — add `ProjectImageValue`, `ProjectEditFormValue` interfaces; add `setDefaultImage` method
- Create: `src/app/project/project-detail/project-edit-form/project-edit-form.component.ts`
- Create: `src/app/project/project-detail/project-edit-form/project-edit-form.component.html`
- Create: `src/app/project/project-detail/project-edit-form/project-edit-form.component.scss`
- Create: `src/app/project/project-detail/project-edit-form/project-edit-form.component.spec.ts`
- Modify: `src/app/project/project-detail/project-detail.component.ts` — add edit mode, image state, save pipeline
- Modify: `src/app/project/project-detail/project-detail.component.html` — view/edit mode layout
- Modify: `src/app/project/project-detail/project-detail.component.scss` — image section styles
- Modify: `src/app/project/project-detail/project-detail.component.spec.ts` — extend tests

---

### Task 1: Backend — Add SetDefaultImage endpoint

**Files:**

- Modify: `PrintLogApi/PrintLogApi/Services/IProjectService.cs`
- Modify: `PrintLogApi/PrintLogApi/Services/ProjectService.cs`
- Modify: `PrintLogApi/PrintLogApi/Controllers/ProjectsController.cs`

- [ ] **Step 1: Add interface method**

In `PrintLogApi/PrintLogApi/Services/IProjectService.cs`, add after `ReorderImagesAsync`:

```csharp
Task SetDefaultImageAsync(Guid projectId, int imageId, long userId);
```

- [ ] **Step 2: Implement in ProjectService**

In `PrintLogApi/PrintLogApi/Services/ProjectService.cs`, add after `ReorderImagesAsync`:

```csharp
public async Task SetDefaultImageAsync(Guid projectId, int imageId, long userId)
{
    var images = await _context.ProjectImages
        .Where(pi => pi.ProjectId == projectId)
        .ToListAsync();

    foreach (var img in images)
        img.IsDefault = img.Id == imageId;

    await _context.SaveChangesAsync();
}
```

- [ ] **Step 3: Add controller endpoint**

In `PrintLogApi/PrintLogApi/Controllers/ProjectsController.cs`, add after `ReorderProjectImages`:

```csharp
/// <summary>Set a project image as the default.</summary>
[HttpPost("{id}/images/{imageId}/set-as-default")]
[ProducesResponseType(StatusCodes.Status200OK)]
[ProducesResponseType(StatusCodes.Status401Unauthorized)]
[ProducesResponseType(StatusCodes.Status403Forbidden)]
[ProducesResponseType(StatusCodes.Status404NotFound)]
public async Task<ActionResult> SetProjectImageAsDefault(Guid id, int imageId)
{
    var userId = User.GetUserId();
    if (!userId.HasValue) return Unauthorized();

    var project = await _projectService.GetProjectByIdAsync(id);
    if (project == null) return NotFound();
    if (project.CreatedById != userId.Value) return Forbid();

    await _projectService.SetDefaultImageAsync(id, imageId, userId.Value);
    _cacheVersionService.InvalidateUserCache(userId.Value);
    return Ok();
}
```

- [ ] **Step 4: Build the API to confirm it compiles**

```bash
cd PrintLogApi && dotnet build
```

Expected: `Build succeeded. 0 Error(s).`

- [ ] **Step 5: Commit**

```bash
git add PrintLogApi/PrintLogApi/Services/IProjectService.cs PrintLogApi/PrintLogApi/Services/ProjectService.cs PrintLogApi/PrintLogApi/Controllers/ProjectsController.cs
git commit -m "feat: add SetDefaultImageAsync endpoint to ProjectsController"
```

---

### Task 2: Frontend — Service types and setDefaultImage method

**Files:**

- Modify: `src/app/core/services/project.service.ts`

- [ ] **Step 1: Add exported interfaces**

In `src/app/core/services/project.service.ts`, add after the existing `ProjectImageDto` interface:

```typescript
export interface ProjectImageValue {
  id?: number;
  url?: string;
  file?: File;
  isDefault: boolean;
  displayOrder: number;
}

export interface ProjectEditFormValue {
  name: string;
  reference: string;
  description: string;
  url: string;
  viewStatus: ProjectViewStatus;
}
```

- [ ] **Step 2: Add setDefaultImage method to ProjectService**

In the `ProjectService` class body, add after `reorderImages`:

```typescript
setDefaultImage(projectId: string, imageId: number): Observable<void> {
  return this.http.post<void>(
    `${this.baseApi}/api/Projects/${projectId}/images/${imageId}/set-as-default`,
    {}
  );
}
```

- [ ] **Step 3: Run existing tests to confirm no regressions**

```bash
npm run test:brief
```

Expected: All tests PASS.

- [ ] **Step 4: Commit**

```bash
git add src/app/core/services/project.service.ts
git commit -m "feat: add ProjectImageValue, ProjectEditFormValue, setDefaultImage to ProjectService"
```

---

### Task 3: ProjectEditFormComponent (TDD)

**Files:**

- Create: `src/app/project/project-detail/project-edit-form/project-edit-form.component.spec.ts`
- Create: `src/app/project/project-detail/project-edit-form/project-edit-form.component.ts`
- Create: `src/app/project/project-detail/project-edit-form/project-edit-form.component.html`
- Create: `src/app/project/project-detail/project-edit-form/project-edit-form.component.scss`

- [ ] **Step 1: Write the failing tests**

Create `src/app/project/project-detail/project-edit-form/project-edit-form.component.spec.ts`:

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProjectEditFormComponent } from './project-edit-form.component';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ProjectDetailDto, ProjectStatus, ProjectViewStatus } from 'src/app/core/services/project.service';

const mockProject: ProjectDetailDto = {
  id: 'abc-123',
  name: 'Voron 2.4',
  reference: 'v2.4-350',
  description: 'My build',
  url: 'https://example.com',
  status: ProjectStatus.InProgress,
  viewStatus: ProjectViewStatus.Public,
  createdDate: new Date(),
  createdByUserId: 1,
  printCount: 0,
  totalPrintTimeInSeconds: 0,
  totalEstimatedPrintTimeInSeconds: 0,
  totalFilamentWeightMg: 0,
  images: [],
};

describe('ProjectEditFormComponent', () => {
  let fixture: ComponentFixture<ProjectEditFormComponent>;
  let component: ProjectEditFormComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProjectEditFormComponent, NoopAnimationsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(ProjectEditFormComponent);
    fixture.componentRef.setInput('project', mockProject);
    fixture.detectChanges();
    component = fixture.componentInstance;
  });

  it('should populate name field from project input', () => {
    const input: HTMLInputElement = fixture.nativeElement.querySelector('[data-testid="name-input"]');
    expect(input.value).toBe('Voron 2.4');
  });

  it('should populate reference field from project input', () => {
    const input: HTMLInputElement = fixture.nativeElement.querySelector('[data-testid="reference-input"]');
    expect(input.value).toBe('v2.4-350');
  });

  it('should emit saved event with form values on valid submit', () => {
    const savedValues: any[] = [];
    component.saved.subscribe((v) => savedValues.push(v));

    component.form.patchValue({ name: 'Updated Name' });
    component.onSubmit();

    expect(savedValues.length).toBe(1);
    expect(savedValues[0].name).toBe('Updated Name');
    expect(savedValues[0].viewStatus).toBe(ProjectViewStatus.Public);
  });

  it('should not emit saved when name is empty', () => {
    const savedValues: any[] = [];
    component.saved.subscribe((v) => savedValues.push(v));

    component.form.patchValue({ name: '' });
    component.onSubmit();

    expect(savedValues.length).toBe(0);
  });

  it('should emit cancelled event on cancel', () => {
    let cancelled = false;
    component.cancelled.subscribe(() => (cancelled = true));

    component.onCancel();

    expect(cancelled).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test:brief -- --include="**/project-edit-form/**"
```

Expected: FAILED — `ProjectEditFormComponent` does not exist yet.

- [ ] **Step 3: Create the component TypeScript**

Create `src/app/project/project-detail/project-edit-form/project-edit-form.component.ts`:

```typescript
import { ChangeDetectionStrategy, Component, OnInit, inject, input, output } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ProjectDetailDto, ProjectEditFormValue, ProjectViewStatus } from 'src/app/core/services/project.service';

@Component({
  selector: 'app-project-edit-form',
  templateUrl: './project-edit-form.component.html',
  styleUrls: ['./project-edit-form.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule],
})
export class ProjectEditFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);

  project = input.required<ProjectDetailDto>();
  isSaving = input(false);

  saved = output<ProjectEditFormValue>();
  cancelled = output<void>();

  readonly ProjectViewStatus = ProjectViewStatus;

  form!: FormGroup<{
    name: FormControl<string>;
    reference: FormControl<string>;
    description: FormControl<string>;
    url: FormControl<string>;
    viewStatus: FormControl<ProjectViewStatus>;
  }>;

  ngOnInit(): void {
    const p = this.project();
    this.form = this.fb.nonNullable.group({
      name: [p.name, Validators.required],
      reference: [p.reference ?? ''],
      description: [p.description ?? ''],
      url: [p.url ?? ''],
      viewStatus: [p.viewStatus],
    });
  }

  onSubmit(): void {
    this.form.markAllAsTouched();
    if (!this.form.valid) return;
    this.saved.emit(this.form.getRawValue());
  }

  onCancel(): void {
    this.cancelled.emit();
  }
}
```

- [ ] **Step 4: Create the component template**

Create `src/app/project/project-detail/project-edit-form/project-edit-form.component.html`:

```html
<form [formGroup]="form" (ngSubmit)="onSubmit()">
  <mat-form-field appearance="outline">
    <mat-label>Name</mat-label>
    <input matInput formControlName="name" data-testid="name-input" required />
    @if (form.controls.name.hasError('required')) {
    <mat-error>Name is required</mat-error>
    }
  </mat-form-field>

  <mat-form-field appearance="outline">
    <mat-label>Reference</mat-label>
    <input matInput formControlName="reference" data-testid="reference-input" />
    <mat-hint>e.g. "Voron 2.4 R2"</mat-hint>
  </mat-form-field>

  <mat-form-field appearance="outline">
    <mat-label>Description</mat-label>
    <textarea matInput formControlName="description" rows="3"></textarea>
  </mat-form-field>

  <mat-form-field appearance="outline">
    <mat-label>Model Source URL</mat-label>
    <input matInput formControlName="url" type="url" />
  </mat-form-field>

  <mat-form-field appearance="outline">
    <mat-label>Visibility</mat-label>
    <mat-select formControlName="viewStatus">
      <mat-option [value]="ProjectViewStatus.Public">Public</mat-option>
      <mat-option [value]="ProjectViewStatus.Unlisted">Unlisted</mat-option>
      <mat-option [value]="ProjectViewStatus.Private">Private</mat-option>
    </mat-select>
  </mat-form-field>

  <div class="form-actions">
    <button mat-button type="button" (click)="onCancel()" [disabled]="isSaving()">Cancel</button>
    <button mat-flat-button color="primary" type="submit" [disabled]="isSaving()">@if (isSaving()) { Saving… } @else { Save }</button>
  </div>
</form>
```

- [ ] **Step 5: Create the SCSS file**

Create `src/app/project/project-detail/project-edit-form/project-edit-form.component.scss`:

```scss
form {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  margin-top: 8px;
}
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
npm run test:brief -- --include="**/project-edit-form/**"
```

Expected: All 5 tests PASS.

- [ ] **Step 7: Commit**

```bash
git add src/app/project/project-detail/project-edit-form/ src/app/core/services/project.service.ts
git commit -m "feat: add ProjectEditFormComponent"
```

---

### Task 4: ProjectDetailComponent — isOwner signal, edit button, and AuthService

**Files:**

- Modify: `src/app/project/project-detail/project-detail.component.ts`
- Modify: `src/app/project/project-detail/project-detail.component.html`
- Modify: `src/app/project/project-detail/project-detail.component.spec.ts`

- [ ] **Step 1: Write failing tests**

Replace the contents of `src/app/project/project-detail/project-detail.component.spec.ts` with:

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProjectDetailComponent } from './project-detail.component';
import { ProjectService, ProjectDetailDto, ProjectStatus, ProjectViewStatus } from 'src/app/core/services/project.service';
import { PrintService } from 'src/app/core/services/print.service';
import { AuthService } from 'src/app/core/services/auth.service';
import { ActivatedRoute } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
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
  let component: ProjectDetailComponent;
  let mockProjectService: jasmine.SpyObj<ProjectService>;
  let currentUserSubject: BehaviorSubject<any>;

  beforeEach(async () => {
    mockProjectService = jasmine.createSpyObj<ProjectService>('ProjectService', ['getProjectById', 'deleteProject', 'updateProject', 'uploadImage', 'deleteImage', 'reorderImages', 'setDefaultImage']);
    mockProjectService.getProjectById.and.returnValue(of(mockProject));

    const mockPrintService = jasmine.createSpyObj('PrintService', ['getPrintSummaries']);
    mockPrintService.getPrintSummaries.and.returnValue(of({ items: [], paging: { totalCount: 0, pageNumber: 1, pageSize: 100, totalPages: 0 } }));

    currentUserSubject = new BehaviorSubject({ id: 1 });
    const mockAuthService = { userProfile$: currentUserSubject.asObservable() };

    await TestBed.configureTestingModule({
      imports: [ProjectDetailComponent, NoopAnimationsModule],
      providers: [
        { provide: ProjectService, useValue: mockProjectService },
        { provide: PrintService, useValue: mockPrintService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: ActivatedRoute, useValue: { snapshot: { params: { id: 'abc-123' } } } },
        { provide: MatDialog, useValue: jasmine.createSpyObj('MatDialog', ['open']) },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProjectDetailComponent);
    fixture.detectChanges();
    component = fixture.componentInstance;
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

  it('should show edit button for owner', async () => {
    await fixture.whenStable();
    fixture.detectChanges();
    const editButton = fixture.nativeElement.querySelector('[data-testid="edit-button"]');
    expect(editButton).toBeTruthy();
  });

  it('should not show edit button for non-owner', async () => {
    currentUserSubject.next({ id: 99 });
    await fixture.whenStable();
    fixture.detectChanges();
    const editButton = fixture.nativeElement.querySelector('[data-testid="edit-button"]');
    expect(editButton).toBeNull();
  });

  it('should enter edit mode and show form when edit button clicked', async () => {
    await fixture.whenStable();
    fixture.detectChanges();
    const editButton: HTMLButtonElement = fixture.nativeElement.querySelector('[data-testid="edit-button"]');
    editButton.click();
    fixture.detectChanges();
    const form = fixture.nativeElement.querySelector('app-project-edit-form');
    expect(form).toBeTruthy();
  });

  it('should exit edit mode on cancel', async () => {
    await fixture.whenStable();
    component.onEditClick();
    fixture.detectChanges();
    component.onCancelEdit();
    fixture.detectChanges();
    expect(component.isEditing()).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test:brief -- --include="**/project-detail.component.spec.ts"
```

Expected: New tests FAIL — `AuthService` not provided and edit button/methods don't exist yet.

- [ ] **Step 3: Rewrite project-detail.component.ts with new signals and AuthService**

Replace the full contents of `src/app/project/project-detail/project-detail.component.ts`:

```typescript
import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { Title } from '@angular/platform-browser';
import { moveItemInArray } from '@angular/cdk/drag-drop';
import { concat, forkJoin, of } from 'rxjs';
import { mergeMap, take, toArray } from 'rxjs/operators';
import { ProjectService, ProjectDetailDto, ProjectImageDto, ProjectImageValue, ProjectEditFormValue, ProjectStatus, ProjectViewStatus, PutProjectDto } from 'src/app/core/services/project.service';
import { PrintService, PrintSummary } from 'src/app/core/services/print.service';
import { AuthService } from 'src/app/core/services/auth.service';
import { LoggingService } from 'src/app/core/services/logging.service';
import { SimpleDialogComponent } from 'src/app/shared/simple-dialog/simple-dialog.component';
import { SharedModule } from 'src/app/shared/shared.module';
import { ProjectEditFormComponent } from './project-edit-form/project-edit-form.component';
import { ImageCarouselComponent } from 'src/app/shared/image-carousel/image-carousel.component';
import { ImageThumbnailStripComponent, ThumbnailImage } from 'src/app/shared/image-thumbnail-strip/image-thumbnail-strip.component';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-project-detail',
  templateUrl: './project-detail.component.html',
  styleUrls: ['./project-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, MatCardModule, MatButtonModule, MatIconModule, MatMenuModule, MatSelectModule, MatProgressSpinnerModule, SharedModule, ProjectEditFormComponent, ImageCarouselComponent, ImageThumbnailStripComponent],
})
export class ProjectDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly projectService = inject(ProjectService);
  private readonly printService = inject(PrintService);
  private readonly authService = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly titleService = inject(Title);
  private readonly destroyRef = inject(DestroyRef);
  private readonly loggingService = inject(LoggingService);

  @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>;

  project = signal<ProjectDetailDto | null>(null);
  prints = signal<PrintSummary[]>([]);
  loading = signal(true);
  isEditing = signal(false);
  isSaving = signal(false);
  images = signal<ProjectImageValue[]>([]);
  selectedImageIndex = signal(0);

  imageIdsToDelete: number[] = [];
  private defaultImageIdOnLoad: number | null = null;

  private currentUserId = signal<number | null>(null);

  isOwner = computed(() => {
    const p = this.project();
    const uid = this.currentUserId();
    return p !== null && uid !== null && p.createdByUserId === uid;
  });

  carouselImages = computed<ProjectImageValue[]>(() => {
    const p = this.project();
    if (!p || p.images.length === 0) return [];
    return [...p.images]
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map((img) => ({
        id: img.id,
        url: `${environment.printLogApiUrl}/api/Projects/${p.id}/images/${img.id}`,
        isDefault: img.isDefault,
        displayOrder: img.displayOrder,
      }));
  });

  readonly ProjectStatus = ProjectStatus;
  readonly ProjectViewStatus = ProjectViewStatus;

  ngOnInit(): void {
    this.authService.userProfile$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((user) => this.currentUserId.set(user?.id ?? null));

    const id = this.route.snapshot.params['id'];
    this.projectService
      .getProjectById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
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

  onEditClick(): void {
    const p = this.project()!;
    const sorted = [...p.images].sort((a, b) => a.displayOrder - b.displayOrder);
    this.images.set(
      sorted.map((img) => ({
        id: img.id,
        url: `${environment.printLogApiUrl}/api/Projects/${p.id}/images/${img.id}`,
        isDefault: img.isDefault,
        displayOrder: img.displayOrder,
      }))
    );
    this.defaultImageIdOnLoad = sorted.find((i) => i.isDefault)?.id ?? null;
    this.imageIdsToDelete = [];
    this.selectedImageIndex.set(0);
    this.isEditing.set(true);
    this.loggingService.logEvent('ProjectDetail_EditStarted');
  }

  onCancelEdit(): void {
    this.isEditing.set(false);
    this.images.set([]);
    this.imageIdsToDelete = [];
    this.loggingService.logEvent('ProjectDetail_EditCancelled');
  }

  onSave(_formValue: ProjectEditFormValue): void {
    // implemented in Task 6
  }

  onAddImageClicked(): void {
    this.fileInputRef.nativeElement.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const file = input.files[0];
    const url = URL.createObjectURL(file);
    const newImage: ProjectImageValue = {
      file,
      url,
      isDefault: this.images().length === 0,
      displayOrder: this.images().length,
    };
    this.images.update((imgs) => [...imgs, newImage]);
    input.value = '';
    this.loggingService.logEvent('ProjectDetail_ImageUploaded');
  }

  onImageSelected(image: ThumbnailImage): void {
    const list = this.isEditing() ? this.images() : this.carouselImages();
    const idx = list.findIndex((i) => (i.id !== undefined && i.id === image.id) || i.url === image.url);
    if (idx >= 0) this.selectedImageIndex.set(idx);
  }

  onImageDeleted(image: ThumbnailImage): void {
    const idx = this.images().findIndex((i) => (i.id !== undefined && i.id === image.id) || i.url === image.url);
    if (idx === -1) return;
    const deleted = this.images()[idx];
    if (deleted.id) this.imageIdsToDelete.push(deleted.id);
    const wasDefault = deleted.isDefault;
    this.images.update((imgs) => {
      const updated = imgs
        .filter((_, i) => i !== idx)
        .map((img, i) => ({
          ...img,
          displayOrder: i,
        }));
      if (wasDefault && updated.length > 0) {
        updated[0] = { ...updated[0], isDefault: true };
      }
      return updated;
    });
    this.selectedImageIndex.set(0);
    this.loggingService.logEvent('ProjectDetail_ImageDeleted');
  }

  onDefaultChanged(image: ThumbnailImage): void {
    this.images.update((imgs) =>
      imgs.map((img) => ({
        ...img,
        isDefault: (img.id !== undefined && img.id === image.id) || img.url === image.url,
      }))
    );
  }

  onImagesReordered(event: { previousIndex: number; currentIndex: number }): void {
    this.images.update((imgs) => {
      const reordered = [...imgs];
      moveItemInArray(reordered, event.previousIndex, event.currentIndex);
      return reordered.map((img, i) => ({ ...img, displayOrder: i }));
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
      .subscribe((updated) => this.project.set(updated));
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
    ref
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((deleteAll) => {
        if (deleteAll === undefined) return;
        const projectId = this.project()!.id;
        this.projectService
          .deleteProject(projectId, !!deleteAll)
          .pipe(take(1))
          .subscribe(() => this.router.navigate(['/prints']));
      });
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test:brief -- --include="**/project-detail.component.spec.ts"
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/project/project-detail/project-detail.component.ts src/app/project/project-detail/project-detail.component.spec.ts
git commit -m "feat: add isOwner, edit mode signals, and AuthService to ProjectDetailComponent"
```

---

### Task 5: ProjectDetailComponent — template (view mode + edit mode layout)

**Files:**

- Modify: `src/app/project/project-detail/project-detail.component.html`
- Modify: `src/app/project/project-detail/project-detail.component.scss`

- [ ] **Step 1: Replace the template**

Replace the full contents of `src/app/project/project-detail/project-detail.component.html`:

```html
@if (loading()) {
<div class="loading-center"><mat-spinner /></div>
} @else if (project(); as p) {
<div class="project-detail-layout">
  <mat-card appearance="outlined">
    <mat-card-header>
      @if (!isEditing()) {
      <mat-card-title>{{ p.name }}</mat-card-title>
      @if (p.reference) {
      <mat-card-subtitle>{{ p.reference }}</mat-card-subtitle>
      } }
      <div class="header-actions">
        <mat-select [value]="p.status" (selectionChange)="onStatusChange($event.value)">
          <mat-option [value]="ProjectStatus.InProgress">In Progress</mat-option>
          <mat-option [value]="ProjectStatus.Complete">Complete</mat-option>
          <mat-option [value]="ProjectStatus.OnHold">On Hold</mat-option>
          <mat-option [value]="ProjectStatus.Cancelled">Cancelled</mat-option>
        </mat-select>
        @if (isOwner() && !isEditing()) {
        <button mat-icon-button data-testid="edit-button" aria-label="Edit project" (click)="onEditClick()">
          <mat-icon>edit</mat-icon>
        </button>
        <button mat-icon-button [matMenuTriggerFor]="menu" aria-label="More options">
          <mat-icon>more_vert</mat-icon>
        </button>
        <mat-menu #menu="matMenu">
          <button mat-menu-item (click)="onDeleteProject()"><mat-icon>delete</mat-icon> Delete project</button>
        </mat-menu>
        }
      </div>
    </mat-card-header>

    <mat-card-content>
      @if (isEditing()) {
      <app-project-edit-form [project]="p" [isSaving]="isSaving()" (saved)="onSave($event)" (cancelled)="onCancelEdit()" />
      <div class="images-section">
        @if (images().length > 0) {
        <app-image-carousel [imageCount]="images().length" [selectedIndex]="selectedImageIndex()" (indexChange)="selectedImageIndex.set($event)">
          <img [src]="images()[selectedImageIndex()].url" [alt]="'Project image ' + (selectedImageIndex() + 1)" class="carousel-image" />
        </app-image-carousel>
        }
        <app-image-thumbnail-strip [images]="images()" [selectedId]="images()[selectedImageIndex()]?.id" [editable]="true" [maxImages]="5" (imageSelected)="onImageSelected($event)" (imageDeleted)="onImageDeleted($event)" (defaultChanged)="onDefaultChanged($event)" (imagesReordered)="onImagesReordered($event)" (addClicked)="onAddImageClicked()" />
        <input #fileInput type="file" accept="image/*" style="display:none" (change)="onFileSelected($event)" />
      </div>
      } @else { @if (p.description) {
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
          <span class="value">{{ (p.totalFilamentWeightMg / 1000) | number:'1.0-1' }}g</span>
        </div>
      </div>
      @if (carouselImages().length > 0) {
      <div class="images-section">
        <app-image-carousel [imageCount]="carouselImages().length" [selectedIndex]="selectedImageIndex()" (indexChange)="selectedImageIndex.set($event)">
          <img [src]="carouselImages()[selectedImageIndex()].url" [alt]="'Project image ' + (selectedImageIndex() + 1)" class="carousel-image" />
        </app-image-carousel>
        <app-image-thumbnail-strip [images]="carouselImages()" [selectedId]="carouselImages()[selectedImageIndex()]?.id" [editable]="false" (imageSelected)="onImageSelected($event)" />
      </div>
      } }
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

- [ ] **Step 2: Add image styles to SCSS**

Add to `src/app/project/project-detail/project-detail.component.scss`:

```scss
.images-section {
  margin-top: 16px;
}

.carousel-image {
  width: 100%;
  max-height: 400px;
  object-fit: contain;
  display: block;
  border-radius: 4px;
}
```

- [ ] **Step 3: Run tests**

```bash
npm run test:brief -- --include="**/project-detail.component.spec.ts"
```

Expected: All tests PASS.

- [ ] **Step 4: Commit**

```bash
git add src/app/project/project-detail/project-detail.component.html src/app/project/project-detail/project-detail.component.scss
git commit -m "feat: add view/edit mode layout with images to ProjectDetail template"
```

---

### Task 6: ProjectDetailComponent — save pipeline

**Files:**

- Modify: `src/app/project/project-detail/project-detail.component.ts`
- Modify: `src/app/project/project-detail/project-detail.component.spec.ts`

- [ ] **Step 1: Write a failing test for save**

Add to the `describe` block in `project-detail.component.spec.ts`:

```typescript
it('should call updateProject and re-fetch project on save', async () => {
  mockProjectService.updateProject.and.returnValue(of(mockProject));
  mockProjectService.uploadImage = jasmine.createSpy().and.returnValue(of({ id: 10, isDefault: false, displayOrder: 0 } as any));
  mockProjectService.reorderImages.and.returnValue(of(void 0));
  mockProjectService.setDefaultImage.and.returnValue(of(void 0));
  mockProjectService.deleteImage.and.returnValue(of(void 0));
  // getProjectById is already set to return mockProject

  await fixture.whenStable();
  fixture.detectChanges();
  component.onEditClick();

  component.onSave({
    name: 'Updated Name',
    reference: '',
    description: '',
    url: '',
    viewStatus: ProjectViewStatus.Public,
  });

  await fixture.whenStable();

  expect(mockProjectService.updateProject).toHaveBeenCalledWith('abc-123', jasmine.objectContaining({ name: 'Updated Name', status: ProjectStatus.InProgress }));
  // Called once on init, once after save
  expect(mockProjectService.getProjectById).toHaveBeenCalledTimes(2);
  expect(component.isEditing()).toBe(false);
  expect(component.isSaving()).toBe(false);
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test:brief -- --include="**/project-detail.component.spec.ts"
```

Expected: New save test FAILS — `onSave` is still a stub.

- [ ] **Step 3: Implement onSave**

Replace the `onSave` stub in `project-detail.component.ts`:

```typescript
onSave(formValue: ProjectEditFormValue): void {
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

  // Snapshot edit state before async pipeline starts
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
          ...newImages.map((img) => this.projectService.uploadImage(p.id, img.file!))
        ).pipe(toArray());

  this.projectService
    .updateProject(p.id, dto)
    .pipe(
      mergeMap(() => upload$),
      mergeMap((uploadResults: ProjectImageDto[]) => {
        uploadedIds = uploadResults.map((r) => r.id);

        // Resolve default image ID — may be an existing or just-uploaded image
        let defaultId: number | null = defaultImage?.id ?? null;
        if (!defaultId) {
          const newDefaultIdx = newImages.findIndex((img) => img.isDefault);
          if (newDefaultIdx >= 0) defaultId = uploadedIds[newDefaultIdx] ?? null;
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
          : forkJoin(idsToDelete.map((id) => this.projectService.deleteImage(p.id, id)))
      ),
      mergeMap(() => {
        // Build final ordered ID list from surviving existing images + newly uploaded
        const existingOrdered = existingImages
          .filter((img) => !idsToDelete.includes(img.id!))
          .map((img) => ({ id: img.id!, displayOrder: img.displayOrder }));

        const newOrdered = newImages.map((img, i) => ({
          id: uploadedIds[i],
          displayOrder: img.displayOrder,
        })).filter((x) => x.id !== undefined) as { id: number; displayOrder: number }[];

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

- [ ] **Step 4: Run all tests**

```bash
npm run test:brief
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/project/project-detail/project-detail.component.ts src/app/project/project-detail/project-detail.component.spec.ts
git commit -m "feat: implement save pipeline in ProjectDetailComponent"
```

---

### Task 7: Lint, run full test suite, manual smoke test

- [ ] **Step 1: Run linter**

```bash
npm run lint:brief
```

Expected: No errors.

- [ ] **Step 2: Run full test suite**

```bash
npm run test:brief
```

Expected: All tests PASS.

- [ ] **Step 3: Start dev server and manually verify**

```bash
npm start
```

Open `https://localhost:4200` and navigate to a project. Verify:

1. As owner: Edit button is visible; clicking it shows the edit form with pre-populated fields
2. As owner in edit mode: image thumbnail strip shows drag handles, delete, and set-default buttons; add button works; cancel discards changes
3. As owner: Save updates name/description/images and returns to view mode
4. As non-owner (open in incognito or log out): no Edit button, no more menu, images are browseable only
5. Status dropdown saves immediately in both view and edit mode

- [ ] **Step 4: Final commit if any fixes were needed**

```bash
git add -p
git commit -m "fix: address issues from smoke testing"
```
