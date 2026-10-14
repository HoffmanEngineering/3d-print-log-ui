// Finds where a music track fits the edit: its beat grid, its downbeats, its loudness per bar,
// and the 30 s windows that land a strong downbeat on the cut to the end card.
//
//   node scripts/analyze-music.mjs <track.mp3> [catalogBpm] [--json out.json]
//
// No dependencies beyond ffmpeg. Onsets come from spectral flux, the tempo is refined around the
// catalog BPM (incompetech lists one per track), and the bar phase is the one whose downbeats
// carry the most low-end energy (where the kick usually sits).
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const SR = 22050;
const HOP = 512;
const WIN = 1024;
const FPS = 30;
const AD_SECONDS = 30;
/** The cut to the end card, in frames. The music should hit here. */
const HIT_FRAME = 825;
/** Every cut in the edit, in frames (SpoolLabelsAd.tsx). */
const CUTS = [75, 135, 180, 300, 420, 495, 570, 645, 765, 825];

const [file, bpmArg] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const jsonOut = process.argv.includes('--json')
  ? process.argv[process.argv.indexOf('--json') + 1]
  : null;
if (!file) {
  console.error('usage: analyze-music.mjs <track> [bpm] [--json out]');
  process.exit(1);
}

// 1. Decode to mono float PCM.
const pcm = spawnSync(
  'ffmpeg',
  [
    '-v',
    'error',
    '-i',
    file,
    '-ac',
    '1',
    '-ar',
    String(SR),
    '-f',
    'f32le',
    '-',
  ],
  { maxBuffer: 1 << 30 }
).stdout;
const x = new Float32Array(pcm.buffer, pcm.byteOffset, pcm.byteLength / 4);
const duration = x.length / SR;

// 2. Spectral flux (all bins, and a low band for the kick) plus RMS per hop.
function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const a = (-2 * Math.PI) / len;
    for (let i = 0; i < n; i += len) {
      for (let k = 0; k < len / 2; k++) {
        const wr = Math.cos(a * k);
        const wi = Math.sin(a * k);
        const ur = re[i + k];
        const ui = im[i + k];
        const vr = re[i + k + len / 2] * wr - im[i + k + len / 2] * wi;
        const vi = re[i + k + len / 2] * wi + im[i + k + len / 2] * wr;
        re[i + k] = ur + vr;
        im[i + k] = ui + vi;
        re[i + k + len / 2] = ur - vr;
        im[i + k + len / 2] = ui - vi;
      }
    }
  }
}
const hann = Float32Array.from(
  { length: WIN },
  (_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / WIN)
);
const frames = Math.floor((x.length - WIN) / HOP);
const flux = new Float32Array(frames);
const lowFlux = new Float32Array(frames);
const rms = new Float32Array(frames);
const lowBins = Math.round((150 / SR) * WIN); // up to ~150 Hz
let prev = new Float32Array(WIN / 2);
for (let f = 0; f < frames; f++) {
  const re = new Float64Array(WIN);
  const im = new Float64Array(WIN);
  let e = 0;
  for (let i = 0; i < WIN; i++) {
    const s = x[f * HOP + i];
    re[i] = s * hann[i];
    e += s * s;
  }
  rms[f] = Math.sqrt(e / WIN);
  fft(re, im);
  const mag = new Float32Array(WIN / 2);
  let fl = 0;
  let lo = 0;
  for (let k = 1; k < WIN / 2; k++) {
    mag[k] = Math.log1p(100 * Math.hypot(re[k], im[k]));
    const d = Math.max(0, mag[k] - prev[k]);
    fl += d;
    if (k <= lowBins) lo += d;
  }
  flux[f] = fl;
  lowFlux[f] = lo;
  prev = mag;
}
const hopSec = HOP / SR;
const mean = (a) => a.reduce((s, v) => s + v, 0) / a.length;
// Remove the slow trend so loud passages don't dominate the onset picture.
function detrend(a, w = 16) {
  const out = new Float32Array(a.length);
  for (let i = 0; i < a.length; i++) {
    let s = 0;
    let n = 0;
    for (let j = Math.max(0, i - w); j <= Math.min(a.length - 1, i + w); j++) {
      s += a[j];
      n++;
    }
    out[i] = Math.max(0, a[i] - s / n);
  }
  return out;
}
const onset = detrend(flux);
const lowOnset = detrend(lowFlux);
const at = (a, t) => {
  const i = Math.round(t / hopSec);
  // Best value within ±1 hop, to forgive grid rounding.
  return Math.max(a[i - 1] ?? 0, a[i] ?? 0, a[i + 1] ?? 0);
};

// 3. Tempo and beat phase: the grid whose beats sit on the most onset energy.
const catalogBpm = Number(bpmArg) || null;
const bpmCandidates = [];
const lo = catalogBpm ? catalogBpm * 0.97 : 80;
const hi = catalogBpm ? catalogBpm * 1.03 : 160;
for (let b = lo; b <= hi; b += catalogBpm ? 0.02 : 0.25) bpmCandidates.push(b);
let best = { score: -1, bpm: 0, phase: 0 };
for (const bpm of bpmCandidates) {
  const period = 60 / bpm;
  for (let ph = 0; ph < period; ph += hopSec) {
    let s = 0;
    for (let t = ph; t < duration - 0.1; t += period) s += at(onset, t);
    if (s > best.score) best = { score: s, bpm, phase: ph };
  }
}
const period = 60 / best.bpm;
const beats = [];
for (let t = best.phase; t < duration - 0.05; t += period) beats.push(t);

// 4. Bar phase (assumes 4/4): the beat-in-bar whose beats carry the most low-end onset.
const barScore = [0, 1, 2, 3].map((k) =>
  mean(beats.filter((_, i) => i % 4 === k).map((t) => at(lowOnset, t)))
);
const barPhase = barScore.indexOf(Math.max(...barScore));
const downbeats = beats.filter((_, i) => i % 4 === barPhase);

// 5. Loudness per bar, in dB.
const db = (t0, t1) => {
  const i0 = Math.max(0, Math.floor(t0 / hopSec));
  const i1 = Math.min(rms.length, Math.ceil(t1 / hopSec));
  let e = 0;
  for (let i = i0; i < i1; i++) e += rms[i] * rms[i];
  return 10 * Math.log10(e / Math.max(1, i1 - i0) + 1e-10);
};
const bars = downbeats.map((t) => ({
  t,
  db: db(t, t + period * 4),
  hit: at(onset, t) + at(lowOnset, t),
}));
const hitMedian = [...bars.map((b) => b.hit)].sort((a, b) => a - b)[
  bars.length >> 1
];

// 6. Candidate windows: every downbeat that can sit on the end-card cut.
const hitSec = HIT_FRAME / FPS;
const windows = [];
for (const b of bars) {
  const start = b.t - hitSec;
  if (start < 0 || start + AD_SECONDS > duration + 1.5) continue;
  const before = db(b.t - period * 8, b.t); // two bars into the hit
  const after = db(b.t, b.t + period * 4); // the bar after it
  const opening = db(start, start + 4.5); // under the hook
  const scan = db(start + 645 / FPS, start + hitSec); // scan + payoff
  const quietest = Math.min(
    ...Array.from({ length: 6 }, (_, i) =>
      db(start + i * 4.5, start + (i + 1) * 4.5)
    )
  );
  const score =
    (b.hit / hitMedian) * 1.0 + // a real accent on the hit
    Math.max(0, after - before) * 0.35 + // a section change at the hit
    Math.max(0, scan - opening) * 0.25 - // builds over the ad
    Math.max(0, -30 - quietest) * 0.5; // no near-silence mid-ad
  windows.push({
    start: +start.toFixed(3),
    hit: +b.t.toFixed(3),
    score: +score.toFixed(2),
    accent: +(b.hit / hitMedian).toFixed(2),
    lift: +(after - before).toFixed(1),
    build: +(scan - opening).toFixed(1),
    quietestDb: +quietest.toFixed(1),
  });
}
windows.sort((a, b) => b.score - a.score);

// 7. For the best window: how far each cut is from the nearest beat, in frames.
const cutFit = (start) =>
  CUTS.map((c) => {
    const t = start + c / FPS;
    const nearest = beats.reduce((a, b) =>
      Math.abs(b - t) < Math.abs(a - t) ? b : a
    );
    return { cut: c, offBeatFrames: +((nearest - t) * FPS).toFixed(1) };
  });

const result = {
  file: path.basename(file),
  duration: +duration.toFixed(2),
  catalogBpm,
  bpm: +best.bpm.toFixed(2),
  firstBeat: +best.phase.toFixed(3),
  barPhase,
  windows: windows.slice(0, 5).map((w) => ({ ...w, cuts: cutFit(w.start) })),
};
if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify(result, null, 2));
console.log(
  `${result.file}: ${result.bpm} BPM (catalog ${catalogBpm ?? '?'}), ${result.duration}s`
);
for (const w of result.windows.slice(0, 3))
  console.log(
    `  start ${w.start.toFixed(2)}s  hit@${w.hit.toFixed(2)}s  score ${w.score}  accent ${w.accent}  lift ${w.lift}dB  build ${w.build}dB  quietest ${w.quietestDb}dB  cuts off-beat: ${w.cuts.map((c) => c.offBeatFrames).join(' ')}`
  );
