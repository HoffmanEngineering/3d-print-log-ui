# Image Carousel Navigation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add left/right arrow navigation and swipe gestures to the main image display in ViewPrintDetail and EditPrintDetail.

**Architecture:** A new standalone `ImageCarouselComponent` wraps the existing main image area using `ng-content` (content projection), adding arrow buttons and touch swipe support without touching `PrintImageComponent`. The carousel manages navigation state; parents own image data and rendering. This avoids module boundary issues since `PrintImageComponent` is not standalone.

**Tech Stack:** Angular 20 signals, Angular Material icon buttons, native TouchEvent API (no swipe library needed).

---

## Deviation from Design Doc

The approved design had `images: PrintImageValue[]` and `printId: number` inputs and rendered `app-print-image` internally. In practice, `PrintImageComponent` has `standalone: false`, so a standalone carousel cannot import it. Instead the carousel uses `ng-content` for the image slot and takes `imageCount: number` (instead of the full array) since only the count is needed for arrow visibility. The `imageDataChange` output is dropped — parents handle it directly from `app-print-image` as before.

---

## Task 1: Create ImageCarouselComponent

**Files:**

- Create: `src/app/shared/image-carousel/image-carousel.component.ts`
- Create: `src/app/shared/image-carousel/image-carousel.component.html`
- Create: `src/app/shared/image-carousel/image-carousel.component.scss`
- Create: `src/app/shared/image-carousel/image-carousel.component.spec.ts`

### Step 1: Write the failing tests

Create `src/app/shared/image-carousel/image-carousel.component.spec.ts`:

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ImageCarouselComponent } from './image-carousel.component';

describe('ImageCarouselComponent', () => {
  let component: ImageCarouselComponent;
  let fixture: ComponentFixture<ImageCarouselComponent>;

  function setup(imageCount: number, selectedIndex: number) {
    fixture.componentRef.setInput('imageCount', imageCount);
    fixture.componentRef.setInput('selectedIndex', selectedIndex);
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ImageCarouselComponent, NoopAnimationsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(ImageCarouselComponent);
    component = fixture.componentInstance;
    setup(3, 1);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('arrow visibility', () => {
    it('should show left arrow when selectedIndex > 0', () => {
      setup(3, 1);
      expect(fixture.nativeElement.querySelector('.nav-arrow--left')).toBeTruthy();
    });

    it('should hide left arrow at index 0', () => {
      setup(3, 0);
      expect(fixture.nativeElement.querySelector('.nav-arrow--left')).toBeFalsy();
    });

    it('should show right arrow when not at last image', () => {
      setup(3, 0);
      expect(fixture.nativeElement.querySelector('.nav-arrow--right')).toBeTruthy();
    });

    it('should hide right arrow at last image', () => {
      setup(3, 2);
      expect(fixture.nativeElement.querySelector('.nav-arrow--right')).toBeFalsy();
    });

    it('should hide both arrows with a single image', () => {
      setup(1, 0);
      expect(fixture.nativeElement.querySelector('.nav-arrow--left')).toBeFalsy();
      expect(fixture.nativeElement.querySelector('.nav-arrow--right')).toBeFalsy();
    });

    it('should hide both arrows with zero images', () => {
      setup(0, 0);
      expect(fixture.nativeElement.querySelector('.nav-arrow--left')).toBeFalsy();
      expect(fixture.nativeElement.querySelector('.nav-arrow--right')).toBeFalsy();
    });
  });

  describe('arrow click navigation', () => {
    it('should emit previous index when left arrow clicked', () => {
      setup(3, 2);
      const spy = spyOn(component.indexChange, 'emit');
      fixture.nativeElement.querySelector('.nav-arrow--left').click();
      expect(spy).toHaveBeenCalledWith(1);
    });

    it('should emit next index when right arrow clicked', () => {
      setup(3, 1);
      const spy = spyOn(component.indexChange, 'emit');
      fixture.nativeElement.querySelector('.nav-arrow--right').click();
      expect(spy).toHaveBeenCalledWith(2);
    });

    it('should not emit when prev() called at index 0', () => {
      setup(3, 0);
      const spy = spyOn(component.indexChange, 'emit');
      component.prev();
      expect(spy).not.toHaveBeenCalled();
    });

    it('should not emit when next() called at last index', () => {
      setup(3, 2);
      const spy = spyOn(component.indexChange, 'emit');
      component.next();
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('swipe gestures', () => {
    function swipe(startX: number, endX: number) {
      const container = fixture.nativeElement.querySelector('.carousel-container');
      container.dispatchEvent(
        new TouchEvent('touchstart', {
          touches: [{ clientX: startX } as Touch],
          bubbles: true,
        })
      );
      container.dispatchEvent(
        new TouchEvent('touchend', {
          changedTouches: [{ clientX: endX } as Touch],
          bubbles: true,
        })
      );
    }

    it('should navigate next on swipe left (delta >= 50px)', () => {
      setup(3, 1);
      const spy = spyOn(component.indexChange, 'emit');
      swipe(200, 100);
      expect(spy).toHaveBeenCalledWith(2);
    });

    it('should navigate prev on swipe right (delta >= 50px)', () => {
      setup(3, 1);
      const spy = spyOn(component.indexChange, 'emit');
      swipe(100, 200);
      expect(spy).toHaveBeenCalledWith(0);
    });

    it('should not navigate when swipe delta < 50px', () => {
      setup(3, 1);
      const spy = spyOn(component.indexChange, 'emit');
      swipe(100, 130);
      expect(spy).not.toHaveBeenCalled();
    });

    it('should not navigate past last image on swipe left', () => {
      setup(3, 2);
      const spy = spyOn(component.indexChange, 'emit');
      swipe(200, 100);
      expect(spy).not.toHaveBeenCalled();
    });

    it('should not navigate before first image on swipe right', () => {
      setup(3, 0);
      const spy = spyOn(component.indexChange, 'emit');
      swipe(100, 200);
      expect(spy).not.toHaveBeenCalled();
    });
  });
});
```

### Step 2: Run tests to confirm they fail

```bash
npm run test:brief -- --include=src/app/shared/image-carousel/image-carousel.component.spec.ts
```

Expected: compile error — `ImageCarouselComponent` not found.

### Step 3: Create the component

Create `src/app/shared/image-carousel/image-carousel.component.ts`:

```typescript
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-image-carousel',
  templateUrl: './image-carousel.component.html',
  styleUrls: ['./image-carousel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule, MatButtonModule],
})
export class ImageCarouselComponent {
  imageCount = input.required<number>();
  selectedIndex = input<number>(0);

  indexChange = output<number>();

  private touchStartX = 0;
  private readonly SWIPE_THRESHOLD = 50;

  prev(): void {
    if (this.selectedIndex() > 0) {
      this.indexChange.emit(this.selectedIndex() - 1);
    }
  }

  next(): void {
    if (this.selectedIndex() < this.imageCount() - 1) {
      this.indexChange.emit(this.selectedIndex() + 1);
    }
  }

  onTouchStart(event: TouchEvent): void {
    this.touchStartX = event.touches[0].clientX;
  }

  onTouchEnd(event: TouchEvent): void {
    const delta = event.changedTouches[0].clientX - this.touchStartX;
    if (Math.abs(delta) >= this.SWIPE_THRESHOLD) {
      delta < 0 ? this.next() : this.prev();
    }
  }
}
```

Create `src/app/shared/image-carousel/image-carousel.component.html`:

```html
<div class="carousel-container" (touchstart)="onTouchStart($event)" (touchend)="onTouchEnd($event)">
  @if (selectedIndex() > 0) {
  <button mat-icon-button class="nav-arrow nav-arrow--left" aria-label="Previous image" (click)="prev()">
    <mat-icon>chevron_left</mat-icon>
  </button>
  }

  <ng-content />

  @if (selectedIndex() < imageCount() - 1) {
  <button mat-icon-button class="nav-arrow nav-arrow--right" aria-label="Next image" (click)="next()">
    <mat-icon>chevron_right</mat-icon>
  </button>
  }
</div>
```

Create `src/app/shared/image-carousel/image-carousel.component.scss`:

```scss
.carousel-container {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
}

.nav-arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 10;
  background: rgba(0, 0, 0, 0.45) !important;
  color: white !important;
  width: 48px !important;
  height: 48px !important;

  &:hover {
    background: rgba(0, 0, 0, 0.65) !important;
  }

  &--left {
    left: 4px;
  }

  &--right {
    right: 4px;
  }
}

// Desktop (precise pointer): show arrows only on container hover
@media (pointer: fine) {
  .nav-arrow {
    opacity: 0;
    transition: opacity 0.2s ease;
  }

  .carousel-container:hover .nav-arrow {
    opacity: 1;
  }
}

// Mobile (coarse pointer): always show arrows
@media (pointer: coarse) {
  .nav-arrow {
    opacity: 1;
  }
}
```

### Step 4: Run tests to confirm they pass

```bash
npm run test:brief -- --include=src/app/shared/image-carousel/image-carousel.component.spec.ts
```

Expected: all tests PASS.

### Step 5: Commit

```bash
git add src/app/shared/image-carousel/
git commit -m "feat: add ImageCarouselComponent with arrow navigation and swipe support"
```

---

## Task 2: Export ImageCarouselComponent from SharedModule

**Files:**

- Modify: `src/app/shared/shared.module.ts`

`PrintModule` already imports `SharedModule`. Adding `ImageCarouselComponent` to SharedModule's `imports` and `exports` makes it available to `ViewPrintDetailComponent` and `EditPrintDetailComponent` without touching `print.module.ts`.

### Step 1: Open SharedModule

Read `src/app/shared/shared.module.ts` to find the `imports` and `exports` arrays.

### Step 2: Add ImageCarouselComponent

Add `ImageCarouselComponent` to both the `imports` array and the `exports` array of `@NgModule`. Also add the import statement at the top:

```typescript
import { ImageCarouselComponent } from './image-carousel/image-carousel.component';
```

Example of what the change looks like (exact line numbers depend on the file):

```typescript
// In @NgModule:
imports: [
  // ... existing imports ...
  ImageCarouselComponent,
],
exports: [
  // ... existing exports ...
  ImageCarouselComponent,
],
```

### Step 3: Build to verify no errors

```bash
npm run build:dev 2>&1 | grep -E "error|warning" | head -30
```

Expected: no errors referencing `ImageCarouselComponent`.

### Step 4: Commit

```bash
git add src/app/shared/shared.module.ts
git commit -m "feat: export ImageCarouselComponent from SharedModule"
```

---

## Task 3: Update ViewPrintDetailComponent

**Files:**

- Modify: `src/app/print/view-print-detail/view-print-detail.component.ts`
- Modify: `src/app/print/view-print-detail/view-print-detail.component.html`
- Modify: `src/app/print/view-print-detail/view-print-detail.component.spec.ts`

### Step 1: Write the failing tests

Open `view-print-detail.component.spec.ts`. Add these test cases inside the existing `describe` block. The existing `mockPrint` has `images: []` — add a version with images for the new tests.

Add a second `describe` block for carousel behavior after the existing tests:

```typescript
describe('carousel navigation', () => {
  beforeEach(() => {
    // Re-create component with a print that has two images
    const mockPrintWithImages = {
      ...mockPrint,
      images: [
        { id: 1, isDefault: true, displayOrder: 0 },
        { id: 2, isDefault: false, displayOrder: 1 },
      ],
    };

    TestBed.get(ActivatedRoute).data = of({
      printers: [],
      print: { print: mockPrintWithImages, user: mockUser },
    });

    fixture = TestBed.createComponent(ViewPrintDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should initialise selectedImageIndex to the default image index', () => {
    expect(component.selectedImageIndex).toBe(0);
  });

  it('should update selectedImageIndex when onCarouselIndexChange is called', () => {
    component.onCarouselIndexChange(1);
    expect(component.selectedImageIndex).toBe(1);
    expect(component.selectedImage).toBe(component.printImages[1]);
  });

  it('should update selectedImageIndex when onImageSelected is called', () => {
    component.onImageSelected(component.printImages[1]);
    expect(component.selectedImageIndex).toBe(1);
  });
});
```

Run to confirm failure:

```bash
npm run test:brief -- --include=src/app/print/view-print-detail/view-print-detail.component.spec.ts
```

Expected: FAIL — `selectedImageIndex` and `onCarouselIndexChange` do not exist.

### Step 2: Update the component class

In `view-print-detail.component.ts`:

**Add property** (after `selectedImage` declaration on line 45):

```typescript
public selectedImageIndex = 0;
```

**Update `ngOnInit`** — after the line that sets `this.selectedImage`, add:

```typescript
this.selectedImageIndex = this.printImages.indexOf(this.selectedImage);
```

**Update `onImageSelected`** (currently lines 159–161):

```typescript
onImageSelected(image: PrintImageValue): void {
  this.selectedImage = image;
  this.selectedImageIndex = this.printImages.indexOf(image);
}
```

**Add `onCarouselIndexChange`** after `onImageSelected`:

```typescript
onCarouselIndexChange(index: number): void {
  this.selectedImageIndex = index;
  this.selectedImage = this.printImages[index];
}
```

### Step 3: Update the template

In `view-print-detail.component.html`, replace the `@if (selectedImage)` block (lines 29–45):

```html
@if (selectedImage) {
<div class="main-image">
  <app-print-image fxFlex [printId]="print.id" [imageId]="selectedImage.id" [imageData]="selectedImage.url" [showDeleteOnHover]="false" (imageDataChange)="selectedImage.url = $event"></app-print-image>
</div>
}
```

with:

```html
<app-image-carousel [imageCount]="printImages.length" [selectedIndex]="selectedImageIndex" (indexChange)="onCarouselIndexChange($event)">
  @if (selectedImage) {
  <div class="main-image">
    <app-print-image fxFlex [printId]="print.id" [imageId]="selectedImage.id" [imageData]="selectedImage.url" [showDeleteOnHover]="false" (imageDataChange)="selectedImage.url = $event"></app-print-image>
  </div>
  }
</app-image-carousel>
```

### Step 4: Run tests to confirm they pass

```bash
npm run test:brief -- --include=src/app/print/view-print-detail/view-print-detail.component.spec.ts
```

Expected: all tests PASS.

### Step 5: Commit

```bash
git add src/app/print/view-print-detail/
git commit -m "feat: add carousel navigation to ViewPrintDetailComponent"
```

---

## Task 4: Update EditPrintDetailComponent

**Files:**

- Modify: `src/app/print/edit-print-detail/edit-print-detail.component.ts`
- Modify: `src/app/print/edit-print-detail/edit-print-detail.component.html`
- Modify: `src/app/print/edit-print-detail/edit-print-detail.component.spec.ts` (if it exists)

### Step 1: Update the component class

In `edit-print-detail.component.ts`:

**Add property** after `selectedImage` declaration (line 189):

```typescript
public selectedImageIndex = 0;
```

**Update `onThumbnailSelected`** (lines 1257–1264) to also sync the index:

```typescript
onThumbnailSelected(image: ThumbnailImage): void {
  const control = this.images.controls.find(
    (c) => c.value.id === image.id || c.value.url === image.url
  );
  if (control) {
    this.selectedImage = control;
    this.selectedImageIndex = this.getImagesForStrip().findIndex(
      (i) => i.id === image.id || i.url === image.url
    );
  }
}
```

**Add `onCarouselIndexChange`** after `onThumbnailSelected`:

```typescript
onCarouselIndexChange(index: number): void {
  this.selectedImageIndex = index;
  const image = this.getImagesForStrip()[index];
  if (!image) return;
  const control = this.images.controls.find(
    (c) => c.value.id === image.id || c.value.url === image.url
  ) as FormControl<PrintImageValue>;
  if (control) {
    this.selectedImage = control;
  }
}
```

### Step 2: Update the template

In `edit-print-detail.component.html`, replace the `@if (selectedImage && selectedImage.value)` block (around lines 62–74):

```html
@if (selectedImage && selectedImage.value) {
<div fxFlex class="card-img-top main-image">
  <app-print-image fxFlex [printId]="printForm.get('id').value" [imageId]="selectedImage.value.id" [imageData]="selectedImage.value.url" [showDeleteOnHover]="false" (imageDataChange)="selectedImage.value.url = $event"></app-print-image>
</div>
}
```

with:

```html
<app-image-carousel [imageCount]="getImagesForStrip().length" [selectedIndex]="selectedImageIndex" (indexChange)="onCarouselIndexChange($event)">
  @if (selectedImage && selectedImage.value) {
  <div fxFlex class="card-img-top main-image">
    <app-print-image fxFlex [printId]="printForm.get('id').value" [imageId]="selectedImage.value.id" [imageData]="selectedImage.value.url" [showDeleteOnHover]="false" (imageDataChange)="selectedImage.value.url = $event"></app-print-image>
  </div>
  }
</app-image-carousel>
```

### Step 3: Run full test suite

```bash
npm run test:brief
```

Expected: all tests PASS, no regressions.

### Step 4: Commit

```bash
git add src/app/print/edit-print-detail/
git commit -m "feat: add carousel navigation to EditPrintDetailComponent"
```

---

## Final Verification

```bash
npm run lint:brief
npm run test:brief
npm run build:dev
```

All three should complete without errors.
