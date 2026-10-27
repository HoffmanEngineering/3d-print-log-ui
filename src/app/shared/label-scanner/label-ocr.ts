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
  recognize(image: HTMLCanvasElement): Promise<{
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
 * A user lines the label up in a guide box, but only roughly, and the feasibility test showed a
 * 15° tilt is enough to lose most of the text. So each photo is read at a few angles.
 */
const ANGLES = [0, -8, 8, -15, 15];

/** A pass with this many confident words read the label well; skip the other angles. */
const GOOD_ENOUGH_WORDS = 12;

const loadTesseract = async (): Promise<OcrEngine> =>
  (await import('tesseract.js')) as unknown as OcrEngine;

/**
 * On-device OCR for spool labels. Tesseract and its English model (about 6 MB in all) load on
 * the first photo, not with the page, and are cached by the browser afterwards.
 */
export function createLabelOcr(
  deps: {
    loader?: () => Promise<OcrEngine>;
    rotate?: (canvas: HTMLCanvasElement, degrees: number) => HTMLCanvasElement;
  } = {}
): LabelOcr {
  const loader = deps.loader ?? loadTesseract;
  const rotate = deps.rotate ?? rotateCanvas;
  let worker: Promise<OcrWorker> | null = null;

  const getWorker = () =>
    (worker ??= loader()
      .then((engine) =>
        engine.createWorker('eng', 1, {
          workerPath: `${ASSETS}/worker.min.js`,
          corePath: ASSETS,
          langPath: ASSETS,
          workerBlobURL: false,
        })
      )
      .catch((err: unknown) => {
        worker = null; // A later photo may find the network back.
        throw err;
      }));

  return {
    async recognize(canvas) {
      const started = performance.now();
      const tesseract = await getWorker();
      const prepared = prepare(canvas);
      let best: { text: string; words: number } | null = null;
      for (const angle of ANGLES) {
        const { data } = await tesseract.recognize(rotate(prepared, angle));
        const words = (data.words ?? []).filter(
          (w) => w.confidence > 70 && /[A-Za-z0-9]{2,}/.test(w.text)
        ).length;
        if (!best || words > best.words) best = { text: data.text, words };
        if (words >= GOOD_ENOUGH_WORDS) break;
      }
      const text = best?.text ?? '';
      return {
        text,
        fields: extractLabelFields(text),
        ms: Math.round(performance.now() - started),
        words: best?.words ?? 0,
      };
    },
    async terminate() {
      const pending = worker;
      worker = null;
      if (pending) await (await pending).terminate();
    },
  };
}

/** Grayscale with the contrast stretched to the full range, which helps on glossy labels. */
function prepare(source: HTMLCanvasElement): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = source.width;
  canvas.height = source.height;
  const ctx = canvas.getContext('2d');
  if (!ctx || canvas.width === 0 || canvas.height === 0) return source;
  ctx.drawImage(source, 0, 0);
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
  const ctx = canvas.getContext('2d');
  if (!ctx) return source;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(radians);
  ctx.drawImage(source, -source.width / 2, -source.height / 2);
  return canvas;
}
