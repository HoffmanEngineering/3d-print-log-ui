import { escapeCsvCell } from 'src/app/shared/charts/chart-export';

export interface CsvSection {
  title: string;
  columns: string[];
  rows: (string | number | null)[][];
}

/** Shared across the whole file, matching the per-chart cap in chart-export.ts. */
export const MAX_TAB_ROWS = 10_000;

/**
 * A section built from a per-chart export, so the tab file and the per-chart file can never
 * drift apart — there is one definition of each chart's columns and rows.
 */
export function sectionOf(
  title: string,
  csv: { columns: string[]; rows: (string | number | null)[][] }
): CsvSection {
  return { title, columns: csv.columns, rows: csv.rows };
}

/**
 * One file holding every figure on a tab, which is what "export my Costs for last quarter"
 * actually means. Sections are separated by a `# Title` comment line — the convention
 * spreadsheets ignore and humans read.
 *
 * Every cell goes through escapeCsvCell, so the formula-injection guarantee is identical to the
 * per-chart export; there is exactly one escaping implementation.
 */
export function buildTabCsv(
  filename: string,
  sections: CsvSection[]
): { filename: string; content: string } {
  const lines: string[] = [];
  let budget = MAX_TAB_ROWS;

  for (const section of sections) {
    if (section.rows.length === 0) continue; // a bare heading tells the reader nothing
    lines.push(`# ${section.title}`);
    lines.push(section.columns.map(escapeCsvCell).join(','));

    // The cap is shared across the WHOLE file, not per section: a tab with six sections must
    // not be able to emit six times the per-chart limit. Truncation is always stated.
    const kept = section.rows.slice(0, budget);
    for (const row of kept) lines.push(row.map(escapeCsvCell).join(','));
    budget -= kept.length;

    if (kept.length < section.rows.length) {
      lines.push(
        `# ${section.title} truncated at ${kept.length} of ${section.rows.length} rows`
      );
    }

    lines.push('');
    if (budget <= 0) {
      lines.push(
        `# row limit of ${MAX_TAB_ROWS} reached — later sections omitted`
      );
      break;
    }
  }

  return { filename, content: `﻿${lines.join('\r\n')}` };
}
