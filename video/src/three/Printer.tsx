import type { ThreeElements } from '@react-three/fiber';
import React from 'react';
import { COLOR } from '../theme';

// A deliberately generic enclosed CoreXY printer: no maker's shapes, logos or colours.
// Units match the spool (1 = 100 mm). Origin at the centre of the base, +y up, front +z.
export const PRINTER = { w: 3.2, h: 3.6, d: 3.2, rail: 0.1 };
/** Side spool holder on the +x face: where the rod starts, and its length along +x. */
export const HOLDER = {
  y: 2.35,
  z: -0.2,
  x0: PRINTER.w / 2,
  length: 1.0,
  radius: 0.11,
};

const Rail: React.FC<{
  from: [number, number, number];
  size: [number, number, number];
}> = ({ from, size }) => (
  <mesh position={from}>
    <boxGeometry args={size} />
    <meshPhysicalMaterial
      color="#3a3a40"
      roughness={0.3}
      metalness={0.7}
      clearcoat={0.4}
    />
  </mesh>
);

export const Printer: React.FC<
  { toolheadX?: number } & ThreeElements['group']
> = ({ toolheadX = 0, ...group }) => {
  const { w, h, d, rail: r } = PRINTER;
  const x = w / 2 - r / 2;
  const z = d / 2 - r / 2;
  const posts: [number, number][] = [
    [-x, -z],
    [x, -z],
    [-x, z],
    [x, z],
  ];
  return (
    <group {...group}>
      {/* Chamber light: lights the bed and outlines the frame from inside. */}
      <pointLight
        position={[0, h - 0.35, 0.2]}
        intensity={7}
        distance={4.5}
        color="#fff4e8"
      />
      {/* Uprights */}
      {posts.map(([px, pz]) => (
        <Rail key={`p${px}${pz}`} from={[px, h / 2, pz]} size={[r, h, r]} />
      ))}
      {/* Top and bottom rings */}
      {[r / 2, h - r / 2].map((y) => (
        <group key={`ring${y}`}>
          <Rail from={[0, y, z]} size={[w, r, r]} />
          <Rail from={[0, y, -z]} size={[w, r, r]} />
          <Rail from={[x, y, 0]} size={[r, r, d]} />
          <Rail from={[-x, y, 0]} size={[r, r, d]} />
        </group>
      ))}
      {/* Base plinth */}
      <mesh position={[0, 0.22, 0]}>
        <boxGeometry args={[w, 0.44, d]} />
        <meshLambertMaterial color="#18181b" />
      </mesh>
      {/* Display */}
      <mesh position={[w * 0.28, 0.24, d / 2 + 0.006]}>
        <boxGeometry args={[0.46, 0.16, 0.01]} />
        <meshStandardMaterial
          color="#0a0a0c"
          emissive={COLOR.brand}
          emissiveIntensity={0.6}
          roughness={0.2}
        />
      </mesh>
      {/* Smoked side and back panels */}
      {[
        { p: [0, h / 2, -d / 2 + 0.01], s: [w - r, h - r, 0.02] },
        { p: [-w / 2 + 0.01, h / 2, 0], s: [0.02, h - r, d - r] },
        { p: [w / 2 - 0.01, h / 2, 0], s: [0.02, h - r, d - r] },
      ].map(({ p, s }, i) => (
        <mesh key={`panel${i}`} position={p as [number, number, number]}>
          <boxGeometry args={s as [number, number, number]} />
          <meshPhysicalMaterial
            color="#3a3a42"
            roughness={0.1}
            clearcoat={1}
            transparent
            opacity={0.32}
          />
        </mesh>
      ))}
      {/* Bed */}
      <mesh position={[0, 1.35, 0]}>
        <boxGeometry args={[2.5, 0.06, 2.5]} />
        {/* Lambert: no specular, so up-facing plates don't mirror the studio ceiling as white. */}
        <meshLambertMaterial color="#2a2a2f" />
      </mesh>
      {/* Gantry and toolhead */}
      <Rail from={[0, h - 0.45, 0.1]} size={[w - r * 2, 0.08, 0.08]} />
      <group position={[toolheadX, h - 0.65, 0.1]}>
        <mesh>
          <boxGeometry args={[0.45, 0.5, 0.4]} />
          <meshPhysicalMaterial
            color="#e9e9ec"
            roughness={0.35}
            clearcoat={0.5}
          />
        </mesh>
        <mesh position={[0, -0.3, 0]}>
          <cylinderGeometry args={[0.03, 0.01, 0.12, 16]} />
          <meshStandardMaterial
            color="#b9a26a"
            metalness={0.9}
            roughness={0.25}
          />
        </mesh>
      </group>
      {/* Side spool holder */}
      <group position={[HOLDER.x0, HOLDER.y, HOLDER.z]}>
        <mesh position={[0.04, 0, 0]}>
          <boxGeometry args={[0.08, 0.5, 0.5]} />
          <meshPhysicalMaterial
            color="#1b1b1e"
            roughness={0.35}
            metalness={0.5}
          />
        </mesh>
        <mesh
          position={[HOLDER.length / 2, 0, 0]}
          rotation={[0, 0, Math.PI / 2]}
        >
          <cylinderGeometry
            args={[HOLDER.radius, HOLDER.radius, HOLDER.length, 48]}
          />
          <meshPhysicalMaterial
            color="#d6d6da"
            roughness={0.25}
            metalness={0.8}
          />
        </mesh>
        <mesh position={[HOLDER.length, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry
            args={[HOLDER.radius + 0.03, HOLDER.radius + 0.03, 0.05, 48]}
          />
          <meshPhysicalMaterial
            color="#d6d6da"
            roughness={0.25}
            metalness={0.8}
          />
        </mesh>
      </group>
    </group>
  );
};
