import { DurationPipe } from './duration.pipe';

describe('DurationPipe', () => {
  let pipe: DurationPipe;

  beforeEach(() => {
    pipe = new DurationPipe();
  });

  it('create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  it('returns empty string for null', () => {
    expect(pipe.transform(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(pipe.transform(undefined)).toBe('');
  });

  it('returns empty string for NaN', () => {
    expect(pipe.transform(NaN)).toBe('');
  });

  it('returns empty string for Infinity', () => {
    expect(pipe.transform(Infinity)).toBe('');
  });

  it('formats seconds only', () => {
    expect(pipe.transform(45)).toContain('45s');
  });

  it('formats minutes and seconds', () => {
    const result = pipe.transform(90) as string;
    expect(result).toContain('1m');
    expect(result).toContain('30s');
  });

  it('formats hours, minutes, seconds', () => {
    const result = pipe.transform(3661) as string; // 1h 1m 1s
    expect(result).toContain('1h');
    expect(result).toContain('1m');
    expect(result).toContain('1s');
  });

  it('formats days', () => {
    const result = pipe.transform(90000) as string; // 1d 1h
    expect(result).toContain('1d');
  });

  it('does not show zero units', () => {
    const result = pipe.transform(3600) as string; // exactly 1h
    expect(result).toContain('1h');
    expect(result).not.toContain('m');
    expect(result).not.toContain('s');
  });

  it('formats milliseconds for fractional seconds', () => {
    const result = pipe.transform(1.5) as string; // 1s 500ms
    expect(result).toContain('1s');
    expect(result).toContain('500ms');
  });
});
