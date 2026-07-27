// components/ToucanGLB.tsx
//
// Rewritten from scratch for the toucan specifically. Two things about this
// model drive the design, and neither applies to the sparrows:
//
//  1. The beak is long and only reads side-on, so the bird is presented turned
//     away from the camera (see FACING in src/config/toucan.ts). Head-on, the
//     beak is foreshortened to nothing and the open jaw looks broken.
//
//  2. The rig's bones carry real rest rotations. So head tracking composes a
//     world-space swing ON TOP of the rest pose rather than assigning euler
//     angles, which would wipe the rest out and skew the beak halves.
//
"use client";

import React, { useEffect, useMemo, useRef, RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF, useAnimations } from "@react-three/drei";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";
import * as THREE from "three";
import { toucanConfig as CFG } from "@/config/toucan";

const MODEL = "/models/toucan.glb";
const deg = THREE.MathUtils.degToRad;

interface ToucanGLBProps {
  containerRef: RefObject<HTMLDivElement>;
}

export default function ToucanGLB({ containerRef }: ToucanGLBProps) {
  const gltf = useGLTF(MODEL) as unknown as {
    scene: THREE.Group;
    animations: THREE.AnimationClip[];
  };

  // useGLTF caches and SHARES the scene object across mounts. We rotate the
  // head bone every frame, so reusing it means a remount inherits the previous
  // rotation — and reading "rest" from it would bake that in and compound on
  // every hot reload. Clone so this mount owns a pristine skeleton.
  const scene = useMemo(
    () => cloneSkeleton(gltf.scene) as THREE.Group,
    [gltf.scene]
  );

  // The untouched cached scene is our source of truth for the rest pose.
  const restQuat = useMemo(() => {
    const h = gltf.scene.getObjectByName("Head");
    return h ? h.quaternion.clone() : new THREE.Quaternion();
  }, [gltf.scene]);

  // Keep only the beak tracks; Head/Body must stay free for tracking.
  const clips = useMemo(
    () =>
      gltf.animations.map(
        (c) =>
          new THREE.AnimationClip(
            c.name,
            c.duration,
            c.tracks.filter(
              (t) => !t.name.startsWith("Head") && !t.name.startsWith("Body")
            )
          )
      ),
    [gltf.animations]
  );
  const { actions } = useAnimations(clips, scene);

  const head = useRef<THREE.Object3D | null>(null);
  const pointer = useRef({ x: 0, y: 0 });
  const eased = useRef({ yaw: 0, pitch: 0 });
  const lastMouse = useRef({ x: 0, y: 0 });

  // parent world rotation, captured once (Body is never animated)
  const parentQ = useRef(new THREE.Quaternion());
  const parentInv = useRef(new THREE.Quaternion());
  const primed = useRef(false);

  /* ── grab the head bone and force it to the true rest pose ── */
  useEffect(() => {
    const h = scene.getObjectByName("Head");
    if (!h) {
      console.warn("[Toucan] Head bone not found");
      return;
    }
    head.current = h;
    h.quaternion.copy(restQuat);
    eased.current = { yaw: 0, pitch: 0 };
    primed.current = false;
  }, [scene, restQuat]);

  /* ── beak loop ── */
  useEffect(() => {
    if (!CFG.BEAK.ENABLED) return;
    const key = Object.keys(actions)[0];
    const a = key ? actions[key] : null;
    if (!a) {
      console.warn("[Toucan] no beak animation found");
      return;
    }
    a.reset().setLoop(THREE.LoopRepeat, Infinity);
    a.timeScale = CFG.BEAK.SPEED;
    a.play();
    return () => void a.stop();
  }, [actions]);

  /* ── pointer ── */
  useEffect(() => {
    if (!CFG.LOOK.ENABLED) return;
    const { TRAVEL_X, TRAVEL_Y, HEAD_HEIGHT_FRAC, FLIP_X, FLIP_Y } = CFG.LOOK;

    const read = (mx: number, my: number) => {
      lastMouse.current = { x: mx, y: my };
      const el = containerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      // measure from where the head actually sits, not the canvas centre
      const hx = r.left + r.width / 2;
      const hy = r.top + r.height * HEAD_HEIGHT_FRAC;
      const nx = THREE.MathUtils.clamp((mx - hx) / TRAVEL_X, -1, 1);
      const ny = THREE.MathUtils.clamp((my - hy) / TRAVEL_Y, -1, 1);
      pointer.current.x = FLIP_X ? -nx : nx;
      pointer.current.y = FLIP_Y ? -ny : ny;
    };

    const onMove = (e: MouseEvent) => read(e.clientX, e.clientY);
    const onReflow = () => read(lastMouse.current.x, lastMouse.current.y);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("scroll", onReflow);
    window.addEventListener("resize", onReflow);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("scroll", onReflow);
      window.removeEventListener("resize", onReflow);
    };
  }, [containerRef]);

  // scratch, reused each frame
  const e = useMemo(() => new THREE.Euler(0, 0, 0, "YXZ"), []);
  const swing = useMemo(() => new THREE.Quaternion(), []);
  const result = useMemo(() => new THREE.Quaternion(), []);

  useFrame(() => {
    const h = head.current;
    if (!h || !CFG.LOOK.ENABLED) return;

    if (!primed.current) {
      if (!h.parent) return;
      h.parent.updateWorldMatrix(true, false);
      h.parent.getWorldQuaternion(parentQ.current);
      parentInv.current.copy(parentQ.current).invert();
      primed.current = true;
    }

    const L = CFG.LOOK;
    const tYaw = deg(L.REST_YAW) + pointer.current.x * deg(L.YAW_RANGE);
    const tPitch = deg(L.REST_PITCH) + pointer.current.y * deg(L.PITCH_RANGE);
    eased.current.yaw += (tYaw - eased.current.yaw) * L.EASING;
    eased.current.pitch += (tPitch - eased.current.pitch) * L.EASING;

    // Swing is built in WORLD axes (Y up, X sideways) so it stays intuitive no
    // matter how the bones are oriented, then converted into the bone's local
    // space and applied on top of rest:   local = parent⁻¹ · swing · parent · rest
    // Preserving `rest` is what keeps the two beak halves aligned to the head.
    e.set(eased.current.pitch, eased.current.yaw, 0, "YXZ");
    swing.setFromEuler(e);
    result
      .copy(parentInv.current)
      .multiply(swing)
      .multiply(parentQ.current)
      .multiply(restQuat);
    h.quaternion.copy(result);
  });

  return (
    <primitive
      object={scene}
      position={[...CFG.POSITION] as [number, number, number]}
      scale={CFG.SCALE}
      rotation={[0, deg(CFG.FACING), 0]}
    />
  );
}

useGLTF.preload(MODEL);
