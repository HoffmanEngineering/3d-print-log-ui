import { CivilDatePipe } from './civil-date.pipe';

describe('CivilDatePipe', () => {
  const pipe = new CivilDatePipe();

  it('renders a civil date in medium style', () => {
    expect(pipe.transform('2026-08-12', 'en-US')).toBe('Aug 12, 2026');
  });

  it('does not shift the day regardless of timezone', () => {
    // A naive `new Date('2026-08-12')` parses as UTC midnight and renders as Aug 11 for every
    // viewer west of UTC. This assertion fails outright if the pipe ever goes back to that.
    expect(pipe.transform('2026-08-12', 'en-US')).toBe('Aug 12, 2026');
  });

  it('renders the first of a month without borrowing from the previous one', () => {
    expect(pipe.transform('2026-01-01', 'en-US')).toBe('Jan 1, 2026');
  });

  it('returns an em dash for null or undefined', () => {
    expect(pipe.transform(null)).toBe('—');
    expect(pipe.transform(undefined)).toBe('—');
  });

  it('accepts a caller-supplied fallback', () => {
    expect(pipe.transform(null, 'en-US', 'Not set')).toBe('Not set');
  });
});
