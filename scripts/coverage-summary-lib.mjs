/**
 * Renders Vitest's json-summary coverage report (`coverage-summary.json`) as a
 * Markdown table for a GitHub Actions job summary.
 */

const METRICS = [
  ['statements', 'Statements'],
  ['branches', 'Branches'],
  ['functions', 'Functions'],
  ['lines', 'Lines'],
];

/** `summary` is the parsed coverage-summary.json; only its `total` entry is read. */
export function formatCoverageSummary(summary) {
  const total = summary?.total;
  if (!total) {
    throw new Error('coverage-summary.json has no "total" entry');
  }
  const rows = METRICS.map(([key, label]) => {
    const { covered, total: count, pct } = total[key];
    return `| ${label} | ${pct.toFixed(2)}% | ${covered} / ${count} |`;
  });
  return [
    '## Unit test coverage',
    '',
    '| | Covered | |',
    '|---|---:|---:|',
    ...rows,
    '',
    'TypeScript and component templates under `src/`.',
    '',
  ].join('\n');
}
