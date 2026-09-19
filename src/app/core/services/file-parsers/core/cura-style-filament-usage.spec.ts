import { parseCuraStyleFilamentUsage } from './cura-style-filament-usage';

describe('parseCuraStyleFilamentUsage', () => {
  it('parses a single "1.65354m"', () => {
    const usage = parseCuraStyleFilamentUsage('1.65354m');
    expect(usage.length).toBe(1);
    expect(usage[0].estimatedLengthInM).toBe(1.654);
    expect(usage[0].notes).toBe('Slot 1');
  });

  it('parses a multi-extruder "1.2m, 0m, 0.5m" and skips empty slots', () => {
    const usage = parseCuraStyleFilamentUsage('1.2m, 0m, 0.5m');
    expect(usage.map((u) => u.notes)).toEqual(['Slot 1', 'Slot 3']);
    expect(usage[1].estimatedLengthInM).toBe(0.5);
  });

  it('returns [] for empty or non-numeric input', () => {
    expect(parseCuraStyleFilamentUsage('')).toEqual([]);
    expect(parseCuraStyleFilamentUsage('abc')).toEqual([]);
  });
});
