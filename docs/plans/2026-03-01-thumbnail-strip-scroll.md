# Design: Constrain + Auto-Scroll Thumbnail Strip

**Date:** 2026-03-01
**Status:** Approved

## Problem

When a print has more than ~8 images, the `ImageThumbnailStripComponent` thumbnail row overflows its container border. The root cause is `justify-content: center` combined with `overflow-x: auto` — a known CSS quirk where the overflow clips symmetrically, making left-side thumbnails unreachable even with scroll.

## Solution: Option A — Constrain + Auto-Scroll

Keep the existing strip layout but fix the overflow behavior and auto-scroll the selected thumbnail into view.

### CSS (`image-thumbnail-strip.component.scss`)

- Change `justify-content: center` → `justify-content: flex-start` on `.thumbnails` to fix the centering/overflow quirk.
- Keep `overflow-x: auto` for scrollable container.
- Hide the scrollbar visually (`scrollbar-width: none` + `::-webkit-scrollbar { display: none }`) — the strip scrolls programmatically so no visible scrollbar is needed.
- Add `scroll-behavior: smooth` for polished transitions.

### TypeScript (`image-thumbnail-strip.component.ts`)

- Add `viewChild<ElementRef<HTMLUListElement>>('thumbnailList')` signal to reference the `<ul>`.
- Use `effect()` to watch `selectedId()` changes; after the render cycle, query `li.selected` inside the list and call `scrollIntoView({ block: 'nearest', inline: 'center' })`.

### Template (`image-thumbnail-strip.component.html`)

- Add `#thumbnailList` template reference to the `<ul>`. One-line change.

## Scope

Changes are entirely within `ImageThumbnailStripComponent`. No parent components change. Works for both view mode (`view-print-detail`) and edit mode (`edit-print-detail`, drag-to-reorder unaffected).

## Files Changed

- `src/app/shared/image-thumbnail-strip/image-thumbnail-strip.component.ts`
- `src/app/shared/image-thumbnail-strip/image-thumbnail-strip.component.html`
- `src/app/shared/image-thumbnail-strip/image-thumbnail-strip.component.scss`
