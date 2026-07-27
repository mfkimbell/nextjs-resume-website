// components/WoodpeckerScene.tsx
"use client";

import React, { useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import WoodpeckerGLB from "./WoodpeckerGLB";

export default function WoodpeckerScene() {
  const containerRef = useRef<HTMLDivElement>(null!);

  return (
    <div
      ref={containerRef}
      className="w-[260px] h-[260px] sm:w-[300px] sm:h-[300px] pointer-events-none"
    >
      <Canvas camera={{ position: [0, 0.6, 4], fov: 40 }}>
        <ambientLight intensity={2.4} />
        <directionalLight position={[5, 10, 5]} intensity={3.0} color="#7fcfff" />
        <WoodpeckerGLB containerRef={containerRef} />
        <OrbitControls enableZoom={false} enablePan={false} />
      </Canvas>
    </div>
  );
}
