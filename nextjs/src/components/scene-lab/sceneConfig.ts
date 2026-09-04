import savedCampfire from "@/config/campfireScene.json";
import savedCameraDefaults from "@/config/cameraDefaults.json";

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
  /** Kenney campfire laptop screen glow. Screen material's emissive is tinted
   *  by (R,G,B) and scaled by `laptopScreenBrightness`; the pointLight spilling
   *  out of the deck uses the same color at a proportional intensity. */
  laptopScreenColorR: number;
  laptopScreenColorG: number;
  laptopScreenColorB: number;
  laptopScreenBrightness: number;
  /** Multiplier on the night-sky background color. 1.0 = the baked #03040a
   *  near-black; crank to lift the whole horizon toward a pre-dawn navy. Also
   *  drives the fog color so silhouettes keep blending. */
  skyBrightness: number;
  /** drei <Stars> `factor` — per-star size, which reads as brightness. Bigger
   *  = brighter dots against the sky. */
  starBrightness: number;
  /** drei <Stars> `count` — how many stars are sprinkled overhead. */
  starCount: number;

  /* --- shadows -----------------------------------------------------------
   * One WebGL shadow map per casting light. Costs stack per light: point
   * lights render six cubemap faces each frame, directional lights only one.
   * The master enable flips `gl.shadowMap.enabled` at runtime so the user
   * can turn the whole feature off on slow hardware. Everything else here
   * lives on the moon directional or the fire point light and is applied
   * imperatively through refs so sliders retune shadows live. */
  /** Master enable. 0 = shadowMap.enabled=false (no shadow renders at all). */
  shadowsEnabled: number;
  /** Direction of the moon light. This is the sun/moon that casts long soft
   *  shadows across the whole campsite; place it so it flatters the diorama. */
  moonX: number;
  moonY: number;
  moonZ: number;
  /** Whether the moon directional light casts shadows. Cheap - one depth
   *  pass per frame - so leave on unless perf is bad. */
  moonCastShadow: number;
  /** Shadow map resolution as a raw pixel count on one edge (square). Higher
   *  = sharper but quadratic memory + cost. Common values: 512/1024/2048/4096. */
  moonShadowMapSize: number;
  /** Constant depth offset to eat shadow acne. Typically small negative,
   *  e.g. -0.0005. Too negative causes peter-panning (shadows detach). */
  moonShadowBias: number;
  /** Bias along the surface normal - a nicer fix than shadowBias because it
   *  doesn't cause peter-panning as easily. Typical 0.02-0.05. */
  moonShadowNormalBias: number;
  /** PCF blur radius in texels. 0 = crisp, ~4 = classic soft shadow. Only
   *  affects PCFSoftShadowMap (the r3f `shadows` default). */
  moonShadowRadius: number;
  /** How dark the moon's shadow gets. three.js LightShadow.intensity, 0..1:
   *  1 = fully black, 0 = shadow invisible. Global to this light. */
  moonShadowIntensity: number;
  /** Half-width of the orthographic shadow camera frustum in world units.
   *  Frustum spans [-frustum..+frustum] on both axes. Tight = better shadow
   *  resolution over the scene; too tight = shadows clip. Campsite is ~30u,
   *  so 20 is a good starting point. */
  moonShadowFrustum: number;
  /** Ortho camera near plane. Small so nearby geometry casts. */
  moonShadowNear: number;
  /** Ortho camera far plane. Must exceed distance from light to the farthest
   *  shadow-casting mesh, but stay tight for depth precision. */
  moonShadowFar: number;

  /** Whether the fire's main point light also casts shadows. EXPENSIVE - six
   *  cubemap renders per frame - so off by default. Turn on for a hero look
   *  where bears throw long shadows across the ring. */
  fireCastShadow: number;
  /** Shadow map resolution for the fire point light. Keep modest (512-1024)
   *  because it's already six times the cost of the directional. */
  fireShadowMapSize: number;
  fireShadowBias: number;
  fireShadowNormalBias: number;
  /** How dark the fire's cast shadow gets. Same LightShadow.intensity knob,
   *  0..1, so a hot campfire can still cast a softer shadow than a full moon. */
  fireShadowIntensity: number;
  /** Ground disc color, RGB channels 0..1. Default is the original dark
   *  purple (#2a1c31); crank G for a mossier campsite. */
  groundColorR: number;
  groundColorG: number;
  groundColorB: number;
  /** Desk-scene light sources (attached to the two lanterns and the computer
   *  inside ContactSector). Each source has intensity, distance falloff, and
   *  an RGB color 0..1 so the lab can tune warm-vs-cool without hex strings. */
  deskLanternIntensity: number;
  deskLanternDistance: number;
  deskLanternColorR: number;
  deskLanternColorG: number;
  deskLanternColorB: number;
  /** Local offset of the lantern's point-light from the Selectable's origin.
   *  Line this up with the flame so the light appears to come from the wick. */
  deskLanternLightX: number;
  deskLanternLightY: number;
  deskLanternLightZ: number;
  deskComputerIntensity: number;
  deskComputerDistance: number;
  deskComputerColorR: number;
  deskComputerColorG: number;
  deskComputerColorB: number;
  /** Local-frame offset of the computer's screen-glow pointLight from the
   *  computer Selectable's origin. Lets the light be dialed onto the actual
   *  monitor face instead of hovering inside the case. */
  deskComputerLightX: number;
  deskComputerLightY: number;
  deskComputerLightZ: number;
  /** Warm ambient fill just for the desk scene - a HemisphereLight parented
   *  inside ContactSector, so it only lights the desk without touching the
   *  campfire or arcade. Tunable so the whole desk can read cozier or dim. */
  deskAmbientIntensity: number;
  deskAmbientColorR: number;
  deskAmbientColorG: number;
  deskAmbientColorB: number;
  /** Candle flame inside each lantern - local offset in the lantern's frame
   *  plus a size multiplier. Colors follow deskLanternColor* so warmth tunes
   *  the flame and the point-light together. */
  deskLanternFlameX: number;
  deskLanternFlameY: number;
  deskLanternFlameZ: number;
  deskLanternFlameScale: number;
  /** Multiplier on how fast the flame sways and pulses. 1 = default speed. */
  deskLanternFlameSpeed: number;
  /** How far the flame sways side-to-side (radians of tilt at peak). */
  deskLanternFlameSway: number;
  /** How much the flame pulses in size (0 = no pulse, 1 = ~10% at peak). */
  deskLanternFlamePulse: number;
  /** Extra opacity multiplier so the flame reads bright like the campfire. */
  deskLanternFlameBrightness: number;
  /** Base color of the lantern flame cones (0..1 per channel). Independent
   *  from the lantern point-light color so the flame can read hot-orange
   *  while the wall spill stays a different tint. Mid/tip cones lerp from
   *  this toward warm yellows just like the main campfire palette. */
  deskLanternFlameColorR: number;
  deskLanternFlameColorG: number;
  deskLanternFlameColorB: number;
  /** How brightly the caravan side windows glow (emissiveIntensity on the
   *  cloned `02___Default` window material). 0 = windows dark. */
  deskCaravanWindowIntensity: number;
  /** Window / interior-spill light color 0..1. Shared between the emissive on
   *  the window material and the point-light inside the caravan, so tinting
   *  the pane also warms/cools the ground glow beneath it. */
  deskCaravanWindowColorR: number;
  deskCaravanWindowColorG: number;
  deskCaravanWindowColorB: number;
  /** Local-frame position of the interior point-light. The caravan GLB is
   *  authored at ~80 units long BEFORE its parent group scales it down, so
   *  these values live in that pre-parent-scale space. */
  deskCaravanWindowLightX: number;
  deskCaravanWindowLightY: number;
  deskCaravanWindowLightZ: number;
  /** Interior point-light intensity, distance falloff (in same pre-scale
   *  units as the position), and physical decay exponent. */
  deskCaravanWindowLightIntensity: number;
  deskCaravanWindowLightDistance: number;
  deskCaravanWindowLightDecay: number;
  /** Camping-diorama lamps. The old-bear camping.glb has ~12 emissive lamp
   *  meshes (materials named `Lamp`, `Lamp.001`..`Lamp.012`). On mount we
   *  traverse the loaded GLTF and drop a shared THREE.PointLight beside each
   *  so they actually spill light onto the surroundings the way the campfire,
   *  lantern and computer glow do. Values are single global knobs applied to
   *  every camping lamp (individual per-lamp tuning is intentionally omitted
   *  to keep the config surface small). */
  campingLampIntensity: number;
  campingLampDistance: number;
  campingLampDecay: number;
  campingLampColorR: number;
  campingLampColorG: number;
  campingLampColorB: number;
  /** Placement of the second campfire that lives inside the arcade sector.
   *  Visual look (flame cones, sparks, glow disc, point-light reach) is shared
   *  with the primary campfire so both fires stay in sync when you tune the
   *  main fire; these knobs only move/scale the assembly. */
  arcadeCampfireX: number;
  arcadeCampfireY: number;
  arcadeCampfireZ: number;
  arcadeCampfireRotationY: number;
  arcadeCampfireScale: number;
  /** Local-space offset applied to the "Tailgate" node inside the pickup truck
   *  GLB. The tailgate has its own transform; these values are added to it at
   *  runtime so we can nudge the tailgate up/down/back without editing the GLB
   *  again. Y is the vertical raise (positive = up in the truck's local frame),
   *  RotX rotates it around the hinge (positive = tail rises). */
  truckTailgateX: number;
  truckTailgateY: number;
  truckTailgateZ: number;
  truckTailgateRotX: number;
  truckTailgateRotY: number;
  truckTailgateRotZ: number;
  /** Per-axis scale multipliers applied to the Tailgate node. ScaleX is the
   *  tailgate's width (side to side across the truck), ScaleY is its vertical
   *  thickness, ScaleZ is its depth (how far it extends back from the truck's
   *  rear wall). All 1.0 = authored size. */
  truckTailgateScaleX: number;
  truckTailgateScaleY: number;
  truckTailgateScaleZ: number;
  /** Extra height added to the inside bed walls (left, right, and front cab
   *  wall). 0 = flush with the authored top rail; positive raises a matching
   *  panel above the rail so the bed can hold taller cargo. Measured in truck
   *  local units (~metres). Runtime-added geometry, so no GLB edit needed. */
  truckBedWallHeight: number;
  /** Thickness of the wall extension in the bed's left/right (X) direction.
   *  Default 0.02 = 2 cm; bumping this makes the extension read as a chunky
   *  rail instead of a thin fence. */
  truckBedWallThickness: number;
  /** Hex-like RGB (0-1 floats) for the wall extension material, split into
   *  three fields so it can be tuned via the numeric config pipeline. Default
   *  matches the yellow truck body. */
  truckBedWallColorR: number;
  truckBedWallColorG: number;
  truckBedWallColorB: number;
  /* --- arcade campfire visuals ---------------------------------------------
   * Independent copy of the main campfire's fire/flame/spark/glow knobs so
   * the arcade fire can be tuned differently from the campfire-at-camp fire.
   * Every field mirrors a main-fire field with an "arcade" prefix; ArcadeCampfire
   * reads from these instead of the shared ones. */
  arcadeFireIntensity: number;
  arcadeFireDecay: number;
  arcadeFlickerAmount: number;
  arcadeFireLightX: number;
  arcadeFireLightY: number;
  arcadeFireLightZ: number;
  arcadeFireLightReach: number;
  arcadeFireLightColorR: number;
  arcadeFireLightColorG: number;
  arcadeFireLightColorB: number;
  arcadeFarGlowIntensity: number;
  arcadeFarGlowReach: number;
  arcadeFarGlowDecay: number;
  arcadeFlameX: number;
  arcadeFlameY: number;
  arcadeFlameZ: number;
  arcadeFlameScale: number;
  arcadeFlameOuterScale: number;
  arcadeFlameInnerScale: number;
  arcadeFlameHaloScale: number;
  arcadeGlowOpacity: number;
  arcadeGlowY: number;
  arcadeGlowScale: number;
  arcadeSparkOpacity: number;
  arcadeSparkCount: number;
  arcadeSparkSpread: number;
  arcadeSparkMaxHeight: number;
  arcadeSparkSpeed: number;
  arcadeSparkSway: number;
  arcadeSparkBurstChance: number;
  arcadeSparkSize: number;
  arcadeSparkLifetime: number;
  /** Global multiplier on every arcade CRT's screen glow — brightens or dims
   *  all four TVs at once so their combined spill onto the cubs can be tuned. */
  arcadeCrtGlow: number;
  /* --- arcade CRT spot-light shape ----------------------------------------
   * Each of the 4 CRTs runs its own THREE.SpotLight aimed OUT the screen face
   * (local +Z). These knobs shape all four together — the previous point
   * light lit up the truck wall BEHIND the TVs too; the spot's cone confines
   * the throw to the front. Every field maps 1:1 to CrtLightConfig. */
  /** Distance in local +Z from the screen face where the light source sits. */
  arcadeCrtLightForwardOffset: number;
  /** Cone half-angle in radians (0..Math.PI/2). Wider = spills more sideways. */
  arcadeCrtLightAngle: number;
  /** Soft edge feathering, 0..1. 0 = hard cone, 1 = fully feathered. */
  arcadeCrtLightPenumbra: number;
  /** Max reach of the throw in world units. */
  arcadeCrtLightDistance: number;
  /** Falloff exponent (physical = 2). */
  arcadeCrtLightDecay: number;
  /** Multiplier on top of the screen glow — 0 kills the spot entirely. */
  arcadeCrtLightIntensity: number;
  /** Local X/Y nudge of the light source relative to the screen center. */
  arcadeCrtLightOffsetX: number;
  arcadeCrtLightOffsetY: number;
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
  /** Per-layer size multipliers stacked on top of `flameScale`. Outer is the
   *  orange sheath, inner is the pale-yellow tip cone, halo is the hot
   *  spherical core. The mid cone auto-averages outer & inner so it stays
   *  visually tucked between them. */
  flameOuterScale: number;
  flameInnerScale: number;
  flameHaloScale: number;
  benchRadius: number;
  benchScale: number;
  benchAngleOffset: number;
  treeScale: number;
  treeY: number;
  treeSpread: number;
  treeCloseRadius: number;
  /* --- forest & paths ----------------------------------------------------
   * A procedural pine forest ringing the campsite, with clear corridors
   * along each of the three inter-camp paths so a camera at one camp can
   * still see the other two. The path itself can be visualised as a white
   * strip on the ground for placement. Tree height is a single global knob
   * so the whole forest can be dialed up or down as a baseline. */
  /** 0 = no forest trees rendered. */
  forestEnabled: number;
  /** 0 = paths invisible; 1 = white strip drawn between each camp pair. */
  pathVisible: number;
  /** Width of the drawn path strip in world units. Also seeds where flanking
   *  trees sit — a wider strip pushes them further apart. */
  pathWidth: number;
  /** Half-width of the sight-line corridor around each path — trees inside
   *  it are culled so the camera has a clear view down the trail. */
  pathCorridorHalfWidth: number;
  /** Global height multiplier for every forest tree. Acts as the baseline
   *  for the whole forest: bump this before touching individual densities. */
  forestTreeHeight: number;
  /** How many forest trees to try to place. Denser is generally better —
   *  extras that don't fit get skipped rather than piling up. */
  forestTreeCount: number;
  /** Radius around each camp centre kept clear of forest trees. */
  forestClearRadius: number;
  /** Outer radius of the forest ring. Trees are only sprinkled between the
   *  campsite ring and this distance. */
  forestOuterRadius: number;
  /** Spacing between flanking trees planted alongside each path. Smaller =
   *  denser lining. */
  pathFlankSpacing: number;
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
  /** Additive per-bear offset for the banjo bear's glasses (bearId
   *  "back_left_log"). Stacks on top of the shared glasses config so tuning
   *  the shared fit still moves both, but this quartet lets the banjo bear
   *  wear its glasses higher/lower/tilted without dragging the other bears.
   *  Height/nose/tilt are additive; scale is a multiplier. */
  banjoBearGlassesHeight: number;
  banjoBearGlassesNoseRide: number;
  banjoBearGlassesTilt: number;
  banjoBearGlassesScale: number;
  swooshVolume: number;
  hoverVolume: number;
  clickVolume: number;

  objectOverrides: Record<string, ObjectOverride>;
  /**
   * Extra instances of scene props (captured GLB nodes) authored in the lab.
   * Keyed by a generated id ("dup:<n>"). Each entry references a `source` name
   * (an existing node in the GLB - tree, campItem, bonfire) and carries its
   * own dx/dy/dz/rotX/rotY/rotZ/scale on top of the source's own base
   * transform. Duplicates render as sibling clones of the source; they are
   * clickable and get edited through the same panel as overrides.
   */
  objectDuplicates: Record<string, ObjectDuplicate>;
  /**
   * Names flagged as locked. A locked object is skipped by the raycaster - all
   * of its descendant meshes get their `raycast` method noop'd - so pointer
   * events pass THROUGH it to whatever is behind. Editors use this to stop
   * accidental clicks on a foreground bear while placing something behind it.
   * Persisted so a "the tent stays locked" preference survives a reload.
   */
  lockedObjects: Record<string, boolean>;
}

export interface ObjectDuplicate {
  source: string;
  dx: number;
  dy: number;
  dz: number;
  rotX: number;
  rotY: number;
  rotZ: number;
  scale: number;
  /** 1 = this duplicate stops casting shadows. Same semantics as the noShadow
   *  flag on ObjectOverride; ShadowLayer honours both. Optional so existing
   *  duplicates saved before this field existed still typecheck. */
  noShadow?: number;
}

export const EMPTY_DUPLICATE: Omit<ObjectDuplicate, "source"> = {
  dx: 0,
  dy: 0,
  dz: 0,
  rotX: 0,
  rotY: 0,
  rotZ: 0,
  scale: 1,
};

export const DUPLICATE_PREFIX = "dup:";

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
  /** 1 = descendants of this object stop casting shadows. Handy for the fire,
   *  flame overlays, glow discs, or anything that would otherwise render a
   *  fake dark blob into the shadow map. Optional so existing overrides
   *  saved before this field existed still typecheck; missing = casts. */
  noShadow?: number;
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
  noShadow: 0,
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
  skyBrightness: 1.0,
  starBrightness: 3.2,
  starCount: 650,
  // Cool blue-white to read as a lit LCD by default. Brightness 1 = subtle
  // (screen visible but not glare); crank to make the laptop pop.
  laptopScreenColorR: 0.49,
  laptopScreenColorG: 0.78,
  laptopScreenColorB: 1.0,
  laptopScreenBrightness: 1.0,
  // Shadows default: moon casts a soft directional shadow tuned for the
  // campsite ring (~30u across). Fire point-light shadows are OFF by default
  // because six cubemap renders per frame is a real perf hit.
  // Shadows: FIRE is the primary caster. It's the diegetic light source (bears
  // sit around it, tossing shadows outward onto benches and the ground), so
  // that reads better than a moon casting the whole scene down. Moon shadows
  // OFF by default; flip via the Shadows panel if you want them.
  shadowsEnabled: 1,
  moonX: -4,
  moonY: 7,
  moonZ: -6,
  moonCastShadow: 0,
  moonShadowMapSize: 2048,
  moonShadowBias: -0.0005,
  moonShadowNormalBias: 0.03,
  moonShadowRadius: 4,
  moonShadowIntensity: 1,
  moonShadowFrustum: 20,
  moonShadowNear: 1,
  moonShadowFar: 60,
  fireCastShadow: 1,
  fireShadowMapSize: 1024,
  fireShadowBias: -0.003,
  fireShadowNormalBias: 0.04,
  fireShadowIntensity: 1,
  // Mossy campsite green - the original #2a1c31 dark-purple is now a "green"
  // preset the user asked to try. Tune per-channel in the lab.
  groundColorR: 0.13,
  groundColorG: 0.24,
  groundColorB: 0.13,
  deskLanternIntensity: 2.4,
  deskLanternDistance: 4,
  deskLanternColorR: 1.0,
  deskLanternColorG: 0.7,
  deskLanternColorB: 0.35,
  deskLanternLightX: 0,
  deskLanternLightY: 0.25,
  deskLanternLightZ: 0,
  deskComputerIntensity: 0.9,
  deskComputerDistance: 2.2,
  deskComputerColorR: 0.55,
  deskComputerColorG: 0.75,
  deskComputerColorB: 1.0,
  // Screen-face offset: computer is rotated 180 deg around Y (baseRotationY =
  // Math.PI), so a positive local Z ends up on world -Z. Dial these until the
  // glow spills off the monitor face and onto the desk in front of the bear.
  deskComputerLightX: 0,
  deskComputerLightY: 0.35,
  deskComputerLightZ: 0.2,
  // Warm desk fill - hemisphere sky/ground tint, kept low so the lanterns and
  // computer still carry most of the light. Slightly amber sky, cool ground.
  deskAmbientIntensity: 0.4,
  deskAmbientColorR: 1.0,
  deskAmbientColorG: 0.55,
  deskAmbientColorB: 0.25,
  // Candle flame default placement: mid-lantern height, no X/Z offset,
  // slightly larger than the raw CandleFlame default so it reads from a bit
  // further away.
  deskLanternFlameX: 0,
  deskLanternFlameY: 0.25,
  deskLanternFlameZ: 0,
  deskLanternFlameScale: 1.2,
  deskLanternFlameSpeed: 1.0,
  deskLanternFlameSway: 0.06,
  deskLanternFlamePulse: 1.0,
  deskLanternFlameBrightness: 1.6,
  // Campfire base orange (#ff6b1a) as a starting flame tint. Independent
  // from the lantern R/G/B so the pane color and the actual flame stay
  // separately tunable.
  deskLanternFlameColorR: 1.0,
  deskLanternFlameColorG: 0.42,
  deskLanternFlameColorB: 0.1,
  deskCaravanWindowIntensity: 3.2,
  // Default warm-amber pane, same hex the previous hard-coded emissive used
  // (#ffb752) so tuned scenes read the same after this expansion.
  deskCaravanWindowColorR: 1.0,
  deskCaravanWindowColorG: 0.72,
  deskCaravanWindowColorB: 0.32,
  deskCaravanWindowLightX: 0,
  deskCaravanWindowLightY: 20,
  deskCaravanWindowLightZ: 0,
  deskCaravanWindowLightIntensity: 12,
  deskCaravanWindowLightDistance: 90,
  deskCaravanWindowLightDecay: 1.6,
  campingLampIntensity: 6,
  campingLampDistance: 12,
  campingLampDecay: 1.8,
  campingLampColorR: 1.0,
  campingLampColorG: 0.55,
  campingLampColorB: 0.2,
  arcadeCampfireX: -2.6,
  arcadeCampfireY: 0,
  arcadeCampfireZ: 1.6,
  arcadeCampfireRotationY: 0,
  arcadeCampfireScale: 1,
  truckTailgateX: 0,
  truckTailgateY: 0,
  truckTailgateZ: 0,
  truckTailgateRotX: 0,
  truckTailgateRotY: 0,
  truckTailgateRotZ: 0,
  truckTailgateScaleX: 1,
  truckTailgateScaleY: 1,
  truckTailgateScaleZ: 1,
  // Non-zero default so walls appear the moment the editor opens without the
  // user having to hunt for the on/off switch. Set to 0 in campfireScene.json
  // to hide the extension in the arcade scene.
  truckBedWallHeight: 0.35,
  truckBedWallThickness: 0.04,
  // Matches the yellow truck body (~ #D9994A).
  truckBedWallColorR: 0.85,
  truckBedWallColorG: 0.6,
  truckBedWallColorB: 0.29,
  arcadeFireIntensity: 3.1,
  arcadeFireDecay: 2,
  arcadeFlickerAmount: 1,
  arcadeFireLightX: 0,
  arcadeFireLightY: 0.35,
  arcadeFireLightZ: 0,
  arcadeFireLightReach: 8,
  arcadeFireLightColorR: 1.0,
  arcadeFireLightColorG: 0.47,
  arcadeFireLightColorB: 0.12,
  arcadeFarGlowIntensity: 1.2,
  arcadeFarGlowReach: 22,
  arcadeFarGlowDecay: 1.2,
  arcadeFlameX: 0,
  arcadeFlameY: 0.2,
  arcadeFlameZ: 0,
  arcadeFlameScale: 1,
  arcadeFlameOuterScale: 1,
  arcadeFlameInnerScale: 1,
  arcadeFlameHaloScale: 1,
  arcadeGlowOpacity: 0.24,
  arcadeGlowY: 0.035,
  arcadeGlowScale: 1,
  arcadeSparkOpacity: 0.75,
  arcadeSparkCount: 160,
  arcadeSparkSpread: 0.5,
  arcadeSparkMaxHeight: 2,
  arcadeSparkSpeed: 1.5,
  arcadeSparkSway: 0.35,
  arcadeSparkBurstChance: 0.12,
  arcadeSparkSize: 0.045,
  arcadeSparkLifetime: 1.6,
  arcadeCrtGlow: 1,
  arcadeCrtLightForwardOffset: 0.35,
  arcadeCrtLightAngle: Math.PI / 3,
  arcadeCrtLightPenumbra: 0.5,
  arcadeCrtLightDistance: 3.4,
  arcadeCrtLightDecay: 2,
  arcadeCrtLightIntensity: 1,
  arcadeCrtLightOffsetX: 0,
  arcadeCrtLightOffsetY: 0,
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
  flameOuterScale: 1,
  flameInnerScale: 1,
  flameHaloScale: 1,
  benchRadius: 2.4,
  benchScale: 1,
  benchAngleOffset: Math.PI / 2,
  treeScale: 1,
  treeY: 0,
  treeSpread: 1,
  treeCloseRadius: 4.2,
  forestEnabled: 1,
  pathVisible: 1,
  pathWidth: 0.6,
  pathCorridorHalfWidth: 2.2,
  forestTreeHeight: 1.6,
  forestTreeCount: 320,
  forestClearRadius: 6,
  forestOuterRadius: 55,
  pathFlankSpacing: 2.5,
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
  banjoBearGlassesHeight: 0,
  banjoBearGlassesNoseRide: 0,
  banjoBearGlassesTilt: 0,
  banjoBearGlassesScale: 1,
  swooshVolume: 0.6,
  hoverVolume: 0.35,
  clickVolume: 0.6,

  objectOverrides: {},
  objectDuplicates: {},
  lockedObjects: {},
};

/**
 * What the scene actually starts from: the built-in defaults with whatever has been
 * saved into src/config/campfireScene.json layered on top.
 *
 * That file is committed and bundled at build time, so it is the tuning that actually
 * ships. localStorage still wins over it inside the lab - that is the working draft -
 * but a visitor, or a fresh browser, gets exactly what is in the file.
 */
/**
 * Camera views are stored SEPARATELY from the rest of the config: regular Save
 * writes campfireScene.json but skips locationViews, so a fiddled-with camera
 * doesn't overwrite the pinned "default" per location. Only the Save Default
 * Camera button in SceneLabClient (or a hand edit of cameraDefaults.json)
 * changes what a fresh browser sees for a location.
 *
 * cameraDefaults.json is keyed by location index as a string ("0" / "1" / "2")
 * so partial writes work - overlay each present entry over whatever came from
 * campfireScene.json (which itself falls back to the hardcoded authored views).
 */
function overlayCameraDefaults(base: LocationView[]): LocationView[] {
  const defaults = savedCameraDefaults as Record<string, Partial<LocationView>>;
  return base.map((view, i) => {
    const d = defaults[String(i)];
    if (!d || typeof d !== "object") return view;
    return {
      cx: typeof d.cx === "number" ? d.cx : view.cx,
      cy: typeof d.cy === "number" ? d.cy : view.cy,
      cz: typeof d.cz === "number" ? d.cz : view.cz,
      tx: typeof d.tx === "number" ? d.tx : view.tx,
      ty: typeof d.ty === "number" ? d.ty : view.ty,
      tz: typeof d.tz === "number" ? d.tz : view.tz,
    };
  });
}

const mergedCampfire = {
  ...BASE_CAMPFIRE_CONFIG,
  ...(savedCampfire as Partial<CampfireSceneConfig>),
};

export const DEFAULT_CAMPFIRE_CONFIG: CampfireSceneConfig = {
  ...mergedCampfire,
  locationViews: overlayCameraDefaults(
    mergedCampfire.locationViews ?? BASE_CAMPFIRE_CONFIG.locationViews,
  ),
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
