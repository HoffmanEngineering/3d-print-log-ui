import { createHash } from 'node:crypto';

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
    throw new Error(`Expected exactly one <img> for ${base}, found ${tags.length}`);
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
    throw new Error(`Expected one ${attr} on the ${base} <img>, found ${m.length}`);
  }
  return tag.replace(re, `${attr}="${value}"`);
}
