# Low Hanging Fruit - Code Quality Improvements

Identified 2026-02-21. Items marked ✅ are complete.

## High Priority

### ✅ Replace `.toPromise()` with `lastValueFrom()` (5 files)

RxJS deprecated `.toPromise()` — will break in future versions. Replaced with `lastValueFrom()`.

Branches merged:

- `fix/topromise-user-setting` — `user-setting.service.ts`
- `fix/topromise-version-release` — `version-release-note-dialog.service.ts`
- `fix/topromise-cura-parser` — `cura-parser-v1-2-0.service.ts`
- `fix/topromise-printer-list` — `printer-list.component.ts`
- `fix/topromise-gcode-viewer` — `gcode-viewer-modal.component.ts`

### ✅ Replace `[ngStyle]` with `[style.*]` bindings (9 files)

Modern Angular convention. Replaced dynamic bindings with `[style.*]` and static multi-property objects with plain `style="..."` attributes.

Branches merged:

- `fix/ngstyle-print-list` — `print-list.component.html`
- `fix/ngstyle-edit-print` — `edit-print-detail.component.html`
- `fix/ngstyle-printer` — `printer-list.component.html`, `printer-detail.component.html`
- `fix/ngstyle-filament` — `filament-list-container.component.html`, `filament-list.component.html`
- `fix/ngstyle-misc` — `docs-android-app.component.html`, `docs-release-notes.component.html`, `qr-label-dialog.component.html`

**Intentionally skipped:**

- `[ngStyle.xs/sm/md/lt-lg]` — Angular Flex-Layout responsive breakpoint syntax, must stay
- `[ngStyle]="pageStyle()"` / `[ngStyle]="gridStyle()"` in `qr-label-dialog` — computed signals returning multi-property objects

### ✅ Add `ChangeDetectionStrategy.OnPush` (safe components)

Added to 18 components that use no mutable local state — pure presentation, only service method calls, or static templates.

Components updated:

- `documentation/docs/` — all 14 doc components
- `feed/feed.component.ts`
- `home/home.component.ts`
- `users/invalid-user/invalid-user.component.ts`
- `app/app.component.ts`

**Skipped (RISKY — require signal/markForCheck refactoring first):**

- `analytics/` — `analytics.component.ts`, `prints-by-status.component.ts`, `total-filament-used.component.ts`, `total-print-count.component.ts`, `total-print-time.component.ts` — `ngOnChanges` with direct property mutations
- `feed/feed-list/feed-list.component.ts` — `.subscribe()` assigns to `this.feed` without `markForCheck`
- `filament/filament-detail/filament-detail.component.ts`, `filament-list-container/filament-list-container.component.ts` — nested subscribe chains mutating many properties
- `print/edit-print-detail/edit-print-detail.component.ts`, `print/print-comments/print-comments.component.ts` — complex subscribe + form mutations
- `users/user-profile/user-profile.component.ts` — `ngModel` + subscribe mutations
- `settings/settings.component.ts` — `ngModel` + subscribe mutations

---

## Medium Priority

### Replace `[ngClass]` with `[class.*]` bindings (~10 instances)

- `analytics/prints-by-status/prints-by-status.component.html` — `[ngClass]="{ half: showData }"`, `[ngClass]="element.status"`
- `users/user-profile/user-profile.component.html`
- `settings/settings.component.html` — 5 instances
- `print/edit-print-detail/edit-print-detail.component.html` — 2 instances

### Remove `console.log/warn` statements (~8 instances)

Should use `LoggingService` instead. Instances in:

- `printer-maintenance.component.ts:332`
- `core/services/file-parsers/cura/cura-slicer-file-parser.service.ts` — multiple
- `core/services/auth.service.ts:65, 168`
- `print/print-list/print-list.component.ts:699`
- `print/edit-print-detail/edit-print-detail.component.ts:623`

### Fix async Promise executor anti-pattern

- `core/services/navigator-share.service.ts:17` — `new Promise(async (resolve, reject) => {...})`

Use `async/await` directly or restructure to avoid the anti-pattern.

### Migrate remaining `*ngIf`/`*ngFor` to `@if`/`@for` (handful remaining)

- `users/user-profile/user-profile.component.html` — 3 instances
- `filament/filament-detail/filament-detail.component.html` — 4 instances

---

## Low Priority

### Remove commented-out `console.log` statements

- `core/services/file-parsers/cura/cura-slicer-file-parser.service.ts` — 4 lines (276, 282, 297, 303)

### Implement empty `deleteEntry()` method

- `printer-maintenance/printer-maintenance.component.ts:311` — empty method body

### Remove unused variable assignment

- `shared/gcode-viewer-modal/gcode-viewer-modal.component.ts:128` — `isShared` assigned but never read

### Address TODO comments

- `core/services/auth.service.ts:126` — save updated user back to `userProfile$`
- `core/services/auth.service.ts:175` — `getTokenSilently` type issue
- `print/services/integration/cura/cura-parser-v1-2-0.service.ts:71` — validation
