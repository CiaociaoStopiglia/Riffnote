// src/app/components/VinylScene.jsx
'use client';

import { useRef, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import VinylRecord from './VinylRecord';

// Deriva lenta e contínua da câmera — dá vida à cena mesmo parada,
// como uma câmera de estúdio nunca fica 100% imóvel.
function CameraDrift() {
  useFrame(({ camera, clock }) => {
    const t = clock.getElapsedTime();
    camera.position.x = Math.sin(t * 0.15) * 0.14;
    camera.position.y = Math.cos(t * 0.12) * 0.08;
    camera.lookAt(0, 0, 0);
  });
  return null;
}

export default function VinylScene() {
  const pointer = useRef({ x: 0, y: 0 });

  function handlePointerMove(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    pointer.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.current.y = ((e.clientY - rect.top) / rect.height) * 2 - 1;
  }

  function handlePointerLeave() {
    pointer.current = { x: 0, y: 0 };
  }

  return (
    <div
      style={{ width: '100%', height: '100%' }}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      <Canvas camera={{ position: [0, 0, 5.6], fov: 30 }} dpr={[1, 1.6]}>
        <ambientLight intensity={0.5} />
        <pointLight position={[3, 3, 4]} intensity={48} color="#f2ded0" />
        <pointLight position={[-3.5, -2, 3]} intensity={22} color="#c9432b" />
        <pointLight position={[0, -3, 2]} intensity={10} color="#8a9a5b" />
        <CameraDrift />
        <Suspense fallback={null}>
          <VinylRecord pointer={pointer} />
        </Suspense>
      </Canvas>
    </div>
  );
}