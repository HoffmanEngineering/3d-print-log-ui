# Spec: Add a Project from the Print List

**Date:** 2026-04-22  
**Branch:** feat/print-projects-story-61  
**Status:** Approved

---

## Summary

Add an "Add a Project" option to the Print List's "Add Print" dropdown menu. Clicking it navigates to `/projects/new`, which renders `ProjectDetailComponent` in create mode — immediately showing the edit form pre-populated with an empty `ProjectDetailDto`. On save, the project is POSTed to the API and the user is navigated to the new project's detail page.

---

## Routing

Add a `new` route to `ProjectRoutingModule` **before** the `:id` route so Angular matches it first:

```
/projects/new  →  ProjectDetailComponent (create mode)
/projects/:id  →  ProjectDetailComponent (view/edit mode)
```

`ProjectRoutingModule` after change:

```typescript
const routes: Routes = [
  { path: 'new', component: ProjectDetailComponent },
  { path: ':id', component: ProjectDetailComponent },
];
```

---

## Print List Changes

**`print-list.component.html`** — add a second item to `#printAddOptions`:

```html
<button mat-menu-item (click)="navigateToNewProject()">Add a Project</button>
```

**`print-list.component.ts`** — add the handler (inject `Router` if not already injected — it already is):

```typescript
public navigateToNewProject(): void {
  this.router.navigate(['/projects', 'new']);
}
```

---

## `ProjectDetailComponent` Changes

### Create-mode detection

```typescript
readonly isCreating = computed(() => this.project()?.id === '');
```

### `ngOnInit` branching

```typescript
const id = this.route.snapshot.params['id'];
if (id === 'new') {
  this.project.set(emptyProjectDetailDto());
  this.titleService.setTitle('New Project | 3D Print Log');
  this.loading.set(false);
  this.isEditing.set(true);
} else {
  // existing load-by-id logic
}
```

`emptyProjectDetailDto()` is a private helper (or inline object) that returns:

```typescript
{
  id: '',
  name: '',
  reference: undefined,
  description: undefined,
  url: undefined,
  status: ProjectStatus.InProgress,
  viewStatus: ProjectViewStatus.Private,
  createdDate: new Date(),
  createdByUserId: 0,
  printCount: 0,
  totalPrintTimeInSeconds: 0,
  totalEstimatedPrintTimeInSeconds: 0,
  totalFilamentWeightMg: 0,
  images: [],
}
```

### Cancel in create mode

`onCancelEdit()` navigates to `/prints` instead of toggling `isEditing(false)` when `isCreating()` is true:

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

### `onSave()` branching

```typescript
onSave(formValue: ProjectEditFormValue): void {
  if (this.isCreating()) {
    this.onCreate(formValue);
  } else {
    this.onUpdate(formValue);
  }
}
```

**`onCreate()`** (new private method):

1. Build `AddProjectDto` from `formValue` with `status: ProjectStatus.InProgress`
2. Call `projectService.createProject(dto)` — returns new `ProjectDetailDto` with real ID
3. Upload any staged images (`this.images()` entries with no `id`) sequentially using the new project ID
4. If any image is marked `isDefault`, call `setDefaultImage`
5. If multiple images, call `reorderImages`
6. Navigate to `/projects/:newId`
7. Log `ProjectDetail_Created`

**`onUpdate()`** — existing `onSave()` logic, unchanged, extracted to this method.

### UI suppression in create mode

The following are hidden via `@if (!isCreating())` in the template:

- The print list section
- The image carousel (view-only) / image thumbnail strip
- The status selector (`mat-select` for `ProjectStatus`)
- The delete button / kebab menu

The edit form (`ProjectEditFormComponent`) renders in both modes — it is the only content shown in create mode.

---

## Data Flow

```
User clicks "Add a Project"
  → router.navigate(['/projects', 'new'])
  → ProjectDetailComponent ngOnInit detects id === 'new'
  → project.set(emptyProjectDetailDto()), isEditing.set(true)
  → User fills out form and clicks Save
  → onCreate() called
  → projectService.createProject(dto) → ProjectDetailDto { id: '<new-guid>' }
  → upload staged images (if any)
  → router.navigate(['/projects', '<new-guid>'])
  → ProjectDetailComponent re-initializes in view mode with real project
```

---

## Analytics

- `ProjectDetail_Created` — logged on successful creation (include `hasImages: boolean`)
- Existing `ProjectDetail_EditCancelled` continues to fire when cancelling from create mode (via the navigate path)

---

## Testing

- `ProjectDetailComponent` spec: add cases for `id === 'new'` — verifies `isEditing` is true, `isCreating` is true, no API call to `getProjectById`
- `ProjectDetailComponent` spec: `onCreate()` — verifies `createProject` called, navigates to new ID
- `ProjectDetailComponent` spec: cancel in create mode — verifies navigation to `/prints`
- `PrintListComponent` spec: `navigateToNewProject()` — verifies navigation to `['/projects', 'new']`
- Manual: verify "Add a Project" appears in dropdown, complete create flow end-to-end
