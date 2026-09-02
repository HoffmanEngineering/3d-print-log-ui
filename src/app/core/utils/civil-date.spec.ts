import {
  formatCivilDate,
  parseCivilDate,
  todayUtcCivilDate,
} from './civil-date';

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

  describe('year and calendar-validity handling', () => {
    it('does not remap years 1-99 into the 1900s', () => {
      // The multi-argument Date constructor treats 0-99 as 1900-1999, so a naive
      // implementation turns 0001-01-01 into 1901 and persists the wrong year.
      const d = parseCivilDate('0001-01-01')!;
      expect(d).not.toBeNull();
      expect(d.getFullYear()).toBe(1);
    });

    it('round-trips a year below 100 with four-digit padding', () => {
      expect(formatCivilDate(parseCivilDate('0099-12-31'))).toBe('0099-12-31');
    });

    it('rejects a day that does not exist rather than rolling it forward', () => {
      // new Date(2026, 1, 30) silently becomes March 2.
      expect(parseCivilDate('2026-02-30')).toBeNull();
      expect(parseCivilDate('2026-13-01')).toBeNull();
      expect(parseCivilDate('2026-04-31')).toBeNull();
    });

    it('accepts a real leap day and rejects a fake one', () => {
      expect(parseCivilDate('2024-02-29')).not.toBeNull();
      expect(parseCivilDate('2026-02-29')).toBeNull();
    });

    it('rejects loosely formatted input', () => {
      expect(parseCivilDate('2026-2-1')).toBeNull();
      expect(parseCivilDate('02/01/2026')).toBeNull();
    });

    it('returns null for an invalid Date object', () => {
      expect(formatCivilDate(new Date('nonsense'))).toBeNull();
    });
  });

  describe('todayUtcCivilDate', () => {
    it('uses UTC components, matching how the API resolves a print-less project', () => {
      const now = new Date();
      const expected = [
        `${now.getUTCFullYear()}`.padStart(4, '0'),
        `${now.getUTCMonth() + 1}`.padStart(2, '0'),
        `${now.getUTCDate()}`.padStart(2, '0'),
      ].join('-');

      expect(todayUtcCivilDate()).toBe(expected);
    });
  });
});
