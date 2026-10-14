import type { ThreeElements } from '@react-three/fiber';
import React, { useMemo } from 'react';
import { useCurrentFrame } from 'remotion';
import * as THREE from 'three';
import { COLOR } from '../theme';
import { NOZZLE_TIP_Y, Toolhead } from './Toolhead';

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

/** Top of the build sheet. */
const BED_TOP = 1.385;
/** The print in progress: a ribbed vase in the hero filament, mid-print. */
const VASE = { x: -0.25, z: 0.15, height: 0.62, rimRadius: 0.27 };

/** A textured build sheet: fine speckle, as on powder-coated PEI. */
function buildSheetTexture(): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d')!;
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, 256, 256);
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 9000; i++) {
    const v = 150 + Math.floor(rnd() * 105);
    g.fillStyle = `rgb(${v},${v},${v})`;
    g.fillRect(rnd() * 256, rnd() * 256, 1.5, 1.5);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(6, 6);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Visible layer lines: one ridge per layer, as a bump map along the profile. */
function layerBump(layers: number): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = 4;
  c.height = 1024;
  const g = c.getContext('2d')!;
  for (let y = 0; y < c.height; y++) {
    const v = Math.round(
      255 * Math.sin((((y / c.height) * layers) % 1) * Math.PI)
    );
    g.fillStyle = `rgb(${v},${v},${v})`;
    g.fillRect(0, y, 4, 1);
  }
  return new THREE.CanvasTexture(c);
}

const Vase: React.FC<ThreeElements['group']> = (group) => {
  const { geo, bump } = useMemo(() => {
    const pts: THREE.Vector2[] = [];
    const steps = 48;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const y = t * VASE.height;
      // Foot, belly, then a gentle waist toward the rim being printed.
      const r =
        0.22 + 0.11 * Math.sin(Math.PI * Math.min(1, t * 1.25)) + 0.05 * t;
      pts.push(new THREE.Vector2(r, y));
    }
    pts[pts.length - 1].x = VASE.rimRadius;
    const g = new THREE.LatheGeometry(pts, 96);
    return { geo: g, bump: layerBump(90) };
  }, []);
  return (
    <group {...group}>
      <mesh geometry={geo}>
        <meshPhysicalMaterial
          color={COLOR.spool}
          roughness={0.35}
          clearcoat={0.5}
          bumpMap={bump}
          bumpScale={2}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[0, 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.22, 64]} />
        <meshPhysicalMaterial color={COLOR.spool} roughness={0.4} />
      </mesh>
    </group>
  );
};

/** Where the toolhead is: the nozzle traces the rim of the vase, one lap every ~1.2 s. */
export function toolheadPose(frame: number, printing = true) {
  const theta = printing ? frame * 0.17 : 0.6;
  return {
    x: VASE.x + Math.cos(theta) * VASE.rimRadius,
    y: BED_TOP + VASE.height - NOZZLE_TIP_Y + 0.004,
    z: VASE.z + Math.sin(theta) * VASE.rimRadius,
  };
}

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
  {
    /** Animates the toolhead tracing the print. Off for a still printer. */
    printing?: boolean;
  } & ThreeElements['group']
> = ({ printing = true, ...group }) => {
  const frame = useCurrentFrame();
  const { w, h, d, rail: r } = PRINTER;
  const tool = toolheadPose(frame, printing);
  const beamY = tool.y + 0.12;
  const sheet = useMemo(buildSheetTexture, []);
  const ptfe = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(tool.x, tool.y + 0.3, tool.z - 0.04),
      new THREE.Vector3(tool.x * 0.6, h + 0.3, tool.z * 0.5 - 0.15),
      new THREE.Vector3(w / 2 - 0.35, h + 0.15, HOLDER.z),
      new THREE.Vector3(w / 2 + 0.06, HOLDER.y + 0.58, HOLDER.z),
    ]);
    return {
      tube: new THREE.TubeGeometry(curve, 80, 0.026, 12, false),
      core: new THREE.TubeGeometry(curve, 80, 0.009, 8, false),
    };
  }, [tool.x, tool.y, tool.z, w, h]);
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
      {/* Bed: plate, textured build sheet, and the print in progress */}
      <mesh position={[0, BED_TOP - 0.04, 0]}>
        <boxGeometry args={[2.5, 0.06, 2.5]} />
        {/* Lambert: no specular, so up-facing plates don't mirror the studio ceiling as white. */}
        <meshLambertMaterial color="#2a2a2f" />
      </mesh>
      <mesh position={[0, BED_TOP - 0.005, 0]}>
        <boxGeometry args={[2.4, 0.01, 2.4]} />
        <meshLambertMaterial color="#5a4a3a" map={sheet} />
      </mesh>
      <Vase position={[VASE.x, BED_TOP, VASE.z]} />
      {/* Bed lead screws, rear corners */}
      {[-1, 1].map((side) => (
        <mesh
          key={`screw${side}`}
          position={[side * 1.1, h / 2, -d / 2 + 0.35]}
        >
          <cylinderGeometry args={[0.028, 0.028, h - 0.5, 16]} />
          <meshStandardMaterial
            color="#c7c9ce"
            metalness={1}
            roughness={0.25}
          />
        </mesh>
      ))}
      {/* Motion system: Y rails on the sides, the X beam with its linear rail, belts, motors */}
      {[-1, 1].map((side) => (
        <group key={`y${side}`}>
          <mesh position={[side * (w / 2 - r - 0.04), beamY, 0]}>
            <boxGeometry args={[0.05, 0.04, d - r * 2]} />
            <meshStandardMaterial
              color="#c7c9ce"
              metalness={0.9}
              roughness={0.3}
            />
          </mesh>
          <mesh position={[side * (w / 2 - r - 0.1), beamY + 0.06, 0]}>
            <boxGeometry args={[0.012, 0.03, d - r * 2 - 0.3]} />
            <meshStandardMaterial color="#111113" roughness={0.8} />
          </mesh>
          <group
            position={[side * (w / 2 - 0.36), beamY + 0.12, -d / 2 + 0.36]}
          >
            <mesh>
              <boxGeometry args={[0.42, 0.42, 0.42]} />
              <meshPhysicalMaterial
                color="#1a1a1d"
                roughness={0.45}
                clearcoat={0.4}
              />
            </mesh>
            <mesh position={[0, 0.215, 0]}>
              <cylinderGeometry args={[0.12, 0.12, 0.012, 32]} />
              <meshStandardMaterial
                color="#c7c9ce"
                metalness={0.9}
                roughness={0.3}
              />
            </mesh>
          </group>
        </group>
      ))}
      <Rail
        from={[0, beamY, tool.z - 0.33]}
        size={[w - r * 2 - 0.1, 0.1, 0.1]}
      />
      <mesh position={[0, beamY, tool.z - 0.27]}>
        <boxGeometry args={[w - r * 2 - 0.3, 0.045, 0.03]} />
        <meshStandardMaterial
          color="#c7c9ce"
          metalness={0.9}
          roughness={0.28}
        />
      </mesh>
      {[0.065, -0.065].map((dy) => (
        <mesh key={`belt${dy}`} position={[0, beamY + dy, tool.z - 0.385]}>
          <boxGeometry args={[w - r * 2 - 0.2, 0.025, 0.008]} />
          <meshStandardMaterial color="#111113" roughness={0.85} />
        </mesh>
      ))}
      <group position={[tool.x, tool.y, tool.z]}>
        <Toolhead frame={frame} extruding={printing} />
      </group>
      {/* Filament path: PTFE tube from the side entry to the toolhead, filament inside */}
      <mesh geometry={ptfe.tube}>
        <meshPhysicalMaterial
          color="#f4f4f6"
          roughness={0.15}
          clearcoat={1}
          transparent
          opacity={0.42}
          depthWrite={false}
        />
      </mesh>
      <mesh geometry={ptfe.core}>
        <meshPhysicalMaterial
          color={COLOR.spool}
          roughness={0.3}
          clearcoat={0.6}
        />
      </mesh>
      <mesh position={[w / 2 + 0.06, HOLDER.y + 0.5, HOLDER.z]}>
        <boxGeometry args={[0.12, 0.16, 0.14]} />
        <meshPhysicalMaterial color="#1a1a1d" roughness={0.4} clearcoat={0.4} />
      </mesh>
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
