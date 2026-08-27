import { formatCivilDate, parseCivilDate } from './civil-date';

describe('civil-date utils', () => {
  it('parses YYYY-MM-DD to a local-midnight Date', () => {
    const d = parseCivilDate('2026-02-01')!;
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(1);
    expect(d.getDate()).toBe(1);
    expect(d.getHours()).toBe(0);
  });

  it('returns null for null, undefined, or empty input', () => {
    expect(parseCivilDate(null)).toBeNull();
    expect(parseCivilDate(undefined)).toBeNull();
    expect(parseCivilDate('')).toBeNull();
  });

  it('returns null for a malformed value', () => {
    expect(parseCivilDate('not-a-date')).toBeNull();
  });

  it('formats a Date from its local calendar components', () => {
    expect(formatCivilDate(new Date(2026, 1, 1))).toBe('2026-02-01');
  });

  it('pads single-digit months and days', () => {
    expect(formatCivilDate(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('returns null for a null Date', () => {
    expect(formatCivilDate(null)).toBeNull();
  });

  it('round-trips without drifting a day', () => {
    // The failure this guards: toISOString() on a local midnight east of UTC yields the
    // PREVIOUS day. This must hold in whatever timezone the suite happens to run in.
    expect(formatCivilDate(parseCivilDate('2026-02-01'))).toBe('2026-02-01');
    expect(formatCivilDate(parseCivilDate('2026-12-31'))).toBe('2026-12-31');
    expect(formatCivilDate(parseCivilDate('2026-01-01'))).toBe('2026-01-01');
  });

  it('does not agree with toISOString when the offset is positive', () => {
    // Documents WHY these helpers exist rather than a one-line toISOString().slice(0, 10).
    const parsed = parseCivilDate('2026-06-15')!;
    const naive = parsed.toISOString().slice(0, 10);
    const correct = formatCivilDate(parsed);

    expect(correct).toBe('2026-06-15');
    if (parsed.getTimezoneOffset() < 0) {
      // East of UTC: the naive form loses a day. West of or at UTC the two agree, which is
      // exactly why this bug survives review on a machine in a negative offset.
      expect(naive).not.toBe(correct);
    }
  });
});
