import { useThree } from '@react-three/fiber';
import React, { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

/**
 * Apple-style product lighting: a soft procedural studio environment for reflections
 * (no HDR download, so renders are offline and deterministic), a broad key light,
 * and a hard rim light that draws the silhouette against the background.
 */
export const Studio: React.FC<{
  envIntensity?: number;
  keyIntensity?: number;
  rimIntensity?: number;
  rimColor?: string;
  background?: string | null;
}> = ({
  envIntensity = 0.8,
  keyIntensity = 2.2,
  rimIntensity = 3,
  rimColor = '#ffffff',
  background = null,
}) => {
  const { gl, scene } = useThree();
  const env = useMemo(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const tex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    return tex;
  }, [gl]);

  useEffect(() => {
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 1;
    gl.outputColorSpace = THREE.SRGBColorSpace;
    scene.environment = env;
    scene.environmentIntensity = envIntensity;
    scene.background = background ? new THREE.Color(background) : null;
  }, [gl, scene, env, envIntensity, background]);

  return (
    <>
      <directionalLight position={[3, 4, 5]} intensity={keyIntensity} />
      <directionalLight
        position={[-4, 2, -4]}
        intensity={rimIntensity}
        color={rimColor}
      />
      <directionalLight position={[0, -3, 2]} intensity={0.3} />
    </>
  );
};
