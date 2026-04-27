# Electricity Cost Tracking — Design Spec

**Story:** #68  
**Date:** 2026-04-27  
**Scope:** Full-stack (PrintLogApi + print-log-ui)

---

## Overview

Allow users to track the electricity cost of each print. Users enter their electricity rate ($/kWh) and a default printer wattage in Settings. Each printer can optionally override the wattage. Electricity cost is calculated client-side on the fly — never stored — using the formula:

```
electricity cost = (wattageW / 1000) × (printTimeSeconds / 3600) × kwhRate
```

Costs are displayed separately from material costs across the Print List, Print View, and Print Edit/Add form.

---

## Backend Changes (PrintLogApi)

### Migration: `AddElectricityCostTracking`

1. Add `WattageW double? nullable` column to the `Printers` table.
2. Insert two new `UserSettingType` rows:
   - ID 12: `Electricity_KwhRate` — _"The user's electricity rate in currency per kWh."_
   - ID 13: `Electricity_DefaultWattageW` — _"Default printer wattage in watts used when a printer has no specific wattage set."_

### Model Changes

**`Printer.cs`**

```csharp
public double? WattageW { get; set; }
```

**`PrinterDetailDto.cs`**

```csharp
public double? WattageW { get; set; }
```

**`AddPrinterDTO.cs`**

```csharp
[Range(0, double.MaxValue, ErrorMessage = "Only positive number allowed")]
public double? WattageW { get; set; }
```

AutoMapper maps these by convention — no mapping profile changes needed. No new API endpoints are required.

---

## Frontend Changes (print-log-ui)

### Calculation Engine (`print.service.ts`)

New discriminated union type mirroring `FilamentPrice`:

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

New `calculateElectricityCost()` method on `PrintService`:

| Input              | Source                                                |
| ------------------ | ----------------------------------------------------- |
| `printTimeSeconds` | Actual print time if set, estimated as fallback       |
| `kwhRate`          | `UserSetting` value for `Electricity_KwhRate`         |
| `printerWattageW`  | `PrinterDetail.wattageW` (nullable)                   |
| `defaultWattageW`  | `UserSetting` value for `Electricity_DefaultWattageW` |
| `currencySymbol`   | Existing currency setting                             |

**Invalid cases (in priority order):**

- No print time → `{ valid: false, message: '' }` (silent — nothing to show)
- No kWh rate → `{ valid: false, message: '(Electricity rate not set)' }`
- No printer wattage and no default → `{ valid: false, message: '(Printer wattage not set)' }`

The `usesDefaultWattage` flag is `true` when the per-printer wattage is null and the global default is used as fallback.

### User Settings (`user-setting.service.ts`)

```typescript
Electricity_KwhRate = 12,
Electricity_DefaultWattageW = 13,
```

### New Resolvers

Following the pattern of `default-filament-price-setting-resolver.service.ts`:

- `default-electricity-kwh-rate-setting-resolver.service.ts`
- `default-electricity-wattage-setting-resolver.service.ts`

### Settings Page

New **"Electricity Cost"** section with two inputs:

| Field                   | Label                                        | Help text                                                                                                                                                             |
| ----------------------- | -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Electricity Rate        | `[symbol]/kWh` (currency symbol substituted) | _"Enter your rate from your electricity bill."_                                                                                                                       |
| Default Printer Wattage | `W`                                          | _"Used for printers without a specific wattage set. Typical FDM printers average 50–300W; check your power supply label or printer specs for a more accurate value."_ |

Both follow the existing save/update pattern: POST to add if no existing setting, PUT to update otherwise.

### Printer Edit/Add Form

New optional **"Average Wattage (W)"** field placed near `HasHeatedBed` / `HasHeatedChamber`:

- Nullable numeric input
- Hint text: _"Leave blank to use your default wattage from Settings."_
- Shown for all printer categories
- Maps to `wattageW` on `AddPrinterDetailDto`

### Print List

**New "Electricity Cost" column:**

- Toggleable like existing optional columns
- Blank when calculation can't be completed
- Uses actual print time if available, estimated as fallback

**Updated "Total Cost" column:**

- Adds electricity cost to material cost when calculable
- `matTooltip` breakdown: _"Material: $X.XX + Electricity: $X.XX"_
- Graceful degradation: if only one component is calculable, shows that component alone (no regression from current behavior)
- Same updates apply to `print-grouped-view` component

### Print View Component

New electricity cost row below (not inside) the filament breakdown section:

- Valid: **"Electricity Cost: $X.XX"** — with `*` and tooltip _"Using default wattage of XW — set a printer-specific wattage for more accuracy"_ when using the default
- Invalid: inline warning icon + error message in error styling, matching the existing filament error pattern

### Print Edit/Add Component

Read-only live preview placed directly below the print time fields (estimated and actual):

- Reactive — updates as either time field changes
- Shows actual-time cost if actual time is filled in, estimated otherwise
- Valid: **"Electricity cost: ~$X.XX"** (tilde on estimated, no tilde on actual)
- Invalid: warning icon + message + settings link: _"(Electricity rate not set — [configure in Settings](/settings))"_

---

## Error Display Pattern

Mirrors the existing filament cost error pattern throughout:

| Context        | No data (silent) | Missing config                                                                   |
| -------------- | ---------------- | -------------------------------------------------------------------------------- |
| Print List     | blank cell       | blank cell                                                                       |
| Print View     | hidden           | `⚠ (Electricity rate not set)` or `⚠ (Printer wattage not set)` in error color |
| Print Edit/Add | hidden           | `⚠ (Electricity rate not set — configure in Settings)` with router link         |

---

## Documentation Updates

**Prints docs** — new section covering:

- What electricity cost tracking shows and where (Print List column, Total Cost tooltip breakdown, Print View, Edit/Add preview)
- Requirement to configure kWh rate in Settings first
- Estimated vs actual time distinction

**Settings docs** — new section covering:

- Electricity Rate field: what it is, how to find the value on your bill
- Default Printer Wattage: what it's used for, how to find a printer's wattage (power supply label, manufacturer specs, or a smart plug for real-world measurement)

**Printers docs** — brief addition noting the Average Wattage field and pointing to Settings for the global default.

---

## Out of Scope

- Analytics integration (planned for future analytics redesign)
- Auto-suggesting wattage from printer category / heated bed flags (ranges too wide to be accurate)
- Storing electricity cost on print records (calculated on the fly, consistent with filament cost)
