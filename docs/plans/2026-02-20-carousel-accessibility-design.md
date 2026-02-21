# Carousel & Thumbnail Strip Accessibility Design

**Date:** 2026-02-20
**Target:** WCAG 2.1 Level AA
**Components:** `ImageCarouselComponent`, `ImageThumbnailStripComponent`

## Problem Statement

Both components have interactive elements that are inaccessible to keyboard and screen reader users:

- `ImageCarouselComponent` lacks a container landmark, live region announcements, and keyboard arrow navigation. Nav arrows are invisible on desktop until mouse hover, breaking visible focus.
- `ImageThumbnailStripComponent` uses a clickable `<div>` for thumbnails with no role, tabindex, or keyboard support. Buttons use `title` (unreliable for screen readers) instead of `aria-label`. No selected-state indicator for assistive technology.

## Approach

Semantic HTML refactor (Approach B): replace non-semantic interactive elements with correct HTML elements and add ARIA attributes where native semantics are insufficient. Avoid `role="button"` on `<div>` elements — use real `<button>` elements so the browser handles focus and activation natively.

---

## ImageCarouselComponent Changes

### 1. Container Landmark

Add `role="group"`, `aria-roledescription="carousel"`, and `aria-label` to `.carousel-container`.

Add an optional `label` input (default: `"Image gallery"`) so parent components can supply a specific label:

```html
<!-- parent usage -->
<app-image-carousel label="Print images" ...></app-image-carousel>
```

### 2. Live Region

Add a visually-hidden `aria-live="polite"` `<span>` inside the container:

```html
<span class="sr-only" aria-live="polite" aria-atomic="true"> Image {{ selectedIndex() + 1 }} of {{ imageCount() }} </span>
```

Screen readers announce the current position whenever the index changes.

### 3. Keyboard Arrow Navigation

Add a `(keydown)` handler on the container that calls `prev()`/`next()` on `ArrowLeft`/`ArrowRight`. Users can navigate while focused anywhere within the carousel region without tabbing to the individual arrow buttons.

### 4. Focus-Visible Arrows on Desktop

Add a `:focus-within` CSS rule so carousel arrows appear when keyboard focus enters the container. The current CSS hides arrows (`opacity: 0`) on desktop until hover, which violates WCAG 2.4.7 Focus Visible.

```scss
@media (pointer: fine) {
  .carousel-container:focus-within .nav-arrow {
    opacity: 1;
  }
}
```

---

## ImageThumbnailStripComponent Changes

### 1. List Semantics

Change `<div class="thumbnails">` → `<ul>` and each `<div class="thumbnail">` → `<li>`. Gives screen readers proper list context ("3 items").

### 2. Select Action as a Real Button

Wrap the image and default-star icon inside a `<button class="thumbnail-select">` within each `<li>`. The click handler moves to this button.

```html
<button class="thumbnail-select" type="button" [attr.aria-label]="getSelectLabel(image, index)" [attr.aria-current]="image.id === selectedId() ? 'true' : null" (click)="onThumbnailClick(image)">
  <img [src]="image.url" alt="" />
  <!-- alt="" because label is on button -->
  @if (image.isDefault) {
  <mat-icon aria-hidden="true" class="default-star">star</mat-icon>
  }
</button>
```

`getSelectLabel` returns e.g. `"Image 1 of 3"` or `"Image 2 of 3, default"`.

`aria-current="true"` marks the currently displayed image for screen readers.

The `<img>` gets `alt=""` because the button's `aria-label` fully describes it — duplicating text in alt would cause double-announcement.

### 3. Default Star Icon

Add `aria-hidden="true"` to the decorative `<mat-icon class="default-star">`. Its meaning is conveyed via the button's `aria-label`.

### 4. Action Buttons: `title` → `aria-label`

Replace `title` with `aria-label`, including the image number for context:

```html
<!-- Before -->
<button title="Delete image">
  <!-- After -->
  <button [attr.aria-label]="'Delete image ' + (index + 1)">
    <button [attr.aria-label]="'Set image ' + (index + 1) + ' as default'"></button>
  </button>
</button>
```

`title` is not reliably announced by screen readers and does not satisfy WCAG 4.1.2.

### 5. Drag-and-Drop

No change. Keyboard-accessible drag/drop reordering is a WCAG AAA requirement. The existing mouse/touch drag stays as-is.

---

## WCAG AA Criteria Addressed

| Criterion               | Description                                                  | Component |
| ----------------------- | ------------------------------------------------------------ | --------- |
| 1.1.1 Non-text Content  | `aria-label` on thumbnail select buttons; `alt=""` on images | Thumbnail |
| 2.1.1 Keyboard          | All interactive elements operable by keyboard                | Both      |
| 2.4.7 Focus Visible     | Carousel arrows visible on `:focus-within`                   | Carousel  |
| 4.1.2 Name, Role, Value | Roles and labels on all UI components                        | Both      |
| 4.1.3 Status Messages   | `aria-live` region for slide position                        | Carousel  |

---

## Out of Scope

- Keyboard-accessible drag/drop reordering (WCAG AAA)
- High-contrast color theme changes
- Changes to `PrintImageComponent` (not part of this effort)
