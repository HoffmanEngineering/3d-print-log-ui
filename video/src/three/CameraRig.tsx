import { useThree } from '@react-three/fiber';
import React, { useLayoutEffect } from 'react';
import * as THREE from 'three';

type V3 = [number, number, number];

/** Places the camera every frame from props, so a shot's camera move is a pure function of the frame. */
export const CameraRig: React.FC<{
  position: V3;
  target: V3;
  fov?: number;
}> = ({ position, target, fov = 30 }) => {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  useLayoutEffect(() => {
    camera.position.set(...position);
    camera.fov = fov;
    camera.near = 0.05;
    camera.far = 100;
    camera.lookAt(new THREE.Vector3(...target));
    camera.updateProjectionMatrix();
  });
  return null;
};

/** A soft dark floor that fades to the stage colour, for grounding objects on a black stage. */
export const StageFloor: React.FC<{
  y?: number;
  color?: string;
  radius?: number;
}> = ({ y = 0, color = '#0c0c0e', radius = 9 }) => {
  const tex = React.useMemo(() => {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const g = c.getContext('2d')!;
    const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(c);
  }, []);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, y, 0]}>
      <circleGeometry args={[radius, 64]} />
      <meshLambertMaterial color={color} alphaMap={tex} transparent />
    </mesh>
  );
};
