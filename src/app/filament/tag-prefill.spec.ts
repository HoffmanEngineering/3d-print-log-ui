import type { Material } from '../core/services/material.service';
import type { CatalogMatch, TagReading } from '../core/types/tag-reading';
import { SNAPMAKER_805BEC3E } from './testing/tag-fixtures';
import {
  knownMaterialFor,
  parseScannedTagRead,
  tagPrefill,
} from './tag-prefill';

const match: CatalogMatch = {
  id: 'cat-1',
  confidence: 0.9,
  spoolWeightG: 140,
  colorName: 'Black',
  name: '',
  manufacturer: 'Polymaker',
  source: 'SpoolmanDB',
};

describe('tagPrefill', () => {
  it('maps the Snapmaker reading and its match to form values and sources', () => {
    const { values, sources } = tagPrefill(SNAPMAKER_805BEC3E, match);

    expect(values).toEqual({
      brand: 'Snapmaker',
      materialType: 'PLA',
      displayName: 'SnapSpeed PLA',
      colors: ['#080a0d'],
      colorHex: '#080a0d',
      colorName: 'Black',
      diameterMm: 1.75,
      initialNominalWeightG: 500,
      initialNominalLengthM: 150,
      spoolWeightG: 140,
      tempRangeStart: 190,
      tempRangeEnd: 230,
      recommendedTemp: 220,
      recommendedBedTemp: 60,
    });
    expect(sources).toEqual({
      brand: 'tag',
      materialType: 'tag',
      displayName: 'tag',
      colors: 'tag',
      colorHex: 'tag',
      colorName: 'catalog',
      diameterMm: 'tag',
      initialNominalWeightG: 'tag',
      initialNominalLengthM: 'tag',
      spoolWeightG: 'catalog',
      tempRangeStart: 'tag',
      tempRangeEnd: 'tag',
      recommendedTemp: 'tag',
      recommendedBedTemp: 'tag',
    });
  });

  it('names the material after the catalog entry when there is one', () => {
    const named = { ...match, name: 'Polymaker PolyLite PLA' };
    const { values, sources } = tagPrefill(SNAPMAKER_805BEC3E, named);

    expect(values.displayName).toBe('Polymaker PolyLite PLA');
    expect(sources.displayName).toBe('catalog');
  });

  it('gives nothing for a null reading and no match', () => {
    expect(tagPrefill(null, null)).toEqual({ values: {}, sources: {} });
  });

  it('leaves displayName out without a subtype or a match', () => {
    const { values } = tagPrefill({ materialType: 'PETG' }, null);

    expect(values).toEqual({ materialType: 'PETG' });
  });

  it('falls back to the manufacturer and the minimum bed temperature', () => {
    const { values } = tagPrefill(
      { manufacturer: 'Polymaker', bedMinC: 50 },
      null
    );

    expect(values).toEqual({ brand: 'Polymaker', recommendedBedTemp: 50 });
  });

  it('skips a catalog match with null weight and color', () => {
    const { values } = tagPrefill(null, {
      ...match,
      spoolWeightG: null,
      colorName: null,
    });

    expect(values).toEqual({});
  });

  it('ignores malformed colors', () => {
    const { values } = tagPrefill(
      { colors: ['red', '#12345', '#A1B2C3'] },
      null
    );

    expect(values.colors).toEqual(['#a1b2c3']);
  });

  it('takes the density from the catalog match', () => {
    const { values, sources } = tagPrefill(null, {
      ...match,
      densityGramPerCubicCm: 1.27,
    });

    expect(values.materialDensityGramPerCubicCm).toBe(1.27);
    expect(sources.materialDensityGramPerCubicCm).toBe('catalog');
  });

  it('ignores a catalog density that is missing, zero or negative', () => {
    for (const densityGramPerCubicCm of [undefined, null, 0, -1]) {
      const { values } = tagPrefill(null, { ...match, densityGramPerCubicCm });

      expect(values.materialDensityGramPerCubicCm).toBeUndefined();
    }
  });
});

describe('knownMaterialFor', () => {
  const material = (
    acronym: string | null,
    name: string | null,
    materialCategoryNickname: string | null = 'filament'
  ): Material => ({
    id: `${acronym}-${name}`,
    acronym,
    name,
    materialCategoryNickname,
    densityGramPerCubicCm: 1,
  });
  const pla = material('PLA', 'Polylactic Acid');
  const petg = material('PETG', 'Polyethylene Terephthalate Glycol');
  const resin = material('PLA', 'Plant-based resin', 'resin');
  const nylon = material(null, 'Nylon');

  it('finds a material by its acronym, in any case', () => {
    expect(knownMaterialFor('PLA', [petg, pla], 'filament')).toBe(pla);
    expect(knownMaterialFor(' petg ', [petg, pla], 'filament')).toBe(petg);
  });

  it('finds a material by its name or its full display name', () => {
    expect(knownMaterialFor('nylon', [nylon], 'filament')).toBe(nylon);
    expect(
      knownMaterialFor('PLA (Polylactic Acid)', [petg, pla], 'filament')
    ).toBe(pla);
  });

  it('only finds materials of the form category, or with none', () => {
    expect(knownMaterialFor('PLA', [resin, pla], 'filament')).toBe(pla);
    expect(knownMaterialFor('PLA', [resin], 'filament')).toBeUndefined();
    expect(knownMaterialFor('PLA', [resin], null)).toBe(resin);
  });

  it('finds nothing for a type it does not know', () => {
    expect(knownMaterialFor('PLA-CF', [pla], 'filament')).toBeUndefined();
    expect(knownMaterialFor('', [pla], 'filament')).toBeUndefined();
  });
});

describe('parseScannedTagRead', () => {
  it('accepts a reading with a match, or either alone', () => {
    expect(
      parseScannedTagRead({
        reading: { materialType: 'PLA' },
        catalogMatch: match,
      })
    ).toEqual({ reading: { materialType: 'PLA' }, catalogMatch: match });
    expect(parseScannedTagRead({ reading: null, catalogMatch: null })).toEqual({
      reading: null,
      catalogMatch: null,
    });
  });

  it('rejects anything that is not the expected shape', () => {
    expect(parseScannedTagRead(undefined)).toBeNull();
    expect(parseScannedTagRead('x')).toBeNull();
    expect(parseScannedTagRead([])).toBeNull();
    expect(parseScannedTagRead({ reading: 'x' })).toBeNull();
    expect(parseScannedTagRead({ catalogMatch: { id: 5 } })).toBeNull();
    expect(parseScannedTagRead({ catalogMatch: { id: '' } })).toBeNull();
    expect(parseScannedTagRead({ catalogMatch: { id: '  ' } })).toBeNull();
    expect(parseScannedTagRead({ catalogMatch: { name: 'x' } })).toBeNull();
  });
});

describe('tagPrefill with hostile input', () => {
  const asReading = (v: unknown) => v as TagReading;

  it('survives a reading that is an array', () => {
    expect(tagPrefill(asReading([1, 2]), null)).toEqual({
      values: {},
      sources: {},
    });
  });

  it('leaves colors out when they are not an array', () => {
    const { values } = tagPrefill(asReading({ colors: '#080A0D' }), null);

    expect(values).toEqual({});
  });

  it('leaves out numbers that arrive as strings', () => {
    const { values } = tagPrefill(
      asReading({ diameterMm: '1.75', netWeightG: '500', hotendC: null }),
      null
    );

    expect(values).toEqual({});
  });

  it('never sets a value to null', () => {
    const { values } = tagPrefill(
      asReading({ brand: null, materialType: 7, colors: [null, 5] }),
      null
    );

    expect(Object.values(values).includes(null)).toBeFalse();
    expect(values).toEqual({});
  });
});
