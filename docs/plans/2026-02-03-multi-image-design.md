# Multi-Image Support for Prints

## Overview

Extend ViewPrintDetail and EditPrintDetail components to support multiple images per print, with drag-and-drop reordering and flexible upload options.

## Requirements

- Support up to 5 images per print (designed for future tier-based limits)
- Thumbnail strip display with main image viewer
- Drag-and-drop reorder capability
- Multi-file upload via file picker and drag-and-drop
- Independent default image selection (not tied to display order)

## Data Model

### API Changes (PrintImage Entity)

```csharp
public class PrintImage : TimestampEntity
{
    public int Id { get; set; }
    public long PrintId { get; set; }
    public Guid FileId { get; set; }
    public bool IsDefault { get; set; }      // Existing - marks thumbnail image
    public int DisplayOrder { get; set; }    // NEW - 0-based ordering
}
```

### Business Rules

- Maximum 5 images per print
- `DisplayOrder` starts at 0, increments for each image
- Exactly one image must have `IsDefault = true` when images exist
- When default is deleted, auto-promote next image by `DisplayOrder`

### DTO Updates

```csharp
public class PrintImageDto
{
    public int Id { get; set; }
    public bool IsDefault { get; set; }
    public int DisplayOrder { get; set; }  // NEW
}
```

## API Endpoints

### New Endpoint: Reorder Images

```
PUT /api/prints/{printId}/images/reorder
Body: [
  { "imageId": 1, "displayOrder": 0 },
  { "imageId": 3, "displayOrder": 1 },
  { "imageId": 2, "displayOrder": 2 }
]
```

- Validates user owns the print
- Validates all image IDs belong to the print
- Updates all `DisplayOrder` values in a single transaction

### Updated Endpoint: Upload Image

`POST /api/prints/{id}/image`

- New images default to `DisplayOrder = MAX(existing) + 1`
- Enforce 5-image limit: return `400 Bad Request` if limit exceeded

### Updated Endpoint: Delete Image

`DELETE /api/prints/{printId}/image/{imageId}`

- If deleted image has `IsDefault = true`:
  - Find image with next lowest `DisplayOrder`
  - Promote it to `IsDefault = true`

## UI Design

### ViewPrintDetail (Read-Only)

```
┌─────────────────────────────────────┐
│                                     │
│          Main Image Display         │
│         (selected image)            │
│                                     │
├─────────────────────────────────────┤
│ [img1] [img2] [img3★] [img4] [img5] │
│   ▲                                 │
│ border = selected    ★ = default    │
└─────────────────────────────────────┘
```

- `selectedImage` signal tracks which image is displayed large
- `printImages` signal holds sorted array (by `DisplayOrder`)
- Clicking a thumbnail updates `selectedImage`
- Thumbnail strip only renders if `images.length > 1`
- Fixed thumbnail size (64x64px)
- Selected thumbnail: 2px accent color border
- Default thumbnail: small star icon overlay (top-right corner)
- Hover: subtle scale or brightness effect

### EditPrintDetail

```
┌─────────────────────────────────────┐
│                                     │
│          Main Image Display         │
│       (drop zone for uploads)       │
│                                     │
├─────────────────────────────────────┤
│ [img1] [img2] [img3★] [+]           │
│   ▲      ✕      ✕                   │
│ border  delete hover                │
└─────────────────────────────────────┘
```

- Same base styling as view mode
- Delete button (✕) appears on hover over each thumbnail
- Draggable thumbnails for reorder
- `[+]` button at end opens file picker (multi-select enabled)
- Star icon button on hover to set as default
- Entire main image area accepts file drops
- Visual feedback on drag-over (dashed border, "Drop images here")
- When at 5 images, hide `[+]` button and disable drop zone
- Show message: "Maximum 5 images reached"

### Single Image Behavior

- If only 1 image exists, show it full size with no thumbnail strip
- Matches current behavior for backwards compatibility

## Error Handling

### Upload Errors

- File too large: Show toast "Image exceeds maximum size"
- Invalid file type: Show toast "Only image files are allowed"
- Network failure: Show toast with retry option
- Limit exceeded: Prevent upload, show "Maximum 5 images reached"
- Partial batch failure: Upload what succeeded, report failures

### Reorder Errors

- Network failure: Revert to previous order, show error toast
- Optimistic UI: update order immediately, rollback on failure

### Delete Errors

- Network failure: Restore thumbnail, show error toast
- Default auto-promotion happens server-side, UI refreshes

### State Consistency

- Form dirty state tracks image changes (adds, deletes, reorders)
- Cancel/navigate away warns if unsaved image changes exist

### Empty State

- No images: Show placeholder with "Add images" prompt and drop zone

## Testing Strategy

### API Unit Tests

- Reorder endpoint: validates ownership, handles invalid IDs, updates atomically
- Upload: enforces 5-image limit, assigns correct DisplayOrder
- Delete: auto-promotes default correctly, handles last image deletion
- Authorization: only print owner can modify images

### UI Unit Tests

- Thumbnail strip renders correct number of images
- Selected state updates on thumbnail click
- Default star displays on correct thumbnail
- Drag-and-drop reorder updates FormArray order
- File picker accepts multiple files
- Limit enforcement hides add button at 5 images

## Future Considerations

- Tier-based image limits (e.g., paid membership allows more images)
- Image captions/descriptions
- Image cropping/rotation tools
