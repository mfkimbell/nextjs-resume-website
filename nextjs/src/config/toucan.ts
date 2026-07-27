// src/config/toucan.ts
// ─────────────────────────────────────────────────────────────────────────────
// TOUCAN SETTINGS
//
// Everything that controls how the toucan is shown and how it moves.
// Edit a number, save, hot-reload. Angles are in DEGREES here (converted to
// radians internally) because degrees are easier to reason about.
//
// THE IMPORTANT ONE IS `FACING`.
// A toucan's beak is long and only reads side-on. Pointed straight at the
// camera it's completely foreshortened, and opening the jaw looks like an
// orange bib flopping onto its chest. FACING turns the bird so the beak runs
// across the frame. 0 = staring down the lens (bad), 90 = full profile.
// ─────────────────────────────────────────────────────────────────────────────

export const toucanConfig = {
  /* ── how the bird is presented ────────────────────────────────────────── */
  FACING: 55, // degrees turned away from the camera. 40–70 all read well.
  SCALE: 3.6, // overall size
  POSITION: [-4, -0.535, 0] as [number, number, number], // x, y (up), z
  // Camera distance. Smaller = closer / bigger bird. Measured so the beak
  // clears the top of the frame with headroom.
  CAMERA_Z: 4.7,

  /* ── head tracking ────────────────────────────────────────────────────── */
  // The head turns on top of FACING; it does not replace it.
  LOOK: {
    ENABLED: true,
    YAW_RANGE: 26, // degrees of left/right the neck may turn
    PITCH_RANGE: 14, // degrees of up/down
    REST_YAW: 0, // resting offset; 0 = looks straight along FACING
    REST_PITCH: 0,
    // Mouse travel (px) needed to reach the limits above. Bigger = the head
    // eases toward the cursor across the page instead of snapping to the stop.
    TRAVEL_X: 700,
    TRAVEL_Y: 520,
    HEAD_HEIGHT_FRAC: 0.34, // where the head sits in the canvas, 0=top 1=bottom
    EASING: 0.1, // 0.05 = slow and floaty, 0.3 = snappy
    FLIP_X: false, // true if it turns away from the cursor
    FLIP_Y: false, // true if it looks down when the cursor is up
  },

  /* ── the branch it perches on ─────────────────────────────────────────── */
  // Positioned so the top of the bough sits directly under the toucan's feet.
  // If you change the toucan's SCALE or POSITION, nudge BRANCH.POSITION[1] to
  // re-seat the feet on the bark.
  BRANCH: {
    SHOW: true,
    SCALE: 0.75, // the bough runs off both edges of the frame
    POSITION: [-3.55, -0.516, -0.3] as [number, number, number],
    YAW: 1, // degrees, so it runs diagonally across the frame
  },

  /* ── beak ─────────────────────────────────────────────────────────────── */
  BEAK: {
    ENABLED: true, // false = beak stays shut (useful when debugging pose)
    SPEED: 1.0, // 1 = as authored, 1.5 = chattier, 0.6 = slower
  },
} as const;

export type ToucanConfig = typeof toucanConfig;
