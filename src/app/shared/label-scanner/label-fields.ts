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

  for (const m of upper.matchAll(/(\d+(?:[.,]\d+)?)\s*(KG|G)\b/g)) {
    const grams = Math.round(
      parseFloat(m[1].replace(',', '.')) * (m[2] === 'KG' ? 1000 : 1)
    );
    if (SPOOL_GRAMS.has(grams)) {
      fields.weightG = grams;
      break;
    }
  }

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

/** "190-220°C", "190°C-220°C", "190~220" and "200±10", each with the line above for context. */
function temperatureRanges(upper: string): Range[] {
  const ranges: Range[] = [];
  const lines = upper.split('\n');
  lines.forEach((line, i) => {
    const context = `${lines[i - 1] ?? ''} ${line}`;
    for (const m of line.matchAll(
      /(\d{2,3})\s*°?\s*C?\s*[-~–—]\s*(\d{2,3})\s*°?\s*C?/g
    )) {
      const min = +m[1];
      const max = +m[2];
      if (min < max && max - min <= 80 && min >= 20 && max <= 320) {
        ranges.push({ min, max, context });
      }
    }
    for (const m of line.matchAll(/(\d{2,3})\s*°?\s*C?\s*±\s*(\d{1,2})/g)) {
      ranges.push({ min: +m[1] - +m[2], max: +m[1] + +m[2], context: line });
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
