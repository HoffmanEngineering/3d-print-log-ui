import React from 'react';

/** Phone screenshots are captured at a 390 x 844 CSS viewport. */
export const PHONE = { w: 390, h: 844 };

/**
 * A generic, unbranded phone: black bezel, rounded screen, a pill cut-out. Children render in
 * screen coordinates (CSS px of the 390 x 844 capture).
 */
export const Phone: React.FC<{
  height: number;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ height, children, style }) => {
  const bezel = height * 0.018;
  const screenH = height - bezel * 2;
  const k = screenH / PHONE.h;
  const width = PHONE.w * k + bezel * 2;
  return (
    <div
      style={{
        width,
        height,
        borderRadius: height * 0.075,
        background: 'linear-gradient(145deg, #3a3a3e, #0d0d0f 40%, #1c1c1f)',
        padding: bezel,
        boxShadow: `0 ${height * 0.04}px ${height * 0.1}px rgba(0,0,0,0.35)`,
        position: 'relative',
        ...style,
      }}
    >
      <div
        style={{
          width: PHONE.w * k,
          height: screenH,
          borderRadius: height * 0.06,
          overflow: 'hidden',
          position: 'relative',
          background: '#000',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: PHONE.w,
            height: PHONE.h,
            transform: `scale(${k})`,
            transformOrigin: '0 0',
          }}
        >
          {children}
        </div>
        <div
          style={{
            position: 'absolute',
            top: screenH * 0.012,
            left: '50%',
            transform: 'translateX(-50%)',
            width: PHONE.w * k * 0.3,
            height: screenH * 0.035,
            borderRadius: 999,
            background: '#000',
          }}
        />
      </div>
    </div>
  );
};
