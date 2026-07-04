import {
  calculateSpoolAdjustment,
  resolveSpoolWeightMg,
} from './spool-weight-adjustment.util';

describe('resolveSpoolWeightMg', () => {
  it('prefers the stored spool weight when positive', () => {
    expect(resolveSpoolWeightMg(150000, 1150000, 1000000)).toBe(150000);
  });

  it('derives from total minus nominal when stored is missing', () => {
    expect(resolveSpoolWeightMg(null, 1150000, 1000000)).toBe(150000);
  });

  it('returns null when derived value is zero or negative', () => {
    expect(resolveSpoolWeightMg(null, 1000000, 1000000)).toBeNull();
    expect(resolveSpoolWeightMg(null, 900000, 1000000)).toBeNull();
  });

  it('returns null when nothing is resolvable', () => {
    expect(resolveSpoolWeightMg(0, null, 1000000)).toBeNull();
    expect(resolveSpoolWeightMg(undefined, undefined, undefined)).toBeNull();
  });
});

describe('calculateSpoolAdjustment', () => {
  it('computes the worked example (measured below tracked remaining)', () => {
    // spool 150g, tracked remaining 500g, measured total 450g -> measured remaining 300g
    const result = calculateSpoolAdjustment(450000, 150000, 500000);
    expect(result.measuredRemainingMg).toBe(300000);
    expect(result.adjustmentMg).toBe(-200000);
    expect(result.negativeRemaining).toBeFalse();
  });

  it('produces a positive adjustment when measured exceeds tracked', () => {
    const result = calculateSpoolAdjustment(750000, 150000, 500000);
    expect(result.adjustmentMg).toBe(100000);
  });

  it('produces a zero adjustment when they match', () => {
    const result = calculateSpoolAdjustment(650000, 150000, 500000);
    expect(result.adjustmentMg).toBe(0);
  });

  it('flags negative remaining when measured is below spool weight', () => {
    const result = calculateSpoolAdjustment(100000, 150000, 500000);
    expect(result.negativeRemaining).toBeTrue();
  });
});
