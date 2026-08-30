// Pure helpers for scripts/process-captures.mjs. Everything here is testable
// without sharp, a browser, or a filesystem.

import { createHash } from 'node:crypto';

/**
 * The device-scale-factor a capture was actually taken at.
 *
 * This replaces a floor on the PNG width, which could only ever be tuned to the
 * NARROWEST target in a set: a 1x capture of a 1280px-wide desktop figure sailed
 * over a 1000px floor and published at half resolution, which is precisely the
 * defect this pipeline exists to prevent. The ratio is exact for any element,
 * so one threshold covers every target forever.
 */
export function deviceScale(pngWidth, cssWidth) {
  if (!(cssWidth > 0)) {
    throw new Error(`Recorded CSS width must be positive, got ${cssWidth}`);
  }
  return pngWidth / cssWidth;
}

/** Below this, a capture is a 1x screenshot wearing a 2x pipeline's clothes. */
export const MIN_DEVICE_SCALE = 1.5;

/**
 * Pairs each expected capture with the CSS width the run recorded for it.
 *
 * A run that died halfway leaves expectations with no result. Reporting that as
 * an error is the point: the PNGs on disk would be a mix of this run and the
 * last one, and processing them would publish the mix without a word.
 *
 * @param {{ set: string, expected: object[], results: object[] }} sidecar
 * @returns {{ name: string, theme: string, outputBase: string, cssWidth: number }[]}
 */
export function pairSidecar(sidecar) {
  const { expected, results } = sidecar ?? {};
  if (!Array.isArray(expected) || !Array.isArray(results)) {
    throw new Error(
      'Capture sidecar is malformed; re-run the capture step to regenerate it.'
    );
  }
  const byBase = new Map(results.map((r) => [r.outputBase, r]));

  return expected.map((entry) => {
    const result = byBase.get(entry.outputBase);
    if (!result) {
      throw new Error(
        `No capture was recorded for ${entry.outputBase}. The capture run did ` +
          `not finish, so the PNGs on disk are a mix of runs — re-run the ` +
          `capture step before processing.`
      );
    }
    return { ...entry, cssWidth: result.cssWidth };
  });
}

/**
 * `name -> { light, dark }` for the generated doc-figure map, sorted by name so
 * the checked-in JSON has a stable diff.
 *
 * Both themes are required. A figure with only one would render an empty img in
 * the other theme, which no reader would report as a bug — they would just see
 * a broken page and assume it was theirs.
 */
export function docCapturesIndex(staged) {
  const byName = new Map();
  for (const item of staged) {
    const entry = byName.get(item.name) ?? {};
    entry[item.theme] = {
      src: item.publicPath,
      width: item.width,
      height: item.height,
    };
    byName.set(item.name, entry);
  }

  const index = {};
  for (const name of [...byName.keys()].sort()) {
    const entry = byName.get(name);
    for (const theme of ['light', 'dark']) {
      if (!entry[theme]) {
        throw new Error(`Doc figure "${name}" has no ${theme} capture.`);
      }
    }
    index[name] = entry;
  }
  return index;
}

/**
 * Checks every published figure against the bytes actually on disk.
 *
 * The map and the assets are written together and committed together, so they
 * agree at birth — and then a rebase, a partial `git add`, or an LFS-less clone
 * separates them, and NOTHING downstream notices: `docs:generate` reads the map,
 * `validate-docs` reads the map, the Angular build never resolves a runtime
 * `src`. The first symptom is a broken image on a published page.
 *
 * Verifying the hash rather than mere existence costs one read of a ~70KB file
 * and subsumes the dimension check for free: the filename carries the content
 * hash, so a file that hashes correctly IS the file whose width and height were
 * recorded.
 *
 * @param {Record<string, {light: object, dark: object}>} captures
 * @param {(publicPath: string) => Buffer|null} readAsset null when absent
 * @returns {string[]} one message per problem
 */
export function captureAssetProblems(captures, readAsset) {
  const problems = [];

  for (const [name, entry] of Object.entries(captures)) {
    for (const theme of ['light', 'dark']) {
      const image = entry?.[theme];
      if (!image?.src) {
        problems.push(`figure "${name}" has no ${theme} src.`);
        continue;
      }

      const bytes = readAsset(image.src);
      if (!bytes) {
        problems.push(
          `figure "${name}" (${theme}) points at ${image.src}, which does not exist. Re-run \`npm run capture:docs:all\`.`
        );
        continue;
      }

      const expected = /_([A-Za-z0-9]+)\.webp$/.exec(image.src)?.[1];
      const actual = contentHash(bytes);
      if (expected !== actual) {
        problems.push(
          `figure "${name}" (${theme}) is ${image.src}, but that file hashes to ${actual}. The asset and the map are out of step — re-run \`npm run capture:docs:all\`.`
        );
      }
    }
  }

  return problems;
}

export function contentHash(buffer) {
  return createHash('sha256').update(buffer).digest('hex').slice(0, 12);
}

// Base regex fragment for an asset token: hex hash or 'placeholder'. Underscore
// is excluded so 'Homepage_PrinterList' does NOT match 'Homepage_PrinterList_dark_*'.
const TOKEN = '[A-Za-z0-9]+';

// Find the single <img> whose ngSrc references `/assets/<base>_<token>.webp`
// and replace its ngSrc, width, and height. Throws unless there is EXACTLY ONE
// such <img>, and unless that <img> has exactly one width and one height —
// so a missed dimension can never silently no-op. `[^>]` matches newlines, so
// multi-line <img> tags are handled.
export function replaceImgRefExactlyOnce(html, base, { src, width, height }) {
  const tagRe = new RegExp(
    `<img\\b[^>]*ngSrc="/assets/${base}_${TOKEN}\\.webp"[^>]*>`,
    'g'
  );
  const tags = html.match(tagRe) ?? [];
  if (tags.length !== 1) {
    throw new Error(
      `Expected exactly one <img> for ${base}, found ${tags.length}`
    );
  }
  const tag = tags[0];
  let newTag = tag.replace(
    new RegExp(`ngSrc="/assets/${base}_${TOKEN}\\.webp"`),
    `ngSrc="${src}"`
  );
  newTag = replaceAttrExactlyOnce(newTag, 'width', width, base);
  newTag = replaceAttrExactlyOnce(newTag, 'height', height, base);
  return html.replace(tag, newTag);
}

function replaceAttrExactlyOnce(tag, attr, value, base) {
  const re = new RegExp(`${attr}="\\d+"`, 'g');
  const m = tag.match(re) ?? [];
  if (m.length !== 1) {
    throw new Error(
      `Expected one ${attr} on the ${base} <img>, found ${m.length}`
    );
  }
  return tag.replace(re, `${attr}="${value}"`);
}
