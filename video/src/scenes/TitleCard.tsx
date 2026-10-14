import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { AppIconTile } from '../components/AppIconTile';
import { Headline } from '../components/Headline';
import { useLayout } from '../layout';
import { COLOR, SPRING_TEXT } from '../theme';

/** Shot 3: the feature's name, Apple "feature title on white" style. */
export const TitleCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { width, height } = useLayout();
  const t = spring({
    frame,
    fps,
    config: SPRING_TEXT,
    durationRestThreshold: 0.001,
  });
  const size = Math.min(width, height) * 0.24;
  return (
    <AbsoluteFill style={{ background: COLOR.offWhite }}>
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: height * 0.4,
          transform: `translate(-50%, -50%) scale(${interpolate(t, [0, 1], [0.82, 1])})`,
          opacity: interpolate(t, [0, 0.5], [0, 1], {
            extrapolateRight: 'clamp',
          }),
        }}
      >
        <AppIconTile size={size} />
      </div>
      <Headline
        lines={['Spool Labels']}
        color={COLOR.graphite}
        // Below the icon, clear of it in either aspect.
        y={0.4 + (size / height) * 0.5 + (height > width ? 0.075 : 0.14)}
        from={4}
        entry="fade"
        size={0.11}
        eyebrow="3D Print Log"
      />
    </AbsoluteFill>
  );
};
