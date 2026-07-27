// components/WoodpeckerGLB.tsx
"use client";

import React, { useEffect, useMemo, useRef, RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF, useAnimations } from "@react-three/drei";
import * as THREE from "three";

interface GLTFResult {
  scene: THREE.Group;
  animations: THREE.AnimationClip[];
}

interface WoodpeckerGLBProps {
  containerRef: RefObject<HTMLDivElement>;
}

export default function WoodpeckerGLB({ containerRef }: WoodpeckerGLBProps) {
  const { scene, animations } = useGLTF("/models/woodpecker.glb") as GLTFResult;

  // Drop any Head/Body tracks so a re-export can never fight the pointer-driven
  // head rotation below. The LowerBeak jaw track is what we want to keep.
  const beakOnlyClips = useMemo(
    () =>
      animations.map(
        (clip) =>
          new THREE.AnimationClip(
            clip.name,
            clip.duration,
            clip.tracks.filter(
              (t) => !t.name.startsWith("Head") && !t.name.startsWith("Body")
            )
          )
      ),
    [animations]
  );
  const { actions } = useAnimations(beakOnlyClips, scene);

  const head = useRef<THREE.Object3D>(null!);
  const cursor = useRef({ x: 0, y: 0 });
  const lastMousePos = useRef({ x: 0, y: 0 });

  /* ─── tuneable knobs ─── */
  const MAX_YAW = 0.5; // left/right swing (radians)
  const MAX_PITCH = 0.28; // up/down swing (radians)
  const DECAY = 0.1; // smoothing toward target
  const X_RANGE = 420; // px of pointer travel for full yaw
  const Y_RANGE = 320; // px of pointer travel for full pitch
  const INVERT_X = 1; // flip to -1 if it turns the wrong way
  const INVERT_Y = 1;

  useEffect(() => {
    const h = scene.getObjectByName("Head");
    if (h) {
      head.current = h;
      head.current.rotation.order = "YXZ";
    } else {
      console.warn("[WoodpeckerGLB] Head bone not found on woodpecker.glb");
    }
  }, [scene]);

  useEffect(() => {
    const name = actions["WoodpeckerTalk"] ? "WoodpeckerTalk" : Object.keys(actions)[0];
    const talk = name ? actions[name] : null;
    if (!talk) {
      console.warn("[WoodpeckerGLB] no beak animation found on woodpecker.glb");
      return;
    }
    talk.reset().setLoop(THREE.LoopRepeat, Infinity).play();
    return () => {
      talk.stop();
    };
  }, [actions]);

  useEffect(() => {
    const updatePointer = (clientX: number, clientY: number) => {
      lastMousePos.current = { x: clientX, y: clientY };
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      cursor.current.x =
        THREE.MathUtils.clamp((clientX - cx) / X_RANGE, -1, 1) * INVERT_X;
      cursor.current.y =
        THREE.MathUtils.clamp((clientY - cy) / Y_RANGE, -1, 1) * INVERT_Y;
    };
    const onMouseMove = (e: MouseEvent) => updatePointer(e.clientX, e.clientY);
    const onScrollResize = () =>
      updatePointer(lastMousePos.current.x, lastMousePos.current.y);

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("scroll", onScrollResize);
    window.addEventListener("resize", onScrollResize);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("scroll", onScrollResize);
      window.removeEventListener("resize", onScrollResize);
    };
  }, [containerRef]);

  useFrame(() => {
    if (!head.current) return;
    // Model is Y-up after glTF conversion and faces +Z, so yaw is about Y and
    // pitch about X.
    const tgtYaw = cursor.current.x * MAX_YAW;
    const tgtPitch = cursor.current.y * MAX_PITCH;
    head.current.rotation.y += (tgtYaw - head.current.rotation.y) * DECAY;
    head.current.rotation.x += (tgtPitch - head.current.rotation.x) * DECAY;
  });

  return (
    <primitive
      object={scene}
      position={[0, -1.3, 0]}
      scale={0.34}
      rotation={[0, 0, 0]}
    />
  );
}

useGLTF.preload("/models/woodpecker.glb");
