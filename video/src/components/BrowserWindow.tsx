import React from 'react';
import { Img, staticFile } from 'remotion';
import { COLOR, FONT } from '../theme';

/** Screenshots are captured at a 1280 x 800 CSS viewport (scripts/capture-shots.mjs). */
export const DESKTOP = { w: 1280, h: 800 };
const BAR = 44;

type Props = {
  src: string;
  url: string;
  /** On-screen width of the window, px. */
  width: number;
  /** Push-in: scale of the page inside the window, about `focus`. */
  zoom?: number;
  /** Point of the page (CSS px of the screenshot) the push heads for. */
  focus?: { x: number; y: number };
  /** Drawn in page coordinates, so they follow the push. */
  children?: React.ReactNode;
  style?: React.CSSProperties;
};

/**
 * A neutral floating browser window: three grey dots, an address pill and the captured page.
 * The page pushes in about `focus` while the window chrome stays still, as in Apple's UI demos.
 */
export const BrowserWindow: React.FC<Props> = ({
  src,
  url,
  width,
  zoom = 1,
  focus,
  children,
  style,
}) => {
  const k = width / DESKTOP.w;
  const height = DESKTOP.h * k + BAR * k;
  const f = focus ?? { x: DESKTOP.w / 2, y: DESKTOP.h / 2 };
  // Scale about the focus point, then shift so the focus drifts toward the window centre as
  // the zoom grows: keeps the control being talked about in frame.
  const pull = Math.min(1, (zoom - 1) / 1.2);
  const dx = (DESKTOP.w / 2 - f.x) * pull;
  const dy = (DESKTOP.h / 2 - f.y) * pull;

  return (
    <div
      style={{
        width,
        height,
        borderRadius: 14 * k * 1.6,
        overflow: 'hidden',
        background: '#fff',
        boxShadow: `0 ${40 * k}px ${120 * k}px rgba(0,0,0,0.18), 0 ${6 * k}px ${18 * k}px rgba(0,0,0,0.08)`,
        position: 'relative',
        ...style,
      }}
    >
      <div
        style={{
          height: BAR * k,
          background: '#f3f3f5',
          borderBottom: `${1 * k}px solid #e2e2e6`,
          display: 'flex',
          alignItems: 'center',
          padding: `0 ${16 * k}px`,
          gap: 8 * k,
          position: 'relative',
          zIndex: 2,
        }}
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: 12 * k,
              height: 12 * k,
              borderRadius: '50%',
              background: '#d4d4d8',
            }}
          />
        ))}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 420 * k,
            height: 26 * k,
            borderRadius: 8 * k,
            background: '#e6e6ea',
            fontFamily: FONT,
            fontSize: 13 * k,
            color: COLOR.gray,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {url}
        </div>
      </div>
      <div
        style={{
          position: 'relative',
          width,
          height: DESKTOP.h * k,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: DESKTOP.w,
            height: DESKTOP.h,
            transformOrigin: '0 0',
            transform: `scale(${k}) translate(${f.x}px, ${f.y}px) scale(${zoom}) translate(${-f.x + dx / zoom}px, ${-f.y + dy / zoom}px)`,
          }}
        >
          <Img
            src={staticFile(src)}
            style={{ width: DESKTOP.w, height: DESKTOP.h, display: 'block' }}
          />
          {children}
        </div>
      </div>
    </div>
  );
};
