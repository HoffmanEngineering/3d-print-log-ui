import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { COLOR, FONT, SPRING_TEXT } from '../theme';

export type Entry = 'cut' | 'rise' | 'fade' | 'scaleDown';

type Props = {
  lines: string[];
  /** Frame (within the parent sequence) the type appears on. */
  from?: number;
  /** Frame it leaves on (cut off, the measured norm). */
  until?: number;
  entry?: Entry;
  color?: string;
  /** Vertical centre of the block, as a fraction of frame height. */
  y?: number;
  /**
   * Horizontal centre of the block, as a fraction of frame width. Leave unset for full-width
   * centred type; set it to put type beside a device in the 16:9 cut.
   */
  x?: number;
  /** Font size as a fraction of the frame's short side. */
  size?: number;
  weight?: 500 | 600 | 700;
  /** A smaller line above the headline. */
  eyebrow?: string;
  eyebrowColor?: string;
};

/**
 * Apple-style display type: one or two short lines, Semibold, tight tracking, flat colour,
 * centred. Cuts on by default; animated entries finish in about 8 frames.
 */
export const Headline: React.FC<Props> = ({
  lines,
  from = 0,
  until,
  entry = 'cut',
  color = COLOR.white,
  y = 0.18,
  x,
  size = 0.1,
  weight = 600,
  eyebrow,
  eyebrowColor = COLOR.gray,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  if (frame < from || (until !== undefined && frame >= until)) return null;

  const t =
    entry === 'cut'
      ? 1
      : spring({ frame: frame - from, fps, config: SPRING_TEXT });
  const fontSize = Math.min(width, height) * size;
  const opacity =
    entry === 'cut'
      ? 1
      : interpolate(t, [0, 0.6], [0, 1], { extrapolateRight: 'clamp' });
  const translateY = entry === 'rise' ? (1 - t) * height * 0.02 : 0;
  const scale = entry === 'scaleDown' ? interpolate(t, [0, 1], [1.13, 1]) : 1;

  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <div
        style={{
          position: 'absolute',
          left: x === undefined ? 0 : width * (x - 0.2),
          width: x === undefined ? width : width * 0.4,
          top: height * y,
          transform: `translate(0, -50%) translateY(${translateY}px) scale(${scale})`,
          opacity,
          textAlign: x === undefined ? 'center' : 'left',
          fontFamily: FONT,
          color,
          padding: x === undefined ? `0 ${width * 0.06}px` : 0,
        }}
      >
        {eyebrow ? (
          <div
            style={{
              fontSize: fontSize * 0.36,
              fontWeight: 600,
              color: eyebrowColor,
              letterSpacing: '-0.005em',
              marginBottom: fontSize * 0.18,
            }}
          >
            {eyebrow}
          </div>
        ) : null}
        {lines.map((line) => (
          <div
            key={line}
            style={{
              fontSize,
              fontWeight: weight,
              lineHeight: 1.08,
              letterSpacing: '-0.025em',
            }}
          >
            {line}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};
