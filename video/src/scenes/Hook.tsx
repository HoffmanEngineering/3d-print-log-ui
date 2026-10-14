import { ThreeCanvas } from '@remotion/three';
import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { Headline } from '../components/Headline';
import { useLayout } from '../layout';
import { CameraRig } from '../three/CameraRig';
import { Spool } from '../three/Spool';
import { Studio } from '../three/Studio';
import { COLOR, SPRING_OBJECT, STAGE_GLOW } from '../theme';

// Five spools nobody could tell apart: the same off-white, the same black flanges.
const LINEUP = [
  { color: '#d9d9dc', ry: -0.62, y: 0.02 },
  { color: '#cfcfd3', ry: -0.5, y: -0.03 },
  { color: '#e2e2e5', ry: -0.58, y: 0.0 },
  { color: '#d4d4d7', ry: -0.47, y: 0.03 },
  { color: '#dcdcdf', ry: -0.55, y: -0.01 },
];

/** Shot 1: a slow dolly along a shelf of identical spools, receding into the dark. */
export const HookLineup: React.FC = () => {
  const frame = useCurrentFrame();
  const { portrait, width, height, headlineY } = useLayout();
  const p = interpolate(frame, [0, 75], [0, 1]);
  const cam: [number, number, number] = portrait
    ? [5.6 - p * 1.4, 1.5, 5.4 + p * 0.2]
    : [5.2 - p * 1.6, 1.2, 6.2];
  return (
    // The flanges are black, so the stage behind them is lit: they read as silhouettes
    // against the glow instead of disappearing into the background.
    <AbsoluteFill style={{ background: STAGE_GLOW('50%', '58%') }}>
      <ThreeCanvas width={width} height={height}>
        <Studio envIntensity={1.2} keyIntensity={2} rimIntensity={5} />
        <CameraRig
          position={cam}
          target={
            portrait ? [-0.6 - p * 0.8, 0.85, 0] : [-1.2 - p * 0.8, 0.75, 0]
          }
          fov={portrait ? 36 : 30}
        />
        {LINEUP.map((s, i) => (
          <Spool
            key={i}
            color={s.color}
            sheen={0.3}
            position={[(i - 1) * -2.15, s.y, 0]}
            rotation={[0, s.ry + 0.2, 0]}
          />
        ))}
      </ThreeCanvas>
      <Headline lines={['Which one is', 'the PETG?']} from={6} y={headlineY} />
    </AbsoluteFill>
  );
};

/** Shot 2: the hero spool rises into the light. */
export const HookReveal: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { portrait, width, height, headlineY, besideX } = useLayout();
  const t = spring({ frame, fps, config: SPRING_OBJECT });
  const ry = interpolate(t, [0, 1], [-1.6, -0.85]) + frame * 0.003;
  const y = interpolate(t, [0, 1], [-0.45, 0]);
  const camZ = interpolate(
    frame,
    [0, 60],
    [portrait ? 8.6 : 6.4, portrait ? 8.0 : 6.0]
  );
  return (
    <AbsoluteFill
      style={{ background: STAGE_GLOW(portrait ? '50%' : '62%', '58%') }}
    >
      <ThreeCanvas width={width} height={height}>
        <Studio
          envIntensity={interpolate(t, [0, 1], [0.3, 1.2])}
          keyIntensity={interpolate(t, [0, 1], [0.3, 3])}
          rimIntensity={4}
          rimColor="#ffd2b8"
        />
        <CameraRig
          shift={portrait ? 0 : 0.2}
          position={[0.4, 0.5, camZ]}
          target={[0, portrait ? 0.55 : -0.1, 0]}
          fov={30}
        />
        <Spool
          color={COLOR.spool}
          position={[0, y, 0]}
          rotation={[0.08, ry, 0]}
        />
      </ThreeCanvas>
      <Headline
        lines={['Never guess', 'again.']}
        x={besideX}
        from={14}
        entry="rise"
        y={besideX ? 0.5 : headlineY}
      />
    </AbsoluteFill>
  );
};
