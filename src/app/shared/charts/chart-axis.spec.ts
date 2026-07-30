import {
  formatTickDate,
  parseLocalDate,
  tickCountForWidth,
} from './chart-axis';

describe('parseLocalDate', () => {
  it('keeps a date-only value on its civil date regardless of timezone', () => {
    // `new Date("2026-07-01")` parses as UTC midnight, which is 30 June west of UTC. The API
    // sends DateOnly for bucket starts, so that would label a whole chart a day early.
    const parsed = parseLocalDate('2026-07-01');

    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(6); // July
    expect(parsed.getDate()).toBe(1);
  });

  it('renders a date-only bucket start with the same day the server labelled it', () => {
    expect(formatTickDate(parseLocalDate('2026-07-01'), 'Day', true)).toBe(
      '7/1'
    );
  });

  it('leaves values carrying a time component to the normal parser', () => {
    const parsed = parseLocalDate('2026-07-01T12:00:00Z');
    expect(parsed.getTime()).toBe(Date.parse('2026-07-01T12:00:00Z'));
  });
});

describe('tickCountForWidth', () => {
  it('thins ticks on narrow charts rather than overlapping labels', () => {
    expect(tickCountForWidth(320)).toBeLessThanOrEqual(4);
    expect(tickCountForWidth(1440)).toBeGreaterThanOrEqual(8);
  });

  it('never returns fewer than two ticks', () => {
    expect(tickCountForWidth(0)).toBe(2);
    expect(tickCountForWidth(40)).toBe(2);
  });

  it('increases monotonically with width', () => {
    const widths = [320, 480, 768, 1024, 1440, 1920];
    const counts = widths.map(tickCountForWidth);
    for (let i = 1; i < counts.length; i++) {
      expect(counts[i]).toBeGreaterThanOrEqual(counts[i - 1]);
    }
  });
});

describe('formatTickDate', () => {
  const date = new Date(2026, 6, 3); // 3 July 2026, local

  it('abbreviates day labels when compact', () => {
    expect(formatTickDate(date, 'Day', true)).toBe('7/3');
  });

  it('spells out day labels when there is room', () => {
    expect(formatTickDate(date, 'Day', false)).toContain('Jul');
  });

  it('formats months without a day number', () => {
    expect(formatTickDate(date, 'Month', false)).not.toContain('3');
  });
});
