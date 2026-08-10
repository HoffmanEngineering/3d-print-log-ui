export interface CsvExport {
  filename: string;
  columns: string[];
  rows: (string | number | null)[][];
}

const MAX_ROWS = 10_000;
const DANGEROUS = ['=', '+', '-', '@', '\t', '\r'];

/**
 * A cell, safe for a spreadsheet.
 *
 * Values beginning =, +, -, @, tab or CR are prefixed with an apostrophe: Excel, Sheets and
 * LibreOffice all EXECUTE such a cell, and print titles, material names and printer names are
 * user-controlled text landing in a file someone else may open. Numbers are exempt — a negative
 * number is a number, not a formula — and are formatted invariantly so a comma decimal
 * separator cannot break the column count.
 */
export function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number')
    return Number.isFinite(value) ? value.toString() : '';

  const text = String(value);
  const needsGuard = DANGEROUS.some((prefix) => text.startsWith(prefix));
  const body = needsGuard ? `'${text}` : text;

  return needsGuard || /[",\n\r]/.test(body)
    ? `"${body.replace(/"/g, '""')}"`
    : body;
}

export function toCsv(
  columns: string[],
  rows: (string | number | null)[][]
): string {
  const capped = rows.slice(0, MAX_ROWS);
  const lines = [
    columns.map(escapeCsvCell).join(','),
    ...capped.map((row) => row.map(escapeCsvCell).join(',')),
  ];

  // Truncation is stated, never silent: a short file that looks complete is worse than none.
  if (rows.length > MAX_ROWS) lines.push(`# truncated at ${MAX_ROWS} rows`);

  // BOM so Excel reads accented material names as UTF-8 rather than mojibake.
  return `﻿${lines.join('\r\n')}`;
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  triggerDownload(filename, blob);
}

/**
 * Rasterises a chart at 2x on an OPAQUE background. Transparent PNGs are unreadable pasted into
 * a document, and the hidden accessible data table is deliberately not included — this is an
 * image of the chart, not of the page.
 */
export async function svgToPngBlob(
  svg: SVGSVGElement,
  scale = 2,
  background?: string
): Promise<Blob> {
  // Resolved from the live page, not hardcoded white: on the dark theme the marks rasterise
  // in their dark-theme colors, and a white canvas behind them would be unreadable. Opaque
  // either way — a transparent PNG pasted into a document is unreadable too.
  const surface = background ?? resolveSurfaceColor(svg);
  const rect = svg.getBoundingClientRect();
  const width = Math.max(1, Math.round(rect.width));
  const height = Math.max(1, Math.round(rect.height));

  // Inline the computed fills so theme custom properties survive rasterisation: an <img>
  // loaded from a data URI has no access to the page's CSS.
  const clone = svg.cloneNode(true) as SVGSVGElement;
  inlineComputedFills(svg, clone);
  clone.setAttribute('width', String(width));
  clone.setAttribute('height', String(height));

  const source = new XMLSerializer().serializeToString(clone);
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(source)}`;

  const image = new Image();
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error('Could not rasterise the chart.'));
    image.src = url;
  });

  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;

  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not rasterise the chart.');
  context.fillStyle = surface;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob
          ? resolve(blob)
          : reject(new Error('Could not rasterise the chart.')),
      'image/png'
    )
  );
}

export function downloadPng(filename: string, blob: Blob): void {
  triggerDownload(filename, blob);
}

function triggerDownload(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

/**
 * Walks up from the chart to the first ancestor with a non-transparent background, so the PNG
 * sits on the same surface the user is looking at. Falls back to white only when nothing in the
 * chain declares one.
 */
function resolveSurfaceColor(svg: SVGSVGElement): string {
  let node: HTMLElement | null = svg.parentElement;

  while (node) {
    const color = getComputedStyle(node).backgroundColor;
    if (
      color &&
      color !== 'transparent' &&
      !color.startsWith('rgba(0, 0, 0, 0)')
    ) {
      return color;
    }
    node = node.parentElement;
  }

  return '#ffffff';
}

function inlineComputedFills(
  source: SVGSVGElement,
  clone: SVGSVGElement
): void {
  const sourceNodes = source.querySelectorAll<SVGElement>('*');
  const cloneNodes = clone.querySelectorAll<SVGElement>('*');

  sourceNodes.forEach((node, index) => {
    const target = cloneNodes[index];
    if (!target) return;
    const computed = getComputedStyle(node);
    target.setAttribute('fill', computed.fill);
    target.setAttribute('stroke', computed.stroke);
    if (computed.fontSize) target.setAttribute('font-size', computed.fontSize);
  });
}
