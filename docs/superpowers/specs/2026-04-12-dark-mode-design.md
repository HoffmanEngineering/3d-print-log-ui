# Dark Mode — Design Spec

**Story:** #64  
**Date:** 2026-04-12  
**Status:** Approved

---

## Summary

Add a Light / System / Dark theme toggle to the app. Default is System (follows OS `prefers-color-scheme`). Preference is stored in `localStorage` — per device, not per account, which is the industry standard for display preferences.

---

## Decisions

| Question         | Decision                  | Rationale                                                                                      |
| ---------------- | ------------------------- | ---------------------------------------------------------------------------------------------- |
| Storage          | `localStorage` only       | Display preference, not account preference. Avoids API round-trip flash on load.               |
| Toggle placement | Settings page only        | Consistent with other app preferences (currency, visibility, etc.).                            |
| Toggle style     | `mat-button-toggle-group` | Consistent with Angular Material components used elsewhere.                                    |
| Implementation   | AM20 custom SCSS theme    | The correct approach for Angular Material 20 (M3). Full color control, easy to update later.   |
| Dark palette     | Material Dark             | #121212 background, #1e1e1e cards, indigo accent. Easy to swap later — all colors in one file. |

---

## Architecture

### 1. SCSS Theme (`src/styles/theme.scss`)

Replace `./node_modules/@angular/material/prebuilt-themes/indigo-pink.css` in `angular.json` with a new custom theme file.

- Define `$light-theme` using `mat.define-theme()` with indigo primary + pink tertiary (matches current prebuilt — light mode appearance unchanged)
- Define `$dark-theme` using `mat.define-theme()` with `theme-type: dark`, same palette
- Apply `$light-theme` to `html` by default
- Apply `$dark-theme` color overrides under `body.dark-theme`
- Set `color-scheme: dark` and base colors (`background-color: #121212`, `color: #e0e0e0`) under `body.dark-theme`
- Override `body { background-color: #fafafa }` from `styles.scss` under `body.dark-theme`

### 2. ThemeService (`src/app/core/services/theme.service.ts`)

New service, `providedIn: 'root'`.

```
localStorage key: 'theme-mode'
values: 'light' | 'system' | 'dark'
default: 'system'
```

**Public API:**

- `mode: Signal<ThemeMode>` — current selected mode (not necessarily the effective theme)
- `initialize(): void` — reads localStorage, applies initial theme, registers media query listener
- `setMode(mode: ThemeMode): void` — updates signal, writes localStorage, applies theme

**Internal logic:**

- `applyTheme(mode)` toggles `.dark-theme` on `document.body`
- Effective dark = `mode === 'dark'` OR (`mode === 'system'` AND `matchMedia('(prefers-color-scheme: dark)').matches`)
- Media query `change` listener re-applies theme only when `mode === 'system'`

### 3. AppComponent (`src/app/app.component.ts`)

Call `themeService.initialize()` in `ngOnInit()`. This runs before any child components render, preventing a flash of the wrong theme.

### 4. Settings UI (`src/app/settings/`)

Add to `settings.component.ts`:

- Inject `ThemeService`
- `setThemeMode(mode: ThemeMode)` — calls `themeService.setMode()` and logs `Settings_ThemeModeChanged` event via `LoggingService`

Add to `settings.component.html` (alongside existing preference rows):

- `mat-button-toggle-group` bound to `themeService.mode()` signal
- Three toggles: ☀️ Light | 🌓 System | 🌙 Dark
- No save/cancel buttons — change is instant

Import `MatButtonToggleModule` into `SettingsModule`.

---

## Dark Mode CSS Scope

### In scope

**Status badge backgrounds** — pastel chip backgrounds (`#e8f5e9`, `#ffebee`, `#fff9c4`, `#e1f5fe`, `#f3e5f5`, `#ffebee`) used for print status indicators clash on dark backgrounds. Override under `body.dark-theme` with darker, lower-opacity equivalents that preserve the semantic color signal.

**Global body background** — `background-color: #fafafa` in `styles.scss` must be overridden. Handled in `theme.scss` under `body.dark-theme`.

**D3 donut chart** (`src/app/shared/panels/donut-chart/`) — SVG text labels and legend text are hardcoded dark. Override SVG `text` fill under `body.dark-theme .donut-chart` in the component's SCSS file. No changes to the D3 component's TypeScript API needed.

**Filament color swatches** — add a subtle `1px solid rgba(255,255,255,0.15)` border under `body.dark-theme` so very dark swatches (black, dark navy) are visible against dark card backgrounds.

**Hardcoded component SCSS colors** — audit and override the most visible instances: card backgrounds (`#fff`, `#f5f5f5`, `#f9f9f9`), muted text colors (`#999`, `#757575`). Best-effort; edge cases can be addressed in follow-up.

### Out of scope

**ngx-toastr** — has its own CSS bundle, not worth theming. Toast notifications remain default-styled in dark mode.

---

## Testing

### `theme.service.spec.ts` (new)

- Default mode is `'system'` when localStorage is empty
- Loads saved mode from localStorage on construction
- `setMode('dark')` adds `.dark-theme` to body, writes to localStorage
- `setMode('light')` removes `.dark-theme` from body
- `setMode('system')` applies dark class when `prefers-color-scheme: dark` matches
- `setMode('system')` removes dark class when `prefers-color-scheme: light` matches
- Media query `change` event re-applies theme when mode is `'system'`
- Media query `change` event does nothing when mode is `'dark'` or `'light'`

### `settings.component.spec.ts` (update)

- Toggle group renders with the current theme mode selected
- Changing the toggle calls `themeService.setMode()` with the correct value

### `app.component.spec.ts` (update)

- `themeService.initialize()` is called on `ngOnInit`

---

## Out of Scope

- Backend `UserSettingType` enum change — no API changes needed
- Theme sync across devices
- Additional theme palettes beyond light/dark
- Theming ngx-toastr notifications
