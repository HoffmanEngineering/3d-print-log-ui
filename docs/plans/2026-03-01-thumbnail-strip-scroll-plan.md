# Thumbnail Strip Overflow Fix Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix the thumbnail strip so it stays within its container bounds and auto-scrolls to keep the selected thumbnail visible when there are many images.

**Architecture:** Three focused changes to `ImageThumbnailStripComponent` only: CSS fix for the centering/overflow quirk, a template reference on the `<ul>`, and an `effect()` that scrolls the selected `<li>` into view after each selection change.

**Tech Stack:** Angular 20 signals (`viewChild`, `effect`), CDK DragDrop (unchanged), SCSS

---

### Task 1: Fix CSS overflow + scrollbar

**Files:**

- Modify: `src/app/shared/image-thumbnail-strip/image-thumbnail-strip.component.scss`

No tests needed — this is a visual layout fix.

**Step 1: Apply CSS changes**

In `.thumbnails`, make three changes:

1. Change `justify-content: center` → `justify-content: flex-start`
2. Add `scroll-behavior: smooth`
3. Add scrollbar-hiding rules

The updated `.thumbnails` block should look like this:

```scss
.thumbnails {
  list-style: none;
  margin: 0;
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 4px;
  justify-content: flex-start;
  scroll-behavior: smooth;
  scrollbar-width: none; /* Firefox */

  &::-webkit-scrollbar {
    display: none; /* Chrome/Safari */
  }
}
```

**Step 2: Verify visually (manual)**

Run `npm start`, open a print with 9+ images, confirm the strip no longer overflows the card border and all thumbnails are reachable by scrolling.

**Step 3: Commit**

```bash
git add src/app/shared/image-thumbnail-strip/image-thumbnail-strip.component.scss
git commit -m "fix: constrain thumbnail strip overflow and hide scrollbar"
```

---

### Task 2: Add template reference + auto-scroll logic

**Files:**

- Modify: `src/app/shared/image-thumbnail-strip/image-thumbnail-strip.component.html`
- Modify: `src/app/shared/image-thumbnail-strip/image-thumbnail-strip.component.ts`
- Test: `src/app/shared/image-thumbnail-strip/image-thumbnail-strip.component.spec.ts`

**Step 1: Write the failing test**

Add this `describe` block inside the existing `describe('ImageThumbnailStripComponent', ...)` in the spec file, after the existing tests:

```typescript
describe('auto-scroll', () => {
  it('should call scrollIntoView on the selected thumbnail when selectedId changes', async () => {
    const scrollSpy = spyOn(HTMLElement.prototype, 'scrollIntoView');

    fixture.componentRef.setInput('selectedId', 2);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(scrollSpy).toHaveBeenCalledWith({ block: 'nearest', inline: 'center' });
  });

  it('should not throw when selectedId is undefined', async () => {
    fixture.componentRef.setInput('selectedId', undefined);
    expect(() => {
      fixture.detectChanges();
    }).not.toThrow();
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
npm run test:brief
```

Expected: the `scrollIntoView` test fails because no scroll logic exists yet.

**Step 3: Add `#thumbnailList` to the template**

In `image-thumbnail-strip.component.html`, add `#thumbnailList` to the `<ul>` element:

```html
<ul #thumbnailList class="thumbnails" [cdkDropListDisabled]="!editable()" cdkDropList cdkDropListOrientation="horizontal" (cdkDropListDropped)="onDrop($event)"></ul>
```

**Step 4: Add `viewChild` and `effect` to the component**

Replace the imports and class body in `image-thumbnail-strip.component.ts` with the following. The key additions are: `viewChild`, `ElementRef`, and `effect` from `@angular/core`, plus the `thumbnailList` query and `constructor` with the scroll effect.

Updated imports block:

```typescript
import { Component, ChangeDetectionStrategy, input, output, computed, viewChild, ElementRef, effect } from '@angular/core';
```

Add these two members to the class, before `canAddMore`:

```typescript
private readonly thumbnailList =
  viewChild<ElementRef<HTMLUListElement>>('thumbnailList');

constructor() {
  effect(() => {
    const selectedId = this.selectedId();
    const list = this.thumbnailList()?.nativeElement;
    if (!list || selectedId === undefined) return;

    queueMicrotask(() => {
      const selected = list.querySelector<HTMLLIElement>('li.selected');
      selected?.scrollIntoView({ block: 'nearest', inline: 'center' });
    });
  });
}
```

`queueMicrotask` defers the DOM query until after Angular has finished updating the DOM for the current change detection cycle. No import needed — it is a browser global.

**Step 5: Run tests to verify they pass**

```bash
npm run test:brief
```

Expected: all tests pass including the two new auto-scroll tests.

**Step 6: Commit**

```bash
git add src/app/shared/image-thumbnail-strip/image-thumbnail-strip.component.ts \
        src/app/shared/image-thumbnail-strip/image-thumbnail-strip.component.html \
        src/app/shared/image-thumbnail-strip/image-thumbnail-strip.component.spec.ts
git commit -m "feat: auto-scroll thumbnail strip to keep selected image visible"
```

---

### Task 3: Final verification

**Step 1: Run full test suite**

```bash
npm run test:brief
```

Expected: zero failures.

**Step 2: Run linter**

```bash
npm run lint:brief
```

Expected: zero errors.

**Step 3: Manual smoke test**

- Open a print with 9+ images in view mode — strip stays within card, selected thumbnail scrolls into view when using carousel arrows.
- Open a print in edit mode — drag-to-reorder still works; selected thumbnail stays visible.
