# Electricity Cost Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add electricity cost tracking so users can see the electricity cost of each print, calculated from their kWh rate and per-printer wattage.

**Architecture:** Electricity cost is computed client-side on the fly (never stored) using `(wattageW / 1000) × (printTimeSeconds / 3600) × kwhRate`. Two new UserSetting types store the global kWh rate and default wattage. A nullable `WattageW` column on the Printer table allows per-printer overrides.

**Tech Stack:** .NET / EF Core (backend), Angular 20 / TypeScript (frontend), `currency.js` for formatting, Angular Material for UI.

---

## File Map

**Backend (`D:/Development/3d-print-log/PrintLogApi/PrintLogApi/`):**

- Modify: `Models/Printer.cs` — add `WattageW` property
- Modify: `Models/DTOs/Printer/PrinterDetailDto.cs` — add `WattageW`
- Modify: `Models/DTOs/Printer/AddPrinterDTO.cs` — add `WattageW` with validation
- Modify: `Models/DTOs/Printer/PrinterSummary.cs` — add `WattageW` (embedded in print records)
- Modify: `Models/DTOs/Printer/PrinterSummarySimpleDto.cs` — add `WattageW` (printer list endpoint)
- Create: `Migrations/<timestamp>_AddElectricityCostTracking.cs` — via `dotnet ef migrations add`

**Frontend (`D:/Development/3d-print-log/print-log-ui/src/`):**

- Modify: `app/core/services/printer.service.ts` — add `wattageW` to all printer interfaces
- Modify: `app/core/services/print.service.ts` — add `ElectricityCost` types + `calculateElectricityCost()`
- Modify: `app/core/services/user-setting.service.ts` — add 2 enum values
- Create: `app/core/resolvers/default-electricity-kwh-rate-setting-resolver.service.ts`
- Create: `app/core/resolvers/default-electricity-wattage-setting-resolver.service.ts`
- Modify: `app/settings/settings-routing.module.ts` — register new resolvers
- Modify: `app/settings/settings.component.ts` — add electricity settings fields + save methods
- Modify: `app/settings/settings.component.html` — add Electricity Cost section UI
- Modify: `app/print/print-routing.module.ts` — register resolvers on all print routes
- Modify: `app/printer/printer-detail/printer-detail.component.ts` — add `wattageW` form control
- Modify: `app/printer/printer-detail/printer-detail.component.html` — add wattage input field
- Modify: `app/print/print-list/print-list.component.ts` — add electricity column + total cost update
- Modify: `app/print/print-list/print-list.component.html` — add electricity column + tooltip on total cost
- Modify: `app/print/print-list/print-grouped-view/print-grouped-view.component.ts` — add electricity inputs + methods
- Modify: `app/print/print-list/print-grouped-view/print-grouped-view.component.html` — add electricity display
- Modify: `app/print/view-print-detail/view-print-detail.component.ts` — add electricity cost display logic
- Modify: `app/print/view-print-detail/view-print-detail.component.html` — add electricity cost row
- Modify: `app/print/edit-print-detail/edit-print-detail.component.ts` — add reactive electricity preview
- Modify: `app/print/edit-print-detail/edit-print-detail.component.html` — add preview near print time fields
- Modify: `app/documentation/docs/docs-prints/docs-prints.component.html` — add electricity cost section
- Modify: `app/documentation/docs/docs-printers/docs-printers.component.html` — add wattage field note
- Modify: `app/documentation/docs/docs-getting-started/docs-getting-started.component.html` — add electricity settings note

---

## Task 1: Backend — Add WattageW to Printer entity and DTOs

**Files:**

- Modify: `PrintLogApi/PrintLogApi/Models/Printer.cs`
- Modify: `PrintLogApi/PrintLogApi/Models/DTOs/Printer/PrinterDetailDto.cs`
- Modify: `PrintLogApi/PrintLogApi/Models/DTOs/Printer/AddPrinterDTO.cs`
- Modify: `PrintLogApi/PrintLogApi/Models/DTOs/Printer/PrinterSummary.cs`
- Modify: `PrintLogApi/PrintLogApi/Models/DTOs/Printer/PrinterSummarySimpleDto.cs`

- [ ] **Add `WattageW` to `Printer.cs`** — insert after `HasHeatedChamber`:

```csharp
public bool? HasHeatedChamber { get; set; }

public double? WattageW { get; set; }
```

- [ ] **Add `WattageW` to `PrinterDetailDto.cs`** — insert after `HasHeatedChamber`:

```csharp
public bool? HasHeatedChamber { get; set; }

public double? WattageW { get; set; }
```

- [ ] **Add `WattageW` to `AddPrinterDTO.cs`** — insert after `HasHeatedChamber`:

```csharp
public bool? HasHeatedChamber { get; set; }

[Range(0, double.MaxValue, ErrorMessage = "Only positive number allowed")]
public double? WattageW { get; set; }
```

- [ ] **Add `WattageW` to `PrinterSummary.cs`** — insert after `IsActive`:

```csharp
public bool IsActive { get; set; }

public double? WattageW { get; set; }
```

- [ ] **Add `WattageW` to `PrinterSummarySimpleDto.cs`** — insert after `IsActive`:

```csharp
public bool IsActive { get; set; }

public double? WattageW { get; set; }
```

- [ ] **Commit**

```bash
cd "D:/Development/3d-print-log/PrintLogApi"
git add PrintLogApi/Models/Printer.cs PrintLogApi/Models/DTOs/Printer/PrinterDetailDto.cs PrintLogApi/Models/DTOs/Printer/AddPrinterDTO.cs PrintLogApi/Models/DTOs/Printer/PrinterSummary.cs PrintLogApi/Models/DTOs/Printer/PrinterSummarySimpleDto.cs
git commit -m "feat: add WattageW to Printer entity and DTOs"
```

---

## Task 2: Backend — EF Core Migration

**Files:**

- Create: `PrintLogApi/PrintLogApi/Migrations/<timestamp>_AddElectricityCostTracking.cs` (generated)

- [ ] **Generate the migration** from the `PrintLogApi/PrintLogApi` directory:

```bash
cd "D:/Development/3d-print-log/PrintLogApi/PrintLogApi"
dotnet ef migrations add AddElectricityCostTracking
```

Expected: A new migration file created in `Migrations/`.

- [ ] **Edit the generated migration** to also seed the two new `UserSettingType` rows. Open the generated file and add `InsertData` calls inside `Up()` after the `AddColumn` call:

```csharp
migrationBuilder.AddColumn<double>(
    name: "WattageW",
    table: "Printers",
    type: "float",
    nullable: true);

migrationBuilder.InsertData(
    table: "UserSettingTypes",
    columns: new[] { "Id", "Name", "Description" },
    values: new object[] { 12, "Electricity_KwhRate", "The user's electricity rate in currency per kWh." });

migrationBuilder.InsertData(
    table: "UserSettingTypes",
    columns: new[] { "Id", "Name", "Description" },
    values: new object[] { 13, "Electricity_DefaultWattageW", "Default printer wattage in watts used when a printer has no specific wattage set." });
```

Also add the corresponding `Down()` rollback:

```csharp
migrationBuilder.DropColumn(
    name: "WattageW",
    table: "Printers");

migrationBuilder.DeleteData(
    table: "UserSettingTypes",
    keyColumn: "Id",
    keyValue: 12);

migrationBuilder.DeleteData(
    table: "UserSettingTypes",
    keyColumn: "Id",
    keyValue: 13);
```

- [ ] **Apply the migration** to verify it runs cleanly:

```bash
dotnet ef database update
```

Expected: `Done.` with no errors.

- [ ] **Commit**

```bash
cd "D:/Development/3d-print-log/PrintLogApi"
git add PrintLogApi/Migrations/
git commit -m "feat: add AddElectricityCostTracking migration"
```

---

## Task 3: Frontend — Update Printer TypeScript Interfaces

**Files:**

- Modify: `src/app/core/services/printer.service.ts`

- [ ] **Add `wattageW` to `PrinterSummary` interface** — insert after `isActive`:

```typescript
export interface PrinterSummary {
  id: number;
  name: string;
  make: string;
  model: string;
  isActive: boolean;
  wattageW?: number | null;
  category: PrinterCategory;
}
```

- [ ] **Add `wattageW` to `PrinterDetail` interface** — insert after `hasHeatedChamber`:

```typescript
hasHeatedBed?: boolean;
hasHeatedChamber?: boolean;
wattageW?: number | null;
```

- [ ] **Add `wattageW` to `AddPrinterDetailDto` interface** — insert after `hasHeatedChamber`:

```typescript
hasHeatedBed?: boolean;
hasHeatedChamber?: boolean;
wattageW?: number | null;
```

- [ ] **Run tests to verify nothing broke**

```bash
cd "D:/Development/3d-print-log/print-log-ui"
npm run test:brief
```

Expected: All existing tests pass.

- [ ] **Commit**

```bash
git add src/app/core/services/printer.service.ts
git commit -m "feat: add wattageW to printer TypeScript interfaces"
```

---

## Task 4: Frontend — Electricity Cost Calculation Engine

**Files:**

- Modify: `src/app/core/services/user-setting.service.ts`
- Modify: `src/app/core/services/print.service.ts`
- Modify: `src/app/core/services/print.service.spec.ts`

- [ ] **Add two new `UserSettingType` enum values** in `user-setting.service.ts` — insert after `Prints_LastSelectedWireMeasureType = 11`:

```typescript
Prints_LastSelectedWireMeasureType = 11,
Electricity_KwhRate = 12,
Electricity_DefaultWattageW = 13,
```

- [ ] **Add `ElectricityCost` discriminated union types** to `print.service.ts` — insert after the `FilamentPrice` type (around line 243):

```typescript
export type ElectricityCostValid = {
  valid: true;
  cost: currency;
  formattedCost: string;
  symbol: string;
  usesDefaultWattage: boolean;
  wattageW: number;
  printTimeHours: number;
};

export type ElectricityCostInvalid = {
  valid: false;
  message: string;
};

export type ElectricityCost = ElectricityCostValid | ElectricityCostInvalid;
```

- [ ] **Write failing tests** for `calculateElectricityCost()` in `print.service.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { PrintService } from './print.service';

describe('PrintService', () => {
  let service: PrintService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [],
      providers: [provideHttpClient(withInterceptorsFromDi()), provideHttpClientTesting()],
    });
    service = TestBed.inject(PrintService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('calculateElectricityCost', () => {
    it('returns invalid with empty message when printTimeSeconds is null', () => {
      const result = service.calculateElectricityCost({
        printTimeSeconds: null,
        kwhRate: '0.15',
        printerWattageW: 200,
        defaultWattageW: '150',
        currencySymbol: '$',
      });
      expect(result.valid).toBeFalse();
      expect((result as any).message).toBe('');
    });

    it('returns invalid with empty message when printTimeSeconds is 0', () => {
      const result = service.calculateElectricityCost({
        printTimeSeconds: 0,
        kwhRate: '0.15',
        printerWattageW: 200,
        defaultWattageW: '150',
        currencySymbol: '$',
      });
      expect(result.valid).toBeFalse();
      expect((result as any).message).toBe('');
    });

    it('returns invalid with rate message when kwhRate is null', () => {
      const result = service.calculateElectricityCost({
        printTimeSeconds: 3600,
        kwhRate: null,
        printerWattageW: 200,
        defaultWattageW: '150',
        currencySymbol: '$',
      });
      expect(result.valid).toBeFalse();
      expect((result as any).message).toBe('(Electricity rate not set)');
    });

    it('returns invalid with wattage message when both wattages are null', () => {
      const result = service.calculateElectricityCost({
        printTimeSeconds: 3600,
        kwhRate: '0.15',
        printerWattageW: null,
        defaultWattageW: null,
        currencySymbol: '$',
      });
      expect(result.valid).toBeFalse();
      expect((result as any).message).toBe('(Printer wattage not set)');
    });

    it('calculates correctly with printer wattage', () => {
      // 200W × 1h / 1000 × $0.15/kWh = $0.03
      const result = service.calculateElectricityCost({
        printTimeSeconds: 3600,
        kwhRate: '0.15',
        printerWattageW: 200,
        defaultWattageW: null,
        currencySymbol: '$',
      });
      expect(result.valid).toBeTrue();
      if (result.valid) {
        expect(result.cost.value).toBeCloseTo(0.03, 4);
        expect(result.usesDefaultWattage).toBeFalse();
        expect(result.wattageW).toBe(200);
        expect(result.printTimeHours).toBeCloseTo(1, 4);
      }
    });

    it('calculates correctly using default wattage when printer wattage is null', () => {
      // 150W × 2h / 1000 × $0.20/kWh = $0.06
      const result = service.calculateElectricityCost({
        printTimeSeconds: 7200,
        kwhRate: '0.20',
        printerWattageW: null,
        defaultWattageW: '150',
        currencySymbol: '$',
      });
      expect(result.valid).toBeTrue();
      if (result.valid) {
        expect(result.cost.value).toBeCloseTo(0.06, 4);
        expect(result.usesDefaultWattage).toBeTrue();
        expect(result.wattageW).toBe(150);
      }
    });
  });
});
```

- [ ] **Run tests to confirm they fail**

```bash
npm run test:brief
```

Expected: `calculateElectricityCost` tests fail with "service.calculateElectricityCost is not a function".

- [ ] **Implement `calculateElectricityCost()` in `print.service.ts`** — add as a public method after `calculateTotalPrintCost()`:

```typescript
public calculateElectricityCost({
  printTimeSeconds,
  kwhRate,
  printerWattageW,
  defaultWattageW,
  currencySymbol,
}: {
  printTimeSeconds: number | null | undefined;
  kwhRate: string | null | undefined;
  printerWattageW: number | null | undefined;
  defaultWattageW: string | null | undefined;
  currencySymbol: string;
}): ElectricityCost {
  if (!printTimeSeconds || printTimeSeconds <= 0) {
    return { valid: false, message: '' };
  }

  if (!kwhRate) {
    return { valid: false, message: '(Electricity rate not set)' };
  }

  const effectiveWattage =
    printerWattageW != null
      ? printerWattageW
      : defaultWattageW != null
        ? Number(defaultWattageW)
        : null;

  if (effectiveWattage == null || isNaN(effectiveWattage)) {
    return { valid: false, message: '(Printer wattage not set)' };
  }

  const usesDefaultWattage = printerWattageW == null;
  const printTimeHours = printTimeSeconds / 3600;
  const kwhUsed = (effectiveWattage / 1000) * printTimeHours;
  const cost = currency(kwhUsed * Number(kwhRate));

  function getDecimalSeparator() {
    return Intl.NumberFormat()
      .formatToParts(100000.1)
      .find((part) => part.type === 'decimal').value;
  }

  function getGroupSeparator() {
    return Intl.NumberFormat()
      .formatToParts(100000.1)
      .find((part) => part.type === 'group').value;
  }

  const currencyFormat = {
    symbol: currencySymbol,
    decimal: getDecimalSeparator(),
    separator: getGroupSeparator(),
  };

  return {
    valid: true,
    cost,
    formattedCost: cost.format(currencyFormat),
    symbol: currencySymbol,
    usesDefaultWattage,
    wattageW: effectiveWattage,
    printTimeHours,
  };
}
```

- [ ] **Run tests to confirm they pass**

```bash
npm run test:brief
```

Expected: All tests pass including the new `calculateElectricityCost` tests.

- [ ] **Commit**

```bash
git add src/app/core/services/user-setting.service.ts src/app/core/services/print.service.ts src/app/core/services/print.service.spec.ts
git commit -m "feat: add ElectricityCost types and calculateElectricityCost method"
```

---

## Task 5: Frontend — Resolvers

**Files:**

- Create: `src/app/core/resolvers/default-electricity-kwh-rate-setting-resolver.service.ts`
- Create: `src/app/core/resolvers/default-electricity-wattage-setting-resolver.service.ts`

- [ ] **Create `default-electricity-kwh-rate-setting-resolver.service.ts`**:

```typescript
import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { UserSettingService, UserSettingType } from 'src/app/core/services/user-setting.service';

@Injectable({
  providedIn: 'root',
})
export class DefaultElectricityKwhRateSettingResolverService {
  constructor(private readonly userSettingService: UserSettingService) {}

  resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    return this.userSettingService.getCurrentUsersSettingByType(UserSettingType.Electricity_KwhRate);
  }
}
```

- [ ] **Create `default-electricity-wattage-setting-resolver.service.ts`**:

```typescript
import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { UserSettingService, UserSettingType } from 'src/app/core/services/user-setting.service';

@Injectable({
  providedIn: 'root',
})
export class DefaultElectricityWattageSettingResolverService {
  constructor(private readonly userSettingService: UserSettingService) {}

  resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    return this.userSettingService.getCurrentUsersSettingByType(UserSettingType.Electricity_DefaultWattageW);
  }
}
```

- [ ] **Run tests**

```bash
npm run test:brief
```

Expected: All tests pass.

- [ ] **Commit**

```bash
git add src/app/core/resolvers/default-electricity-kwh-rate-setting-resolver.service.ts src/app/core/resolvers/default-electricity-wattage-setting-resolver.service.ts
git commit -m "feat: add electricity cost setting resolvers"
```

---

## Task 6: Frontend — Register Resolvers in Routing Modules

**Files:**

- Modify: `src/app/settings/settings-routing.module.ts`
- Modify: `src/app/print/print-routing.module.ts`

- [ ] **Update `settings-routing.module.ts`** — add imports and register both resolvers:

```typescript
import { DefaultElectricityKwhRateSettingResolverService } from '../core/resolvers/default-electricity-kwh-rate-setting-resolver.service';
import { DefaultElectricityWattageSettingResolverService } from '../core/resolvers/default-electricity-wattage-setting-resolver.service';
```

Add to the `resolve` object:

```typescript
resolve: {
  // ...existing resolvers...
  defaultElectricityKwhRateSetting: DefaultElectricityKwhRateSettingResolverService,
  defaultElectricityWattageSetting: DefaultElectricityWattageSettingResolverService,
},
```

- [ ] **Update `print-routing.module.ts`** — add imports at the top:

```typescript
import { DefaultElectricityKwhRateSettingResolverService } from '../core/resolvers/default-electricity-kwh-rate-setting-resolver.service';
import { DefaultElectricityWattageSettingResolverService } from '../core/resolvers/default-electricity-wattage-setting-resolver.service';
```

Add `defaultElectricityKwhRateSetting` and `defaultElectricityWattageSetting` to the `resolve` objects for **all four routes**: `PrintListComponent` (`path: ''`), `EditPrintDetailComponent` at `copy/:id`, `EditPrintDetailComponent` at `:id/edit`, and `ViewPrintDetailComponent` at `:id`.

For each route, add:

```typescript
defaultElectricityKwhRateSetting: DefaultElectricityKwhRateSettingResolverService,
defaultElectricityWattageSetting: DefaultElectricityWattageSettingResolverService,
```

The `ViewPrintDetailComponent` route (`path: ':id'`) currently has **no** currency resolver. Also add `CurrencySymbolResolverService` to it so the view can format electricity costs correctly:

```typescript
import { CurrencySymbolResolverService } from '../core/resolvers/currency-symbol-resolver.service';

// In the ':id' route resolve object:
{
  path: ':id',
  component: ViewPrintDetailComponent,
  resolve: {
    print: PrintDetailResolverService,
    preferredCurrencySymbolSetting: CurrencySymbolResolverService,
    defaultElectricityKwhRateSetting: DefaultElectricityKwhRateSettingResolverService,
    defaultElectricityWattageSetting: DefaultElectricityWattageSettingResolverService,
  },
},
```

- [ ] **Run tests**

```bash
npm run test:brief
```

Expected: All tests pass.

- [ ] **Commit**

```bash
git add src/app/settings/settings-routing.module.ts src/app/print/print-routing.module.ts
git commit -m "feat: register electricity resolvers in routing modules"
```

---

## Task 7: Frontend — Settings Page

**Files:**

- Modify: `src/app/settings/settings.component.ts`
- Modify: `src/app/settings/settings.component.html`

- [ ] **Add electricity settings fields to `settings.component.ts`**:

Add these public fields after `defaultFilamentPrice`:

```typescript
public defaultElectricityKwhRateSettingOnLoad: UserSetting | null = null;
public defaultElectricityWattageSettingOnLoad: UserSetting | null = null;
public defaultElectricityKwhRate: string = null;
public defaultElectricityWattageW: string = null;
```

In `ngOnInit` inside the `activatedRoute.data.subscribe` block, add after the filament price lines:

```typescript
this.defaultElectricityKwhRateSettingOnLoad = data.defaultElectricityKwhRateSetting;
this.defaultElectricityWattageSettingOnLoad = data.defaultElectricityWattageSetting;
this.defaultElectricityKwhRate = this.defaultElectricityKwhRateSettingOnLoad?.value ?? null;
this.defaultElectricityWattageW = this.defaultElectricityWattageSettingOnLoad?.value ?? null;
```

- [ ] **Add save methods to `settings.component.ts`** — follow the exact same pattern as `saveDefaultFilamentPrice`. Add after the filament price save method:

```typescript
saveDefaultElectricityKwhRate(newRate: string) {
  if (this.defaultElectricityKwhRateSettingOnLoad) {
    this.userSettingService
      .updateUserSetting(this.defaultElectricityKwhRateSettingOnLoad.id, newRate)
      .subscribe((setting) => {
        this.defaultElectricityKwhRateSettingOnLoad = setting;
      });
  } else {
    this.userSettingService
      .addUserSetting(UserSettingType.Electricity_KwhRate, newRate)
      .subscribe((setting) => {
        this.defaultElectricityKwhRateSettingOnLoad = setting;
      });
  }
  this.loggingService.logEvent('Settings_ElectricityKwhRateChanged');
}

saveDefaultElectricityWattage(newWattage: string) {
  if (this.defaultElectricityWattageSettingOnLoad) {
    this.userSettingService
      .updateUserSetting(this.defaultElectricityWattageSettingOnLoad.id, newWattage)
      .subscribe((setting) => {
        this.defaultElectricityWattageSettingOnLoad = setting;
      });
  } else {
    this.userSettingService
      .addUserSetting(UserSettingType.Electricity_DefaultWattageW, newWattage)
      .subscribe((setting) => {
        this.defaultElectricityWattageSettingOnLoad = setting;
      });
  }
  this.loggingService.logEvent('Settings_ElectricityDefaultWattageChanged');
}
```

- [ ] **Add Electricity Cost section to `settings.component.html`** — find the section where the default filament price input is rendered and add a new section below it following the same structure. The section should show:

```html
<mat-card>
  <mat-card-header>
    <mat-card-title>Electricity Cost</mat-card-title>
  </mat-card-header>
  <mat-card-content>
    <p>Track the electricity cost of each print based on your rate and printer wattage.</p>
    <mat-form-field>
      <mat-label>Electricity Rate ({{ preferredCurrencySymbolSettingOnLoad?.value ?? '$' }}/kWh)</mat-label>
      <input matInput type="number" min="0" step="0.01" [(ngModel)]="defaultElectricityKwhRate" (change)="saveDefaultElectricityKwhRate(defaultElectricityKwhRate)" placeholder="e.g. 0.15" />
      <mat-hint>Enter your rate from your electricity bill.</mat-hint>
    </mat-form-field>
    <mat-form-field>
      <mat-label>Default Printer Wattage (W)</mat-label>
      <input matInput type="number" min="0" step="1" [(ngModel)]="defaultElectricityWattageW" (change)="saveDefaultElectricityWattage(defaultElectricityWattageW)" placeholder="e.g. 150" />
      <mat-hint>Used for printers without a specific wattage set. Typical FDM printers average 50–300W; check your power supply label or printer specs for a more accurate value.</mat-hint>
    </mat-form-field>
  </mat-card-content>
</mat-card>
```

- [ ] **Run tests**

```bash
npm run test:brief
```

Expected: All tests pass.

- [ ] **Commit**

```bash
git add src/app/settings/settings.component.ts src/app/settings/settings.component.html
git commit -m "feat: add electricity cost settings UI"
```

---

## Task 8: Frontend — Printer Detail Form

**Files:**

- Modify: `src/app/printer/printer-detail/printer-detail.component.ts`
- Modify: `src/app/printer/printer-detail/printer-detail.component.html`

- [ ] **Add `wattageW` form control to `buildFormFromPrinterDetail()` in `printer-detail.component.ts`** — inside the `formBuilder.group({...})` call, insert after `hasHeatedChamber`:

```typescript
hasHeatedChamber: [
  printer &&
  printer.hasHeatedChamber !== null &&
  printer.hasHeatedChamber !== undefined
    ? printer.hasHeatedChamber
    : false,
],
wattageW: [
  printer?.wattageW ?? null,
  [Validators.min(0)],
],
```

- [ ] **Include `wattageW` in the printer object built for submission** — in the `getPrinterFromForm()` method (around line 473), insert after `hasHeatedChamber`:

```typescript
hasHeatedChamber: this.printerForm.controls.hasHeatedChamber.enabled
  ? this.printerForm.controls.hasHeatedChamber.value
  : undefined,
wattageW: this.printerForm.controls.wattageW.value ?? undefined,
```

- [ ] **Add the wattage input to `printer-detail.component.html`** — find where `hasHeatedBed` and `hasHeatedChamber` checkboxes are rendered and add an input field nearby:

```html
<mat-form-field>
  <mat-label>Average Wattage (W)</mat-label>
  <input matInput type="number" min="0" formControlName="wattageW" placeholder="e.g. 150" />
  <mat-hint>Leave blank to use your default wattage from Settings.</mat-hint>
</mat-form-field>
```

- [ ] **Run tests**

```bash
npm run test:brief
```

Expected: All tests pass.

- [ ] **Commit**

```bash
git add src/app/printer/printer-detail/printer-detail.component.ts src/app/printer/printer-detail/printer-detail.component.html
git commit -m "feat: add wattage field to printer detail form"
```

---

## Task 9: Frontend — Print List

**Files:**

- Modify: `src/app/print/print-list/print-list.component.ts`
- Modify: `src/app/print/print-list/print-list.component.html`

- [ ] **Add electricity cost resolved data fields to `print-list.component.ts`** — add after `preferredCurrencySymbolSetting`:

```typescript
public defaultElectricityKwhRateSetting: UserSetting | null = null;
public defaultElectricityWattageSetting: UserSetting | null = null;
```

In `ngOnInit` where `data` is read from the route, add:

```typescript
this.defaultElectricityKwhRateSetting = data.defaultElectricityKwhRateSetting;
this.defaultElectricityWattageSetting = data.defaultElectricityWattageSetting;
```

- [ ] **Add the electricity cost column definition to the available columns array** in `print-list.component.ts` — insert after the `totalCost` column entry:

```typescript
{
  key: 'electricityCost',
  displayName: 'Electricity Cost',
  description: 'Displays the electricity cost based on print time and printer wattage.',
},
```

- [ ] **Add `getElectricityCost()` and `getTotalCombinedCost()` methods to `print-list.component.ts`**:

```typescript
public getElectricityCost(print: PrintSummary): string {
  const result = this.printService.calculateElectricityCost({
    printTimeSeconds: print.printTimeInSeconds ?? print.estimatedPrintTimeInSeconds,
    kwhRate: this.defaultElectricityKwhRateSetting?.value,
    printerWattageW: print.printer?.wattageW,
    defaultWattageW: this.defaultElectricityWattageSetting?.value,
    currencySymbol: this.preferredCurrencySymbolSetting?.value ?? '$',
  });
  if (result.valid) {
    return result.formattedCost;
  }
  return '';
}

public getTotalCombinedCostTooltip(print: PrintSummary): string {
  const defaultPrice = this.defaultFilamentPriceSetting?.value ?? null;
  const symbol = this.preferredCurrencySymbolSetting?.value ?? '$';
  const materialTotal = this.printService.calculateTotalPrintCost(
    print.filamentUsage,
    symbol,
    defaultPrice
  );
  const electricityResult = this.printService.calculateElectricityCost({
    printTimeSeconds: print.printTimeInSeconds ?? print.estimatedPrintTimeInSeconds,
    kwhRate: this.defaultElectricityKwhRateSetting?.value,
    printerWattageW: print.printer?.wattageW,
    defaultWattageW: this.defaultElectricityWattageSetting?.value,
    currencySymbol: symbol,
  });
  if (materialTotal.total.valid && electricityResult.valid) {
    return `Material: ${materialTotal.total.formattedPrice} + Electricity: ${electricityResult.formattedCost}`;
  }
  return '';
}

public getTotalCombinedCost(print: PrintSummary): string {
  const defaultPrice = this.defaultFilamentPriceSetting?.value ?? null;
  const symbol = this.preferredCurrencySymbolSetting?.value ?? '$';
  const materialTotal = this.printService.calculateTotalPrintCost(
    print.filamentUsage,
    symbol,
    defaultPrice
  );
  const electricityResult = this.printService.calculateElectricityCost({
    printTimeSeconds: print.printTimeInSeconds ?? print.estimatedPrintTimeInSeconds,
    kwhRate: this.defaultElectricityKwhRateSetting?.value,
    printerWattageW: print.printer?.wattageW,
    defaultWattageW: this.defaultElectricityWattageSetting?.value,
    currencySymbol: symbol,
  });

  if (materialTotal.total.valid && electricityResult.valid) {
    return materialTotal.total.cost.add(electricityResult.cost).format({
      symbol,
      decimal: Intl.NumberFormat().formatToParts(100000.1).find(p => p.type === 'decimal').value,
      separator: Intl.NumberFormat().formatToParts(100000.1).find(p => p.type === 'group').value,
    });
  }
  if (materialTotal.total.valid) {
    return materialTotal.total.formattedPrice;
  }
  if (electricityResult.valid) {
    return electricityResult.formattedCost;
  }
  return '';
}
```

- [ ] **Update `print-list.component.html`** — add the new electricity cost column definition inside the `<mat-table>` (follow the same pattern as the `totalCost` column):

```html
<ng-container matColumnDef="electricityCost">
  <th mat-header-cell *matHeaderCellDef>Electricity Cost</th>
  <td mat-cell *matCellDef="let print">{{ getElectricityCost(print) }}</td>
</ng-container>
```

- [ ] **Update the `totalCost` column in `print-list.component.html`** — replace the existing `totalCost` cell to use the new combined method and show a tooltip:

```html
<ng-container matColumnDef="totalCost">
  <th mat-header-cell *matHeaderCellDef>Total Cost</th>
  <td mat-cell *matCellDef="let print" [matTooltip]="getTotalCombinedCostTooltip(print)" [matTooltipDisabled]="!getTotalCombinedCostTooltip(print)">{{ getTotalCombinedCost(print) }}</td>
</ng-container>
```

- [ ] **Also pass the new settings as inputs to the `print-grouped-view` component** — find where `<app-print-grouped-view>` is used in `print-list.component.html` and add:

```html
[defaultElectricityKwhRateSetting]="defaultElectricityKwhRateSetting" [defaultElectricityWattageSetting]="defaultElectricityWattageSetting"
```

- [ ] **Run tests**

```bash
npm run test:brief
```

Expected: All tests pass.

- [ ] **Commit**

```bash
git add src/app/print/print-list/print-list.component.ts src/app/print/print-list/print-list.component.html
git commit -m "feat: add electricity cost column and update total cost in print list"
```

---

## Task 10: Frontend — Print Grouped View

**Files:**

- Modify: `src/app/print/print-list/print-grouped-view/print-grouped-view.component.ts`
- Modify: `src/app/print/print-list/print-grouped-view/print-grouped-view.component.html`

- [ ] **Add electricity inputs to `print-grouped-view.component.ts`** — add after `preferredCurrencySymbolSetting`:

```typescript
defaultElectricityKwhRateSetting = input<UserSetting | null>(null);
defaultElectricityWattageSetting = input<UserSetting | null>(null);
```

Also add the import for `PrintService` if not already present, and inject it:

```typescript
private readonly printService = inject(PrintService);
```

- [ ] **Add `getElectricityCost()` and `getTotalCombinedCost()` methods** to `print-grouped-view.component.ts` — same logic as in print-list:

```typescript
public getElectricityCost(print: PrintSummary): string {
  const result = this.printService.calculateElectricityCost({
    printTimeSeconds: print.printTimeInSeconds ?? print.estimatedPrintTimeInSeconds,
    kwhRate: this.defaultElectricityKwhRateSetting()?.value,
    printerWattageW: print.printer?.wattageW,
    defaultWattageW: this.defaultElectricityWattageSetting()?.value,
    currencySymbol: this.preferredCurrencySymbolSetting()?.value ?? '$',
  });
  return result.valid ? result.formattedCost : '';
}

public getTotalCombinedCost(print: PrintSummary): string {
  const symbol = this.preferredCurrencySymbolSetting()?.value ?? '$';
  const materialTotal = this.printService.calculateTotalPrintCost(
    print.filamentUsage,
    symbol,
    this.defaultFilamentPriceSetting()?.value
  );
  const electricityResult = this.printService.calculateElectricityCost({
    printTimeSeconds: print.printTimeInSeconds ?? print.estimatedPrintTimeInSeconds,
    kwhRate: this.defaultElectricityKwhRateSetting()?.value,
    printerWattageW: print.printer?.wattageW,
    defaultWattageW: this.defaultElectricityWattageSetting()?.value,
    currencySymbol: symbol,
  });
  if (materialTotal.total.valid && electricityResult.valid) {
    return materialTotal.total.cost.add(electricityResult.cost).format({
      symbol,
      decimal: Intl.NumberFormat().formatToParts(100000.1).find(p => p.type === 'decimal').value,
      separator: Intl.NumberFormat().formatToParts(100000.1).find(p => p.type === 'group').value,
    });
  }
  if (materialTotal.total.valid) return materialTotal.total.formattedPrice;
  if (electricityResult.valid) return electricityResult.formattedCost;
  return '';
}
```

- [ ] **Update `print-grouped-view.component.html`** — find where the total cost is displayed per group and update to call `getTotalCombinedCost(print)` instead of the previous filament-only method.

- [ ] **Run tests**

```bash
npm run test:brief
```

Expected: All tests pass.

- [ ] **Commit**

```bash
git add src/app/print/print-list/print-grouped-view/print-grouped-view.component.ts src/app/print/print-list/print-grouped-view/print-grouped-view.component.html
git commit -m "feat: add electricity cost to print grouped view"
```

---

## Task 11: Frontend — Print View

**Files:**

- Modify: `src/app/print/view-print-detail/view-print-detail.component.ts`
- Modify: `src/app/print/view-print-detail/view-print-detail.component.html`

- [ ] **Add electricity and currency settings fields to `view-print-detail.component.ts`** — add after any existing `UserSetting` fields:

```typescript
public preferredCurrencySymbolSetting: UserSetting | null = null;
public defaultElectricityKwhRateSetting: UserSetting | null = null;
public defaultElectricityWattageSetting: UserSetting | null = null;
```

In `ngOnInit`, inside the `activatedRoute.data.subscribe` block, add:

```typescript
this.preferredCurrencySymbolSetting = data.preferredCurrencySymbolSetting;
this.defaultElectricityKwhRateSetting = data.defaultElectricityKwhRateSetting;
this.defaultElectricityWattageSetting = data.defaultElectricityWattageSetting;
```

Inject `PrintService` if not already present:

```typescript
private readonly printService = inject(PrintService);
```

- [ ] **Add `getElectricityCost()` method to `view-print-detail.component.ts`**:

```typescript
public getElectricityCost(): ElectricityCost {
  return this.printService.calculateElectricityCost({
    printTimeSeconds: this.print.printTimeInSeconds ?? this.print.estimatedPrintTimeInSeconds,
    kwhRate: this.defaultElectricityKwhRateSetting?.value,
    printerWattageW: this.print.printer?.wattageW,
    defaultWattageW: this.defaultElectricityWattageSetting?.value,
    currencySymbol: this.preferredCurrencySymbolSetting?.value ?? '$',
  });
}
```

Also import `ElectricityCost` from `print.service.ts`.

- [ ] **Add electricity cost row to `view-print-detail.component.html`** — find the section where filament cost breakdown is displayed and add a new row immediately after it (not inside the filament loop):

```html
@if (getElectricityCost() as electricityCost) { @if (electricityCost.valid) {
<div class="cost-row">
  <span>Electricity Cost:</span>
  <span
    [matTooltip]="electricityCost.usesDefaultWattage
          ? 'Using default wattage of ' + electricityCost.wattageW + 'W — set a printer-specific wattage for more accuracy'
          : null"
  >
    {{ electricityCost.formattedCost }}{{ electricityCost.usesDefaultWattage ? '*' : '' }}
  </span>
</div>
} @else if (electricityCost.message) {
<div class="cost-row cost-error">
  <mat-icon inline style="font-size:16px;width:16px;height:16px;vertical-align:text-bottom">warning</mat-icon>
  {{ electricityCost.message }}
</div>
} }
```

- [ ] **Run tests**

```bash
npm run test:brief
```

Expected: All tests pass.

- [ ] **Commit**

```bash
git add src/app/print/view-print-detail/view-print-detail.component.ts src/app/print/view-print-detail/view-print-detail.component.html
git commit -m "feat: add electricity cost display to print view"
```

---

## Task 12: Frontend — Print Edit/Add Live Preview

**Files:**

- Modify: `src/app/print/edit-print-detail/edit-print-detail.component.ts`
- Modify: `src/app/print/edit-print-detail/edit-print-detail.component.html`

- [ ] **Add electricity settings fields to `edit-print-detail.component.ts`** — add after `defaultFilamentPriceSetting`:

```typescript
public defaultElectricityKwhRateSetting: UserSetting | null = null;
public defaultElectricityWattageSetting: UserSetting | null = null;
```

In `ngOnInit`, inside the `activatedRoute.data.subscribe` block, add:

```typescript
this.defaultElectricityKwhRateSetting = data.defaultElectricityKwhRateSetting;
this.defaultElectricityWattageSetting = data.defaultElectricityWattageSetting;
```

- [ ] **Add `getElectricityPreview()` method to `edit-print-detail.component.ts`**:

```typescript
public getElectricityPreview(): ElectricityCost {
  const selectedPrinterId = this.printForm.controls.printer?.value?.id
    ?? this.printForm.get('printerId')?.value;
  const selectedPrinter = this.printers.find(p => p.id === selectedPrinterId);

  const actualTime = this.printForm.controls.printTimeInSeconds?.value;
  const estimatedTime = this.printForm.controls.estimatedPrintTimeInSeconds?.value;
  const timeSeconds = actualTime ? Number(actualTime) : (estimatedTime ? Number(estimatedTime) : null);

  return this.printService.calculateElectricityCost({
    printTimeSeconds: timeSeconds,
    kwhRate: this.defaultElectricityKwhRateSetting?.value,
    printerWattageW: selectedPrinter?.wattageW,
    defaultWattageW: this.defaultElectricityWattageSetting?.value,
    currencySymbol: this.preferredCurrency?.symbol ?? '$',
  });
}

public isEstimatedElectricityPreview(): boolean {
  const actualTime = this.printForm.controls.printTimeInSeconds?.value;
  return !actualTime || Number(actualTime) <= 0;
}
```

Also import `ElectricityCost` from `print.service.ts`.

- [ ] **Add electricity preview UI to `edit-print-detail.component.html`** — find where `estimatedPrintTimeInSeconds` and `printTimeInSeconds` fields are rendered and add immediately below them:

```html
@if (getElectricityPreview() as preview) { @if (preview.valid) {
<div class="electricity-preview">Electricity cost: {{ isEstimatedElectricityPreview() ? '~' : '' }}{{ preview.formattedCost }}</div>
} @else if (preview.message) {
<div class="electricity-preview electricity-preview--error">
  <mat-icon inline style="font-size:16px;width:16px;height:16px;vertical-align:text-bottom">warning</mat-icon>
  {{ preview.message }} — <a routerLink="/settings">configure in Settings</a>
</div>
} }
```

- [ ] **Run tests**

```bash
npm run test:brief
```

Expected: All tests pass.

- [ ] **Commit**

```bash
git add src/app/print/edit-print-detail/edit-print-detail.component.ts src/app/print/edit-print-detail/edit-print-detail.component.html
git commit -m "feat: add electricity cost live preview to print edit/add form"
```

---

## Task 13: Documentation

**Files:**

- Modify: `src/app/documentation/docs/docs-prints/docs-prints.component.html`
- Modify: `src/app/documentation/docs/docs-printers/docs-printers.component.html`
- Modify: `src/app/documentation/docs/docs-getting-started/docs-getting-started.component.html`

- [ ] **Update `docs-prints.component.html`** — find the section about the print list columns or print cost and add a new section:

```html
<h3 id="electricity-cost">Electricity Cost</h3>
<p>3D Print Log can track the electricity cost of each print. To enable this feature, set your electricity rate in <a routerLink="/settings">Settings</a>.</p>
<p>Once configured, the <strong>Electricity Cost</strong> column in the Print List shows the estimated electricity cost for each print. The <strong>Total Cost</strong> column combines material and electricity costs; hover over it to see the breakdown.</p>
<p>On the print detail page, electricity cost appears below the material breakdown. When adding or editing a print, a live preview updates as you enter the print time.</p>
<p>Electricity cost uses the actual print time when available, falling back to the estimated print time otherwise.</p>
```

- [ ] **Update `docs-printers.component.html`** — find the section about printer settings and add a note about the wattage field:

```html
<h3 id="printer-wattage">Average Wattage</h3>
<p>Each printer has an optional <strong>Average Wattage (W)</strong> field used to calculate electricity cost. If left blank, the default wattage from <a routerLink="/settings">Settings</a> is used instead.</p>
<p>To find your printer's wattage, check the label on your power supply or your printer's specifications page. For the most accurate value, use a smart plug or energy monitor during a typical print.</p>
```

- [ ] **Update `docs-getting-started.component.html`** — find where settings are described and add a brief mention:

```html
<p>To track electricity costs, enter your electricity rate ($/kWh) and a default printer wattage in <strong>Settings → Electricity Cost</strong>. You can also set a per-printer wattage on each printer's detail page for more accurate calculations.</p>
```

- [ ] **Run tests**

```bash
npm run test:brief
```

Expected: All tests pass.

- [ ] **Commit**

```bash
git add src/app/documentation/docs/docs-prints/docs-prints.component.html src/app/documentation/docs/docs-printers/docs-printers.component.html src/app/documentation/docs/docs-getting-started/docs-getting-started.component.html
git commit -m "docs: add electricity cost tracking documentation"
```

---

## Final Verification

- [ ] **Start the dev server and manually verify:**
  1. Settings page shows the new Electricity Cost section with two inputs — save both and confirm they persist on page reload
  2. Printer edit page shows the Average Wattage field — save and confirm it persists
  3. Print List shows the Electricity Cost column when toggled on; Total Cost tooltip shows breakdown
  4. Print View shows Electricity Cost row below filament breakdown
  5. Print Edit/Add shows live electricity preview that updates when print time changes
  6. All error states display correctly when rate or wattage is missing

```bash
npm start
```

- [ ] **Run full lint and test suite**

```bash
npm run lint:brief
npm run test:brief
```

Expected: No errors or warnings.
