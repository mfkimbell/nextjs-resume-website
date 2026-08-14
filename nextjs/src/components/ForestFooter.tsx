"use client";

import { useCallback, useState } from "react";
import Image from "next/image";
import CanvasBoard from "@/components/CanvasBoard";
import BulletinBoard from "@/components/BulletinBoard";
import FooterButterflies from "@/components/FooterButterflies";
import { CONTACT_BOARD_UI_INSET } from "@/config/signs";
import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";

const CONTACT_IMAGE = "/signs/contactme.png";
const DEFAULT_CONTACT_TITLE = "Contact Me";
const SKETCH_CONTACT_TITLE = "Sketch an Image";
const MAILTO =
  "mailto:mfkimbell@gmail.com?subject=Portfolio%20contact&body=Hi%20Mitch%2C%0D%0A%0D%0AI%20saw%20your%20portfolio%20and%20wanted%20to%20reach%20out.%0D%0A%0D%0A";

const FOOTER_LAYER_BASE_Z = 20;
const FOOTER_FARTHEST_DEPTH = 12;
// Grass depth is authored as: 0 = closest/front, higher = farther/back.
const footerDepthZ = (depth: number) =>
  FOOTER_LAYER_BASE_Z + Math.round((FOOTER_FARTHEST_DEPTH - depth) * 10);

export default function ForestFooter() {
  const { breakpoint, layout } = useResponsiveLayout();
  const footer = layout.footer;
  const sketchInset = CONTACT_BOARD_UI_INSET;
  const [mode, setMode] = useState<"menu" | "sketch">("menu");
  const [hoverContactTitle, setHoverContactTitle] = useState<string | null>(null);

  const contactTitle =
    mode === "sketch" ? SKETCH_CONTACT_TITLE : hoverContactTitle ?? DEFAULT_CONTACT_TITLE;

  const handleBoardHoverTitle = useCallback((title: string, active: boolean) => {
    setHoverContactTitle((current) => {
      if (active) return title;
      return current === title ? null : current;
    });
  }, []);

  const openSketch = useCallback(() => {
    setHoverContactTitle(null);
    setMode("sketch");
  }, []);

  const closeSketch = useCallback(() => {
    setHoverContactTitle(null);
    setMode("menu");
  }, []);

  return (
    <footer
      id="metrics"
      aria-label="Contact Me"
      className="relative left-1/2 mt-16 flex w-screen max-w-[100vw] -translate-x-1/2 flex-col items-center overflow-visible sm:mt-24"
      data-breakpoint={breakpoint}
      style={{ paddingBottom: `${footer.bottomPaddingPct}%` }}
    >
      {[...footer.butterflies]
        .sort((a, b) => b.layerDepth - a.layerDepth)
        .map((layer) => (
          <FooterButterflies
            key={`${layer.seed}-${layer.layerDepth}`}
            count={layer.count}
            depth={layer.sceneDepth}
            seed={layer.seed}
            scaleMin={layer.scaleMin}
            scaleMax={layer.scaleMax}
            className="inset-0"
            style={{ zIndex: footerDepthZ(layer.layerDepth) }}
          />
        ))}

      <h2 className="relative z-30 mb-8 text-center text-4xl font-bold text-white neon-text" aria-live="polite">
        {contactTitle}
      </h2>
      <div
        className="relative"
        style={{
          width: `${footer.billboard.widthPct}%`,
          maxWidth: 820,
          left: `${footer.billboard.leftPct - 50}vw`,
          marginBottom: `${footer.billboard.bottomPct}%`,
        }}
      >
        <div
          className="relative"
          style={{
            aspectRatio: "1162 / 1354",
            zIndex: footerDepthZ(footer.depths.billboardDepth),
          }}
        >
          <Image
            src={CONTACT_IMAGE}
            alt="Contact Mitch sign"
            fill
            priority
            sizes="(max-width: 640px) 92vw, 820px"
            className="pointer-events-none z-10 select-none object-contain"
          />

          {mode === "menu" ? (
            <BulletinBoard
              mailto={MAILTO}
              onSketch={openSketch}
              onHoverTitleChange={handleBoardHoverTitle}
              className="z-30"
            />
          ) : (
            <div
              className="absolute z-30 flex flex-col items-center justify-center overflow-hidden rounded-sm px-4 py-4 text-center"
              style={{
                top: `${sketchInset.topPct}%`,
                right: `${sketchInset.rightPct}%`,
                bottom: `${sketchInset.bottomPct}%`,
                left: `${sketchInset.leftPct}%`,
              }}
            >
              <div className="h-full w-full min-h-0 overflow-hidden rounded-[3px]">
                <CanvasBoard
                  visits={0}
                  clicks={0}
                  mouseMiles={0}
                  embedded
                  onBack={closeSketch}
                />
              </div>
            </div>
          )}

          {/* The old inline drawing papers are gone - submitted sketches now
              hang on the 3D board above. */}
        </div>

        <Image
          src="/gifs/racoon.gif"
          alt=""
          width={1000}
          height={1000}
          unoptimized
          className="pointer-events-none absolute left-1/2 h-auto -translate-x-1/2"
          style={{
            bottom: `calc(100% + ${footer.raccoon.bottomOffsetPct ?? 0}%)`,
            width: `${footer.raccoon.widthPct}%`,
            zIndex: footerDepthZ(footer.depths.raccoonDepth),
          }}
        />
      </div>

      {[...footer.grassLayers]
        .sort((a, b) => b.depth - a.depth)
        .map((layer) => (
          <div
            key={layer.src}
            className="pointer-events-none absolute bottom-0 left-1/2 overflow-hidden bg-bottom bg-no-repeat"
            style={{
              zIndex: footerDepthZ(layer.depth),
              width: `${layer.widthPct}vw`,
              height: `${layer.heightPct}%`,
              bottom: `${layer.bottomOffsetPct ?? 0}%`,
              transform: `translateX(calc(-50% + ${layer.xOffsetVw ?? 0}vw))`,
              backgroundImage: `url(${layer.src})`,
              backgroundSize: `${layer.tileWidthPct ?? 100}% ${
                layer.tileHeightPct ?? 100
              }%`,
            }}
          />
        ))}
    </footer>
  );
}
