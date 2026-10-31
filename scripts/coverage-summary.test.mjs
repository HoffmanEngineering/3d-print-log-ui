import assert from 'node:assert/strict';
import { test } from 'node:test';

import { formatCoverageSummary } from './coverage-summary-lib.mjs';

const metric = (covered, total) => ({
  covered,
  total,
  skipped: 0,
  pct: (covered / total) * 100,
});

test('renders a row per metric with the percentage and the counts', () => {
  const markdown = formatCoverageSummary({
    total: {
      statements: metric(879, 1000),
      branches: metric(797, 1000),
      functions: metric(3, 4),
      lines: metric(843, 1000),
    },
  });

  assert.match(markdown, /\| Statements \| 87\.90% \| 879 \/ 1000 \|/);
  assert.match(markdown, /\| Branches \| 79\.70% \| 797 \/ 1000 \|/);
  assert.match(markdown, /\| Functions \| 75\.00% \| 3 \/ 4 \|/);
  assert.match(markdown, /\| Lines \| 84\.30% \| 843 \/ 1000 \|/);
});

test('refuses a report with no total, rather than writing an empty table', () => {
  assert.throws(() => formatCoverageSummary({}), /no "total" entry/);
});
