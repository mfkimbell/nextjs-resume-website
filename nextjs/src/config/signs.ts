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
