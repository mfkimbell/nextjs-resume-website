"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { SWRConfig } from "swr";
import Header from "@/components/Header";
import LeftBird from "@/components/LeftBird";
import RightBird from "@/components/RightBird";
import SkillsCarousel from "@/components/SkillsCarousel";
import ProjectsSection from "@/components/Projects";
import ExperienceSection from "@/components/Experience";
import SkyBackground from "@/components/SkyBackground";
import TalkToTheBirds from "@/components/TalkToTheBirds";
import DraggableWoodpecker from "@/components/DraggableWoodpecker";
import ForestFooter from "@/components/ForestFooter";
import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";
import type { InitialGalleryResponse } from "@/lib/getInitialDrawings";

const GALLERY_ENDPOINT = "/api/drawing-submissions";

interface HomeShellProps {
  initialGallery: InitialGalleryResponse;
}

export default function HomeShell({ initialGallery }: HomeShellProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [pageHeightPx, setPageHeightPx] = useState(0);
  const pageContentRef = useRef<HTMLElement>(null);
  const { layout } = useResponsiveLayout();
  const leftTree = layout.leftTree;
  const leftTreeHeightPx = pageHeightPx
    ? Math.max(0, pageHeightPx - leftTree.topOffsetPx - leftTree.bottomOffsetPx)
    : 0;
  const leftTreeWidthPx = leftTreeHeightPx
    ? (leftTreeHeightPx * leftTree.nativeWidthPx) / leftTree.nativeHeightPx
    : leftTree.fallbackWidthPx;
  const leftTreeXOffsetPx = (leftTreeWidthPx * leftTree.xOffsetPctOfWidth) / 100;

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true));
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const updateTreeHeight = () => {
      if (!pageContentRef.current) return;
      setPageHeightPx(Math.ceil(pageContentRef.current.getBoundingClientRect().height));
    };

    const animationFrame = requestAnimationFrame(updateTreeHeight);
    const resizeObserver = new ResizeObserver(updateTreeHeight);

    if (pageContentRef.current) {
      resizeObserver.observe(pageContentRef.current);
    }

    window.addEventListener("resize", updateTreeHeight);

    return () => {
      cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateTreeHeight);
    };
  }, []);

  return (
    <SWRConfig value={{ fallback: { [GALLERY_ENDPOINT]: initialGallery } }}>
      <div className="relative overflow-x-clip overflow-y-clip">
        <div
          className={`
            fixed inset-0 z-[2000]
            bg-gradient-to-b from-[#8AD1FC] via-[#78C2F3] to-[#5CA7DF]
            flex items-center justify-center
            transition-opacity duration-700
            ${isLoaded ? "opacity-0 pointer-events-none" : "opacity-100"}
          `}
        />

        <a
          href="https://www.google.com/search?q=cute+rats+eating+sandwiches&tbm=isch"
          target="_blank"
          rel="noopener noreferrer"
          className="group absolute left-[3%] top-[15%] -translate-y-1/2 z-[55] pointer-events-auto cursor-pointer"
        />

        <SkyBackground />

        <Header />

        <DraggableWoodpecker />

        <div
          className="pointer-events-none absolute select-none"
          aria-hidden="true"
          style={{
            top: leftTree.topOffsetPx,
            left: leftTreeXOffsetPx,
            width: leftTreeWidthPx,
            height: leftTreeHeightPx || "100vh",
            zIndex: 1000,
          }}
        >
          <Image
            src="/fauna/left_tree.png"
            alt=""
            fill
            priority
            sizes={`${Math.ceil(leftTreeWidthPx)}px`}
            className="object-fill"
          />
        </div>

        <main ref={pageContentRef} className="relative z-10 text-white">
          <div className="relative z-10">
            <TalkToTheBirds />
            <SkillsCarousel />
            <LeftBird />
            <ProjectsSection />
            <RightBird />
            <ExperienceSection />
            <ForestFooter />
          </div>
        </main>

        <style jsx global>{`
          @keyframes ratFloat {
            0%, 100% { transform: translateY(0); }
            50%      { transform: translateY(-6px); }
          }
        `}</style>
      </div>
    </SWRConfig>
  );
}
