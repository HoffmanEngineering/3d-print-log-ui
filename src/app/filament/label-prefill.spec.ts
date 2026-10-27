import type {
  LabelReading,
  ScannedLabelRead,
} from '../core/types/label-reading';
import type { CatalogMatch } from '../core/types/tag-reading';
import { labelPrefill, parseScannedLabelRead } from './label-prefill';

const EMPTY: LabelReading = {
  brand: null,
  materialType: null,
  colorName: null,
  netWeightG: null,
  diameterMm: null,
  hotendMinC: null,
  hotendMaxC: null,
  bedMinC: null,
  bedMaxC: null,
};

const MATCH: CatalogMatch = {
  id: 'sunlu_pla+_silver',
  confidence: 0.9,
  spoolWeightG: 160,
  colorName: 'Silver',
  name: 'PLA+ Silver',
  manufacturer: 'SUNLU',
  densityGramPerCubicCm: 1.24,
  source: 'SpoolmanDB',
  extruderTempMinC: 200,
  extruderTempMaxC: 230,
  extruderTempC: 215,
  bedTempC: 60,
};

const read = (over: Partial<ScannedLabelRead> = {}): ScannedLabelRead => ({
  reading: EMPTY,
  catalogMatch: null,
  barcodes: [],
  ...over,
});

describe('labelPrefill', () => {
  it('maps what the label says, marked as from the label', () => {
    const { values, sources } = labelPrefill(
      read({
        reading: {
          brand: 'SUNLU',
          materialType: 'PLA+',
          colorName: 'Grey',
          netWeightG: 1000,
          diameterMm: 1.75,
          hotendMinC: 205,
          hotendMaxC: 225,
          bedMinC: 50,
          bedMaxC: 65,
        },
      })
    );

    expect(values).toEqual({
      brand: 'SUNLU',
      materialType: 'PLA+',
      colorName: 'Grey',
      initialNominalWeightG: 1000,
      diameterMm: 1.75,
      tempRangeStart: 205,
      tempRangeEnd: 225,
      recommendedBedTemp: 65,
    });
    expect(new Set(Object.values(sources))).toEqual(new Set(['label']));
  });

  it('uses the bed minimum when the label has no maximum', () => {
    const { values } = labelPrefill(
      read({ reading: { ...EMPTY, bedMinC: 55 } })
    );

    expect(values.recommendedBedTemp).toBe(55);
  });

  it('lets the catalog win on name, color, spool weight and density', () => {
    const { values, sources } = labelPrefill(
      read({
        reading: { ...EMPTY, brand: 'SUNLU', colorName: 'Grey' },
        catalogMatch: MATCH,
      })
    );

    expect(values.displayName).toBe('PLA+ Silver');
    expect(values.colorName).toBe('Silver');
    expect(sources.colorName).toBe('catalog');
    expect(values.spoolWeightG).toBe(160);
    expect(values.materialDensityGramPerCubicCm).toBe(1.24);
    expect(sources.brand).toBe('label');
  });

  it('takes catalog temperatures only where the label has none', () => {
    const { values, sources } = labelPrefill(
      read({
        reading: { ...EMPTY, hotendMinC: 190, hotendMaxC: 220 },
        catalogMatch: MATCH,
      })
    );

    expect(values.tempRangeStart).toBe(190);
    expect(values.tempRangeEnd).toBe(220);
    expect(sources.tempRangeStart).toBe('label');
    expect(values.recommendedTemp).toBe(215);
    expect(values.recommendedBedTemp).toBe(60);
    expect(sources.recommendedBedTemp).toBe('catalog');
  });

  it('takes the brand from the catalog when the label has none', () => {
    const { values, sources } = labelPrefill(read({ catalogMatch: MATCH }));

    expect(values.brand).toBe('SUNLU');
    expect(sources.brand).toBe('catalog');
  });

  it('takes material, weight and diameter from the catalog when the label has none', () => {
    const match = {
      ...MATCH,
      material: 'PLA+',
      weightG: 1000,
      diameterMm: 1.75,
    };
    const { values, sources } = labelPrefill(read({ catalogMatch: match }));

    expect(values.materialType).toBe('PLA+');
    expect(values.initialNominalWeightG).toBe(1000);
    expect(values.diameterMm).toBe(1.75);
    expect(sources.materialType).toBe('catalog');

    const labelled = labelPrefill(
      read({
        reading: { ...EMPTY, materialType: 'PLA', netWeightG: 500 },
        catalogMatch: match,
      })
    );
    expect(labelled.values.materialType).toBe('PLA');
    expect(labelled.values.initialNominalWeightG).toBe(500);
  });

  it('leaves absent values out', () => {
    expect(labelPrefill(read()).values).toEqual({});
  });
});

describe('parseScannedLabelRead', () => {
  it('accepts a plausible read', () => {
    const raw = read({
      reading: { ...EMPTY, materialType: 'PLA' },
      catalogMatch: MATCH,
      barcodes: [{ value: '0849344041764', format: 'ean13' }],
    });

    expect(parseScannedLabelRead(raw)).toEqual(raw);
  });

  it('rejects a non-object', () => {
    expect(parseScannedLabelRead('x')).toBeNull();
    expect(parseScannedLabelRead(null)).toBeNull();
    expect(parseScannedLabelRead([])).toBeNull();
  });

  it('rejects barcodes that are not an array', () => {
    expect(
      parseScannedLabelRead({ reading: EMPTY, barcodes: 'abc' })
    ).toBeNull();
  });

  it('rejects barcodes with non-string values', () => {
    expect(
      parseScannedLabelRead({
        reading: EMPTY,
        barcodes: [{ value: 42, format: 'ean13' }],
      })
    ).toBeNull();
  });

  it('rejects a catalog match without an id', () => {
    expect(
      parseScannedLabelRead({
        reading: EMPTY,
        barcodes: [],
        catalogMatch: { name: 'x' },
      })
    ).toBeNull();
  });

  it('rejects a reading that is not an object', () => {
    expect(parseScannedLabelRead({ reading: 'PLA', barcodes: [] })).toBeNull();
  });
});
