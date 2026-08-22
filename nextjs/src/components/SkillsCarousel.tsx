// src/components/SkillsCarousel.tsx
"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useAnimations, useGLTF } from "@react-three/drei";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";
import * as THREE from "three";

// =========== CONFIG ===========
// Every knob for the skills carousel lives here. Only edit values in this block.
const CONFIG = {
  // How many birds are on screen at once. Higher = more birds, more GPU cost.
  N_VISIBLE: 4,

  // ---------- Flight path (straight line from START → END) ----------
  //   X: - = left of center,  + = right of center
  //   Y: - = down,            + = up
  //   Z: - = further from camera (back), + = closer to camera
  START: { X: -36, Y: 0, Z: -12 },
  END:   { X:  12, Y: 1, Z:   0 },
  TRAVEL_SEC: 10,   // seconds for one bird to fly the whole path

  // ---------- Bird orientation ----------
  // The bird holds ONE fixed rotation for its entire flight — no turning
  // mid-flight, no perspective drift. Three knobs, applied around the bird's
  // own center in this order: pitch (X) → yaw (Y) → roll (Z).
  //
  //   YAW_DEG:   which way the bird's beak points, in degrees.
  //                0   = beak toward camera (+Z world)
  //               90   = beak to viewer's right (+X world)
  //              180   = beak away from camera (-Z world)
  //              -90   = beak to viewer's left (-X world)
  //   PITCH_DEG: + = nose up,        - = nose down
  //   ROLL_DEG:  + = right wing dips, - = left wing dips
  //
  // If you want the bird to auto-face its motion direction, flip
  // AUTO_ORIENT to true. Then YAW_DEG becomes an ADDITIVE offset on top
  // of the computed travel yaw. Leave AUTO_ORIENT false for a fully
  // predictable static pose.
  AUTO_ORIENT: false,
  YAW_DEG: 90,      // face right (matches the START→END X direction)
  PITCH_DEG: 0,
  ROLL_DEG: 0,

  // ---------- Wing-flap animation ----------
  // The rigged flap clip rotates MANY bones — head, tail, neck, spine, root,
  // center — not just the wings. That body-sway looks like the bird is
  // turning. `LOCK_BONES` lists substrings (case-insensitive) of bone names
  // whose animation tracks are STRIPPED before playing, so those bones stay
  // at their bind pose while everything else (wings, arms, shoulders) still
  // flaps normally.
  //
  //   Empty array []      → play the clip untouched (full body sway).
  //   Default set below   → wings flap, body stays put. Recommended.
  //   Add 'wing'/'arm'    → freeze wings too, effectively kill the animation.
  //
  // Tip: check the browser console — the first render logs each bird's bone
  // names so you can add/remove entries confidently.
  LOCK_BONES: [
    "root",
    "spine",
    "neck",
    "head",
    "tail",
    "body",
    "torso",
    "chest",
    "hip",
    "pelvis",
    "center",
  ] as ReadonlyArray<string>,

  // ANIMATE_WINGS = false → freeze the bird entirely (no flap at all).
  // FLAP_SPEED_MULT: 1 = clip's default rate, <1 slower, >1 faster.
  ANIMATE_WINGS: true,
  FLAP_SPEED_MULT: 1.0,

  // If true, all birds' flap animations start at the same phase (they beat in
  // unison). If false, each slot uses a seeded random phase so they look
  // independent.
  SYNC_FLAP_PHASE: false,

  // Small random yaw variation per bird slot so they don't all present the
  // exact same silhouette. 0 = no jitter.
  YAW_JITTER_DEG: 0,

  // Per-slot yaw overrides (degrees). Non-zero entry replaces YAW_DEG for that
  // slot. Use e.g. [0, 45, 90, -45] to have each of the 4 birds face a
  // different absolute direction. Leave zeros to inherit the global YAW_DEG.
  SLOT_YAW_OVERRIDE_DEG: [0, 0, 0, 0] as ReadonlyArray<number>,

  // Per-slot scale multiplier on BIRD_TARGET_SIZE. 1 = default size.
  SLOT_SCALE_MULT: [1, 1, 1, 1] as ReadonlyArray<number>,

  // ---------- Motion feel ----------
  // Vertical bob amplitude and frequency during flight. Set BOB_AMP=0 to
  // fly perfectly flat.
  BOB_AMP: 0.15,
  BOB_CYCLES: 3,

  // Per-slot Y/Z offsets so birds fly in different lanes (avoid overlap).
  SLOT_Y_OFFSETS: [0, 0, 0, 0] as ReadonlyArray<number>,
  SLOT_Z_OFFSETS: [0, 0, 0, 0] as ReadonlyArray<number>,
  // Per-slot speed multiplier — 1 = normal. Use to desync slots.
  SLOT_SPEED_MULT: [1, 1, 1, 1] as ReadonlyArray<number>,

  // ---------- Sizes & anchors ----------
  BIRD_TARGET_SIZE: 1.8,    // bird normalized so its largest bbox dim = this
  ICON_SCALE: 0.9,          // multiplied on the icon GLB
  ICON_OFFSET_X: 0,
  ICON_GAP: 0.05,           // vertical gap between bird's feet and icon top
  ICON_OFFSET_Z: 0,

  // ---------- Camera ----------
  CAMERA_X: 0,
  CAMERA_Y: 0.15,
  CAMERA_Z: 6.5,
  CAMERA_FOV: 42,
} as const;

const deg = (d: number) => (d * Math.PI) / 180;
// ==============================

const SKILLS = [
  { label: "React", glb: "/icons_glb/react.glb" },
  { label: "NextJS", glb: "/icons_glb/nextjs.glb" },
  { label: "Typescript", glb: "/icons_glb/typescript.glb" },
  { label: "Python", glb: "/icons_glb/python.glb" },
  { label: "C#", glb: "/icons_glb/csharp.glb" },
  { label: ".NET8", glb: "/icons_glb/dotnet.glb" },
  { label: "AWS", glb: "/icons_glb/aws.glb" },
  { label: "Bedrock", glb: "/icons_glb/bedrock.glb" },
  { label: "TensorFlow", glb: "/icons_glb/tensorflow.glb" },
  { label: "PyTorch", glb: "/icons_glb/pytorch.glb" },
  { label: "Google Cloud", glb: "/icons_glb/googlecloud.glb" },
  { label: "Kubernetes", glb: "/icons_glb/kubernetes.glb" },
  { label: "Kafka", glb: "/icons_glb/kafka.glb" },
  { label: "Harness", glb: "/icons_glb/harness.glb" },
  { label: "Github Actions", glb: "/icons_glb/githubactions.glb" },
  { label: "Ansible", glb: "/icons_glb/ansible.glb" },
  { label: "Docker", glb: "/icons_glb/docker.glb" },
  { label: "Postgres", glb: "/icons_glb/postgres.glb" },
  { label: "Terraform", glb: "/icons_glb/terraform.glb" },
];

const BIRD_URLS = [
  "/birds/blue_orange_bird.glb",
  "/birds/crow.glb",
  "/birds/grey_bird.glb",
  "/birds/orange_bird.glb",
  "/birds/red_owl.glb",
  "/birds/seagull.glb",
  "/birds/tan_blue_bird.glb",
  "/birds/white_owl.glb",
  "/birds/white_tan_bird.glb",
];

function Bird({
  url,
  seed,
  scaleMult,
  onBottomY,
}: {
  url: string;
  seed: number;
  scaleMult: number;
  onBottomY?: (y: number) => void;
}) {
  const { scene: source, animations } = useGLTF(url) as unknown as {
    scene: THREE.Group;
    animations: THREE.AnimationClip[];
  };
  const { model, bottomY } = useMemo(() => {
    const s = cloneSkeleton(source) as THREE.Group;
    const box = new THREE.Box3().setFromObject(s);
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    s.scale.setScalar((CONFIG.BIRD_TARGET_SIZE * scaleMult) / maxDim);
    const box2 = new THREE.Box3().setFromObject(s);
    const center = new THREE.Vector3();
    box2.getCenter(center);
    s.position.set(-center.x, -center.y, -center.z);
    const scaledSize = new THREE.Vector3();
    box2.getSize(scaledSize);
    return { model: s, bottomY: -scaledSize.y / 2 };
  }, [source, scaleMult]);

  useEffect(() => {
    onBottomY?.(bottomY);
  }, [bottomY, onBottomY]);

  // Strip tracks belonging to locked bones (body/spine/head/etc.) so those
  // bones stay at their bind pose while wing/arm tracks still animate.
  const filteredAnimations = useMemo(() => {
    if (!CONFIG.ANIMATE_WINGS) return [];
    if (!CONFIG.LOCK_BONES.length) return animations;
    const patterns = CONFIG.LOCK_BONES.map((p) => p.toLowerCase());
    return animations.map((clip) => {
      const kept = clip.tracks.filter((t) => {
        // Track names look like "bone_name.rotation" or "bone_name.position".
        // The bone name is everything before the first dot.
        const boneName = (t.name.split(".")[0] || "").toLowerCase();
        return !patterns.some((p) => boneName.includes(p));
      });
      return new THREE.AnimationClip(clip.name, clip.duration, kept);
    });
  }, [animations]);

  const { actions } = useAnimations(filteredAnimations, model);

  useEffect(() => {
    if (!CONFIG.ANIMATE_WINGS) return;
    const flap =
      Object.entries(actions).find(([name]) => /fly|flap|idle/i.test(name))?.[1] ??
      Object.values(actions).find(Boolean);
    if (!flap) return;
    flap.reset().setLoop(THREE.LoopRepeat, Infinity).play();
    flap.time = CONFIG.SYNC_FLAP_PHASE ? 0 : (seed * 0.37) % 2;
    flap.timeScale = CONFIG.SYNC_FLAP_PHASE
      ? CONFIG.FLAP_SPEED_MULT
      : (0.95 + ((seed * 0.113) % 1) * 0.35) * CONFIG.FLAP_SPEED_MULT;
    return () => {
      flap.stop();
    };
  }, [actions, seed]);

  return <primitive object={model} />;
}

function IconGLB({ url, birdBottomY }: { url: string; birdBottomY: number }) {
  const { scene: source } = useGLTF(url) as unknown as { scene: THREE.Group };
  const { model, positionY } = useMemo(() => {
    const m = cloneSkeleton(source) as THREE.Group;
    // Measure the icon at scale=1 (its natural glTF units), then compute where
    // the group needs to sit so its scaled top edge touches the bird's feet.
    const box = new THREE.Box3().setFromObject(m);
    const center = new THREE.Vector3();
    const size = new THREE.Vector3();
    box.getCenter(center);
    box.getSize(size);
    // Center the icon at the group origin so scaling & offsets are predictable.
    m.position.set(-center.x, -center.y, -center.z);
    const scaledHalfHeight = (size.y * CONFIG.ICON_SCALE) / 2;
    return {
      model: m,
      // top of icon (in parent frame) = positionY + scaledHalfHeight
      // we want that == birdBottomY - GAP
      positionY: birdBottomY - CONFIG.ICON_GAP - scaledHalfHeight,
    };
  }, [source, birdBottomY]);
  return (
    <primitive
      object={model}
      scale={CONFIG.ICON_SCALE}
      position={[CONFIG.ICON_OFFSET_X, positionY, CONFIG.ICON_OFFSET_Z]}
    />
  );
}

function FlyingSlot({
  initialSkillIdx,
  slotIndex,
  onHover,
}: {
  initialSkillIdx: number;
  slotIndex: number;
  onHover: (label: string | null) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const rotRef = useRef<THREE.Group>(null);
  const [skillIdx, setSkillIdx] = useState(initialSkillIdx);
  const [birdBottomY, setBirdBottomY] = useState(-CONFIG.BIRD_TARGET_SIZE / 2);
  const startTimeRef = useRef<number | null>(null);

  const yaw_jitter = useMemo(() => {
    if (CONFIG.YAW_JITTER_DEG === 0) return 0;
    const hash = Math.sin(slotIndex * 12.9898) * 43758.5453;
    return ((hash - Math.floor(hash)) * 2 - 1) * CONFIG.YAW_JITTER_DEG;
  }, [slotIndex]);
  const slotYOff = CONFIG.SLOT_Y_OFFSETS[slotIndex % CONFIG.SLOT_Y_OFFSETS.length] ?? 0;
  const slotZOff = CONFIG.SLOT_Z_OFFSETS[slotIndex % CONFIG.SLOT_Z_OFFSETS.length] ?? 0;
  const slotSpeed =
    CONFIG.SLOT_SPEED_MULT[slotIndex % CONFIG.SLOT_SPEED_MULT.length] ?? 1;
  const slotYawOverride =
    CONFIG.SLOT_YAW_OVERRIDE_DEG[slotIndex % CONFIG.SLOT_YAW_OVERRIDE_DEG.length] ?? 0;
  const slotScale =
    CONFIG.SLOT_SCALE_MULT[slotIndex % CONFIG.SLOT_SCALE_MULT.length] ?? 1;
  const effectiveYaw = slotYawOverride !== 0 ? slotYawOverride : CONFIG.YAW_DEG;

  useFrame((state) => {
    if (!groupRef.current || !rotRef.current) return;
    if (startTimeRef.current === null) {
      // Stagger initial phase so N_VISIBLE birds are evenly spaced along the path.
      startTimeRef.current =
        state.clock.elapsedTime - (slotIndex / CONFIG.N_VISIBLE) * CONFIG.TRAVEL_SEC;
    }
    const elapsed = (state.clock.elapsedTime - startTimeRef.current) * slotSpeed;
    if (elapsed >= CONFIG.TRAVEL_SEC) {
      startTimeRef.current = state.clock.elapsedTime;
      setSkillIdx((v) => (v + CONFIG.N_VISIBLE) % SKILLS.length);
      return;
    }
    const t = elapsed / CONFIG.TRAVEL_SEC;
    const x = CONFIG.START.X + t * (CONFIG.END.X - CONFIG.START.X);
    const y = CONFIG.START.Y + t * (CONFIG.END.Y - CONFIG.START.Y) + slotYOff;
    const z = CONFIG.START.Z + t * (CONFIG.END.Z - CONFIG.START.Z) + slotZOff;
    const bob = Math.sin(t * Math.PI * 2 * CONFIG.BOB_CYCLES + slotIndex) * CONFIG.BOB_AMP;
    groupRef.current.position.set(x, y + bob, z);

    // Bird orientation. The bird holds one FIXED rotation for its whole flight.
    // If AUTO_ORIENT is off, only YAW_DEG/PITCH_DEG/ROLL_DEG apply.
    // If AUTO_ORIENT is on, we additionally rotate so local +Z (the beak
    // direction for these models) aligns with the horizontal component of the
    // travel vector; YAW_DEG then becomes an additive offset on top.
    let baseYaw = 0;
    if (CONFIG.AUTO_ORIENT) {
      const dx = CONFIG.END.X - CONFIG.START.X;
      const dz = CONFIG.END.Z - CONFIG.START.Z;
      baseYaw = Math.atan2(dx, dz);
    }
    rotRef.current.rotation.set(
      deg(CONFIG.PITCH_DEG),
      baseYaw + deg(effectiveYaw + yaw_jitter),
      deg(CONFIG.ROLL_DEG),
    );

  });

  const skill = SKILLS[skillIdx];
  const birdUrl = BIRD_URLS[skillIdx % BIRD_URLS.length];

  return (
    <group ref={groupRef}>
      <group
        ref={rotRef}
        onPointerOver={(e) => {
          e.stopPropagation();
          onHover(skill.label);
        }}
        onPointerOut={() => onHover(null)}
      >
        <Bird
          url={birdUrl}
          seed={skillIdx + 1}
          scaleMult={slotScale}
          onBottomY={setBirdBottomY}
        />
        <IconGLB url={skill.glb} birdBottomY={birdBottomY} />
      </group>
    </group>
  );
}

function Parade({ onHover }: { onHover: (label: string | null) => void }) {
  return (
    <>
      {Array.from({ length: CONFIG.N_VISIBLE }, (_, i) => (
        <FlyingSlot
          key={i}
          slotIndex={i}
          initialSkillIdx={i % SKILLS.length}
          onHover={onHover}
        />
      ))}
    </>
  );
}

export default function SkillsCarousel() {
  const [hovered, setHovered] = useState<string | null>(null);
  return (
    <section id="skills" className="relative py-14 z-10 overflow-visible">
      <div className="max-w-6xl mx-auto px-4 relative z-20">
        <h2 className="text-4xl sm:text-4xl font-bold neon-text mb-10 text-center sm:mb-14">
          {hovered ?? "Skills"}
        </h2>
      </div>

      <div
        className="relative h-72 sm:h-80 md:h-96 z-20 overflow-visible"
        style={{ width: "100vw", marginLeft: "calc(50% - 50vw)" }}
      >
        <Canvas
          camera={{
            position: [CONFIG.CAMERA_X, CONFIG.CAMERA_Y, CONFIG.CAMERA_Z],
            fov: CONFIG.CAMERA_FOV,
          }}
          gl={{ alpha: true, antialias: true }}
        >
          <ambientLight intensity={1.35} />
          <directionalLight position={[3, 4, 5]} intensity={2.0} color="#fff2cf" />
          <directionalLight position={[-3, 1, 2]} intensity={0.6} color="#b9d4f0" />
          <Suspense fallback={null}>
            <Parade onHover={setHovered} />
          </Suspense>
        </Canvas>
      </div>
    </section>
  );
}

BIRD_URLS.forEach((u) => useGLTF.preload(u));
SKILLS.forEach((s) => useGLTF.preload(s.glb));
