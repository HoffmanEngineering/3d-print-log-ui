import { buildTabCsv } from './tab-csv';

describe('buildTabCsv', () => {
  it('concatenates each section under its own heading', () => {
    const csv = buildTabCsv('analytics-costs.csv', [
      {
        title: 'Totals',
        columns: ['Metric', 'Amount'],
        rows: [['Total spend', 12.5]],
      },
      {
        title: 'By material',
        columns: ['Material', 'Amount'],
        rows: [['PLA', 12.5]],
      },
    ]);

    expect(csv.content).toContain('# Totals');
    expect(csv.content).toContain('# By material');
    expect(csv.content).toContain('Metric,Amount');
    expect(csv.content).toContain('Material,Amount');
  });

  it('escapes every section through the same injection guard', () => {
    const csv = buildTabCsv('x.csv', [
      { title: 'Prints', columns: ['Title'], rows: [['=cmd|calc']] },
    ]);

    expect(csv.content).toContain(`"'=cmd|calc"`);
  });

  it('caps the whole file, not each section, and says where it stopped', () => {
    const csv = buildTabCsv('x.csv', [
      {
        title: 'A',
        columns: ['n'],
        rows: Array.from({ length: 8000 }, (_, i) => [i]),
      },
      {
        title: 'B',
        columns: ['n'],
        rows: Array.from({ length: 8000 }, (_, i) => [i]),
      },
    ]);

    expect(csv.content).toContain('truncated at');
    expect(csv.content).toContain('row limit of 10000 reached');
    // 16,000 rows in, at most 10,000 out — a six-section tab must not emit six times the cap.
    const dataLines = csv.content
      .split('\r\n')
      .filter((line) => /^\d+$/.test(line));
    expect(dataLines.length).toBeLessThanOrEqual(10_000);
  });

  it('skips empty sections rather than emitting a bare heading', () => {
    const csv = buildTabCsv('x.csv', [
      { title: 'Empty', columns: ['A'], rows: [] },
      { title: 'Full', columns: ['A'], rows: [[1]] },
    ]);

    expect(csv.content).not.toContain('# Empty');
    expect(csv.content).toContain('# Full');
  });
});
