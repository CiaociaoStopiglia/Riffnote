// src/app/components/VinylRecord.jsx
'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Sparkles } from '@react-three/drei';

const GROOVE_COUNT = 20;

export default function VinylRecord({ pointer }) {
  const tilt = useRef();
  const disc = useRef();
  const reducedMotion =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useFrame((state, delta) => {
    // giro constante, como um prato de toca-discos tocando
    if (disc.current && !reducedMotion) {
      disc.current.rotation.y += delta * 0.16;
    }
    // paralaxe com atraso — segue o mouse como física real, não instantâneo
    if (tilt.current) {
      const targetX = Math.PI / 2 + pointer.current.y * 0.1;
      const targetZ = pointer.current.x * 0.14;
      tilt.current.rotation.x += (targetX - tilt.current.rotation.x) * 0.045;
      tilt.current.rotation.z += (targetZ - tilt.current.rotation.z) * 0.045;
    }
  });

  const grooves = Array.from({ length: GROOVE_COUNT }, (_, i) => {
    const radius = 1.56 - i * (1.14 / GROOVE_COUNT);
    return (
      <mesh key={i} position={[0, 0.081 + i * 0.0002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[radius, 0.005, 8, 72]} />
        {/* clearcoat imita o verniz brilhante do vinil de verdade —
            diferente de metal, o brilho fica concentrado e realista */}
        <meshPhysicalMaterial
          color="#040304"
          roughness={0.3}
          metalness={0.04}
          clearcoat={0.85}
          clearcoatRoughness={0.22}
        />
      </mesh>
    );
  });

  return (
    <group>
      {/* tapete do prato — dá contexto físico, "aterra" o disco no espaço */}
      <mesh position={[0, -0.1, -0.35]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[1.92, 1.92, 0.03, 72]} />
        <meshStandardMaterial color="#0a0809" roughness={0.9} metalness={0} />
      </mesh>

      <group ref={tilt} rotation={[Math.PI / 2, 0, 0]}>
        <group ref={disc}>
          <mesh>
            <cylinderGeometry args={[1.62, 1.62, 0.16, 96]} />
            <meshPhysicalMaterial
              color="#0c0a0c"
              roughness={0.34}
              metalness={0.06}
              clearcoat={1}
              clearcoatRoughness={0.16}
            />
          </mesh>

          {grooves}

          <group position={[0, 0.09, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <mesh>
              <circleGeometry args={[0.44, 64]} />
              <meshPhysicalMaterial
                color="#c9432b"
                roughness={0.42}
                metalness={0.08}
                clearcoat={0.5}
                emissive="#3a0d07"
                emissiveIntensity={0.18}
              />
            </mesh>
            <Text
              position={[0, 0.06, 0.002]}
              fontSize={0.09}
              color="#170905"
              anchorX="center"
              anchorY="middle"
              letterSpacing={0.02}
            >
              Riffnote
            </Text>
            <Text
              position={[0, -0.09, 0.002]}
              fontSize={0.042}
              color="#170905"
              anchorX="center"
              anchorY="middle"
            >
              Side A · 33⅓ rpm
            </Text>
            <mesh position={[0, 0, 0.003]}>
              <circleGeometry args={[0.034, 32]} />
              <meshStandardMaterial color="#050405" />
            </mesh>
          </group>
        </group>
      </group>

      {/* poeira suspensa no ar — atmosfera, sugere um ambiente real de estúdio */}
      <Sparkles count={26} scale={[4.2, 3, 2.2]} size={1.4} speed={0.22} color="#ede6d6" opacity={0.28} />
    </group>
  );
}