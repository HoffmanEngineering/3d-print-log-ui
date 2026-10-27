import { createLabelOcr, OcrEngine } from './label-ocr';

interface Pass {
  text: string;
  confident: number;
}

/** A fake Tesseract whose nth recognize() answers with passes[n]; `onPass` runs for each. */
function fakeEngine(passes: Pass[], onPass: () => void = () => undefined) {
  const worker = {
    recognize: jasmine.createSpy('recognize').and.callFake(async () => {
      onPass();
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

  const angles = async (passes: Pass[]) => {
    const { engine } = fakeEngine(passes);
    const rotate = jasmine
      .createSpy('rotate')
      .and.callFake((c: HTMLCanvasElement) => c);
    const ocr = createLabelOcr({ loader: async () => engine, rotate });
    await ocr.recognize(canvas());
    return rotate.calls.allArgs().map((a) => a[1]);
  };

  it('tilts a straight label that read some text: 0, -8, 8, -15 and 15 degrees', async () => {
    expect(await angles([{ text: 'a', confident: 3 }])).toEqual([
      0, -8, 8, -15, 15,
    ]);
  });

  it('turns a label that read almost nothing straight, then tilts the better turn', async () => {
    // Sideways: 0 reads 1 word, 90 reads 5, 270 reads none.
    expect(
      await angles([
        { text: 'a', confident: 1 },
        { text: 'b', confident: 5 },
        { text: 'c', confident: 0 },
      ])
    ).toEqual([0, 90, 270, 82, 98, 75, 105]);
  });

  it('gives up after the turns when no orientation reads anything', async () => {
    expect(await angles([])).toEqual([0, 90, 270]);
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

  describe('time budget', () => {
    /** A fake clock that each recognize() pass advances by `passMs`. */
    async function anglesWithPasses(passMs: number, passes: Pass[]) {
      let clock = 0;
      const { engine } = fakeEngine(passes, () => (clock += passMs));
      const rotate = jasmine
        .createSpy('rotate')
        .and.callFake((c: HTMLCanvasElement) => c);
      const ocr = createLabelOcr({
        loader: async () => engine,
        rotate,
        now: () => clock,
      });
      await ocr.recognize(canvas());
      return rotate.calls.allArgs().map((a) => a[1]);
    }

    it('does not start a pass that would end past 10 seconds', async () => {
      // 8 s a pass, as best_int took on a Pixel 7: a second pass would end at 16 s.
      expect(await anglesWithPasses(8_000, [])).toEqual([0]);
    });

    it('fits both quarter turns when passes are quick', async () => {
      expect(await anglesWithPasses(2_000, [])).toEqual([0, 90, 270]);
    });

    it('stops tilting once the budget is spent', async () => {
      // 3 s a pass: 0, then -8 and 8 end at 9 s; -15 would end at 12 s.
      expect(
        await anglesWithPasses(3_000, [{ text: 'a', confident: 4 }])
      ).toEqual([0, -8, 8]);
    });
  });

  it('reads the photo at twice its size, up to 2000 pixels on the long side', async () => {
    const sizes = async (width: number, height: number) => {
      const { engine } = fakeEngine([{ text: 'x', confident: 12 }]);
      const rotate = jasmine
        .createSpy('rotate')
        .and.callFake((c: HTMLCanvasElement) => c);
      const ocr = createLabelOcr({ loader: async () => engine, rotate });
      const c = document.createElement('canvas');
      c.width = width;
      c.height = height;
      await ocr.recognize(c);
      const read = rotate.calls.first().args[0] as HTMLCanvasElement;
      return [read.width, read.height];
    };

    // A spool label's print is 12-15 px tall in a 1080p guide box; Tesseract wants about 30.
    expect(await sizes(918, 612)).toEqual([1836, 1224]);
    expect(await sizes(1500, 1000)).toEqual([2000, 1333]);
  });

  it('hands Tesseract a grayscale PGM, never a canvas it would PNG-encode', async () => {
    // tesseract.js turns a canvas into a PNG with toBlob, which took 4 s a pass on a Pixel 7.
    const { engine, worker } = fakeEngine([{ text: 'x', confident: 12 }]);
    const ocr = createLabelOcr({ loader: async () => engine });

    await ocr.recognize(canvas());

    const image = worker.recognize.calls.first().args[0] as Uint8Array;
    expect(image instanceof Uint8Array).toBeTrue();
    // The 40x20 photo, enlarged twice.
    const header = 'P5\n80 40\n255\n';
    expect(new TextDecoder().decode(image.slice(0, header.length))).toBe(
      header
    );
    expect(image.length).toBe(header.length + 80 * 40);
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
