# Carousel Accessibility (WCAG AA) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Bring `ImageCarouselComponent` and `ImageThumbnailStripComponent` to WCAG 2.1 Level AA compliance.

**Architecture:** Semantic HTML refactor — replace clickable `<div>` thumbnails with a `<ul>`/`<li>`/`<button>` structure so browsers handle keyboard activation natively. Add ARIA roles, labels, and a live region to the carousel container. No new dependencies required.

**Tech Stack:** Angular 20 signals, Angular Material icons/buttons, CDK drag-drop, Jasmine + Karma unit tests.

---

## Task 1: Carousel — container role and label input

**Files:**

- Modify: `src/app/shared/image-carousel/image-carousel.component.ts`
- Modify: `src/app/shared/image-carousel/image-carousel.component.html`
- Modify: `src/app/shared/image-carousel/image-carousel.component.spec.ts`

### Step 1: Write the failing tests

Add this `describe` block to the existing spec file, inside the top-level `describe('ImageCarouselComponent', ...)`:

```typescript
describe('accessibility — container', () => {
  it('should have role="group" on the container', () => {
    setup(3, 1);
    const container = fixture.nativeElement.querySelector('.carousel-container');
    expect(container.getAttribute('role')).toBe('group');
  });

  it('should have aria-roledescription="carousel" on the container', () => {
    setup(3, 1);
    const container = fixture.nativeElement.querySelector('.carousel-container');
    expect(container.getAttribute('aria-roledescription')).toBe('carousel');
  });

  it('should default aria-label to "Image gallery"', () => {
    setup(3, 1);
    const container = fixture.nativeElement.querySelector('.carousel-container');
    expect(container.getAttribute('aria-label')).toBe('Image gallery');
  });

  it('should use the label input for aria-label when provided', () => {
    fixture.componentRef.setInput('label', 'Print images');
    setup(3, 1);
    const container = fixture.nativeElement.querySelector('.carousel-container');
    expect(container.getAttribute('aria-label')).toBe('Print images');
  });
});
```

### Step 2: Run tests to confirm they fail

```bash
npm run test:brief
```

Expected: 4 new failures — "Expected null to be 'group'", etc.

### Step 3: Add `label` input to the component TypeScript

In `image-carousel.component.ts`, add one line after the existing inputs:

```typescript
label = input<string>('Image gallery');
```

### Step 4: Add ARIA attributes to the template container div

In `image-carousel.component.html`, update the opening `<div>`:

```html
<div class="carousel-container" role="group" aria-roledescription="carousel" [attr.aria-label]="label()" (touchstart)="onTouchStart($event)" (touchend)="onTouchEnd($event)"></div>
```

### Step 5: Run tests to confirm they pass

```bash
npm run test:brief
```

Expected: all tests pass, no failures.

### Step 6: Commit

```bash
git add src/app/shared/image-carousel/image-carousel.component.ts src/app/shared/image-carousel/image-carousel.component.html src/app/shared/image-carousel/image-carousel.component.spec.ts
git commit -m "feat(a11y): add role, roledescription, and label to carousel container"
```

---

## Task 2: Carousel — live region for slide position

**Files:**

- Modify: `src/app/shared/image-carousel/image-carousel.component.html`
- Modify: `src/app/shared/image-carousel/image-carousel.component.scss`
- Modify: `src/app/shared/image-carousel/image-carousel.component.spec.ts`

### Step 1: Write the failing test

Add inside the `describe('accessibility — container', ...)` block:

```typescript
it('should render a live region with the current image position', () => {
  setup(3, 1);
  const live = fixture.nativeElement.querySelector('[aria-live="polite"]');
  expect(live).toBeTruthy();
  expect(live.textContent.trim()).toBe('Image 2 of 3');
});

it('should update the live region when the index changes', () => {
  setup(3, 0);
  const live = fixture.nativeElement.querySelector('[aria-live="polite"]');
  expect(live.textContent.trim()).toBe('Image 1 of 3');
  setup(3, 2);
  expect(live.textContent.trim()).toBe('Image 3 of 3');
});
```

### Step 2: Run tests to confirm they fail

```bash
npm run test:brief
```

Expected: 2 new failures — "Expected null to be truthy".

### Step 3: Add the live region span to the template

Inside the `<div class="carousel-container">`, add as the **first child** (before the `@if` blocks):

```html
<span class="sr-only" aria-live="polite" aria-atomic="true"> Image {{ selectedIndex() + 1 }} of {{ imageCount() }} </span>
```

### Step 4: Add the `sr-only` utility class to the component SCSS

In `image-carousel.component.scss`, add at the top:

```scss
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

### Step 5: Run tests to confirm they pass

```bash
npm run test:brief
```

Expected: all tests pass.

### Step 6: Commit

```bash
git add src/app/shared/image-carousel/image-carousel.component.html src/app/shared/image-carousel/image-carousel.component.scss src/app/shared/image-carousel/image-carousel.component.spec.ts
git commit -m "feat(a11y): add aria-live region to carousel for slide position announcements"
```

---

## Task 3: Carousel — keyboard arrow navigation

**Files:**

- Modify: `src/app/shared/image-carousel/image-carousel.component.ts`
- Modify: `src/app/shared/image-carousel/image-carousel.component.html`
- Modify: `src/app/shared/image-carousel/image-carousel.component.spec.ts`

### Step 1: Write the failing tests

Add a new `describe` block inside the top-level describe:

```typescript
describe('keyboard navigation', () => {
  function pressKey(key: string) {
    const container = fixture.nativeElement.querySelector('.carousel-container');
    container.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
  }

  it('should emit prev index on ArrowLeft', () => {
    setup(3, 2);
    const spy = spyOn(component.indexChange, 'emit');
    pressKey('ArrowLeft');
    expect(spy).toHaveBeenCalledWith(1);
  });

  it('should emit next index on ArrowRight', () => {
    setup(3, 1);
    const spy = spyOn(component.indexChange, 'emit');
    pressKey('ArrowRight');
    expect(spy).toHaveBeenCalledWith(2);
  });

  it('should not emit on ArrowLeft when at first image', () => {
    setup(3, 0);
    const spy = spyOn(component.indexChange, 'emit');
    pressKey('ArrowLeft');
    expect(spy).not.toHaveBeenCalled();
  });

  it('should not emit on ArrowRight when at last image', () => {
    setup(3, 2);
    const spy = spyOn(component.indexChange, 'emit');
    pressKey('ArrowRight');
    expect(spy).not.toHaveBeenCalled();
  });

  it('should not emit on unrelated keys', () => {
    setup(3, 1);
    const spy = spyOn(component.indexChange, 'emit');
    pressKey('Enter');
    expect(spy).not.toHaveBeenCalled();
  });
});
```

### Step 2: Run tests to confirm they fail

```bash
npm run test:brief
```

Expected: 5 new failures.

### Step 3: Add `onKeydown` method to the component TypeScript

In `image-carousel.component.ts`, add after `onTouchEnd`:

```typescript
onKeydown(event: KeyboardEvent): void {
  if (event.key === 'ArrowLeft') {
    this.prev();
  } else if (event.key === 'ArrowRight') {
    this.next();
  }
}
```

### Step 4: Add `(keydown)` binding to the container

In `image-carousel.component.html`, add to the opening `<div>`:

```html
<div class="carousel-container" role="group" aria-roledescription="carousel" [attr.aria-label]="label()" (touchstart)="onTouchStart($event)" (touchend)="onTouchEnd($event)" (keydown)="onKeydown($event)"></div>
```

### Step 5: Run tests to confirm they pass

```bash
npm run test:brief
```

Expected: all tests pass.

### Step 6: Commit

```bash
git add src/app/shared/image-carousel/image-carousel.component.ts src/app/shared/image-carousel/image-carousel.component.html src/app/shared/image-carousel/image-carousel.component.spec.ts
git commit -m "feat(a11y): add ArrowLeft/ArrowRight keyboard navigation to carousel"
```

---

## Task 4: Carousel — focus-visible arrows on desktop

**Files:**

- Modify: `src/app/shared/image-carousel/image-carousel.component.scss`

No automated test needed — this is a CSS-only visual change. Manual verification: tab into the carousel on a desktop browser and confirm arrows appear.

### Step 1: Add `:focus-within` rule to the desktop media query

In `image-carousel.component.scss`, update the `@media (pointer: fine)` block to:

```scss
@media (pointer: fine) {
  .nav-arrow {
    opacity: 0;
    transition: opacity 0.2s ease;
  }

  .carousel-container:hover .nav-arrow,
  .carousel-container:focus-within .nav-arrow {
    opacity: 1;
  }
}
```

### Step 2: Commit

```bash
git add src/app/shared/image-carousel/image-carousel.component.scss
git commit -m "feat(a11y): show carousel nav arrows on keyboard focus (focus-within)"
```

---

## Task 5: Thumbnail strip — `getSelectLabel` method

**Files:**

- Modify: `src/app/shared/image-thumbnail-strip/image-thumbnail-strip.component.ts`
- Modify: `src/app/shared/image-thumbnail-strip/image-thumbnail-strip.component.spec.ts`

### Step 1: Write the failing tests

Add a new `describe` block inside the top-level describe:

```typescript
describe('getSelectLabel', () => {
  it('should return "Image 1 of 2" for a non-default image at index 0', () => {
    const image: ThumbnailImage = { id: 1, url: 'x', isDefault: false, displayOrder: 0 };
    fixture.componentRef.setInput('images', [image, mockImages[1]]);
    fixture.detectChanges();
    expect(component.getSelectLabel(image, 0)).toBe('Image 1 of 2');
  });

  it('should append ", default" for the default image', () => {
    expect(component.getSelectLabel(mockImages[0], 0)).toBe('Image 1 of 2, default');
  });

  it('should reflect the correct total count', () => {
    expect(component.getSelectLabel(mockImages[1], 1)).toBe('Image 2 of 2');
  });
});
```

### Step 2: Run tests to confirm they fail

```bash
npm run test:brief
```

Expected: 3 failures — "component.getSelectLabel is not a function".

### Step 3: Add the method to the component TypeScript

In `image-thumbnail-strip.component.ts`, add after `onDrop`:

```typescript
getSelectLabel(image: ThumbnailImage, index: number): string {
  const position = `Image ${index + 1} of ${this.images().length}`;
  return image.isDefault ? `${position}, default` : position;
}
```

### Step 4: Run tests to confirm they pass

```bash
npm run test:brief
```

Expected: all tests pass.

### Step 5: Commit

```bash
git add src/app/shared/image-thumbnail-strip/image-thumbnail-strip.component.ts src/app/shared/image-thumbnail-strip/image-thumbnail-strip.component.spec.ts
git commit -m "feat(a11y): add getSelectLabel method to thumbnail strip"
```

---

## Task 6: Thumbnail strip — semantic HTML restructure

This is the largest change. The clickable `<div class="thumbnail">` is replaced with `<li>` containing a `<button>` for the select action. Nesting buttons inside a button is invalid HTML, so the structure changes to a list of items each containing a select button plus sibling action buttons.

**Files:**

- Modify: `src/app/shared/image-thumbnail-strip/image-thumbnail-strip.component.html`
- Modify: `src/app/shared/image-thumbnail-strip/image-thumbnail-strip.component.scss`
- Modify: `src/app/shared/image-thumbnail-strip/image-thumbnail-strip.component.spec.ts`

### Step 1: Update the existing broken test and add new accessibility tests

The existing test `'should emit imageSelected when thumbnail clicked'` clicks `.thumbnail` — after this refactor the click handler moves to `.thumbnail-select`. Update that test and add new ones:

```typescript
// REPLACE the existing 'should emit imageSelected when thumbnail clicked' test:
it('should emit imageSelected when thumbnail select button is clicked', () => {
  const spy = spyOn(component.imageSelected, 'emit');
  const btn = fixture.nativeElement.querySelector('.thumbnail-select');
  btn.click();
  expect(spy).toHaveBeenCalledWith(mockImages[0]);
});

// ADD these inside describe('accessibility — thumbnail list', () => { ... }):
describe('accessibility — thumbnail list', () => {
  it('should render thumbnails container as a <ul>', () => {
    const list = fixture.nativeElement.querySelector('ul.thumbnails');
    expect(list).toBeTruthy();
  });

  it('should render each thumbnail as an <li>', () => {
    const items = fixture.nativeElement.querySelectorAll('li.thumbnail');
    expect(items.length).toBe(2);
  });

  it('should render a select button inside each thumbnail', () => {
    const btns = fixture.nativeElement.querySelectorAll('.thumbnail-select');
    expect(btns.length).toBe(2);
  });

  it('should set aria-label to "Image 1 of 2, default" on the first select button', () => {
    const btn = fixture.nativeElement.querySelectorAll('.thumbnail-select')[0];
    expect(btn.getAttribute('aria-label')).toBe('Image 1 of 2, default');
  });

  it('should set aria-label to "Image 2 of 2" on the second select button', () => {
    const btn = fixture.nativeElement.querySelectorAll('.thumbnail-select')[1];
    expect(btn.getAttribute('aria-label')).toBe('Image 2 of 2');
  });

  it('should set aria-current="true" on the selected thumbnail', () => {
    fixture.componentRef.setInput('selectedId', 1);
    fixture.detectChanges();
    const btns = fixture.nativeElement.querySelectorAll('.thumbnail-select');
    expect(btns[0].getAttribute('aria-current')).toBe('true');
    expect(btns[1].getAttribute('aria-current')).toBeNull();
  });

  it('should set alt="" on thumbnail images (label is on the button)', () => {
    const imgs = fixture.nativeElement.querySelectorAll('.thumbnail-select img');
    imgs.forEach((img: HTMLImageElement) => expect(img.getAttribute('alt')).toBe(''));
  });

  it('should set aria-hidden="true" on the default star icon', () => {
    const star = fixture.nativeElement.querySelector('.default-star');
    expect(star.getAttribute('aria-hidden')).toBe('true');
  });
});
```

### Step 2: Run tests to confirm the new tests fail

```bash
npm run test:brief
```

Expected: multiple new failures. The existing `'should emit imageSelected when thumbnail clicked'` may also fail — that's expected.

### Step 3: Replace the template

Replace the entire contents of `image-thumbnail-strip.component.html` with:

```html
<div class="thumbnail-strip" [class.editable]="editable()">
  @if (images().length > 1 || editable()) {
  <ul class="thumbnails" [cdkDropListDisabled]="!editable()" cdkDropList cdkDropListOrientation="horizontal" (cdkDropListDropped)="onDrop($event)">
    @for (image of images(); track image.id !== undefined ? image.id : `new-${$index}`; let index = $index) {
    <li class="thumbnail" [class.selected]="image.id === selectedId()" [class.is-default]="image.isDefault" [cdkDragDisabled]="!editable()" cdkDrag>
      <button class="thumbnail-select" type="button" [attr.aria-label]="getSelectLabel(image, index)" [attr.aria-current]="image.id === selectedId() ? 'true' : null" (click)="onThumbnailClick(image)">
        @if (image.url) {
        <img [src]="image.url" alt="" />
        } @else {
        <div class="placeholder">
          <mat-icon>image</mat-icon>
        </div>
        } @if (image.isDefault) {
        <mat-icon class="default-star" aria-hidden="true">star</mat-icon>
        }
      </button>
      @if (editable()) { @if (!image.isDefault) {
      <button mat-icon-button class="set-default-btn" type="button" [attr.aria-label]="'Set image ' + (index + 1) + ' as default'" (click)="onSetDefaultClick($event, image)">
        <mat-icon>star_border</mat-icon>
      </button>
      }
      <button mat-icon-button class="delete-btn" type="button" [attr.aria-label]="'Delete image ' + (index + 1)" (click)="onDeleteClick($event, image)">
        <mat-icon>close</mat-icon>
      </button>
      }
    </li>
    } @if (editable() && canAddMore() && images().length > 0) {
    <button class="add-button" mat-stroked-button type="button" (click)="onAddClick()">
      <mat-icon>add</mat-icon>
    </button>
    }
  </ul>

  @if (editable() && !canAddMore()) {
  <div class="limit-message">Maximum {{ maxImages() }} images reached</div>
  } }
</div>
```

### Step 4: Update the SCSS for the new button structure

The `.thumbnail img` rule needs to account for the `.thumbnail-select` button wrapper. In `image-thumbnail-strip.component.scss`, replace the `.thumbnail` block's `img` rule and add button reset styles:

```scss
.thumbnail {
  // ... existing rules stay ...

  .thumbnail-select {
    display: block;
    width: 100%;
    height: 100%;
    padding: 0;
    border: none;
    background: none;
    cursor: pointer;
    position: relative;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
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
      font-size: 14px;
      width: 18px;
      height: 18px;
      color: #ffc107;
      background: rgba(0, 0, 0, 0.5);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  }
}
```

Remove the now-orphaned `.thumbnail img`, `.thumbnail .placeholder`, and `.thumbnail .default-star` rules from the top-level `.thumbnail` block (they move inside `.thumbnail-select`).

### Step 5: Run tests to confirm they pass

```bash
npm run test:brief
```

Expected: all tests pass.

### Step 6: Commit

```bash
git add src/app/shared/image-thumbnail-strip/image-thumbnail-strip.component.html src/app/shared/image-thumbnail-strip/image-thumbnail-strip.component.scss src/app/shared/image-thumbnail-strip/image-thumbnail-strip.component.spec.ts
git commit -m "feat(a11y): restructure thumbnail strip with ul/li/button for WCAG AA keyboard access"
```

---

## Task 7: Thumbnail strip — action button labels

**Files:**

- Modify: `src/app/shared/image-thumbnail-strip/image-thumbnail-strip.component.spec.ts`

The action button `aria-label` attributes were added in Task 6's template. This task adds tests to lock in that behaviour.

### Step 1: Write the failing tests

Add inside the `describe('accessibility — thumbnail list', ...)` block:

```typescript
describe('editable mode button labels', () => {
  beforeEach(() => {
    fixture.componentRef.setInput('editable', true);
    fixture.detectChanges();
  });

  it('should label delete button with image number', () => {
    const deleteBtns = fixture.nativeElement.querySelectorAll('.delete-btn');
    expect(deleteBtns[0].getAttribute('aria-label')).toBe('Delete image 1');
    expect(deleteBtns[1].getAttribute('aria-label')).toBe('Delete image 2');
  });

  it('should label set-default button with image number', () => {
    // mockImages[0] isDefault=true so no set-default button; mockImages[1] isDefault=false
    const setDefaultBtns = fixture.nativeElement.querySelectorAll('.set-default-btn');
    expect(setDefaultBtns.length).toBe(1);
    expect(setDefaultBtns[0].getAttribute('aria-label')).toBe('Set image 2 as default');
  });
});
```

### Step 2: Run tests to confirm they pass immediately

Because the template was already updated in Task 6, these tests should pass without any code changes:

```bash
npm run test:brief
```

Expected: all tests pass.

### Step 3: Commit

```bash
git add src/app/shared/image-thumbnail-strip/image-thumbnail-strip.component.spec.ts
git commit -m "test(a11y): add tests for thumbnail action button aria-labels"
```

---

## Task 8: Final verification

### Step 1: Run the full test suite

```bash
npm run test:brief
```

Expected: all tests pass, no failures.

### Step 2: Run lint

```bash
npm run lint:brief
```

Expected: no errors.

### Step 3: Check TypeScript compilation

```bash
npm run build:dev
```

Expected: build succeeds with no errors.
