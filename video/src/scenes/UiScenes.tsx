import React from 'react';
import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import listTargets from '../../public/ui/desktop-materials-list.json';
import detailTargets from '../../public/ui/desktop-material-detail.json';
import dialogTargets from '../../public/ui/desktop-qr-dialog.json';
import { BrowserWindow } from '../components/BrowserWindow';
import { Cursor, cursorAt } from '../components/Cursor';
import { Headline } from '../components/Headline';
import { useLayout } from '../layout';
import { COLOR, PUSH_PER_FRAME, SPRING_UI } from '../theme';

type Box = { x: number; y: number; width: number; height: number };
const center = (b: Box) => ({ x: b.x + b.width / 2, y: b.y + b.height / 2 });

/** Window placement shared by both UI shots. */
function useWindow() {
  const { portrait, width, height } = useLayout();
  // 9:16: full-width window under the headline. 16:9: window on the right, type on the left.
  const w = portrait ? width * 0.94 : width * 0.58;
  const h = (w / 1280) * (800 + 44);
  return {
    w,
    top: portrait ? height * 0.3 : (height - h) / 2,
    left: portrait ? (width - w) / 2 : width * 0.385,
    portrait,
  };
}

/**
 * Text being typed into a field of the captured form: covers the captured value with the
 * field's own background, then uncovers it a character at a time with a caret.
 */
const Typing: React.FC<{
  frame: number;
  from: number;
  chars: number;
  x: number;
  y: number;
  w: number;
  h: number;
}> = ({ frame, from, chars, x, y, w, h }) => {
  const typed = Math.max(0, Math.min(chars, Math.floor((frame - from) / 1.6)));
  const done = typed >= chars;
  const shown = (w * typed) / chars;
  const caretOn = !done || Math.floor(frame / 8) % 2 === 0;
  return (
    <>
      <div
        style={{
          position: 'absolute',
          left: x + shown,
          top: y,
          width: w - shown + 6,
          height: h,
          background: '#f5f5f5',
        }}
      />
      {caretOn && frame >= from - 6 ? (
        <div
          style={{
            position: 'absolute',
            left: x + shown + 1,
            top: y + 2,
            width: 2,
            height: h - 4,
            background: COLOR.brand,
          }}
        />
      ) : null}
    </>
  );
};

/** Shot 4: add the spool. Materials list → click Add New Material → the form fills in. */
export const AddIt: React.FC = () => {
  const frame = useCurrentFrame();
  const { w, top, left } = useWindow();
  const { headlineY, besideX } = useLayout();
  const add = center(listTargets.addButton);
  const cut = 58;

  const list = frame < cut;
  const zoom = list
    ? 1.5 + frame * PUSH_PER_FRAME * 4
    : 2.1 + (frame - cut) * PUSH_PER_FRAME * 3;
  const cursor = cursorAt(frame, [
    { frame: 0, x: 760, y: 560 },
    { frame: 34, x: add.x + 10, y: add.y + 4 },
  ]);

  return (
    <AbsoluteFill style={{ background: COLOR.offWhite }}>
      <Headline
        lines={['Add it.']}
        color={COLOR.graphite}
        x={besideX}
        y={besideX ? 0.5 : headlineY}
      />
      <div style={{ position: 'absolute', left, top }}>
        {list ? (
          <BrowserWindow
            src="ui/desktop-materials-list.png"
            url="3dprintlog.com/materials"
            width={w}
            zoom={zoom}
            focus={add}
          >
            <Cursor
              x={cursor.x}
              y={cursor.y}
              frame={frame}
              clickAt={38}
              scale={1.3}
            />
          </BrowserWindow>
        ) : (
          // The captured form: Name at ~(231, 493), Material Type at ~(231, 650), in page px.
          <BrowserWindow
            src="ui/desktop-add-material-filled.png"
            url="3dprintlog.com/materials/new"
            width={w}
            zoom={zoom}
            focus={{ x: 400, y: 560 }}
          >
            <Typing
              frame={frame}
              from={cut + 6}
              chars={13}
              x={231}
              y={482}
              w={112}
              h={24}
            />
            <Typing
              frame={frame}
              from={cut + 34}
              chars={3}
              x={231}
              y={638}
              w={30}
              h={24}
            />
          </BrowserWindow>
        )}
      </div>
    </AbsoluteFill>
  );
};

/** Shot 5: print the label. Material page → Print QR Label → the dialog → push into the label. */
export const PrintIt: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { w, top, left } = useWindow();
  const { headlineY, besideX } = useLayout();
  const btn = center(detailTargets.printQrButton);
  const printBtn = center(dialogTargets.printButton);
  const label = center(dialogTargets.label);
  const dialogAt = 40;
  const pushFrom = 70;

  const dialog = frame >= dialogAt;
  const pop = spring({ frame: frame - dialogAt, fps, config: SPRING_UI });
  // The scale-through: an accelerating push into the label preview until it fills the frame.
  const through = interpolate(frame, [pushFrom, 119], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.in(Easing.cubic),
  });
  const zoom = dialog ? 1.35 + through * 6.5 : 1.6 + frame * PUSH_PER_FRAME * 3;
  const cursor = cursorAt(frame, [
    { frame: 0, x: 980, y: 380 },
    { frame: 30, x: btn.x + 8, y: btn.y + 4 },
    { frame: 46, x: btn.x + 8, y: btn.y + 4 },
    { frame: 62, x: printBtn.x + 6, y: printBtn.y + 4 },
  ]);

  return (
    <AbsoluteFill style={{ background: COLOR.offWhite }}>
      <div style={{ position: 'absolute', left, top }}>
        <BrowserWindow
          src={
            dialog
              ? 'ui/desktop-qr-dialog.png'
              : 'ui/desktop-material-detail.png'
          }
          url="3dprintlog.com/materials"
          width={w}
          zoom={zoom}
          focus={dialog ? label : btn}
          style={
            dialog
              ? { transform: `scale(${interpolate(pop, [0, 1], [0.985, 1])})` }
              : undefined
          }
        >
          {frame < pushFrom + 8 ? (
            <Cursor
              x={cursor.x}
              y={cursor.y}
              frame={frame}
              clickAt={frame < dialogAt ? 34 : 64}
              scale={1.3}
            />
          ) : null}
        </BrowserWindow>
      </div>
      {/* The push ends on the label filling the frame, which cuts to the 3D label. */}
      <AbsoluteFill
        style={{
          background: '#ffffff',
          opacity: interpolate(frame, [108, 119], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          }),
        }}
      />
      <Headline
        lines={['Print it.']}
        color={COLOR.graphite}
        x={besideX}
        y={besideX ? 0.5 : headlineY}
        until={pushFrom + 10}
      />
    </AbsoluteFill>
  );
};
