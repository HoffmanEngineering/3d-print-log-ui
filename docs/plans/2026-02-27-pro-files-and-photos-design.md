# Pro Feature: File Attachments & Photo Limit Increase

**Date:** 2026-02-27
**Status:** Approved

## Overview

Two Pro subscription features: (1) increase the photo limit from 5 to 20 images per print, and (2) add file attachments for 3D printing files (gcode, STL, 3MF, OBJ). File uploads use Azure SAS presigned URLs for direct-to-blob uploads, avoiding API server memory pressure for large files.

## Feature Limits

| Limit                      | Free              | Pro                      |
| -------------------------- | ----------------- | ------------------------ |
| Images per print           | 5                 | 20                       |
| File attachments per print | 0 (not available) | 5                        |
| Max file size              | —                 | 200 MB                   |
| Total file storage quota   | —                 | 50 GB                    |
| Allowed file types         | —                 | .gcode, .stl, .3mf, .obj |

## Storage Cost Estimates (Azure Cool Tier)

| User type          | Total prints | Prints w/ files (est.) | Total storage | Cool $/mo  |
| ------------------ | ------------ | ---------------------- | ------------- | ---------- |
| Typical active     | 200          | 50-100                 | 10-20 GB      | $0.10-0.20 |
| Heavy user         | 1,000        | 250-500                | 50-150 GB     | $0.50-1.50 |
| Power user (1,600) | 1,600        | 400-800                | 80-240 GB     | $0.80-2.40 |

Per-user storage quota (50 GB) bounds costs to ~$0.50/mo on Cool tier, well within the $2.99 subscription price.

## Data Model

### New Entity: `PrintFileAttachment`

```csharp
public class PrintFileAttachment : TimestampEntity
{
    public long Id { get; set; }
    public long PrintId { get; set; }
    public Print Print { get; set; }

    public Guid FileId { get; set; }
    public File File { get; set; }          // Reuses existing File entity

    public string OriginalFileName { get; set; }  // e.g., "benchy.gcode"
    public string ContentType { get; set; }
    public int DisplayOrder { get; set; }

    public long CreatedById { get; set; }
    public long UpdatedById { get; set; }
}
```

Mirrors the `PrintImage` → `File` pattern. The `File` entity stores blob path and size; `PrintFileAttachment` adds the original filename and print association.

### Print Entity Addition

```csharp
public bool AllowFileDownloads { get; set; } = false;  // Per-print toggle
```

### SubscriptionDto Additions

```typescript
export interface SubscriptionDto {
  // ... existing fields
  maxImagesPerPrint: number; // 5 for free, 20 for Pro
  maxFilesPerPrint: number; // 0 for free, 5 for Pro
  maxFileStorageBytes: number; // 0 for free, 53687091200 (50GB) for Pro
  usedFileStorageBytes: number; // Current usage
}
```

## API Endpoints

### New Endpoints on `PrintsController`

| Method   | Route                                          | Description                                                                                                                                                     |
| -------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST`   | `/api/Prints/{id}/files/upload-url`            | Request a SAS upload URL. Body: `{ fileName, contentType, sizeBytes }`. Validates Pro status, quota, file type, per-print limit. Returns `{ sasUrl, blobPath }` |
| `POST`   | `/api/Prints/{id}/files/confirm`               | Confirm upload completed. Body: `{ blobPath, fileName, sizeBytes, contentType }`. Verifies blob exists, creates `PrintFileAttachment` record                    |
| `GET`    | `/api/Prints/{id}/files`                       | List files for a print. Returns `[{ id, fileName, sizeBytes, contentType }]`                                                                                    |
| `GET`    | `/api/Prints/{id}/files/{fileId}/download-url` | Get a time-limited read-only SAS download URL. Checks `AllowFileDownloads` flag unless requester is the owner                                                   |
| `DELETE` | `/api/Prints/{id}/files/{fileId}`              | Delete a file attachment and its blob                                                                                                                           |

### Existing Endpoint Changes

- `PostImage`: Already uses `GetMaxImagesPerPrint(userId)` — backend returns 20 for Pro
- `SubscriptionController GET /me`: Returns new limit/quota fields

## Upload Flow (SAS Presigned URLs)

### Upload

```
1. User drags/selects file(s) in the Files section
2. Frontend validates: extension, size ≤ 200MB, per-print limit (< 5), quota
3. On Save (print must exist first — same pattern as image uploads):
   a. POST /api/Prints/{id}/files/upload-url  →  { sasUrl, blobPath }
   b. PUT file directly to Azure Blob Storage via sasUrl
   c. POST /api/Prints/{id}/files/confirm  →  record created
4. Repeat for each file
```

### Download

```
1. User clicks download button on a file
2. GET /api/Prints/{id}/files/{fileId}/download-url  →  { url, expiresAt }
3. Frontend opens the SAS URL — browser handles download natively
```

### SAS URL Configuration

- **Upload SAS:** Write-only, 15-minute expiry, scoped to specific blob path
- **Download SAS:** Read-only, 1-hour expiry
- **Blob container:** `printfiles` (separate from `printimages`)
- **Blob naming:** `{userId}/{printId}/{guid}{extension}`
- **Storage tier:** Cool (write-heavy, read-light workload)

### Orphan Cleanup

Blobs uploaded but never confirmed (user abandons page) have no database record. A periodic cleanup job or Azure Blob lifecycle policy deletes untracked blobs after 24 hours.

## File Visibility

- Per-print toggle: `AllowFileDownloads`, defaults to `false`
- **Owner:** Always sees files + download buttons
- **Public viewer, downloads enabled:** Sees files + download buttons
- **Public viewer, downloads disabled:** Sees filenames and sizes (no download action)
- **Backend enforcement:** Download URL endpoint checks flag unless requester is owner
- Consistent with existing `AllowComments` pattern on prints

## Frontend Design

### Edit Print View — Files Section

Placed after print details/notes, before comments.

**Pro user (edit mode):**

- Section header: "File Attachments" with count and quota (e.g., "3 files · 450MB of 50GB used")
- "Allow others to download files" toggle
- Drag-and-drop zone: dashed border, cloud icon, "Drop files here or click to browse"
- Accepted types hint: ".gcode, .stl, .3mf, .obj · Max 200MB per file"
- File list: file type icon, filename, size, progress bar (during upload), delete button

**Free user (teaser):**

- Muted section: file icon + "Attach gcode, STL, and 3MF files" + "Pro" badge + "Upgrade" link
- No drop zone or upload functionality

### Print Detail View (read-only)

- File list with download buttons (or no buttons if downloads disabled and not owner)
- Click filename or download icon → SAS URL → browser download

### Quota Indicator

- Text in section header: "2.1 GB of 50 GB used"
- Warning at >80%: amber text
- Error at limit: "Storage full", upload disabled

### New Components

| Component                        | Purpose                                                 |
| -------------------------------- | ------------------------------------------------------- |
| `FileAttachmentSectionComponent` | Main container — Pro gating, upload/download, file list |
| `FileDropZoneComponent`          | Drag-and-drop area + file input (reusable)              |
| `FileAttachmentListComponent`    | File cards with actions (download/delete/progress)      |

All standalone, `OnPush` change detection, signals for state.

### Upload Progress

`XMLHttpRequest` `upload.onprogress` event — progress bar per file. No new dependencies.

## Image Limit Increase (5 → 20)

### Backend

- `GetMaxImagesPerPrint(userId)` already exists and is called in `PostImage` — returns 20 for Pro
- Add `maxImagesPerPrint` to `SubscriptionDto`

### Frontend

- Replace hardcoded `MAX_IMAGES = 5` in `edit-print-detail.component.ts` with value from `SubscriptionService`
- Pass dynamic value to `image-thumbnail-strip` via existing `maxImages` input
- Upgrade prompt when free user hits 5: "Maximum 5 images. Upgrade to Pro for up to 20."

## Upgrade Prompts

- **Image limit:** When free user hits 5 images, toast includes Pro upgrade mention
- **File attachments:** Teaser section visible to free users with upgrade link
- Gentle, not pushy — consistent with subscription design principles

## Implementation Phases

### Phase 1: Backend — File Attachment Infrastructure

- `PrintFileAttachment` entity + EF migration
- `AllowFileDownloads` field on Print
- SAS URL generation service
- Upload URL, confirm, list, download URL, delete endpoints
- Quota tracking and enforcement
- SubscriptionDto additions (limits + usage)

### Phase 2: Frontend — Image Limit Increase

- Dynamic `MAX_IMAGES` from SubscriptionService
- Update thumbnail strip and upload validation
- Upgrade prompt toast for free users

### Phase 3: Frontend — File Attachment UI

- FileDropZoneComponent (drag-and-drop + file input)
- FileAttachmentListComponent (file cards with actions)
- FileAttachmentSectionComponent (orchestrator with Pro gating)
- File upload service (SAS URL flow with progress)
- Integration into edit-print-detail and print-detail views
- AllowFileDownloads toggle

### Phase 4: Polish

- Orphan blob cleanup job
- Quota usage display and warnings
- Free user teaser section
- Analytics events for file uploads/downloads
