// Writes the unit-test coverage totals to the GitHub Actions job summary
// ($GITHUB_STEP_SUMMARY), or to stdout outside Actions. Run after test:coverage.
import { appendFileSync, readFileSync } from 'node:fs';

import { formatCoverageSummary } from './coverage-summary-lib.mjs';

const REPORT = 'coverage/print-log-ui/coverage-summary.json';

const markdown = formatCoverageSummary(
  JSON.parse(readFileSync(REPORT, 'utf8'))
);
const target = process.env.GITHUB_STEP_SUMMARY;
if (target) {
  appendFileSync(target, markdown);
} else {
  process.stdout.write(markdown);
}
