// components/ParrotGLB.tsx
"use client";

import React, { useEffect, useMemo, useRef, RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF, useAnimations } from "@react-three/drei";
import * as THREE from "three";

interface GLTFResult {
  scene: THREE.Group;
  animations: THREE.AnimationClip[];
}

interface ParrotGLBProps {
  containerRef: RefObject<HTMLDivElement>;
}

export default function ParrotGLB({ containerRef }: ParrotGLBProps) {
  /* ─── load model ─── */
  const { scene, animations } = useGLTF("/models/parrot.glb") as GLTFResult;

  // Drop any Head/Body tracks so a re-export can never fight the pointer-driven
  // head rotation below. Everything else (the LowerBeak jaw track) is kept.
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

  /* ─── refs ─── */
  const head = useRef<THREE.Object3D>(null!);
  const cursor = useRef({ x: 0, y: 0 });
  const lastMousePos = useRef({ x: 0, y: 0 });

  /* ─── tuneable knobs ─── */
  const BASE_YAW = 0.0; // resting head yaw
  const BASE_PITCH = 0.0; // resting head pitch

  const MAX_YAW = 0.55; // how far the head turns left/right (radians)
  const MAX_PITCH = 0.32; // how far it tips up/down (radians)

  const DECAY = 0.1; // smoothing toward the target
  const FIXED_X_RANGE = 420; // px of pointer travel for full yaw
  const FIXED_Y_RANGE = 320; // px of pointer travel for full pitch
  const INVERT_X = 1;
  const INVERT_Y = 1;

  /* ─── grab the Head bone ─── */
  useEffect(() => {
    const h = scene.getObjectByName("Head");
    if (h) {
      head.current = h;
      head.current.rotation.order = "ZYX";
    } else {
      console.warn("[ParrotGLB] Head bone not found on parrot.glb");
    }
  }, [scene]);

  /* ─── play the beak talk loop forever ─── */
  useEffect(() => {
    const name = actions["ParrotBeakTalk"] ? "ParrotBeakTalk" : Object.keys(actions)[0];
    const talk = name ? actions[name] : null;
    if (!talk) {
      console.warn("[ParrotGLB] no beak animation found on parrot.glb");
      return;
    }
    talk.reset().setLoop(THREE.LoopRepeat, Infinity).play();
    return () => {
      talk.stop();
    };
  }, [actions]);

  /* ─── pointer tracking ─── */
  useEffect(() => {
    const updatePointer = (clientX: number, clientY: number) => {
      lastMousePos.current = { x: clientX, y: clientY };
      const el = containerRef.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;

      cursor.current.x = THREE.MathUtils.clamp((clientX - cx) / FIXED_X_RANGE, -1, 1) * INVERT_X;
      cursor.current.y = THREE.MathUtils.clamp((clientY - cy) / FIXED_Y_RANGE, -1, 1) * INVERT_Y;
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

  /* ─── ease the head toward the pointer each frame ─── */
  useFrame(() => {
    if (!head.current) return;

    // The parrot faces +X, so yaw is a rotation about Z and pitch about Y.
    const tgtYaw = BASE_YAW + cursor.current.x * MAX_YAW;
    const tgtPitch = BASE_PITCH + cursor.current.y * MAX_PITCH;

    head.current.rotation.z += (tgtYaw - head.current.rotation.z) * DECAY;
    head.current.rotation.y += (tgtPitch - head.current.rotation.y) * DECAY;
  });

  /* ─── render ─── */
  return (
    <primitive
      object={scene}
      position={[0, -0.55, 0]}
      scale={2.6}
      rotation={[0, 0, -0.5]} /* turn the bird toward the viewer */
    />
  );
}

useGLTF.preload("/models/parrot.glb");
