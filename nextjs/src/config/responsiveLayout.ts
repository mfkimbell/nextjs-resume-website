export type ResponsiveBreakpoint = "mobile" | "tablet" | "desktop" | "wide";

export const RESPONSIVE_BREAKPOINT_MIN_WIDTH = {
  mobile: 0,
  tablet: 640,
  desktop: 1024,
  wide: 1440,
} as const;

export interface FooterSignsLayout {
  /** Width of each sign as a percentage of the footer banner width. */
  widthPct: number;
  /** Left edge of sign1/sign2/sign3 as percentages of the footer banner width. */
  leftPctBySign: readonly [number, number, number];
  /** Bottom edge of sign1/sign2/sign3 as percentages of the footer banner height. */
  bottomPctBySign: readonly [number, number, number];
}

export interface FooterObjectLayout {
  leftPct: number;
  topPct?: number;
  bottomPct?: number;
  widthPct: number;
}

export interface FooterBeeLayout extends FooterObjectLayout {
  topPct: number;
  src: string;
  className: string;
}

export interface ContactBillboardLayout {
  /** Width of the billboard as a % of the scene width. */
  widthPct: number;
  /** Horizontal center of the billboard as a % of the scene width. */
  leftPct: number;
  /** Bottom edge of the billboard as a % of the scene height. */
  bottomPct: number;
  /**
   * Where the pinned drawings row sits over the billboard's top wood plank.
   * Values are % of the billboard's own height.
   */
  drawings: {
    topPct: number;
    leftPct: number;
    rightPct: number;
  };
}

export interface FooterSceneLayout {
  /** Aspect ratio used as the footer scene coordinate system. */
  aspectRatio: string;
  /**
   * Width of the footer scene relative to the viewport/container.
   * Use this to make the art larger on small screens without changing its aspect ratio.
   */
  sceneWidthPct: number;
  signs: FooterSignsLayout;
  raccoon: FooterObjectLayout;
  bees: readonly [FooterBeeLayout, FooterBeeLayout, FooterBeeLayout];
  grass: ForegroundGrassLayout;
  billboard: ContactBillboardLayout;
}

export interface ForegroundGrassLayout {
  src: string;
  /** Width of the rendered grass image as a % of the footer scene width. Increase this to make the grass wider/larger. */
  widthPct: number;
  /** Left edge of the rendered grass image as a % of the footer scene width. */
  leftPct: number;
  /** Optional right inset as a % of the scene width. Use with leftPct to squish the strip in from the right. Overrides widthPct when set. */
  rightPct?: number;
  /** Height of the visible crop window as a % of the scene height. Increase this to reveal more vertical grass. */
  heightPct: number;
  /** Optional shift up from the scene bottom, as % of the scene height. Defaults to 0. */
  bottomOffsetPct?: number;
  /** Height of one grass tile as a % of the strip's height. Defaults to 100 (tile fills the strip vertically). Lower values = zoom out (smaller/more tiles). */
  tileHeightPct?: number;
}

export interface LeftTreeLayout {
  /** Native dimensions of public/fauna/left_tree.png. Used to preserve aspect ratio. */
  nativeWidthPx: number;
  nativeHeightPx: number;
  /** Used briefly before page height has been measured on the client. */
  fallbackWidthPx: number;
  /** Left offset as a % of the rendered tree width, so the crop tracks tree scale. */
  xOffsetPctOfWidth: number;
  topOffsetPx: number;
  bottomOffsetPx: number;
}

export interface WoodpeckerAnchorLayout {
  xPx: number;
  experienceSectionOffsetYPx: number;
  fallbackYPx: number;
  minYPx: number;
}

export interface ResponsiveSceneLayout {
  footer: FooterSceneLayout;
  leftTree: LeftTreeLayout;
  woodpecker: WoodpeckerAnchorLayout;
}

/**
 * Breakpoint-specific decorative layout config.
 *
 * Edit this file when the art needs to move/resize for a viewport width. Values
 * are percentages of the art scene they belong to, not random viewport pixels.
 *
 * Current coverage:
 * - ForestFooter: signs, raccoon, bees, foreground grass, banner scene sizing
 * - HomeShell: left tree page-height scale/crop
 * - DraggableWoodpecker: woodpecker anchor near the Experience section
 *
 * Good next candidates to move here:
 * - section-specific clouds and bird offsets
 * - footer mobile carousel spacing if we split the mobile sign layout later
 */
export const RESPONSIVE_SCENE_LAYOUT: Record<ResponsiveBreakpoint, ResponsiveSceneLayout> = {
  mobile: {
    footer: {
      aspectRatio: "4377 / 1039",
      sceneWidthPct: 220,
      signs: {
        widthPct: 18,
        leftPctBySign: [4, 25, 46],
        bottomPctBySign: [4, 6, 4],
      },
      raccoon: { leftPct: 61, bottomPct: 3, widthPct: 15 },
      bees: [
        { src: "/animals/bee1.png", leftPct: 28, topPct: 60, widthPct: 1.5, className: "bee-anim-1" },
        { src: "/animals/bee2.png", leftPct: 35, topPct: 38, widthPct: 1.5, className: "bee-anim-2" },
        { src: "/animals/bee3.png", leftPct: 40, topPct: 53, widthPct: 1.5, className: "bee-anim-3" },
      ],
      grass: {
        src: "/fauna/fauna_grass_all.png",
        widthPct: 100,
        leftPct: 0,
        heightPct: 40,
        bottomOffsetPct: 0,
      },
      billboard: {
        widthPct: 80,
        leftPct: 50,
        bottomPct: 8,
        drawings: { topPct: 4, leftPct: 20, rightPct: 20 },
      },
    },
    leftTree: {
      nativeWidthPx: 940,
      nativeHeightPx: 8650,
      fallbackWidthPx: 420,
      xOffsetPctOfWidth: -42.86,
      topOffsetPx: 0,
      bottomOffsetPx: 0,
    },
    woodpecker: { xPx: 12, experienceSectionOffsetYPx: 95, fallbackYPx: 170, minYPx: 64 },
  },
  tablet: {
    footer: {
      aspectRatio: "4377 / 1039",
      sceneWidthPct: 140,
      signs: {
        widthPct: 12,
        leftPctBySign: [7, 22, 37],
        bottomPctBySign: [4, 6, 4],
      },
      raccoon: { leftPct: 58, bottomPct: 4, widthPct: 12 },
      bees: [
        { src: "/animals/bee1.png", leftPct: 28, topPct: 60, widthPct: 1.1, className: "bee-anim-1" },
        { src: "/animals/bee2.png", leftPct: 35, topPct: 38, widthPct: 1.1, className: "bee-anim-2" },
        { src: "/animals/bee3.png", leftPct: 40, topPct: 53, widthPct: 1.1, className: "bee-anim-3" },
      ],
      grass: {
        src: "/fauna/fauna_grass_all.png",
        widthPct: 100,
        leftPct: 100,
        heightPct: 35,
        bottomOffsetPct: 0,
      },
      billboard: {
        widthPct: 55,
        leftPct: 50,
        bottomPct: 8,
        drawings: { topPct: 4, leftPct: 20, rightPct: 20 },
      },
    },
    leftTree: {
      nativeWidthPx: 940,
      nativeHeightPx: 8650,
      fallbackWidthPx: 420,
      xOffsetPctOfWidth: -42.86,
      topOffsetPx: 0,
      bottomOffsetPx: 0,
    },
    woodpecker: { xPx: 12, experienceSectionOffsetYPx: 95, fallbackYPx: 170, minYPx: 64 },
  },
  desktop: {
    footer: {
      aspectRatio: "4377 / 1039",
      sceneWidthPct: 100,
      signs: {
        widthPct: 9,
        leftPctBySign: [8, 21, 34],
        bottomPctBySign: [4, 6, 4],
      },
      raccoon: { leftPct: 57, bottomPct: 5, widthPct: 10 },
      bees: [
        { src: "/animals/bee1.png", leftPct: 28, topPct: 60, widthPct: 1, className: "bee-anim-1" },
        { src: "/animals/bee2.png", leftPct: 35, topPct: 38, widthPct: 1, className: "bee-anim-2" },
        { src: "/animals/bee3.png", leftPct: 40, topPct: 53, widthPct: 1, className: "bee-anim-3" },
      ],
      grass: {
        src: "/fauna/fauna_grass_all.png",
        widthPct: 20,
        leftPct: 0,
        heightPct: 100,
        bottomOffsetPct: 0,
      },
      billboard: {
        widthPct: 40,
        leftPct: 50,
        bottomPct: 8,
        drawings: { topPct: 4, leftPct: 20, rightPct: 20 },
      },
    },
    leftTree: {
      nativeWidthPx: 940,
      nativeHeightPx: 8650,
      fallbackWidthPx: 420,
      xOffsetPctOfWidth: -42.86,
      topOffsetPx: 0,
      bottomOffsetPx: 0,
    },
    woodpecker: { xPx: 12, experienceSectionOffsetYPx: 95, fallbackYPx: 170, minYPx: 64 },
  },
  wide: {
    footer: {
      aspectRatio: "4377 / 1039",
      sceneWidthPct: 100,
      signs: {
        widthPct: 8,
        leftPctBySign: [8, 20, 32],
        bottomPctBySign: [4, 6, 4],
      },
      raccoon: { leftPct: 157, bottomPct: 15, widthPct: 19.5 },
      bees: [
        { src: "/animals/bee1.png", leftPct: 28, topPct: 60, widthPct: 0.9, className: "bee-anim-1" },
        { src: "/animals/bee2.png", leftPct: 35, topPct: 38, widthPct: 0.9, className: "bee-anim-2" },
        { src: "/animals/bee3.png", leftPct: 40, topPct: 53, widthPct: 0.9, className: "bee-anim-3" },
      ],
      grass: {
        src: "/fauna/fauna_grass_all.png",
        widthPct: 1000,
        leftPct:  0,
        heightPct: 58,
        bottomOffsetPct: 0,
      },
      billboard: {
        widthPct: 34,
        leftPct: 50,
        bottomPct: 8,
        drawings: { topPct: 4, leftPct: 20, rightPct: 20 },
      },
    },
    leftTree: {
      nativeWidthPx: 940,
      nativeHeightPx: 8650,
      fallbackWidthPx: 420,
      xOffsetPctOfWidth: -42.86,
      topOffsetPx: 0,
      bottomOffsetPx: 0,
    },
    woodpecker: { xPx: 12, experienceSectionOffsetYPx: 95, fallbackYPx: 170, minYPx: 64 },
  },
};

export function getResponsiveBreakpoint(widthPx: number): ResponsiveBreakpoint {
  if (widthPx >= RESPONSIVE_BREAKPOINT_MIN_WIDTH.wide) return "wide";
  if (widthPx >= RESPONSIVE_BREAKPOINT_MIN_WIDTH.desktop) return "desktop";
  if (widthPx >= RESPONSIVE_BREAKPOINT_MIN_WIDTH.tablet) return "tablet";
  return "mobile";
}
