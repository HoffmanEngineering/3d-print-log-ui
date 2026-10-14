// Generates every sound effect the ad uses, from code, as 48 kHz mono WAV in public/sfx/.
// No samples or licences involved; re-run to tweak. Deterministic (seeded noise).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SR = 48000;
const out = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'public',
  'sfx'
);
fs.mkdirSync(out, { recursive: true });

let seed = 1234567;
const rand = () =>
  ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;
const buf = (sec) => new Float32Array(Math.round(sec * SR));
const env = (t, a, d) => (t < a ? t / a : Math.exp(-(t - a) / d));

/** RBJ biquad, coefficients recomputed per sample so the cutoff can sweep. */
function biquad(type) {
  let x1 = 0,
    x2 = 0,
    y1 = 0,
    y2 = 0;
  return (x, f, q = 0.7) => {
    const w = (2 * Math.PI * Math.min(f, SR * 0.45)) / SR;
    const c = Math.cos(w),
      a = Math.sin(w) / (2 * q);
    let b0, b1, b2;
    if (type === 'lp') [b0, b1, b2] = [(1 - c) / 2, 1 - c, (1 - c) / 2];
    else if (type === 'hp') [b0, b1, b2] = [(1 + c) / 2, -(1 + c), (1 + c) / 2];
    else [b0, b1, b2] = [a, 0, -a];
    const a0 = 1 + a,
      a1 = -2 * c,
      a2 = 1 - a;
    const y = (b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    x2 = x1;
    x1 = x;
    y2 = y1;
    y1 = y;
    return y;
  };
}

function write(name, data, peak = 0.9) {
  let m = 0;
  for (const v of data) m = Math.max(m, Math.abs(v));
  const g = m > 0 ? peak / m : 1;
  const pcm = Buffer.alloc(44 + data.length * 2);
  pcm.write('RIFF', 0);
  pcm.writeUInt32LE(36 + data.length * 2, 4);
  pcm.write('WAVE', 8);
  pcm.write('fmt ', 12);
  pcm.writeUInt32LE(16, 16);
  pcm.writeUInt16LE(1, 20);
  pcm.writeUInt16LE(1, 22);
  pcm.writeUInt32LE(SR, 24);
  pcm.writeUInt32LE(SR * 2, 28);
  pcm.writeUInt16LE(2, 32);
  pcm.writeUInt16LE(16, 34);
  pcm.write('data', 36);
  pcm.writeUInt32LE(data.length * 2, 40);
  data.forEach((v, i) =>
    pcm.writeInt16LE(
      Math.round(Math.max(-1, Math.min(1, v * g)) * 32767),
      44 + i * 2
    )
  );
  fs.writeFileSync(path.join(out, `${name}.wav`), pcm);
  console.log('wrote', `public/sfx/${name}.wav`);
}

const sfx = {
  /** Barely-there room air under the whole spot, so cuts don't drop to digital silence. */
  air() {
    const d = buf(31),
      lp = biquad('lp'),
      hp = biquad('hp');
    for (let i = 0; i < d.length; i++) d[i] = hp(lp(rand(), 900), 120) * 0.25;
    return [d, 0.08];
  },
  /** Soft UI tick: a short, high sine ping. */
  tick() {
    const d = buf(0.12);
    for (let i = 0; i < d.length; i++) {
      const t = i / SR;
      d[i] = Math.sin(2 * Math.PI * 2600 * t) * env(t, 0.001, 0.012);
    }
    return [d, 0.5];
  },
  /** Trackpad click: two very short filtered transients. */
  click() {
    const d = buf(0.1),
      bp = biquad('bp');
    for (let i = 0; i < d.length; i++) {
      const t = i / SR;
      const e =
        env(t, 0.0005, 0.004) +
        0.6 * env(Math.max(0, t - 0.028), 0.0005, 0.003) * (t > 0.028 ? 1 : 0);
      d[i] =
        bp(rand(), 3200, 1.2) * e +
        Math.sin(2 * Math.PI * 1500 * t) * env(t, 0.0005, 0.006) * 0.4;
    }
    return [d, 0.8];
  },
  /** A single keyboard key. */
  key() {
    const d = buf(0.06),
      bp = biquad('bp');
    for (let i = 0; i < d.length; i++) {
      const t = i / SR;
      d[i] =
        bp(rand(), 2400 + 600 * Math.random(), 1.5) * env(t, 0.0005, 0.006);
    }
    return [d, 0.5];
  },
  /** Air whoosh for the scale-through: band-passed noise sweeping up then down. */
  whoosh() {
    const len = 0.9,
      d = buf(len),
      bp = biquad('bp');
    for (let i = 0; i < d.length; i++) {
      const t = i / SR,
        p = t / len;
      const f = 300 + 3200 * Math.sin(Math.PI * Math.min(1, p * 1.15));
      d[i] = bp(rand(), f, 0.9) * Math.pow(Math.sin(Math.PI * p), 2);
    }
    return [d, 0.7];
  },
  /** The reveal: a slow rising swell with a low tone underneath. */
  swell() {
    const len = 1.6,
      d = buf(len),
      bp = biquad('bp');
    for (let i = 0; i < d.length; i++) {
      const t = i / SR,
        p = t / len;
      const e =
        Math.pow(Math.sin(Math.PI * Math.min(1, p * 0.75)), 2) *
        (p > 0.66 ? Math.exp(-(p - 0.66) * 6) : 1);
      d[i] =
        (bp(rand(), 200 + 1600 * p, 0.8) * 0.8 +
          Math.sin(2 * Math.PI * (55 + 25 * p) * t) * 0.5) *
        e;
    }
    return [d, 0.7];
  },
  /** A label card flicking through the air. */
  paper() {
    const len = 0.35,
      d = buf(len),
      hp = biquad('hp');
    for (let i = 0; i < d.length; i++) {
      const t = i / SR,
        p = t / len;
      const flutter = 0.6 + 0.4 * Math.sin(2 * Math.PI * 38 * t);
      d[i] = hp(rand(), 2500) * Math.sin(Math.PI * p) * flutter;
    }
    return [d, 0.45];
  },
  /** The label pressed flat: a soft thump. */
  press() {
    const d = buf(0.3),
      lp = biquad('lp');
    for (let i = 0; i < d.length; i++) {
      const t = i / SR;
      d[i] =
        Math.sin(2 * Math.PI * (110 - 50 * t * 4) * t) * env(t, 0.002, 0.05) +
        lp(rand(), 1200) * env(t, 0.001, 0.015) * 0.6;
    }
    return [d, 0.85];
  },
  /** The spool sliding along the holder rod. */
  slide() {
    const len = 0.75,
      d = buf(len),
      bp = biquad('bp');
    for (let i = 0; i < d.length; i++) {
      const t = i / SR,
        p = t / len;
      const grit =
        0.7 +
        0.3 *
          Math.sin(2 * Math.PI * 60 * t + 3 * Math.sin(2 * Math.PI * 7 * t));
      d[i] =
        bp(rand(), 900 - 400 * p, 1.1) *
        grit *
        Math.sin(Math.PI * Math.min(1, p * 1.1)) *
        (1 - p * 0.6);
    }
    return [d, 0.6];
  },
  /** The spool seating against the holder. */
  clunk() {
    const d = buf(0.4),
      bp = biquad('bp');
    for (let i = 0; i < d.length; i++) {
      const t = i / SR;
      d[i] =
        Math.sin(2 * Math.PI * 78 * t) * env(t, 0.001, 0.07) +
        bp(rand(), 700, 2) * env(t, 0.001, 0.02) * 0.8 +
        Math.sin(2 * Math.PI * 1240 * t) * env(t, 0.001, 0.03) * 0.15;
    }
    return [d, 0.85];
  },
  /** Scan confirmed: two bell tones a fourth apart. */
  chime() {
    const d = buf(1.4);
    const bell = (t, f) =>
      [1, 2.01, 3.02].reduce(
        (s, h, k) => s + Math.sin(2 * Math.PI * f * h * t) * [1, 0.35, 0.12][k],
        0
      );
    for (let i = 0; i < d.length; i++) {
      const t = i / SR;
      const t2 = t - 0.09;
      d[i] =
        bell(t, 1318.5) * env(t, 0.002, 0.25) * 0.8 +
        (t2 > 0 ? bell(t2, 1760) * env(t2, 0.002, 0.45) : 0);
    }
    return [d, 0.6];
  },
  /** The end card: a deep, clean hit with a high shimmer that rings out. */
  hit() {
    const len = 3.2,
      d = buf(len),
      lp = biquad('lp');
    for (let i = 0; i < d.length; i++) {
      const t = i / SR;
      const boom =
        Math.sin(2 * Math.PI * (48 + 30 * Math.exp(-t * 12)) * t) *
        env(t, 0.004, 0.9);
      const body = lp(rand(), 400) * env(t, 0.002, 0.08) * 0.8;
      const shimmer =
        [2093, 2637, 3136].reduce(
          (s, f, k) => s + Math.sin(2 * Math.PI * f * t + k) * 0.08,
          0
        ) * env(t, 0.03, 1.1);
      d[i] = boom + body + shimmer;
    }
    return [d, 0.95];
  },
};

for (const [name, fn] of Object.entries(sfx)) {
  const [data, peak] = fn();
  write(name, data, peak);
}
