import { useThree } from '@react-three/fiber';
import React, { useLayoutEffect, useMemo } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

/**
 * How much of the studio environment reaches the scene, relative to each shot's
 * `envIntensity`. The look was art-directed with the key and rim lights doing the work and
 * the environment as a faint reflection only; at full strength the RoomEnvironment's white
 * walls lift every dark surface to grey and wash the hero orange out to peach.
 */
const ENV_SCALE = 0.1;

/**
 * Apple-style product lighting: a soft procedural studio environment for reflections
 * (no HDR download, so renders are offline and deterministic), a broad key light,
 * and a hard rim light that draws the silhouette against the background.
 *
 * Renderer and scene settings are applied in a layout effect, before the canvas draws. With
 * a plain effect the first frame a canvas draws has no environment and every later frame
 * does, so a `remotion still` (always a first frame) and a full render (mostly later
 * frames) disagree.
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
  const { gl, scene, invalidate } = useThree();
  const env = useMemo(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const tex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    return tex;
  }, [gl]);

  useLayoutEffect(() => {
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 1;
    gl.outputColorSpace = THREE.SRGBColorSpace;
    scene.environment = env;
    scene.environmentIntensity = envIntensity * ENV_SCALE;
    scene.background = background ? new THREE.Color(background) : null;
    invalidate();
  }, [gl, scene, env, envIntensity, background, invalidate]);

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
