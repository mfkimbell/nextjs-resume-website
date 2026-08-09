"use client";

import { useState } from "react";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import CanvasBoard from "@/components/CanvasBoard";
import FooterButterflies from "@/components/FooterButterflies";
import BulletinBoard from "@/components/BulletinBoard";
import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";

const CONTACT_IMAGE = "/signs/contactme.png";
const MAILTO =
  "mailto:mfkimbell@gmail.com?subject=Portfolio%20contact&body=Hi%20Mitch%2C%0D%0A%0D%0AI%20saw%20your%20portfolio%20and%20wanted%20to%20reach%20out.%0D%0A%0D%0A";

export default function ForestFooter() {
  const { breakpoint, layout } = useResponsiveLayout();
  const footer = layout.footer;
  const [mode, setMode] = useState<"menu" | "sketch">("menu");

  return (
    <footer
      id="metrics"
      aria-label="Contact Me"
      className="relative z-20 mt-16 flex w-full max-w-[100vw] flex-col items-center overflow-x-clip sm:mt-24"
      data-breakpoint={breakpoint}
      style={{ paddingBottom: `${footer.bottomPaddingPct}%` }}
    >
      {/* 12 butterflies drifting behind the sign - rendered before the billboard
          so the DOM stacking order puts them underneath it. */}
      <FooterButterflies count={12} depth={-1.8} seed={7} />

      <h2 className="mb-8 text-center text-4xl font-bold text-white neon-text">
        Contact Me
      </h2>
      <div
        className="relative"
        style={{
          width: `${footer.billboard.widthPct}%`,
          maxWidth: 620,
          transform: `translateX(${footer.billboard.leftPct - 50}vw)`,
        }}
      >
        <div className="relative" style={{ aspectRatio: "1162 / 1354" }}>
          <Image
            src={CONTACT_IMAGE}
            alt="Contact Mitch sign"
            fill
            priority
            sizes="(max-width: 640px) 92vw, 620px"
            className="pointer-events-none select-none object-contain"
          />

          <div
            className="absolute flex flex-col items-center justify-center overflow-hidden rounded-sm px-4 py-4 text-center"
            style={{ top: "13%", right: "17.2%", bottom: "27.2%", left: "17.2%" }}
          >
            {mode === "menu" ? (
              <BulletinBoard mailto={MAILTO} onSketch={() => setMode("sketch")} />
            ) : (
              <div className="flex h-full w-full min-h-0 flex-col gap-2">
                <div className="flex items-center justify-between gap-2 text-amber-950">
                  <button
                    type="button"
                    onClick={() => setMode("menu")}
                    className="flex items-center gap-1 rounded-full bg-amber-950/10 px-3 py-1.5 text-xs font-bold hover:bg-amber-950/20"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Back
                  </button>
                  <p className="text-sm font-black uppercase tracking-[0.16em] sm:text-base">
                    Leave a sketch
                  </p>
                </div>

                <div className="relative min-h-0 flex-1 rounded-[3px] bg-[#fff4cf] p-2 shadow-[0_10px_20px_rgba(71,34,10,0.24)] ring-1 ring-amber-900/15">
                  <span className="pointer-events-none absolute left-1/2 top-1 h-3 w-16 -translate-x-1/2 rotate-1 rounded-sm bg-amber-100/80 shadow-sm ring-1 ring-amber-900/10" />
                  <CanvasBoard visits={0} clicks={0} mouseMiles={0} embedded />
                </div>
              </div>
            )}
          </div>

          {/* The old inline drawing papers are gone - submitted sketches now
              hang on the 3D board above. */}

          <img
            src="/gifs/racoon.gif"
            alt=""
            className="pointer-events-none absolute left-1/2 z-20 -translate-x-1/2"
            style={{
              bottom: `calc(100% + ${footer.raccoon.bottomOffsetPct ?? 0}%)`,
              width: `${footer.raccoon.widthPct}%`,
            }}
          />
        </div>
      </div>

      <div
        className="pointer-events-none absolute left-1/2 bottom-0 z-[45] -translate-x-1/2 overflow-hidden"
        style={{
          width: `${footer.grass.widthPct}%`,
          height: `${footer.grass.heightPct}%`,
          bottom: `${footer.grass.bottomOffsetPct ?? 0}%`,
          backgroundImage: `url(${footer.grass.src})`,
          backgroundRepeat: "no-repeat",
          backgroundPosition: "bottom center",
          backgroundSize: `${footer.grass.tileWidthPct ?? 100}% ${
            footer.grass.tileHeightPct ?? 100
          }%`,
        }}
      />

      {/* 10 more in front, so the swarm reads with depth across the billboard. */}
      <FooterButterflies count={10} depth={1.5} seed={23} />
    </footer>
  );
}
