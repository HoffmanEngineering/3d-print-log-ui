import { extractLabelFields, LabelFields } from './label-fields';

export interface LabelOcrResult {
  text: string;
  fields: LabelFields;
  ms: number;
  /** Confident words in the kept pass: a rough measure of how well the label read. */
  words: number;
}

export interface LabelOcr {
  recognize(canvas: HTMLCanvasElement): Promise<LabelOcrResult>;
  terminate(): Promise<void>;
}

interface OcrWord {
  text: string;
  confidence: number;
}

interface OcrWorker {
  recognize(image: Uint8Array): Promise<{
    data: { text: string; words?: OcrWord[] };
  }>;
  terminate(): Promise<unknown>;
}

/** The slice of tesseract.js this uses, so a test can stand in for it. */
export interface OcrEngine {
  createWorker(
    lang: string,
    oem: number,
    options: Record<string, unknown>
  ): Promise<OcrWorker>;
}

/** Served from the app itself (angular.json copies them), never a CDN. */
const ASSETS = '/assets/tesseract';

/**
 * tessdata_fast's English model (github.com/tesseract-ocr/tessdata_fast, Apache-2.0), committed
 * because npm only ships best_int. On a Pixel 7 it read a spool label in 4.7 s a pass, against
 * 8.3 s for best_int, and read more of it. Its own cache key, so a cached best_int is not reused.
 */
const LANG_PATH = '/assets/tesseract-fast';
const LANG_CACHE = 'tessdata-fast';

/**
 * Spool labels are often printed vertically, so a user turns the phone to fit one in the box.
 * When the straight pass reads fewer confident words than this, the quarter turns are tried.
 */
const FEW_WORDS = 3;
const TURNS = [90, 270];

/**
 * A user lines the label up in a guide box, but only roughly, and the feasibility test showed a
 * 15° tilt is enough to lose most of the text. So the best orientation is also read at a few
 * tilts, but only once it has read something: tilting a photo with no text costs four passes.
 */
const TILTS = [-8, 8, -15, 15];

/** A pass with this many confident words read the label well; skip the other angles. */
const GOOD_ENOUGH_WORDS = 12;

/**
 * A pass is not started when, at the last pass's pace, it would end later than this after the
 * shutter. A pass took 8 s with the best_int model on a Pixel 7, and seven of them was a minute.
 */
const TIME_BUDGET_MS = 10_000;

/** How much the photo is enlarged before OCR, and the long side it never grows past. */
const UPSCALE = 2;
const MAX_SIDE = 2000;

const loadTesseract = async (): Promise<OcrEngine> =>
  (await import('tesseract.js')) as unknown as OcrEngine;

/**
 * On-device OCR for spool labels. Tesseract and its English model (about 5 MB in all) load on
 * the first photo, not with the page, and are cached by the browser afterwards.
 */
export function createLabelOcr(
  deps: {
    loader?: () => Promise<OcrEngine>;
    rotate?: (canvas: HTMLCanvasElement, degrees: number) => HTMLCanvasElement;
    now?: () => number;
  } = {}
): LabelOcr {
  const loader = deps.loader ?? loadTesseract;
  const rotate = deps.rotate ?? rotateCanvas;
  const now = deps.now ?? (() => performance.now());
  let worker: Promise<OcrWorker> | null = null;

  const getWorker = () =>
    (worker ??= loader()
      .then((engine) =>
        engine.createWorker('eng', 1, {
          workerPath: `${ASSETS}/worker.min.js`,
          corePath: ASSETS,
          langPath: LANG_PATH,
          cachePath: LANG_CACHE,
          workerBlobURL: false,
        })
      )
      .catch((err: unknown) => {
        worker = null; // A later photo may find the network back.
        throw err;
      }));

  return {
    async recognize(canvas) {
      const started = now();
      const tesseract = await getWorker();
      const prepared = prepare(canvas);
      let best = { text: '', words: 0, angle: 0 };
      let lastPassMs = 0;
      /** Reads the photo turned by `angle`; true once a pass is good enough, or no time is left. */
      const pass = async (angle: number) => {
        if (lastPassMs && now() + lastPassMs - started > TIME_BUDGET_MS) {
          return true;
        }
        const passStarted = now();
        const { data } = await tesseract.recognize(
          toPgm(rotate(prepared, angle))
        );
        lastPassMs = now() - passStarted;
        const words = (data.words ?? []).filter(
          (w) => w.confidence > 70 && /[A-Za-z0-9]{2,}/.test(w.text)
        ).length;
        if (angle === 0 || words > best.words) {
          best = { text: data.text, words, angle };
        }
        return words >= GOOD_ENOUGH_WORDS;
      };
      const read = async () => {
        if (await pass(0)) return;
        if (best.words < FEW_WORDS) {
          for (const turn of TURNS) if (await pass(turn)) return;
        }
        if (best.words === 0) return;
        const base = best.angle;
        for (const tilt of TILTS) if (await pass(base + tilt)) return;
      };
      await read();
      const text = best.text;
      return {
        text,
        fields: extractLabelFields(text),
        ms: Math.round(now() - started),
        words: best.words,
      };
    },
    async terminate() {
      const pending = worker;
      worker = null;
      if (pending) await (await pending).terminate();
    },
  };
}

/**
 * Twice the size, up to MAX_SIDE, then grayscale with the contrast stretched to the full range
 * (which helps on glossy labels). A label's print is 12-15 px tall in a 1080p guide box, and
 * Tesseract reads best at about 30.
 */
function prepare(source: HTMLCanvasElement): HTMLCanvasElement {
  const scale = Math.min(
    UPSCALE,
    MAX_SIDE / Math.max(source.width, source.height, 1)
  );
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(source.width * scale);
  canvas.height = Math.round(source.height * scale);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx || canvas.width === 0 || canvas.height === 0) return source;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const px = image.data;
  let lo = 255;
  let hi = 0;
  for (let i = 0; i < px.length; i += 4) {
    const y = Math.round(0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]);
    px[i] = y;
    lo = Math.min(lo, y);
    hi = Math.max(hi, y);
  }
  const span = Math.max(1, hi - lo);
  for (let i = 0; i < px.length; i += 4) {
    const v = Math.round(((px[i] - lo) * 255) / span);
    px[i] = px[i + 1] = px[i + 2] = v;
  }
  ctx.putImageData(image, 0, 0);
  return canvas;
}

/**
 * The canvas as a binary PGM, from its red channel (the photo is grayscale by then). Given a
 * canvas, tesseract.js PNG-encodes it with toBlob, which took 4 s on a Pixel 7; Leptonica reads
 * PGM natively, and writing one takes milliseconds.
 */
function toPgm(canvas: HTMLCanvasElement): Uint8Array {
  const { width, height } = canvas;
  const header = new TextEncoder().encode(`P5\n${width} ${height}\n255\n`);
  const out = new Uint8Array(header.length + width * height);
  out.set(header);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx || width === 0 || height === 0) return out;
  const px = ctx.getImageData(0, 0, width, height).data;
  for (let i = 0, o = header.length; i < px.length; i += 4, o++) {
    out[o] = px[i];
  }
  return out;
}

/** The canvas turned by `degrees` (clockwise) on a white background, grown to fit. */
function rotateCanvas(
  source: HTMLCanvasElement,
  degrees: number
): HTMLCanvasElement {
  if (degrees === 0) return source;
  const radians = (degrees * Math.PI) / 180;
  const sin = Math.abs(Math.sin(radians));
  const cos = Math.abs(Math.cos(radians));
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(source.width * cos + source.height * sin);
  canvas.height = Math.ceil(source.width * sin + source.height * cos);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return source;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(radians);
  ctx.drawImage(source, -source.width / 2, -source.height / 2);
  return canvas;
}
