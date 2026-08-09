// Dimensions for the doodle-wall signs and their drawing canvas.
// Tune these values to reshape the drawing area and the sign frames.

export const SIGN_CONFIG = {
  // === Drawing canvas (where users draw in CanvasBoard) ===
  // The canvas renders at this aspect ratio. Width is the max on screen;
  // height is derived from the ratio so mobile/desktop stay consistent.
  canvasWidth: 480,
  canvasHeight: 270, // 16:9 relative to canvasWidth

  // === Paper note display (each of the 3 gallery drawings) ===
  // Max rendered width of a single paper note (in px). Height follows paper aspect.
  signMaxWidthPx: 220,

  // Paper note aspect ratio. These are no longer wooden sign-post PNGs.
  signImageWidth: 4,
  signImageHeight: 5,

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
