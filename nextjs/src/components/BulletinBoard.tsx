// components/BulletinBoard.tsx
"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { A4_PAPER_ASPECT_RATIO } from "@/config/signs";
import { drawPaintStroke, fillPaperTexture, PAPER_COLOR, type PaintPoint } from "@/lib/paint";

/**
 * The contact board, in 3D.
 *
 *   board_envelope.glb  - a stack of envelopes  -> "Email Mitch"
 *   board_palette.glb   - paint palette + brush pot -> "Leave a sketch"
 *   bulletin_paper.glb  - pinned paper ("Paper" + "Pin" meshes) for user sketches
 *
 * All three were normalised in Blender: centred on their own origin, scaled to
 * roughly unit height, and rotated so the readable face points +Z (toward the
 * camera) after the glTF Y-up conversion. So nothing here needs magic rotations.
 *
 * The envelope and palette REST ON THE BOTTOM of the board and lean back against
 * it. Everything lifts and tilts toward the viewer on hover, with a contact
 * shadow that grows as it peels away.
 *
 * Submitted sketches come from /api/drawing-submissions as stroke arrays, not
 * images, so each is rasterised to a canvas here and used as the paper's map.
 */

const PAPER = "/models/bulletin_paper.glb";

/** Deterministic PRNG so the scatter is stable between renders. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Sheets are scattered, not gridded: a jittered grid keeps them from piling on
 * one spot while the per-sheet offset and rotation stop it reading as rows.
 */
function scatter(n: number, halfW: number, yLo: number, yHi: number, cell: number, seed: number) {
  const r = rng(seed);
  // Cap columns so the sheets naturally form multiple vertical bands instead of
  // one long row. The billboard is taller than it is wide, so this reads more
  // like papers pinned across a bulletin board.
  const maxCols = 3;
  const availableCols = Math.max(2, Math.floor((halfW * 2) / (cell * 1.05)));
  const cols = Math.max(2, Math.min(n, maxCols, availableCols));
  const rows = Math.ceil(n / cols);
  const out: { x: number; y: number; z: number; rot: number }[] = [];
  for (let i = 0; i < n; i++) {
    const c = i % cols;
    const rw = Math.floor(i / cols);
    const inRow = Math.min(cols, n - rw * cols);
    const bx = (c - (inRow - 1) / 2) * cell * 0.92;
    const by = yLo + ((yHi - yLo) * (rows === 1 ? 0.5 : rw / (rows - 1)));
    out.push({
      x: bx + (r() - 0.5) * cell * 0.55,
      y: by + (r() - 0.5) * cell * 0.45,
      z: i * 0.012 + r() * 0.01,
      rot: (r() - 0.5) * 0.62,
    });
  }
  return out;
}
const ENVELOPE = "/models/board_envelope.glb";
const PALETTE = "/models/board_palette.glb";
const MUG = "/models/mug_linkedin.glb";
const KEYCHAIN = "/models/keychain_github.glb";

/**
 * ---------------------------------------------------------------------------
 * SMOKE - per-spiral tuning for the three plumes above the coffee.
 * ---------------------------------------------------------------------------
 * Entry N drives the model node named Steam_N. Every number is RELATIVE to the
 * cup: the cup model is exactly 1.0 unit tall and 1.11 wide, so 1.0 here means
 * "as authored in Blender" and 0.5 means half that.
 *
 *   width  scales coil radius AND tube thickness (x/z). 1.0 = as authored.
 *   height scales how far it rises (y). The base is pinned to the coffee, so
 *          changing this stretches the plume upward rather than lifting it off.
 *   lift   nudge up (+) or down (-), in cup heights. 0.1 = a tenth of the cup.
 *   x, z   shift across the coffee from where it was authored, in cup heights.
 *          +x is toward the handle, +z is toward the viewer.
 *   spin   radians per second about its own axis. NEGATIVE reads as rising,
 *          positive as sinking. Keep all three different or they visually lock.
 *
 * Headroom before a plume pokes through the cup wall. The coffee now sits just
 * under the brim, where the tapered cup is widest, so the inner radius there is
 * 0.497 and there is more room than when it sat lower:
 *   Steam_0 reaches 0.190 + width*0.211  -> width up to ~1.45
 *   Steam_1 reaches 0.191 + width*0.180  -> width up to ~1.70
 *   Steam_2 reaches 0.238 + width*0.154  -> width up to ~1.68
 * Past those it will clip through the ceramic, so raise `lift` too if you go big.
 */
const SMOKE = [
  { width: 1.0, height: 1.0, lift: 0, x: 0, z: 0, spin: -0.54 },
  { width: 1.0, height: 1.0, lift: 0, x: 0, z: 0, spin: -0.75 },
  { width: 1.0, height: 1.0, lift: 0, x: 0, z: 0, spin: -0.96 },
] as const;
const SMOKE_FALLBACK = { width: 1, height: 1, lift: 0, x: 0, z: 0, spin: -0.6 };

const GITHUB_URL = "https://github.com/mfkimbell";
const LINKEDIN_URL = "https://www.linkedin.com/in/kimbell151/";

type Point = PaintPoint;
type Stroke = { pts: Point[]; color: string; width: number; erase?: boolean };
type Submission = {
  id: string;
  name: string;
  strokes: Stroke[];
  canvasSize: number;
  canvasHeight: number | null;
};

const PAPER_PX = 320;
const PAPER_HEIGHT_PX = Math.round(PAPER_PX / A4_PAPER_ASPECT_RATIO);
// The GLB paper was authored near 1:1.3; this nudges it to true A4 portrait.
const MODEL_PAPER_HEIGHT_RATIO = 1.3;
const PAPER_Y_SCALE = 1 / A4_PAPER_ASPECT_RATIO / MODEL_PAPER_HEIGHT_RATIO;

/**
 * A soft radial falloff used as the shadow's alpha map. The first version used a
 * flat plane with a solid colour, which rendered as visible grey RECTANGLES
 * behind every object - the boxes in the screenshot.
 */
let shadowTex: THREE.Texture | null = null;
function getShadowTexture(): THREE.Texture | null {
  if (shadowTex) return shadowTex;
  if (typeof document === "undefined") return null;
  const n = 128;
  const c = document.createElement("canvas");
  c.width = c.height = n;
  const g = c.getContext("2d");
  if (!g) return null;
  const grad = g.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2);
  grad.addColorStop(0, "rgba(60,38,12,0.55)");
  grad.addColorStop(0.55, "rgba(60,38,12,0.22)");
  grad.addColorStop(1, "rgba(60,38,12,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, n, n);
  shadowTex = new THREE.CanvasTexture(c);
  shadowTex.colorSpace = THREE.SRGBColorSpace;
  return shadowTex;
}

function SoftShadow({
  size,
  inner,
}: {
  size: [number, number];
  inner: React.RefObject<THREE.Mesh | null>;
}) {
  const tex = useMemo(() => getShadowTexture(), []);
  if (!tex) return null;
  return (
    <mesh ref={inner} position={[0.05, -0.07, -0.03]}>
      <planeGeometry args={[size[0] * 1.7, size[1] * 1.7]} />
      <meshBasicMaterial
        map={tex}
        transparent
        opacity={0.75}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}

/** Rasterise a submitted drawing onto a paper-shaped canvas. */
function sketchTexture(sub: Submission): THREE.Texture | null {
  if (typeof document === "undefined") return null;
  const c = document.createElement("canvas");
  c.width = PAPER_PX;
  c.height = PAPER_HEIGHT_PX;
  const g = c.getContext("2d");
  if (!g) return null;
  fillPaperTexture(g, c.width, c.height, sub.id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 17));
  const srcW = sub.canvasSize || 1;
  const srcH = sub.canvasHeight || sub.canvasSize || 1;
  const pad = 16;
  const s = Math.min((c.width - pad * 2) / srcW, (c.height - pad * 2 - 30) / srcH);
  const ox = (c.width - srcW * s) / 2;
  const oy = pad + (c.height - 30 - pad * 2 - srcH * s) / 2;
  for (const st of sub.strokes ?? []) {
    if (!st?.pts?.length) continue;
    drawPaintStroke(
      g,
      {
        ...st,
        width: Math.max(1, (st.width || 3) * s),
        pts: st.pts.map((p) => ({
          x: ox + p.x * s,
          y: oy + p.y * s,
          pressure: p.pressure,
        })),
      },
      { eraseColor: PAPER_COLOR }
    );
  }
  g.fillStyle = "#7a5a24";
  g.font = "700 20px ui-sans-serif, system-ui, sans-serif";
  g.textAlign = "center";
  g.fillText((sub.name || "anon").slice(0, 16), c.width / 2, c.height - 13);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** Shared hover behaviour: lift toward the viewer, tilt, grow a shadow. */
function useHoverLift(restTilt: number, lift = 0.30, tilt = -0.26) {
  const grp = useRef<THREE.Group>(null);
  const shadow = useRef<THREE.Mesh | null>(null);
  const [hovered, setHovered] = useState(false);
  useFrame((_, delta) => {
    const g = grp.current;
    if (!g) return;
    const k = 1 - Math.pow(0.0002, Math.min(delta, 0.05));
    g.position.z += ((hovered ? lift : 0) - g.position.z) * k;
    g.rotation.x += ((hovered ? tilt : 0) - g.rotation.x) * k;
    g.rotation.z += ((hovered ? restTilt * 0.2 : restTilt) - g.rotation.z) * k;
    if (shadow.current) {
      const m = shadow.current.material as THREE.MeshBasicMaterial;
      m.opacity += ((hovered ? 0.95 : 0.5) - m.opacity) * k;
      const s = hovered ? 1.18 : 1.0;
      shadow.current.scale.x += (s - shadow.current.scale.x) * k;
      shadow.current.scale.y = shadow.current.scale.x;
    }
  });
  const bind = {
    onPointerOver: (e: { stopPropagation: () => void }) => {
      e.stopPropagation();
      setHovered(true);
      document.body.style.cursor = "pointer";
    },
    onPointerOut: () => {
      setHovered(false);
      document.body.style.cursor = "";
    },
  };
  return { grp, shadow, hovered, bind };
}

function Prop3D({
  url,
  position,
  scale,
  restTilt,
  shadowSize,
  onClick,
  bob,
  halfH,
}: {
  url: string;
  position: [number, number, number];
  scale: number;
  restTilt: number;
  shadowSize: [number, number];
  onClick?: () => void;
  bob?: number;
  /** half the model's own height, so it can sit ON the ledge rather than centred */
  halfH: number;
}) {
  const { scene } = useGLTF(url) as unknown as { scene: THREE.Group };
  const obj = useMemo(() => scene.clone(true), [scene]);
  const { grp, shadow, bind } = useHoverLift(restTilt);
  const inner = useRef<THREE.Group>(null);
  /**
   * Each node named Steam_N is a helix built around its OWN local origin and
   * displaced by a node translation, so it spins on the spot like a top - it
   * does NOT travel around the cup. A rotating helix makes its coils appear to
   * climb, which is what reads as rising smoke: no vertical motion and no
   * opacity fade. Sizing and speed come from the SMOKE config at the top.
   */
  const steam = useMemo(() => {
    const out: { node: THREE.Object3D; speed: number }[] = [];
    obj.traverse((child) => {
      if (!child.name.startsWith("Steam")) return;
      const mesh = child as THREE.Mesh;
      const mat = (mesh.material as THREE.MeshStandardMaterial).clone();
      mat.transparent = true;
      mat.depthWrite = false;
      mesh.material = mat;
      const n = Number(child.name.match(/Steam_(\d+)/)?.[1] ?? out.length);
      const cfg = SMOKE[n] ?? SMOKE_FALLBACK;
      /**
       * The helix sits above its own origin (its geometry starts at the coffee
       * surface, not at y = 0), so scaling y would drag the base up off the
       * drink. Measure that base and push the node back down by the amount the
       * scale moved it, which pins the plume to the coffee however tall it gets.
       */
      mesh.geometry.computeBoundingBox();
      const baseY = mesh.geometry.boundingBox?.min.y ?? 0;
      child.scale.set(cfg.width, cfg.height, cfg.width);
      child.position.set(
        child.position.x + cfg.x,
        child.position.y + baseY * (1 - cfg.height) + cfg.lift,
        child.position.z + cfg.z
      );
      out.push({ node: child, speed: cfg.spin });
    });
    return out;
  }, [obj]);
  useFrame((state) => {
    // Envelopes hang, so give them a slow sway; the palette just sits.
    if (inner.current && bob) {
      inner.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.9) * bob;
    }
    for (const s of steam) {
      s.node.rotation.y = state.clock.elapsedTime * s.speed;
    }
  });
  const seated: [number, number, number] = [
    position[0],
    position[1] + halfH * scale,
    position[2],
  ];
  return (
    <group position={seated}>
      <SoftShadow size={shadowSize} inner={shadow} />
      <group
        ref={grp}
        rotation={[0, 0, restTilt]}
        {...(onClick ? bind : {})}
        onClick={(e) => {
          e.stopPropagation();
          onClick?.();
        }}
      >
        <group ref={inner} scale={scale}>
          <primitive object={obj} />
        </group>
      </group>
    </group>
  );
}

function SketchPaper({
  sub,
  position,
  scale,
  restTilt,
}: {
  sub: Submission;
  position: [number, number, number];
  scale: number;
  restTilt: number;
}) {
  const { scene } = useGLTF(PAPER) as unknown as { scene: THREE.Group };
  const map = useMemo(() => sketchTexture(sub), [sub]);
  const parts = useMemo(() => {
    const p = (scene.getObjectByName("Paper") as THREE.Mesh | undefined)?.clone();
    if (p) {
      const mat = (p.material as THREE.MeshStandardMaterial).clone();
      if (map) mat.map = map;
      mat.roughness = 0.93;
      mat.metalness = 0;
      p.material = mat;
    }
    return { p };
  }, [scene, map]);
  const { grp, shadow, bind } = useHoverLift(restTilt, 0.26, -0.22);
  const paperScale: [number, number, number] = [scale, scale * PAPER_Y_SCALE, scale];
  return (
    <group position={position}>
      <group scale={paperScale}>
        <SoftShadow size={[1.04, 1.34 * PAPER_Y_SCALE]} inner={shadow} />
      </group>
      <group ref={grp} scale={paperScale} rotation={[0, 0, restTilt]} {...bind}>
        {parts.p && <primitive object={parts.p} />}
      </group>
    </group>
  );
}

/** A blank aged sheet, used to fill the board when there are few submissions. */
function blankTexture(seed: number): THREE.Texture | null {
  if (typeof document === "undefined") return null;
  const c = document.createElement("canvas");
  c.width = PAPER_PX;
  c.height = PAPER_HEIGHT_PX;
  const g = c.getContext("2d");
  if (!g) return null;
  const tints = ["#fffaec", "#fdf4e0", "#fff7e6", "#f9f1dd"];
  fillPaperTexture(g, c.width, c.height, seed + 101, tints[seed % tints.length]);
  g.strokeStyle = "rgba(120,90,40,0.10)";
  g.lineWidth = 1;
  for (let y = 44; y < c.height - 20; y += 30) {
    g.beginPath();
    g.moveTo(20, y);
    g.lineTo(c.width - 20, y);
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function BlankPaper({
  position,
  scale,
  restTilt,
  seed,
}: {
  position: [number, number, number];
  scale: number;
  restTilt: number;
  seed: number;
}) {
  const { scene } = useGLTF(PAPER) as unknown as { scene: THREE.Group };
  const map = useMemo(() => blankTexture(seed), [seed]);
  const parts = useMemo(() => {
    const pp = (scene.getObjectByName("Paper") as THREE.Mesh | undefined)?.clone();
    if (pp) {
      const mat = (pp.material as THREE.MeshStandardMaterial).clone();
      if (map) mat.map = map;
      mat.roughness = 0.94;
      mat.metalness = 0;
      pp.material = mat;
    }
    return { pp };
  }, [scene, map]);
  const { grp, shadow, bind } = useHoverLift(restTilt, 0.18, -0.15);
  const paperScale: [number, number, number] = [scale, scale * PAPER_Y_SCALE, scale];
  return (
    <group position={position}>
      <group scale={paperScale}>
        <SoftShadow size={[1.04, 1.34 * PAPER_Y_SCALE]} inner={shadow} />
      </group>
      <group ref={grp} scale={paperScale} rotation={[0, 0, restTilt]} {...bind}>
        {parts.pp && <primitive object={parts.pp} />}
      </group>
    </group>
  );
}

function Scene({
  subs,
  mailto,
  onSketch,
}: {
  subs: Submission[];
  mailto: string;
  onSketch: () => void;
}) {
  const { viewport } = useThree();
  const halfW = viewport.width / 2;
  const halfH = viewport.height / 2;

  const openMail = useCallback(() => {
    window.location.href = mailto;
  }, [mailto]);

  // Props rest on the bottom edge; sketches fill the open bulletin space above
  // them with a loose multi-row scatter.
  const floorY = -halfH + 0.52;
  const propScale = Math.min(0.72, halfW * 0.43);
  const paperScale = Math.min(0.52, (halfW * 2) / 3.4);
  const paperYLo = floorY + 0.98;
  const paperYHi = halfH - paperScale * PAPER_Y_SCALE * 0.55;
  const MIN_SHEETS = 6;

  /**
   * halfH is half of each model's own height in its normalised space, which is
   * what lets Prop3D seat it on the shelf. envelope 0.65 tall, palette 1.02,
   * mug 1.0 - all measured after normalisation in Blender. The GitHub keychain
   * is NOT here: it lies on its side on the shelf and is placed separately.
   */
  const SHELF = useMemo(
    () => [
      {
        key: "envelope",
        url: ENVELOPE,
        scale: 0.82,
        tilt: 0.05,
        halfH: 0.33,
        shadow: [1.0, 0.66] as [number, number],
        bob: 0.02,
        href: undefined as string | undefined,
      },
      {
        key: "palette",
        url: PALETTE,
        scale: 0.90,
        tilt: -0.07,
        halfH: 0.5,
        shadow: [1.05, 0.92] as [number, number],
        bob: undefined as number | undefined,
        href: undefined as string | undefined,
      },
      {
        key: "mug",
        url: MUG,
        scale: 0.7,
        tilt: 0.0,
        halfH: 0.5,
        shadow: [1.0, 0.8] as [number, number],
        bob: undefined as number | undefined,
        href: LINKEDIN_URL,
      },
    ],
    []
  );
  const sheetCount = Math.max(subs.length, MIN_SHEETS);
  const spots = useMemo(
    () => scatter(sheetCount, halfW, paperYLo, paperYHi, paperScale * 1.12, 99),
    [sheetCount, halfW, paperYLo, paperYHi, paperScale]
  );

  return (
    <>
      <ambientLight intensity={1.05} />
      <directionalLight position={[1.4, 2.6, 3.6]} intensity={1.55} color="#fff1d2" />
      <directionalLight position={[-2.4, -0.4, 2.2]} intensity={0.45} color="#b9d4f0" />

      {spots.map((sp, i) =>
        i < subs.length ? (
          <SketchPaper
            key={subs[i].id}
            sub={subs[i]}
            position={[sp.x, sp.y, sp.z]}
            scale={paperScale}
            restTilt={sp.rot}
          />
        ) : (
          <BlankPaper
            key={"blank" + i}
            position={[sp.x, sp.y, sp.z]}
            scale={paperScale}
            restTilt={sp.rot}
            seed={i}
          />
        )
      )}

      {/* Props stand on the shelf along the bottom of the board. Each is
          offset up by half its OWN height (halfH) so it rests on the shelf line
          instead of being centred on it - the artwork behind supplies the shelf. */}
      {SHELF.map((item, i) => {
        const span = halfW * 1.30;
        const x = -span / 2 + (i * span) / (SHELF.length - 1);
        return (
          <Prop3D
            key={item.key}
            url={item.url}
            position={[x, floorY, 0.1]}
            scale={propScale * item.scale}
            restTilt={item.tilt}
            shadowSize={item.shadow}
            halfH={item.halfH}
            bob={item.bob}
            onClick={
              item.key === "envelope"
                ? openMail
                : item.key === "palette"
                ? onSketch
                : () => window.open(item.href as string, "_blank", "noopener,noreferrer")
            }
          />
        );
      })}

      {/* The GitHub keychain lies on its side on the shelf, chain trailing to the
          right. This model is exported with its base already at z = 0 rather than
          centred, so halfH is 0 and it rests exactly on the shelf line. It sits at a
          higher z than the standing props so the chain drapes in front of them. */}
      <Prop3D
        url={KEYCHAIN}
        position={[-halfW * 0.06, floorY, 0.45]}
        scale={propScale * 1.15}
        restTilt={0}
        shadowSize={[1.15, 0.34]}
        halfH={0}
        onClick={() =>
          window.open(GITHUB_URL, "_blank", "noopener,noreferrer")
        }
      />
    </>
  );
}

export default function BulletinBoard({
  mailto,
  onSketch,
  className = "",
}: {
  mailto: string;
  onSketch: () => void;
  className?: string;
}) {
  const [subs, setSubs] = useState<Submission[]>([]);
  useEffect(() => {
    let alive = true;
    fetch("/api/drawing-submissions?limit=8", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!alive || !d) return;
        const list: Submission[] = Array.isArray(d) ? d : d.drawings ?? [];
        setSubs(list.slice(0, 8));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className={"absolute inset-0 " + className}>
      <Canvas camera={{ position: [0, 0, 4.2], fov: 42 }} gl={{ alpha: true, antialias: true }}>
        <Scene subs={subs} mailto={mailto} onSketch={onSketch} />
      </Canvas>
      <div className="sr-only">
        <a href={mailto}>Email Mitch</a>
        <button type="button" onClick={onSketch}>
          Leave a sketch
        </button>
        <a href="https://github.com/mfkimbell">GitHub</a>
        <a href="https://www.linkedin.com/in/kimbell151/">LinkedIn</a>
      </div>
    </div>
  );
}

useGLTF.preload(PAPER);
useGLTF.preload(ENVELOPE);
useGLTF.preload(PALETTE);
useGLTF.preload(MUG);
useGLTF.preload(KEYCHAIN);
