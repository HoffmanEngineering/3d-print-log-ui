import { LocaleDatePipe } from './locale-date.pipe';

describe('LocaleDatePipe', () => {
  // Use a fixed date for deterministic output
  const testDate = new Date('2026-01-15T14:30:45.000Z');

  it('returns empty string for null', () => {
    const pipe = new LocaleDatePipe();
    expect(pipe.transform(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    const pipe = new LocaleDatePipe();
    expect(pipe.transform(undefined)).toBe('');
  });

  it('formats date only with default (date) format', () => {
    const pipe = new LocaleDatePipe();
    const result = pipe.transform(testDate, 'date', 'en-US');
    expect(result).toBeTruthy();
    expect(result).toContain('2026');
    // en-US medium date: "Jan 15, 2026"
    expect(result).not.toContain(':');
  });

  it('formats time only with time format', () => {
    const pipe = new LocaleDatePipe();
    const result = pipe.transform(testDate, 'time', 'en-US');
    expect(result).toBeTruthy();
    expect(result).toContain(':');
    // en-US medium time shows AM/PM
    const hasAmPm = result.includes('AM') || result.includes('PM');
    expect(hasAmPm).toBeTrue();
  });

  it('formats time in 24h for de-DE locale', () => {
    const pipe = new LocaleDatePipe();
    const result = pipe.transform(testDate, 'time', 'de-DE');
    expect(result).toBeTruthy();
    // de-DE uses 24h — no AM/PM
    expect(result).not.toContain('AM');
    expect(result).not.toContain('PM');
  });

  it('formats datetime with datetime format', () => {
    const pipe = new LocaleDatePipe();
    const result = pipe.transform(testDate, 'datetime', 'en-US');
    expect(result).toContain('2026');
    expect(result).toContain(':');
  });

  it('formats date with long format', () => {
    const pipe = new LocaleDatePipe();
    const result = pipe.transform(testDate, 'long', 'en-US');
    // long format: "January 15, 2026"
    expect(result).toContain('January');
    expect(result).toContain('2026');
  });

  it('accepts a date string input', () => {
    const pipe = new LocaleDatePipe();
    const result = pipe.transform('2026-01-15T14:30:45.000Z', 'date', 'en-US');
    expect(result).toContain('2026');
  });

  it('formats with short format', () => {
    const pipe = new LocaleDatePipe();
    const result = pipe.transform(testDate, 'short', 'en-US');
    expect(result).toBeTruthy();
    expect(result).toContain(':'); // time part present
    expect(result).toMatch(/\d/); // contains digits for date
  });
});
