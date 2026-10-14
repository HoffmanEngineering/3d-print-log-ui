// Renders review stills from one bundle (much faster than one `remotion still` per frame),
// then tiles them into out/stills/contact-<comp>.png.
//   node scripts/stills.mjs QrSpoolVertical 30 100 200 ...
import { bundle } from '@remotion/bundler';
import { renderStill, selectComposition } from '@remotion/renderer';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [id = 'QrSpoolVertical', ...frames] = process.argv.slice(2);
const outDir = path.join(root, 'out', 'stills');
fs.mkdirSync(outDir, { recursive: true });

const serveUrl = await bundle({ entryPoint: path.join(root, 'src/index.ts') });
const chromiumOptions = { gl: process.env.REMOTION_GL ?? 'swangle' };
const browserExecutable = process.env.REMOTION_BROWSER ?? null;
const composition = await selectComposition({
  serveUrl,
  id,
  chromiumOptions,
  browserExecutable,
});
const files = [];
for (const f of frames.map(Number)) {
  const output = path.join(outDir, `${id}-${String(f).padStart(4, '0')}.png`);
  await renderStill({
    serveUrl,
    composition,
    frame: f,
    output,
    chromiumOptions,
    browserExecutable,
    scale: 0.5,
  });
  files.push(output);
  console.log('frame', f);
}
if (files.length === 1) process.exit(0);
const cols = Math.min(
  files.length,
  composition.width > composition.height ? 3 : 5
);
const inputs = files.flatMap((f) => ['-i', f]);
const layout = files
  .map(
    (_, i) =>
      `${i % cols ? Array.from({ length: i % cols }, (_, k) => `w${k}`).join('+') : 0}_${Math.floor(i / cols) ? Array.from({ length: Math.floor(i / cols) }, (_, k) => `h${k * cols}`).join('+') : 0}`
  )
  .join('|');
execFileSync('ffmpeg', [
  '-y',
  '-loglevel',
  'error',
  ...inputs,
  '-filter_complex',
  `xstack=inputs=${files.length}:layout=${layout}:fill=gray`,
  path.join(outDir, `contact-${id}.png`),
]);
console.log(
  'contact sheet',
  path.relative(root, path.join(outDir, `contact-${id}.png`))
);
