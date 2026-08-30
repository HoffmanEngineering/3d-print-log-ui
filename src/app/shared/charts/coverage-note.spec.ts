import { Coverage } from 'src/app/analytics/models/analytics.models';
import { formatCoverageNote } from './coverage-note';

const coverage = (
  exclusions: { reason: string; count: number }[]
): Coverage => ({
  population: 'prints',
  counted: 0,
  total: 0,
  undatedCount: 0,
  exclusions,
});

describe('formatCoverageNote', () => {
  it('returns null when nothing was excluded', () => {
    expect(formatCoverageNote(coverage([]))).toBeNull();
  });

  it('renders the new reasons in plain language, never the enum name', () => {
    const note = formatCoverageNote(
      coverage([
        { reason: 'DurationMissing', count: 2 },
        { reason: 'WindowTruncated', count: 1 },
      ])
    );

    expect(note).toBe(
      '2 prints have no recorded duration · Showing the most recent 53 weeks'
    );
    expect(note).not.toContain('DurationMissing');
  });

  it('singularises a count of one', () => {
    expect(
      formatCoverageNote(coverage([{ reason: 'DurationMissing', count: 1 }]))
    ).toBe('1 print has no recorded duration');
  });
});
