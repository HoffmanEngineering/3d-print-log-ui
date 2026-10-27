/**
 * What a spool label's OCR text says, as numbers and a material. Brand and color name need the
 * catalog, so the API finds those.
 */
export interface LabelFields {
  materialType?: string;
  weightG?: number;
  diameterMm?: number;
  hotendMinC?: number;
  hotendMaxC?: number;
  bedMinC?: number;
  bedMaxC?: number;
}

/** Most specific first, so "PLA+" wins over "PLA" and "PETG" over "PET". */
const MATERIALS = [
  'PLA+',
  'PLA PRO',
  'SILK PLA',
  'PLA-CF',
  'PETG-CF',
  'PAHT-CF',
  'PA-CF',
  'PLA',
  'PETG',
  'PCTG',
  'PET',
  'ABS',
  'ASA',
  'TPU',
  'TPE',
  'HIPS',
  'NYLON',
  'PVA',
  'PC',
  'PA',
  'PP',
];

/** Net weights spools come in. Anything else is a handwritten gross weight or noise. */
const SPOOL_GRAMS = new Set([250, 500, 750, 800, 1000, 2000, 3000, 5000]);

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const MATERIAL_PATTERNS = MATERIALS.map((m) => ({
  material: m,
  pattern: new RegExp(
    `(^|[^A-Z])${escape(m).replace(/ |-/g, '[ -]?')}(?=[^A-Z+]|$)`
  ),
}));

interface Range {
  min: number;
  max: number;
  context: string;
}

/**
 * Reads the material, net weight, diameter and temperature ranges from a label's OCR text. A
 * field the text does not clearly give is left out rather than guessed: a blank field costs the
 * user a few keystrokes, a wrong one is easy to miss.
 */
export function extractLabelFields(text: string): LabelFields {
  const upper = text.toUpperCase().replace(/℃/g, '°C');
  const fields: LabelFields = {};

  const material = MATERIAL_PATTERNS.find((m) => m.pattern.test(upper));
  if (material) fields.materialType = material.material;

  const weightG = netWeight(upper);
  if (weightG) fields.weightG = weightG;

  // OCR mangles the Ø in front ("91.75mm") and drops the decimal point ("1 75mm").
  const diameter = upper.match(/(1[ .,]75|2[ .,]85|3[.,]00?)\s*MM/);
  if (diameter)
    fields.diameterMm = parseFloat(diameter[1].replace(/[ ,]/, '.'));

  const ranges = temperatureRanges(upper);
  // Labels with speed-dependent temperatures list several nozzle ranges; report the span.
  const nozzles = ranges.filter((r) => !isBed(r) && r.min >= 150);
  if (nozzles.length > 0) {
    fields.hotendMinC = Math.min(...nozzles.map((r) => r.min));
    fields.hotendMaxC = Math.max(...nozzles.map((r) => r.max));
  }
  const bed = ranges.find((r) => isBed(r) && r.max <= 130);
  if (bed) {
    fields.bedMinC = bed.min;
    fields.bedMaxC = bed.max;
  }

  return fields;
}

/**
 * The net weight in grams. A weight on a "Net weight" line wins; otherwise a bare weight counts
 * only when it is the one spool size on the label, because labels also print charts of how much
 * filament is left at 800g, 600g, 400g... and one of those is not the spool.
 */
function netWeight(upper: string): number | undefined {
  // OCR reads the 1 in "Net Weight: 1kg" as T, I or l.
  const text = upper.replace(
    /((?:NET|WEIGHT)\W{0,3})[TIL|](?=\s*KG\b)/g,
    '$11'
  );
  const labeled: number[] = [];
  // Every bare weight, spool size or not: a chart's 200g makes its 800g ambiguous too.
  const bare = new Set<number>();
  for (const line of text.split('\n')) {
    for (const m of line.matchAll(/(\d+(?:[.,]\d+)?)\s*(KG|G)\b/g)) {
      const grams = Math.round(
        parseFloat(m[1].replace(',', '.')) * (m[2] === 'KG' ? 1000 : 1)
      );
      if (/NET|N\.\s?W|WEIGHT|净重/.test(line.slice(0, m.index))) {
        if (SPOOL_GRAMS.has(grams)) labeled.push(grams);
      } else if (!line.includes('%')) {
        bare.add(grams);
      }
    }
  }
  if (labeled.length > 0) return labeled[0];
  const [only] = bare;
  return bare.size === 1 && SPOOL_GRAMS.has(only) ? only : undefined;
}

/**
 * "190-220°C", "190°C-220°C", "190~220" and "200±10". Each range's context is the text before it
 * on its line, or the line above when nothing precedes it, so a "Bed Temp" heading never claims
 * the print speed printed on the next line. Speeds and flow rates are not temperatures.
 */
function temperatureRanges(upper: string): Range[] {
  const ranges: Range[] = [];
  const lines = upper.split('\n');
  lines.forEach((line, i) => {
    const contextOf = (index: number) => {
      const before = line.slice(0, index);
      if (/[A-Z]{2}/.test(before)) return before;
      // OCR puts blank lines between a heading and its value.
      const above = lines
        .slice(0, i)
        .reverse()
        .find((l) => l.trim());
      return `${above ?? ''} ${before}`;
    };
    for (const m of line.matchAll(
      /(\d{2,3})\s*°?\s*C?\s*[-~–—]\s*(\d{2,3})\s*°?\s*C?/g
    )) {
      const min = +m[1];
      const max = +m[2];
      const after = line.slice(m.index + m[0].length);
      const before = line.slice(0, m.index);
      if (
        /^\s*(%|MM)/.test(after) ||
        /(SPE+[DT]?|FLOW\w*|RATE)\W*$/.test(before)
      ) {
        continue;
      }
      if (min < max && max - min <= 80 && min >= 20 && max <= 320) {
        ranges.push({ min, max, context: contextOf(m.index) });
      }
    }
    for (const m of line.matchAll(/(\d{2,3})\s*°?\s*C?\s*±\s*(\d{1,2})/g)) {
      ranges.push({
        min: +m[1] - +m[2],
        max: +m[1] + +m[2],
        context: contextOf(m.index),
      });
    }
  });
  return ranges;
}

function isBed(r: Range): boolean {
  return (
    /BED|PLATE|PLATFORM|热床/.test(r.context) ||
    (r.max <= 120 && !/NOZZLE|PRINT|EXTRU|HOTEND/.test(r.context))
  );
}
