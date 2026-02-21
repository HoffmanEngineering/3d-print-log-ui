# Multi-Image Support Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enable prints to have up to 5 images with drag-and-drop reordering and thumbnail strip display.

**Architecture:** Add `DisplayOrder` field to PrintImage entity. Create reorder endpoint. Update UI components with thumbnail strip using Angular CDK drag-drop (already in use for filaments).

**Tech Stack:** .NET 6 API, Angular 20, Angular CDK Drag-Drop, Azure Blob Storage

**Design Document:** `docs/plans/2026-02-03-multi-image-design.md`

---

## Phase 1: API Data Model

### Task 1: Add DisplayOrder to PrintImage Entity

**Files:**

- Modify: `C:/Users/cshHo/Development/3D Print Log Api/PrintLogApi/Models/PrintImage.cs`

**Step 1: Add DisplayOrder property**

```csharp
// Add after IsDefault property (around line 17)
public int DisplayOrder { get; set; }
```

**Step 2: Save file**

---

### Task 2: Update PrintImageDto

**Files:**

- Modify: `C:/Users/cshHo/Development/3D Print Log Api/PrintLogApi/Models/DTOs/Print/PrintImageDto.cs`

**Step 1: Add DisplayOrder property**

```csharp
public class PrintImageDto
{
    public int Id { get; set; }
    public bool IsDefault { get; set; }
    public int DisplayOrder { get; set; }
}
```

**Step 2: Save file**

---

### Task 3: Update AutoMapper Profile

**Files:**

- Modify: `C:/Users/cshHo/Development/3D Print Log Api/PrintLogApi/Profiles/PrintImageProfile.cs`

**Step 1: Add DisplayOrder mapping**

```csharp
public class PrintImageProfile : Profile
{
    public PrintImageProfile()
    {
        CreateMap<PrintImage, PrintImageDto>()
            .ForMember(dest => dest.Id, opt => opt.MapFrom(src => src.Id))
            .ForMember(dest => dest.IsDefault, opt => opt.MapFrom(src => src.IsDefault))
            .ForMember(dest => dest.DisplayOrder, opt => opt.MapFrom(src => src.DisplayOrder));

        CreateMap<PrintImageDto, PrintImage>();
    }
}
```

**Step 2: Save file**

---

### Task 4: Create Database Migration

**Step 1: Run migration command**

```bash
cd "C:/Users/cshHo/Development/3D Print Log Api/PrintLogApi"
dotnet ef migrations add AddDisplayOrderToPrintImage
```

**Step 2: Verify migration was created in Migrations folder**

**Step 3: Review the generated migration file to ensure it adds DisplayOrder column with default value 0**

---

### Task 5: Commit API Data Model Changes

```bash
cd "C:/Users/cshHo/Development/3D Print Log Api"
git add -A
git commit -m "feat: add DisplayOrder field to PrintImage entity"
```

---

## Phase 2: API Endpoint Updates

### Task 6: Create ReorderImagesDto

**Files:**

- Create: `C:/Users/cshHo/Development/3D Print Log Api/PrintLogApi/Models/DTOs/Print/ReorderImagesDto.cs`

**Step 1: Create the DTO file**

```csharp
namespace PrintLogApi.Models.DTOs.Print
{
    public class ReorderImagesDto
    {
        public List<ImageOrderDto> Images { get; set; }
    }

    public class ImageOrderDto
    {
        public int ImageId { get; set; }
        public int DisplayOrder { get; set; }
    }
}
```

**Step 2: Save file**

---

### Task 7: Add Reorder Endpoint to PrintsController

**Files:**

- Modify: `C:/Users/cshHo/Development/3D Print Log Api/PrintLogApi/Controllers/PrintsController.cs`

**Step 1: Add reorder endpoint after SetImageAsDefault method (around line 505)**

```csharp
[HttpPut("{printId}/images/reorder")]
public async Task<ActionResult> ReorderImages(long printId, [FromBody] ReorderImagesDto reorderDto)
{
    var userId = User.GetUserId();
    var print = await _context.Prints
        .Include(p => p.Images)
        .FirstOrDefaultAsync(p => p.Id == printId);

    if (print == null)
    {
        return NotFound();
    }

    if (print.CreatedById != userId)
    {
        return Forbid();
    }

    // Validate all image IDs belong to this print
    var printImageIds = print.Images.Select(i => i.Id).ToHashSet();
    var requestedIds = reorderDto.Images.Select(i => i.ImageId).ToHashSet();

    if (!requestedIds.SetEquals(printImageIds))
    {
        return BadRequest("Image IDs do not match print images");
    }

    // Update display order for each image
    foreach (var imageOrder in reorderDto.Images)
    {
        var image = print.Images.First(i => i.Id == imageOrder.ImageId);
        image.DisplayOrder = imageOrder.DisplayOrder;
    }

    await _context.SaveChangesAsync();

    return Ok();
}
```

**Step 2: Add using statement if not present**

```csharp
using PrintLogApi.Models.DTOs.Print;
```

**Step 3: Save file**

---

### Task 8: Update PostImage to Assign DisplayOrder and Enforce Limit

**Files:**

- Modify: `C:/Users/cshHo/Development/3D Print Log Api/PrintLogApi/Controllers/PrintsController.cs`

**Step 1: Find PostImage method (around line 514)**

**Step 2: Add image limit check after ownership validation (around line 530)**

```csharp
// Check image limit (max 5 images per print)
var existingImageCount = await _context.PrintImages.CountAsync(pi => pi.PrintId == id);
if (existingImageCount >= 5)
{
    return BadRequest("Maximum of 5 images per print allowed");
}
```

**Step 3: Calculate DisplayOrder when creating PrintImage (around line 560)**

```csharp
// Calculate next display order
var maxDisplayOrder = await _context.PrintImages
    .Where(pi => pi.PrintId == id)
    .MaxAsync(pi => (int?)pi.DisplayOrder) ?? -1;

var printImage = new PrintImage
{
    PrintId = id,
    FileId = file.Id,
    IsDefault = isDefault,
    DisplayOrder = maxDisplayOrder + 1  // Add this line
};
```

**Step 4: Save file**

---

### Task 9: Update RemoveImage to Handle Default Promotion

**Files:**

- Modify: `C:/Users/cshHo/Development/3D Print Log Api/PrintLogApi/Controllers/PrintsController.cs`

**Step 1: Find RemoveImage method (around line 594)**

**Step 2: Replace the method with updated logic**

```csharp
[HttpDelete("{printid}/image/{imageId}")]
public async Task<ActionResult> RemoveImage(long printid, int imageId)
{
    var userId = User.GetUserId();
    var print = await _context.Prints
        .Include(p => p.Images)
        .FirstOrDefaultAsync(p => p.Id == printid);

    if (print == null)
    {
        return NotFound();
    }

    if (print.CreatedById != userId)
    {
        return Forbid();
    }

    var imageToDelete = print.Images.FirstOrDefault(i => i.Id == imageId);
    if (imageToDelete == null)
    {
        return NotFound("Image not found");
    }

    var wasDefault = imageToDelete.IsDefault;
    var deletedOrder = imageToDelete.DisplayOrder;

    _context.PrintImages.Remove(imageToDelete);

    // If deleted image was default, promote next image by DisplayOrder
    if (wasDefault)
    {
        var nextDefault = print.Images
            .Where(i => i.Id != imageId)
            .OrderBy(i => i.DisplayOrder)
            .FirstOrDefault();

        if (nextDefault != null)
        {
            nextDefault.IsDefault = true;
        }
    }

    await _context.SaveChangesAsync();

    return Ok();
}
```

**Step 3: Save file**

---

### Task 10: Update Print Queries to Order Images

**Files:**

- Modify: `C:/Users/cshHo/Development/3D Print Log Api/PrintLogApi/Controllers/PrintsController.cs`

**Step 1: Find GetPrint method and ensure images are ordered by DisplayOrder**

Search for `.Include(p => p.Images)` and add `.ThenBy` ordering:

```csharp
.Include(p => p.Images.OrderBy(i => i.DisplayOrder))
```

**Step 2: Apply same ordering to any other queries that include Images**

**Step 3: Save file**

---

### Task 11: Commit API Endpoint Changes

```bash
cd "C:/Users/cshHo/Development/3D Print Log Api"
git add -A
git commit -m "feat: add reorder endpoint and update image upload/delete logic"
```

---

## Phase 3: UI Service Updates

### Task 12: Update PrintImage Interface

**Files:**

- Modify: `C:/Users/cshHo/Development/3D Print Log Ui/src/app/core/services/print.service.ts`

**Step 1: Find PrintImage interface (around line 47)**

**Step 2: Add displayOrder property**

```typescript
export interface PrintImage {
  id: number;
  isDefault: boolean;
  displayOrder: number; // Add this line
  url?: string;
}
```

**Step 3: Save file**

---

### Task 13: Add Reorder Method to PrintService

**Files:**

- Modify: `C:/Users/cshHo/Development/3D Print Log Ui/src/app/core/services/print.service.ts`

**Step 1: Add reorderImages method after deleteImage (around line 495)**

```typescript
reorderImages(
  printId: number,
  images: { imageId: number; displayOrder: number }[]
): Observable<void> {
  return this.http.put<void>(
    `${environment.printLogApiUrl}/api/Prints/${printId}/images/reorder`,
    { images }
  );
}
```

**Step 2: Save file**

---

### Task 14: Commit UI Service Changes

```bash
cd "C:/Users/cshHo/Development/3D Print Log Ui"
git add src/app/core/services/print.service.ts
git commit -m "feat: add displayOrder to PrintImage and reorderImages method"
```

---

## Phase 4: Thumbnail Strip Component

### Task 15: Create ImageThumbnailStripComponent

**Files:**

- Create: `C:/Users/cshHo/Development/3D Print Log Ui/src/app/shared/image-thumbnail-strip/image-thumbnail-strip.component.ts`
- Create: `C:/Users/cshHo/Development/3D Print Log Ui/src/app/shared/image-thumbnail-strip/image-thumbnail-strip.component.html`
- Create: `C:/Users/cshHo/Development/3D Print Log Ui/src/app/shared/image-thumbnail-strip/image-thumbnail-strip.component.scss`

**Step 1: Create component TypeScript file**

```typescript
import { Component, ChangeDetectionStrategy, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';

export interface ThumbnailImage {
  id?: number;
  url?: string;
  isDefault: boolean;
  displayOrder: number;
}

@Component({
  selector: 'app-image-thumbnail-strip',
  templateUrl: './image-thumbnail-strip.component.html',
  styleUrls: ['./image-thumbnail-strip.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule, MatButtonModule, DragDropModule],
})
export class ImageThumbnailStripComponent {
  images = input.required<ThumbnailImage[]>();
  selectedId = input<number | undefined>();
  editable = input(false);
  maxImages = input(5);

  imageSelected = output<ThumbnailImage>();
  imageDeleted = output<ThumbnailImage>();
  defaultChanged = output<ThumbnailImage>();
  imagesReordered = output<ThumbnailImage[]>();
  addClicked = output<void>();

  canAddMore = computed(() => this.images().length < this.maxImages());

  onThumbnailClick(image: ThumbnailImage): void {
    this.imageSelected.emit(image);
  }

  onDeleteClick(event: Event, image: ThumbnailImage): void {
    event.stopPropagation();
    this.imageDeleted.emit(image);
  }

  onSetDefaultClick(event: Event, image: ThumbnailImage): void {
    event.stopPropagation();
    this.defaultChanged.emit(image);
  }

  onAddClick(): void {
    this.addClicked.emit();
  }

  onDrop(event: CdkDragDrop<ThumbnailImage[]>): void {
    if (!this.editable()) return;

    const images = [...this.images()];
    moveItemInArray(images, event.previousIndex, event.currentIndex);

    // Update displayOrder based on new positions
    const reordered = images.map((img, index) => ({
      ...img,
      displayOrder: index,
    }));

    this.imagesReordered.emit(reordered);
  }
}
```

**Step 2: Create component HTML template**

```html
<div class="thumbnail-strip" [class.editable]="editable()">
  @if (images().length > 1 || editable()) {
  <div class="thumbnails" [cdkDropListDisabled]="!editable()" cdkDropList cdkDropListOrientation="horizontal" (cdkDropListDropped)="onDrop($event)">
    @for (image of images(); track image.id ?? $index) {
    <div class="thumbnail" [class.selected]="image.id === selectedId()" [class.is-default]="image.isDefault" [cdkDragDisabled]="!editable()" cdkDrag (click)="onThumbnailClick(image)">
      @if (image.url) {
      <img [src]="image.url" alt="Print thumbnail" />
      } @else {
      <div class="placeholder">
        <mat-icon>image</mat-icon>
      </div>
      } @if (image.isDefault) {
      <mat-icon class="default-star">star</mat-icon>
      } @if (editable()) {
      <div class="hover-actions">
        @if (!image.isDefault) {
        <button mat-icon-button class="set-default-btn" (click)="onSetDefaultClick($event, image)" title="Set as default">
          <mat-icon>star_border</mat-icon>
        </button>
        }
        <button mat-icon-button class="delete-btn" (click)="onDeleteClick($event, image)" title="Delete image">
          <mat-icon>close</mat-icon>
        </button>
      </div>
      }
    </div>
    } @if (editable() && canAddMore()) {
    <button class="add-button" mat-stroked-button (click)="onAddClick()">
      <mat-icon>add</mat-icon>
    </button>
    }
  </div>

  @if (editable() && !canAddMore()) {
  <div class="limit-message">Maximum {{ maxImages() }} images reached</div>
  } }
</div>
```

**Step 3: Create component SCSS styles**

```scss
.thumbnail-strip {
  margin-top: 8px;
}

.thumbnails {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 4px;
}

.thumbnail {
  position: relative;
  width: 64px;
  height: 64px;
  border-radius: 4px;
  overflow: hidden;
  cursor: pointer;
  border: 2px solid transparent;
  flex-shrink: 0;
  background: #f5f5f5;

  &:hover {
    transform: scale(1.05);
  }

  &.selected {
    border-color: #3f51b5;
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #999;
  }

  .default-star {
    position: absolute;
    top: 2px;
    right: 2px;
    font-size: 16px;
    width: 16px;
    height: 16px;
    color: #ffc107;
    background: rgba(0, 0, 0, 0.5);
    border-radius: 50%;
    padding: 2px;
  }

  .hover-actions {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.6);
    display: none;
    align-items: center;
    justify-content: center;
    gap: 4px;

    button {
      color: white;
      transform: scale(0.8);
    }

    .delete-btn:hover {
      color: #f44336;
    }

    .set-default-btn:hover {
      color: #ffc107;
    }
  }

  &:hover .hover-actions {
    display: flex;
  }
}

.editable .thumbnail {
  cursor: grab;

  &:active {
    cursor: grabbing;
  }
}

.add-button {
  width: 64px;
  height: 64px;
  flex-shrink: 0;
}

.limit-message {
  font-size: 12px;
  color: #666;
  margin-top: 4px;
}

// CDK drag-drop styles
.cdk-drag-preview {
  border-radius: 4px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
}

.cdk-drag-placeholder {
  opacity: 0.3;
}

.cdk-drag-animating {
  transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
}
```

**Step 4: Save all files**

---

### Task 16: Create ImageThumbnailStrip Unit Test

**Files:**

- Create: `C:/Users/cshHo/Development/3D Print Log Ui/src/app/shared/image-thumbnail-strip/image-thumbnail-strip.component.spec.ts`

**Step 1: Create test file**

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ImageThumbnailStripComponent, ThumbnailImage } from './image-thumbnail-strip.component';

describe('ImageThumbnailStripComponent', () => {
  let component: ImageThumbnailStripComponent;
  let fixture: ComponentFixture<ImageThumbnailStripComponent>;

  const mockImages: ThumbnailImage[] = [
    { id: 1, url: 'data:image/png;base64,abc', isDefault: true, displayOrder: 0 },
    { id: 2, url: 'data:image/png;base64,def', isDefault: false, displayOrder: 1 },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ImageThumbnailStripComponent, NoopAnimationsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(ImageThumbnailStripComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('images', mockImages);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render thumbnails for each image', () => {
    const thumbnails = fixture.nativeElement.querySelectorAll('.thumbnail');
    expect(thumbnails.length).toBe(2);
  });

  it('should show star icon on default image', () => {
    const star = fixture.nativeElement.querySelector('.default-star');
    expect(star).toBeTruthy();
  });

  it('should emit imageSelected when thumbnail clicked', () => {
    const spy = spyOn(component.imageSelected, 'emit');
    const thumbnail = fixture.nativeElement.querySelector('.thumbnail');
    thumbnail.click();
    expect(spy).toHaveBeenCalledWith(mockImages[0]);
  });

  it('should hide add button when at max images', () => {
    fixture.componentRef.setInput('editable', true);
    fixture.componentRef.setInput('maxImages', 2);
    fixture.detectChanges();
    const addButton = fixture.nativeElement.querySelector('.add-button');
    expect(addButton).toBeFalsy();
  });

  it('should show add button when below max images', () => {
    fixture.componentRef.setInput('editable', true);
    fixture.componentRef.setInput('maxImages', 5);
    fixture.detectChanges();
    const addButton = fixture.nativeElement.querySelector('.add-button');
    expect(addButton).toBeTruthy();
  });
});
```

**Step 2: Run tests**

```bash
cd "C:/Users/cshHo/Development/3D Print Log Ui"
npm test -- --include=**/image-thumbnail-strip.component.spec.ts
```

**Step 3: Verify tests pass**

---

### Task 17: Export ImageThumbnailStripComponent from SharedModule

**Files:**

- Modify: `C:/Users/cshHo/Development/3D Print Log Ui/src/app/shared/shared.module.ts`

**Step 1: Add import statement**

```typescript
import { ImageThumbnailStripComponent } from './image-thumbnail-strip/image-thumbnail-strip.component';
```

**Step 2: Add to exports array**

```typescript
exports: [
  // ... existing exports
  ImageThumbnailStripComponent,
],
```

**Step 3: Save file**

---

### Task 18: Commit Thumbnail Strip Component

```bash
cd "C:/Users/cshHo/Development/3D Print Log Ui"
git add src/app/shared/image-thumbnail-strip/
git add src/app/shared/shared.module.ts
git commit -m "feat: add ImageThumbnailStripComponent for multi-image display"
```

---

## Phase 5: ViewPrintDetail Updates

### Task 19: Update PrintImageValue Interface in ViewPrintDetail

**Files:**

- Modify: `C:/Users/cshHo/Development/3D Print Log Ui/src/app/print/view-print-detail/view-print-detail.component.ts`

**Step 1: Find PrintImageValue interface (around line 22)**

**Step 2: Add displayOrder property**

```typescript
export interface PrintImageValue {
  id?: number;
  url?: string;
  file?: File;
  isDefault: boolean;
  displayOrder: number; // Add this line
}
```

**Step 3: Save file**

---

### Task 20: Update ViewPrintDetail Image Initialization

**Files:**

- Modify: `C:/Users/cshHo/Development/3D Print Log Ui/src/app/print/view-print-detail/view-print-detail.component.ts`

**Step 1: Find image initialization in ngOnInit (around line 82-97)**

**Step 2: Update to include displayOrder and sort by it**

```typescript
if (this.print.images) {
  this.printImages = this.print.images
    .map((image) => ({
      id: image.id,
      isDefault: image.isDefault,
      displayOrder: image.displayOrder,
    }))
    .sort((a, b) => a.displayOrder - b.displayOrder);

  this.selectedImage = this.printImages.find((i) => i.isDefault) || this.printImages[0];
}
```

**Step 3: Save file**

---

### Task 21: Add ImageThumbnailStrip Import to ViewPrintDetail

**Files:**

- Modify: `C:/Users/cshHo/Development/3D Print Log Ui/src/app/print/view-print-detail/view-print-detail.component.ts`

**Step 1: Add import statement**

```typescript
import { ImageThumbnailStripComponent } from '../../shared/image-thumbnail-strip/image-thumbnail-strip.component';
```

**Step 2: Add to component imports array**

```typescript
imports: [
  // ... existing imports
  ImageThumbnailStripComponent,
],
```

**Step 3: Save file**

---

### Task 22: Update ViewPrintDetail Template

**Files:**

- Modify: `C:/Users/cshHo/Development/3D Print Log Ui/src/app/print/view-print-detail/view-print-detail.component.html`

**Step 1: Find the print-image component (around line 30-41)**

**Step 2: Add thumbnail strip below the main image**

```html
<!-- After closing </mat-card-content> for the main image -->
<app-image-thumbnail-strip [images]="printImages" [selectedId]="selectedImage?.id" (imageSelected)="onImageSelected($event)" />
```

**Step 3: Save file**

---

### Task 23: Add onImageSelected Method to ViewPrintDetail

**Files:**

- Modify: `C:/Users/cshHo/Development/3D Print Log Ui/src/app/print/view-print-detail/view-print-detail.component.ts`

**Step 1: Add method to handle image selection**

```typescript
onImageSelected(image: PrintImageValue): void {
  this.selectedImage = image;
}
```

**Step 2: Save file**

---

### Task 24: Update ViewPrintDetail Unit Test

**Files:**

- Modify: `C:/Users/cshHo/Development/3D Print Log Ui/src/app/print/view-print-detail/view-print-detail.component.spec.ts`

**Step 1: Add test for thumbnail strip rendering**

```typescript
it('should render thumbnail strip when multiple images exist', () => {
  // Update mock data to include multiple images with displayOrder
  // Verify ImageThumbnailStripComponent renders
});
```

**Step 2: Run tests and verify**

```bash
npm test -- --include=**/view-print-detail.component.spec.ts
```

---

### Task 25: Commit ViewPrintDetail Changes

```bash
cd "C:/Users/cshHo/Development/3D Print Log Ui"
git add src/app/print/view-print-detail/
git commit -m "feat: add thumbnail strip to ViewPrintDetail component"
```

---

## Phase 6: EditPrintDetail Updates

### Task 26: Update PrintImageValue Interface in EditPrintDetail

**Files:**

- Modify: `C:/Users/cshHo/Development/3D Print Log Ui/src/app/print/edit-print-detail/edit-print-detail.component.ts`

**Step 1: Find PrintImageValue interface (around line 61)**

**Step 2: Add displayOrder property**

```typescript
export interface PrintImageValue {
  id?: number;
  url?: string;
  file?: File;
  isDefault: boolean;
  displayOrder: number; // Add this line
}
```

**Step 3: Save file**

---

### Task 27: Add ImageThumbnailStrip Import to EditPrintDetail

**Files:**

- Modify: `C:/Users/cshHo/Development/3D Print Log Ui/src/app/print/edit-print-detail/edit-print-detail.component.ts`

**Step 1: Add import statement**

```typescript
import { ImageThumbnailStripComponent, ThumbnailImage } from '../../shared/image-thumbnail-strip/image-thumbnail-strip.component';
```

**Step 2: Add to component imports array**

**Step 3: Save file**

---

### Task 28: Update EditPrintDetail Form Building

**Files:**

- Modify: `C:/Users/cshHo/Development/3D Print Log Ui/src/app/print/edit-print-detail/edit-print-detail.component.ts`

**Step 1: Find buildFormFromPrintDetail method (around line 725)**

**Step 2: Update image form control creation to include displayOrder**

```typescript
// When creating image form controls, include displayOrder
const imageControl = this.createItem({
  id: image.id,
  url: undefined,
  isDefault: image.isDefault,
  displayOrder: image.displayOrder,
});
```

**Step 3: Save file**

---

### Task 29: Update detectFiles to Assign DisplayOrder

**Files:**

- Modify: `C:/Users/cshHo/Development/3D Print Log Ui/src/app/print/edit-print-detail/edit-print-detail.component.ts`

**Step 1: Find detectFiles method (around line 999)**

**Step 2: Update to assign displayOrder to new images**

```typescript
reader.onload = (e: any) => {
  const maxOrder = this.images.controls.reduce((max, ctrl) => Math.max(max, ctrl.value.displayOrder ?? -1), -1);

  const newItem = this.createItem({
    file,
    url: e.target.result,
    isDefault: this.images.length === 0, // First image is default
    displayOrder: maxOrder + 1,
  });
  // ... rest of method
};
```

**Step 3: Save file**

---

### Task 30: Add Image Reorder Handler

**Files:**

- Modify: `C:/Users/cshHo/Development/3D Print Log Ui/src/app/print/edit-print-detail/edit-print-detail.component.ts`

**Step 1: Add reorder handler method**

```typescript
onImagesReordered(reorderedImages: ThumbnailImage[]): void {
  // Update form array to match new order
  const controls = [...this.images.controls];

  // Clear and re-add in new order
  while (this.images.length) {
    this.images.removeAt(0);
  }

  for (const img of reorderedImages) {
    const control = controls.find((c) => c.value.id === img.id);
    if (control) {
      control.patchValue({ displayOrder: img.displayOrder });
      this.images.push(control);
    }
  }

  this.images.markAsDirty();
}
```

**Step 2: Save file**

---

### Task 31: Add Set Default Handler

**Files:**

- Modify: `C:/Users/cshHo/Development/3D Print Log Ui/src/app/print/edit-print-detail/edit-print-detail.component.ts`

**Step 1: Update setAsDefault method or add new handler**

```typescript
onDefaultChanged(image: ThumbnailImage): void {
  // Clear existing default
  this.images.controls.forEach((ctrl) => {
    if (ctrl.value.isDefault) {
      ctrl.patchValue({ isDefault: false });
    }
  });

  // Set new default
  const control = this.images.controls.find((c) => c.value.id === image.id);
  if (control) {
    control.patchValue({ isDefault: true });
    this.selectedImage = control;
  }

  this.images.markAsDirty();
}
```

**Step 2: Save file**

---

### Task 32: Add Delete Handler

**Files:**

- Modify: `C:/Users/cshHo/Development/3D Print Log Ui/src/app/print/edit-print-detail/edit-print-detail.component.ts`

**Step 1: Update or add delete handler**

```typescript
onImageDeleted(image: ThumbnailImage): void {
  const index = this.images.controls.findIndex((c) => c.value.id === image.id);
  if (index === -1) return;

  const control = this.images.at(index);
  const wasDefault = control.value.isDefault;

  // Track for API deletion if existing image
  if (control.value.id) {
    this.imageIdsToDelete.push(control.value.id);
  }

  this.images.removeAt(index);

  // If deleted was default, promote next image
  if (wasDefault && this.images.length > 0) {
    const nextDefault = this.images.at(0);
    nextDefault.patchValue({ isDefault: true });
    this.selectedImage = nextDefault;
  } else if (this.images.length === 0) {
    this.selectedImage = null;
  }

  this.images.markAsDirty();
}
```

**Step 2: Save file**

---

### Task 33: Add Drag-and-Drop Zone to Main Image Area

**Files:**

- Modify: `C:/Users/cshHo/Development/3D Print Log Ui/src/app/print/edit-print-detail/edit-print-detail.component.ts`

**Step 1: Add drag-over state property**

```typescript
public isDragOver = false;
```

**Step 2: Add drag event handlers**

```typescript
onDragOver(event: DragEvent): void {
  event.preventDefault();
  event.stopPropagation();
  this.isDragOver = true;
}

onDragLeave(event: DragEvent): void {
  event.preventDefault();
  event.stopPropagation();
  this.isDragOver = false;
}

onFileDrop(event: DragEvent): void {
  event.preventDefault();
  event.stopPropagation();
  this.isDragOver = false;

  const files = event.dataTransfer?.files;
  if (files) {
    this.processDroppedFiles(files);
  }
}

private processDroppedFiles(files: FileList): void {
  const currentCount = this.images.length;
  const maxAllowed = 5 - currentCount;

  if (maxAllowed <= 0) {
    this.toastr.warning('Maximum 5 images allowed', 'Limit Reached');
    return;
  }

  const filesToProcess = Array.from(files).slice(0, maxAllowed);

  for (const file of filesToProcess) {
    if (!file.type.match(/image.*/)) {
      this.toastr.error(`${file.name} is not an image`, 'Invalid File');
      continue;
    }

    const reader = new FileReader();
    reader.onload = (e: any) => {
      const maxOrder = this.images.controls.reduce(
        (max, ctrl) => Math.max(max, ctrl.value.displayOrder ?? -1),
        -1
      );

      const newItem = this.createItem({
        file,
        url: e.target.result,
        isDefault: this.images.length === 0,
        displayOrder: maxOrder + 1,
      });
      newItem.markAllAsTouched();
      newItem.markAsDirty();
      this.images.push(newItem);

      if (!this.selectedImage) {
        this.selectedImage = newItem;
      }
    };
    reader.readAsDataURL(file);
  }
}
```

**Step 3: Save file**

---

### Task 34: Update EditPrintDetail Template for Thumbnail Strip

**Files:**

- Modify: `C:/Users/cshHo/Development/3D Print Log Ui/src/app/print/edit-print-detail/edit-print-detail.component.html`

**Step 1: Find the main image section**

**Step 2: Add drag-and-drop zone wrapper and thumbnail strip**

```html
<!-- Wrap main image area with drop zone -->
<div class="image-drop-zone" [class.drag-over]="isDragOver" (dragover)="onDragOver($event)" (dragleave)="onDragLeave($event)" (drop)="onFileDrop($event)">
  @if (isDragOver) {
  <div class="drop-overlay">
    <mat-icon>cloud_upload</mat-icon>
    <span>Drop images here</span>
  </div>
  }

  <!-- Existing main image display -->
  <app-print-image [printId]="print?.id" [imageId]="selectedImage?.value?.id" [imageData]="selectedImage?.value?.url" (imageDataChange)="selectedImage?.patchValue({ url: $event })" />
</div>

<!-- Add thumbnail strip below -->
<app-image-thumbnail-strip [images]="getImagesForStrip()" [selectedId]="selectedImage?.value?.id" [editable]="true" [maxImages]="5" (imageSelected)="onThumbnailSelected($event)" (imageDeleted)="onImageDeleted($event)" (defaultChanged)="onDefaultChanged($event)" (imagesReordered)="onImagesReordered($event)" (addClicked)="fileInput.click()" />

<!-- Update file input to accept multiple -->
<input type="file" #fileInput (change)="detectFiles($event)" accept="image/*" multiple style="display: none" />
```

**Step 3: Save file**

---

### Task 35: Add Helper Method for Thumbnail Strip

**Files:**

- Modify: `C:/Users/cshHo/Development/3D Print Log Ui/src/app/print/edit-print-detail/edit-print-detail.component.ts`

**Step 1: Add helper method to convert form controls to ThumbnailImage array**

```typescript
getImagesForStrip(): ThumbnailImage[] {
  return this.images.controls
    .map((ctrl) => ({
      id: ctrl.value.id,
      url: ctrl.value.url,
      isDefault: ctrl.value.isDefault,
      displayOrder: ctrl.value.displayOrder,
    }))
    .sort((a, b) => a.displayOrder - b.displayOrder);
}

onThumbnailSelected(image: ThumbnailImage): void {
  const control = this.images.controls.find((c) => c.value.id === image.id);
  if (control) {
    this.selectedImage = control;
  }
}
```

**Step 2: Save file**

---

### Task 36: Add Drop Zone Styles

**Files:**

- Modify: `C:/Users/cshHo/Development/3D Print Log Ui/src/app/print/edit-print-detail/edit-print-detail.component.scss`

**Step 1: Add drop zone styles**

```scss
.image-drop-zone {
  position: relative;
  border: 2px dashed transparent;
  border-radius: 4px;
  transition: border-color 0.2s;

  &.drag-over {
    border-color: #3f51b5;
  }

  .drop-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(63, 81, 181, 0.9);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: white;
    z-index: 10;
    border-radius: 4px;

    mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      margin-bottom: 8px;
    }
  }
}
```

**Step 2: Save file**

---

### Task 37: Update Form Submission to Handle Reorder

**Files:**

- Modify: `C:/Users/cshHo/Development/3D Print Log Ui/src/app/print/edit-print-detail/edit-print-detail.component.ts`

**Step 1: Find form submission method (around line 1087)**

**Step 2: Add reorder API call after successful save**

```typescript
// After uploading new images, call reorder if order changed
const imagesToReorder = this.images.controls
  .filter((c) => c.value.id) // Only existing images
  .map((c) => ({
    imageId: c.value.id,
    displayOrder: c.value.displayOrder,
  }));

if (imagesToReorder.length > 0) {
  this.printService.reorderImages(printId, imagesToReorder).subscribe();
}
```

**Step 3: Save file**

---

### Task 38: Update EditPrintDetail Unit Test

**Files:**

- Modify: `C:/Users/cshHo/Development/3D Print Log Ui/src/app/print/edit-print-detail/edit-print-detail.component.spec.ts`

**Step 1: Add tests for new functionality**

```typescript
describe('Image Management', () => {
  it('should add dropped files to images array', () => {
    // Test drag-and-drop functionality
  });

  it('should enforce 5 image limit', () => {
    // Test limit enforcement
  });

  it('should reorder images on drag-and-drop', () => {
    // Test reorder functionality
  });

  it('should promote next image when default is deleted', () => {
    // Test default promotion
  });
});
```

**Step 2: Run tests**

```bash
npm test -- --include=**/edit-print-detail.component.spec.ts
```

---

### Task 39: Commit EditPrintDetail Changes

```bash
cd "C:/Users/cshHo/Development/3D Print Log Ui"
git add src/app/print/edit-print-detail/
git commit -m "feat: add multi-image editing with drag-drop reorder and upload"
```

---

## Phase 7: Final Integration

### Task 40: Run All Tests

```bash
cd "C:/Users/cshHo/Development/3D Print Log Ui"
npm run test:ci
```

**Expected:** All tests pass

---

### Task 41: Run Linting

```bash
cd "C:/Users/cshHo/Development/3D Print Log Ui"
npm run lint:fix
```

**Expected:** No lint errors

---

### Task 42: Manual Testing Checklist

- [ ] Upload single image - displays correctly
- [ ] Upload multiple images - all appear in thumbnail strip
- [ ] Click thumbnail - main image updates
- [ ] Drag to reorder - order persists after save
- [ ] Set different default - star moves correctly
- [ ] Delete image - removed from strip
- [ ] Delete default image - next image promoted
- [ ] Drop files on main image area - files added
- [ ] Try to add 6th image - blocked with message
- [ ] View print detail - thumbnail strip shows correctly

---

### Task 43: Final Commit

```bash
cd "C:/Users/cshHo/Development/3D Print Log Ui"
git add -A
git commit -m "feat: complete multi-image support implementation"
```

---

## Summary

| Phase | Tasks | Description                                             |
| ----- | ----- | ------------------------------------------------------- |
| 1     | 1-5   | API data model (entity, DTO, migration)                 |
| 2     | 6-11  | API endpoints (reorder, upload limit, delete promotion) |
| 3     | 12-14 | UI service updates                                      |
| 4     | 15-18 | Thumbnail strip component                               |
| 5     | 19-25 | ViewPrintDetail integration                             |
| 6     | 26-39 | EditPrintDetail integration                             |
| 7     | 40-43 | Testing and final integration                           |

Total: 43 tasks
