import { ThreeCanvas } from '@remotion/three';
import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import * as THREE from 'three';
import { Headline } from '../components/Headline';
import { useLayout } from '../layout';
import { CameraRig, StageFloor } from '../three/CameraRig';
import { useLabelTexture } from '../three/labelTexture';
import { HOLDER, Printer, toolheadPose } from '../three/Printer';
import { NOZZLE_TIP_Y } from '../three/Toolhead';
import { Label, LABEL_POSE, Spool, SPOOL } from '../three/Spool';
import { Studio } from '../three/Studio';
import { COLOR, SPRING_OBJECT, SPRING_UI } from '../theme';

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

/** Shot 6: the printed label, alone, turning to camera as a light glint crosses it. */
export const LabelHero: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { width, height, portrait } = useLayout();
  const map = useLabelTexture();
  const t = spring({ frame, fps, config: SPRING_OBJECT });
  const glintX = interpolate(frame, [18, 70], [-1.2, 1.2], clamp);
  return (
    <AbsoluteFill style={{ background: COLOR.offWhite }}>
      <ThreeCanvas width={width} height={height}>
        <Studio envIntensity={1.1} keyIntensity={1.6} rimIntensity={1} />
        <pointLight
          position={[glintX, 0.25, 0.55]}
          intensity={2.2}
          distance={3}
        />
        <CameraRig
          position={[0, 0, portrait ? 2.9 : 1.9]}
          target={[0, 0, 0]}
          fov={30}
        />
        <Label
          map={map}
          position={[0, interpolate(t, [0, 1], [-0.12, 0]), 0]}
          rotation={[
            interpolate(t, [0, 1], [-1.1, 0.1]),
            interpolate(t, [0, 1], [0.9, -0.22]) + frame * 0.002,
            interpolate(t, [0, 1], [0.25, 0.02]),
          ]}
          scale={1.0 + frame * 0.0008}
        />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};

/** Shot 7: the label drops onto the flange and presses flat. */
export const StickIt: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { width, height, portrait, headlineY, besideX } = useLayout();
  const map = useLabelTexture();
  const land = 34;
  const t = spring({
    frame: frame - 6,
    fps,
    config: SPRING_UI,
    durationInFrames: land - 6,
  });
  const squash =
    frame >= land && frame < land + 8
      ? interpolate(frame - land, [0, 3, 8], [1, 0.4, 1])
      : 1;
  const p = LABEL_POSE.position;
  const pos: [number, number, number] = [
    interpolate(t, [0, 1], [p.x + 0.25, p.x]),
    interpolate(t, [0, 1], [p.y + 0.3, p.y]),
    interpolate(t, [0, 1], [p.z + 0.9, p.z]),
  ];
  const rot: [number, number, number] = [
    interpolate(t, [0, 1], [-0.6, 0]),
    interpolate(t, [0, 1], [0.5, 0]),
    interpolate(t, [0, 1], [0.25, 0]),
  ];
  const pull = interpolate(frame, [0, 90], [0, 1], clamp);
  const spoolY = portrait ? -0.75 : -0.1;
  return (
    <AbsoluteFill style={{ background: COLOR.black }}>
      <ThreeCanvas width={width} height={height}>
        <Studio
          envIntensity={1.0}
          keyIntensity={2.8}
          rimIntensity={4}
          rimColor="#ffd2b8"
        />
        <CameraRig
          shift={portrait ? 0 : 0.18}
          position={[
            1.1 + pull * 0.5,
            1.0 + spoolY + pull * 0.2,
            (portrait ? 4.6 : 3.9) + pull * 1.2,
          ]}
          target={[0, 0.25 + spoolY + (portrait ? 0.55 : 0) - pull * 0.3, 0]}
          fov={30}
        />
        <Spool
          color={COLOR.spool}
          position={[0, spoolY, 0]}
          rotation={[0, -0.25, 0]}
        >
          <Label
            map={map}
            position={pos}
            rotation={rot}
            scale={[1, 1, squash]}
          />
        </Spool>
      </ThreeCanvas>
      <Headline
        lines={['Stick it on.']}
        from={land + 4}
        x={besideX}
        y={besideX ? 0.5 : headlineY}
      />
    </AbsoluteFill>
  );
};

/** Shot 8: the spool slides onto the printer's side holder and settles with a quarter-turn. */
export const LoadIt: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { width, height, portrait, headlineY, besideX } = useLayout();
  const map = useLabelTexture();
  const slide = spring({
    frame: frame - 4,
    fps,
    config: { damping: 26, stiffness: 70, mass: 1.2 },
  });
  const seated = HOLDER.x0 + SPOOL.halfWidth + SPOOL.flange + 0.2;
  const x = interpolate(slide, [0, 1], [seated + 2.8, seated]);
  const turn = spring({ frame: frame - 34, fps, config: SPRING_OBJECT });
  const orbit = interpolate(frame, [0, 105], [0, 1]);
  const cam: [number, number, number] = portrait
    ? [8.6 - orbit * 0.8, 3.9, 9.4 + orbit * 0.5]
    : [8.9 - orbit * 0.8, 3.9, 8.0 + orbit * 0.5];
  return (
    <AbsoluteFill style={{ background: COLOR.black }}>
      <ThreeCanvas width={width} height={height}>
        <Studio envIntensity={0.9} keyIntensity={2.6} rimIntensity={3.5} />
        <CameraRig
          shift={portrait ? 0 : 0.16}
          position={cam}
          target={portrait ? [1.1, 2.0, 0] : [0.7, 1.9, 0]}
          fov={portrait ? 40 : 32}
        />
        <StageFloor />
        <Printer />
        <group
          position={[x, HOLDER.y, HOLDER.z]}
          rotation={[0, Math.PI / 2, 0]}
        >
          {/* Rolls half a turn on the way in and settles with the other half, so the label ends upright. */}
          <Spool
            color={COLOR.spool}
            rotation={[0, 0, -slide * Math.PI - turn * Math.PI]}
          >
            <Label map={map} position={LABEL_POSE.position} />
          </Spool>
        </group>
      </ThreeCanvas>
      <Headline
        lines={['Load it up.']}
        from={8}
        x={besideX}
        y={besideX ? 0.5 : headlineY}
      />
    </AbsoluteFill>
  );
};

/**
 * What the phone's camera sees in the scan shot: the labelled spool on the printer, close up,
 * with a little handheld drift.
 */
export const ViewfinderScene: React.FC<{ width: number; height: number }> = ({
  width,
  height,
}) => {
  const frame = useCurrentFrame();
  const map = useLabelTexture();
  const seated = HOLDER.x0 + SPOOL.halfWidth + SPOOL.flange + 0.2;
  // Label centre in world space: spool turned to face +x, then the settled quarter-turn.
  const spin = -2 * Math.PI;
  const lp = new THREE.Vector3(
    LABEL_POSE.position.x,
    LABEL_POSE.position.y,
    LABEL_POSE.position.z
  )
    .applyAxisAngle(new THREE.Vector3(0, 0, 1), spin)
    .applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2)
    .add(new THREE.Vector3(seated, HOLDER.y, HOLDER.z));
  const sway = (a: number, f: number) => Math.sin(frame / f) * a;
  const settle = interpolate(frame, [0, 40], [1, 0.25], clamp);
  return (
    <ThreeCanvas width={width} height={height}>
      <Studio
        envIntensity={0.9}
        keyIntensity={2.4}
        rimIntensity={2}
        background="#151517"
      />
      <CameraRig
        position={[
          lp.x + 1.15 + sway(0.03, 11) * settle,
          lp.y + sway(0.025, 7) * settle,
          lp.z + 0.12 + sway(0.03, 13) * settle,
        ]}
        target={[lp.x, lp.y, lp.z]}
        fov={34 - interpolate(frame, [0, 40], [0, 6], clamp)}
      />
      <Printer />
      <group
        position={[seated, HOLDER.y, HOLDER.z]}
        rotation={[0, Math.PI / 2, 0]}
      >
        <Spool color={COLOR.spool} rotation={[0, 0, spin]}>
          <Label map={map} position={LABEL_POSE.position} />
        </Spool>
      </group>
    </ThreeCanvas>
  );
};

/** Shot 10: macro on the hotend, printing in the spool that was just scanned. */
export const NozzleMacro: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height, portrait, headlineY, besideX } = useLayout();
  const tool = toolheadPose(frame);
  const tip = { x: tool.x, y: tool.y + NOZZLE_TIP_Y, z: tool.z };
  // Camera rides with the toolhead, low and close, drifting slowly around the nozzle.
  const a = 0.5 + frame * 0.004;
  const dist = portrait ? 2.5 : 2.1;
  return (
    <AbsoluteFill style={{ background: COLOR.black }}>
      <ThreeCanvas width={width} height={height}>
        <Studio
          envIntensity={0.6}
          keyIntensity={1.6}
          rimIntensity={3}
          rimColor="#ffd2b8"
        />
        <CameraRig
          shift={portrait ? 0 : 0.2}
          position={[
            tip.x + Math.sin(a) * dist,
            tip.y + 0.1,
            tip.z + Math.cos(a) * dist,
          ]}
          target={[tip.x, tip.y + (portrait ? 0.36 : 0.12), tip.z]}
          fov={portrait ? 36 : 30}
        />
        <Printer printing />
      </ThreeCanvas>
      <Headline
        lines={['Right filament.', 'Every time.']}
        from={8}
        entry="rise"
        x={besideX}
        y={portrait ? 0.1 : 0.5}
      />
    </AbsoluteFill>
  );
};
