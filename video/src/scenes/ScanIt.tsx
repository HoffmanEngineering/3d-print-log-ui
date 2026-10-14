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
import slotTargets from '../../public/ui/phone-printer-slots.json';
import { Headline } from '../components/Headline';
import { PHONE, Phone } from '../components/Phone';
import { useLayout } from '../layout';
import { COLOR, SPRING_OBJECT, SPRING_UI } from '../theme';
import { ViewfinderScene } from './PhysicalScenes';

// The camera feed's <video> box in the captured scanner screen (CSS px of the 390 x 844 phone),
// recorded by capture-ui.mjs. The 3D viewfinder is drawn over it.
const FEED = {
  x: scannerTargets.feed.x,
  y: scannerTargets.feed.y,
  w: scannerTargets.feed.width,
  h: scannerTargets.feed.height,
};
const LOAD = slotTargets.loadButton;
const ROW = slotTargets.loadedRow;

/** Beats, in frames from the start of the shot. */
const TAP = 12;
const SCAN = 24; // cut to the scanner
const LOCK = SCAN + 40; // brackets lock on the code
const BACK = 74; // cut back to the slots, T2 still empty
const FILL = BACK + 7; // T2 fills in

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

const Screen: React.FC<{ name: string; opacity?: number }> = ({
  name,
  opacity = 1,
}) => (
  <Img
    src={staticFile(`ui/${name}.png`)}
    style={{
      position: 'absolute',
      left: 0,
      top: 0,
      width: PHONE.w,
      height: PHONE.h,
      opacity,
    }}
  />
);

/** A finger tap: a soft disc that presses, then a ring that spreads and fades. */
const Tap: React.FC<{ x: number; y: number; frame: number }> = ({
  x,
  y,
  frame,
}) => {
  if (frame < -4 || frame > 16) return null;
  const press = interpolate(frame, [-4, 0, 6], [0, 1, 0], clamp);
  const ring = interpolate(frame, [0, 16], [0, 1], clamp);
  const disc = (size: number, style: React.CSSProperties) => (
    <div
      style={{
        position: 'absolute',
        left: x - size / 2,
        top: y - size / 2,
        width: size,
        height: size,
        borderRadius: '50%',
        ...style,
      }}
    />
  );
  return (
    <>
      {disc(34, { background: `rgba(29,29,31,${0.22 * press})` })}
      {disc(34, {
        border: `2px solid rgba(29,29,31,${0.35 * (1 - ring)})`,
        transform: `scale(${1 + ring * 1.2})`,
      })}
    </>
  );
};

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

/**
 * Shot 9: tap Load on the empty T2 slot, scan the spool's label, and watch T2 fill in with
 * Sunset Orange. The before and after are both real captures of the same screen.
 */
export const ScanIt: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { portrait, height, headlineY, besideX } = useLayout();
  const phoneH = portrait ? height * 0.66 : height * 0.82;
  const rise = spring({ frame, fps, config: SPRING_UI });
  const fill = interpolate(frame, [FILL, FILL + 6], [0, 1], clamp);
  const rowGlow = spring({ frame: frame - FILL - 2, fps, config: SPRING_UI });
  // Once T2 fills, push in on it so the new spool reads at phone size.
  const push = spring({ frame: frame - FILL, fps, config: SPRING_OBJECT });
  const rowCentre = (ROW.y + ROW.height / 2) / PHONE.h;
  const scale = 1 + frame * 0.0006 + push * 0.2;
  // Portrait stacks the headline above the phone, so the push pivots higher up and lets T2
  // drift down rather than lifting the phone into the type.
  const pivot = portrait ? 0.42 : rowCentre;
  const feedScale = 2; // the viewfinder renders at 2x its on-screen size, so it stays sharp
  const scanning = frame >= SCAN && frame < BACK;
  return (
    <AbsoluteFill style={{ background: COLOR.offWhite }}>
      <div
        style={{
          position: 'absolute',
          left: portrait ? '50%' : '62%',
          top: portrait ? height * 0.27 : height * 0.1,
          transform: `translateX(-50%) translateY(${(1 - rise) * height * 0.04}px) scale(${scale})`,
          transformOrigin: `50% ${pivot * 100}%`,
        }}
      >
        <Phone height={phoneH}>
          {scanning ? (
            <>
              <Screen name="phone-scanner" />
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
                <Brackets frame={frame - SCAN} />
              </div>
            </>
          ) : (
            <>
              <Screen name="phone-printer-slots" />
              {frame >= BACK ? (
                <>
                  <Screen name="phone-slot-loaded" opacity={fill} />
                  <div
                    style={{
                      position: 'absolute',
                      left: ROW.x - 6,
                      top: ROW.y - 4,
                      width: ROW.width + 12,
                      height: ROW.height + 8,
                      borderRadius: 14,
                      boxShadow: `0 0 0 ${3 * rowGlow}px ${COLOR.spool}`,
                      background: `rgba(255,106,19,${0.08 * rowGlow})`,
                    }}
                  />
                </>
              ) : (
                <Tap
                  x={LOAD.x + LOAD.width / 2}
                  y={LOAD.y + LOAD.height / 2}
                  frame={frame - TAP}
                />
              )}
            </>
          )}
        </Phone>
      </div>
      <Headline
        lines={['Scan it.']}
        color={COLOR.graphite}
        x={besideX}
        y={besideX ? 0.5 : headlineY}
        until={FILL}
      />
      <Headline
        lines={['Done.']}
        color={COLOR.graphite}
        x={besideX}
        y={besideX ? 0.5 : headlineY}
        from={FILL}
      />
    </AbsoluteFill>
  );
};

/** Beat times other files cue sound on. */
export const SCAN_BEATS = { TAP, LOCK, FILL };
