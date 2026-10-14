import React from 'react';
import { Composition, Folder } from 'remotion';
import { AD_FRAMES, SpoolLabelsAd } from './SpoolLabelsAd';
import { FPS } from './theme';

export const Root: React.FC = () => (
  <Folder name="SpoolLabels">
    {/* The deliverable: 9:16 for Reels, Shorts and TikTok. */}
    <Composition
      id="QrSpoolVertical"
      component={SpoolLabelsAd}
      durationInFrames={AD_FRAMES}
      fps={FPS}
      width={1080}
      height={1920}
    />
    {/* Same edit, 16:9. Layout adapts through useLayout(). */}
    <Composition
      id="QrSpoolHorizontal"
      component={SpoolLabelsAd}
      durationInFrames={AD_FRAMES}
      fps={FPS}
      width={1920}
      height={1080}
    />
  </Folder>
);
