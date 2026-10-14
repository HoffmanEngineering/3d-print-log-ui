import React, { useMemo } from 'react';
import * as THREE from 'three';
import { COLOR } from '../theme';

// A generic, unbranded toolhead in the shape most current CoreXY machines share: a shroud
// with a front hotend fan, side part-cooling ducts, and an exposed heater block and nozzle.
// Units: 1 = 100 mm. Origin at the carriage centre; the nozzle tip is at NOZZLE_TIP_Y.

export const NOZZLE_TIP_Y = -0.53;

/** A box with rounded vertical edges and softly bevelled faces. */
export function roundedBox(
  w: number,
  h: number,
  d: number,
  r: number
): THREE.ExtrudeGeometry {
  const s = new THREE.Shape();
  const x = -w / 2 + r;
  const y = -h / 2 + r;
  s.moveTo(x, -h / 2);
  s.lineTo(w / 2 - r, -h / 2);
  s.quadraticCurveTo(w / 2, -h / 2, w / 2, y);
  s.lineTo(w / 2, h / 2 - r);
  s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
  s.lineTo(x, h / 2);
  s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
  s.lineTo(-w / 2, y);
  s.quadraticCurveTo(-w / 2, -h / 2, x, -h / 2);
  const bevel = Math.min(r * 0.5, d * 0.2);
  const g = new THREE.ExtrudeGeometry(s, {
    depth: d - bevel * 2,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel * 0.8,
    bevelSegments: 4,
    curveSegments: 10,
  });
  g.translate(0, 0, -(d - bevel * 2) / 2);
  return g;
}

const BRASS = { color: '#c9a45c', metalness: 1, roughness: 0.28 };
const ALU = { color: '#c7c9ce', metalness: 0.9, roughness: 0.35 };

/** Seven pitched blades and a hub, spinning about z. */
const FanRotor: React.FC<{ radius: number; angle: number; color?: string }> = ({
  radius,
  angle,
  color = '#202024',
}) => (
  <group rotation={[0, 0, angle]}>
    <mesh rotation={[Math.PI / 2, 0, 0]}>
      <cylinderGeometry args={[radius * 0.34, radius * 0.34, 0.03, 32]} />
      <meshPhysicalMaterial color={color} roughness={0.4} clearcoat={0.5} />
    </mesh>
    {Array.from({ length: 7 }, (_, i) => (
      <group key={i} rotation={[0, 0, (i / 7) * Math.PI * 2]}>
        <mesh position={[radius * 0.64, 0, 0]} rotation={[0.55, 0, 0.18]}>
          <boxGeometry args={[radius * 0.62, radius * 0.3, 0.006]} />
          <meshStandardMaterial color={color} roughness={0.5} />
        </mesh>
      </group>
    ))}
  </group>
);

/** A thin wire that hangs from `from` to `to` with a little sag. */
const Wire: React.FC<{
  from: THREE.Vector3;
  to: THREE.Vector3;
  color: string;
  sag?: number;
}> = ({ from, to, color, sag = 0.05 }) => {
  const geo = useMemo(() => {
    const mid = from
      .clone()
      .lerp(to, 0.5)
      .add(new THREE.Vector3(0.04, -sag, 0.02));
    return new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3([from, mid, to]),
      24,
      0.007,
      8,
      false
    );
  }, [from, to, sag]);
  return (
    <mesh geometry={geo}>
      <meshStandardMaterial color={color} roughness={0.45} />
    </mesh>
  );
};

export const Toolhead: React.FC<{ frame: number; extruding?: boolean }> = ({
  frame,
  extruding = true,
}) => {
  const shroud = useMemo(() => roundedBox(0.52, 0.5, 0.42, 0.07), []);
  const face = useMemo(() => roundedBox(0.42, 0.38, 0.03, 0.05), []);
  const duct = useMemo(() => roundedBox(0.09, 0.2, 0.22, 0.03), []);
  const sock = useMemo(() => roundedBox(0.2, 0.11, 0.16, 0.035), []);
  const wires = useMemo(
    () => ({
      a: [
        new THREE.Vector3(-0.1, -0.36, 0.02),
        new THREE.Vector3(-0.17, -0.2, 0.05),
      ] as const,
      b: [
        new THREE.Vector3(-0.1, -0.37, -0.03),
        new THREE.Vector3(-0.19, -0.21, -0.02),
      ] as const,
    }),
    []
  );
  const fanAngle = -frame * 0.9;
  // The hot tip breathes very slightly, as a heater under PID control does.
  const glow = 1.6 + Math.sin(frame / 5) * 0.15;

  return (
    <group>
      {/* Shroud */}
      <mesh geometry={shroud}>
        <meshPhysicalMaterial
          color="#ececef"
          roughness={0.38}
          clearcoat={0.6}
          clearcoatRoughness={0.25}
        />
      </mesh>
      {/* Front faceplate with the hotend fan */}
      <mesh geometry={face} position={[0, 0.01, 0.215]}>
        <meshPhysicalMaterial
          color="#18181b"
          roughness={0.45}
          clearcoat={0.3}
        />
      </mesh>
      <group position={[0, 0.03, 0.235]}>
        <mesh>
          <torusGeometry args={[0.135, 0.012, 12, 64]} />
          <meshPhysicalMaterial
            color="#2c2c31"
            roughness={0.3}
            metalness={0.4}
          />
        </mesh>
        <mesh position={[0, 0, -0.012]}>
          <circleGeometry args={[0.13, 48]} />
          <meshStandardMaterial color="#060607" roughness={0.9} />
        </mesh>
        <FanRotor radius={0.12} angle={fanAngle} />
        {/* Grille spokes in front of the rotor */}
        {[0, 1, 2, 3].map((i) => (
          <mesh
            key={i}
            position={[0, 0, 0.012]}
            rotation={[0, 0, (i * Math.PI) / 4]}
          >
            <boxGeometry args={[0.26, 0.006, 0.004]} />
            <meshStandardMaterial
              color="#2c2c31"
              metalness={0.4}
              roughness={0.3}
            />
          </mesh>
        ))}
      </group>
      {/* Status light bar */}
      <mesh position={[0, -0.17, 0.235]}>
        <boxGeometry args={[0.16, 0.012, 0.004]} />
        <meshStandardMaterial
          color="#ffffff"
          emissive={COLOR.brand}
          emissiveIntensity={2.2}
          toneMapped={false}
        />
      </mesh>
      {/* Part-cooling ducts either side, angled at the nozzle */}
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          geometry={duct}
          position={[side * 0.2, -0.3, 0.02]}
          rotation={[0, 0, side * 0.35]}
        >
          <meshPhysicalMaterial
            color="#1d1d21"
            roughness={0.4}
            clearcoat={0.3}
          />
        </mesh>
      ))}
      {/* Heatsink fins, visible through the gap under the shroud */}
      {Array.from({ length: 6 }, (_, i) => (
        <mesh key={i} position={[0, -0.235 - i * 0.016, 0]}>
          <cylinderGeometry args={[0.07, 0.07, 0.007, 32]} />
          <meshStandardMaterial {...ALU} />
        </mesh>
      ))}
      {/* Heat break */}
      <mesh position={[0, -0.345, 0]}>
        <cylinderGeometry args={[0.018, 0.018, 0.05, 20]} />
        <meshStandardMaterial color="#9a9ca3" metalness={1} roughness={0.2} />
      </mesh>
      {/* Heater block in its silicone sock */}
      <mesh position={[0, -0.41, 0]}>
        <boxGeometry args={[0.17, 0.085, 0.13]} />
        <meshStandardMaterial {...ALU} />
      </mesh>
      <mesh geometry={sock} position={[0, -0.415, 0]}>
        <meshPhysicalMaterial
          color="#3b3d45"
          roughness={0.65}
          sheen={0.6}
          sheenColor="#8a90a0"
          transparent
          opacity={0.94}
        />
      </mesh>
      {/* Heater cartridge and thermistor wires */}
      <Wire from={wires.a[0]} to={wires.a[1]} color="#c62828" />
      <Wire from={wires.b[0]} to={wires.b[1]} color="#f2f2f2" />
      {/* Nozzle: hex flats, cone, tip */}
      <mesh position={[0, -0.47, 0]}>
        <cylinderGeometry args={[0.032, 0.032, 0.03, 6]} />
        <meshStandardMaterial {...BRASS} />
      </mesh>
      <mesh position={[0, -0.505, 0]}>
        <cylinderGeometry args={[0.024, 0.007, 0.04, 24]} />
        <meshStandardMaterial {...BRASS} />
      </mesh>
      <mesh position={[0, NOZZLE_TIP_Y + 0.003, 0]}>
        <sphereGeometry args={[0.008, 16, 12]} />
        <meshStandardMaterial
          color="#ff9a3c"
          emissive="#ff6a13"
          emissiveIntensity={glow}
          toneMapped={false}
        />
      </mesh>
      <pointLight
        position={[0, NOZZLE_TIP_Y - 0.03, 0.05]}
        intensity={0.35 * glow}
        distance={0.6}
        color="#ffb070"
      />
      {/* Fresh filament leaving the tip */}
      {extruding ? (
        <mesh position={[0, NOZZLE_TIP_Y - 0.012, 0]}>
          <cylinderGeometry args={[0.0085, 0.0085, 0.024, 12]} />
          <meshPhysicalMaterial
            color={COLOR.spool}
            roughness={0.2}
            clearcoat={0.8}
            emissive={COLOR.spool}
            emissiveIntensity={0.25}
          />
        </mesh>
      ) : null}
      {/* PTFE coupling on top */}
      <mesh position={[0, 0.27, -0.04]}>
        <cylinderGeometry args={[0.035, 0.035, 0.05, 6]} />
        <meshStandardMaterial {...ALU} />
      </mesh>
      {/* Carriage block that rides the linear rail behind */}
      <mesh position={[0, 0.12, -0.25]}>
        <boxGeometry args={[0.3, 0.14, 0.09]} />
        <meshStandardMaterial color="#b9bcc3" metalness={0.9} roughness={0.3} />
      </mesh>
    </group>
  );
};
