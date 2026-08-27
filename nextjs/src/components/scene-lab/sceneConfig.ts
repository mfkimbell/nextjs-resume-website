import savedCampfire from "@/config/campfireScene.json";

export interface CampfireSceneConfig {
  cameraX: number;
  cameraY: number;
  cameraZ: number;
  targetX: number;
  targetY: number;
  targetZ: number;
  fov: number;
  fogNear: number;
  fogFar: number;
  ambientIntensity: number;
  moonIntensity: number;
  fireIntensity: number;
  fireDecay: number;
  flickerAmount: number;
  glowOpacity: number;
  glowY: number;
  glowScale: number;
  sparkOpacity: number;
  sparkCount: number;
  sparkSpread: number;
  sparkMaxHeight: number;
  sparkSpeed: number;
  sparkSway: number;
  sparkBurstChance: number;
  sparkSize: number;
  sparkLifetime: number;
  fireLightX: number;
  fireLightY: number;
  fireLightZ: number;
  fireLightReach: number;
  farGlowIntensity: number;
  farGlowReach: number;
  farGlowDecay: number;
  warmLightX: number;
  warmLightY: number;
  warmLightZ: number;
  warmLightReach: number;
  warmLightAngle: number;
  sceneScale: number;
  sceneX: number;
  sceneY: number;
  sceneZ: number;
  sceneRotationY: number;
  flameX: number;
  flameY: number;
  flameZ: number;
  flameScale: number;
  benchRadius: number;
  benchScale: number;
  benchAngleOffset: number;
  treeScale: number;
  treeY: number;
  treeSpread: number;
  treeCloseRadius: number;
  animalScale: number;
  animalY: number;
  animalX: number;
  animalZ: number;
  animalSpread: number;
  bonfireX: number;
  bonfireY: number;
  bonfireZ: number;
  bonfireRotationY: number;
  bonfireScale: number;
  tentX: number;
  tentY: number;
  tentZ: number;
  tentRotationY: number;
  tentScale: number;
  campItemsScale: number;
  campItemsSpread: number;
  campItemsY: number;
  /* --- flopping fish -----------------------------------------------------
   * A fish laid on its side near the fire, cycling between frantic flopping
   * bursts and moments of stillness. Position, rotation, scale, and the
   * timeScale used during flop bursts are all here so the lab can dial them. */
  fishX: number;
  fishY: number;
  fishZ: number;
  fishRotationX: number;
  fishRotationY: number;
  fishRotationZ: number;
  fishScale: number;
  /** action.timeScale during the flop phase; 0 during rest */
  fishFlopSpeed: number;
  /** glasses: up/down the face, in bear model units */
  glassesHeight: number;
  /** glasses: how far down the muzzle they ride, along the face-forward axis.
   *  Separate from height because the muzzle sticks out and the two are independent. */
  glassesNoseRide: number;
  glassesScale: number;
  /** glasses: pitch, radians. Tips the lenses up or down against the face. */
  glassesTilt: number;

  /* --- locations ------------------------------------------------------------
   * The campsite is three places standing on a ring with an empty middle, and
   * the camera pivots in that middle turning to face one at a time. Location 0
   * is the campfire and is where the fly-in lands; 1 is the arcade, 2 is the
   * writing desk. A step is 360/3 degrees, so three steps come back round. */

  /** how far each location stands from the middle */
  locationRadius: number;
  /** spins the whole ring. The default puts the campfire due north. */
  locationAngleOffset: number;
  /** extra yaw on each location's contents, for turning a scene to face better */
  locationSpin: number;
  /** how far back toward the middle the camera sits from the location it faces */
  locationCameraBack: number;
  locationCameraHeight: number;
  /** height of the point the camera aims at, at the location's centre */
  locationTargetHeight: number;
  /** seconds to settle when stepping between locations */
  locationTurnSpeed: number;

  /* --- title screen fly-in start pose -----------------------------------------
   * How far pulled back the camera sits while the "Meet the Soft-bear Engineers"
   * title is on screen. The intro flight starts from this pose and lands on the
   * campfire, so raising the distance lets the visitor see more of the scene
   * behind the title before it swoops in. */
  /** multiplier of the final campfire distance the title camera sits at */
  titleCameraDistance: number;
  /** extra height (world units) added to that pulled-back pose */
  titleCameraHeight: number;
  /** Seconds the intro camera swoop takes. Higher = slower, more cinematic. */
  titleFlyDuration: number;
  /** Extra FOV in degrees at the very start of the flight, eased away as it
   *  lands. Gives the move a sense of speed. */
  titleFlyFovBoost: number;
  /** Multiplier that pulls the fog IN at the start of the flight — 1 = no
   *  haze, 0 = totally fogged out. Eases back to 1 as it lands. */
  titleFlyFogSquash: number;
  /**
   * ADDITIVE distance (world units) added to the title camera's pull-back
   * pose, along the away-from-campfire direction. Unlike titleCameraDistance
   * (which is a multiplier of the location's own camera distance), this is
   * an absolute nudge — crank it to push the title further from the
   * campfire in world units.
   */
  titleFlyExtraDistance: number;
  /**
   * The ONE camera angle knob. Pitch in degrees above horizontal — held
   * fixed for the entire flight so there is NO tilt during the move.
   *   -20 = looking slightly down toward the campsite
   *     0 = looking dead level toward it
   *   +30 = looking up at the sky
   * Straight-line position + fixed pitch = smooth arrival, no wobble.
   */
  titleFlyCameraPitch: number;

  /* --- title fade timing ---
   * On mount: hold on a pure-black screen for titleBlackHoldDuration seconds,
   * then fade the letters up over titleFadeInDuration. The letters are
   * clickable from mount — clicking triggers the exit (slide up + fade out
   * over titleFadeOutDuration). */
  /** Seconds of pure black at start, before the letters begin fading in. */
  titleBlackHoldDuration: number;
  titleFadeInDuration: number;
  /** DEPRECATED: previously the wait beat before the hint became clickable.
   *  Letters are now clickable from mount so this is unused; kept for config
   *  compatibility. */
  titleHoldDuration: number;
  /**
   * Seconds the letters take to slide up and off the top of the viewport
   * once clicked. Faster = punchier hand-off to the flight; slower = more
   * cinematic drift. This ONLY drives the slide animation — the overlay
   * unmount timing is titleExitUnmountDelay, below.
   */
  titleExitSlideDuration: number;
  /**
   * Extra seconds to hold the overlay mounted after the slide finishes
   * before tearing down the Canvas + letter GLBs. Bump this up if the
   * slide feels cut short; lower it (or zero it) if you want the browser
   * to reclaim the title's render cost the instant the letters are off
   * screen. Total time-to-unmount = titleExitSlideDuration + this.
   */
  titleExitUnmountDelay: number;
  /**
   * Distance in world units the letters travel UP during the exit slide.
   * Raise it if the letters still clip the top of the viewport at the
   * default; lower it if they leave too soon. Reads like a whoosh-past
   * strength.
   */
  titleExitSlideDistance: number;
  /**
   * Signed Z travel during the exit slide, in world units.
   *   > 0 = letters rush FORWARD toward the viewer (zoom past camera)
   *   < 0 = letters recede BACK away from the viewer (shrink into scene)
   *   0   = purely vertical slide, no depth motion (original behaviour)
   * Combined with the upward slide to give the exit real parallax against
   * the flight swooping in behind it.
   */
  titleExitZDistance: number;
  /** Multiplier on the letters' idle bob/sway amplitude. 1.0 is baseline
   *  gentle motion; 2-3 reads clearly as "playful"; above 4 becomes goofy. */
  titleLetterIdleAmount: number;
  /**
   * Phase offset per letter, in radians. Controls how "wave-like" the row
   * of letters reads:
   *   0    = every letter bobs in lockstep (a single unit moving)
   *   ~0.3 = subtle wave rippling down the row (default)
   *   ~0.8 = pronounced sine wave; adjacent letters clearly out of phase
   *   >π   = chaotic (adjacent letters nearly opposite)
   */
  titleLetterWaviness: number;

  /**
   * Framing for each location, one entry per location.
   *
   * Held in the location's OWN frame, not world space, so a shot stays put when the
   * ring is resized or spun - local +Z points back at the middle, so a camera at
   * (0, 1.6, 6) is 6 units toward the centre and 1.6 up, whatever the ring is doing.
   * The locationCamera* values above are only the baseline these are seeded from.
   */
  locationViews: LocationView[];

  /* --- sounds -------------------------------------------------------------
   * Ambient loops (fire crackling, banjo) and one-shots (swoosh between
   * panels, hover chime, click) share one master multiplier, so a single
   * knob quiets the whole scene. Per-track values still let you rebalance. */
  masterVolume: number;
  fireCracklingVolume: number;
  banjoVolume: number;
  /* --- banjo prop (held by the back-left log bear) -------------------------
   * Offsets in the "Food" socket frame, applied on top of the prop's baseline
   * position/rotation/scale. Lets us nudge the banjo in the paws at runtime
   * without touching the ANIMALS array. */
  banjoPropX: number;
  banjoPropY: number;
  banjoPropZ: number;
  banjoPropRotX: number;
  banjoPropRotY: number;
  banjoPropRotZ: number;
  banjoPropScale: number;
  swooshVolume: number;
  hoverVolume: number;
  clickVolume: number;

  objectOverrides: Record<string, ObjectOverride>;
}

/** One location's camera, in that location's own frame. */
export interface LocationView {
  cx: number;
  cy: number;
  cz: number;
  tx: number;
  ty: number;
  tz: number;
}

export const LOCATION_VIEW_FIELDS = ["cx", "cy", "cz", "tx", "ty", "tz"] as const;

/**
 * The built-in shot for a location: its own default if it has one, otherwise the
 * shared ring baseline. Per-index, so "Reset this one" gives a location the framing
 * that was actually authored for it rather than a generic distance.
 */
export function defaultLocationView(
  index: number,
  config: {
    locationCameraBack: number;
    locationCameraHeight: number;
    locationTargetHeight: number;
  }
): LocationView {
  const authored = BASE_CAMPFIRE_CONFIG.locationViews[index];
  if (authored) return { ...authored };
  return {
    cx: 0,
    cy: config.locationCameraHeight,
    cz: config.locationCameraBack,
    tx: 0,
    ty: config.locationTargetHeight,
    tz: 0,
  };
}

export interface ObjectOverride {
  dx: number;
  dy: number;
  dz: number;
  /** pitch, radians. Tips an object forward/back - use it to sit things flat on uneven ground. */
  rotX: number;
  rotY: number;
  /** roll, radians. Leans an object left/right. */
  rotZ: number;
  scale: number;
  hide: number;
}

export const EMPTY_OVERRIDE: ObjectOverride = {
  dx: 0,
  dy: 0,
  dz: 0,
  rotX: 0,
  rotY: 0,
  rotZ: 0,
  scale: 1,
  hide: 0,
};

export interface OceanFloorSceneConfig {
  cameraX: number;
  cameraY: number;
  cameraZ: number;
  targetX: number;
  targetY: number;
  targetZ: number;
  fov: number;
  fogNear: number;
  fogFar: number;
  ambientIntensity: number;
  beamIntensity: number;
  beamOpacity: number;
  particleOpacity: number;
  causticsOpacity: number;
  mainLightX: number;
  mainLightY: number;
  mainLightZ: number;
  mainLightReach: number;
  mainLightAngle: number;
  sideLightX: number;
  sideLightY: number;
  sideLightZ: number;
  sideLightReach: number;
  sideLightAngle: number;
  beamTargetX: number;
  beamTargetY: number;
  beamTargetZ: number;
  beamWidth: number;
  beamLength: number;
}

/**
 * The built-in defaults, written by hand. This is the floor the scene falls back to
 * and what "Reset sliders" returns you to - it is never overwritten by tuning.
 */
export const BASE_CAMPFIRE_CONFIG: CampfireSceneConfig = {
  // Free-look camera for the lab. Now that the middle is empty, this opens on the
  // campfire - location 0, out at -Z - with the same framing the panelled site
  // gives it, rather than staring at the hole in the centre.
  cameraX: 0,
  cameraY: 1.6,
  cameraZ: -3,
  targetX: 0,
  targetY: 0.9,
  targetZ: -9,
  fov: 50,
  fogNear: 8,
  fogFar: 40,
  ambientIntensity: 0.085,
  moonIntensity: 0.35,
  fireIntensity: 3.1,
  fireDecay: 2,
  flickerAmount: 1,
  glowOpacity: 0.24,
  glowY: 0.035,
  glowScale: 1,
  sparkOpacity: 0.75,
  sparkCount: 160,
  sparkSpread: 0.5,
  sparkMaxHeight: 2,
  sparkSpeed: 1.5,
  sparkSway: 0.35,
  sparkBurstChance: 0.12,
  sparkSize: 0.045,
  sparkLifetime: 1.6,
  fireLightX: 0,
  fireLightY: 0.35,
  fireLightZ: 0,
  fireLightReach: 8,
  farGlowIntensity: 1.2,
  farGlowReach: 22,
  farGlowDecay: 1.2,
  warmLightX: 1.6,
  warmLightY: 2.7,
  warmLightZ: 2.1,
  warmLightReach: 7.5,
  warmLightAngle: 0.9,
  sceneScale: 1,
  sceneX: 0,
  sceneY: 0,
  sceneZ: 0,
  sceneRotationY: 0,
  flameX: 0,
  flameY: 0.2,
  flameZ: 0,
  flameScale: 1,
  benchRadius: 2.4,
  benchScale: 1,
  benchAngleOffset: Math.PI / 2,
  treeScale: 1,
  treeY: 0,
  treeSpread: 1,
  treeCloseRadius: 4.2,
  animalScale: 1,
  animalY: 0,
  animalX: 0,
  animalZ: 0,
  animalSpread: 1,
  bonfireX: 0,
  bonfireY: 0,
  bonfireZ: 0,
  bonfireRotationY: 0,
  bonfireScale: 1,
  tentX: 0,
  tentY: 0,
  tentZ: 0,
  tentRotationY: 0,
  tentScale: 1,
  campItemsScale: 1,
  campItemsSpread: 1,
  campItemsY: 0,
  fishX: 1.2,
  fishY: 0.02,
  fishZ: 1.4,
  fishRotationX: 0,
  // Rotate around the model's forward axis to tip it onto its side.
  fishRotationY: 0,
  fishRotationZ: Math.PI / 2,
  fishScale: 0.09,
  fishFlopSpeed: 5.5,
  glassesHeight: 0,
  glassesNoseRide: 0,
  glassesScale: 1,
  glassesTilt: 0,

  // 9 keeps the three clusters clear of each other: the campfire alone spans
  // about 5 units once the camper and tent are counted.
  locationRadius: 9,
  // PI puts location 0 on -Z, which is the top of a top-down view - the campfire
  // sits north, the arcade south-west, the desk south-east.
  locationAngleOffset: Math.PI,
  locationSpin: 0,
  // 6 back from a location centre leaves the camera at radius 3, out in the
  // empty middle, and still outside the 2.4 bench ring at the campfire.
  locationCameraBack: 6,
  locationCameraHeight: 1.6,
  locationTargetHeight: 0.9,
  locationTurnSpeed: 0.45,

  // Pulled 3.4x back and 15 units up puts the camera high enough to read the
  // whole camp as a diorama behind the title without the campfire disappearing.
  titleCameraDistance: 3.4,
  titleCameraHeight: 15,
  titleFlyDuration: 3.8,
  titleFlyFovBoost: 18,
  titleFlyFogSquash: 0.4,
  titleFlyExtraDistance: 0,
  // Slightly down-tilted — camera flies in straight, framing the campsite.
  titleFlyCameraPitch: -15,

  // Sit in pure black for 1s before the letters start fading in, then take
  // 2.8s to fade them fully up. Letters are clickable from mount — clicking
  // slides the title up and fades over titleFadeOutDuration.
  titleBlackHoldDuration: 1.0,
  titleFadeInDuration: 2.8,
  titleHoldDuration: 0,
  titleExitSlideDuration: 0.9,
  titleExitUnmountDelay: 0.05,
  titleExitSlideDistance: 14,
  titleExitZDistance: 0,
  titleLetterIdleAmount: 2.2,
  titleLetterWaviness: 0.32,

  /**
   * A standing shot of each location, not a map of it - eye heights of 1.4-1.7 put the
   * camera on the ground among the bears rather than looking down on them.
   *
   * cz is how far back toward the middle the camera stands, so it has to stay under
   * locationRadius or the camera crosses the centre and looks at the scene backwards.
   * The campfire gets the most room because its cluster is the widest, once the camper
   * and tent are counted; the desk is a single bear at a table and needs the least.
   */
  locationViews: [
    { cx: 0, cy: 1.7, cz: 7.0, tx: 0, ty: 0.9, tz: 0 }, // campfire
    { cx: 0, cy: 1.5, cz: 5.5, tx: 0, ty: 0.8, tz: 0 }, // arcade
    { cx: 0, cy: 1.4, cz: 4.5, tx: 0, ty: 0.7, tz: 0 }, // desk
  ],

  masterVolume: 0.7,
  fireCracklingVolume: 0.55,
  banjoVolume: 0.32,
  banjoPropX: 0,
  banjoPropY: 0,
  banjoPropZ: 0,
  banjoPropRotX: 0,
  banjoPropRotY: 0,
  banjoPropRotZ: 0,
  banjoPropScale: 1,
  swooshVolume: 0.6,
  hoverVolume: 0.35,
  clickVolume: 0.6,

  objectOverrides: {},
};

/**
 * What the scene actually starts from: the built-in defaults with whatever has been
 * saved into src/config/campfireScene.json layered on top.
 *
 * That file is committed and bundled at build time, so it is the tuning that actually
 * ships. localStorage still wins over it inside the lab - that is the working draft -
 * but a visitor, or a fresh browser, gets exactly what is in the file.
 */
export const DEFAULT_CAMPFIRE_CONFIG: CampfireSceneConfig = {
  ...BASE_CAMPFIRE_CONFIG,
  ...(savedCampfire as Partial<CampfireSceneConfig>),
};

export const DEFAULT_OCEAN_CONFIG: OceanFloorSceneConfig = {
  cameraX: 0,
  cameraY: 0.78,
  cameraZ: 2.75,
  targetX: 0,
  targetY: 0.18,
  targetZ: 1.55,
  fov: 56,
  fogNear: 2.4,
  fogFar: 10.5,
  ambientIntensity: 0.04,
  beamIntensity: 1,
  beamOpacity: 1,
  particleOpacity: 0.46,
  causticsOpacity: 1,
  mainLightX: 0.45,
  mainLightY: 3.35,
  mainLightZ: 3.15,
  mainLightReach: 6.8,
  mainLightAngle: 0.5,
  sideLightX: -2.15,
  sideLightY: 3.05,
  sideLightZ: 3,
  sideLightReach: 6.2,
  sideLightAngle: 0.42,
  beamTargetX: 0.05,
  beamTargetY: 0.06,
  beamTargetZ: 1.7,
  beamWidth: 1,
  beamLength: 1,
};
