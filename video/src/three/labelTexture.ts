import { useEffect, useState } from 'react';
import { continueRender, delayRender, staticFile } from 'remotion';
import * as THREE from 'three';
import { COLOR } from '../theme';

/** The label is 70 x 30 mm, the app's "Medium" size, drawn at ~20 px/mm. */
export const LABEL_MM = { w: 70, h: 30 };
const PX = 20;

/**
 * Draws the spool label the app prints: its real QR code (public/ui/qr.svg, saved from
 * the QR label dialog by scripts/capture-ui.mjs) beside the same text lines.
 */
export function drawLabel(qr: HTMLImageElement): HTMLCanvasElement {
  const w = LABEL_MM.w * PX;
  const h = LABEL_MM.h * PX;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d')!;
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, w, h);

  const pad = 36;
  const qrSize = h - pad * 2;
  g.imageSmoothingEnabled = false;
  g.drawImage(qr, pad, pad, qrSize, qrSize);

  const x = pad * 2 + qrSize;
  g.fillStyle = '#111111';
  g.textBaseline = 'alphabetic';
  g.font = '700 64px Inter, Arial, sans-serif';
  g.fillText('Sunset Orange', x, 112);
  g.fillStyle = '#333333';
  g.font = '500 44px Inter, Arial, sans-serif';
  g.fillText('Polymaker', x, 210);
  g.fillText('PLA', x, 300);
  g.beginPath();
  g.arc(x + 22, 375, 20, 0, Math.PI * 2);
  g.fillStyle = COLOR.spool;
  g.fill();
  g.fillStyle = '#333333';
  g.fillText('Sunset Orange', x + 58, 390);
  g.font = '500 38px Inter, Arial, sans-serif';
  g.fillStyle = '#666666';
  g.fillText('Nozzle: 215°C', x, 500);
  return c;
}

/** Loads the QR once and holds the render until the label texture exists. */
export function useLabelTexture(): THREE.Texture | null {
  const [tex, setTex] = useState<THREE.Texture | null>(null);
  const [handle] = useState(() => delayRender('label texture'));
  useEffect(() => {
    const img = new Image();
    img.onload = async () => {
      await document.fonts.ready;
      const t = new THREE.CanvasTexture(drawLabel(img));
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 8;
      setTex(t);
      continueRender(handle);
    };
    img.onerror = () => continueRender(handle);
    img.src = staticFile('ui/qr.svg');
  }, [handle]);
  return tex;
}
