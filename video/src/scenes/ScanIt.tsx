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
import scannerTargets from '../../public/ui/phone-scanner.json';
import { Headline } from '../components/Headline';
import { Phone } from '../components/Phone';
import { useLayout } from '../layout';
import { COLOR, SPRING_UI } from '../theme';
import { ViewfinderScene } from './PhysicalScenes';

// The camera feed's <video> box in the captured scanner screen (CSS px of the 390 x 844 phone),
// recorded by capture-ui.mjs. The 3D viewfinder is drawn over it.
const FEED = {
  x: scannerTargets.feed.x,
  y: scannerTargets.feed.y,
  w: scannerTargets.feed.width,
  h: scannerTargets.feed.height,
};
// The T2 row in the captured "loaded" screen.
const T2_ROW = { x: 12, y: 622, w: 366, h: 96 };

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

/** The scan brackets: four corners that close on the code, then turn green. */
const Brackets: React.FC<{ frame: number }> = ({ frame }) => {
  const close = interpolate(frame, [8, 38], [0, 1], {
    ...clamp,
    easing: (t) => 1 - Math.pow(1 - t, 3),
  });
  const locked = frame >= 40;
  const inset = interpolate(close, [0, 1], [18, 62]);
  const size = 30;
  const color = locked ? COLOR.success : '#ffffff';
  const corners = [
    { left: inset, top: inset * 0.62, b: 'borderLeft borderTop' },
    { right: inset, top: inset * 0.62, b: 'borderRight borderTop' },
    { left: inset, bottom: inset * 0.62, b: 'borderLeft borderBottom' },
    { right: inset, bottom: inset * 0.62, b: 'borderRight borderBottom' },
  ];
  return (
    <>
      {corners.map(({ b, ...pos }, i) => {
        const style: React.CSSProperties = {
          position: 'absolute',
          width: size,
          height: size,
          ...pos,
        };
        for (const side of b.split(' '))
          (style as Record<string, unknown>)[side] = `4px solid ${color}`;
        return <div key={i} style={style} />;
      })}
      {locked ? (
        <AbsoluteFill
          style={{
            background: COLOR.success,
            opacity: interpolate(frame, [40, 48], [0.35, 0], clamp),
          }}
        />
      ) : null}
    </>
  );
};

/** Shot 9: scan the label with the phone; the slot fills in. */
export const ScanIt: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { portrait, width, height, headlineY } = useLayout();
  const cut = 52;
  const scanning = frame < cut;
  const phoneH = portrait ? height * 0.66 : height * 0.8;
  const rise = spring({ frame, fps, config: SPRING_UI });
  const rowGlow = spring({ frame: frame - cut - 6, fps, config: SPRING_UI });
  // The viewfinder is rendered at the feed's on-screen size times 2, so it stays sharp.
  const feedScale = 2;
  return (
    <AbsoluteFill style={{ background: COLOR.offWhite }}>
      <Headline
        lines={['Scan it.']}
        color={COLOR.graphite}
        y={headlineY}
        until={cut}
      />
      <Headline
        lines={['Done.']}
        color={COLOR.graphite}
        y={headlineY}
        from={cut}
      />
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: portrait ? height * 0.27 : height * 0.16,
          transform: `translateX(-50%) translateY(${(1 - rise) * height * 0.04}px) scale(${1 + frame * 0.0006})`,
          transformOrigin: '50% 30%',
        }}
      >
        <Phone height={phoneH}>
          {scanning ? (
            <>
              <Img
                src={staticFile('ui/phone-scanner.png')}
                style={{ width: 390, height: 844 }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: FEED.x,
                  top: FEED.y,
                  width: FEED.w,
                  height: FEED.h,
                  overflow: 'hidden',
                  borderRadius: 4,
                }}
              >
                <div
                  style={{
                    width: FEED.w * feedScale,
                    height: FEED.h * feedScale,
                    transform: `scale(${1 / feedScale})`,
                    transformOrigin: '0 0',
                  }}
                >
                  <ViewfinderScene
                    width={Math.round(FEED.w * feedScale)}
                    height={Math.round(FEED.h * feedScale)}
                  />
                </div>
                <Brackets frame={frame} />
              </div>
            </>
          ) : (
            <>
              <Img
                src={staticFile('ui/phone-slot-loaded.png')}
                style={{ width: 390, height: 844 }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: T2_ROW.x,
                  top: T2_ROW.y,
                  width: T2_ROW.w,
                  height: T2_ROW.h,
                  borderRadius: 14,
                  boxShadow: `0 0 0 ${3 * rowGlow}px ${COLOR.spool}`,
                  background: `rgba(255,106,19,${0.08 * rowGlow})`,
                }}
              />
            </>
          )}
        </Phone>
      </div>
    </AbsoluteFill>
  );
};
