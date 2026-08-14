"use client";

import { useState, useEffect, useRef, type CSSProperties, type ReactNode } from "react";
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
import type { HomeSectionFrameLayout } from "@/config/responsiveLayout";
import type { InitialGalleryResponse } from "@/lib/getInitialDrawings";

const GALLERY_ENDPOINT = "/api/drawing-submissions";
const MIN_SIDE_TREE_VISIBLE_WIDTH_PX = 24;
const TREE_CONTENT_GAP_PX = 8;
const FOOTER_LAYER_BASE_Z = 20;
const FOOTER_FARTHEST_DEPTH = 12;
const footerDepthZ = (depth: number) =>
  FOOTER_LAYER_BASE_Z + Math.round((FOOTER_FARTHEST_DEPTH - depth) * 10);

const SECTION_FRAME_JUSTIFY: Record<Required<HomeSectionFrameLayout>["align"], CSSProperties["justifyContent"]> = {
  start: "flex-start",
  center: "center",
  end: "flex-end",
};

interface HomeShellProps {
  initialGallery: InitialGalleryResponse;
}

function SectionFrame({
  children,
  layout,
}: {
  children: ReactNode;
  layout: HomeSectionFrameLayout;
}) {
  return (
    <div
      className="relative flex w-full flex-col"
      style={{
        minHeight: layout.minHeightPx,
        marginTop: layout.marginTopPx,
        marginBottom: layout.marginBottomPx,
        justifyContent: SECTION_FRAME_JUSTIFY[layout.align ?? "start"],
      }}
    >
      <div className="relative z-[90] w-full">{children}</div>
    </div>
  );
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
  const scaledTransparentEdgeInsetPx =
    (leftTreeWidthPx * leftTree.transparentEdgeInsetPx) / leftTree.nativeWidthPx;
  const sideTreeVisibleWidthPx = Math.min(
    Math.max(
      scaledTransparentEdgeInsetPx + leftTree.treeVisiblePeekPx,
      MIN_SIDE_TREE_VISIBLE_WIDTH_PX
    ),
    leftTreeWidthPx
  );
  const sideTreeEdgeOffsetPx = Math.min(0, sideTreeVisibleWidthPx - leftTreeWidthPx);
  const contentSidePaddingPx = Math.max(
    MIN_SIDE_TREE_VISIBLE_WIDTH_PX,
    leftTree.treeVisiblePeekPx + TREE_CONTENT_GAP_PX - leftTree.contentOverlapIntoTreePx
  );
  const sideTreeZIndex = footerDepthZ(layout.footer.depths.treesDepth);

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

        <main ref={pageContentRef} className="relative z-10 text-white">
          <div
            className="pointer-events-none absolute select-none"
            aria-hidden="true"
            style={{
              top: leftTree.topOffsetPx,
              left: sideTreeEdgeOffsetPx,
              width: leftTreeWidthPx,
              height: leftTreeHeightPx || "100vh",
              zIndex: sideTreeZIndex,
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

          <div
            className="pointer-events-none absolute select-none"
            aria-hidden="true"
            style={{
              top: leftTree.topOffsetPx,
              right: sideTreeEdgeOffsetPx,
              width: leftTreeWidthPx,
              height: leftTreeHeightPx || "100vh",
              zIndex: sideTreeZIndex,
            }}
          >
            <Image
              src="/fauna/right_tree.png"
              alt=""
              fill
              priority
              sizes={`${Math.ceil(leftTreeWidthPx)}px`}
              className="object-fill"
            />
          </div>

          <div
            className="relative"
            style={{
              paddingLeft: contentSidePaddingPx,
              paddingRight: contentSidePaddingPx,
            }}
          >
            <SectionFrame layout={layout.sections.talkToTheBirds}>
              <TalkToTheBirds />
            </SectionFrame>
            <SectionFrame layout={layout.sections.experience}>
              <ExperienceSection />
            </SectionFrame>
            <LeftBird />
            <SectionFrame layout={layout.sections.skills}>
              <SkillsCarousel />
            </SectionFrame>
            <RightBird />
            <SectionFrame layout={layout.sections.projects}>
              <ProjectsSection />
            </SectionFrame>
            <SectionFrame layout={layout.sections.contact}>
              <ForestFooter />
            </SectionFrame>
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
