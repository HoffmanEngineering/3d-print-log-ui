import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Sequence,
  interpolate,
  staticFile,
} from 'remotion';
import { EndCard } from './scenes/EndCard';
import { HookLineup, HookReveal } from './scenes/Hook';
import {
  LabelHero,
  LoadIt,
  NozzleMacro,
  StickIt,
} from './scenes/PhysicalScenes';
import { SCAN_BEATS, ScanIt } from './scenes/ScanIt';
import { TitleCard } from './scenes/TitleCard';
import { AddIt, PrintIt } from './scenes/UiScenes';

/**
 * The edit. Every shot starts where the previous one ends: hard cuts, as in ~92% of Apple's
 * measured edits. Durations are in frames at 30 fps; PLAN.md has the reasoning per shot.
 */
export const SHOTS: { name: string; frames: number; Scene: React.FC }[] = [
  { name: 'Hook: identical spools', frames: 75, Scene: HookLineup },
  { name: 'Hook: the hero spool', frames: 60, Scene: HookReveal },
  { name: 'Title card', frames: 45, Scene: TitleCard },
  { name: 'Add it', frames: 120, Scene: AddIt },
  { name: 'Print it', frames: 120, Scene: PrintIt },
  { name: 'The label', frames: 75, Scene: LabelHero },
  { name: 'Stick it on', frames: 75, Scene: StickIt },
  { name: 'Load it up', frames: 75, Scene: LoadIt },
  { name: 'Scan it', frames: 120, Scene: ScanIt },
  { name: 'Printing', frames: 60, Scene: NozzleMacro },
  { name: 'End card', frames: 75, Scene: EndCard },
];

export const AD_FRAMES = SHOTS.reduce((n, s) => n + s.frames, 0);

const starts = SHOTS.reduce<number[]>(
  (acc, s, i) => [...acc, i === 0 ? 0 : acc[i - 1] + SHOTS[i - 1].frames],
  []
);
const at = (shot: number, offset: number) => starts[shot] + offset;

/** Sound cues: [file in public/sfx, frame, volume]. Placed on picture events, not a beat grid. */
const CUES: [string, number, number][] = [
  ['swell', at(1, 0), 0.8],
  ['tick', at(2, 4), 0.7],
  ['click', at(3, 38), 0.9],
  ...Array.from({ length: 9 }, (_, i): [string, number, number] => [
    'key',
    at(3, 64 + i * 2),
    0.35,
  ]),
  ...Array.from({ length: 4 }, (_, i): [string, number, number] => [
    'key',
    at(3, 92 + i * 2),
    0.35,
  ]),
  ['click', at(4, 34), 0.9],
  ['click', at(4, 64), 0.9],
  ['whoosh', at(4, 92), 0.8],
  ['paper', at(5, 2), 0.7],
  ['press', at(6, 33), 1],
  ['slide', at(7, 2), 0.8],
  ['clunk', at(7, 26), 0.9],
  ['click', at(8, SCAN_BEATS.TAP), 0.6],
  ['chime', at(8, SCAN_BEATS.LOCK), 0.8],
  ['tick', at(8, SCAN_BEATS.FILL), 0.5],
  ['whir', at(9, 0), 0.6],
  ['hit', at(10, 0), 1],
];

/**
 * The music bed: "Inspired", Kevin MacLeod (incompetech.com), CC BY 4.0. The file is the
 * 30.5 s window from 4:02.5 that scripts/analyze-music.mjs ranked best: at 120 BPM a beat is
 * exactly 15 frames, every cut lands on one, and a downbeat lands on the end card. Credit it
 * wherever the video is published (public/music/CREDITS.md).
 */
const MUSIC = { file: 'music/inspired.mp3', volume: 0.7, hitFrame: 825 };

export const SpoolLabelsAd: React.FC = () => (
  <AbsoluteFill style={{ background: '#000' }}>
    {SHOTS.map(({ name, frames, Scene }, i) => (
      <Sequence
        key={name}
        name={name}
        from={starts[i]}
        durationInFrames={frames}
      >
        <Scene />
      </Sequence>
    ))}
    <Audio
      src={staticFile(MUSIC.file)}
      volume={(f) =>
        interpolate(
          f,
          [0, 24, MUSIC.hitFrame, AD_FRAMES - 6],
          [0, MUSIC.volume, MUSIC.volume, 0],
          { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
        )
      }
    />
    {CUES.map(([file, frame, volume], i) => (
      <Sequence
        key={`${file}-${i}`}
        from={frame}
        name={`sfx ${file}`}
        layout="none"
      >
        <Audio src={staticFile(`sfx/${file}.wav`)} volume={volume} />
      </Sequence>
    ))}
  </AbsoluteFill>
);
