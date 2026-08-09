// components/WoodpeckerScene.tsx
"use client";

import React, { useRef } from "react";
import { Canvas } from "@react-three/fiber";
import WoodpeckerGLB from "./WoodpeckerGLB";

/**
 * Transparent overlay canvas. The tree the bird clings to is painted by the
 * page behind this widget, so nothing is drawn here except the bird itself.
 * See woodpeckerLayout.ts for how the bird is aligned to that tree.
 */
export default function WoodpeckerScene() {
  const containerRef = useRef<HTMLDivElement>(null!);

  return (
    <div
      ref={containerRef}
      className="w-[260px] h-[260px] sm:w-[300px] sm:h-[300px] pointer-events-none"
    >
      <Canvas camera={{ position: [0, 0.15, 4], fov: 35 }}>
        <ambientLight intensity={2.2} />
        <directionalLight position={[3, 5, 4]} intensity={3.0} color="#fff0cf" />
        <directionalLight position={[-2, 2, 3]} intensity={1.4} color="#7fcfff" />
        <WoodpeckerGLB containerRef={containerRef} />
      </Canvas>
    </div>
  );
}
