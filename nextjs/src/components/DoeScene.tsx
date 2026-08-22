// components/DoeScene.tsx
"use client";

import type { CSSProperties } from "react";
import { Canvas } from "@react-three/fiber";
import DoeGLB from "./DoeGLB";

export default function DoeScene({
  className = "",
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={`pointer-events-none absolute ${className}`}
      style={style}
      aria-hidden="true"
    >
      <Canvas
        camera={{ position: [0, 0.45, 5], fov: 34 }}
        gl={{ alpha: true, antialias: true }}
      >
        <ambientLight intensity={1.35} />
        <directionalLight position={[3, 4, 5]} intensity={2.25} color="#fff2cf" />
        <directionalLight position={[-3, 1, 2]} intensity={0.55} color="#b9d4f0" />
        <DoeGLB />
      </Canvas>
    </div>
  );
}
