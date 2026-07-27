// components/BranchGLB.tsx
//
// The bough the toucan perches on. Procedurally generated low-poly geometry
// with baked vertex colours (COLOR_0), so there's no texture to load and no
// animation — it's static scenery.
//
// It's deliberately larger than the canvas: the thick end and the foliage both
// run off frame, which is what makes it read as a branch rather than a twig.
"use client";

import React, { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";
import * as THREE from "three";
import { toucanConfig as CFG } from "@/config/toucan";

const MODEL = "/models/branch.glb";
const deg = THREE.MathUtils.degToRad;

export default function BranchGLB() {
  const gltf = useGLTF(MODEL) as unknown as { scene: THREE.Group };

  // useGLTF caches and shares the scene; clone so mounting this twice (or a
  // hot reload) can't hand two mounts the same object.
  const scene = useMemo(
    () => cloneSkeleton(gltf.scene) as THREE.Group,
    [gltf.scene]
  );

  const B = CFG.BRANCH;
  if (!B.SHOW) return null;

  return (
    <primitive
      object={scene}
      position={[...B.POSITION] as [number, number, number]}
      scale={B.SCALE}
      rotation={[0, deg(B.YAW), 0]}
    />
  );
}

useGLTF.preload(MODEL);
