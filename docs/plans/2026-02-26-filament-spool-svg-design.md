# Filament Spool SVG Icon — Design Doc

**Date:** 2026-02-26
**Branch:** FilamentListMobileRedesign
**Status:** Approved

## Goal

Replace the plain color swatch (`.card-swatch`) on the mobile filament list cards with a styled SVG illustration of a filament spool. The wound filament on the barrel uses the filament's actual color, making the icon both informative and visually distinctive.

## Visual Design

### Perspective
3D perspective (3/4 view) — spool viewed from roughly the "2 o'clock" position. The viewer sees:
- The full circular front face of the spool
- A wide band of colored filament wrapping around the right side of the barrel

### SVG Layer Order (back to front)

1. **Back flange** — dark ellipse (`#1a1a1a`) slightly right of center, smaller (perspective foreshortening). Peeks around the right side to give 3D thickness.
2. **Barrel + connecting strip** — a single path connecting the outer rims of both flanges. Filled with the **filament color** (dynamic). This is the main colored area, visible as a wide crescent on the right.
3. **Front flange** — large charcoal ellipse (`#2d2d2d`), centered slightly left. Overlaps and conceals most of the barrel's left side. Has a subtle inner ring stroke (`#3d3d3d`) for rim depth.
4. **Hub hole** — small dark ellipse (`#111`) at center of front flange. Gives the spool its recognizable hollow center.

### SVG Viewport
- `viewBox="0 0 80 80"` — square, renders at ~48×48px on mobile cards.

### Colors
- Spool frame (flanges): `#2d2d2d` (front), `#1a1a1a` (back) — dark charcoal
- Barrel filament: dynamic (from `filament.colorHex`)
- Hub hole: `#111111`
- Rim highlight stroke: `#3d3d3d`

## Component Architecture

### New Component
```
src/app/shared/components/filament-spool-icon/
  filament-spool-icon.component.ts
  filament-spool-icon.component.html
```

- **Standalone component**, `ChangeDetectionStrategy.OnPush`
- Input: `color = input<string>('')` — hex string without `#`
- Computed: `fillColor = computed(() => '#' + this.color())`
- Renders the SVG inline with dynamic `[attr.fill]` binding on the barrel path
- No SCSS needed (SVG handles all styling)

### Integration
In `filament-list-container.component.html`, the `.card-swatch` div is **replaced** with:
```html
<app-filament-spool-icon [color]="filament.colorHex" class="card-swatch-icon" />
```

In `filament-list-container.component.scss`:
- Remove `.card-swatch` rule
- Add `.card-swatch-icon` rule: `flex-shrink: 0; display: flex; align-items: center;`

### What Stays Unchanged
- Desktop table view: existing `.filament-color-cell` colored rectangle — untouched
- All services, routing, and other components — no changes

## Scope

| File | Change |
|------|--------|
| `src/app/shared/components/filament-spool-icon/filament-spool-icon.component.ts` | **New** |
| `src/app/shared/components/filament-spool-icon/filament-spool-icon.component.html` | **New** |
| `src/app/filament/filament-list-container/filament-list-container.component.html` | Replace `.card-swatch` div |
| `src/app/filament/filament-list-container/filament-list-container.component.scss` | Swap swatch styles for icon wrapper |
| `src/app/shared/shared.module.ts` | Export new component (if needed) |
