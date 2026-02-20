# Image Carousel Navigation Design

**Date:** 2026-02-19
**Feature:** Left/right arrow navigation + swipe gestures for the multi-image viewer
**Scope:** ViewPrintDetail and EditPrintDetail components

---

## Summary

Add a new `ImageCarouselComponent` that wraps the main image display with left/right arrow buttons and swipe gesture support. Arrows hide at boundaries and when only one image is present. Always visible on mobile, hover-only on desktop.

---

## New Component

**File:** `src/app/shared/image-carousel/image-carousel.component.ts`
**Selector:** `app-image-carousel`
**Change detection:** `OnPush`
**Standalone:** yes (default, no explicit `standalone: true`)

### Inputs (signals)

| Input           | Type                | Required       | Description                                         |
| --------------- | ------------------- | -------------- | --------------------------------------------------- |
| `images`        | `PrintImageValue[]` | yes            | Full image list                                     |
| `printId`       | `number`            | no             | Forwarded to `app-print-image` for API lazy-loading |
| `selectedIndex` | `number`            | no (default 0) | Which image is active (parent-controlled)           |

### Outputs

| Output            | Type                           | Description                                                                  |
| ----------------- | ------------------------------ | ---------------------------------------------------------------------------- |
| `indexChange`     | `number`                       | Emitted when user navigates via arrow or swipe                               |
| `imageDataChange` | `{index: number, url: string}` | Forwarded from `app-print-image` so parents can update their image URL cache |

### Computed

- `currentImage = computed(() => this.images()[this.selectedIndex()])`

---

## Template Structure

```html
<div class="carousel-container" (touchstart)="onTouchStart($event)" (touchend)="onTouchEnd($event)">
  @if (selectedIndex() > 0) {
  <button mat-icon-button class="nav-arrow nav-arrow--left" (click)="prev()">
    <mat-icon>chevron_left</mat-icon>
  </button>
  }

  <app-print-image [printId]="printId()" [imageId]="currentImage()?.id" [imageData]="currentImage()?.url" [showDeleteOnHover]="false" (imageDataChange)="onImageDataChange($event)" />

  @if (selectedIndex() < images().length - 1) {
  <button mat-icon-button class="nav-arrow nav-arrow--right" (click)="next()">
    <mat-icon>chevron_right</mat-icon>
  </button>
  }
</div>
```

### Arrow Visibility Rules

- Left arrow: hidden when `selectedIndex === 0`
- Right arrow: hidden when `selectedIndex === images.length - 1`
- Single image: both arrows hidden (boundary conditions cover this)
- Desktop (`pointer: fine`): `opacity: 0` by default, `opacity: 1` on container hover with short transition
- Mobile (`pointer: coarse`): always `opacity: 1`
- Touch target: minimum `48×48px`, semi-transparent dark circle background

---

## Navigation Logic

```typescript
private touchStartX = 0;
private readonly SWIPE_THRESHOLD = 50; // px

onTouchStart(event: TouchEvent) {
  this.touchStartX = event.touches[0].clientX;
}

onTouchEnd(event: TouchEvent) {
  const delta = event.changedTouches[0].clientX - this.touchStartX;
  if (Math.abs(delta) >= this.SWIPE_THRESHOLD) {
    delta < 0 ? this.next() : this.prev();
  }
}

prev() {
  if (this.selectedIndex() > 0)
    this.indexChange.emit(this.selectedIndex() - 1);
}

next() {
  if (this.selectedIndex() < this.images().length - 1)
    this.indexChange.emit(this.selectedIndex() + 1);
}

onImageDataChange(url: string) {
  this.imageDataChange.emit({ index: this.selectedIndex(), url });
}
```

---

## Parent Component Changes

### ViewPrintDetail

- Add `selectedImageIndex = 0` property
- Replace `<div class="main-image"><app-print-image /></div>` with `<app-image-carousel>`
- Update `onImageSelected()` to also set `selectedImageIndex = this.printImages.indexOf(image)`
- Handle `(indexChange)` to update `selectedImage` and `selectedImageIndex`
- Handle `(imageDataChange)` to update the URL on the correct image in `printImages`

### EditPrintDetail

- Add `selectedImageIndex = 0` property
- Replace `<div class="main-image"><app-print-image /></div>` with `<app-image-carousel>`
- Pass `getImagesForStrip()` as `images` (structurally compatible with `PrintImageValue[]`)
- Update `onThumbnailSelected()` to also set `selectedImageIndex`
- Handle `(indexChange)` to find the matching FormControl by index and update `selectedImage`
- Handle `(imageDataChange)` to update the URL on the correct FormControl

The thumbnail strip continues to work unchanged — it emits `imageSelected` as before, and the parents sync `selectedImageIndex` alongside `selectedImage`.

---

## Testing

- Unit tests for `ImageCarouselComponent`:
  - Arrow visibility at boundaries (index 0, last index, single image)
  - `prev()` and `next()` emit correct index
  - Swipe left emits next, swipe right emits prev
  - Swipe below threshold does not navigate
  - `imageDataChange` forwarded with correct index
- Update `ViewPrintDetail` tests: verify `selectedImageIndex` syncs with `selectedImage`
- Update `EditPrintDetail` tests: verify `selectedImageIndex` syncs with FormArray
