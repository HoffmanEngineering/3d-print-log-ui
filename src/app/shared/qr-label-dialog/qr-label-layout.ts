export type LabelSize = 'small' | 'medium' | 'large';
export type PaperSize = 'A4' | 'Letter' | 'A5';

export interface Dimensions {
  width: number;
  height: number;
}

export interface Grid {
  columns: number;
  rows: number;
}

export const PAPER_DIMENSIONS: Record<PaperSize, Dimensions> = {
  A4: { width: 210, height: 297 },
  Letter: { width: 216, height: 279 },
  A5: { width: 148, height: 210 },
};

export const LABEL_DIMENSIONS: Record<LabelSize, Dimensions> = {
  small: { width: 50, height: 25 },
  medium: { width: 70, height: 30 },
  large: { width: 90, height: 35 },
};

/** Page padding, in mm — must match the `.print-page` padding in both the preview and the print stylesheet. */
export const PAGE_PADDING_MM = 10;

/** Gap between labels, in mm — must match the `.print-grid` gap in both stylesheets. */
export const LABEL_GAP_MM = 3;

function fitAlong(available: number, cell: number): number {
  // n cells need n * cell + (n - 1) * gap, which rearranges to this. At least
  // one either way: a page that holds nothing is worse than one that overflows.
  return Math.max(
    1,
    Math.floor((available + LABEL_GAP_MM) / (cell + LABEL_GAP_MM))
  );
}

/**
 * The largest grid of labels that fits on a sheet.
 *
 * Paper size, label size, columns, and rows used to be four independent
 * choices, which let the dialog lay out (say) four 90mm labels across 190mm of
 * usable A4 — the preview overflowed and the printed sheet was unusable. The
 * grid is derived from the paper and label size instead, and this is also the
 * ceiling for a manual override.
 */
export function fitGrid(paper: Dimensions, label: Dimensions): Grid {
  const usableWidth = paper.width - PAGE_PADDING_MM * 2;
  const usableHeight = paper.height - PAGE_PADDING_MM * 2;

  return {
    columns: fitAlong(usableWidth, label.width),
    rows: fitAlong(usableHeight, label.height),
  };
}
