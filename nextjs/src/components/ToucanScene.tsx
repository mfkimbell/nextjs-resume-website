// components/ToucanScene.tsx
"use client";

import React, { useRef } from "react";
import { Canvas } from "@react-three/fiber";
import ToucanGLB from "./ToucanGLB";
import BranchGLB from "./BranchGLB";
import { toucanConfig as CFG } from "@/config/toucan";

export default function ToucanScene() {
  const containerRef = useRef<HTMLDivElement>(null!);

  return (
    // Wide canvas: the bough runs the full width and off both edges.
    <div
      ref={containerRef}
      className="w-full h-[320px] sm:h-[440px] md:h-[520px] pointer-events-none"
    >
      <Canvas camera={{ position: [0, 0, CFG.CAMERA_Z], fov: 40 }}>
        <ambientLight intensity={2.4} />
        <directionalLight
          position={[5, 10, 5]}
          intensity={3.0}
          color="#7fcfff"
        />
        <BranchGLB />
        <ToucanGLB containerRef={containerRef} />
      </Canvas>
    </div>
  );
}
