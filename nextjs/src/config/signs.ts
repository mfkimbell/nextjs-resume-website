// Dimensions for the doodle-wall papers and their drawing canvas.
// Tune these values to reshape the drawing area and the paper frames.

export const A4_PAPER_WIDTH = 210;
export const A4_PAPER_HEIGHT = 297;
export const A4_PAPER_ASPECT_RATIO = A4_PAPER_WIDTH / A4_PAPER_HEIGHT;

export const SIGN_CONFIG = {
  // === Drawing canvas (where users draw in CanvasBoard) ===
  // A4 portrait ratio: 210 × 297 mm, i.e. width / height ≈ 0.707.
  canvasWidth: A4_PAPER_WIDTH * 2,
  canvasHeight: A4_PAPER_HEIGHT * 2,

  // === Paper note display (each of the 3 gallery drawings) ===
  // Max rendered width of a single paper note (in px). Height follows paper aspect.
  signMaxWidthPx: 220,

  // Paper note aspect ratio. These are no longer wooden sign-post PNGs.
  signImageWidth: A4_PAPER_WIDTH,
  signImageHeight: A4_PAPER_HEIGHT,

  // Inset of the drawing area, as % of the paper note.
  drawingInsetTopPct: 9,
  drawingInsetRightPct: 8,
  drawingInsetBottomPct: 24,
  drawingInsetLeftPct: 8,

  // Vote boxes, all as % of the paper note.
  upvoteInsetTopPct: 83,
  upvoteInsetRightPct: 54,
  upvoteInsetBottomPct: 5,
  upvoteInsetLeftPct: 14,

  downvoteInsetTopPct: 83,
  downvoteInsetRightPct: 14,
  downvoteInsetBottomPct: 5,
  downvoteInsetLeftPct: 54,

  // Per-note vertical nudge for the vote boxes. Negative = higher, positive = lower.
  voteBoxYOffsetPctBySign: [0, 0, 0],
} as const;

export const SIGN_CANVAS_ASPECT_RATIO =
  SIGN_CONFIG.canvasWidth / SIGN_CONFIG.canvasHeight;

export const CONTACT_BOARD_UI_INSET = {
  topPct: 13,
  rightPct: 17.2,
  bottomPct: 27.2,
  leftPct: 17.2,
} as const;

export const BULLETIN_BOARD_CONFIG = {
  frame: {
    topPct: 13,
    rightPct: 17.2,
    bottomPct: 27.2,
    leftPct: 17.2,
  },
  papers: {
    fetchLimit: 32,
    maxSheets: 18,
    minScale: 0.25,
    maxScale: 0.48,
    layerZ: -0.5,
    layerZStep: 0.003,
    modelHeightRatio: 1.3,
    // Paper placement bounds as % of the full bulletin image. These are inset
    // to the white/cork area, so a whole paper stays off the wooden frame/shelf.
    bounds: {
      topPct: 13,
      rightPct: 15,
      bottomPct: 48,
      leftPct: 9,
    },
    // Extra bounded vertical variation while picking a no-overlap candidate.
    // Percent of the white placement area's height.
    heightJitterPct: 7,
    // Maximum allowed overlap per axis as % of a paper. 4 = just a tiny edge
    // overlap; the placer will avoid overlap entirely whenever it has room.
    maxOverlapPct: 4,
    maxTiltRad: 0.26,
  },
  objects: {
    propScaleMax: 0.72,
    propScaleWidthFactor: 0.43,
    shelfSpanFactor: 1.3,
    // World-space shelf baseline measured up from the bottom of the 3D viewport.
    // Increase this to move every shelf object up; decrease it to move them down.
    shelfYFromViewportBottom: 1.11,
    layerZ: 0.22,
    frontLayerZ: 0.38,
    /**
     * Hover feedback. The object rises and pitches forward just a touch.
     *
     *   hoverRiseY      upward travel, in board units. The main lift effect.
     *   hoverLiftZ      travel toward the camera. At 0 this is off. Raising it
     *                   reads as the object growing rather than lifting.
     *   hoverTiltX      pitch toward the viewer on hover. Negative = forward.
     *   hoverStraighten what happens to the object's resting z-tilt on hover:
     *                   1 keeps it exactly as it rests, 0 snaps it upright.
     */
    hoverRiseY: 0.08,
    hoverLiftZ: 0,
    hoverTiltX: -0.08,
    hoverStraighten: 1,
    /**
     * ------------------------------------------------------------------
     * SHADOWS - everything here is live-tunable, nothing is hardcoded.
     * ------------------------------------------------------------------
     * The board art is a PNG behind a transparent canvas, so there is no 3D
     * shelf to catch anything. Two invisible ShadowMaterial planes stand in for
     * it: ShadowMaterial draws nothing except the shadow falling on it, so it
     * composites straight over your artwork.
     */
    shadows: {
      /** Master switch. false = no casting, no catchers, no shadow map cost. */
      enabled: true,

      /**
       * A SHADOW-ONLY light, separate from the key light, at intensity 0. It
       * adds no illumination, so moving it never changes how the models are lit
       * - it only moves the shadows.
       *
       * LENGTH is set by elevation: bigger `y` relative to x/z = shorter, more
       * tucked-in shadow. At y 4.2 against a 1.84 horizontal offset this is
       * ~66 degrees, giving a shadow about 0.44x the prop's height. Drop y to
       * ~2.0 and they stretch to roughly 1x.
       * DIRECTION is set by the sign of x and z: +x throws shadows to the left,
       * +z throws them backward onto the board.
       */
light: { x: 0.2, y: 1.8, z: 3 },

      /** How dark. This is the "boldness" dial. */
      shelfOpacity: 0.16,
      boardOpacity: 0.07,

      /**
       * Flat catcher lying on the shelf line - the contact shadow that grounds
       * each prop. `widthFactor` multiplies halfW; `depth` is how far it reaches
       * front-to-back; `yLift` floats it just above the shelf so it does not
       * z-fight; `zOffset` is relative to objects.layerZ.
       */
      shelfWidthFactor: 2.4,
      shelfDepth: 1.7,
      shelfYLift: 0.07,
      shelfZOffset: -0.25,

      /** Upright catcher on the board face - the softer cast behind the props. */
      boardWidthFactor: 2.4,
      boardHeight: 2.6,
      boardYOffset: 1.55,
      boardZ: 0.02,

      /**
       * Shadow map quality. `mapSize` is resolution (512 blocky / 2048 crisp).
       * If curved props get dark speckles on themselves, that is acne - raise
       * `normalBias` first, then `bias` (more negative).
       */
      mapSize: 2048,
      bias: -0.0009,
      normalBias: 0.022,

      /**
       * Ortho shadow-camera half-extent in world units. Must cover everything
       * that casts, or shadows clip abruptly at the edge; too large and the map
       * resolution is wasted, making edges chunky.
       */
      cameraExtent: 4,
      cameraNear: 0.5,
      cameraFar: 18,
    },
    envelope: {
      scale: 0.62,
      halfH: 0.33,
      tilt: { x: -.5, y: 0.1, z: 0.04 },
      offset: { x: 0.25, y: 0.04, z: 0 },
      // size is [width, depth] of the soft contact shadow. offset shifts it
      // relative to the prop's feet: +x = right, +y = back (into the board).
      shadow: { size: [1.0, 0.66], offset: { x: 0, y: 0 } },
      bob: 0.02,
    },
    palette: {
      scale: 0.7,
      halfH: 0.5,
      tilt: { x: -0.6, y: 0, z: -0.27 },
      offset: { x: 0.22, y: 0, z: 0.02 },
      shadow: { size: [1.05, 0.92], offset: { x: 0, y: 0 } },
      bob: undefined,
    },
    mug: {
      scale: 0.42,
      halfH: 0.5,
      tilt: { x: 0.05, y: 0, z: 0 },
      offset: { x: -.2, y: 0.05, z: 0 },
      shadow: { size: [1.0, 0.8], offset: { x: 0, y: 0 } },
      bob: undefined,
    },
    // The Octocat figure. It is sculpted standing on its own tentacles with its
    // feet already at y = 0 in the GLB, so halfH stays 0 and it rests directly on
    // the shelf line. tilt.y must stay near 0 - the model faces -Z, and the old
    // value of 3 rad was there to spin the flat keychain round, which would now
    // just show you its back. No chain or ring nodes exist any more, so there is
    // nothing left to hide.
    keychain: {
      scale: 0.48,
      halfH: 0,
      tilt: { x: 0.08, y: 0, z: 0 },
      offset: { x: -.12, y: 0.07, z: 0 },
      shadow: { size: [0, 0], offset: { x: 0, y: 0 } },
      hiddenNodePrefixes: [],
      recenterVisible: true,
    },
  },
  smoke: {
    opacity: 0.52,
    fallback: { width: 1.5, height: 1, lift: 0, x: 0, z: 0, spin: -0.6 },
    plumes: [
      { width: 1.44, height: 1.0, lift: 0, x: 0, z: 0, spin: -0.54 },
      { width: 1.58, height: 1.0, lift: 0, x: 0, z: 0, spin: -0.75 },
      { width: 1.58, height: 1.0, lift: 0, x: 0, z: 0, spin: -0.96 },
    ],
  },
} as const;
