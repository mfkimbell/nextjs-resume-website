"use client";

import ContactSign from "@/components/ContactSign";
import DrawingGallery from "@/components/DrawingGallery";
import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";

/**
 * Owns the whole bottom forest composition: doodle signs, grass strip, raccoon,
 * and bees. Keeping these in one scene makes future desktop/mobile spacing
 * changes much easier than positioning signs from HomeShell and fauna from the
 * contact/metrics section separately.
 */
export default function ForestFooter() {
  const { breakpoint, layout } = useResponsiveLayout();
  const footer = layout.footer;

  return (
    <footer
      className="relative z-20 mt-4 overflow-x-clip overflow-y-visible sm:mt-8"
      data-breakpoint={breakpoint}
    >
      <div
        className="relative overflow-visible"
        style={{
          aspectRatio: footer.aspectRatio,
          width: `${footer.sceneWidthPct}%`,
        }}
      >
        <div
          className="absolute z-30"
          style={{
            left: `${footer.billboard.leftPct}%`,
            bottom: `${footer.billboard.bottomPct}%`,
            width: `${footer.billboard.widthPct}%`,
            transform: "translateX(-50%)",
          }}
        >
          <div className="relative">
            <ContactSign visits={0} clicks={0} mouseMiles={0} />
            <div
              className="pointer-events-none absolute z-10"
              style={{
                top: `${footer.billboard.drawings.topPct}%`,
                left: `${footer.billboard.drawings.leftPct}%`,
                right: `${footer.billboard.drawings.rightPct}%`,
              }}
            >
              <DrawingGallery layout="inline" />
            </div>
            <img
              src="/gifs/racoon.gif"
              alt=""
              className="pointer-events-none absolute left-1/2 z-20 -translate-x-1/2"
              style={{
                bottom: "100%",
                width: "22%",
              }}
            />
          </div>
        </div>

        <div
          className="pointer-events-none absolute z-[45] overflow-hidden"
          style={{
            left: `${footer.grass.leftPct}%`,
            ...(footer.grass.rightPct != null
              ? { right: `${footer.grass.rightPct}%` }
              : { width: `${footer.grass.widthPct}%` }),
            height: `${footer.grass.heightPct}%`,
            bottom: `${footer.grass.bottomOffsetPct ?? 0}%`,
            backgroundImage: `url(${footer.grass.src})`,
            backgroundRepeat: "repeat-x",
            backgroundPosition: "bottom left",
            backgroundSize: `auto ${footer.grass.tileHeightPct ?? 100}%`,
          }}
        />

        {footer.bees.map((bee) => (
          <img
            key={bee.src}
            src={bee.src}
            alt=""
            className={`${bee.className} pointer-events-none absolute z-50`}
            style={{
              left: `${bee.leftPct}%`,
              top: `${bee.topPct}%`,
              width: `${bee.widthPct}%`,
            }}
          />
        ))}
      </div>

      <style jsx global>{`
        @keyframes fly-around-mobile {
          0% { transform: translate(0, 0); }
          25% { transform: translate(1px, -3px); }
          50% { transform: translate(0, -4px); }
          75% { transform: translate(-1px, -3px); }
          100% { transform: translate(0, 0); }
        }
        @keyframes fly-around {
          0% { transform: translate(0, 0); }
          25% { transform: translate(2px, -16px); }
          50% { transform: translate(0, -20px); }
          75% { transform: translate(-2px, -16px); }
          100% { transform: translate(0, 0); }
        }
        .bee-anim-1-mobile {
          animation: fly-around-mobile 3s ease-in-out infinite alternate 0s;
        }
        .bee-anim-2-mobile {
          animation: fly-around-mobile 5s ease-in-out infinite alternate 1.2s;
        }
        .bee-anim-3-mobile {
          animation: fly-around-mobile 3s ease-in-out infinite alternate 0.7s;
        }
        .bee-anim-1 {
          animation: fly-around 1s ease-in-out infinite alternate 0s;
        }
        .bee-anim-2 {
          animation: fly-around 1s ease-in-out infinite alternate 1.2s;
        }
        .bee-anim-3 {
          animation: fly-around 1s ease-in-out infinite alternate 0.7s;
        }
      `}</style>
    </footer>
  );
}
