import React from 'react';
import { Easing, interpolate } from 'remotion';

export type CursorKey = { frame: number; x: number; y: number };

const ease = Easing.bezier(0.45, 0, 0.2, 1);

/** Position along a path of keyframes (screen-space of whatever it is drawn in). */
export function cursorAt(
  frame: number,
  keys: CursorKey[]
): { x: number; y: number } {
  if (frame <= keys[0].frame) return keys[0];
  for (let i = 1; i < keys.length; i++) {
    const a = keys[i - 1];
    const b = keys[i];
    if (frame <= b.frame) {
      const t = ease((frame - a.frame) / (b.frame - a.frame));
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    }
  }
  return keys[keys.length - 1];
}

/**
 * A plain arrow pointer with a click: it dips on `clickAt` and leaves a ring behind.
 * `scale` sizes it relative to the content it sits on (1 = 1 CSS px of the screenshot).
 */
export const Cursor: React.FC<{
  x: number;
  y: number;
  frame: number;
  clickAt?: number;
  scale?: number;
}> = ({ x, y, frame, clickAt, scale = 1 }) => {
  const since = clickAt === undefined ? -1 : frame - clickAt;
  const press =
    since >= 0 && since < 6 ? interpolate(since, [0, 2, 6], [1, 0.82, 1]) : 1;
  const ring = since >= 0 && since < 18 ? since / 18 : null;
  return (
    <>
      {ring !== null ? (
        <div
          style={{
            position: 'absolute',
            left: x,
            top: y,
            width: 44 * scale,
            height: 44 * scale,
            marginLeft: -22 * scale,
            marginTop: -22 * scale,
            borderRadius: '50%',
            border: `${2.5 * scale}px solid rgba(63,81,181,${0.55 * (1 - ring)})`,
            background: `rgba(63,81,181,${0.12 * (1 - ring)})`,
            transform: `scale(${0.4 + ring * 1.1})`,
          }}
        />
      ) : null}
      <svg
        width={22 * scale}
        height={30 * scale}
        viewBox="0 0 22 30"
        style={{
          position: 'absolute',
          left: x - 3 * scale,
          top: y - 2 * scale,
          transform: `scale(${press})`,
          transformOrigin: '3px 2px',
          filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.3))',
          overflow: 'visible',
        }}
      >
        <path
          d="M2 1 L2 24 L8 18.5 L12 28 L16 26.3 L12.1 17 L20 17 Z"
          fill="#111"
          stroke="#fff"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      </svg>
    </>
  );
};
