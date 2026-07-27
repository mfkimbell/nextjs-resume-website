// src/config/animals.ts
// ─────────────────────────────────────────────────────────────────────────────
// SPARROW KNOBS
//
// Tuneable values for the two branch sparrows. Edit a number, save, hot-reload.
// Angles are in RADIANS.  ~0.1 ≈ 6°   0.5 ≈ 29°   1.0 ≈ 57°   1.57 ≈ 90°
//
// The TOUCAN is deliberately NOT here — it has its own settings, in degrees,
// in src/config/toucan.ts.
// ─────────────────────────────────────────────────────────────────────────────

/* ═══════════════════════════════════════════════════════════════════════════
   LEFT BIRD  (sparrow, on the left branch)
   ═══════════════════════════════════════════════════════════════════════════ */
export const LEFT_BIRD = {
  /* ── base (starting) head orientation ── */
  BASE_PITCH: 0.3, // + looks up,  − looks down
  BASE_YAW: -0.8, // + looks right, − looks left
  BASE_ROLL: 0.0, // + tilt right ear down, − left ear down

  /* ── maximum rotation delta driven by pointer ── */
  MAX_PITCH_DELTA: 1.2,
  MAX_YAW_DELTA: 0.8,
  MAX_ROLL_DELTA: 0.2,

  /* ── responsiveness ── */
  DEAD_ZONE: 0.05, // fraction of half-width before head starts turning
  SENSITIVITY: 2.0, // scales pointer→rotation
  INVERT_X: 1, // 1 = normal, −1 flips horizontal mapping
  INVERT_Y: -1, // 1 = normal, −1 flips vertical mapping
  CENTER_OFFSET_X: 0.8, // fraction of half-width to shift pointer origin right
  CENTER_OFFSET_Y: 0.25, // fraction of half-height to shift origin (+ = down)
  SMOOTHING: 0.1, // interpolation factor for smooth motion
};

/* ═══════════════════════════════════════════════════════════════════════════
   RIGHT BIRD  (sparrow, on the right branch)
   ═══════════════════════════════════════════════════════════════════════════ */
export const RIGHT_BIRD = {
  BASE_PITCH: 0.3, // slight "curious" tilt
  BASE_YAW: -1, // faces left on load

  /* ── absolute limits for yaw (left/right) ── */
  YAW_LIMIT_LEFT: -1.5, // leftmost (more negative = further left)
  YAW_LIMIT_RIGHT: 0.8, // rightmost

  /* ── absolute limits for pitch (up/down) ── */
  PITCH_LIMIT_UP: 1.2,
  PITCH_LIMIT_DOWN: -0.2,

  MAX_ROLL: -0, // subtle roll
  YAW_OFFSET: 0, // adjust centre point of yaw
  PITCH_OFFSET: -0.1, // adjust centre point of pitch
  PITCH_SENSITIVITY: 3.2, // multiplier for up-down reactivity
  MOUSE_X_OFFSET: 0.3, // shift mouse X to align gaze (+ = right, − = left)
  DECAY: 0.12, // smoothing factor
};
