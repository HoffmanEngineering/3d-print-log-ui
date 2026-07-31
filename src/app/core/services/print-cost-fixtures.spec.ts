import { HttpClientTestingModule } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import fixtures from '../../../../tests-fixtures/cost-fixtures.json';
import { PrintFilamentSourceMeasurement, PrintService } from './print.service';

/**
 * Drives the SAME golden corpus as the API's PrintCostCalculatorTests. A fixture file only one
 * side reads is not a shared contract, just a second copy of one suite's expectations — this spec
 * is what makes a divergence between print.service.ts and PrintCostCalculator fail in both repos.
 *
 * Only the amounts are compared. The API additionally reports coverage exclusions
 * (MaterialEstimated, CurrencyMismatch, ...) that the client has no concept of.
 */
describe('print cost golden fixtures', () => {
  let service: PrintService;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(PrintService);
  });

  /** Maps one fixture row onto the PrintFilamentSummaryDto shape calculateTotalPrintCost reads. */
  function toUsageRow(
    row: (typeof fixtures.filamentCases)[number]['rows'][number]
  ) {
    return {
      filament: {
        purchasePriceValue: row.purchasePriceValue,
        initialNominalWeightMg: row.initialNominalWeightMg,
        materialDensityGramPerCubicCm: row.materialDensityGramPerCubicCm,
        diameterMm: row.diameterMm,
      },
      source: row.sourceMeasurement as PrintFilamentSourceMeasurement,
      amountMg: row.amountMg,
      lengthInM: row.lengthInM,
      volumeMl: row.volumeMl,
      estimatedSource:
        row.estimatedSourceMeasurement as PrintFilamentSourceMeasurement,
      estimatedAmountMg: row.estimatedAmountMg,
      estimatedLengthInM: row.estimatedLengthInM,
      estimatedVolumeMl: row.estimatedVolumeMl,
    } as never;
  }

  for (const c of fixtures.filamentCases) {
    // The client has no currency concept at all: it cannot exclude a spool priced in another
    // currency, so this case is inexpressible here rather than merely failing. The UI gains the
    // user's Currency_Name setting in Phase 2, when the analytics tabs start rendering money.
    const run = c.name === 'currency mismatch excludes the row' ? xit : it;

    run(`matches the shared fixture: ${c.name}`, () => {
      const { total } = service.calculateTotalPrintCost(
        c.rows.map(toUsageRow),
        '$',
        fixtures.inputs.defaultFilamentPrice
      );

      if (c.expectedAmount === null) {
        expect(total.valid).toBeFalse();
        return;
      }

      // Narrows the FilamentPrice union; a failure here is reported by the assertion above it.
      if (!total.valid) {
        fail(`expected a valid total of ${c.expectedAmount}`);
        return;
      }

      expect(total.price.value).toBeCloseTo(c.expectedAmount, 2);
      expect(total.usesDefaultPrice).toBe(c.expectedUsedDefaultPrice);
    });
  }

  for (const c of fixtures.electricityCases) {
    it(`matches the shared fixture: ${c.name}`, () => {
      const result = service.calculateElectricityCost({
        printTimeSeconds: c.durationSeconds,
        kwhRate: fixtures.inputs.kwhRate,
        printerWattageW: c.printerWattageW,
        defaultWattageW: fixtures.inputs.defaultWattageW,
        currencySymbol: '$',
      });

      if (c.expectedAmount === null) {
        expect(result.valid).toBeFalse();
        return;
      }

      if (!result.valid) {
        fail(`expected a valid electricity cost of ${c.expectedAmount}`);
        return;
      }

      expect(result.cost.value).toBeCloseTo(c.expectedAmount, 2);
    });
  }
});
