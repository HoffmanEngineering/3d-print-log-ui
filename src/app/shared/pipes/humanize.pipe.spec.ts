import { HumanizePipe } from './humanize.pipe';

describe('HumanizePipe', () => {
  let pipe: HumanizePipe;

  beforeEach(() => {
    pipe = new HumanizePipe();
  });

  it('returns empty string for null', () => {
    expect(pipe.transform(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(pipe.transform(undefined)).toBe('');
  });

  it('returns empty string for invalid date string', () => {
    expect(pipe.transform('not-a-date')).toBe('');
  });

  it('returns a non-empty string for a recent past date', () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const result = pipe.transform(fiveMinutesAgo) as string;
    expect(result).toBeTruthy();
    expect(result.length).toBeGreaterThan(0);
  });

  it('accepts a date string input', () => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const result = pipe.transform(oneHourAgo) as string;
    expect(result).toBeTruthy();
  });

  it('returns a non-empty string for a future date', () => {
    const inTenMinutes = new Date(Date.now() + 10 * 60 * 1000);
    const result = pipe.transform(inTenMinutes) as string;
    expect(result).toBeTruthy();
    expect(result.length).toBeGreaterThan(0);
  });
});
