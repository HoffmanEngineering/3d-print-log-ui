import { extractLabelFields, LabelFields } from './label-fields';
import { LABEL_OCR_FIXTURES } from './testing/label-ocr-fixtures';

describe('extractLabelFields', () => {
  it('reads labeled nozzle and bed ranges', () => {
    const f = extractLabelFields(
      'Nozzle Temp: 200 - 220 °C\nBed Temp:50 - 60 °C'
    );
    expect([f.hotendMinC, f.hotendMaxC]).toEqual([200, 220]);
    expect([f.bedMinC, f.bedMaxC]).toEqual([50, 60]);
  });

  it('spans several speed-dependent nozzle ranges', () => {
    const f = extractLabelFields(
      'Print Temp:210-220℃ 50-100mm/s\nPrint Temp:220-240℃ 100-150mm/s'
    );
    expect([f.hotendMinC, f.hotendMaxC]).toEqual([210, 240]);
  });

  it('reads a range with the unit on both ends', () => {
    const f = extractLabelFields('Printing Temp:190°C-230°C');
    expect([f.hotendMinC, f.hotendMaxC]).toEqual([190, 230]);
  });

  it('reads a ± range', () => {
    const f = extractLabelFields('Nozzle 200±10°C');
    expect([f.hotendMinC, f.hotendMaxC]).toEqual([190, 210]);
  });

  it('tolerates a mangled Ø and a dropped decimal point in the diameter', () => {
    expect(extractLabelFields('91.75mm').diameterMm).toBe(1.75);
    expect(extractLabelFields('@1 75mm').diameterMm).toBe(1.75);
    expect(extractLabelFields('2.85 mm').diameterMm).toBe(2.85);
  });

  it('reads a net weight in kg or g', () => {
    expect(extractLabelFields('Net Weight: 1 kg').weightG).toBe(1000);
    expect(extractLabelFields('NW 750g').weightG).toBe(750);
  });

  it('ignores a handwritten gross weight that is not a spool size', () => {
    expect(extractLabelFields('1154.1').weightG).toBeUndefined();
    expect(extractLabelFields('1158g').weightG).toBeUndefined();
  });

  it('prefers the most specific material', () => {
    expect(extractLabelFields('SUNLU PLA+ 2.0 Silver').materialType).toBe(
      'PLA+'
    );
    expect(extractLabelFields('PETG FILAMENT').materialType).toBe('PETG');
    expect(extractLabelFields('TPU Silk Burgundy').materialType).toBe('TPU');
  });

  it('does not take a material from inside another word', () => {
    expect(
      extractLabelFields('REPLACEMENT SPOOL').materialType
    ).toBeUndefined();
  });

  it('does not throw on non-ASCII text', () => {
    expect(() => extractLabelFields('打印温度 200±10℃ 热床 60℃')).not.toThrow();
  });

  it('returns nothing for empty text', () => {
    expect(extractLabelFields('')).toEqual({});
  });

  describe('on the feasibility test labels', () => {
    type Key = 'material' | 'weight' | 'diameter' | 'nozzle' | 'bed';
    const base = (m?: string) =>
      (m ?? '')
        .toUpperCase()
        .replace(/[^A-Z0-9+]/g, '')
        .replace(/(PRO|PLUS|\+|SILK|MATTE|BASIC|HS|HF|95A|20)$/g, '')
        .replace(/\+/g, '');
    const checks: Record<
      Key,
      {
        present: (e: LabelFields) => boolean;
        got: (f: LabelFields) => boolean;
        right: (f: LabelFields, e: LabelFields) => boolean;
      }
    > = {
      material: {
        present: (e) => !!e.materialType,
        got: (f) => !!f.materialType,
        right: (f, e) => base(f.materialType) === base(e.materialType),
      },
      weight: {
        present: (e) => !!e.weightG,
        got: (f) => !!f.weightG,
        right: (f, e) => f.weightG === e.weightG,
      },
      diameter: {
        present: (e) => !!e.diameterMm,
        got: (f) => !!f.diameterMm,
        right: (f, e) => f.diameterMm === e.diameterMm,
      },
      nozzle: {
        present: (e) => !!e.hotendMinC,
        got: (f) => !!f.hotendMinC,
        right: (f, e) =>
          f.hotendMinC === e.hotendMinC && f.hotendMaxC === e.hotendMaxC,
      },
      bed: {
        present: (e) => !!e.bedMinC,
        got: (f) => !!f.bedMinC,
        right: (f, e) => f.bedMinC === e.bedMinC && f.bedMaxC === e.bedMaxC,
      },
    };
    // What the throwaway test measured; a pattern change must not read fewer labels.
    const floor: Record<Key, number> = {
      material: 14,
      weight: 8,
      diameter: 7,
      nozzle: 12,
      bed: 10,
    };

    const tally = (key: Key) => {
      let right = 0;
      let wrong = 0;
      for (const fixture of LABEL_OCR_FIXTURES) {
        const c = checks[key];
        if (!c.present(fixture.expected)) continue;
        const f = extractLabelFields(fixture.text);
        if (c.right(f, fixture.expected)) right++;
        else if (c.got(f)) wrong++;
      }
      return { right, wrong };
    };

    for (const key of Object.keys(floor) as Key[]) {
      it(`reads ${key} on at least ${floor[key]} labels`, () => {
        expect(tally(key).right).toBeGreaterThanOrEqual(floor[key]);
      });
    }

    it('fills at most 3 fields wrongly across all labels', () => {
      const wrong = (Object.keys(floor) as Key[])
        .map((k) => tally(k).wrong)
        .reduce((a, b) => a + b, 0);
      expect(wrong).toBeLessThanOrEqual(3);
    });
  });
});
