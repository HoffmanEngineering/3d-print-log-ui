import assert from 'node:assert';
import test from 'node:test';
import {
  captureAssetProblems,
  contentHash,
  deviceScale,
  docCapturesIndex,
  MIN_DEVICE_SCALE,
  pairSidecar,
  replaceImgRefExactlyOnce,
} from './process-captures.lib.mjs';

const IMG = (base, token, w, h) =>
  `<img\n  class="fade-in home-feature-img"\n  ngSrc="/assets/${base}_${token}.webp"\n  width="${w}"\n  height="${h}"\n  alt="x"\n  loading="lazy"\n/>`;

test('contentHash is stable and short', () => {
  const a = contentHash(Buffer.from('hello'));
  const b = contentHash(Buffer.from('hello'));
  assert.equal(a, b);
  assert.match(a, /^[a-f0-9]{12}$/);
});

test('replaceImgRefExactlyOnce swaps ngSrc + width + height for the one matching img', () => {
  // Light + dark tags present; the light base must not touch the dark tag.
  const html =
    IMG('Homepage_PrinterList', 'OLD', 500, 560) +
    '\n' +
    IMG('Homepage_PrinterList_dark', 'placeholder', 500, 560);
  const out = replaceImgRefExactlyOnce(html, 'Homepage_PrinterList', {
    src: '/assets/Homepage_PrinterList_abc123abc123.webp',
    width: 1304,
    height: 1460,
  });
  assert.match(out, /Homepage_PrinterList_abc123abc123\.webp/);
  assert.match(out, /width="1304"/);
  assert.match(out, /height="1460"/);
  // Dark tag untouched.
  assert.match(out, /Homepage_PrinterList_dark_placeholder\.webp/);
  assert.match(out, /width="500"/);
});

test('replaceImgRefExactlyOnce targets the dark base without matching the light tag', () => {
  const html =
    IMG('Homepage_PrinterList', 'OLD', 500, 560) +
    '\n' +
    IMG('Homepage_PrinterList_dark', 'placeholder', 500, 560);
  const out = replaceImgRefExactlyOnce(html, 'Homepage_PrinterList_dark', {
    src: '/assets/Homepage_PrinterList_dark_def456def456.webp',
    width: 1304,
    height: 1460,
  });
  assert.match(out, /Homepage_PrinterList_dark_def456def456\.webp/);
  assert.match(out, /Homepage_PrinterList_OLD\.webp/); // light untouched
});

test('replaceImgRefExactlyOnce throws when the base is missing', () => {
  assert.throws(() =>
    replaceImgRefExactlyOnce(
      IMG('Other', 'abc', 1, 1),
      'Homepage_PrinterList',
      {
        src: '/x.webp',
        width: 1,
        height: 1,
      }
    )
  );
});

test('replaceImgRefExactlyOnce throws when the base matches more than once', () => {
  const html =
    IMG('Homepage_PrinterList', 'a', 1, 1) +
    IMG('Homepage_PrinterList', 'b', 1, 1);
  assert.throws(() =>
    replaceImgRefExactlyOnce(html, 'Homepage_PrinterList', {
      src: '/x.webp',
      width: 1,
      height: 1,
    })
  );
});

// --- device scale ------------------------------------------------------------

test('deviceScale is the ratio of captured pixels to CSS pixels', () => {
  assert.equal(deviceScale(2560, 1280), 2);
  assert.equal(deviceScale(1280, 1280), 1);
});

test('deviceScale refuses a CSS width the capture run never recorded', () => {
  assert.throws(() => deviceScale(2560, 0), /must be positive/);
  assert.throws(() => deviceScale(2560, undefined), /must be positive/);
});

test('MIN_DEVICE_SCALE rejects a 1x capture of a wide element', () => {
  // The floor this replaced was on the PNG width, so it could only be tuned to
  // the narrowest target: a 1x capture of a 1280px-wide desktop figure produced
  // a 1280px PNG and sailed over a 1000px floor.
  assert.ok(deviceScale(1280, 1280) < MIN_DEVICE_SCALE);
  assert.ok(deviceScale(2560, 1280) >= MIN_DEVICE_SCALE);
});

// --- sidecar -----------------------------------------------------------------

const SIDECAR = {
  set: 'docs',
  expected: [
    { name: 'print-list', theme: 'light', outputBase: 'Doc_print-list' },
    { name: 'print-list', theme: 'dark', outputBase: 'Doc_print-list_dark' },
  ],
  results: [
    { outputBase: 'Doc_print-list', cssWidth: 1280 },
    { outputBase: 'Doc_print-list_dark', cssWidth: 1280 },
  ],
};

test('pairSidecar joins each expectation with its recorded width', () => {
  assert.deepEqual(pairSidecar(SIDECAR), [
    {
      name: 'print-list',
      theme: 'light',
      outputBase: 'Doc_print-list',
      cssWidth: 1280,
    },
    {
      name: 'print-list',
      theme: 'dark',
      outputBase: 'Doc_print-list_dark',
      cssWidth: 1280,
    },
  ]);
});

test('pairSidecar refuses a run that did not finish', () => {
  // The PNGs on disk would be a mix of this run and the last one, and the old
  // pipeline would have processed the mix without a word.
  assert.throws(
    () => pairSidecar({ ...SIDECAR, results: SIDECAR.results.slice(0, 1) }),
    /No capture was recorded for Doc_print-list_dark/
  );
});

test('pairSidecar refuses a malformed sidecar', () => {
  assert.throws(() => pairSidecar({}), /malformed/);
  assert.throws(() => pairSidecar(undefined), /malformed/);
});

// --- doc capture index -------------------------------------------------------

const staged = (name, theme) => ({
  name,
  theme,
  publicPath: `/assets/docs/captures/${name}${theme === 'dark' ? '_dark' : ''}_h.webp`,
  width: 8,
  height: 6,
});

test('docCapturesIndex pairs the themes and sorts by name', () => {
  const index = docCapturesIndex([
    staged('print-list-table', 'dark'),
    staged('print-list', 'light'),
    staged('print-list-table', 'light'),
    staged('print-list', 'dark'),
  ]);

  assert.deepEqual(Object.keys(index), ['print-list', 'print-list-table']);
  assert.deepEqual(index['print-list'].dark, {
    src: '/assets/docs/captures/print-list_dark_h.webp',
    width: 8,
    height: 6,
  });
});

test('docCapturesIndex refuses a figure with only one theme', () => {
  // The other theme would render an empty img, which a reader would read as a
  // broken page rather than report as a bug.
  assert.throws(
    () => docCapturesIndex([staged('print-list', 'light')]),
    /has no dark capture/
  );
});

// --- published assets --------------------------------------------------------

const BYTES = Buffer.from('an image');
const HASH = contentHash(BYTES);
const withHash = (name, theme) =>
  `/assets/docs/captures/${name}${theme === 'dark' ? '_dark' : ''}_${HASH}.webp`;

const PUBLISHED = {
  'print-list': {
    light: { src: withHash('print-list', 'light'), width: 8, height: 6 },
    dark: { src: withHash('print-list', 'dark'), width: 8, height: 6 },
  },
};

test('captureAssetProblems passes when every file matches its hash', () => {
  assert.deepEqual(
    captureAssetProblems(PUBLISHED, () => BYTES),
    []
  );
});

test('captureAssetProblems reports an asset that is not on disk', () => {
  // The map and the assets are committed together and then separated by a
  // rebase or a partial add. Nothing downstream resolves a runtime src, so the
  // first symptom would be a broken image on a published page.
  const [message] = captureAssetProblems(PUBLISHED, (src) =>
    src.includes('_dark') ? null : BYTES
  );
  assert.match(message, /\(dark\) points at .*which does not exist/);
});

test('captureAssetProblems reports an asset whose content no longer matches', () => {
  const [message] = captureAssetProblems(PUBLISHED, () =>
    Buffer.from('a different image')
  );
  assert.match(message, /hashes to [a-f0-9]{12}/);
});
