"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ComponentRef, ReactNode, RefObject } from "react";
import IntroFlight from "@/components/scene-lab/IntroFlight";
import SafeAsset from "@/components/scene-lab/SafeAsset";
import { RetroCrtTv, Table, Chair, type CrtScreen } from "@/components/scene-lab/CampProps";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Clone, OrbitControls, Stars, useAnimations, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { clone as skeletonClone } from "three/examples/jsm/utils/SkeletonUtils.js";
import type { CampfireSceneConfig, LocationView, ObjectOverride } from "@/components/scene-lab/sceneConfig";
import { defaultLocationView, EMPTY_OVERRIDE } from "@/components/scene-lab/sceneConfig";
import cubHeadPoseRaw from "@/config/cubHeadPose.json";
import { useCampsiteAudioLoop, useCampsiteOneShot } from "@/lib/campsiteSounds";

const FIRE_CRACKLING_URL = "/sound/fire_crackling.mp3";
const BANJO_URL_SOUND = "/sound/banjo.mp3";
const CLICK_URL = "/sound/click.mp3";

/** 0..1 clamp for volume knobs, tolerant of missing/NaN JSON values. */
function clampUnit(v: number) {
  if (!Number.isFinite(v)) return 0;
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}

const CUB_HEAD_POSE = cubHeadPoseRaw as {
  bone?: string;
  rx?: number; ry?: number; rz?: number;
  px?: number; py?: number; pz?: number;
  ox?: number; oy?: number; oz?: number;
};

const CAMPFIRE_SCENE_URL = "/forest/campfire_scene.glb";
const WOOD_LOG_URL = "/forest/wood_log.glb";
// A repaired copy of log_low-poly_3d_model (1).glb - see NEW_LOG below. The original
// is left untouched next to it.
const NEW_LOG_URL = "/bear/log_low_poly.glb";
const WHITE_OWL_URL = "/birds/white_owl.glb";
const RED_OWL_URL = "/birds/red_owl.glb";
const TOUCAN_URL = "/models/toucan_wing_fly_land_v2.glb";
const DEER_URL = "/models/deer.glb";
const DOE_URL = "/models/doe.glb";
const RACCOON_URL = "/wildpoly/raccoon.glb";
const BEAR_URL = "/wildpoly/bear_sit_fixed.glb";
const FISH_URL = "/animals/fish.glb";
const PICKUP_TRUCK_URL = "/vehicles/pickup_truck.glb";
const CARAVAN_URL = "/vehicles/caravan.glb";
const CAMPER_URL = "/bear/low_poly_camper.glb";
const CUB_URL = "/bear/cub/cub.glb";
// Spaces in the filename, so percent-encoded.
const GLASSES_URL = "/bear/Glasses%20by%20jeremy%20-%209i5mmOwt7cu.glb";
const TENT_URL = "/bear/low-poly_tent.glb";

// New per-scene props. Spaces in filenames are percent-encoded.
const HONEY_WAND_URL = "/bear/cub/Honey%20wand%20by%20Poly%20by%20Google%20-%205DhrBw4JgWW.glb";
const WOOD_PILE_URL = "/bear/campfire/Wood%20Pile%20by%20K%20H%20(Kash)%20-%208ueXsvnRjC1.glb";
const BANJO_URL = "/bear/campfire/banjo_clean.glb";
const OLD_BEAR_TABLE_URL = "/bear/old-bear/Table%20by%20Hunter%20Paramore%20-%207qAyGZnerYt.glb";
const OLD_BEAR_CHAIR_URL = "/bear/old-bear/Chair%20by%20Quaternius%20-%20iMNqRzPwwe.glb";
const OLD_BEAR_COMPUTER_URL = "/bear/old-bear/low_poly_computer_with_devices.glb";
const OLD_BEAR_BOOKS_URL = "/bear/old-bear/Book%20Stack%20by%20Danni%20Bittman%20-%201WggoIFq8tx.glb";
const OLD_BEAR_MUG_URL = "/bear/old-bear/Mug%20With%20Office%20Tool%20by%20CreativeTrio%20-%204jSgnM5WWk.glb";
const OLD_BEAR_BOXES_URL = "/bear/old-bear/Cardboard%20Boxes%20by%20Quaternius%20-%20V9KbWC8Vd6.glb";
const OLD_BEAR_PAPERS_URL = "/bear/old-bear/Small%20Stack%20of%20Paper%20by%20Jarlan%20Perez%20-%20aiBozYlPe--.glb";
const OLD_BEAR_TOILET_URL = "/bear/old-bear/Toilet%20Paper%20stack%20by%20Quaternius%20-%206jlZSAxsYb.glb";
const OLD_BEAR_POSTIT_URL = "/bear/old-bear/Yellow%20Post-it%20by%20Zack%20Huang%20-%201-ZStsi8S91.glb";
const OLD_BEAR_DEBRIS_URL = "/bear/old-bear/Debris%20Papers%20by%20Quaternius%20-%20MujITy1NRR.glb";

/**
 * GameCube, split out of gamecube_with_controller.glb.
 *
 * The source is a 53 MB, 2.17M-triangle Sketchfab CAD model whose every material
 * uses KHR_materials_pbrSpecularGlossiness - an extension three.js dropped, so it
 * would have rendered untextured. Rebuilt in Blender into two files at 874 KB
 * total: coplanar faces dissolved first (it is subdivision output, so that alone
 * removed 94% of it for free), then collapsed to a per-object budget weighted by
 * surface area, which keeps the port recesses square instead of turning them to
 * mush. Materials came back out as metallicRoughness, and the one alpha-BLEND
 * material was forced opaque - that is the same flag that made the bear render
 * see-through and stop self-occluding.
 *
 * Both are exported in METRES: the console shell measures 0.150 x 0.156 x 0.106,
 * against 150 x 161 x 110 mm for the real thing. Console origin is centred with
 * its feet on y=0 and its port face looking down -Z. Controller origin is its
 * centre, and its cord leaves toward -Z as well.
 */
const GAMECUBE_URL = "/bear/gamecube.glb";
const CONTROLLER_URL = "/bear/gamecube_controller.glb";

/**
 * The four controller ports, in console-local metres, found by clustering the
 * recessed geometry in the port band rather than by eye - they came out evenly
 * spaced 27 mm apart, and port 1 landed exactly on the plug the model already had
 * inserted. Ordered left-to-right so cub N wires to port N and the leads never
 * cross. A plug is baked into each of the four, so the sockets are never empty.
 */
const CONSOLE_PORTS: Array<[number, number, number]> = [
  [-0.04020, 0.06328, -0.09532],
  [-0.01315, 0.06328, -0.09532],
  [0.01373, 0.06328, -0.09532],
  [0.04079, 0.06328, -0.09532],
];

/** Where the cord leaves the controller shell, in controller-local metres. */
const CONTROLLER_CORD_EXIT = new THREE.Vector3(-0.00668, -0.00142, -0.03165);

/** Measured off the original cord: 15 mm radius at model scale, ~1.3 mm for real. */
const WIRE_RADIUS = 0.0042;
/**
 * What each CRT is showing. Drop an image in /public and point `content` at it; leave
 * it out and the screen runs a built-in animation so it never looks dead. `tint` is
 * the colour that screen throws onto the cubs, so it's worth matching the artwork.
 */
/**
 * Each screen plays a project GIF from /public/gifs so the arcade wall reads
 * as a stack of running games. Tints match each GIF's dominant palette so the
 * light they throw onto the bears feels like it's coming from what's on
 * screen, not a decorator's guess.
 */
const ARCADE_SCREENS: CrtScreen[] = [
  { content: "/gifs/twilio.gif",    tint: "#ff5f5f", glow: 1.0 },
  { content: "/gifs/summit.gif",    tint: "#8bd0ff", glow: 0.95 },
  { content: "/gifs/darktower.gif", tint: "#ffb46f", glow: 0.9 },
  { content: "/gifs/regions.gif",   tint: "#8affc0", glow: 0.95 },
];

/**
 * The campsite is three places standing on a ring with an empty middle. The camera
 * lives in that middle and turns to face one at a time, so a step is 360/3 degrees
 * and three steps come back to where you started.
 *
 * Each location is authored in its OWN local frame, centred on its own origin with
 * the camera off at +Z looking in - exactly the frame the campfire was already
 * built in - and then dropped onto the ring. So a location can be composed as if it
 * were the only thing in the world.
 *
 * The group is turned to `azimuth + PI`, not `azimuth`, which points its local +Z
 * back toward the middle. That is what puts the camera on the inner side and every
 * bear facing it; turning both the contents and the viewpoint by half a turn about
 * the same centre leaves the framing identical to before.
 */
const LOCATION_COUNT = 3;
const LOCATION_AZIMUTH = (i: number, c: CampfireSceneConfig) =>
  c.locationAngleOffset + (i * Math.PI * 2) / LOCATION_COUNT;

/**
 * The transform that puts location i on the ring - the same one the <Location> group
 * applies, so anything expressed in a location's frame can be carried into world
 * space with it, and back again with its inverse.
 */
function ringMatrix(a: number, c: CampfireSceneConfig, out: THREE.Matrix4) {
  out.makeRotationY(a + Math.PI + c.locationSpin);
  out.setPosition(Math.sin(a) * c.locationRadius, 0, Math.cos(a) * c.locationRadius);
  return out;
}

function locationMatrix(i: number, c: CampfireSceneConfig, out: THREE.Matrix4) {
  return ringMatrix(LOCATION_AZIMUTH(i, c), c, out);
}

/** Signed shortest way round from `a` to `b`, in radians. */
function shortestTurn(a: number, b: number) {
  return ((b - a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
}

const LOCATION_VIEW_KEYS = ["cx", "cy", "cz", "tx", "ty", "tz"] as const;

/** This location's saved framing, falling back to the shared ring baseline. */
function locationView(i: number, c: CampfireSceneConfig): LocationView {
  return c.locationViews?.[i] ?? defaultLocationView(i, c);
}

/** Where the camera stands to look at location i, and what it aims at, in world space. */
function locationCamera(
  i: number,
  c: CampfireSceneConfig,
  pos: THREE.Vector3,
  target: THREE.Vector3,
  scratch: THREE.Matrix4 = new THREE.Matrix4()
) {
  const v = locationView(i, c);
  locationMatrix(i, c, scratch);
  pos.set(v.cx, v.cy, v.cz).applyMatrix4(scratch);
  target.set(v.tx, v.ty, v.tz).applyMatrix4(scratch);
}

/** A world-space camera and target folded back into location i's frame, for saving. */
function worldToLocationView(
  i: number,
  c: CampfireSceneConfig,
  pos: [number, number, number],
  target: [number, number, number]
): LocationView {
  const inv = locationMatrix(i, c, new THREE.Matrix4()).invert();
  const p = new THREE.Vector3(...pos).applyMatrix4(inv);
  const t = new THREE.Vector3(...target).applyMatrix4(inv);
  return { cx: p.x, cy: p.y, cz: p.z, tx: t.x, ty: t.y, tz: t.z };
}

/**
 * Drops its children onto the ring at location `index`.
 *
 * No contact shadows here. ContactShadows only ever renders onto a SQUARE plane, so
 * one per location just drew three squares on the ground; the single circular
 * CampfireGround is the surface under the whole campsite instead.
 */
function Location({
  index,
  config,
  children,
}: {
  index: number;
  config: CampfireSceneConfig;
  children: ReactNode;
}) {
  const ref = useRef<THREE.Group>(null);
  const cfg = useRef(config);
  cfg.current = config;
  useFrame(() => {
    if (!ref.current) return;
    const c = cfg.current;
    const a = LOCATION_AZIMUTH(index, c);
    ref.current.position.set(Math.sin(a) * c.locationRadius, 0, Math.cos(a) * c.locationRadius);
    ref.current.rotation.set(0, a + Math.PI + c.locationSpin, 0);
  });
  return (
    <group ref={ref} name={`location_${index}`}>
      {children}
    </group>
  );
}

// Replaces the tent baked into campfire_scene.glb, which is stripped out below.
// Where that one stood, so the existing tentX/Y/Z/RotationY/Scale sliders keep
// meaning exactly what they did before - they're offsets from this.
const TENT_BASE = { x: 4.429, y: 0, z: -2.567 };
// This model is authored Z-up and its Sketchfab root carries no conversion rotation,
// so without the -90 deg X it lies on its side. Measured: 3.27x taper along Z (wide
// base, narrow apex) vs ~1.0x on X and Y.
const TENT_UPRIGHT: [number, number, number] = [-Math.PI / 2, 0, 0];
// After that rotation: recentres the footprint and drops the base onto y = 0.
const TENT_ANCHOR: [number, number, number] = [0.036, 0.125, -0.009];

// The camper is a Sketchfab diorama - van, awning, string lights, table, chair,
// plants - and its origin sits out in a corner rather than on the van. These put the
// van body itself on the group origin so `position` means where the van goes.
const CAMPER_ANCHOR: [number, number, number] = [-0.04, 0, -1.46];
// The patio/awning side of the diorama faces local +X, so a -90 deg yaw turns it to
// face +Z, i.e. toward the fire.
const CAMPER_BASE = { x: 0, y: 0, z: -6.0, rotY: -Math.PI / 2, scale: 0.4 };

// Measured off the rig: `mouth` is a child of `head` at a fixed local offset, so the
// direction the face points is constant in head-local space regardless of pose.
// normalize([0, 0.377, 0.236]).
const FACE_FWD_LOCAL = new THREE.Vector3(0, 0.848, 0.531).normalize();
const FACE_UP_LOCAL = new THREE.Vector3(0, 0.531, -0.848).normalize();
const FACE_RIGHT_LOCAL = new THREE.Vector3(1, 0, 0);

// Same idea for the chest bone, measured the same way. It sits nearly axis-aligned
// for a seated bear: +Z out of the chest, +Y up.
const CHEST_FWD_LOCAL = new THREE.Vector3(-0.078, 0.058, 0.995).normalize();
const CHEST_UP_LOCAL = new THREE.Vector3(0, 0.956, -0.292).normalize();

/** builds the rotation that maps a model authored Y-up / +Z-forward onto a bone */
function boneBasis(fwd: THREE.Vector3, up: THREE.Vector3) {
  const f = fwd.clone().normalize();
  const r = new THREE.Vector3().crossVectors(up, f).normalize();
  const u = new THREE.Vector3().crossVectors(f, r).normalize();
  return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(r, u, f));
}
/** how far a bear will crane its head off neutral before it stops trying, radians */
const MAX_GLANCE = 1.0;

type HeadRegistry = Map<string, THREE.Vector3>;

/**
 * Live world positions the wires need: where each controller's cord leaves its shell,
 * and where each console port is. Both ends move - the cubs breathe, and the console
 * follows its config sliders - so the wire reads them every frame rather than being
 * given fixed endpoints.
 */
type CordRegistry = Map<string, THREE.Vector3>;
type PortRegistry = Map<number, THREE.Vector3>;
type DragPlaneMode = "xz" | "xy";

const BENCH_ANGLES = [Math.PI / 2, Math.PI / 2 + (2 * Math.PI) / 3, Math.PI / 2 + (4 * Math.PI) / 3];

interface BenchModel {
  url: string;
  /** model-space nudge applied before placing, so different logs line up with each other */
  anchor: [number, number, number];
  /** normalises models authored at different scales before anything else applies */
  scale: number;
  /** height of the sit-on surface in model units, AFTER the anchor. Whatever sits on
   *  this bench derives its Y from this, so swapping in a log of a different height
   *  moves the occupant with it instead of leaving them floating. */
  top: number;
}

const OLD_LOG: BenchModel = { url: WOOD_LOG_URL, anchor: [0, 0, 0], scale: 1, top: 1.074 };
// Its nodes use `matrix` rather than translation/rotation/scale, and one of them
// carries a 100x scale - so the raw model is 404 units long. Hence scale 0.01, which
// brings it to 4.05 x 0.92 x 1.02 against the old log's 3.77 x 1.09 x 1.11.
// The anchor then lines its base and centre up with the old log's.
const NEW_LOG: BenchModel = {
  url: NEW_LOG_URL,
  anchor: [-0.0143, 0.0119, -0.1473],
  scale: 0.01,
  top: 0.9012,
};

/** which log stands at each of the three bench angles - swap freely */
const BENCH_MODELS: BenchModel[] = [OLD_LOG, NEW_LOG, OLD_LOG];

interface PropAttachment {
  url: string;
  /** scale in the socket bone's space (already bear model units, so 1 is life-size) */
  scale: number;
  /** euler radians, applied inside the socket frame. Normally unnecessary: sit_log
   *  keys the socket's rotation to the live paw-to-paw axis, so a prop authored
   *  along +Z lands on the stick line by construction. */
  rotation?: [number, number, number];
  /** offset in the socket frame. Used to slide the prop along the stick, e.g.
   *  push a fish out to the tip so it reads as biting the end. */
  position?: [number, number, number];
  /** length of a wooden stick added along the socket's +Z axis, skewered through
   *  the prop. Left undefined for props that already include their own stick. */
  stickLength?: number;
  /** cylinder radius for the stick */
  stickRadius?: number;
  /** if set, SocketProp will layer live config-driven offsets on top of the
   *  baseline transform each frame. Keys read: `${configKey}X/Y/Z`,
   *  `${configKey}RotX/Y/Z`, `${configKey}Scale` (multiplier). */
  configKey?: "banjoProp";
}

/**
 * A prop carried between two bones - for the cub rig, which has no hands and no
 * socket bone to hang anything from.
 *
 * It rides at the live MIDPOINT of the two bones, recomputed every frame, rather
 * than at a fixed offset from one of them. Anchoring to a single bone makes the
 * prop swing around that joint as the clip plays; the midpoint stays put.
 */
interface HandheldAttachment {
  url: string;
  scale: number;
  /** the two bones it is held between */
  bones: [string, string];
  /** euler radians, applied in the animal's own frame */
  rotation?: [number, number, number];
  /** nudge off the bone midpoint, in the animal's own frame */
  offset: [number, number, number];
}

interface AnimalPlacement {
  url: string;
  position: [number, number, number];
  rotationY: number;
  scale: number;
  label: string;
  flatShading?: boolean;
  animation?: string;
  /** seconds into the clip to start — desyncs instances that share one animation */
  animationOffset?: number;
  /** playback rate; keep these mutually non-integer so instances never re-sync */
  animationSpeed?: number;
  /** derive Y from the bench top instead of using position[1] */
  sitOnBench?: boolean;
  /** which of the three benches it's sitting on - picks the right seat height when
   *  the benches aren't all the same log */
  bench?: number;
  /** parented to the rig's "Food" socket bone. sit_log keys that bone to the rear
   *  paw with +Z running along the paw-to-paw axis, so a prop authored along +Z
   *  from the rear grip sits in both paws and inherits the roasting roll. */
  prop?: PropAttachment;
  /** bolted to bones so they ride the animation - glasses on the head, tie on the chest */
  accessories?: Array<"glasses" | "tie">;
  /** held between two bones, for rigs with no socket to hang a prop from */
  handheld?: HandheldAttachment;
  /** euler radians applied INSIDE the placement, to correct a model authored in a
   *  different orientation. Separate from rotationY so facing still works normally. */
  modelRotation?: [number, number, number];
  /** runtime-animate the arms into a banjo-picking pose, overriding whatever the
   *  base clip writes for shoulder/upperarm/arm/hand on both sides. */
  banjoPlayer?: boolean;
}

const ANIMALS: AnimalPlacement[] = [
  { url: WHITE_OWL_URL, position: [-1.6, 0.55, 2.4], rotationY: Math.PI, scale: 0.5, label: "white owl on front log" },
  { url: RED_OWL_URL, position: [-0.8, 0.55, 2.4], rotationY: Math.PI, scale: 0.5, label: "red owl on front log" },
  { url: TOUCAN_URL, position: [0, 0.55, 2.4], rotationY: Math.PI, scale: 3.6, label: "toucan on front log" },
  { url: DEER_URL, position: [0.8, 0, 2.4], rotationY: Math.PI, scale: 1.5, label: "deer next to front log", flatShading: true },
  { url: DOE_URL, position: [1.6, 0, 2.4], rotationY: Math.PI, scale: 1.45, label: "doe next to front log", flatShading: true },
  { url: RACCOON_URL, position: [-0.2, 0.55, 2.4], rotationY: Math.PI, scale: 0.35, label: "raccoon on front log", animation: "idle" },
  {
    url: BEAR_URL, position: [0.4, 0, 2.4], bench: 0, rotationY: Math.PI, scale: 0.5,
    label: "bear on front log", animation: "sit_log", sitOnBench: true,
    animationOffset: 0, animationSpeed: 1,
    prop: {
      url: FISH_URL,
      scale: 0.04,
      // Flip so the mouth end points along the stick's tip (+Z) instead of back
      // toward the bear. Fish is authored with tail at +Y, mouth at -Y.
      rotation: [-Math.PI / 2, 0, 0],
      // Push the fish out to the far end of the stick so the tip enters its
      // mouth (stick runs from z=-0.7 to +0.7; mouth is at fish_center - 0.16
      // after the 0.04 scale, so 0.55 puts the mouth right on the tip).
      position: [0, 0, 0.55],
      stickLength: 1.4,
      stickRadius: 0.02,
    },
    accessories: ["glasses"],
  },
  {
    url: BEAR_URL, position: [-2.078, 0, -1.2], bench: 1, rotationY: Math.PI / 3, scale: 0.5,
    label: "bear on back-left log", animation: "sit_log", sitOnBench: true,
    animationOffset: 2.1, animationSpeed: 0.94,
    // Body pose from sit_log; the arms are hard-overridden every frame by the
    // banjoPlayer path in Animal, which drives shoulder/upperarm/arm/hand into
    // a picking pose (fret hand sliding, pick hand strumming). The banjo prop
    // baseline below is the Food-local transform for the drum on the belly
    // with neck rising up-and-to-bear's-left.
    banjoPlayer: true,
    prop: {
      url: BANJO_URL,
      scale: 0.1892,
      position: [0.0699, 0.2702, 0.1699],
      rotation: [-0.98, -1.3978, -2.1395],
      configKey: "banjoProp",
    },
  },
  {
    url: BEAR_URL, position: [2.078, 0, -1.2], bench: 2, rotationY: -Math.PI / 3, scale: 0.5,
    label: "bear on back-right log", animation: "sit_log", sitOnBench: true,
    animationOffset: 4.3, animationSpeed: 1.07,
    prop: {
      url: FISH_URL,
      scale: 0.04,
      // Flip so the mouth end points along the stick's tip (+Z) instead of back
      // toward the bear. Fish is authored with tail at +Y, mouth at -Y.
      rotation: [-Math.PI / 2, 0, 0],
      // Push the fish out to the far end of the stick so the tip enters its
      // mouth (stick runs from z=-0.7 to +0.7; mouth is at fish_center - 0.16
      // after the 0.04 scale, so 0.55 puts the mouth right on the tip).
      position: [0, 0, 0.55],
      stickLength: 1.4,
      stickRadius: 0.02,
    },
    accessories: ["glasses", "tie"],
  },
];

/**
 * The real cub rig (BabyBear_Rig, mesh Baby_Bear) - a different model from the adult.
 *
 * The file needed a one-node patch before it would stand up. Its rig root carries a
 * +90 deg X rotation and parents BOTH the mesh and the skeleton; the skeleton undoes
 * it (its own root is a 180 deg X flip) but the mesh does not, and three.js multiplies
 * the skinned result by the mesh node's world matrix - which glTF says to ignore. So
 * the bones stood upright while the mesh lay on its back, sunk 0.345 below the floor.
 * Cancelling that rotation on the mesh node alone fixes it and leaves the bones alone.
 *
 * (SkinnedMesh.applyBoneTransform returns OBJECT space, before that matrix is applied,
 * which is what fooled me into calling this correct earlier. Measure in world space.)
 *
 * It now stands 0.427 with its feet on the floor through every idle pose, facing +Z -
 * about 41% the height of a seated adult, roughly right for a cub.
 *
 * The rig is a QUADRUPED: 37 joints, four legs, and no arm or hand bones at all. So a
 * controller is held between the two front paws (the `_dupli_001` set) rather than in
 * hands, and there is no sit action - they crouch over the game on all fours.
 */
const CUB_PAWS: [string, string] = ["toes_01_dupli_001.l", "toes_01_dupli_001.r"];

/** A controller, held between the front paws and wired to port `port`. */
const cub = (
  i: number,
  position: [number, number, number],
  rotationY: number,
  offset: number,
  speed: number
): AnimalPlacement => ({
  url: CUB_URL,
  position,
  rotationY,
  scale: 1,
  label: `cub ${i + 1}`,
  animation: "sit_cross",
  animationOffset: offset,
  animationSpeed: speed,
  handheld: {
    url: CONTROLLER_URL,
    scale: 1,
    bones: CUB_PAWS,
    // The cord leaves the controller toward -Z, so turn it half round to point the
    // lead the way the cub is facing - at the console - instead of behind it.
    rotation: [-0.2, Math.PI, 0],
    // up off the paws a little, and forward so it is in front of the chest
    offset: [0, 0.018, 0.03],
  },
});

/**
 * Four cubs in profile along the truck's flank, so the camera reads faces rather than
 * backs. Ordered by z to match the console's ports left-to-right, so no lead crosses
 * another. Speeds are mutually non-integer so the four never fall into lockstep.
 *
 * Kept as the original console-side row for reference; the current arcade
 * uses ARCADE_CUBS below (cubs sitting in front of a tailgate-mounted TV
 * stack) instead of standing next to a GameCube console.
 */
const CUBS: AnimalPlacement[] = [
  cub(0, [0.40, 0, -0.85], -Math.PI / 2 + 0.20, 1.4, 1.06),
  cub(1, [0.52, 0, -0.28], -Math.PI / 2 + 0.07, 5.7, 0.93),
  cub(2, [0.52, 0, 0.28], -Math.PI / 2 - 0.07, 3.1, 1.11),
  cub(3, [0.40, 0, 0.85], -Math.PI / 2 - 0.20, 0.6, 0.87),
];

void CUBS; // kept for reference; not rendered by the current ArcadeSector

/**
 * Four cubs sitting on the ground in front of the truck, facing back toward
 * it (rotY = PI, so their local -Z / face points at world -Z where the truck
 * sits with its tailgate down). Each cub holds a controller in its paws via
 * the shared `cub(...)` helper - which uses the "idle" clip - so from the
 * camera the shot reads as four kids on the floor watching the CRTs. Speeds
 * are mutually non-integer so the four never fall into lockstep.
 */
const ARCADE_CUBS: AnimalPlacement[] = [
  cub(0, [-0.55, 0, 1.75], Math.PI, 1.4, 1.06),
  cub(1, [-0.19, 0, 1.60], Math.PI, 5.7, 0.93),
  cub(2, [ 0.19, 0, 1.60], Math.PI, 3.1, 1.11),
  cub(3, [ 0.55, 0, 1.75], Math.PI, 0.6, 0.87),
];

/**
 * Console on the ground between the cubs and the truck, ports facing the cubs. A
 * -90 deg yaw turns its port face (local -Z) onto +X, which also lays its four ports
 * out along world +Z in the same order the cubs are sitting.
 */
const CONSOLE_BASE = { x: -0.62, y: 0, z: 0, rotY: -Math.PI / 2, scale: 1 };

/** Sits on the Chair in the contact location - seat height 0.42. */
const CONTACT_BEAR: AnimalPlacement = {
  url: BEAR_URL, position: [-0.95, 0.42, 0], rotationY: Math.PI / 2, scale: 0.5,
  label: "bear at the table", animation: "sit_log", animationOffset: 3.1, animationSpeed: 1,
  accessories: ["glasses"],
};

const seededRandom = (seed: number) => {
  let value = seed;
  return () => {
    value = (value * 1664525 + 1013904223) % 4294967296;
    return value / 4294967296;
  };
};

function CameraRig({
  config,
  paused = false,
}: {
  config: CampfireSceneConfig;
  /** while the intro flight owns the camera, this rig must not touch it */
  paused?: boolean;
}) {
  const { camera } = useThree();
  const initialized = useRef(false);
  const lastConfigCamera = useRef<[number, number, number]>([config.cameraX, config.cameraY, config.cameraZ]);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    lastConfigCamera.current = [config.cameraX, config.cameraY, config.cameraZ];
    if (paused) return;
    camera.position.set(config.cameraX, config.cameraY, config.cameraZ);
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = config.fov;
      camera.updateProjectionMatrix();
    }
  }, [camera, config, paused]);

  useEffect(() => {
    const [lastX, lastY, lastZ] = lastConfigCamera.current;
    if (
      Math.abs(config.cameraX - lastX) > 0.001 ||
      Math.abs(config.cameraY - lastY) > 0.001 ||
      Math.abs(config.cameraZ - lastZ) > 0.001
    ) {
      lastConfigCamera.current = [config.cameraX, config.cameraY, config.cameraZ];
      if (!paused) camera.position.set(config.cameraX, config.cameraY, config.cameraZ);
    }
  }, [camera, config.cameraX, config.cameraY, config.cameraZ, paused]);

  useFrame(() => {
    if (paused) return;
    if (camera instanceof THREE.PerspectiveCamera && Math.abs(camera.fov - config.fov) > 0.01) {
      camera.fov = config.fov;
      camera.updateProjectionMatrix();
    }
  });

  return null;
}

/**
 * Drives the camera when the site is running in panelled mode: it stands in the
 * empty middle and turns to face one location at a time.
 *
 * The position is derived from the ring rather than from cameraX/Y/Z, because the
 * camera is no longer orbiting one subject - it is pivoting between three of them,
 * and the pull-back that frames a location has to stay the same for all three.
 */
function LocationCamera({
  config,
  panel,
  active,
  editing = false,
}: {
  config: CampfireSceneConfig;
  panel: number;
  active: boolean;
  /**
   * In the lab we want to orbit a location to frame it, so this rig has to let go.
   * It keeps the camera only while moving to a new shot - after a location change or
   * a slider nudge - and then hands over until the next one.
   */
  editing?: boolean;
}) {
  const { camera } = useThree();
  /**
   * The move is a TURN around the ring, not a slide between two points.
   *
   * Lerping the world camera and the world aim point independently makes both cut a
   * chord across the middle, and mid-way the camera ends up close to and above its
   * own aim - which reads as the camera dipping to look at the floor before coming
   * back up. Measured on Desk -> Campfire it spiked to 14.7 degrees of look-down with
   * the gap closing from 4.55m to 2.87m.
   *
   * So interpolate the ring ANGLE and the local shot instead. The camera swings round
   * the middle at a steady radius, always facing outward, and the horizon stays put:
   * the same move now glides 8.8 -> 6.5 degrees with no spike.
   */
  const angle = useRef<number | null>(null);
  const view = useRef<LocationView | null>(null);
  const scratch = useMemo(() => new THREE.Matrix4(), []);
  const aim = useMemo(() => new THREE.Vector3(), []);
  const lastPanel = useRef(panel);
  const lastView = useRef<LocationView | null>(null);
  const holding = useRef(true);

  useFrame((_, delta) => {
    if (!active) return;
    const wantAngle = LOCATION_AZIMUTH(panel, config);
    const wantView = locationView(panel, config);

    if (angle.current === null || !view.current) {
      angle.current = wantAngle;
      view.current = { ...wantView };
    }
    const cur = view.current;

    if (editing) {
      // Re-take the camera only when the shot we should be showing actually changes:
      // a different location, or this location's numbers edited from the panel.
      const prev = lastView.current;
      const moved =
        !prev ||
        LOCATION_VIEW_KEYS.some((f) => Math.abs(wantView[f] - prev[f]) > 1e-4);
      if (panel !== lastPanel.current || moved) {
        // Seed from the location we are leaving, so the turn starts where the camera
        // already is - orbiting saves that shot, so its saved view is where we are.
        if (panel !== lastPanel.current) {
          angle.current = LOCATION_AZIMUTH(lastPanel.current, config);
          Object.assign(cur, locationView(lastPanel.current, config));
        }
        lastPanel.current = panel;
        lastView.current = { ...wantView };
        holding.current = true;
      }
      if (!holding.current) return;
      const settled =
        Math.abs(shortestTurn(angle.current, wantAngle)) < 1e-4 &&
        LOCATION_VIEW_KEYS.every((f) => Math.abs(wantView[f] - cur[f]) < 1e-4);
      if (settled) {
        holding.current = false;
        return;
      }
    }

    // Frame-rate independent easing: reaches ~99% of the way in locationTurnSpeed
    // seconds whatever the frame rate.
    const settle = Math.max(0.05, config.locationTurnSpeed);
    const k = 1 - Math.pow(0.01, Math.min(delta, 1 / 20) / settle);

    // Shortest way round, so stepping 2 -> 0 turns one notch forward rather than
    // unwinding 240 degrees back through everything.
    angle.current += shortestTurn(angle.current, wantAngle) * k;
    for (const f of LOCATION_VIEW_KEYS) cur[f] += (wantView[f] - cur[f]) * k;

    ringMatrix(angle.current, config, scratch);
    camera.position.set(cur.cx, cur.cy, cur.cz).applyMatrix4(scratch);
    aim.set(cur.tx, cur.ty, cur.tz).applyMatrix4(scratch);
    camera.lookAt(aim);
  });

  return null;
}

function OrbitCameraSaver({
  target,
  onChange,
  enabled = true,
}: {
  target: [number, number, number];
  onChange: (pos: [number, number, number], tgt: [number, number, number]) => void;
  enabled?: boolean;
}) {
  const controlsRef = useRef<ComponentRef<typeof OrbitControls>>(null);
  const userDraggingRef = useRef(false);

  useEffect(() => {
    if (!controlsRef.current) return;
    controlsRef.current.enabled = enabled;
  }, [enabled]);

  return (
    <OrbitControls
      ref={controlsRef}
      target={target}
      enabled={enabled}
      enableDamping
      dampingFactor={0.12}
      minDistance={1.5}
      maxDistance={200}
      enablePan
      onStart={() => { userDraggingRef.current = true; }}
      onEnd={() => {
        if (!userDraggingRef.current) return;
        userDraggingRef.current = false;
        const controls = controlsRef.current;
        if (!controls || !enabled) return;
        const cam = controls.object as THREE.PerspectiveCamera;
        const tgt = controls.target as THREE.Vector3;
        onChange(
          [cam.position.x, cam.position.y, cam.position.z],
          [tgt.x, tgt.y, tgt.z]
        );
      }}
    />
  );
}

/**
 * Wraps a child in a named clickable/draggable group. Reads its own row of
 * config.objectOverrides so dragging in the lab writes back onto that name.
 * Used for the "one-off" props (truck, CRTs, table, chair) that don't have
 * their own frame-driven override handling like Animal / GameCubeConsole do.
 *
 * Pass identity position/rotation/scale to the wrapped component - Selectable
 * carries the base transform so the drag delta composes cleanly.
 */
function Selectable({
  name,
  onSelect,
  config,
  basePosition = [0, 0, 0],
  baseRotationY = 0,
  baseScale = 1,
  children,
}: {
  name: string;
  onSelect: (name: string) => void;
  config: CampfireSceneConfig;
  basePosition?: [number, number, number];
  baseRotationY?: number;
  baseScale?: number;
  children: ReactNode;
}) {
  const o = config.objectOverrides?.[name] ?? EMPTY_OVERRIDE;
  if (o.hide >= 0.5) return null;
  return (
    <group
      name={name}
      position={[basePosition[0] + o.dx, basePosition[1] + o.dy, basePosition[2] + o.dz]}
      rotation={[o.rotX, baseRotationY + o.rotY, o.rotZ]}
      scale={baseScale * o.scale}
      onClick={(e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); onSelect(name); }}
    >
      {children}
    </group>
  );
}

function ObjectDragLayer({
  children,
  selectedObject,
  mode,
  config,
  onTranslate,
}: {
  children: ReactNode;
  selectedObject: string | null;
  mode: DragPlaneMode;
  config: CampfireSceneConfig;
  onTranslate: (name: string, next: Pick<ObjectOverride, "dx" | "dy" | "dz">) => void;
}) {
  const dragPlane = useMemo(() => new THREE.Plane(), []);
  const intersection = useMemo(() => new THREE.Vector3(), []);
  const dragRef = useRef<{
    name: string;
    parent: THREE.Object3D;
    startLocalPoint: THREE.Vector3;
    startOverride: ObjectOverride;
  } | null>(null);

  const findSelectedAncestor = (hit: THREE.Object3D) => {
    if (!selectedObject) return null;
    let node: THREE.Object3D | null = hit;
    while (node) {
      if (node.name === selectedObject) return node;
      node = node.parent;
    }
    return null;
  };

  const intersectDragPlane = (event: ThreeEvent<PointerEvent>) => {
    return event.ray.intersectPlane(dragPlane, intersection) ? intersection.clone() : null;
  };

  const handlePointerDown = (event: ThreeEvent<PointerEvent>) => {
    if (!selectedObject) return;
    const object = findSelectedAncestor(event.object);
    if (!object?.parent) return;

    event.stopPropagation();
    (event.target as unknown as Element).setPointerCapture?.(event.pointerId);

    object.updateWorldMatrix(true, false);
    object.parent.updateWorldMatrix(true, false);

    const worldPosition = new THREE.Vector3();
    object.getWorldPosition(worldPosition);
    dragPlane.setFromNormalAndCoplanarPoint(
      mode === "xz" ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(0, 0, 1),
      worldPosition
    );

    const startWorldPoint = intersectDragPlane(event) ?? worldPosition;
    const startOverride = config.objectOverrides?.[selectedObject] ?? EMPTY_OVERRIDE;

    dragRef.current = {
      name: selectedObject,
      parent: object.parent,
      startLocalPoint: object.parent.worldToLocal(startWorldPoint.clone()),
      startOverride: { ...startOverride },
    };
  };

  const handlePointerMove = (event: ThreeEvent<PointerEvent>) => {
    const drag = dragRef.current;
    if (!drag) return;

    event.stopPropagation();
    const worldPoint = intersectDragPlane(event);
    if (!worldPoint) return;

    const localPoint = drag.parent.worldToLocal(worldPoint.clone());
    const delta = localPoint.sub(drag.startLocalPoint);

    onTranslate(drag.name, {
      dx: drag.startOverride.dx + delta.x,
      dy: mode === "xy" ? drag.startOverride.dy + delta.y : drag.startOverride.dy,
      dz: mode === "xz" ? drag.startOverride.dz + delta.z : drag.startOverride.dz,
    });
  };

  const handlePointerUp = (event: ThreeEvent<PointerEvent>) => {
    if (!dragRef.current) return;
    event.stopPropagation();
    (event.target as unknown as Element).releasePointerCapture?.(event.pointerId);
    dragRef.current = null;
  };

  return (
    <group
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {children}
    </group>
  );
}

interface CapturedNode {
  node: THREE.Object3D;
  /** the parent it was detached from, so a delete can be undone */
  parent: THREE.Object3D | null;
  position: THREE.Vector3;
  scale: THREE.Vector3;
  /** the node's own pitch/roll from the GLB - tilt overrides are added on top of these
   *  rather than replacing them, so nothing that was already angled snaps upright. */
  rotationX: number;
  rotationY: number;
  rotationZ: number;
  visible: boolean;
}

type TreeOriginal = CapturedNode;

function CampfireSceneModel({
  config,
  onSelect,
}: {
  config: CampfireSceneConfig;
  onSelect: (name: string) => void;
}) {
  const gltf = useGLTF(CAMPFIRE_SCENE_URL) as unknown as { scene: THREE.Group };
  const { scene, trees, bonfire, campItems, namedNodes } = useMemo(() => {
    const cloned = gltf.scene.clone(true);
    const toRemove: THREE.Object3D[] = [];
    const treeOriginals: TreeOriginal[] = [];
    const campItemOriginals: CapturedNode[] = [];
    let bonfireNode: CapturedNode | null = null as CapturedNode | null;
    const seenTreeNodes = new Set<THREE.Object3D>();
    const nameMap = new Map<string, CapturedNode>();

    const capture = (obj: THREE.Object3D): CapturedNode => ({
      node: obj,
      parent: obj.parent,
      position: obj.position.clone(),
      scale: obj.scale.clone(),
      rotationX: obj.rotation.x,
      rotationY: obj.rotation.y,
      rotationZ: obj.rotation.z,
      visible: true,
    });

    cloned.traverse((object) => {
      const name = (object.name || "").toLowerCase();
      if (object instanceof THREE.Mesh) {
        // The pack ships a 60x60 flat slab as node "ground" (its geometry is "Plane"),
        // which this catches - the circular CampfireGround stands in for it.
        if (name.includes("plane") || name.includes("ground") || name.includes("floor")) {
          toRemove.push(object);
          return;
        }
        object.castShadow = true;
        object.receiveShadow = true;
        if (Array.isArray(object.material)) {
          object.material = object.material.map((m) => m.clone());
        } else if (object.material) {
          object.material = object.material.clone();
        }
      }

      const isTree = name.startsWith("tree_") || name.includes("pine");
      const captured = capture(object);
      if (isTree) {
        let parent = object.parent;
        let ancestorAlreadyTracked = false;
        while (parent) {
          if (seenTreeNodes.has(parent)) {
            ancestorAlreadyTracked = true;
            break;
          }
          parent = parent.parent;
        }
        if (!ancestorAlreadyTracked && !seenTreeNodes.has(object)) {
          seenTreeNodes.add(object);
          treeOriginals.push(captured);
          nameMap.set(object.name, captured);
        }
      } else if (name === "bonfire" && !bonfireNode) {
        bonfireNode = captured;
        nameMap.set(object.name, captured);
      } else if (name === "tent") {
        // superseded by the standalone <Tent> below - drop it so there aren't two
        toRemove.push(object);
        return;
      } else if (name.startsWith("camp_item_")) {
        campItemOriginals.push(captured);
        nameMap.set(object.name, captured);
      }
    });
    toRemove.forEach((obj) => obj.parent?.remove(obj));
    return {
      scene: cloned,
      trees: treeOriginals,
      bonfire: bonfireNode,
      campItems: campItemOriginals,
      namedNodes: nameMap,
    };
  }, [gltf.scene]);

  const cfgRef = useRef(config);
  cfgRef.current = config;

  useFrame(() => {
    const c = cfgRef.current;
    const overrides = c.objectOverrides || {};
    const applyOverride = (
      captured: CapturedNode,
      basePos: [number, number, number],
      baseRotY: number,
      baseScale: [number, number, number],
      hiddenByBulk = false
    ) => {
      const o = overrides[captured.node.name] ?? EMPTY_OVERRIDE;

      // A deleted object is detached from the scene graph outright - not rendered,
      // not raycast, not traversed, not costing anything. Re-attached on restore.
      if (o.hide >= 0.5) {
        if (captured.node.parent) captured.node.parent.remove(captured.node);
        return;
      }
      if (!captured.node.parent && captured.parent) captured.parent.add(captured.node);

      captured.node.position.set(basePos[0] + o.dx, basePos[1] + o.dy, basePos[2] + o.dz);
      captured.node.rotation.set(
        captured.rotationX + o.rotX,
        baseRotY + o.rotY,
        captured.rotationZ + o.rotZ
      );
      captured.node.scale.set(baseScale[0] * o.scale, baseScale[1] * o.scale, baseScale[2] * o.scale);
      // treeCloseRadius is a bulk view cull, not a deletion - visibility is right here.
      captured.node.visible = !hiddenByBulk;
    };

    for (const t of trees) {
      const px = t.position.x * c.treeSpread;
      const pz = t.position.z * c.treeSpread;
      const dist = Math.hypot(px, pz);
      const hiddenByBulk = dist < c.treeCloseRadius;
      applyOverride(
        t,
        [px, t.position.y + c.treeY, pz],
        t.rotationY,
        [t.scale.x * c.treeScale, t.scale.y * c.treeScale, t.scale.z * c.treeScale],
        hiddenByBulk
      );
    }

    if (bonfire) {
      // Unified "campfire" override slides the log along with the flame group,
      // so a single drag translates the whole assembly. The individual bonfire
      // override still carries scale/rotation tweaks.
      const campfireOffset = overrides["campfire"] ?? EMPTY_OVERRIDE;
      applyOverride(
        bonfire,
        [
          bonfire.position.x + c.bonfireX + campfireOffset.dx,
          bonfire.position.y + c.bonfireY + campfireOffset.dy,
          bonfire.position.z + c.bonfireZ + campfireOffset.dz,
        ],
        bonfire.rotationY + c.bonfireRotationY,
        [bonfire.scale.x * c.bonfireScale, bonfire.scale.y * c.bonfireScale, bonfire.scale.z * c.bonfireScale]
      );
    }

    for (const item of campItems) {
      applyOverride(
        item,
        [item.position.x * c.campItemsSpread, item.position.y + c.campItemsY, item.position.z * c.campItemsSpread],
        item.rotationY,
        [item.scale.x * c.campItemsScale, item.scale.y * c.campItemsScale, item.scale.z * c.campItemsScale]
      );
    }
  });

  return (
    <primitive
      object={scene}
      position={[config.sceneX, config.sceneY, config.sceneZ]}
      rotation={[0, config.sceneRotationY, 0]}
      scale={config.sceneScale}
      onClick={(e: THREE.Event & { object: THREE.Object3D; stopPropagation: () => void }) => {
        e.stopPropagation();
        let node: THREE.Object3D | null = e.object;
        while (node) {
          if (namedNodes.has(node.name)) {
            // Clicks on the bonfire log route to the unified "campfire" object
            // (log + flame + sparks + glow) so it can be selected and dragged
            // as one thing. The individual bonfire override still handles
            // scale/rotation independently.
            onSelect(node.name === "bonfire" ? "campfire" : node.name);
            return;
          }
          node = node.parent;
        }
      }}
    />
  );
}

interface FlameConeProps {
  color: string;
  opacity: number;
  radius: number;
  height: number;
  phase: number;
  y: number;
}

function FlameCone({ color, opacity, radius, height, phase, y }: FlameConeProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const time = clock.elapsedTime;
    const sway = Math.sin(time * 4.2 + phase) * 0.045;
    const pulse = 1 + Math.sin(time * 7.5 + phase) * 0.08 + Math.sin(time * 13.1 + phase) * 0.035;

    meshRef.current.rotation.z = sway;
    meshRef.current.scale.set(pulse, 1 + Math.sin(time * 5 + phase) * 0.08, pulse);
  });

  return (
    <mesh ref={meshRef} position={[0, y, 0]} rotation={[0, phase, 0]}>
      <coneGeometry args={[radius, height, 9, 1]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
  );
}

function CampfireFlame({ config }: { config: CampfireSceneConfig }) {
  return (
    <group position={[config.flameX, config.flameY, config.flameZ]} scale={config.flameScale}>
      <FlameCone color="#ff6b1a" opacity={0.82} radius={0.42} height={1.35} phase={0.3} y={0.62} />
      <FlameCone color="#ffb431" opacity={0.9} radius={0.28} height={1.05} phase={2.2} y={0.58} />
      <FlameCone color="#fff06a" opacity={0.95} radius={0.17} height={0.78} phase={4.3} y={0.52} />
      <mesh position={[0, 0.16, 0]}>
        <sphereGeometry args={[0.32, 16, 10]} />
        <meshBasicMaterial color="#ff7a1f" transparent opacity={0.45} depthWrite={false} />
      </mesh>
    </group>
  );
}

function createGlowTexture() {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, "rgba(255,140,50,1)");
  gradient.addColorStop(0.35, "rgba(255,110,30,0.55)");
  gradient.addColorStop(0.7, "rgba(255,90,20,0.18)");
  gradient.addColorStop(1, "rgba(255,80,15,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function FireGlowDisc({ opacity, x, y, z, scale }: { opacity: number; x: number; y: number; z: number; scale: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const texture = useMemo(() => createGlowTexture(), []);
  const paramsRef = useRef({ opacity, scale });
  paramsRef.current = { opacity, scale };

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const material = meshRef.current.material as THREE.MeshBasicMaterial;
    const { opacity: op, scale: sc } = paramsRef.current;
    const flicker = 0.9 + Math.sin(clock.elapsedTime * 7.4) * 0.15 + Math.sin(clock.elapsedTime * 14.2) * 0.075;
    material.opacity = op * flicker;
    const breathe = 1 + Math.sin(clock.elapsedTime * 3.1) * 0.04;
    meshRef.current.scale.set(9 * sc * breathe, 6.3 * sc * breathe, 1);
  });

  return (
    <mesh ref={meshRef} position={[x, y, z]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={2}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial
        map={texture}
        color="#ff7a1f"
        transparent
        opacity={opacity}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
}

/** Sky and moon. These belong to the whole campsite, not to any one location. */
function WorldLights({ config }: { config: CampfireSceneConfig }) {
  return (
    <>
      <ambientLight intensity={config.ambientIntensity} color="#1b2944" />
      <hemisphereLight intensity={config.ambientIntensity * 2.6} color="#49688f" groundColor="#160b10" />
      <directionalLight position={[-4, 7, -6]} intensity={config.moonIntensity} color="#82aaff" />
    </>
  );
}

/**
 * Everything the fire throws. Lives INSIDE location 0, so its positions stay the
 * local offsets they always were and the whole rig travels with the campfire when
 * the ring radius changes.
 */
function CampfireLights({ config }: { config: CampfireSceneConfig }) {
  const fireLight = useRef<THREE.PointLight>(null);
  const farGlow = useRef<THREE.PointLight>(null);
  const warmSpot = useRef<THREE.SpotLight>(null);

  useFrame(({ clock }) => {
    const time = clock.elapsedTime;
    const flicker =
      1 +
      config.flickerAmount *
        (Math.sin(time * 8.1) * 0.12 + Math.sin(time * 15.7) * 0.08 + Math.sin(time * 23.3) * 0.035);

    if (fireLight.current) {
      fireLight.current.intensity = config.fireIntensity * flicker;
      fireLight.current.decay = config.fireDecay;
      fireLight.current.distance = config.fireLightReach;
      fireLight.current.position.x = config.fireLightX + Math.sin(time * 3.3) * 0.05 * config.flickerAmount;
      fireLight.current.position.y = config.fireLightY;
      fireLight.current.position.z = config.fireLightZ + Math.cos(time * 2.7) * 0.05 * config.flickerAmount;
    }

    if (farGlow.current) {
      const slowFlicker = 1 + config.flickerAmount * (Math.sin(time * 2.3) * 0.06 + Math.sin(time * 4.1) * 0.03);
      farGlow.current.intensity = config.farGlowIntensity * slowFlicker;
      farGlow.current.decay = config.farGlowDecay;
      farGlow.current.distance = config.farGlowReach;
      farGlow.current.position.set(config.fireLightX, config.fireLightY, config.fireLightZ);
    }

    if (warmSpot.current) {
      warmSpot.current.intensity = config.fireIntensity * 0.68 * flicker;
    }
  });

  return (
    <>
      <pointLight
        ref={fireLight}
        position={[config.fireLightX, config.fireLightY, config.fireLightZ]}
        color="#ff781f"
        intensity={config.fireIntensity}
        distance={config.fireLightReach}
        decay={config.fireDecay}
      />
      <pointLight
        ref={farGlow}
        position={[config.fireLightX, config.fireLightY, config.fireLightZ]}
        color="#ff9a45"
        intensity={config.farGlowIntensity}
        distance={config.farGlowReach}
        decay={config.farGlowDecay}
      />
      <spotLight
        ref={warmSpot}
        position={[config.warmLightX, config.warmLightY, config.warmLightZ]}
        color="#ff8a2a"
        intensity={config.fireIntensity * 0.68}
        distance={config.warmLightReach}
        angle={config.warmLightAngle}
        penumbra={0.85}
        castShadow
        shadow-bias={-0.0004}
        shadow-normalBias={0.035}
        // three defaults to a 512x512 shadow map. Stretched over the whole camp that
        // is ~1cm per texel on the animals, which is what reads as blocky, pixelated
        // shading across their fur.
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.5}
        shadow-camera-far={config.warmLightReach}
      />
    </>
  );
}

interface SparkState {
  bornAt: number;
  lifetime: number;
  x0: number;
  z0: number;
  vx: number;
  vy: number;
  vz: number;
  swayAmp: number;
  swayPhase: number;
  maxHeight: number;
  burst: boolean;
}

function Sparks({
  opacity,
  x,
  z,
  count,
  spread,
  maxHeight,
  speed,
  sway,
  burstChance,
  size,
  lifetime,
}: {
  opacity: number;
  x: number;
  z: number;
  count: number;
  spread: number;
  maxHeight: number;
  speed: number;
  sway: number;
  burstChance: number;
  size: number;
  lifetime: number;
}) {
  const SPARK_COUNT = Math.max(1, Math.min(2000, Math.round(count)));
  const pointsRef = useRef<THREE.Points>(null);
  const bufferRef = useRef<THREE.BufferAttribute>(null);
  const alphaBufferRef = useRef<THREE.BufferAttribute>(null);

  const { positions, alphas, sparks } = useMemo(() => {
    const random = seededRandom(31);
    const pos = new Float32Array(SPARK_COUNT * 3);
    const al = new Float32Array(SPARK_COUNT);
    const st: SparkState[] = [];
    for (let i = 0; i < SPARK_COUNT; i += 1) {
      const angle = random() * Math.PI * 2;
      const r0 = random() * spread;
      const stagger = -random() * lifetime * 1.5;
      const burst = random() < burstChance;
      st.push({
        bornAt: stagger,
        lifetime: (burst ? lifetime * 1.4 : lifetime) * (0.7 + random() * 0.6),
        x0: Math.cos(angle) * r0,
        z0: Math.sin(angle) * r0,
        vx: (random() - 0.5) * (burst ? 1.6 : 0.4) * sway,
        vy: (burst ? 2.2 + random() * 1.8 : 1.0 + random() * 0.9) * speed,
        vz: (random() - 0.5) * (burst ? 1.6 : 0.4) * sway,
        swayAmp: (0.1 + random() * 0.6) * sway,
        swayPhase: random() * Math.PI * 2,
        maxHeight: (burst ? maxHeight * 1.6 : maxHeight) * (0.7 + random() * 0.6),
        burst,
      });
      pos[i * 3] = st[i].x0;
      pos[i * 3 + 1] = 0.3;
      pos[i * 3 + 2] = st[i].z0;
      al[i] = 0;
    }
    return { positions: pos, alphas: al, sparks: st };
    // deliberately depend on SPARK_COUNT so buffers resize when count changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [SPARK_COUNT]);

  // keep latest params in a ref so useFrame can pick them up without re-registering
  const paramsRef = useRef({ spread, maxHeight, speed, sway, burstChance, lifetime });
  paramsRef.current = { spread, maxHeight, speed, sway, burstChance, lifetime };

  const seedRef = useRef(seededRandom(97));

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const posAttr = bufferRef.current;
    const alphaAttr = alphaBufferRef.current;
    if (!posAttr || !alphaAttr) return;
    const posArr = posAttr.array as Float32Array;
    const alphaArr = alphaAttr.array as Float32Array;

    const p = paramsRef.current;
    for (let i = 0; i < SPARK_COUNT; i += 1) {
      const s = sparks[i];
      let age = t - s.bornAt;
      if (age > s.lifetime) {
        const rand = seedRef.current;
        const burst = rand() < p.burstChance;
        s.bornAt = t;
        s.lifetime = (burst ? p.lifetime * 1.4 : p.lifetime) * (0.7 + rand() * 0.6);
        const angle = rand() * Math.PI * 2;
        const r0 = rand() * p.spread;
        s.x0 = Math.cos(angle) * r0;
        s.z0 = Math.sin(angle) * r0;
        s.vx = (rand() - 0.5) * (burst ? 1.6 : 0.4) * p.sway;
        s.vy = (burst ? 2.2 + rand() * 1.8 : 1.0 + rand() * 0.9) * p.speed;
        s.vz = (rand() - 0.5) * (burst ? 1.6 : 0.4) * p.sway;
        s.swayAmp = (0.1 + rand() * 0.6) * p.sway;
        s.swayPhase = rand() * Math.PI * 2;
        s.maxHeight = (burst ? p.maxHeight * 1.6 : p.maxHeight) * (0.7 + rand() * 0.6);
        s.burst = burst;
        age = 0;
      }

      const drag = 1 - Math.min(1, age * 0.55);
      const ax = s.x0 + s.vx * age * drag + Math.sin(age * 4.2 + s.swayPhase) * s.swayAmp * 0.35;
      const az = s.z0 + s.vz * age * drag + Math.cos(age * 3.9 + s.swayPhase) * s.swayAmp * 0.35;
      // ease-out rise
      const rise = Math.min(s.maxHeight, s.vy * age - 0.35 * age * age);
      posArr[i * 3] = ax;
      posArr[i * 3 + 1] = 0.3 + rise;
      posArr[i * 3 + 2] = az;

      // alpha: fade in fast, fade out slower; extra flicker
      const norm = age / s.lifetime;
      const fadeIn = Math.min(1, norm * 6);
      const fadeOut = 1 - Math.pow(norm, 1.8);
      const flick = 0.75 + 0.25 * Math.sin(age * 22 + s.swayPhase);
      alphaArr[i] = Math.max(0, fadeIn * fadeOut * flick) * (s.burst ? 1.15 : 1);
    }

    posAttr.needsUpdate = true;
    alphaAttr.needsUpdate = true;
    if (pointsRef.current) {
      (pointsRef.current.material as THREE.PointsMaterial).opacity = opacity;
    }
  });

  return (
    <group position={[x, 0, z]}>
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute ref={bufferRef} attach="attributes-position" args={[positions, 3]} />
          <bufferAttribute ref={alphaBufferRef} attach="attributes-alpha" args={[alphas, 1]} />
        </bufferGeometry>
        <pointsMaterial
          color="#ffc66d"
          size={size}
          sizeAttenuation
          transparent
          opacity={opacity}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          onBeforeCompile={(shader) => {
            shader.vertexShader = shader.vertexShader
              .replace(
                "void main() {",
                "attribute float alpha;\nvarying float vAlpha;\nvoid main() {\n  vAlpha = alpha;"
              );
            shader.fragmentShader = shader.fragmentShader
              .replace(
                "void main() {",
                "varying float vAlpha;\nvoid main() {"
              )
              .replace(
                "vec4 diffuseColor = vec4( diffuse, opacity );",
                "vec4 diffuseColor = vec4( diffuse, opacity * vAlpha );"
              );
          }}
        />
      </points>
    </group>
  );
}

function WoodLogBench({
  angle,
  name,
  config,
  onSelect,
  model,
}: {
  angle: number;
  name: string;
  config: CampfireSceneConfig;
  onSelect: (name: string) => void;
  model: BenchModel;
}) {
  const gltf = useGLTF(model.url) as unknown as { scene: THREE.Group };
  const groupRef = useRef<THREE.Group>(null);
  const cfgRef = useRef(config);
  cfgRef.current = config;

  useFrame(() => {
    if (!groupRef.current) return;
    const c = cfgRef.current;
    const o = c.objectOverrides?.[name] ?? EMPTY_OVERRIDE;
    const x = Math.cos(angle) * c.benchRadius;
    const z = Math.sin(angle) * c.benchRadius;
    groupRef.current.position.set(x + o.dx, o.dy, z + o.dz);
    groupRef.current.rotation.set(o.rotX, -angle + c.benchAngleOffset + o.rotY, o.rotZ);
    const s = c.benchScale * o.scale;
    groupRef.current.scale.set(s, s, s);
  });

  return (
    <group
      ref={groupRef}
      name={name}
      onClick={(e: THREE.Event & { stopPropagation: () => void }) => {
        e.stopPropagation();
        onSelect(name);
      }}
    >
      <group position={model.anchor}>
        <group scale={model.scale}>
          <Clone object={gltf.scene} deep="materialsOnly" castShadow receiveShadow />
        </group>
      </group>
    </group>
  );
}

/**
 * The camper diorama, parked behind the bench ring. Selectable and nudgeable in the
 * lab under the name "camper" like everything else, since the placement below is my
 * best guess from the model's bounds rather than something you picked.
 */
function Camper({
  config,
  onSelect,
}: {
  config: CampfireSceneConfig;
  onSelect: (name: string) => void;
}) {
  const gltf = useGLTF(CAMPER_URL) as unknown as { scene: THREE.Group; animations: THREE.AnimationClip[] };
  const groupRef = useRef<THREE.Group>(null);
  const model = useMemo(() => skeletonClone(gltf.scene) as THREE.Group, [gltf.scene]);
  const { actions, names: actionNames } = useAnimations(gltf.animations || [], groupRef);

  const cfgRef = useRef(config);
  cfgRef.current = config;

  useEffect(() => {
    // 16.7s of gentle sway on the string lights and plants - not a turntable.
    const key = actionNames[0];
    if (!key || !actions?.[key]) return;
    const action = actions[key];
    action.reset().fadeIn(0.5).play();
    return () => { action.fadeOut(0.3); };
  }, [actions, actionNames]);

  useEffect(() => {
    model.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh || !mesh.material) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      // Two of its three materials ship as alphaMode BLEND, same trap as the animals:
      // renders see-through and stops writing depth.
      (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach((m) => {
        if (m.transparent) { m.transparent = false; m.needsUpdate = true; }
        if (!m.depthWrite) { m.depthWrite = true; m.needsUpdate = true; }
      });
    });
  }, [model]);

  useFrame(() => {
    if (!groupRef.current) return;
    const o = cfgRef.current.objectOverrides?.["camper"] ?? EMPTY_OVERRIDE;
    groupRef.current.position.set(CAMPER_BASE.x + o.dx, CAMPER_BASE.y + o.dy, CAMPER_BASE.z + o.dz);
    groupRef.current.rotation.set(o.rotX, CAMPER_BASE.rotY + o.rotY, o.rotZ);
    const s = CAMPER_BASE.scale * o.scale;
    groupRef.current.scale.set(s, s, s);
  });

  return (
    <group
      ref={groupRef}
      name="camper"
      onClick={(e: THREE.Event & { stopPropagation: () => void }) => {
        e.stopPropagation();
        onSelect("camper");
      }}
    >
      <group position={[-CAMPER_ANCHOR[0], -CAMPER_ANCHOR[1], -CAMPER_ANCHOR[2]]}>
        <primitive object={model} />
        {/* Warm point light inside the van body, plus flat emissive panels behind
         *  the window openings so the glass reads as lit even at night. The van
         *  interior spans roughly X ±2.5, Y 1-5, Z -4 to 4 in model units. */}
        <pointLight position={[0, 2.8, 1.4]} intensity={3.5} distance={6} decay={1.6} color="#ffd08a" />
        {/* Right-side windows */}
        <mesh position={[2.55, 3.1, -0.6]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[2.4, 1.1]} />
          <meshBasicMaterial color="#ffd88a" transparent opacity={0.95} toneMapped={false} />
        </mesh>
        {/* Left-side windows */}
        <mesh position={[-2.55, 3.1, -0.6]} rotation={[0, -Math.PI / 2, 0]}>
          <planeGeometry args={[2.4, 1.1]} />
          <meshBasicMaterial color="#ffd88a" transparent opacity={0.95} toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}

/**
 * The replacement tent. Driven by the same tentX/Y/Z/RotationY/Scale config the old
 * built-in one used, so nothing you'd already tuned changes meaning.
 */
/**
 * Loads and clones a GLB, turning every mesh into a shadow-caster. Used for
 * the vehicles - they have no per-instance state so a Selectable wrapper
 * carries the transform and click handling.
 */
function GLBModel({ url }: { url: string }) {
  const gltf = useGLTF(url) as unknown as { scene: THREE.Group };
  const model = useMemo(() => gltf.scene.clone(true), [gltf.scene]);
  useEffect(() => {
    model.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.castShadow = true;
        m.receiveShadow = true;
      }
    });
  }, [model]);
  return <primitive object={model} />;
}

/**
 * The pickup truck, but with the arcade lit up: front headlights burn hot white
 * and the brake-light bar burns red, both driven by cloned emissive copies of
 * the model's own "Headlights"/"BrakeLight" materials so nothing else on the
 * truck goes glowy. A handful of tiny point/spot lights ride along in the
 * truck's local frame so the glow actually reaches nearby geometry - the
 * headlights throw a cone forward, the tail lights bleed a red wash back into
 * the open bed where the TVs sit.
 *
 * Local coordinates (untransformed model space):
 *   front bumper strip     ~ (0, 0.96, +2.54)
 *   tail-light strip       ~ (0, 0.97, -2.43)
 *   local +Z is forward; ArcadeSector rotates the truck 180 deg so the
 *   open bed faces the camera.
 */
function LitPickupTruck() {
  const gltf = useGLTF(PICKUP_TRUCK_URL) as unknown as { scene: THREE.Group };
  const model = useMemo(() => gltf.scene.clone(true), [gltf.scene]);

  useEffect(() => {
    model.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      const swapped = mats.map((m) => {
        const mat = m as THREE.MeshStandardMaterial;
        if (!mat) return mat;
        if (mat.name === "Headlights") {
          // Hot white-yellow, bright enough to read as "on" against night grass.
          const bright = mat.clone();
          bright.emissive = new THREE.Color("#fff2c0");
          bright.emissiveIntensity = 4.0;
          bright.toneMapped = false;
          bright.needsUpdate = true;
          return bright;
        }
        if (mat.name === "BrakeLight") {
          const bright = mat.clone();
          bright.emissive = new THREE.Color("#ff2b1f");
          bright.emissiveIntensity = 3.4;
          bright.toneMapped = false;
          bright.needsUpdate = true;
          return bright;
        }
        return mat;
      });
      mesh.material = Array.isArray(mesh.material) ? swapped : swapped[0];
    });
  }, [model]);

  // Subtle flicker so the lights read as *on* rather than as texture bake.
  const headlightL = useRef<THREE.SpotLight>(null);
  const headlightR = useRef<THREE.SpotLight>(null);
  const brake = useRef<THREE.PointLight>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const jitter = 0.9 + Math.sin(t * 13.1) * 0.05 + Math.sin(t * 27.3) * 0.03;
    if (headlightL.current) headlightL.current.intensity = 5.2 * jitter;
    if (headlightR.current) headlightR.current.intensity = 5.2 * jitter;
    if (brake.current) brake.current.intensity = 2.8 + Math.sin(t * 2.7) * 0.15;
  });

  return (
    <group>
      <primitive object={model} />

      {/* Headlights — two forward-facing spots at the front bumper strip.
          Locally +Z is the truck's forward axis; SpotLight defaults to
          pointing along -Y, so we set targets ahead of each lamp to steer
          the cone along +Z. */}
      <spotLight
        ref={headlightL}
        position={[0.62, 0.96, 2.60]}
        color="#fff6d2"
        intensity={5.2}
        distance={12}
        decay={1.6}
        angle={0.6}
        penumbra={0.55}
        castShadow={false}
        target-position={[1.1, 0.2, 8]}
      />
      <spotLight
        ref={headlightR}
        position={[-0.62, 0.96, 2.60]}
        color="#fff6d2"
        intensity={5.2}
        distance={12}
        decay={1.6}
        angle={0.6}
        penumbra={0.55}
        castShadow={false}
        target-position={[-1.1, 0.2, 8]}
      />

      {/* Tail-light glow — red wash that spills back into the open bed. */}
      <pointLight
        ref={brake}
        position={[0, 1.0, -2.55]}
        color="#ff2a1c"
        intensity={2.8}
        distance={4.2}
        decay={1.8}
      />
    </group>
  );
}

function Tent({
  config,
  onSelect,
}: {
  config: CampfireSceneConfig;
  onSelect: (name: string) => void;
}) {
  const gltf = useGLTF(TENT_URL) as unknown as { scene: THREE.Group };
  const groupRef = useRef<THREE.Group>(null);
  const model = useMemo(() => gltf.scene.clone(true), [gltf.scene]);
  const cfgRef = useRef(config);
  cfgRef.current = config;

  useEffect(() => {
    model.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh || !mesh.material) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach((m) => {
        if (m.transparent) { m.transparent = false; m.needsUpdate = true; }
        if (!m.depthWrite) { m.depthWrite = true; m.needsUpdate = true; }
      });
    });
  }, [model]);

  useFrame(() => {
    if (!groupRef.current) return;
    const c = cfgRef.current;
    const o = c.objectOverrides?.["tent"] ?? EMPTY_OVERRIDE;
    groupRef.current.position.set(
      TENT_BASE.x + c.tentX + o.dx,
      TENT_BASE.y + c.tentY + o.dy,
      TENT_BASE.z + c.tentZ + o.dz
    );
    groupRef.current.rotation.set(o.rotX, c.tentRotationY + o.rotY, o.rotZ);
    const s = c.tentScale * o.scale;
    groupRef.current.scale.set(s, s, s);
  });

  return (
    <group
      ref={groupRef}
      name="tent"
      onClick={(e: THREE.Event & { stopPropagation: () => void }) => {
        e.stopPropagation();
        onSelect("tent");
      }}
    >
      <group position={TENT_ANCHOR}>
        <group rotation={TENT_UPRIGHT}>
          <primitive object={model} />
        </group>
      </group>
    </group>
  );
}

function Benches({
  config,
  onSelect,
}: {
  config: CampfireSceneConfig;
  onSelect: (name: string) => void;
}) {
  return (
    <>
      {BENCH_ANGLES.map((angle, index) => {
        const name = `bench_${index}`;
        // Unmounted, not hidden: the component never enters the scene graph.
        if ((config.objectOverrides?.[name]?.hide ?? 0) >= 0.5) return null;
        return (
          <WoodLogBench
            key={`bench-${index}`}
            name={name}
            angle={angle}
            config={config}
            onSelect={onSelect}
            model={BENCH_MODELS[index] ?? OLD_LOG}
          />
        );
      })}
    </>
  );
}

/**
 * Parents a prop to the rig's "Food" socket bone. The sit_log clip keys that bone
 * to the right paw's grip point every frame, so the prop inherits the breathing
 * and the moving-hold drift for free.
 */
function SocketProp({
  root,
  prop,
  ready,
  config,
}: {
  root: RefObject<THREE.Group | null>;
  prop: PropAttachment;
  ready: unknown;
  config: CampfireSceneConfig;
}) {
  const gltf = useGLTF(prop.url) as unknown as { scene: THREE.Group };
  // Live handle so useFrame can re-apply the config-driven transform without
  // remounting the prop every time a slider moves.
  const propRef = useRef<THREE.Object3D | null>(null);
  const configRef = useRef(config);
  configRef.current = config;

  useEffect(() => {
    if (!root.current) return;
    let socket: THREE.Object3D | null = null;
    root.current.traverse((o) => {
      if (!socket && (o.name === "Food" || o.name === "food")) socket = o;
    });
    if (!socket) return;
    const attached = socket as THREE.Object3D;
    // Skinned models need SkeletonUtils to rebind bones -> the SkinnedMesh's
    // .skeleton reference. Plain Object3D.clone leaves the SkinnedMesh pointing
    // at the source's bones, which either freezes the clone at bind pose or
    // makes it deform in lockstep with any other consumer of the same source.
    let hasSkinned = false;
    gltf.scene.traverse((o) => { if ((o as THREE.SkinnedMesh).isSkinnedMesh) hasSkinned = true; });
    const obj = (hasSkinned ? skeletonClone(gltf.scene) : gltf.scene.clone(true)) as THREE.Object3D;
    obj.scale.setScalar(prop.scale);
    // sit_log already aims the socket down the stick axis, so the prop needs no
    // correction of its own.
    const [rx, ry, rz] = prop.rotation ?? [0, 0, 0];
    obj.rotation.set(rx, ry, rz);
    const [px, py, pz] = prop.position ?? [0, 0, 0];
    obj.position.set(px, py, pz);
    obj.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
    attached.add(obj);
    propRef.current = obj;

    // Optional wooden roasting stick, added as a sibling of the prop under the
    // same socket. Cylinder geometry runs along +Y by default, so a rotation of
    // 90 deg on X lays it along the socket's +Z axis (the stick line the sit_log
    // clip already keys the socket to).
    let stick: THREE.Mesh | null = null;
    if (prop.stickLength && prop.stickLength > 0) {
      const radius = prop.stickRadius ?? 0.015;
      const geo = new THREE.CylinderGeometry(radius, radius, prop.stickLength, 8);
      const mat = new THREE.MeshStandardMaterial({ color: "#6b4423", roughness: 0.9 });
      stick = new THREE.Mesh(geo, mat);
      stick.rotation.x = Math.PI / 2;
      stick.castShadow = true;
      stick.receiveShadow = true;
      attached.add(stick);
    }

    return () => {
      attached.remove(obj);
      propRef.current = null;
      if (stick) {
        attached.remove(stick);
        stick.geometry.dispose();
        (stick.material as THREE.Material).dispose();
      }
    };
  }, [gltf.scene, prop.url, prop.scale, prop.rotation, prop.position, prop.stickLength, prop.stickRadius, root, ready]);

  // Live config-driven overrides: re-apply each frame on top of the baseline
  // transform so sliders in the lab move the banjo without rebuilding it.
  useFrame(() => {
    const obj = propRef.current;
    if (!obj || !prop.configKey) return;
    const c = configRef.current;
    if (prop.configKey === "banjoProp") {
      const [px, py, pz] = prop.position ?? [0, 0, 0];
      const [rx, ry, rz] = prop.rotation ?? [0, 0, 0];
      obj.position.set(px + c.banjoPropX, py + c.banjoPropY, pz + c.banjoPropZ);
      obj.rotation.set(rx + c.banjoPropRotX, ry + c.banjoPropRotY, rz + c.banjoPropRotZ);
      obj.scale.setScalar(prop.scale * c.banjoPropScale);
    }
  });

  return null;
}

/**
 * A prop carried between two bones, for rigs with no socket to hang one from.
 *
 * Sits at the live midpoint of the pair, recomputed each frame - the same fix the
 * bears' roasting stick needed, where anchoring to one paw made it orbit that wrist.
 * Also publishes where the prop's cord leaves it, so a wire can find that point.
 */
function PawProp({
  root,
  spec,
  ready,
  name,
  cords,
}: {
  root: RefObject<THREE.Group | null>;
  spec: HandheldAttachment;
  ready: unknown;
  name: string;
  /** where this prop's cord exits, in world space, published for the wire */
  cords?: RefObject<CordRegistry>;
}) {
  const gltf = useGLTF(spec.url) as unknown as { scene: THREE.Group };
  const objRef = useRef<THREE.Object3D | null>(null);
  const bonesRef = useRef<THREE.Object3D[]>([]);
  const cordRef = useRef<THREE.Object3D | null>(null);
  const a = useMemo(() => new THREE.Vector3(), []);
  const b = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    const parent = root.current;
    if (!parent) return;
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
    const targets = spec.bones.map(norm);
    const found = new Map<string, THREE.Object3D>();
    parent.traverse((o) => {
      const idx = targets.indexOf(norm(o.name));
      if (idx >= 0 && !found.has(spec.bones[idx])) found.set(spec.bones[idx], o);
    });
    const pair = spec.bones.map((n) => found.get(n)).filter(Boolean) as THREE.Object3D[];
    if (pair.length < 2) {
      console.warn(`[scene] "${name}": could not find paw bones ${spec.bones.join(" / ")}`);
      return;
    }
    bonesRef.current = pair;

    const obj = gltf.scene.clone(true);
    obj.scale.setScalar(spec.scale);
    const [rx, ry, rz] = spec.rotation ?? [0, 0, 0];
    obj.rotation.set(rx, ry, rz);
    obj.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = false;
      }
    });
    // An empty marker at the cord exit, so the wire endpoint rides the prop exactly
    // instead of being re-derived from the prop's transform every frame.
    const cordPoint = new THREE.Object3D();
    cordPoint.position.copy(CONTROLLER_CORD_EXIT);
    obj.add(cordPoint);
    cordRef.current = cordPoint;

    parent.add(obj);
    objRef.current = obj;
    return () => {
      parent.remove(obj);
      objRef.current = null;
      cordRef.current = null;
      cords?.current?.delete(name);
    };
  }, [gltf.scene, spec, root, ready, name, cords]);

  useFrame(() => {
    const obj = objRef.current;
    const parent = root.current;
    const pair = bonesRef.current;
    if (!obj || !parent || pair.length < 2) return;

    pair[0].getWorldPosition(a);
    pair[1].getWorldPosition(b);
    a.add(b).multiplyScalar(0.5);
    parent.worldToLocal(a);
    obj.position.set(a.x + spec.offset[0], a.y + spec.offset[1], a.z + spec.offset[2]);

    if (cords?.current && cordRef.current) {
      obj.updateMatrixWorld(true);
      cordRef.current.getWorldPosition(b);
      const store = cords.current.get(name) ?? new THREE.Vector3();
      cords.current.set(name, store.copy(b));
    }
  });

  return null;
}

/**
 * The GameCube. Publishes its four port positions in world space each frame so the
 * wires can find them wherever the config sliders have put it.
 */
function GameCubeConsole({
  config,
  onSelect,
  ports,
}: {
  config: CampfireSceneConfig;
  onSelect: (name: string) => void;
  ports: RefObject<PortRegistry>;
}) {
  const gltf = useGLTF(GAMECUBE_URL) as unknown as { scene: THREE.Group };
  const model = useMemo(() => gltf.scene.clone(true), [gltf.scene]);
  const groupRef = useRef<THREE.Group>(null);
  const cfg = useRef(config);
  cfg.current = config;
  const tmp = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    model.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    });
  }, [model]);

  useFrame(() => {
    const group = groupRef.current;
    if (!group) return;
    const c = cfg.current;
    const o = c.objectOverrides?.["gamecube"] ?? EMPTY_OVERRIDE;
    group.position.set(CONSOLE_BASE.x + o.dx, CONSOLE_BASE.y + o.dy, CONSOLE_BASE.z + o.dz);
    group.rotation.set(o.rotX, CONSOLE_BASE.rotY + o.rotY, o.rotZ);
    const s = CONSOLE_BASE.scale * o.scale;
    group.scale.set(s, s, s);

    group.updateMatrixWorld(true);
    for (let i = 0; i < CONSOLE_PORTS.length; i++) {
      tmp.set(...CONSOLE_PORTS[i]);
      group.localToWorld(tmp);
      const store = ports.current.get(i) ?? new THREE.Vector3();
      ports.current.set(i, store.copy(tmp));
    }
  });

  return (
    <group
      ref={groupRef}
      name="gamecube"
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        onSelect("gamecube");
      }}
    >
      <primitive object={model} />
    </group>
  );
}

/**
 * One controller lead. The ONLY thing in this scene that stretches - the console and
 * the controllers are rigid, and the slack between them is taken up here.
 *
 * It bows sideways rather than sagging, because both ends sit within a few centimetres
 * of the floor and a hanging curve would just clip through it; each lead bows by a
 * different amount so the four fan out across the ground instead of overlapping.
 *
 * The geometry is only rebuilt when an end actually moves - the cubs breathe, but a
 * couple of millimetres is not worth a new tube every frame.
 */
function ControllerWire({
  index,
  cords,
  ports,
  cubName,
}: {
  index: number;
  cords: RefObject<CordRegistry>;
  ports: RefObject<PortRegistry>;
  cubName: string;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const a = useMemo(() => new THREE.Vector3(), []);
  const b = useMemo(() => new THREE.Vector3(), []);
  const mid = useMemo(() => new THREE.Vector3(), []);
  const lastA = useRef(new THREE.Vector3(NaN, NaN, NaN));
  const lastB = useRef(new THREE.Vector3(NaN, NaN, NaN));

  const initial = useMemo(
    () =>
      new THREE.TubeGeometry(
        new THREE.QuadraticBezierCurve3(
          new THREE.Vector3(),
          new THREE.Vector3(0, 0, 0.5),
          new THREE.Vector3(0, 0, 1)
        ),
        20,
        WIRE_RADIUS,
        6,
        false
      ),
    []
  );

  useEffect(() => () => { meshRef.current?.geometry?.dispose(); }, []);

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh || !mesh.parent) return;
    const from = cords.current?.get(cubName);
    const to = ports.current?.get(index);
    if (!from || !to) {
      mesh.visible = false;
      return;
    }
    mesh.visible = true;

    a.copy(from);
    b.copy(to);
    mesh.parent.worldToLocal(a);
    mesh.parent.worldToLocal(b);
    // 2mm of movement is below anything you could see on a 4mm cord
    if (a.distanceToSquared(lastA.current) < 4e-6 && b.distanceToSquared(lastB.current) < 4e-6) return;
    lastA.current.copy(a);
    lastB.current.copy(b);

    mid.copy(a).lerp(b, 0.5);
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const len = Math.hypot(dx, dz) || 1;
    const bow = (index - (CONSOLE_PORTS.length - 1) / 2) * 0.06;
    mid.x += (-dz / len) * bow;
    mid.z += (dx / len) * bow;
    mid.y = WIRE_RADIUS * 1.2; // lying on the ground between the two ends

    mesh.geometry.dispose();
    mesh.geometry = new THREE.TubeGeometry(
      new THREE.QuadraticBezierCurve3(a.clone(), mid.clone(), b.clone()),
      20,
      WIRE_RADIUS,
      6,
      false
    );
  });

  return (
    <mesh ref={meshRef} geometry={initial} castShadow>
      <meshStandardMaterial color="#15171b" roughness={0.9} metalness={0} />
    </mesh>
  );
}

/**
 * Bolted onto a bone so it rides the animation. The bone bases were measured off the
 * rig, so a model authored Y-up / +Z-forward lands the right way round on its own.
 */
function BearAccessory({
  root,
  kind,
  ready,
  config,
}: {
  root: RefObject<THREE.Group | null>;
  kind: "glasses" | "tie";
  ready: unknown;
  config: CampfireSceneConfig;
}) {
  const attached = useRef<THREE.Object3D | null>(null);
  const cfgRef = useRef(config);
  cfgRef.current = config;
  // Glasses come from a file; the tie is built here, since there wasn't one.
  const glassesGltf = useGLTF(GLASSES_URL) as unknown as { scene: THREE.Group };

  const tie = useMemo(() => {
    if (kind !== "tie") return null;
    const group = new THREE.Group();
    const cloth = new THREE.MeshStandardMaterial({ color: "#8c2f39", roughness: 0.82, metalness: 0 });
    const knotMat = new THREE.MeshStandardMaterial({ color: "#71242d", roughness: 0.85, metalness: 0 });

    const knot = new THREE.Mesh(new THREE.BoxGeometry(0.125, 0.1, 0.07), knotMat);
    knot.position.set(0, 0, 0);
    group.add(knot);

    // blade: wide at the shoulders, flaring, then down to a point
    const shape = new THREE.Shape();
    shape.moveTo(-0.052, -0.04);
    shape.lineTo(0.052, -0.04);
    shape.lineTo(0.075, -0.16);
    shape.lineTo(0, -0.46);
    shape.lineTo(-0.075, -0.16);
    shape.closePath();
    const blade = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.045, bevelEnabled: false }), cloth);
    blade.position.z = -0.022;
    group.add(blade);

    group.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) { m.castShadow = true; m.receiveShadow = false; }
    });
    return group;
  }, [kind]);

  useEffect(() => {
    if (!root.current) return;
    const boneName = kind === "glasses" ? "head" : "chest";
    let bone: THREE.Object3D | null = null;
    root.current.traverse((o) => { if (!bone && o.name === boneName) bone = o; });
    if (!bone) return;
    const parent = bone as THREE.Object3D;

    let obj: THREE.Object3D;
    if (kind === "glasses") {
      obj = glassesGltf.scene.clone(true);
      // Model is 33 units wide with its centre at [0, 4.6, -11.5] and the arms
      // trailing to -Z. Re-anchor onto the lens plane, then scale to a ~0.45-wide
      // pair against the bear's 0.252 eye separation.
      const inner = new THREE.Group();
      obj.position.set(0, -4.596, -0.94);
      inner.add(obj);
      inner.scale.setScalar(0.0136);
      inner.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) { m.castShadow = true; m.receiveShadow = false; }
      });
      // placement is applied per-frame below so the lab sliders are live
      obj = inner;
    } else {
      if (!tie) return;
      obj = tie;
      // just under the chin, on the chest surface measured at chest-local z ~0.52
      obj.position.set(0, 0.2, 0.5);
      obj.quaternion.copy(boneBasis(CHEST_FWD_LOCAL, CHEST_UP_LOCAL));
    }

    parent.add(obj);
    attached.current = obj;
    return () => { parent.remove(obj); attached.current = null; };
  }, [root, kind, ready, glassesGltf.scene, tie]);

  // Height and nose-ride are deliberately separate axes: the bears have a long muzzle,
  // so how high the lenses sit and how far down the nose they perch are independent.
  useFrame(() => {
    const obj = attached.current;
    if (!obj || kind !== "glasses") return;
    const c = cfgRef.current;
    obj.position
      .set(0, 0.3615, 0.0943)
      .addScaledVector(FACE_UP_LOCAL, c.glassesHeight)
      .addScaledVector(FACE_FWD_LOCAL, 0.052 + c.glassesNoseRide);
    obj.quaternion
      .copy(boneBasis(FACE_FWD_LOCAL, FACE_UP_LOCAL))
      .multiply(new THREE.Quaternion().setFromAxisAngle(FACE_RIGHT_LOCAL, c.glassesTilt));
    obj.scale.setScalar(0.0136 * c.glassesScale);
  });

  useEffect(() => () => {
    tie?.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.geometry.dispose();
        (Array.isArray(m.material) ? m.material : [m.material]).forEach((x) => x.dispose());
      }
    });
  }, [tie]);

  return null;
}

function Animal({
  placement,
  name,
  config,
  onSelect,
  heads,
  cords,
  seed = 0,
}: {
  placement: AnimalPlacement;
  name: string;
  config: CampfireSceneConfig;
  onSelect: (name: string) => void;
  /** shared live head positions, so bears can find each other without prop drilling */
  heads?: RefObject<HeadRegistry>;
  /** shared cord-exit positions, so the wires can find the controllers */
  cords?: RefObject<CordRegistry>;
  seed?: number;
}) {
  const gltf = useGLTF(placement.url) as unknown as { scene: THREE.Group; animations: THREE.AnimationClip[] };
  const groupRef = useRef<THREE.Group>(null);
  const configRef = useRef(config);
  configRef.current = config;
  const [x, y, z] = placement.position;

  // Skinned meshes must be cloned with SkeletonUtils. drei's <Clone> shares the
  // skeleton, so three bears sharing one GLB would share one set of bones and
  // their three mixers would fight over it.
  const model = useMemo(() => skeletonClone(gltf.scene) as THREE.Group, [gltf.scene]);

  // Cub idle: procedural head bob + ear twitch. The cub GLB has no clip,
  // so the site animates it at runtime. Rests are captured once so we
  // add small deltas each frame rather than clobbering baked pose.
  const cubHeadBoneRef = useRef<THREE.Object3D | null>(null);
  const cubEarLRef = useRef<THREE.Object3D | null>(null);
  const cubEarRRef = useRef<THREE.Object3D | null>(null);
  const cubHeadRestQ = useRef<THREE.Quaternion | null>(null);
  const cubEarLRestQ = useRef<THREE.Quaternion | null>(null);
  const cubEarRRestQ = useRef<THREE.Quaternion | null>(null);
  const cubIdleTime = useRef(seed * 0.73);

  // Banjo-bear arm override: eight arm bones + their rest quaternions, so the
  // picking loop can compose `rest * userEuler` each frame and hard-replace
  // whatever the base clip wrote for arms.
  const banjoBonesRef = useRef<Partial<Record<string, THREE.Bone>>>({});
  const banjoRestQRef = useRef<Partial<Record<string, THREE.Quaternion>>>({});
  const banjoTime = useRef(seed * 0.41);

  useEffect(() => {
    // Banjo-bear arm bone discovery. Cheap, fires once per model swap.
    banjoBonesRef.current = {};
    banjoRestQRef.current = {};
    if (placement.banjoPlayer) {
      const armNames = new Set([
        "shoulder_L", "upperarm_L", "arm_L", "hand_L",
        "shoulder_R", "upperarm_R", "arm_R", "hand_R",
      ]);
      model.traverse((o) => {
        const b = o as THREE.Bone;
        if (!b.isBone) return;
        if (armNames.has(o.name)) {
          banjoBonesRef.current[o.name] = b;
          banjoRestQRef.current[o.name] = b.quaternion.clone();
        }
      });
    }

    cubHeadBoneRef.current = null;
    cubEarLRef.current = null;
    cubEarRRef.current = null;
    if (placement.url !== CUB_URL) return;
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
    model.traverse((o) => {
      const b = o as THREE.Bone;
      if (!b.isBone) return;
      const n = norm(o.name);
      if (!cubHeadBoneRef.current && n === "headx") {
        cubHeadBoneRef.current = b;
        cubHeadRestQ.current = b.quaternion.clone();
      } else if (!cubEarLRef.current && n === "cear01l") {
        cubEarLRef.current = b;
        cubEarLRestQ.current = b.quaternion.clone();
      } else if (!cubEarRRef.current && n === "cear01r") {
        cubEarRRef.current = b;
        cubEarRRestQ.current = b.quaternion.clone();
      }
    });
  }, [model, placement.url, seed]);

  const { actions, names: actionNames } = useAnimations(gltf.animations || [], groupRef);

  // ---- social glances --------------------------------------------------------
  // Only the bears take part; everything else ignores all of this.
  const social = placement.animation === "sit_log";
  const headRef = useRef<THREE.Object3D | null>(null);
  const glance = useRef({ t: 0, next: 2.5 + seed * 1.7, phase: "wait" as "wait" | "turn" | "hold" | "back", w: 0, target: "" });
  const tmpV = useMemo(() => new THREE.Vector3(), []);
  const tmpV2 = useMemo(() => new THREE.Vector3(), []);
  const tmpQ = useMemo(() => new THREE.Quaternion(), []);
  const tmpQ2 = useMemo(() => new THREE.Quaternion(), []);
  const rng = useMemo(() => seededRandom(97 + seed * 13), [seed]);

  useEffect(() => {
    if (!social) return;
    let head: THREE.Object3D | null = null;
    model.traverse((o) => { if (o.name === "head") head = o; });
    headRef.current = head;
  }, [social, model]);

  useEffect(() => {
    model.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      // Animals cast onto the ground and the logs, but do NOT receive. A ~1000-triangle
      // body self-shadowing from a shadow map produces hard-edged patches across the
      // fur that read as faceting, and in a scene lit almost entirely by one close
      // firelight there is nothing meaningful for them to receive anyway.
      mesh.receiveShadow = false;
      if (!mesh.material) return;

      const apply = (m: THREE.Material) => {
        const mat = m as THREE.Material & { flatShading?: boolean; map?: THREE.Texture | null };
        let dirty = false;

        // The Wild Poly textures carry a junk alpha channel (~40% of pixels below
        // full opacity). Any material exported with alphaMode BLEND therefore renders
        // the animal semi-transparent, AND glTF's BLEND path sets depthWrite=false,
        // so the mesh stops occluding itself - faces show through each other and
        // props sink into limbs. Force opaque; nothing in this scene needs per-pixel
        // alpha on an animal.
        if (mat.transparent) { mat.transparent = false; dirty = true; }
        if (!mat.depthWrite) { mat.depthWrite = true; dirty = true; }
        if (mat.alphaTest !== 0) { mat.alphaTest = 0; dirty = true; }

        // The pack's texture holds LINEAR values but the glTF tags it sRGB, so three
        // decodes it a second time and the animal comes out dark red-brown instead of
        // its real tan. Measured against the vendor render: as-sRGB gives an R:G:B
        // ratio of 1:0.35:0.21, as-linear 1:0.60:0.47, reference 1:0.69:0.58.
        if (mat.map && mat.map.colorSpace !== THREE.LinearSRGBColorSpace) {
          mat.map.colorSpace = THREE.LinearSRGBColorSpace;
          mat.map.needsUpdate = true;
          dirty = true;
        }

        if (placement.flatShading && mat.flatShading !== true) {
          mat.flatShading = true;
          dirty = true;
        }
        if (dirty) mat.needsUpdate = true;
      };

      if (Array.isArray(mesh.material)) mesh.material.forEach(apply);
      else apply(mesh.material);
    });
  }, [model, placement.flatShading]);

  useEffect(() => {
    if (!placement.animation || !actions) return;
    const target = placement.animation;
    const key =
      (actions[target] ? target : undefined) ??
      actionNames.find((n) => n.toLowerCase().endsWith("|" + target.toLowerCase())) ??
      actionNames.find((n) => n.toLowerCase().includes(target.toLowerCase())) ??
      actionNames[0];
    if (!key) return;
    const action = actions[key];
    if (!action) return;
    action.reset().fadeIn(0.3).play();
    // Phase-offset and rate-vary each instance. Three identical bears moving in
    // lockstep is the loudest "generated" tell in the scene.
    action.time = placement.animationOffset ?? 0;
    action.timeScale = placement.animationSpeed ?? 1;
    return () => { action.fadeOut(0.2); };
  }, [actions, actionNames, placement.animation, placement.animationOffset, placement.animationSpeed]);

  useFrame(() => {
    if (!groupRef.current) return;
    const c = configRef.current;
    const o = c.objectOverrides?.[name] ?? EMPTY_OVERRIDE;
    const s = placement.scale * c.animalScale * o.scale;
    const seat = BENCH_MODELS[placement.bench ?? 0] ?? OLD_LOG;
    const baseY = placement.sitOnBench ? seat.top * c.benchScale : y;
    groupRef.current.position.set(
      x * c.animalSpread + c.animalX + o.dx,
      baseY + c.animalY + o.dy,
      z + c.animalZ + o.dz
    );
    groupRef.current.rotation.set(o.rotX, placement.rotationY + o.rotY, o.rotZ);
    groupRef.current.scale.set(s, s, s);

    // Cub idle: subtle head bob + ear twitch. Multiplies onto the baked rest quaternion
    // so it composes with any pose baked into cub.glb.
    if (placement.url === CUB_URL) {
      cubIdleTime.current += 1 / 60;
      const t = cubIdleTime.current;
      const head = cubHeadBoneRef.current;
      const headRest = cubHeadRestQ.current;
      if (head && headRest) {
        const bobPitch = Math.sin(t * 0.9) * 0.06;
        const bobYaw = Math.sin(t * 0.55 + 1.7) * 0.08;
        const dq = new THREE.Quaternion().setFromEuler(new THREE.Euler(bobPitch, bobYaw, 0, "XYZ"));
        head.quaternion.copy(headRest).multiply(dq);
      }
      const twitch = (base: THREE.Object3D | null, rest: THREE.Quaternion | null, phase: number) => {
        if (!base || !rest) return;
        // Occasional flick: mostly still, brief jerk
        const cycle = ((t + phase) % 4.5) / 4.5;
        const jerk = cycle < 0.06 ? Math.sin(cycle / 0.06 * Math.PI) * 0.25 : 0;
        const dq = new THREE.Quaternion().setFromEuler(new THREE.Euler(jerk, 0, 0, "XYZ"));
        base.quaternion.copy(rest).multiply(dq);
      };
      twitch(cubEarLRef.current, cubEarLRestQ.current, 0);
      twitch(cubEarRRef.current, cubEarRRestQ.current, 2.1);
    }

    // Banjo-bear arm animation. Runs after drei's mixer for the same reason cub
    // idle does - useAnimations subscribes first, so our per-bone writes here
    // land on top and hard-replace whatever the sit_log clip put on the arms.
    if (placement.banjoPlayer) {
      banjoTime.current += 1 / 60;
      const t = banjoTime.current;
      const D2R = Math.PI / 180;

      // Fret hand slides slowly through positions along the neck. arm_L Y is
      // the primary neck-slide axis, with a small Z wobble for a natural feel.
      const fretY = Math.sin(t * 2 * Math.PI * 0.32);           // -1..1
      const fretZ = Math.sin(t * 2 * Math.PI * 0.55 + 0.8);     // secondary
      const armLY = D2R * (-53.5 + fretY * 5.5);                // -48 .. -59
      const armLZ = D2R * (fretZ * 6);                          // small tilt

      // Pick hand: fast strum on hand_R Z, slower "string switch" on arm_R X.
      const pick = Math.sin(t * 2 * Math.PI * 3.4);
      const stringSwitch = Math.sin(t * 2 * Math.PI * 0.7 + 1.3);
      const armRX = D2R * (44 + stringSwitch * 6);              // 38 .. 50
      const handRZ = D2R * (-23.5 + pick * 12.5);               // -36 .. -11

      const applyArm = (name: string, x: number, y: number, z: number) => {
        const b = banjoBonesRef.current[name];
        const rest = banjoRestQRef.current[name];
        if (!b || !rest) return;
        const eu = new THREE.Euler(x, y, z, "XYZ");
        const dq = new THREE.Quaternion().setFromEuler(eu);
        b.quaternion.copy(rest).multiply(dq);
      };

      applyArm("shoulder_L",  5.9 * D2R,   6.2 * D2R, -22.0 * D2R);
      applyArm("upperarm_L",  0, 0, 0);
      applyArm("arm_L",       0, armLY, armLZ);
      applyArm("hand_L",      0, -150 * D2R, 0);

      applyArm("shoulder_R",  0, 0, 0);
      applyArm("upperarm_R",  0, 0, 0);
      applyArm("arm_R",       armRX, 0, 0);
      applyArm("hand_R",      0, 0, handRZ);
    }
  });

  // Runs after drei's mixer update - useAnimations subscribes its useFrame before
  // this one, and R3F runs same-priority callbacks in subscription order - so this
  // layers on top of the clip instead of being overwritten by it.
  useFrame((_, delta) => {
    if (!social || !groupRef.current || !headRef.current || !heads?.current) return;
    const head = headRef.current;
    const reg = heads.current;
    const dt = Math.min(delta, 1 / 20);

    groupRef.current.updateMatrixWorld(true);
    head.getWorldPosition(tmpV);
    reg.set(name, (reg.get(name) ?? new THREE.Vector3()).copy(tmpV));

    const g = glance.current;
    g.t += dt;
    if (g.phase === "wait" && g.t >= g.next) {
      const others = [...reg.keys()].filter((k) => k !== name);
      if (others.length) {
        g.target = others[Math.floor(rng() * others.length)];
        g.phase = "turn";
        g.t = 0;
      } else {
        g.t = 0;
      }
    } else if (g.phase === "turn" && g.t >= 0.85) { g.phase = "hold"; g.t = 0; }
    else if (g.phase === "hold" && g.t >= 1.6 + rng() * 2.2) { g.phase = "back"; g.t = 0; }
    else if (g.phase === "back" && g.t >= 1.1) {
      g.phase = "wait"; g.t = 0; g.next = 4 + rng() * 6; g.target = "";
    }

    const smooth = (u: number) => u * u * (3 - 2 * u);
    const want =
      g.phase === "turn" ? smooth(Math.min(g.t / 0.85, 1)) :
      g.phase === "hold" ? 1 :
      g.phase === "back" ? 1 - smooth(Math.min(g.t / 1.1, 1)) : 0;
    g.w += (want - g.w) * Math.min(1, dt * 8);

    const tgt = g.target ? reg.get(g.target) : undefined;
    if (tgt && g.w > 0.001) {
      // Rotate the face-forward vector onto the target, done in the head's PARENT
      // space so it is independent of however the clip has posed the head.
      const parent = head.parent;
      if (parent) {
        parent.updateMatrixWorld(true);
        parent.getWorldQuaternion(tmpQ);          // parent world rotation
        tmpQ.invert();

        head.getWorldPosition(tmpV);
        tmpV2.copy(tgt).sub(tmpV).normalize();     // desired forward, world
        tmpV2.applyQuaternion(tmpQ);               // -> parent space

        const cur = tmpV.copy(FACE_FWD_LOCAL).applyQuaternion(head.quaternion);
        const ang = cur.angleTo(tmpV2);
        if (ang > MAX_GLANCE) {
          // too far round to be plausible - only go as far as the neck allows
          tmpV2.copy(cur).lerp(tmpV2, MAX_GLANCE / ang).normalize();
        }
        tmpQ2.setFromUnitVectors(cur, tmpV2).multiply(head.quaternion);
        head.quaternion.slerp(tmpQ2, g.w);
      }
    }
  });

  return (
    <group
      ref={groupRef}
      name={name}
      onClick={(e: THREE.Event & { stopPropagation: () => void }) => {
        e.stopPropagation();
        onSelect(name);
      }}
    >
      {placement.modelRotation ? (
        <group rotation={placement.modelRotation}>
          <primitive object={model} />
        </group>
      ) : (
        <primitive object={model} />
      )}
      {placement.prop ? <SocketProp root={groupRef} prop={placement.prop} ready={model} config={config} /> : null}
      {placement.handheld ? (
        <PawProp root={groupRef} spec={placement.handheld} ready={model} name={name} cords={cords} />
      ) : null}
      {(placement.accessories ?? []).map((kind) => (
        <BearAccessory key={kind} root={groupRef} kind={kind} ready={model} config={config} />
      ))}
    </group>
  );
}

/**
 * A fish laid on its side near the fire, exaggerating the "Swim" clip that
 * shipped with the model. The clip is played at a cranked timeScale so the tail
 * wags like a desperate flop rather than a lazy swim, and the mixer is toggled
 * between "flopping" and "still" phases so the fish rests between bursts. We
 * also add a small vertical bounce during flop phases - the swim clip only
 * moves the tail, so an extra hop sells the "trying to get back to water" read.
 *
 * Bursts and rests vary in duration (mutually non-integer) so the rhythm never
 * feels metronomic. Position, rotation, and scale are placement-only; no lab
 * sliders yet - if we want to tune them, expose them through sceneConfig later.
 */
function FloppingFish({
  config,
  onClickSound,
}: {
  config: CampfireSceneConfig;
  onClickSound?: () => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const gltf = useGLTF(FISH_URL) as unknown as { scene: THREE.Group; animations: THREE.AnimationClip[] };
  const [hovered, setHovered] = useState(false);

  // Cache the fish's meshes and their original emissive so the hover glow can
  // toggle a bright emissive on / off without leaking state across renders.
  const emissiveTargets = useMemo(() => {
    type Target = {
      mat: THREE.MeshStandardMaterial;
      originalColor: THREE.Color;
      originalIntensity: number;
    };
    const targets: Target[] = [];
    gltf.scene.traverse((o) => {
      const anyO = o as THREE.Object3D & { isMesh?: boolean; material?: unknown };
      if (!anyO.isMesh || !anyO.material) return;
      const mats = Array.isArray(anyO.material) ? anyO.material : [anyO.material];
      for (const m of mats) {
        const std = m as THREE.MeshStandardMaterial;
        if (std && "emissive" in std) {
          targets.push({
            mat: std,
            originalColor: std.emissive.clone(),
            originalIntensity: std.emissiveIntensity ?? 1,
          });
        }
      }
    });
    return targets;
  }, [gltf.scene]);

  useEffect(() => {
    const HOVER_COLOR = new THREE.Color(1, 1, 1);
    const HOVER_INTENSITY = 1.2;
    for (const t of emissiveTargets) {
      if (hovered) {
        t.mat.emissive.copy(HOVER_COLOR);
        t.mat.emissiveIntensity = HOVER_INTENSITY;
      } else {
        t.mat.emissive.copy(t.originalColor);
        t.mat.emissiveIntensity = t.originalIntensity;
      }
      t.mat.needsUpdate = true;
    }
  }, [hovered, emissiveTargets]);

  // Restore cursor if the fish unmounts mid-hover.
  useEffect(() => {
    if (!hovered) return;
    const prev = document.body.style.cursor;
    document.body.style.cursor = "pointer";
    return () => { document.body.style.cursor = prev; };
  }, [hovered]);
  // Attach the mixer to the actual scene root - not a clone. THREE.Object3D.clone
  // does NOT rebind SkinnedMesh -> Skeleton, so a cloned fish just sits still.
  // Since we only place one fish, using the original is fine.
  const { actions } = useAnimations(gltf.animations || [], gltf.scene);

  // Cache the spine bones and their BIND-POSE quaternions so we can amplify the
  // swim clip's rotation without changing its axis. The mixer writes each
  // frame's quaternion; we re-express that as "bind * delta" and stretch delta
  // by an angle factor. Result: the exact motion the clip already plays, just
  // bigger. Multiplier cascades down the chain so the tail whips harder than
  // the head, matching how a real fish flops - anchored middle, snapping tail.
  //
  // Grabbed via useMemo() at first render, before the mixer's useFrame has run,
  // so bone.quaternion is still the bind pose.
  const bones = useMemo(() => {
    const found: { obj: THREE.Object3D; bind: THREE.Quaternion; mul: number }[] = [];
    const table: Record<string, number> = {
      // extra multiplier applied to the swim clip's angle at peak flop.
      // Middle spine bulges the most - a real flopping fish arches its belly
      // more than its tail, which reads as a "C" shape rather than a whip.
      Spine1: 1.20,
      Spine2: 1.90,
      Spine3: 2.20,
      Tail:   1.90,
    };
    gltf.scene.traverse((o) => {
      const mul = table[o.name];
      if (mul !== undefined) {
        found.push({ obj: o, bind: o.quaternion.clone(), mul });
      }
    });
    return found;
  }, [gltf.scene]);

  // Reusable scratch quaternion so we don't allocate 4 per frame.
  const scratchQ = useMemo(() => new THREE.Quaternion(), []);

  // Alternating flop / rest phases. Durations picked to feel like the fish is
  // gathering itself between attempts. Kept mutually irrational so the pattern
  // doesn't lock into a beat.
  const PHASES = useMemo(
    () => [
      { flopping: true,  dur: 1.35 },
      { flopping: false, dur: 1.60 },
      { flopping: true,  dur: 0.90 },
      { flopping: false, dur: 2.10 },
      { flopping: true,  dur: 1.75 },
      { flopping: false, dur: 1.20 },
    ],
    []
  );

  const t = useRef(0);

  useEffect(() => {
    if (!actions) return;
    // The clip comes in as "Swim" or "Armature|Swim" depending on exporter. Pick
    // whichever key exists so we don't hardcode the exporter's naming.
    const key = Object.keys(actions).find((k) => /swim/i.test(k));
    if (!key) return;
    const action = actions[key];
    if (!action) return;
    action.reset().play();
    action.setLoop(THREE.LoopRepeat, Infinity);
    action.timeScale = 0; // start still; the frame loop cranks it during flops
  }, [actions]);

  useFrame((_, dt) => {
    t.current += dt;

    // Walk through phases based on cumulative time. Sum durations = one full cycle.
    let cycle = 0;
    for (const p of PHASES) cycle += p.dur;
    const local = t.current % cycle;

    let acc = 0;
    let current = PHASES[0];
    for (const p of PHASES) {
      if (local < acc + p.dur) { current = p; break; }
      acc += p.dur;
    }
    const phaseT = local - acc;

    // Crank timeScale WAY up during flopping phases; on rest, hold at 0 so the
    // tail freezes mid-wag (reads as the fish giving up for a beat).
    const key = actions ? Object.keys(actions).find((k) => /swim/i.test(k)) : undefined;
    if (key && actions) {
      const action = actions[key];
      if (action) action.timeScale = current.flopping ? config.fishFlopSpeed : 0;
    }

    // Vertical bounce + small yaw wobble while flopping.
    const g = groupRef.current;
    const baseY = config.fishY;
    if (g) {
      if (current.flopping) {
        const norm = phaseT / current.dur;
        const hop = Math.max(0, Math.sin(norm * Math.PI)) * 0.09;
        const wobble = Math.sin(t.current * 22) * 0.02;
        g.position.y = baseY + hop + wobble;
        g.rotation.y = config.fishRotationY + Math.sin(t.current * 14) * 0.15;
      } else {
        g.position.y += (baseY - g.position.y) * Math.min(1, dt * 6);
        g.rotation.y += (config.fishRotationY - g.rotation.y) * Math.min(1, dt * 6);
      }
    }

    // Amplify the swim clip's own bend during flop bursts. For each spine bone:
    //   delta = bindInv * currentAnimatedQuat     (whatever the mixer put there)
    //   angle *= (1 + (mul - 1) * envelope)       (stretch the same rotation)
    //   currentQuat = bind * newDelta
    // Envelope fades in and out over the burst so the exaggeration ramps up
    // rather than popping on. Rest phases pass through untouched (factor = 1).
    const norm = current.flopping ? phaseT / current.dur : 0;
    const envelope = current.flopping
      ? Math.sin(Math.min(1, norm * 6.5) * Math.PI / 2)          // fast attack
        * Math.sin(Math.min(1, (1 - norm) * 6.5) * Math.PI / 2)  // fast decay
      : 0;

    for (const b of bones) {
      // delta from bind to current (post-mixer).
      scratchQ.copy(b.bind).invert().multiply(b.obj.quaternion);
      // Extract axis-angle.
      let w = scratchQ.w;
      if (w > 1) w = 1; else if (w < -1) w = -1;
      const angle = 2 * Math.acos(w);
      if (angle < 1e-4) continue;                     // essentially no rotation
      const sinHalf = Math.sqrt(Math.max(0, 1 - w * w));
      const inv = sinHalf > 1e-6 ? 1 / sinHalf : 0;
      const ax = scratchQ.x * inv;
      const ay = scratchQ.y * inv;
      const az = scratchQ.z * inv;
      // Multiplier: 1 at rest, up to b.mul at peak flop.
      const factor = 1 + (b.mul - 1) * envelope;
      const newAngle = angle * factor;
      const half = newAngle * 0.5;
      const s = Math.sin(half);
      scratchQ.set(ax * s, ay * s, az * s, Math.cos(half));
      b.obj.quaternion.copy(b.bind).multiply(scratchQ);
    }
  });

  return (
    <group
      ref={groupRef}
      position={[config.fishX, config.fishY, config.fishZ]}
      rotation={[config.fishRotationX, config.fishRotationY, 0]}
      onPointerOver={(e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); setHovered(true); }}
      onPointerOut={(e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); setHovered(false); }}
      onClick={(e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); onClickSound?.(); }}
    >
      {/* Inner group holds the "lay on side" roll so the outer group's Y-rotation
          (the wobble) stays as heading rather than mixing with the flop tilt. */}
      <group rotation={[0, 0, config.fishRotationZ]} scale={config.fishScale}>
        <primitive object={gltf.scene} />
      </group>
      {/* Halo: a soft white point light hovering above the fish while pointed at.
          Distance is tight so it reads as an aura on this prop, not a room light. */}
      {hovered ? (
        <pointLight position={[0, 0.25, 0]} color="#ffffff" intensity={2.4} distance={0.9} decay={2} />
      ) : null}
    </group>
  );
}

function CampfireAnimals({
  config,
  onSelect,
}: {
  config: CampfireSceneConfig;
  onSelect: (name: string) => void;
}) {
  // Live head positions, written and read by the bears each frame, so they can find
  // each other wherever the config sliders have put them.
  const heads = useRef<HeadRegistry>(new Map());
  return (
    <>
      {ANIMALS.map((a, i) => {
        const name = `animal_${a.label.replace(/[^a-z0-9]+/gi, "_")}_${i}`;
        // Unmounting also tears down its AnimationMixer and useFrame work, which
        // visible=false left running every frame.
        if ((config.objectOverrides?.[name]?.hide ?? 0) >= 0.5) return null;
        return (
          <Animal
            key={`animal-${i}`}
            name={name}
            placement={a}
            config={config}
            onSelect={onSelect}
            heads={heads}
            seed={i}
          />
        );
      })}
    </>
  );
}

/**
 * Location 1 - the arcade, redone.
 *
 * Four little_tv CRTs stacked into a 2x2 wall along the -X flank, each running a
 * different project GIF so the wall reads as live screens. Four adult bears
 * sitting criss-cross on the ground in profile at +X, facing the wall - camera
 * comes in from +Z and reads the row of faces. Truck stays on-scene as a
 * background prop but is nudged behind the bears so it isn't fighting the TVs
 * for the shot.
 *
 * Composed around its own origin; the ring puts it where it belongs, and every
 * piece is wrapped in a Selectable so the object panel can drag/rotate/scale
 * each independently.
 */
function ArcadeSector({ config, onSelect }: { config: CampfireSceneConfig; onSelect: (n: string) => void }) {
  const cords = useRef<CordRegistry>(new Map());

  /* Truck sits centred in front of the camera with the open bed pointed at the
     viewer. The camera lives at local +Z looking at -Z, so we point the truck's
     rear at +Z by rotating 180 deg. Scale 0.4 keeps the whole truck under 2m
     long in world space. The GLB (public/vehicles/pickup_truck.glb) has its
     rear bed wall removed - no tailgate, open bed - so the TVs sit INSIDE the
     bed rather than on a folded-down door.
     Landmark positions in world units after scale + position:
       front bumper       z ~ -1.58
       cab / bed seam     z ~ -0.14   (bed front wall, closes cab from view)
       bed rear (open)    z ~ +0.46
       bed floor Y        ~ +0.36
       bed rim top Y      ~ +0.52 */
  const TRUCK_POS: [number, number, number] = [0, 0, -0.5];
  const TRUCK_ROT_Y = Math.PI;
  const TRUCK_SCALE = 0.4;

  const BED_FRONT_Z = -0.14;        // cab-side wall of the bed
  const BED_REAR_Z = 0.46;          // open rear edge of the bed
  const BED_FLOOR_Y = 0.36;         // bed floor height in world

  // CRT layout: two rows, two columns, ALL FOUR INSIDE the open bed. Bottom row
  // sits on the bed floor near the rear opening, top row stacks on top and sits
  // a bit deeper into the bed. All face +Z so their screens speak to the camera.
  const TV_SCALE = 0.72;
  const TV_HEIGHT = 0.28 * TV_SCALE;
  const TV_COL_DX = 0.19;                       // half-spacing between columns
  const TV_FRONT_Z = BED_REAR_Z - 0.10;         // bottom row: just inside the rear opening
  const TV_BACK_Z  = BED_FRONT_Z + 0.16;        // top row: deeper toward cab wall
  const TV_BOTTOM_Y = BED_FLOOR_Y + 0.005;      // slight lift so it doesn't z-fight
  const TV_TOP_Y    = TV_BOTTOM_Y + TV_HEIGHT;

  return (
    <group name="sector_arcade">
      {/* Truck: backed in to camera, open bed pointed at the viewer, headlights
          + tail lights burning. Still Selectable so the panel can move it. */}
      <Selectable
        name="truck"
        onSelect={onSelect}
        config={config}
        basePosition={TRUCK_POS}
        baseRotationY={TRUCK_ROT_Y}
        baseScale={TRUCK_SCALE}
      >
        <SafeAsset label="pickup truck">
          <LitPickupTruck />
        </SafeAsset>
      </Selectable>


      {/* Four TVs in a 2x2 grid inside the open truck bed, all facing +Z (the
          camera). i = 0 bottom-left, 1 bottom-right, 2 top-left, 3 top-right.
          Bottom row sits on the bed floor near the rear opening; top row stacks
          on top and sits a bit deeper toward the cab wall - reads as a
          staircase of screens seen through the tailgate opening. */}
      {ARCADE_SCREENS.map((screen, i) => {
        const col = i % 2;                 // 0 left, 1 right
        const row = Math.floor(i / 2);     // 0 bottom, 1 top
        const x = (col - 0.5) * 2 * TV_COL_DX;
        const y = row === 0 ? TV_BOTTOM_Y : TV_TOP_Y;
        const z = row === 0 ? TV_FRONT_Z : TV_BACK_Z;
        return (
          <Selectable
            key={i}
            name={`crt_${i}`}
            onSelect={onSelect}
            config={config}
            basePosition={[x, y, z]}
            baseRotationY={0}
            baseScale={TV_SCALE}
          >
            <RetroCrtTv screen={screen} seed={i} />
          </Selectable>
        );
      })}

      {/* Cool fill above the scene so unlit sides of things don't disappear.
          Kept low; the screens and the truck lamps do most of the work. */}
      <pointLight position={[0, 2.0, 1.8]} color="#8fa8c8" intensity={1.0} distance={7} decay={2} />

      {/* Honey wand on the ground next to the cubs - a little snack prop.
          Positioned to the side of the seated cubs; adjust in the lab. */}
      <Selectable
        name="arcade_honey_wand"
        onSelect={onSelect}
        config={config}
        basePosition={[0.75, 0.02, 1.7]}
        baseRotationY={0}
        baseScale={0.2}
      >
        <SafeAsset label="honey wand">
          <GLBModel url={HONEY_WAND_URL} />
        </SafeAsset>
      </Selectable>

      {/* Four cubs on the ground between the TVs and the camera, facing back
          toward the truck - viewer sees the backs of their heads and the
          glowing screens beyond, classic "kids on the floor" arcade shot. */}
      {ARCADE_CUBS.map((placement, i) => {
        const name = `arcade_cub_${i}`;
        if ((config.objectOverrides?.[name]?.hide ?? 0) >= 0.5) return null;
        return (
          <SafeAsset key={name} label={`arcade cub ${i}`}>
            <Animal
              name={name}
              placement={placement}
              config={config}
              onSelect={onSelect}
              cords={cords}
              seed={i + 20}
            />
          </SafeAsset>
        );
      })}
    </group>
  );
}

/** Location 2 - contact. A bear writing at a table, in profile so the face reads. */
function ContactSector({ config, onSelect }: { config: CampfireSceneConfig; onSelect: (n: string) => void }) {
  // Top surface of the code-built Table is at y ≈ 0.62. GLB props that live on
  // the table start there; drag/scale in the lab.
  const TABLE_TOP_Y = 0.62;
  return (
    <group name="sector_contact">
      <pointLight position={[0.15, 1.3, 0]} color="#ffb066" intensity={2.2} distance={5} decay={2} />
      <Selectable name="contact_table" onSelect={onSelect} config={config} basePosition={[0.15, 0, 0]} baseRotationY={0}>
        <Table />
      </Selectable>
      <Selectable name="contact_chair" onSelect={onSelect} config={config} basePosition={[-0.95, 0, 0]} baseRotationY={Math.PI / 2}>
        <Chair />
      </Selectable>

      {/* Real GLB table + chair, added alongside the code-built ones so the
          object panel can pick whichever reads better. Hide the code versions
          in the lab once you've dialled these in. */}
      <Selectable name="old_bear_table" onSelect={onSelect} config={config} basePosition={[0.15, 0, 0]} baseRotationY={0}>
        <SafeAsset label="old-bear table">
          <GLBModel url={OLD_BEAR_TABLE_URL} />
        </SafeAsset>
      </Selectable>
      <Selectable name="old_bear_chair" onSelect={onSelect} config={config} basePosition={[-0.95, 0, 0]} baseRotationY={Math.PI / 2}>
        <SafeAsset label="old-bear chair">
          <GLBModel url={OLD_BEAR_CHAIR_URL} />
        </SafeAsset>
      </Selectable>

      {/* On-table props. Base positions place them on the top surface of the
          code-built table (y = 0.62) around the bear's writing spot. */}
      <Selectable name="old_bear_computer" onSelect={onSelect} config={config} basePosition={[0.35, TABLE_TOP_Y, -0.15]} baseRotationY={Math.PI}>
        <SafeAsset label="old-bear computer">
          <GLBModel url={OLD_BEAR_COMPUTER_URL} />
        </SafeAsset>
      </Selectable>
      <Selectable name="old_bear_books" onSelect={onSelect} config={config} basePosition={[-0.15, TABLE_TOP_Y, -0.25]} baseRotationY={0.3}>
        <SafeAsset label="old-bear books">
          <GLBModel url={OLD_BEAR_BOOKS_URL} />
        </SafeAsset>
      </Selectable>
      <Selectable name="old_bear_mug" onSelect={onSelect} config={config} basePosition={[-0.3, TABLE_TOP_Y, 0.1]} baseRotationY={0}>
        <SafeAsset label="old-bear mug">
          <GLBModel url={OLD_BEAR_MUG_URL} />
        </SafeAsset>
      </Selectable>
      <Selectable name="old_bear_papers" onSelect={onSelect} config={config} basePosition={[-0.45, TABLE_TOP_Y, -0.05]} baseRotationY={-0.4}>
        <SafeAsset label="old-bear papers">
          <GLBModel url={OLD_BEAR_PAPERS_URL} />
        </SafeAsset>
      </Selectable>
      <Selectable name="old_bear_postit" onSelect={onSelect} config={config} basePosition={[-0.55, TABLE_TOP_Y, 0.25]} baseRotationY={0.5}>
        <SafeAsset label="old-bear post-it">
          <GLBModel url={OLD_BEAR_POSTIT_URL} />
        </SafeAsset>
      </Selectable>
      <Selectable name="old_bear_debris" onSelect={onSelect} config={config} basePosition={[0.55, TABLE_TOP_Y, 0.2]} baseRotationY={0.9}>
        <SafeAsset label="old-bear debris papers">
          <GLBModel url={OLD_BEAR_DEBRIS_URL} />
        </SafeAsset>
      </Selectable>

      {/* Floor props next to the desk. */}
      <Selectable name="old_bear_boxes" onSelect={onSelect} config={config} basePosition={[1.2, 0, -0.4]} baseRotationY={-0.2}>
        <SafeAsset label="old-bear boxes">
          <GLBModel url={OLD_BEAR_BOXES_URL} />
        </SafeAsset>
      </Selectable>
      <Selectable name="old_bear_toilet_paper" onSelect={onSelect} config={config} basePosition={[1.1, 0, 0.4]} baseRotationY={0}>
        <SafeAsset label="old-bear toilet paper">
          <GLBModel url={OLD_BEAR_TOILET_URL} />
        </SafeAsset>
      </Selectable>

      {/* Caravan parked behind the bear (bear sits at x=-0.95 facing +X, so
          "behind" = further -X). Caravan model is authored huge (~80 units
          long), so scale is tiny; drag/scale in the lab to place. */}
      <Selectable name="caravan" onSelect={onSelect} config={config} basePosition={[-2.8, 0, 0.5]} baseRotationY={Math.PI / 2} baseScale={0.03}>
        <SafeAsset label="caravan">
          <GLBModel url={CARAVAN_URL} />
        </SafeAsset>
      </Selectable>
      <Animal
        name="bear_contact"
        placement={CONTACT_BEAR}
        config={config}
        onSelect={onSelect}
      />
    </group>
  );
}

/**
 * One continuous circle of ground under the whole campsite.
 *
 * Sized off the ring so it always reaches well past the outermost location - grow the
 * ring and the ground grows with it, instead of the locations walking off the edge.
 * The rim is left out beyond the fog rather than being drawn as a hard line.
 */
function CampfireGround({ config }: { config: CampfireSceneConfig }) {
  const radius = Math.max(30, config.locationRadius + 24);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
      <circleGeometry args={[radius, 96]} />
      <meshStandardMaterial color="#2a1c31" roughness={0.96} metalness={0} />
    </mesh>
  );
}

function BackgroundGlow() {
  return (
    <mesh position={[0, 6, -16]} scale={[18, 7, 1]}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial color="#063743" transparent opacity={0.55} depthWrite={false} />
    </mesh>
  );
}

function CampfireWorld({
  config,
  onCameraChange,
  onSelect,
  selectedObject,
  dragPlaneMode,
  onObjectTranslate,
  flying,
  onIntroDone,
  panel = null,
  editing = false,
  onLocationViewChange,
  titleHeld = false,
  onFishClickSound,
}: {
  config: CampfireSceneConfig;
  onCameraChange: (pos: [number, number, number], tgt: [number, number, number]) => void;
  onSelect: (name: string) => void;
  selectedObject: string | null;
  dragPlaneMode: DragPlaneMode;
  onObjectTranslate: (name: string, next: Pick<ObjectOverride, "dx" | "dy" | "dz">) => void;
  flying: boolean;
  onIntroDone: () => void;
  panel?: number | null;
  /** panelled, but still orbitable and clickable - the lab previewing the real site */
  editing?: boolean;
  onLocationViewChange?: (index: number, view: LocationView) => void;
  /** while true, freeze IntroFlight at its pulled-back start pose */
  titleHeld?: boolean;
  onFishClickSound?: () => void;
}) {
  const panelled = panel != null;
  // The fly-in lands on the campfire, which is location 0 - not on the free-look
  // camera, which in panelled mode is never where the scene actually settles.
  const intro = useMemo(() => {
    const p = new THREE.Vector3();
    const t = new THREE.Vector3();
    if (panelled) locationCamera(0, config, p, t);
    else {
      p.set(config.cameraX, config.cameraY, config.cameraZ);
      t.set(config.targetX, config.targetY, config.targetZ);
    }
    return { to: [p.x, p.y, p.z] as [number, number, number], target: [t.x, t.y, t.z] as [number, number, number] };
  }, [panelled, config]);

  // Orbit has to pivot around whatever the current location is looking at, not the
  // free-look target, or dragging in preview swings the camera around the wrong point.
  const orbitTarget = useMemo(() => {
    if (!panelled) return [config.targetX, config.targetY, config.targetZ] as [number, number, number];
    const p = new THREE.Vector3();
    const t = new THREE.Vector3();
    locationCamera(panel, config, p, t);
    return [t.x, t.y, t.z] as [number, number, number];
  }, [panelled, panel, config]);

  return (
    <>
      <color attach="background" args={["#03040a"]} />
      <fog attach="fog" args={["#03040a", config.fogNear, config.fogFar]} />
      <CameraRig config={config} paused={flying || panelled} />
      {panelled ? (
        <LocationCamera config={config} panel={panel} active={!flying} editing={editing} />
      ) : null}
      {flying ? (
        <IntroFlight
          to={intro.to}
          target={intro.target}
          duration={config.titleFlyDuration}
          distanceMultiplier={config.titleCameraDistance}
          skyHeight={config.titleCameraHeight}
          extraDistance={config.titleFlyExtraDistance}
          cameraPitch={config.titleFlyCameraPitch}
          fovBoost={config.titleFlyFovBoost}
          fogSquash={config.titleFlyFogSquash}
          held={titleHeld}
          onDone={onIntroDone}
        />
      ) : null}
      <OrbitCameraSaver
        target={orbitTarget}
        onChange={(pos, tgt) => {
          // While previewing a location, orbiting IS how you frame that location:
          // fold the result back into its own space so it survives the ring moving.
          if (panelled && editing && onLocationViewChange) {
            onLocationViewChange(panel, worldToLocationView(panel, config, pos, tgt));
          } else if (!panelled) {
            onCameraChange(pos, tgt);
          }
        }}
        enabled={!flying && !selectedObject && (!panelled || editing)}
      />
      <WorldLights config={config} />
      <Stars radius={55} depth={20} count={650} factor={3.2} saturation={0} fade speed={0.12} />

      <CampfireGround config={config} />
      <ObjectDragLayer
        selectedObject={selectedObject}
        mode={dragPlaneMode}
        config={config}
        onTranslate={onObjectTranslate}
      >
        {/* Location 0 - the campfire. Everything here was already composed around the
            origin with the camera off at +Z, so it moves onto the ring untouched and
            keeps every slider meaning exactly what it did. */}
        <Location index={0} config={config}>
          <CampfireLights config={config} />
          <CampfireSceneModel config={config} onSelect={onSelect} />
          {(config.objectOverrides?.["camper"]?.hide ?? 0) < 0.5 && (
            <SafeAsset label="camper"><Camper config={config} onSelect={onSelect} /></SafeAsset>
          )}
          {(config.objectOverrides?.["tent"]?.hide ?? 0) < 0.5 && (
            <SafeAsset label="tent"><Tent config={config} onSelect={onSelect} /></SafeAsset>
          )}
          <Benches config={config} onSelect={onSelect} />
          <CampfireAnimals config={config} onSelect={onSelect} />
          {/* Wood pile near the bonfire, as if stacked ready to feed the fire. */}
          <Selectable
            name="campfire_wood_pile"
            onSelect={onSelect}
            config={config}
            basePosition={[2.6, 0, 1.2]}
            baseRotationY={-0.4}
            baseScale={0.4}
          >
            <SafeAsset label="wood pile">
              <GLBModel url={WOOD_PILE_URL} />
            </SafeAsset>
          </Selectable>
          <Selectable
            name="campfire_banjo"
            onSelect={onSelect}
            config={config}
            basePosition={[-2.2, 0.05, 1.4]}
            baseRotationY={0.6}
            baseScale={0.18}
          >
            <SafeAsset label="banjo">
              <GLBModel url={BANJO_URL} />
            </SafeAsset>
          </Selectable>
          {(config.objectOverrides?.["fish"]?.hide ?? 0) < 0.5 && (
            <SafeAsset label="flopping fish">
              <FloppingFish config={config} onClickSound={onFishClickSound} />
            </SafeAsset>
          )}
          {/* Named "campfire" group so ObjectDragLayer can pick it up as the
              drag target when the user clicks any of the fire pieces (flame,
              sparks, glow disc, or the bonfire log routed here via onSelect).
              Its dx/dy/dz translates the whole group; the same offset is added
              to the bonfire node inside CampfireSceneModel so the log tracks. */}
          <group
            name="campfire"
            position={[
              config.objectOverrides?.["campfire"]?.dx ?? 0,
              config.objectOverrides?.["campfire"]?.dy ?? 0,
              config.objectOverrides?.["campfire"]?.dz ?? 0,
            ]}
            onClick={(e) => { e.stopPropagation(); onSelect("campfire"); }}
          >
            <FireGlowDisc opacity={config.glowOpacity} x={config.flameX} y={config.glowY} z={config.flameZ} scale={config.glowScale} />
            <CampfireFlame config={config} />
            <Sparks
              key={`sparks-${Math.max(1, Math.round(config.sparkCount))}`}
              opacity={config.sparkOpacity}
              x={config.flameX}
              z={config.flameZ}
              count={config.sparkCount}
              spread={config.sparkSpread}
              maxHeight={config.sparkMaxHeight}
              speed={config.sparkSpeed}
              sway={config.sparkSway}
              burstChance={config.sparkBurstChance}
              size={config.sparkSize}
              lifetime={config.sparkLifetime}
            />
          </group>
        </Location>

        <Location index={1} config={config}>
          <SafeAsset label="arcade"><ArcadeSector config={config} onSelect={onSelect} /></SafeAsset>
        </Location>

        <Location index={2} config={config}>
          <SafeAsset label="contact"><ContactSector config={config} onSelect={onSelect} /></SafeAsset>
        </Location>
      </ObjectDragLayer>

    </>
  );
}

export default function CampfireScene({
  config,
  onCameraChange,
  onSelect,
  selectedObject = null,
  dragPlaneMode = "xz",
  onObjectTranslate,
  intro = true,
  panel = null,
  editing = false,
  onLocationViewChange,
  titleHeld = false,
}: {
  config: CampfireSceneConfig;
  onCameraChange?: (pos: [number, number, number], tgt: [number, number, number]) => void;
  onSelect?: (name: string) => void;
  selectedObject?: string | null;
  dragPlaneMode?: DragPlaneMode;
  onObjectTranslate?: (name: string, next: Pick<ObjectOverride, "dx" | "dy" | "dz">) => void;
  /** play the fly-in on load. Set false in the lab if it gets in the way of tuning. */
  intro?: boolean;
  /** 0-2 puts the scene on that location, framed by its saved shot. null (the
   *  default) is free-look, for the lab. */
  panel?: number | null;
  /** With `panel` set, keep orbit and picking live so a location can be framed and
   *  its props moved while you look at the real site camera. */
  editing?: boolean;
  onLocationViewChange?: (index: number, view: LocationView) => void;
  /** while true, hold IntroFlight at its pulled-back start pose. Used by the title
   *  card, so the visitor sees the campsite diorama behind the letters. */
  titleHeld?: boolean;
}) {
  const cameraChangeHandler = onCameraChange ?? (() => {});
  const selectHandler = onSelect ?? (() => {});
  const translateHandler = onObjectTranslate ?? (() => {});
  const [flying, setFlying] = useState(intro);

  // Ambience: fire crackling always, banjo layered on top. Volumes come from
  // config; the master multiplier at the front lets a single knob quiet the
  // whole scene without touching per-track balance. Autoplay unlocks on the
  // first click anywhere (browsers require a gesture).
  const master = clampUnit(config.masterVolume);
  useCampsiteAudioLoop(FIRE_CRACKLING_URL, {
    volume: master * clampUnit(config.fireCracklingVolume),
    enabled: true,
  });
  useCampsiteAudioLoop(BANJO_URL_SOUND, {
    volume: master * clampUnit(config.banjoVolume),
    enabled: true,
  });
  const playClick = useCampsiteOneShot(CLICK_URL);
  const onFishClickSound = () => playClick(master * clampUnit(config.clickVolume));

  return (
    <Canvas
      className="absolute inset-0"
      dpr={[1, 2]}
      shadows
      camera={{ position: [config.cameraX, config.cameraY, config.cameraZ], fov: config.fov, near: 0.01, far: 500 }}
      gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
      onPointerMissed={() => selectHandler("")}
    >
      <CampfireWorld
        config={config}
        onCameraChange={cameraChangeHandler}
        onSelect={selectHandler}
        selectedObject={selectedObject}
        dragPlaneMode={dragPlaneMode}
        onObjectTranslate={translateHandler}
        flying={flying}
        onIntroDone={() => setFlying(false)}
        panel={panel}
        editing={editing}
        onLocationViewChange={onLocationViewChange}
        titleHeld={titleHeld}
        onFishClickSound={onFishClickSound}
      />
    </Canvas>
  );
}

useGLTF.preload(CAMPFIRE_SCENE_URL);
useGLTF.preload(WOOD_LOG_URL);
useGLTF.preload(NEW_LOG_URL);
useGLTF.preload(WHITE_OWL_URL);
useGLTF.preload(RED_OWL_URL);
useGLTF.preload(TOUCAN_URL);
useGLTF.preload(DEER_URL);
useGLTF.preload(DOE_URL);
useGLTF.preload(RACCOON_URL);
useGLTF.preload(BEAR_URL);
useGLTF.preload(FISH_URL);
useGLTF.preload(PICKUP_TRUCK_URL);
useGLTF.preload(CARAVAN_URL);
useGLTF.preload(CAMPER_URL);
useGLTF.preload(CUB_URL);
useGLTF.preload(GAMECUBE_URL);
useGLTF.preload(CONTROLLER_URL);
useGLTF.preload(GLASSES_URL);
useGLTF.preload(TENT_URL);
useGLTF.preload(HONEY_WAND_URL);
useGLTF.preload(WOOD_PILE_URL);
useGLTF.preload(BANJO_URL);
useGLTF.preload(OLD_BEAR_TABLE_URL);
useGLTF.preload(OLD_BEAR_CHAIR_URL);
useGLTF.preload(OLD_BEAR_COMPUTER_URL);
useGLTF.preload(OLD_BEAR_BOOKS_URL);
useGLTF.preload(OLD_BEAR_MUG_URL);
useGLTF.preload(OLD_BEAR_BOXES_URL);
useGLTF.preload(OLD_BEAR_PAPERS_URL);
useGLTF.preload(OLD_BEAR_TOILET_URL);
useGLTF.preload(OLD_BEAR_POSTIT_URL);
useGLTF.preload(OLD_BEAR_DEBRIS_URL);
