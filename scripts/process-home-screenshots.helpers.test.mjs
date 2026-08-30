import assert from 'node:assert';
import test from 'node:test';
import {
  contentHash,
  replaceImgRefExactlyOnce,
} from './process-home-screenshots.helpers.mjs';

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
    replaceImgRefExactlyOnce(IMG('Other', 'abc', 1, 1), 'Homepage_PrinterList', {
      src: '/x.webp',
      width: 1,
      height: 1,
    })
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
