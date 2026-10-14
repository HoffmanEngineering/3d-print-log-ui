import React, { useMemo } from 'react';
import type { ThreeElements } from '@react-three/fiber';
import * as THREE from 'three';
import { LABEL_MM } from './labelTexture';

// Units: 1 = 100 mm. A standard 1 kg spool: 200 mm across, 66 mm wide, 56 mm bore.
export const SPOOL = {
  radius: 1,
  bore: 0.28,
  halfWidth: 0.33,
  flange: 0.035,
  windingRadius: 0.87,
};
/** Where the label sits on the outer face of the front flange (spool space). */
export const LABEL_POSE = {
  position: new THREE.Vector3(0, 0.6, SPOOL.halfWidth + SPOOL.flange + 0.003),
  width: LABEL_MM.w / 100,
  height: LABEL_MM.h / 100,
};

/** Fine circumferential ridges, one per wrap of 1.75 mm filament, as a bump map. */
function windingBump(): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = 8;
  c.height = 512;
  const g = c.getContext('2d')!;
  const wraps = 38;
  for (let y = 0; y < c.height; y++) {
    const phase = ((y / c.height) * wraps) % 1;
    const v = Math.round(255 * Math.sin(phase * Math.PI));
    g.fillStyle = `rgb(${v},${v},${v})`;
    g.fillRect(0, y, c.width, 1);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function flangeGeometry(): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, SPOOL.radius, 0, Math.PI * 2, false);
  const hole = new THREE.Path();
  hole.absarc(0, 0, SPOOL.bore, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: SPOOL.flange - 0.012,
    bevelEnabled: true,
    bevelThickness: 0.006,
    bevelSize: 0.006,
    bevelSegments: 3,
    curveSegments: 128,
  });
  geo.translate(0, 0, -(SPOOL.flange - 0.012) / 2);
  return geo;
}

type Props = {
  color: string;
  /** Flange plastic. */
  flangeColor?: string;
  /** 0 = dull, 1 = full gloss on the filament (silk/PLA sheen). */
  sheen?: number;
  children?: React.ReactNode;
} & ThreeElements['group'];

/** A filament spool, axis along +z, front flange facing +z. Children render in spool space. */
export const Spool: React.FC<Props> = ({
  color,
  flangeColor = '#34343a',
  sheen = 1,
  children,
  ...group
}) => {
  const flange = useMemo(flangeGeometry, []);
  const bump = useMemo(windingBump, []);
  const winding = useMemo(() => {
    const g = new THREE.CylinderGeometry(
      SPOOL.windingRadius,
      SPOOL.windingRadius,
      SPOOL.halfWidth * 2,
      160,
      1,
      true
    );
    g.rotateX(Math.PI / 2);
    return g;
  }, []);
  const hub = useMemo(() => {
    const g = new THREE.CylinderGeometry(
      SPOOL.bore + 0.02,
      SPOOL.bore + 0.02,
      SPOOL.halfWidth * 2,
      64,
      1,
      true
    );
    g.rotateX(Math.PI / 2);
    return g;
  }, []);

  return (
    <group {...group}>
      <mesh geometry={winding}>
        <meshPhysicalMaterial
          color={color}
          roughness={0.32 - 0.12 * sheen}
          clearcoat={0.6 * sheen}
          clearcoatRoughness={0.25}
          bumpMap={bump}
          bumpScale={1.2}
          sheen={0.4 * sheen}
          sheenColor={new THREE.Color(color).lerp(
            new THREE.Color('#ffffff'),
            0.4
          )}
        />
      </mesh>
      <mesh geometry={hub}>
        <meshStandardMaterial
          color="#0c0c0e"
          roughness={0.6}
          side={THREE.DoubleSide}
        />
      </mesh>
      {[1, -1].map((side) => (
        <mesh
          key={side}
          geometry={flange}
          position={[0, 0, side * (SPOOL.halfWidth + SPOOL.flange / 2)]}
        >
          <meshPhysicalMaterial
            color={flangeColor}
            roughness={0.5}
            clearcoat={0.35}
            clearcoatRoughness={0.4}
          />
        </mesh>
      ))}
      {children}
    </group>
  );
};

/** The printed label as a thin card, for use in spool space or on its own. */
export const Label: React.FC<
  { map: THREE.Texture | null } & ThreeElements['group']
> = ({ map, ...group }) => (
  <group {...group}>
    <mesh>
      <boxGeometry args={[LABEL_POSE.width, LABEL_POSE.height, 0.004]} />
      <meshPhysicalMaterial
        attach="material"
        color="#ffffff"
        roughness={0.45}
        clearcoat={0.3}
        map={map ?? undefined}
      />
    </mesh>
  </group>
);
