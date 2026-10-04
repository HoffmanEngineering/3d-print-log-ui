/**
 * Badge glyphs on a 48×48 grid, drawn as data rather than markup strings so the badge renders
 * them with ordinary template bindings: no `innerHTML`, no sanitizer bypass, and nothing that
 * fails in prerender.
 *
 * Paint is symbolic. `fg` is the glyph color (white on most fills), `cut` is the fill's dark
 * accent for cut-outs such as eyes, `none` is unfilled. Detail stays low enough to read at 30px.
 * The bed-slinger, robot and octopus are the approved reference art (spec Appendix A); the rest
 * follow their stroke weight and style.
 */
export type GlyphPaint = 'fg' | 'cut' | 'none';

interface ShapeBase {
  fill?: GlyphPaint;
  stroke?: GlyphPaint;
  strokeWidth?: number;
}

export type GlyphShape =
  | (ShapeBase & { kind: 'path'; d: string })
  | (ShapeBase & {
      kind: 'rect';
      x: number;
      y: number;
      width: number;
      height: number;
      rx?: number;
    })
  | (ShapeBase & { kind: 'circle'; cx: number; cy: number; r: number })
  | (ShapeBase & {
      kind: 'line';
      x1: number;
      y1: number;
      x2: number;
      y2: number;
    });

const path = (d: string, o: ShapeBase = {}): GlyphShape => ({
  kind: 'path',
  d,
  fill: 'fg',
  ...o,
});
const stroked = (d: string, strokeWidth = 3.4): GlyphShape => ({
  kind: 'path',
  d,
  fill: 'none',
  stroke: 'fg',
  strokeWidth,
});
const rect = (
  x: number,
  y: number,
  width: number,
  height: number,
  rx = 1,
  o: ShapeBase = {}
): GlyphShape => ({ kind: 'rect', x, y, width, height, rx, fill: 'fg', ...o });
const circle = (
  cx: number,
  cy: number,
  r: number,
  o: ShapeBase = {}
): GlyphShape => ({ kind: 'circle', cx, cy, r, fill: 'fg', ...o });
const cut = { fill: 'cut' } as const;

export const ACHIEVEMENT_GLYPHS: Readonly<
  Record<string, readonly GlyphShape[]>
> = {
  // Approved (Appendix A).
  'printer-bedslinger': [
    rect(6, 5, 4, 40, 1.5),
    rect(38, 5, 4, 40, 1.5),
    rect(6, 4, 36, 4, 1.5),
    rect(8, 17, 32, 3, 1),
    path('M20 14h8v7l-2.5 3h-3L20 21z'),
    path('M23 24h2l-1 2.2z'),
    rect(16, 29, 16, 3, 1),
    rect(18, 32.5, 12, 3, 1),
    rect(2, 37, 44, 4, 1.5),
    rect(6, 41, 5, 4, 1),
    rect(37, 41, 5, 4, 1),
  ],
  robot: [
    {
      kind: 'line',
      x1: 24,
      y1: 4,
      x2: 24,
      y2: 10,
      stroke: 'fg',
      strokeWidth: 3,
    },
    circle(24, 4, 2.8),
    rect(8, 10, 32, 28, 9),
    rect(4, 20, 3.5, 9, 1.75),
    rect(40.5, 20, 3.5, 9, 1.75),
    circle(18, 22, 3, cut),
    circle(30, 22, 3, cut),
    {
      kind: 'path',
      d: 'M19.5 30q4.5 2.6 9 0',
      fill: 'none',
      stroke: 'cut',
      strokeWidth: 2.4,
    },
  ],
  octopus: [
    path(
      'M24 4c-9 0-14 6.5-14 14 0 4 1.6 7 4 9h20c2.4-2 4-5 4-9 0-7.5-5-14-14-14z'
    ),
    circle(19, 17, 2.6, cut),
    circle(29, 17, 2.6, cut),
    stroked('M15 26c-3 4-8 5-9 10 1 3 4 2 4 0'),
    stroked('M20 27c-1 5-4 8-3 12 1 3 4 2 3-1'),
    stroked('M28 27c1 5 4 8 3 12-1 3-4 2-3-1'),
    stroked('M33 26c3 4 8 5 9 10-1 3-4 2-4 0'),
  ],

  // Getting started.
  spool: [
    rect(8, 6, 32, 6, 2),
    rect(8, 36, 32, 6, 2),
    rect(13, 12, 22, 24, 1),
    stroked('M13 18h22M13 24h22M13 30h22', 2),
    circle(24, 9, 1.8, cut),
    circle(24, 39, 1.8, cut),
  ],
  layers: [
    rect(8, 34, 32, 6, 2),
    rect(12, 26, 24, 6, 2),
    rect(16, 18, 16, 6, 2),
    path('M21 6h6v6l-3 4-3-4z'),
  ],
  plug: [
    rect(16, 4, 4, 10, 1.5),
    rect(28, 4, 4, 10, 1.5),
    path('M12 14h24v8c0 7-5 12-12 12s-12-5-12-12z'),
    rect(21, 33, 6, 11, 2),
  ],
  camera: [
    path(
      'M6 16c0-2 1.5-3.5 3.5-3.5h6l3-5h11l3 5h6c2 0 3.5 1.5 3.5 3.5v20c0 2-1.5 3.5-3.5 3.5h-29C7.5 39.5 6 38 6 36z'
    ),
    circle(24, 26, 8.5, cut),
    circle(24, 26, 5),
  ],
  'id-badge': [
    rect(8, 8, 32, 34, 4),
    rect(20, 4, 8, 7, 2, cut),
    circle(24, 21, 5, cut),
    path('M15 36c0-5 4-8.5 9-8.5s9 3.5 9 8.5z', cut),
  ],

  // Milestones.
  numeral: [], // drawn as text: the tier threshold
  clock: [
    circle(24, 25, 17),
    circle(24, 25, 13, cut),
    stroked('M24 16v10l6 4', 3.4),
    rect(20, 3, 8, 5, 1.5),
  ],
  scale: [
    path('M12 14h24l6 26H6z'),
    circle(24, 10, 5, cut),
    rect(19, 26, 10, 3, 1, cut),
  ],
  timer: [
    path(
      'M12 5h24v4c0 6-6 10-9 15 3 5 9 9 9 15v4H12v-4c0-6 6-10 9-15-3-5-9-9-9-15z'
    ),
    path('M18 39c0-3 3-5 6-7 3 2 6 4 6 7z', cut),
  ],
  factory: [
    path('M4 42V22l10 6v-6l10 6v-6l10 6V8h8v34z'),
    rect(9, 33, 5, 5, 1, cut),
    rect(19, 33, 5, 5, 1, cut),
    rect(29, 33, 5, 5, 1, cut),
  ],
  shelf: [
    rect(4, 22, 40, 3.5, 1.5),
    rect(4, 41, 40, 3.5, 1.5),
    rect(7, 8, 9, 14, 2),
    rect(19, 8, 9, 14, 2),
    rect(31, 8, 9, 14, 2),
    rect(10, 27, 9, 14, 2),
    rect(24, 27, 9, 14, 2),
  ],
  flask: [
    path(
      'M18 4h12v4h-2v10l11 19c1.5 3-.5 6-4 6H11c-3.5 0-5.5-3-4-6l11-19V8h-2z'
    ),
    path(
      'M13 32h22l3 5c.7 1.4-.3 2.5-1.8 2.5H11.8c-1.5 0-2.5-1.1-1.8-2.5z',
      cut
    ),
  ],
  palette: [
    path(
      'M24 5C13 5 5 13 5 23c0 11 8 19 18 19 3 0 4-2 3-4-1-3 1-5 4-5h5c5 0 8-4 8-9C43 13 35 5 24 5z'
    ),
    circle(14, 22, 3.2, cut),
    circle(20, 13, 3.2, cut),
    circle(30, 13, 3.2, cut),
    circle(36, 21, 3.2, cut),
  ],
  'folder-star': [
    path(
      'M4 12c0-2 1.5-3.5 3.5-3.5h10l4 4.5h19c2 0 3.5 1.5 3.5 3.5v22c0 2-1.5 3.5-3.5 3.5h-33C5.5 42 4 40.5 4 38.5z'
    ),
    path(
      'M24 18l2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9-4.3-4.1 5.9-.8z',
      cut
    ),
  ],

  // Streaks.
  flame: [
    path(
      'M24 4c2 7 12 12 12 24 0 8-5.5 14-12 14s-12-6-12-14c0-6 3-10 6-13 0 5 2 8 4 8-2-7 0-14 2-19z'
    ),
    path('M24 26c3 3 5 6 5 9 0 3-2.2 5-5 5s-5-2-5-5c0-3 2-6 5-9z', cut),
  ],
  calendar: [
    rect(5, 9, 38, 33, 4),
    rect(5, 9, 38, 9, 4, cut),
    rect(13, 4, 4, 9, 1.5),
    rect(31, 4, 4, 9, 1.5),
    rect(11, 23, 6, 5, 1, cut),
    rect(21, 23, 6, 5, 1, cut),
    rect(31, 23, 6, 5, 1, cut),
    rect(11, 32, 6, 5, 1, cut),
    rect(21, 32, 6, 5, 1, cut),
  ],
  'stack-plates': [
    rect(6, 35, 36, 6, 2),
    rect(8, 26, 32, 6, 2),
    rect(10, 17, 28, 6, 2),
    rect(12, 8, 24, 6, 2),
  ],

  // Integrations.
  fork: [
    circle(12, 9, 4.5),
    circle(36, 9, 4.5),
    circle(24, 40, 4.5),
    stroked('M12 13v4c0 6 12 6 12 12v6M36 13v4c0 6-12 6-12 12', 3.6),
  ],
  'moon-link': [
    path('M30 6c-9 1-16 9-16 18s7 17 16 18c-12 3-24-6-24-18S18 3 30 6z'),
    stroked('M27 22h6a5 5 0 010 10h-6M31 27h-4M38 17a5 5 0 017 5', 3.2),
  ],

  // Community and care.
  globe: [
    circle(24, 24, 18),
    {
      kind: 'path',
      d: 'M6 24h36M24 6c-6 6-6 30 0 36M24 6c6 6 6 30 0 36M9 14h30M9 34h30',
      fill: 'none',
      stroke: 'cut',
      strokeWidth: 2.2,
    },
  ],
  chat: [
    path(
      'M6 10c0-2.5 2-4.5 4.5-4.5h27c2.5 0 4.5 2 4.5 4.5v18c0 2.5-2 4.5-4.5 4.5H20l-9 8v-8h-.5C8 32.5 6 30.5 6 28z'
    ),
    circle(16, 19, 2.5, cut),
    circle(24, 19, 2.5, cut),
    circle(32, 19, 2.5, cut),
  ],
  wrench: [
    path(
      'M31 4a11 11 0 00-10 15L5 35a4.2 4.2 0 006 6l16-16A11 11 0 0042 15l-6 6-6-1-1-6 6-6c-1.5-.6-3.2-1-5-1z'
    ),
  ],

  // Hidden.
  noodles: [
    stroked('M8 10c6 0 6 8 12 8s6-8 12-8 6 8 8 8', 3.2),
    stroked('M8 18c6 0 6 8 12 8s6-8 12-8 6 8 8 8', 3.2),
    path('M6 28h36c0 8-8 14-18 14S6 36 6 28z'),
  ],
  wave: [
    path(
      'M17 40c-5-4-9-10-10-16-.4-2.4 3-3 4-.8l3 6V10c0-2 3-2 3 0v12h1V7c0-2 3-2 3 0v15h1V9c0-2 3-2 3 0v14h1V13c0-2 3-2 3 0v15c0 7-2 11-5 14z'
    ),
  ],
  moon: [
    path('M30 5C19 6 11 14 11 25s8 18 19 19c-14 4-26-6-26-19S16 1 30 5z'),
    path('M37 10l1.2 2.8 3 .2-2.3 2 .7 3-2.6-1.6-2.6 1.6.7-3-2.3-2 3-.2z'),
  ],
  confetti: [
    path('M6 42l9-26 17 17z'),
    stroked('M26 8c2 3 0 5 2 8M36 14c3-1 5 1 8-1M30 22c2-2 5-1 6-4', 2.8),
    circle(38, 6, 2.5),
    circle(42, 26, 2.5),
    circle(20, 6, 2),
  ],

  // Fallbacks.
  question: [
    stroked('M16 17c0-5 3.5-8.5 8-8.5s8 3.2 8 7.8c0 6.5-8 6.5-8 13', 4.2),
    circle(24, 37.5, 3),
  ],
  stack: [
    path('M24 4l18 9-18 9-18-9z'),
    stroked('M6 22l18 9 18-9', 3.4),
    stroked('M6 31l18 9 18-9', 3.4),
  ],
};

/** Glyphs drawn as two-letter text, e.g. `initials:Cu`. */
export const INITIALS_PREFIX = 'initials:';

/** Every glyph the API catalog may name (API `AchievementGlyphs.Known`). */
export const REQUIRED_GLYPHS: readonly string[] = [
  'printer-bedslinger',
  'spool',
  'layers',
  'plug',
  'camera',
  'id-badge',
  'numeral',
  'clock',
  'scale',
  'timer',
  'factory',
  'shelf',
  'flask',
  'palette',
  'folder-star',
  'flame',
  'calendar',
  'stack-plates',
  'fork',
  'octopus',
  'moon-link',
  'robot',
  'globe',
  'chat',
  'wrench',
  'noodles',
  'wave',
  'moon',
  'confetti',
  'question',
  'stack',
];
