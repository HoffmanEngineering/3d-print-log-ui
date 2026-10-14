// Style tokens. The motion and type numbers come from apple-motion's frame-by-frame
// measurements of Apple's own videos (MIT, github.com/IskakovDamir/apple-motion); see PLAN.md.
import { loadFont } from '@remotion/fonts';
import { staticFile } from 'remotion';

export const FPS = 30;

export const COLOR = {
  black: '#000000',
  white: '#ffffff',
  offWhite: '#f5f5f7',
  graphite: '#1d1d1f',
  gray: '#86868b',
  /** The hero spool. Same hex as the fixture the UI shots were captured from. */
  spool: '#ff6a13',
  /** 3D Print Log indigo (the app's primary). */
  brand: '#3f51b5',
  brandDeep: '#283593',
  success: '#34c759',
};

export const FONT =
  '"Inter", -apple-system, "SF Pro Display", "Helvetica Neue", Arial, sans-serif';

for (const weight of ['400', '500', '600', '700'] as const) {
  loadFont({
    family: 'Inter',
    url: staticFile(`fonts/inter-latin-${weight}-normal.woff2`),
    weight,
  });
}

/** Measured type entry spring (damping 15.3, stiffness 115): ~2% overshoot, no visible bounce. */
export const SPRING_TEXT = { damping: 15.3, stiffness: 115, mass: 1 };
/** Slow, heavy settle for objects and camera. */
export const SPRING_OBJECT = { damping: 30, stiffness: 60, mass: 1 };
/** Quick, firm settle for UI elements (sheets, dialogs). */
export const SPRING_UI = { damping: 22, stiffness: 180, mass: 1 };

/** Apple's measured push/pull rate: ~4.5% scale per second. */
export const PUSH_PER_FRAME = 0.045 / FPS;
