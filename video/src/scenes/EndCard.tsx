import React from 'react';
import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { useLayout } from '../layout';
import { COLOR, FONT, SPRING_TEXT } from '../theme';

/** Shot 10: the name, held. */
export const EndCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { width, height } = useLayout();
  const s = Math.min(width, height);
  // Measured "scale down from large" entry, slowed to the logo's weight.
  const t = spring({ frame, fps, config: SPRING_TEXT });
  const words = spring({ frame: frame - 10, fps, config: SPRING_TEXT });
  const fade = (v: number) =>
    interpolate(v, [0, 0.6], [0, 1], { extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill
      style={{
        background: COLOR.white,
        fontFamily: FONT,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          transform: `translateY(${-height * 0.02}px)`,
        }}
      >
        <Img
          src={staticFile('brand/mark.svg')}
          style={{
            width: s * 0.26,
            height: s * 0.26,
            opacity: fade(t),
            transform: `scale(${interpolate(t, [0, 1], [1.13, 1])})`,
          }}
        />
        <div
          style={{
            marginTop: s * 0.06,
            fontSize: s * 0.1,
            fontWeight: 600,
            letterSpacing: '-0.03em',
            color: COLOR.graphite,
            opacity: fade(words),
          }}
        >
          3D Print Log
        </div>
        <div
          style={{
            marginTop: s * 0.02,
            fontSize: s * 0.045,
            fontWeight: 500,
            color: COLOR.gray,
            letterSpacing: '-0.01em',
            opacity: fade(words),
          }}
        >
          Every spool, accounted for.
        </div>
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: height * 0.08,
          fontSize: s * 0.034,
          fontWeight: 500,
          color: COLOR.brand,
          opacity: fade(
            spring({ frame: frame - 22, fps, config: SPRING_TEXT })
          ),
        }}
      >
        3dprintlog.com
      </div>
    </AbsoluteFill>
  );
};
