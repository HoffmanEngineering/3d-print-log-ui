# Project Detail Editing — Design Spec

**Date:** 2026-04-17
**Branch:** feat/print-projects-story-61

## Overview

Enhance the `ProjectDetailComponent` to support editing a project's name, reference, description, URL, view status, and images. The page is publicly shareable (the GET endpoint is `AllowAnonymous`), so the design must keep the read-only view clean for non-owners while giving owners an in-place edit experience.

## Approach

Single component, single route (`/projects/:id`). An `isEditing` signal toggles between view and edit mode. Non-owners always see the read-only view. Owners see an "Edit" button that activates edit mode inline — no route change.

This avoids the complexity of separate view/edit routes while keeping the shareable URL clean.

## Backend Change Required

The Projects API is missing a set-default-image endpoint. Add to `ProjectsController`:

```
POST /api/Projects/{id}/images/{imageId}/set-as-default
```

Behavior: clears `IsDefault` on all other images for the project, sets it on the specified image. Mirrors the existing `POST {printId}/image/{imageId}/set-as-default` in `PrintsController`. Requires ownership check (403 if not owner).

Add a corresponding `setDefaultImage(projectId: string, imageId: number): Observable<void>` method to `ProjectService` on the frontend.

## Component Structure

### `ProjectDetailComponent` (existing, extended)

Owns all state and service calls:

- `project = signal<ProjectDetailDto | null>(null)`
- `prints = signal<PrintSummary[]>([])`
- `loading = signal(true)`
- `isEditing = signal(false)`
- `isSaving = signal(false)`
- `images = signal<ProjectImageValue[]>([])` — local working copy, initialized from `project().images` when entering edit mode
- `imageIdsToDelete: number[]` — tracked across edit session, reset on cancel
- `selectedImageIndex = signal(0)`
- `isOwner = computed(...)` — compares `project().createdByUserId` against authenticated user from `AuthService`

### `ProjectEditFormComponent` (new, in `project/project-detail/`)

Responsible only for the metadata form fields.

**Inputs:**

- `project = input.required<ProjectDetailDto>()`

**Outputs:**

- `saved = output<PutProjectDto>()`
- `cancelled = output<void>()`

**Form fields (reactive):**

- `name` — text, required
- `reference` — text, optional
- `description` — textarea, optional
- `url` — text, optional
- `viewStatus` — select (Public / Unlisted / Private)

`status` is excluded — it already saves immediately via the existing `onStatusChange` dropdown and that behavior is preserved.

On Save: validates form, emits `Omit<PutProjectDto, 'id' | 'status'>` to parent. Parent merges the current `project().status` and the project ID before calling the service.
On Cancel: emits `cancelled`, parent discards all edit state.

### Reused shared components

- `ImageCarouselComponent` — no changes needed
- `ImageThumbnailStripComponent` — no changes needed; parent passes `[editable]="isEditing()"`

## Image State & Local Image Shape

```typescript
interface ProjectImageValue {
  id?: number; // undefined for newly added, not-yet-uploaded images
  url?: string; // blob URL for previewing new images; server URL for existing
  file?: File; // present for new images only
  isDefault: boolean;
  displayOrder: number;
}
```

Local `images` signal is initialized from `project().images` when edit mode is entered. All mutations are local until Save.

## Image Operations (local, deferred until Save)

- **Add**: append `ProjectImageValue` with `file` and a blob preview URL; no `id`
- **Delete**: remove from `images` signal; if `id` exists, push to `imageIdsToDelete`; if deleted image was default, promote the first remaining image as default
- **Reorder**: `moveItemInArray`, update `displayOrder` for all entries
- **Set default**: clear `isDefault` on all entries, set it on the selected one

## Save Pipeline

Triggered when `ProjectEditFormComponent` emits `saved`:

1. `PUT /api/Projects/:id` — metadata (name, reference, description, url, status, viewStatus)
2. Upload new images (those without an `id`) sequentially → `POST /api/Projects/:id/images`; update local entries with returned IDs
3. Set default image if it changed from the original → `POST /api/Projects/:id/images/:imageId/set-as-default`
4. Delete marked images → `DELETE /api/Projects/:id/images/:imageId` (forkJoin)
5. Reorder → `PUT /api/Projects/:id/images/reorder` with ordered image IDs

On success: re-fetch the project via `getProjectById` to get authoritative state (updated image IDs, display orders, etc.), update `project` signal, `isEditing.set(false)`, clear `imageIdsToDelete`, clear local `images`.
On error: show error toast, remain in edit mode, `isSaving.set(false)`.

## Cancel Behavior

`isEditing.set(false)`, local `images` signal cleared, `imageIdsToDelete` reset. No API calls. Form state discarded.

## Layout

### View mode (all users)

- Header card: project name, reference subtitle, status selector, stats bar
- "Edit" button in header actions (owner only)
- More menu with "Delete project" (owner only)
- Image section: carousel + thumbnail strip (`editable=false`) — browseable, no edit controls
- Description paragraph, URL link
- Prints list card

### Edit mode (owner only)

- Header card: `ProjectEditFormComponent` replaces name/reference display; Save and Cancel buttons replace the Edit button; status selector remains
- Image section: carousel + thumbnail strip (`editable=true`) — drag-to-reorder, delete, set-default controls visible
- Prints list: unchanged, remains visible below

No route change occurs when entering or leaving edit mode.

## Non-owner Experience

Non-owners (including unauthenticated users via the `AllowAnonymous` GET endpoint) see only the view mode layout. The Edit button, more menu, and all edit affordances are conditionally rendered via `isOwner` — they are absent from the DOM entirely, not just hidden.

## Analytics

Log the following events via `LoggingService`:

- `ProjectDetail_EditStarted` — when owner clicks Edit
- `ProjectDetail_Saved` — on successful save, include `{ hasNewImages, deletedImageCount, reordered }`
- `ProjectDetail_EditCancelled` — when owner clicks Cancel
- `ProjectDetail_ImageUploaded` — per image added
- `ProjectDetail_ImageDeleted` — per image removed
