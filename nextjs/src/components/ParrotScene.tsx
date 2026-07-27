// components/ParrotScene.tsx
"use client";

import React, { useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import ParrotGLB from "./ParrotGLB";

export default function ParrotScene() {
  const containerRef = useRef<HTMLDivElement>(null!);

  return (
    <div
      ref={containerRef}
      className="w-[260px] h-[260px] sm:w-[300px] sm:h-[300px] pointer-events-none"
    >
      <Canvas camera={{ position: [0, 0.6, 3], fov: 40 }}>
        <ambientLight intensity={2.6} />
        <directionalLight position={[5, 10, 5]} intensity={3.2} color="#7fcfff" />
        <ParrotGLB containerRef={containerRef} />
        <OrbitControls enableZoom={false} enablePan={false} />
      </Canvas>
    </div>
  );
}
