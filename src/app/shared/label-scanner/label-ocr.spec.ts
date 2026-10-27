import { createLabelOcr, OcrEngine } from './label-ocr';

interface Pass {
  text: string;
  confident: number;
}

/** A fake Tesseract whose nth recognize() answers with passes[n]. */
function fakeEngine(passes: Pass[]) {
  const worker = {
    recognize: jasmine.createSpy('recognize').and.callFake(async () => {
      const pass = passes[worker.recognize.calls.count() - 1] ?? {
        text: '',
        confident: 0,
      };
      return {
        data: {
          text: pass.text,
          words: Array.from({ length: pass.confident }, () => ({
            text: 'word',
            confidence: 90,
          })).concat([{ text: 'noise', confidence: 10 }]),
        },
      };
    }),
    terminate: jasmine.createSpy('terminate').and.resolveTo(undefined),
  };
  const createWorker = jasmine.createSpy('createWorker').and.resolveTo(worker);
  const engine = { createWorker } as unknown as OcrEngine;
  return { engine, worker, createWorker };
}

describe('createLabelOcr', () => {
  const canvas = () => {
    const c = document.createElement('canvas');
    c.width = 40;
    c.height = 20;
    return c;
  };

  it('tries 0, -8, 8, -15 and 15 degrees when no pass is clearly good', async () => {
    const { engine } = fakeEngine([]);
    const rotate = jasmine
      .createSpy('rotate')
      .and.callFake((c: HTMLCanvasElement) => c);
    const ocr = createLabelOcr({ loader: async () => engine, rotate });

    await ocr.recognize(canvas());

    expect(rotate.calls.allArgs().map((a) => a[1])).toEqual([
      0, -8, 8, -15, 15,
    ]);
  });

  it('stops early once a pass reads 12 confident words', async () => {
    const { engine, worker } = fakeEngine([
      { text: 'a', confident: 3 },
      { text: 'b', confident: 12 },
    ]);
    const ocr = createLabelOcr({ loader: async () => engine });

    const result = await ocr.recognize(canvas());

    expect(worker.recognize).toHaveBeenCalledTimes(2);
    expect(result.text).toBe('b');
    expect(result.words).toBe(12);
  });

  it('keeps the pass with the most confident words', async () => {
    const { engine } = fakeEngine([
      { text: 'few', confident: 2 },
      { text: 'Nozzle Temp: 200 - 220 °C PLA', confident: 8 },
      { text: 'some', confident: 5 },
    ]);
    const ocr = createLabelOcr({ loader: async () => engine });

    const result = await ocr.recognize(canvas());

    expect(result.text).toBe('Nozzle Temp: 200 - 220 °C PLA');
    expect(result.fields).toEqual(
      jasmine.objectContaining({
        materialType: 'PLA',
        hotendMinC: 200,
        hotendMaxC: 220,
      })
    );
    expect(result.ms).toBeGreaterThanOrEqual(0);
  });

  it('creates the worker once, from self-hosted assets, and terminates it once', async () => {
    const { engine, worker, createWorker } = fakeEngine([
      { text: 'x', confident: 12 },
      { text: 'y', confident: 12 },
    ]);
    const ocr = createLabelOcr({ loader: async () => engine });

    await ocr.recognize(canvas());
    await ocr.recognize(canvas());
    await ocr.terminate();
    await ocr.terminate();

    expect(createWorker).toHaveBeenCalledTimes(1);
    const options = createWorker.calls.first().args[2];
    expect(options.workerPath).toContain('/assets/tesseract');
    expect(options.corePath).toContain('/assets/tesseract');
    expect(options.langPath).toContain('/assets/tesseract');
    expect(options.workerBlobURL).toBeFalse();
    expect(worker.terminate).toHaveBeenCalledTimes(1);
  });

  it('rejects when the engine cannot load', async () => {
    const ocr = createLabelOcr({
      loader: () => Promise.reject(new Error('offline')),
    });

    await expectAsync(ocr.recognize(canvas())).toBeRejectedWithError('offline');
  });
});
