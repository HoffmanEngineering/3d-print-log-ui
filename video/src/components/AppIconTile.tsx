import React from 'react';
import { COLOR } from '../theme';

/** A QR glyph in a rounded indigo tile: the feature's "app icon" for the title card. */
export const AppIconTile: React.FC<{ size: number }> = ({ size }) => {
  const finder = (x: number, y: number) => (
    <g key={`${x}-${y}`}>
      <rect
        x={x}
        y={y}
        width="28"
        height="28"
        rx="6"
        fill="none"
        stroke="#fff"
        strokeWidth="6"
      />
      <rect x={x + 9} y={y + 9} width="10" height="10" rx="2" fill="#fff" />
    </g>
  );
  const dots = [
    [62, 22],
    [74, 22],
    [62, 46],
    [50, 58],
    [62, 70],
    [74, 70],
    [86, 58],
    [86, 82],
    [62, 86],
    [74, 94],
    [50, 94],
  ];
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.225,
        background: `linear-gradient(160deg, #5c6bc0 0%, ${COLOR.brand} 45%, ${COLOR.brandDeep} 100%)`,
        boxShadow: `0 ${size * 0.08}px ${size * 0.2}px rgba(40,53,147,0.35)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 116 116">
        {finder(10, 10)}
        {finder(78, 10)}
        {finder(10, 78)}
        {dots.map(([x, y]) => (
          <rect
            key={`${x}-${y}`}
            x={x}
            y={y}
            width="9"
            height="9"
            rx="2"
            fill="#fff"
          />
        ))}
        <rect x="88" y="88" width="16" height="16" rx="3" fill={COLOR.spool} />
      </svg>
    </div>
  );
};
