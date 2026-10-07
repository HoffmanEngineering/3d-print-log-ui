import { parseDurationAsSeconds } from './duration';

describe('parseDurationAsSeconds', () => {
  it('reads the day/hour/minute/second strings slicers write', () => {
    expect(parseDurationAsSeconds('1d 2h 3m 4s')).toBe(93_784);
    expect(parseDurationAsSeconds('2d 03h 15m 07s')).toBe(184_507);
    expect(parseDurationAsSeconds('2h 30m')).toBe(9_000);
    expect(parseDurationAsSeconds('1h30m')).toBe(5_400);
    expect(parseDurationAsSeconds('45s')).toBe(45);
  });

  it('reads the longer unit names a person might type', () => {
    expect(parseDurationAsSeconds('10 min')).toBe(600);
    expect(parseDurationAsSeconds('1 hour 2 minutes')).toBe(3_720);
  });

  it('accepts fractional units and surrounding whitespace', () => {
    expect(parseDurationAsSeconds('1.5h')).toBe(5_400);
    expect(parseDurationAsSeconds(' 5m ')).toBe(300);
  });

  it('rounds down to whole seconds', () => {
    expect(parseDurationAsSeconds('1.9s')).toBe(1);
  });

  it('returns null for blank or missing input', () => {
    expect(parseDurationAsSeconds('')).toBeNull();
    expect(parseDurationAsSeconds('   ')).toBeNull();
    expect(parseDurationAsSeconds(null)).toBeNull();
    expect(parseDurationAsSeconds(undefined)).toBeNull();
  });

  it('returns null, not zero, for text that is not a duration', () => {
    expect(parseDurationAsSeconds('garbage')).toBeNull();
  });
});
