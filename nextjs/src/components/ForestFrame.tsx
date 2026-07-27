// components/ForestFrame.tsx
//
// Frames the whole page like you're looking out through jungle: the right-hand
// side of a tree down the left edge, the left-hand side of another down the
// right edge, and a canopy of leaves across the top.
//
// These are pre-rendered transparent PNGs rather than live 3D. The page already
// has three <Canvas> elements running (two sparrows + the toucan); adding three
// more just for static scenery would cost frame time for no visual gain.
// Generated procedurally in Blender — see /.treegen.py at the repo root.
"use client";

import React from "react";

export default function ForestFrame() {
  return (
    <div
      aria-hidden
      className="pointer-events-none select-none fixed inset-0 z-[5] overflow-hidden"
    >
      {/* leaves hanging across the top */}
      <img
        src="/canopy_top.webp"
        alt=""
        className="absolute top-0 left-0 w-full h-[90px] sm:h-[130px] md:h-[170px]
                   object-cover object-top"
      />

      {/* left edge — the right-hand side of a tree */}
      <img
        src="/tree_left.webp"
        alt=""
        className="hidden sm:block absolute inset-y-0 left-0
                   w-[18vw] min-w-[120px] max-w-[280px] h-full
                   object-cover object-left"
      />

      {/* right edge — the left-hand side of a tree */}
      <img
        src="/tree_right.webp"
        alt=""
        className="hidden sm:block absolute inset-y-0 right-0
                   w-[18vw] min-w-[120px] max-w-[280px] h-full
                   object-cover object-right"
      />
    </div>
  );
}
