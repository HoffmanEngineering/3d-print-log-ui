import { TestBed } from '@angular/core/testing';
import {
  isRemainingTracked,
  NOT_TRACKED,
  RemainingPipe,
} from './remaining.pipe';

describe('RemainingPipe', () => {
  let pipe: RemainingPipe;

  beforeEach(() => {
    pipe = TestBed.runInInjectionContext(() => new RemainingPipe());
  });

  it('says Not tracked for a null amount (a spool with no starting weight)', () => {
    expect(pipe.transform(null)).toBe('Not tracked');
  });

  it('says Not tracked for an undefined amount', () => {
    expect(pipe.transform(undefined)).toBe('Not tracked');
  });

  it('ignores the unit for an untracked amount', () => {
    expect(
      pipe.transform(null, { divisor: 1000, digitsInfo: '1.0-0', unit: 'g' })
    ).toBe(NOT_TRACKED);
  });

  it('formats a tracked amount like the number pipe', () => {
    expect(pipe.transform(1234.5678)).toBe('1,234.568');
  });

  it('scales, rounds and suffixes a tracked amount', () => {
    expect(
      pipe.transform(812400, { divisor: 1000, digitsInfo: '1.0-0', unit: 'g' })
    ).toBe('812g');
  });

  it('shows zero as zero, not as untracked', () => {
    expect(pipe.transform(0, { divisor: 1000, unit: ' (g) remaining' })).toBe(
      '0 (g) remaining'
    );
  });

  it('keeps the sign of an over-used spool', () => {
    expect(pipe.transform(-5000, { divisor: 1000, digitsInfo: '1.0-0' })).toBe(
      '-5'
    );
  });
});

describe('isRemainingTracked', () => {
  it('is false for null and undefined', () => {
    expect(isRemainingTracked(null)).toBe(false);
    expect(isRemainingTracked(undefined)).toBe(false);
  });

  it('is true for any number, including zero and negatives', () => {
    expect(isRemainingTracked(0)).toBe(true);
    expect(isRemainingTracked(-1)).toBe(true);
    expect(isRemainingTracked(500)).toBe(true);
  });
});
