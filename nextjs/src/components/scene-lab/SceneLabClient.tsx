"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import CampfireScene from "@/components/scene-lab/CampfireScene";
import CampsiteTitleIntro from "@/components/scene-lab/CampsiteTitleIntro";
import OceanFloorScene from "@/components/scene-lab/OceanFloorScene";
import {
  BASE_CAMPFIRE_CONFIG,
  DEFAULT_CAMPFIRE_CONFIG,
  DEFAULT_OCEAN_CONFIG,
  defaultLocationView,
  LOCATION_VIEW_FIELDS,
  type CampfireSceneConfig,
  type LocationView,
  type ObjectOverride,
  type OceanFloorSceneConfig,
} from "@/components/scene-lab/sceneConfig";

type SceneKey = "campfire" | "ocean";
type DragPlaneMode = "xz" | "xy";

const SCENE_DETAILS: Record<SceneKey, { label: string; eyebrow: string; description: string }> = {
  campfire: {
    label: "Campfire",
    eyebrow: "Warm / cozy / cinematic",
    description: "Camera rig, fire light height/reach, fog, flicker, glow, and fill lighting.",
  },
  ocean: {
    label: "Ocean Floor",
    eyebrow: "Cool / mysterious / minimal",
    description: "Camera rig, front beam height/distance/angle, blue fog, particles, and caustics.",
  },
};

/** Must stay in the same order as the locations in CampfireScene. */
const LOCATION_NAMES = ["Campfire", "Arcade", "Desk"] as const;

const isSceneKey = (value: string): value is SceneKey => value === "campfire" || value === "ocean";
const STORAGE_KEY = "scene-lab-config-v1";

type SavedSceneLabConfig = {
  activeScene?: unknown;
  campfire?: unknown;
  ocean?: unknown;
};

function mergeNumericConfig<T extends object>(defaults: T, saved: unknown): T {
  const next = { ...defaults };
  if (!saved || typeof saved !== "object") return next;

  const savedRecord = saved as Record<string, unknown>;
  (Object.keys(defaults) as Array<keyof T>).forEach((key) => {
    const value = savedRecord[String(key)];
    if (typeof value === "number" && Number.isFinite(value)) {
      next[key] = value as T[keyof T];
    } else if (
      key === ("objectOverrides" as keyof T) &&
      value &&
      typeof value === "object" &&
      !Array.isArray(value)
    ) {
      const sanitized: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        if (!v || typeof v !== "object") continue;
        const src = v as Record<string, unknown>;
        const dst: Record<string, number> = {};
        for (const field of ["dx", "dy", "dz", "rotX", "rotY", "rotZ", "scale", "hide"] as const) {
          const raw = src[field];
          dst[field] = typeof raw === "number" && Number.isFinite(raw) ? raw : (field === "scale" ? 1 : 0);
        }
        sanitized[k] = dst;
      }
      next[key] = sanitized as T[keyof T];
    } else if (key === ("locationViews" as keyof T) && Array.isArray(value)) {
      // One camera per location. Sanitised field by field so a half-written or
      // stale saved entry falls back to the default shot rather than NaN-ing the
      // camera into nowhere.
      const fallback = (defaults as unknown as CampfireSceneConfig).locationViews ?? [];
      const views = value.map((entry, i) => {
        const base = fallback[i] ?? fallback[0];
        const src = (entry && typeof entry === "object" ? entry : {}) as Record<string, unknown>;
        const out = {} as Record<string, number>;
        for (const field of LOCATION_VIEW_FIELDS) {
          const raw = src[field];
          out[field] = typeof raw === "number" && Number.isFinite(raw) ? raw : base?.[field] ?? 0;
        }
        return out;
      });
      if (views.length) next[key] = views as T[keyof T];
    }
  });

  return next;
}

function readSavedSceneLabConfig(): SavedSceneLabConfig | null {
  // Config lives in src/config/campfireScene.json now, so ignore any stale
  // localStorage entry and delete it on the way out — file is the single
  // source of truth for scene state.
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
  return null;
}

function formatValue(value: number) {
  return value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

const SearchContext = createContext<string>("");

function matchesSearch(label: string, query: string, groupTitle?: string) {
  if (!query) return true;
  const q = query.toLowerCase();
  return label.toLowerCase().includes(q) || (groupTitle?.toLowerCase().includes(q) ?? false);
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  const query = useContext(SearchContext);
  const groupTitle = useContext(GroupTitleContext);
  if (!matchesSearch(label, query, groupTitle)) return null;
  return (
    <label className="block">
      <span className="mb-1 flex items-center justify-between gap-3 text-[0.68rem] uppercase tracking-[0.16em] text-white/55">
        <span>{label}</span>
        <span className="font-mono text-white/80">{formatValue(value)}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-1.5 w-full cursor-pointer accent-white"
      />
    </label>
  );
}

const GroupTitleContext = createContext<string>("");

function ControlGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <GroupTitleContext.Provider value={title}>
      <details open className="rounded-2xl border border-white/10 bg-white/[0.035] p-3 [&:not(:has(label))]:hidden">
        <summary className="cursor-pointer select-none text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-white/65">
          {title}
        </summary>
        <div className="mt-3 space-y-3">{children}</div>
      </details>
    </GroupTitleContext.Provider>
  );
}

function normalizeCampfireConfig(config: CampfireSceneConfig): CampfireSceneConfig {
  const fogFar = Math.max(1.3, config.fogFar);
  const fogNear = Math.max(0.1, Math.min(config.fogNear, fogFar - 0.5));

  return { ...config, fogNear, fogFar };
}

function normalizeOceanConfig(config: OceanFloorSceneConfig): OceanFloorSceneConfig {
  const fogFar = Math.max(1, config.fogFar);
  const fogNear = Math.max(0.1, Math.min(config.fogNear, fogFar - 0.5));

  return { ...config, fogNear, fogFar };
}

export default function SceneLabClient() {
  const [activeScene, setActiveScene] = useState<SceneKey>("campfire");
  const [controlsOpen, setControlsOpen] = useState(true);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [campfireConfig, setCampfireConfig] = useState<CampfireSceneConfig>(DEFAULT_CAMPFIRE_CONFIG);
  const [oceanConfig, setOceanConfig] = useState<OceanFloorSceneConfig>(DEFAULT_OCEAN_CONFIG);
  const [selectedObject, setSelectedObject] = useState<string | null>(null);
  const [dragPlaneMode, setDragPlaneMode] = useState<DragPlaneMode>("xz");
  const [searchQuery, setSearchQuery] = useState("");
  const [sceneKey, setSceneKey] = useState(0);
  /**
   * null = free look. 0-2 = standing on that location with its real site camera,
   * while orbit, picking and dragging all stay live - so a shot can be framed
   * against the actual composition rather than guessed at from outside.
   */
  const [siteView, setSiteView] = useState<number | null>(null);
  /**
   * When on, an overlay renders `<CampsiteTitleIntro>` on top of the campfire
   * scene AND the intro flight is held at its pulled-back start pose, so the
   * user can tune the title timing/camera and see it live. Clicking "Title"
   * again replays it (via titlePreviewKey), and (sound on) hands off to the
   * flight lands — same as production.
   */
  const [titlePreview, setTitlePreview] = useState(false);
  const [titlePreviewKey, setTitlePreviewKey] = useState(0);
  /**
   * Separate from titlePreview so we can release the flight (titleHeldForPreview
   * = false) the moment the visitor clicks (sound on), while the title overlay
   * keeps rendering its fade-out for another beat. Result: the flight is
   * already swooping in behind the fading letters — seamless.
   */
  const [titleHeldForPreview, setTitleHeldForPreview] = useState(false);
  const startTitlePreview = () => {
    // Match production: the site runs with panel=0 (Campfire location) so the
    // intro flight lands at that shot. Free-look would land somewhere else
    // and the preview would frame the letters over a different composition.
    setSiteView(0);
    setSelectedObject(null);
    setTitlePreview(true);
    setTitleHeldForPreview(true);
    setTitlePreviewKey((k) => k + 1);
    // Remount the campfire scene so the intro flight resets to its start pose.
    // Without this, if the intro flight has already finished, titleHeld has
    // nothing to hold.
    setSceneKey((k) => k + 1);
  };

  const updateLocationView = (index: number, view: LocationView) => {
    setCampfireConfig((previous) => {
      const views = [...(previous.locationViews ?? [])];
      while (views.length <= index) views.push(defaultLocationView(views.length, previous));
      views[index] = view;
      return normalizeCampfireConfig({ ...previous, locationViews: views });
    });
  };

  const updateLocationViewField = (index: number, field: keyof LocationView, value: number) => {
    setCampfireConfig((previous) => {
      const views = [...(previous.locationViews ?? [])];
      while (views.length <= index) views.push(defaultLocationView(views.length, previous));
      views[index] = { ...views[index], [field]: value };
      return normalizeCampfireConfig({ ...previous, locationViews: views });
    });
  };

  const updateOverride = (name: string, field: keyof ObjectOverride, value: number) => {
    setCampfireConfig((previous) => {
      const overrides = { ...(previous.objectOverrides || {}) };
      const current = overrides[name] ?? { dx: 0, dy: 0, dz: 0, rotX: 0, rotY: 0, rotZ: 0, scale: 1, hide: 0 };
      overrides[name] = { ...current, [field]: value };
      return normalizeCampfireConfig({ ...previous, objectOverrides: overrides });
    });
  };

  const updateObjectTranslation = (name: string, next: Pick<ObjectOverride, "dx" | "dy" | "dz">) => {
    setCampfireConfig((previous) => {
      const overrides = { ...(previous.objectOverrides || {}) };
      const current = overrides[name] ?? { dx: 0, dy: 0, dz: 0, rotX: 0, rotY: 0, rotZ: 0, scale: 1, hide: 0 };
      overrides[name] = { ...current, ...next };
      return normalizeCampfireConfig({ ...previous, objectOverrides: overrides });
    });
  };

  const resetOverride = (name: string) => {
    setCampfireConfig((previous) => {
      const overrides = { ...(previous.objectOverrides || {}) };
      delete overrides[name];
      return normalizeCampfireConfig({ ...previous, objectOverrides: overrides });
    });
  };

  // Anything hidden before this panel existed (the old "Hidden" slider) also counts as
  // deleted, so this list can be long from the start. It stays collapsed to a chip and
  // can be dismissed outright; deleting something new brings it back.
  const [deletedOpen, setDeletedOpen] = useState(false);
  const [deletedDismissed, setDeletedDismissed] = useState(true);

  const deleteObject = (name: string) => {
    updateOverride(name, "hide", 1);
    setDeletedDismissed(false);
    setDeletedOpen(true);
  };

  // "Delete" is really hide=1: non-destructive, saved with the config, and reversible.
  // A hidden mesh can't be raycast, so once it's gone you can't click it to get it
  // back - that's what the restore list below the panel is for.
  const deletedObjects = useMemo(
    () =>
      Object.entries(campfireConfig.objectOverrides || {})
        .filter(([, o]) => o.hide >= 0.5)
        .map(([name]) => name)
        .sort(),
    [campfireConfig.objectOverrides]
  );

  useEffect(() => {
    const saved = readSavedSceneLabConfig();
    const hash = window.location.hash.replace("#", "").trim();

    if (saved) {
      setCampfireConfig(normalizeCampfireConfig(mergeNumericConfig(DEFAULT_CAMPFIRE_CONFIG, saved.campfire)));
      setOceanConfig(normalizeOceanConfig(mergeNumericConfig(DEFAULT_OCEAN_CONFIG, saved.ocean)));

      if (!isSceneKey(hash) && typeof saved.activeScene === "string" && isSceneKey(saved.activeScene)) {
        setActiveScene(saved.activeScene);
      }
    }

    const readHash = () => {
      const nextHash = window.location.hash.replace("#", "").trim();
      if (isSceneKey(nextHash)) setActiveScene(nextHash);
    };

    readHash();
    window.addEventListener("hashchange", readHash);
    return () => window.removeEventListener("hashchange", readHash);
  }, []);

  const selectScene = (scene: SceneKey) => {
    setActiveScene(scene);
    window.history.replaceState(null, "", `#${scene}`);
  };

  const updateCampfire = (key: keyof CampfireSceneConfig, value: number) => {
    setCampfireConfig((previous) => normalizeCampfireConfig({ ...previous, [key]: value }));
  };

  const updateOcean = (key: keyof OceanFloorSceneConfig, value: number) => {
    setOceanConfig((previous) => normalizeOceanConfig({ ...previous, [key]: value }));
  };

  const showSaveMessage = (message: string) => {
    setSaveMessage(message);
    window.setTimeout(() => setSaveMessage(null), 1800);
  };

  /**
   * Every slider back to its default, keeping the objectOverrides.
   *
   * The two are deliberately separate: the sliders are a look that can be dialled in
   * again in a minute, whereas the overrides are where each prop was dragged, tilted
   * and scaled to, which is real work. "Clear" throws away both; this only the first.
   */
  const resetSliders = () => {
    setCampfireConfig((previous) => normalizeCampfireConfig({
      ...BASE_CAMPFIRE_CONFIG,
      locationViews: BASE_CAMPFIRE_CONFIG.locationViews.map((v) => ({ ...v })),
      objectOverrides: previous.objectOverrides,
    }));
    showSaveMessage("Sliders reset — moved props kept");
  };

  /**
   * Writes the config into src/config/campfireScene.json, in the repo.
   *
   * Everything else here only ever reaches localStorage, which never leaves this
   * browser - so it does not get committed and a deployed visitor never sees it.
   * This is the one that makes the tuning real. Dev only; the route refuses in
   * production.
   */
  const [savingToProject, setSavingToProject] = useState(false);
  const saveToProject = async () => {
    setSavingToProject(true);
    try {
      const res = await fetch("/api/dev/scene-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campfire: campfireConfig }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; objects?: number };
      if (!res.ok) {
        showSaveMessage(`Could not save to project: ${data.error ?? res.status}`);
        return;
      }
      showSaveMessage(`Saved to campfireScene.json — ${data.objects ?? 0} placed props. Commit it to ship.`);
    } catch (err) {
      showSaveMessage(`Could not reach the dev server: ${(err as Error).message}`);
    } finally {
      setSavingToProject(false);
    }
  };

  // Legacy in-browser save is retired: all scene edits now go straight to
  // src/config/campfireScene.json via saveToProject / the debounced auto-save.
  // Keeping the handler as a thin alias to saveToProject so the existing button
  // in the panel still lands them on disk.
  const saveConfig = () => {
    void saveToProject();
  };

  const autoSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialLoadRef = useRef(false);
  useEffect(() => {
    if (!initialLoadRef.current) {
      initialLoadRef.current = true;
      return;
    }
    if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
    autoSaveTimeoutRef.current = setTimeout(() => {
      // Persist changes directly to src/config/campfireScene.json — the file
      // the site loads from — instead of localStorage. Moves survive reloads
      // and get committed to the repo. Dev only; the endpoint refuses in prod.
      fetch("/api/dev/scene-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campfire: campfireConfig }),
      }).catch(() => {
        // best-effort: swallow network hiccups; the next change will retry
      });
    }, 800);
    return () => {
      if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
    };
  }, [campfireConfig, oceanConfig, activeScene]);

  const clearSavedConfig = () => {
    // Always remove any lingering localStorage entry too, so the browser can't
    // silently override the file.
    try { window.localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
    showSaveMessage("Local cache cleared — file is the source of truth");
  };

  const detail = SCENE_DETAILS[activeScene];

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-black text-white">
      {activeScene === "campfire" ? (
        <CampfireScene
          key={`campfire-scene-${sceneKey}`}
          config={campfireConfig}
          onCameraChange={(pos, tgt) => {
            setCampfireConfig((previous) => normalizeCampfireConfig({
              ...previous,
              cameraX: pos[0],
              cameraY: pos[1],
              cameraZ: pos[2],
              targetX: tgt[0],
              targetY: tgt[1],
              targetZ: tgt[2],
            }));
          }}
          onSelect={(name) => setSelectedObject(name || null)}
          selectedObject={selectedObject}
          dragPlaneMode={dragPlaneMode}
          onObjectTranslate={updateObjectTranslation}
          panel={siteView}
          editing
          onLocationViewChange={updateLocationView}
          titleHeld={titleHeldForPreview}
        />
      ) : <OceanFloorScene config={oceanConfig} />}

      {activeScene === "campfire" && titlePreview ? (
        <CampsiteTitleIntro
          key={titlePreviewKey}
          previewMode
          onUnmute={() => setTitleHeldForPreview(false)}
          onEnter={() => setTitlePreview(false)}
          timing={{
            blackHoldDuration: campfireConfig.titleBlackHoldDuration,
            fadeInDuration: campfireConfig.titleFadeInDuration,
            exitSlideDuration: campfireConfig.titleExitSlideDuration,
            exitUnmountDelay: campfireConfig.titleExitUnmountDelay,
            exitSlideDistance: campfireConfig.titleExitSlideDistance,
            exitZDistance: campfireConfig.titleExitZDistance,
            idleAmount: campfireConfig.titleLetterIdleAmount,
            waviness: campfireConfig.titleLetterWaviness,
          }}
        />
      ) : null}

      {activeScene === "campfire" && (selectedObject || (deletedObjects.length > 0 && !deletedDismissed)) && (
        <div className="pointer-events-none absolute left-3 top-3 z-30 flex w-72 flex-col gap-2">
          {selectedObject && (() => {
            const o = campfireConfig.objectOverrides?.[selectedObject] ?? { dx: 0, dy: 0, dz: 0, rotX: 0, rotY: 0, rotZ: 0, scale: 1, hide: 0 };
            const deleted = o.hide >= 0.5;
            return (
              <div className="pointer-events-auto rounded-2xl border border-white/10 bg-black/70 p-3 text-xs text-white/90 shadow-2xl backdrop-blur-md">
                <div className="mb-2 flex items-center justify-between">
                  <div className="truncate font-semibold" title={selectedObject}>{selectedObject}</div>
                  <button
                    onClick={() => setSelectedObject(null)}
                    className="rounded-full border border-white/15 bg-white/10 px-2 py-0.5 text-[0.62rem] hover:bg-white/20"
                  >
                    close
                  </button>
                </div>
                <div className="mb-3 rounded-xl border border-sky-300/20 bg-sky-400/10 p-2">
                  <div className="mb-2 flex gap-1">
                    <button
                      type="button"
                      onClick={() => setDragPlaneMode("xz")}
                      className={`flex-1 rounded-full border px-2 py-1 text-[0.62rem] font-semibold ${
                        dragPlaneMode === "xz"
                          ? "border-sky-200/70 bg-sky-200 text-black"
                          : "border-white/15 bg-white/10 text-white/75 hover:bg-white/15"
                      }`}
                    >
                      X/Z ground
                    </button>
                    <button
                      type="button"
                      onClick={() => setDragPlaneMode("xy")}
                      className={`flex-1 rounded-full border px-2 py-1 text-[0.62rem] font-semibold ${
                        dragPlaneMode === "xy"
                          ? "border-sky-200/70 bg-sky-200 text-black"
                          : "border-white/15 bg-white/10 text-white/75 hover:bg-white/15"
                      }`}
                    >
                      X/Y vertical
                    </button>
                  </div>
                  <p className="text-[0.62rem] leading-4 text-sky-100/75">
                    Drag the selected object itself. While this panel is open, scene orbit is locked. X/Z moves left-right + forward-back. X/Y moves left-right + up-down.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <SliderRow label="Δ X" value={o.dx} min={-20} max={20} step={0.02} onChange={(v) => updateOverride(selectedObject, "dx", v)} />
                  <SliderRow label="Δ Y" value={o.dy} min={-10} max={10} step={0.02} onChange={(v) => updateOverride(selectedObject, "dy", v)} />
                  <SliderRow label="Δ Z" value={o.dz} min={-20} max={20} step={0.02} onChange={(v) => updateOverride(selectedObject, "dz", v)} />
                  <SliderRow label="Tilt fwd / back" value={o.rotX} min={-1.57} max={1.57} step={0.005} onChange={(v) => updateOverride(selectedObject, "rotX", v)} />
                  <SliderRow label="Rotate Y" value={o.rotY} min={-3.14} max={3.14} step={0.01} onChange={(v) => updateOverride(selectedObject, "rotY", v)} />
                  <SliderRow label="Tilt left / right" value={o.rotZ} min={-1.57} max={1.57} step={0.005} onChange={(v) => updateOverride(selectedObject, "rotZ", v)} />
                  <SliderRow label="Scale ×" value={o.scale} min={0.05} max={10} step={0.02} onChange={(v) => updateOverride(selectedObject, "scale", v)} />

                  {deleted ? (
                    <button
                      onClick={() => updateOverride(selectedObject, "hide", 0)}
                      className="mt-2 w-full rounded-full border border-emerald-400/30 bg-emerald-400/15 px-3 py-1.5 text-[0.65rem] font-semibold text-emerald-200 hover:bg-emerald-400/25"
                    >
                      Restore to scene
                    </button>
                  ) : (
                    <button
                      onClick={() => deleteObject(selectedObject)}
                      className="mt-2 w-full rounded-full border border-red-400/30 bg-red-400/15 px-3 py-1.5 text-[0.65rem] font-semibold text-red-200 hover:bg-red-400/25"
                    >
                      Delete from scene
                    </button>
                  )}
                  <button
                    onClick={() => resetOverride(selectedObject)}
                    className="w-full rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[0.65rem] font-semibold hover:bg-white/20"
                  >
                    Reset this object
                  </button>
                </div>
              </div>
            );
          })()}

          {deletedObjects.length > 0 && !deletedDismissed && (
            deletedOpen ? (
              <div className="pointer-events-auto rounded-2xl border border-white/10 bg-black/70 p-3 text-xs text-white/90 shadow-2xl backdrop-blur-md">
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <button
                    onClick={() => setDeletedOpen(false)}
                    className="font-semibold text-white/70 hover:text-white"
                  >
                    Deleted <span className="text-white/40">({deletedObjects.length})</span>
                  </button>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => deletedObjects.forEach((n) => updateOverride(n, "hide", 0))}
                      className="rounded-full border border-white/15 bg-white/10 px-2 py-0.5 text-[0.62rem] hover:bg-white/20"
                    >
                      restore all
                    </button>
                    <button
                      onClick={() => setDeletedDismissed(true)}
                      title="Dismiss. Reappears when you delete something new."
                      className="rounded-full border border-white/15 bg-white/10 px-1.5 py-0.5 text-[0.62rem] hover:bg-white/20"
                    >
                      ✕
                    </button>
                  </div>
                </div>
                <div className="max-h-40 space-y-1 overflow-y-auto pr-0.5">
                  {deletedObjects.map((name) => (
                    <div key={name} className="flex items-center justify-between gap-2 rounded-lg bg-white/5 px-2 py-1">
                      <button
                        onClick={() => setSelectedObject(name)}
                        className="min-w-0 flex-1 truncate text-left text-[0.65rem] text-white/60 hover:text-white/90"
                        title={name}
                      >
                        {name}
                      </button>
                      <button
                        onClick={() => updateOverride(name, "hide", 0)}
                        className="shrink-0 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2 py-0.5 text-[0.6rem] font-semibold text-emerald-200 hover:bg-emerald-400/20"
                      >
                        restore
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="pointer-events-auto flex items-center gap-1 self-start">
                <button
                  onClick={() => setDeletedOpen(true)}
                  className="rounded-full border border-white/10 bg-black/60 px-2.5 py-1 text-[0.62rem] text-white/60 shadow-lg backdrop-blur-md hover:text-white/90"
                >
                  {deletedObjects.length} deleted
                </button>
                <button
                  onClick={() => setDeletedDismissed(true)}
                  title="Dismiss. Reappears when you delete something new."
                  className="rounded-full border border-white/10 bg-black/60 px-1.5 py-1 text-[0.62rem] text-white/40 shadow-lg backdrop-blur-md hover:text-white/80"
                >
                  ✕
                </button>
              </div>
            )
          )}
        </div>
      )}

      <div className="pointer-events-none absolute inset-0 z-20 p-3 sm:p-4">
        <section className="pointer-events-auto inline-flex max-w-[calc(100vw-1.5rem)] items-center gap-2 rounded-full border border-white/10 bg-black/25 px-2.5 py-2 shadow-2xl shadow-black/35 backdrop-blur-md">
          <span className="hidden pl-2 text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-white/45 sm:inline">
            Scene Lab
          </span>
          {(Object.keys(SCENE_DETAILS) as SceneKey[]).map((scene) => {
            const isActive = scene === activeScene;
            return (
              <button
                key={scene}
                type="button"
                aria-pressed={isActive}
                aria-label={`Show ${SCENE_DETAILS[scene].label} scene`}
                onClick={() => selectScene(scene)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition sm:px-4 ${
                  isActive
                    ? "border-white/85 bg-white text-black"
                    : "border-white/15 bg-white/10 text-white/80 hover:border-white/40 hover:bg-white/15"
                }`}
              >
                {SCENE_DETAILS[scene].label}
              </button>
            );
          })}
          <span className="hidden border-l border-white/10 pl-3 pr-2 text-xs text-white/55 md:inline">
            {detail.eyebrow}
          </span>
        </section>

        {/* Stand on a location and see exactly what the site shows there, while orbit,
            picking and dragging all stay live. Orbiting saves that location's shot. */}
        {activeScene === "campfire" && (
          <section className="pointer-events-auto mt-2 flex w-fit max-w-[calc(100vw-1.5rem)] flex-wrap items-center gap-1.5 rounded-full border border-white/10 bg-black/25 px-2.5 py-2 shadow-2xl shadow-black/35 backdrop-blur-md">
            <span className="hidden pl-1 pr-1 text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-white/45 sm:inline">
              View
            </span>
            <button
              type="button"
              aria-pressed={siteView === null && !titlePreview}
              onClick={() => { setSiteView(null); setTitlePreview(false); }}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                siteView === null && !titlePreview
                  ? "border-white/85 bg-white text-black"
                  : "border-white/15 bg-white/10 text-white/80 hover:border-white/40 hover:bg-white/15"
              }`}
              title="Free camera — fly anywhere"
            >
              Free
            </button>
            {LOCATION_NAMES.map((label, i) => (
              <button
                key={label}
                type="button"
                aria-pressed={siteView === i && !titlePreview}
                onClick={() => { setSiteView(i); setTitlePreview(false); }}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  siteView === i && !titlePreview
                    ? "border-white/85 bg-white text-black"
                    : "border-white/15 bg-white/10 text-white/80 hover:border-white/40 hover:bg-white/15"
                }`}
                title={`Site camera for ${label} — drag to reframe, it saves to this location`}
              >
                {label}
              </button>
            ))}
            <span className="mx-1 hidden h-4 w-px bg-white/15 md:inline-block" />
            <button
              type="button"
              aria-pressed={titlePreview}
              onClick={startTitlePreview}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                titlePreview
                  ? "border-white/85 bg-white text-black"
                  : "border-white/15 bg-white/10 text-white/80 hover:border-white/40 hover:bg-white/15"
              }`}
              title="Play the title intro over the scene. Click again to replay it after tuning."
            >
              Title {titlePreview ? "▶ replay" : ""}
            </button>
            {siteView !== null && !titlePreview && (
              <span className="hidden pl-1 pr-1 text-[0.62rem] text-white/45 md:inline">
                drag to reframe · saves to {LOCATION_NAMES[siteView]}
              </span>
            )}
            {titlePreview && (
              <span className="hidden pl-1 pr-1 text-[0.62rem] text-white/45 md:inline">
                tune sliders → click Title to replay
              </span>
            )}
          </section>
        )}

        <section className="pointer-events-auto absolute right-3 top-16 max-h-[calc(100vh-5rem)] w-[min(21rem,calc(100vw-1.5rem))] overflow-hidden rounded-3xl border border-white/10 bg-black/30 p-3 shadow-2xl shadow-black/40 backdrop-blur-md sm:right-4 sm:top-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-white/45">Controls</p>
              <p className="mt-0.5 text-xs text-white/70">{detail.description}</p>
            </div>
            <button
              type="button"
              onClick={() => setControlsOpen((open) => !open)}
              className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-white/75 hover:bg-white/15"
            >
              {controlsOpen ? "Hide" : "Tune"}
            </button>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={saveConfig}
              className="flex-1 rounded-full border border-emerald-300/30 bg-emerald-400/15 px-3 py-2 text-xs font-semibold text-emerald-100 hover:bg-emerald-400/25"
            >
              Save config
            </button>
            <button
              type="button"
              onClick={() => {
                setSceneKey((n) => n + 1);
                showSaveMessage("Scene refreshed");
              }}
              className="rounded-full border border-sky-300/30 bg-sky-400/15 px-3 py-2 text-xs font-semibold text-sky-100 hover:bg-sky-400/25"
              title="Force remount the 3D scene without reloading the page"
            >
              Refresh
            </button>
            <button
              type="button"
              onClick={clearSavedConfig}
              className="rounded-full border border-white/15 bg-white/10 px-3 py-2 text-xs font-semibold text-white/70 hover:bg-white/15"
            >
              Clear
            </button>
          </div>

          {activeScene === "campfire" && (
            <div className="mt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={saveToProject}
                disabled={savingToProject}
                className="flex-1 rounded-full border border-violet-300/30 bg-violet-400/20 px-3 py-2 text-xs font-semibold text-violet-100 hover:bg-violet-400/30 disabled:opacity-50"
                title="Write this config into src/config/campfireScene.json so it is committed and actually ships. Save config only stores it in this browser."
              >
                {savingToProject ? "Saving…" : "Save to project"}
              </button>
              <button
                type="button"
                onClick={resetSliders}
                className="rounded-full border border-amber-300/30 bg-amber-400/15 px-3 py-2 text-xs font-semibold text-amber-100 hover:bg-amber-400/25"
                title="Every slider back to its built-in default. Props you have moved, scaled, tilted or deleted are kept exactly as they are."
              >
                Reset sliders
              </button>
            </div>
          )}
          {saveMessage && <p className="mt-2 text-xs font-medium text-emerald-100/85">{saveMessage}</p>}

          {controlsOpen && (
            <div className="mt-3 max-h-[calc(100vh-12.25rem)] space-y-3 overflow-y-auto pr-1">
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search sliders…"
                className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-1.5 text-xs text-white placeholder:text-white/40 focus:border-white/40 focus:outline-none"
              />
              <SearchContext.Provider value={searchQuery.trim()}>
              {activeScene === "campfire" ? (
                <>
                  <ControlGroup title="Camera">
                    <SliderRow
                      label="Up / Down"
                      value={campfireConfig.cameraY}
                      min={-100}
                      max={100}
                      step={0.05}
                      onChange={(value) => {
                        setCampfireConfig((previous) => normalizeCampfireConfig({
                          ...previous,
                          cameraY: value,
                          targetY: previous.targetY + (value - previous.cameraY),
                        }));
                      }}
                    />
                    <SliderRow
                      label="Left / Right"
                      value={campfireConfig.cameraX}
                      min={-100}
                      max={100}
                      step={0.05}
                      onChange={(value) => {
                        setCampfireConfig((previous) => normalizeCampfireConfig({
                          ...previous,
                          cameraX: value,
                          targetX: previous.targetX + (value - previous.cameraX),
                        }));
                      }}
                    />
                    <SliderRow
                      label="Back / Forward"
                      value={campfireConfig.cameraZ}
                      min={-100}
                      max={100}
                      step={0.05}
                      onChange={(value) => {
                        setCampfireConfig((previous) => normalizeCampfireConfig({
                          ...previous,
                          cameraZ: value,
                          targetZ: previous.targetZ + (value - previous.cameraZ),
                        }));
                      }}
                    />
                    <SliderRow
                      label="Tilt up / down"
                      value={campfireConfig.targetY - campfireConfig.cameraY}
                      min={-30}
                      max={30}
                      step={0.02}
                      onChange={(offset) => updateCampfire("targetY", campfireConfig.cameraY + offset)}
                    />
                    <SliderRow
                      label="Tilt left / right"
                      value={campfireConfig.targetX - campfireConfig.cameraX}
                      min={-30}
                      max={30}
                      step={0.02}
                      onChange={(offset) => updateCampfire("targetX", campfireConfig.cameraX + offset)}
                    />
                    <button
                      onClick={() => {
                        setCampfireConfig((previous) => normalizeCampfireConfig({
                          ...previous,
                          cameraX: DEFAULT_CAMPFIRE_CONFIG.cameraX,
                          cameraY: DEFAULT_CAMPFIRE_CONFIG.cameraY,
                          cameraZ: DEFAULT_CAMPFIRE_CONFIG.cameraZ,
                          targetX: DEFAULT_CAMPFIRE_CONFIG.targetX,
                          targetY: DEFAULT_CAMPFIRE_CONFIG.targetY,
                          targetZ: DEFAULT_CAMPFIRE_CONFIG.targetZ,
                          fov: DEFAULT_CAMPFIRE_CONFIG.fov,
                        }));
                      }}
                      className="mt-2 w-full rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[0.65rem] font-semibold text-white/85 hover:bg-white/20"
                    >
                      Reset camera
                    </button>
                    <SliderRow label="FOV" value={campfireConfig.fov} min={5} max={170} step={1} onChange={(value) => updateCampfire("fov", value)} />
                  </ControlGroup>

                  <ControlGroup title="Title fly-in">
                    <p className="mb-1 text-[0.65rem] leading-relaxed text-white/45">
                      How pulled-back the camera sits while the title card is on
                      screen — that&apos;s the shot the visitor sees behind the letters,
                      and where the fly-in starts from.
                    </p>
                    <SliderRow
                      label="Pull back ×"
                      value={campfireConfig.titleCameraDistance}
                      min={1}
                      max={40}
                      step={0.1}
                      onChange={(value) => updateCampfire("titleCameraDistance", value)}
                    />
                    <SliderRow
                      label="Extra distance"
                      value={campfireConfig.titleFlyExtraDistance}
                      min={0}
                      max={400}
                      step={1}
                      onChange={(value) => updateCampfire("titleFlyExtraDistance", value)}
                    />
                    <SliderRow
                      label="Sky height"
                      value={campfireConfig.titleCameraHeight}
                      min={0}
                      max={120}
                      step={0.5}
                      onChange={(value) => updateCampfire("titleCameraHeight", value)}
                    />
                    <SliderRow
                      label="Camera angle °"
                      value={campfireConfig.titleFlyCameraPitch}
                      min={-90}
                      max={90}
                      step={0.5}
                      onChange={(value) => updateCampfire("titleFlyCameraPitch", value)}
                    />
                    <div className="mt-3 mb-1 text-[0.6rem] font-semibold uppercase tracking-wider text-white/40">
                      Fly-in swoop
                    </div>
                    <SliderRow
                      label="Fly duration"
                      value={campfireConfig.titleFlyDuration}
                      min={0.5}
                      max={12}
                      step={0.1}
                      onChange={(value) => updateCampfire("titleFlyDuration", value)}
                    />
                    <SliderRow
                      label="FOV boost"
                      value={campfireConfig.titleFlyFovBoost}
                      min={0}
                      max={60}
                      step={0.5}
                      onChange={(value) => updateCampfire("titleFlyFovBoost", value)}
                    />
                    <SliderRow
                      label="Fog squash"
                      value={campfireConfig.titleFlyFogSquash}
                      min={0.05}
                      max={1}
                      step={0.01}
                      onChange={(value) => updateCampfire("titleFlyFogSquash", value)}
                    />
                    <div className="mt-3 mb-1 text-[0.6rem] font-semibold uppercase tracking-wider text-white/40">
                      Fade timing
                    </div>
                    <SliderRow
                      label="Black hold"
                      value={campfireConfig.titleBlackHoldDuration}
                      min={0}
                      max={5}
                      step={0.05}
                      onChange={(value) => updateCampfire("titleBlackHoldDuration", value)}
                    />
                    <SliderRow
                      label="Fade in"
                      value={campfireConfig.titleFadeInDuration}
                      min={0.2}
                      max={6}
                      step={0.05}
                      onChange={(value) => updateCampfire("titleFadeInDuration", value)}
                    />
                    <SliderRow
                      label="Exit slide"
                      value={campfireConfig.titleExitSlideDuration}
                      min={0.1}
                      max={3}
                      step={0.05}
                      onChange={(value) => updateCampfire("titleExitSlideDuration", value)}
                    />
                    <SliderRow
                      label="Unmount delay"
                      value={campfireConfig.titleExitUnmountDelay}
                      min={0}
                      max={2}
                      step={0.05}
                      onChange={(value) => updateCampfire("titleExitUnmountDelay", value)}
                    />
                    <SliderRow
                      label="Exit slide height"
                      value={campfireConfig.titleExitSlideDistance}
                      min={0}
                      max={80}
                      step={0.5}
                      onChange={(value) => updateCampfire("titleExitSlideDistance", value)}
                    />
                    <SliderRow
                      label="Exit Z (fwd +/back -)"
                      value={campfireConfig.titleExitZDistance}
                      min={-40}
                      max={40}
                      step={0.5}
                      onChange={(value) => updateCampfire("titleExitZDistance", value)}
                    />
                    <SliderRow
                      label="Letter movement"
                      value={campfireConfig.titleLetterIdleAmount}
                      min={0}
                      max={6}
                      step={0.1}
                      onChange={(value) => updateCampfire("titleLetterIdleAmount", value)}
                    />
                    <SliderRow
                      label="Letter waviness"
                      value={campfireConfig.titleLetterWaviness}
                      min={0}
                      max={3.14}
                      step={0.02}
                      onChange={(value) => updateCampfire("titleLetterWaviness", value)}
                    />
                  </ControlGroup>

                  <ControlGroup title={siteView === null ? "Locations" : `Locations — ${LOCATION_NAMES[siteView]} camera`}>
                    {siteView === null ? (
                      <p className="mb-1 text-[0.65rem] leading-relaxed text-white/45">
                        Pick a location in the View bar to frame its camera. You can drag
                        the scene to reframe it, and still click and move props while you do.
                      </p>
                    ) : (
                      <>
                        {(() => {
                          const view = campfireConfig.locationViews?.[siteView]
                            ?? defaultLocationView(siteView, campfireConfig);
                          const rows: Array<[keyof LocationView, string]> = [
                            ["cx", "Camera left / right"],
                            ["cy", "Camera up / down"],
                            ["cz", "Camera back / forward"],
                            ["tx", "Look-at left / right"],
                            ["ty", "Look-at up / down"],
                            ["tz", "Look-at back / forward"],
                          ];
                          return rows.map(([field, label]) => (
                            <SliderRow
                              key={field}
                              label={label}
                              value={view[field]}
                              min={-30}
                              max={30}
                              step={0.05}
                              onChange={(value) => updateLocationViewField(siteView, field, value)}
                            />
                          ));
                        })()}
                        <div className="mt-2 flex gap-2">
                          <button
                            onClick={() => {
                              const view = campfireConfig.locationViews?.[siteView]
                                ?? defaultLocationView(siteView, campfireConfig);
                              setCampfireConfig((previous) => normalizeCampfireConfig({
                                ...previous,
                                locationViews: LOCATION_NAMES.map(() => ({ ...view })),
                              }));
                              showSaveMessage(`Copied ${LOCATION_NAMES[siteView]} framing to all`);
                            }}
                            className="flex-1 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[0.65rem] font-semibold text-white/85 hover:bg-white/20"
                            title="Give every location this same shot"
                          >
                            Copy to all
                          </button>
                          <button
                            onClick={() => updateLocationView(siteView, defaultLocationView(siteView, campfireConfig))}
                            className="flex-1 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[0.65rem] font-semibold text-white/85 hover:bg-white/20"
                          >
                            Reset this one
                          </button>
                        </div>
                      </>
                    )}
                    <SliderRow
                      label="Ring size"
                      value={campfireConfig.locationRadius}
                      min={3}
                      max={40}
                      step={0.1}
                      onChange={(value) => updateCampfire("locationRadius", value)}
                    />
                    <SliderRow
                      label="Spin the ring"
                      value={campfireConfig.locationAngleOffset}
                      min={-3.14}
                      max={3.14}
                      step={0.01}
                      onChange={(value) => updateCampfire("locationAngleOffset", value)}
                    />
                    <SliderRow
                      label="Turn each scene"
                      value={campfireConfig.locationSpin}
                      min={-3.14}
                      max={3.14}
                      step={0.01}
                      onChange={(value) => updateCampfire("locationSpin", value)}
                    />
                    <SliderRow
                      label="Camera pull-back"
                      value={campfireConfig.locationCameraBack}
                      min={0.5}
                      max={30}
                      step={0.05}
                      onChange={(value) => updateCampfire("locationCameraBack", value)}
                    />
                    <SliderRow
                      label="Camera height"
                      value={campfireConfig.locationCameraHeight}
                      min={-5}
                      max={20}
                      step={0.05}
                      onChange={(value) => updateCampfire("locationCameraHeight", value)}
                    />
                    <SliderRow
                      label="Look-at height"
                      value={campfireConfig.locationTargetHeight}
                      min={-5}
                      max={20}
                      step={0.05}
                      onChange={(value) => updateCampfire("locationTargetHeight", value)}
                    />
                    <SliderRow
                      label="Turn time (s)"
                      value={campfireConfig.locationTurnSpeed}
                      min={0.05}
                      max={4}
                      step={0.01}
                      onChange={(value) => updateCampfire("locationTurnSpeed", value)}
                    />
                    <button
                      onClick={() => {
                        setCampfireConfig((previous) => normalizeCampfireConfig({
                          ...previous,
                          locationRadius: DEFAULT_CAMPFIRE_CONFIG.locationRadius,
                          locationAngleOffset: DEFAULT_CAMPFIRE_CONFIG.locationAngleOffset,
                          locationSpin: DEFAULT_CAMPFIRE_CONFIG.locationSpin,
                          locationCameraBack: DEFAULT_CAMPFIRE_CONFIG.locationCameraBack,
                          locationCameraHeight: DEFAULT_CAMPFIRE_CONFIG.locationCameraHeight,
                          locationTargetHeight: DEFAULT_CAMPFIRE_CONFIG.locationTargetHeight,
                          locationTurnSpeed: DEFAULT_CAMPFIRE_CONFIG.locationTurnSpeed,
                          locationViews: DEFAULT_CAMPFIRE_CONFIG.locationViews.map((v) => ({ ...v })),
                        }));
                      }}
                      className="mt-2 w-full rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[0.65rem] font-semibold text-white/85 hover:bg-white/20"
                    >
                      Reset locations
                    </button>
                  </ControlGroup>

                  <ControlGroup title="Atmosphere">
                    <SliderRow label="Fog start" value={campfireConfig.fogNear} min={0.1} max={200} step={0.1} onChange={(value) => updateCampfire("fogNear", value)} />
                    <SliderRow label="Fog end" value={campfireConfig.fogFar} min={0.5} max={400} step={0.1} onChange={(value) => updateCampfire("fogFar", value)} />
                    <SliderRow label="Ambient fill" value={campfireConfig.ambientIntensity} min={0} max={10} step={0.01} onChange={(value) => updateCampfire("ambientIntensity", value)} />
                    <SliderRow label="Moon fill" value={campfireConfig.moonIntensity} min={0} max={20} step={0.01} onChange={(value) => updateCampfire("moonIntensity", value)} />
                    <SliderRow label="Ground glow" value={campfireConfig.glowOpacity} min={0} max={5} step={0.01} onChange={(value) => updateCampfire("glowOpacity", value)} />
                    <SliderRow label="Ground glow height" value={campfireConfig.glowY} min={-5} max={10} step={0.01} onChange={(value) => updateCampfire("glowY", value)} />
                    <SliderRow label="Ground glow size" value={campfireConfig.glowScale} min={0.1} max={5} step={0.02} onChange={(value) => updateCampfire("glowScale", value)} />
                    <SliderRow label="Spark opacity" value={campfireConfig.sparkOpacity} min={0} max={5} step={0.01} onChange={(value) => updateCampfire("sparkOpacity", value)} />
                    <SliderRow label="Spark count" value={campfireConfig.sparkCount} min={0} max={1500} step={1} onChange={(value) => updateCampfire("sparkCount", value)} />
                    <SliderRow label="Spark spread (base radius)" value={campfireConfig.sparkSpread} min={0} max={5} step={0.02} onChange={(value) => updateCampfire("sparkSpread", value)} />
                    <SliderRow label="Spark max height" value={campfireConfig.sparkMaxHeight} min={0.2} max={20} step={0.05} onChange={(value) => updateCampfire("sparkMaxHeight", value)} />
                    <SliderRow label="Spark speed" value={campfireConfig.sparkSpeed} min={0.1} max={8} step={0.02} onChange={(value) => updateCampfire("sparkSpeed", value)} />
                    <SliderRow label="Spark sway (drift out)" value={campfireConfig.sparkSway} min={0} max={4} step={0.02} onChange={(value) => updateCampfire("sparkSway", value)} />
                    <SliderRow label="Spark burst chance" value={campfireConfig.sparkBurstChance} min={0} max={1} step={0.01} onChange={(value) => updateCampfire("sparkBurstChance", value)} />
                    <SliderRow label="Spark size" value={campfireConfig.sparkSize} min={0.005} max={0.4} step={0.002} onChange={(value) => updateCampfire("sparkSize", value)} />
                    <SliderRow label="Spark lifetime (s)" value={campfireConfig.sparkLifetime} min={0.2} max={8} step={0.05} onChange={(value) => updateCampfire("sparkLifetime", value)} />
                  </ControlGroup>

                  <ControlGroup title="Fire light">
                    <SliderRow label="Fire intensity" value={campfireConfig.fireIntensity} min={0} max={1000} step={0.1} onChange={(value) => updateCampfire("fireIntensity", value)} />
                    <SliderRow label="Flicker amount" value={campfireConfig.flickerAmount} min={0} max={20} step={0.05} onChange={(value) => updateCampfire("flickerAmount", value)} />
                    <SliderRow label="Fire X" value={campfireConfig.fireLightX} min={-30} max={30} step={0.05} onChange={(value) => updateCampfire("fireLightX", value)} />
                    <SliderRow label="Fire height" value={campfireConfig.fireLightY} min={-10} max={30} step={0.05} onChange={(value) => updateCampfire("fireLightY", value)} />
                    <SliderRow label="Fire distance" value={campfireConfig.fireLightZ} min={-30} max={30} step={0.05} onChange={(value) => updateCampfire("fireLightZ", value)} />
                    <SliderRow label="Fire reach" value={campfireConfig.fireLightReach} min={0} max={200} step={0.1} onChange={(value) => updateCampfire("fireLightReach", value)} />
                    <SliderRow label="Fire decay (near/far contrast)" value={campfireConfig.fireDecay} min={0.1} max={4} step={0.05} onChange={(value) => updateCampfire("fireDecay", value)} />
                    <SliderRow label="Far glow intensity" value={campfireConfig.farGlowIntensity} min={0} max={20} step={0.05} onChange={(value) => updateCampfire("farGlowIntensity", value)} />
                    <SliderRow label="Far glow reach" value={campfireConfig.farGlowReach} min={0} max={200} step={0.5} onChange={(value) => updateCampfire("farGlowReach", value)} />
                    <SliderRow label="Far glow decay" value={campfireConfig.farGlowDecay} min={0.1} max={3} step={0.05} onChange={(value) => updateCampfire("farGlowDecay", value)} />
                    <SliderRow label="Shadow light X" value={campfireConfig.warmLightX} min={-30} max={30} step={0.05} onChange={(value) => updateCampfire("warmLightX", value)} />
                    <SliderRow label="Shadow height" value={campfireConfig.warmLightY} min={-10} max={30} step={0.05} onChange={(value) => updateCampfire("warmLightY", value)} />
                    <SliderRow label="Shadow distance" value={campfireConfig.warmLightZ} min={-30} max={30} step={0.05} onChange={(value) => updateCampfire("warmLightZ", value)} />
                    <SliderRow label="Shadow reach" value={campfireConfig.warmLightReach} min={0} max={200} step={0.1} onChange={(value) => updateCampfire("warmLightReach", value)} />
                    <SliderRow label="Shadow angle" value={campfireConfig.warmLightAngle} min={0.01} max={Math.PI / 2} step={0.01} onChange={(value) => updateCampfire("warmLightAngle", value)} />
                  </ControlGroup>

                  <ControlGroup title="Campfire scene GLB">
                    <SliderRow label="Scene scale" value={campfireConfig.sceneScale} min={0.05} max={10} step={0.01} onChange={(value) => updateCampfire("sceneScale", value)} />
                    <SliderRow label="Scene X" value={campfireConfig.sceneX} min={-20} max={20} step={0.05} onChange={(value) => updateCampfire("sceneX", value)} />
                    <SliderRow label="Scene height" value={campfireConfig.sceneY} min={-10} max={10} step={0.05} onChange={(value) => updateCampfire("sceneY", value)} />
                    <SliderRow label="Scene distance" value={campfireConfig.sceneZ} min={-20} max={20} step={0.05} onChange={(value) => updateCampfire("sceneZ", value)} />
                    <SliderRow label="Scene rotate" value={campfireConfig.sceneRotationY} min={-3.14} max={3.14} step={0.01} onChange={(value) => updateCampfire("sceneRotationY", value)} />
                  </ControlGroup>

                  <ControlGroup title="Flame overlay">
                    <SliderRow label="Flame X" value={campfireConfig.flameX} min={-10} max={10} step={0.02} onChange={(value) => updateCampfire("flameX", value)} />
                    <SliderRow label="Flame height" value={campfireConfig.flameY} min={-5} max={10} step={0.02} onChange={(value) => updateCampfire("flameY", value)} />
                    <SliderRow label="Flame distance" value={campfireConfig.flameZ} min={-10} max={10} step={0.02} onChange={(value) => updateCampfire("flameZ", value)} />
                    <SliderRow label="Flame scale" value={campfireConfig.flameScale} min={0.05} max={5} step={0.01} onChange={(value) => updateCampfire("flameScale", value)} />
                  </ControlGroup>

                  <ControlGroup title="Benches">
                    <SliderRow label="Bench radius" value={campfireConfig.benchRadius} min={0.5} max={10} step={0.05} onChange={(value) => updateCampfire("benchRadius", value)} />
                    <SliderRow label="Bench scale" value={campfireConfig.benchScale} min={0.1} max={4} step={0.01} onChange={(value) => updateCampfire("benchScale", value)} />
                    <SliderRow label="Bench facing" value={campfireConfig.benchAngleOffset} min={-3.14} max={3.14} step={0.01} onChange={(value) => updateCampfire("benchAngleOffset", value)} />
                  </ControlGroup>

                  <ControlGroup title="Trees">
                    <SliderRow label="Tree scale" value={campfireConfig.treeScale} min={0.1} max={4} step={0.02} onChange={(value) => updateCampfire("treeScale", value)} />
                    <SliderRow label="Tree Y offset" value={campfireConfig.treeY} min={-5} max={5} step={0.02} onChange={(value) => updateCampfire("treeY", value)} />
                    <SliderRow label="Tree spread" value={campfireConfig.treeSpread} min={0.2} max={3} step={0.01} onChange={(value) => updateCampfire("treeSpread", value)} />
                    <SliderRow label="Tree clearing radius" value={campfireConfig.treeCloseRadius} min={0} max={30} step={0.1} onChange={(value) => updateCampfire("treeCloseRadius", value)} />
                  </ControlGroup>

                  <ControlGroup title="Bonfire">
                    <SliderRow label="Bonfire X" value={campfireConfig.bonfireX} min={-10} max={10} step={0.05} onChange={(value) => updateCampfire("bonfireX", value)} />
                    <SliderRow label="Bonfire Y" value={campfireConfig.bonfireY} min={-5} max={5} step={0.02} onChange={(value) => updateCampfire("bonfireY", value)} />
                    <SliderRow label="Bonfire Z" value={campfireConfig.bonfireZ} min={-10} max={10} step={0.05} onChange={(value) => updateCampfire("bonfireZ", value)} />
                    <SliderRow label="Bonfire rotate" value={campfireConfig.bonfireRotationY} min={-3.14} max={3.14} step={0.01} onChange={(value) => updateCampfire("bonfireRotationY", value)} />
                    <SliderRow label="Bonfire scale" value={campfireConfig.bonfireScale} min={0.1} max={5} step={0.02} onChange={(value) => updateCampfire("bonfireScale", value)} />
                  </ControlGroup>

                  <ControlGroup title="Tent">
                    <SliderRow label="Tent X" value={campfireConfig.tentX} min={-15} max={15} step={0.05} onChange={(value) => updateCampfire("tentX", value)} />
                    <SliderRow label="Tent Y" value={campfireConfig.tentY} min={-5} max={5} step={0.02} onChange={(value) => updateCampfire("tentY", value)} />
                    <SliderRow label="Tent Z" value={campfireConfig.tentZ} min={-15} max={15} step={0.05} onChange={(value) => updateCampfire("tentZ", value)} />
                    <SliderRow label="Tent rotate" value={campfireConfig.tentRotationY} min={-3.14} max={3.14} step={0.01} onChange={(value) => updateCampfire("tentRotationY", value)} />
                    <SliderRow label="Tent scale" value={campfireConfig.tentScale} min={0.1} max={5} step={0.02} onChange={(value) => updateCampfire("tentScale", value)} />
                  </ControlGroup>

                  <ControlGroup title="Camp items">
                    <SliderRow label="Items scale" value={campfireConfig.campItemsScale} min={0.1} max={5} step={0.02} onChange={(value) => updateCampfire("campItemsScale", value)} />
                    <SliderRow label="Items spread" value={campfireConfig.campItemsSpread} min={0.1} max={4} step={0.02} onChange={(value) => updateCampfire("campItemsSpread", value)} />
                    <SliderRow label="Items Y" value={campfireConfig.campItemsY} min={-3} max={3} step={0.02} onChange={(value) => updateCampfire("campItemsY", value)} />
                  </ControlGroup>

                  <ControlGroup title="Animals">
                    <SliderRow label="Animal scale" value={campfireConfig.animalScale} min={0.05} max={20} step={0.02} onChange={(value) => updateCampfire("animalScale", value)} />
                    <SliderRow label="Animal spread" value={campfireConfig.animalSpread} min={0.1} max={4} step={0.02} onChange={(value) => updateCampfire("animalSpread", value)} />
                    <SliderRow label="Animal X" value={campfireConfig.animalX} min={-10} max={10} step={0.05} onChange={(value) => updateCampfire("animalX", value)} />
                    <SliderRow label="Animal Y" value={campfireConfig.animalY} min={-3} max={5} step={0.02} onChange={(value) => updateCampfire("animalY", value)} />
                    <SliderRow label="Animal Z" value={campfireConfig.animalZ} min={-10} max={10} step={0.05} onChange={(value) => updateCampfire("animalZ", value)} />
                  </ControlGroup>

                  <ControlGroup title="Flopping fish">
                    <SliderRow label="Fish X" value={campfireConfig.fishX} min={-10} max={10} step={0.02} onChange={(value) => updateCampfire("fishX", value)} />
                    <SliderRow label="Fish Y" value={campfireConfig.fishY} min={-2} max={5} step={0.01} onChange={(value) => updateCampfire("fishY", value)} />
                    <SliderRow label="Fish Z" value={campfireConfig.fishZ} min={-10} max={10} step={0.02} onChange={(value) => updateCampfire("fishZ", value)} />
                    <SliderRow label="Fish tilt X" value={campfireConfig.fishRotationX} min={-3.14} max={3.14} step={0.01} onChange={(value) => updateCampfire("fishRotationX", value)} />
                    <SliderRow label="Fish heading Y" value={campfireConfig.fishRotationY} min={-3.14} max={3.14} step={0.01} onChange={(value) => updateCampfire("fishRotationY", value)} />
                    <SliderRow label="Fish roll Z" value={campfireConfig.fishRotationZ} min={-3.14} max={3.14} step={0.01} onChange={(value) => updateCampfire("fishRotationZ", value)} />
                    <SliderRow label="Fish scale" value={campfireConfig.fishScale} min={0.005} max={1} step={0.005} onChange={(value) => updateCampfire("fishScale", value)} />
                    <SliderRow label="Flop speed" value={campfireConfig.fishFlopSpeed} min={0} max={12} step={0.1} onChange={(value) => updateCampfire("fishFlopSpeed", value)} />
                  </ControlGroup>

                  <ControlGroup title="Banjo (held by back-left bear)">
                    <p className="mb-1 text-[0.65rem] leading-relaxed text-white/45">
                      Offsets applied inside the paw&apos;s socket frame; scale
                      multiplies the baseline. Reload to see the sit_log
                      animation carry the banjo along with the breathing.
                    </p>
                    <SliderRow label="Banjo X" value={campfireConfig.banjoPropX} min={-0.5} max={0.5} step={0.005} onChange={(value) => updateCampfire("banjoPropX", value)} />
                    <SliderRow label="Banjo Y" value={campfireConfig.banjoPropY} min={-0.5} max={0.5} step={0.005} onChange={(value) => updateCampfire("banjoPropY", value)} />
                    <SliderRow label="Banjo Z" value={campfireConfig.banjoPropZ} min={-0.5} max={0.5} step={0.005} onChange={(value) => updateCampfire("banjoPropZ", value)} />
                    <SliderRow label="Banjo rot X" value={campfireConfig.banjoPropRotX} min={-3.14} max={3.14} step={0.01} onChange={(value) => updateCampfire("banjoPropRotX", value)} />
                    <SliderRow label="Banjo rot Y" value={campfireConfig.banjoPropRotY} min={-3.14} max={3.14} step={0.01} onChange={(value) => updateCampfire("banjoPropRotY", value)} />
                    <SliderRow label="Banjo rot Z" value={campfireConfig.banjoPropRotZ} min={-3.14} max={3.14} step={0.01} onChange={(value) => updateCampfire("banjoPropRotZ", value)} />
                    <SliderRow label="Banjo scale" value={campfireConfig.banjoPropScale} min={0.1} max={4} step={0.01} onChange={(value) => updateCampfire("banjoPropScale", value)} />
                  </ControlGroup>

                  <ControlGroup title="Sound">
                    <p className="mb-1 text-[0.65rem] leading-relaxed text-white/45">
                      Master multiplies every track. Per-track values rebalance
                      one against another; zero mutes just that sound.
                    </p>
                    <SliderRow label="Master volume" value={campfireConfig.masterVolume} min={0} max={1} step={0.01} onChange={(value) => updateCampfire("masterVolume", value)} />
                    <SliderRow label="Fire crackling" value={campfireConfig.fireCracklingVolume} min={0} max={1} step={0.01} onChange={(value) => updateCampfire("fireCracklingVolume", value)} />
                    <SliderRow label="Banjo" value={campfireConfig.banjoVolume} min={0} max={1} step={0.01} onChange={(value) => updateCampfire("banjoVolume", value)} />
                    <SliderRow label="Swoosh (panel switch)" value={campfireConfig.swooshVolume} min={0} max={1} step={0.01} onChange={(value) => updateCampfire("swooshVolume", value)} />
                    <SliderRow label="Hover" value={campfireConfig.hoverVolume} min={0} max={1} step={0.01} onChange={(value) => updateCampfire("hoverVolume", value)} />
                    <SliderRow label="Click" value={campfireConfig.clickVolume} min={0} max={1} step={0.01} onChange={(value) => updateCampfire("clickVolume", value)} />
                  </ControlGroup>

                  <button
                    type="button"
                    onClick={() => setCampfireConfig(DEFAULT_CAMPFIRE_CONFIG)}
                    className="w-full rounded-full border border-white/15 bg-white/10 px-3 py-2 text-xs font-semibold text-white/80 hover:bg-white/15"
                  >
                    Reset campfire
                  </button>
                </>
              ) : (
                <>
                  <ControlGroup title="Camera">
                    <SliderRow label="Camera X" value={oceanConfig.cameraX} min={-2.5} max={2.5} step={0.05} onChange={(value) => updateOcean("cameraX", value)} />
                    <SliderRow label="Camera height" value={oceanConfig.cameraY} min={0.15} max={3.2} step={0.05} onChange={(value) => updateOcean("cameraY", value)} />
                    <SliderRow label="Camera distance" value={oceanConfig.cameraZ} min={1} max={6} step={0.05} onChange={(value) => updateOcean("cameraZ", value)} />
                    <SliderRow label="Look X" value={oceanConfig.targetX} min={-2.5} max={2.5} step={0.05} onChange={(value) => updateOcean("targetX", value)} />
                    <SliderRow label="Look height" value={oceanConfig.targetY} min={0} max={2.5} step={0.05} onChange={(value) => updateOcean("targetY", value)} />
                    <SliderRow label="Look distance" value={oceanConfig.targetZ} min={-1} max={4.5} step={0.05} onChange={(value) => updateOcean("targetZ", value)} />
                    <SliderRow label="FOV" value={oceanConfig.fov} min={25} max={90} step={1} onChange={(value) => updateOcean("fov", value)} />
                  </ControlGroup>

                  <ControlGroup title="Water / atmosphere">
                    <SliderRow label="Fog start" value={oceanConfig.fogNear} min={0.2} max={8} step={0.1} onChange={(value) => updateOcean("fogNear", value)} />
                    <SliderRow label="Fog end" value={oceanConfig.fogFar} min={2} max={22} step={0.1} onChange={(value) => updateOcean("fogFar", value)} />
                    <SliderRow label="Ambient fill" value={oceanConfig.ambientIntensity} min={0} max={0.25} step={0.005} onChange={(value) => updateOcean("ambientIntensity", value)} />
                    <SliderRow label="Particles" value={oceanConfig.particleOpacity} min={0} max={1} step={0.01} onChange={(value) => updateOcean("particleOpacity", value)} />
                    <SliderRow label="Caustics" value={oceanConfig.causticsOpacity} min={0} max={2.5} step={0.05} onChange={(value) => updateOcean("causticsOpacity", value)} />
                  </ControlGroup>

                  <ControlGroup title="Light beams">
                    <SliderRow label="Beam intensity" value={oceanConfig.beamIntensity} min={0} max={3} step={0.05} onChange={(value) => updateOcean("beamIntensity", value)} />
                    <SliderRow label="Beam visibility" value={oceanConfig.beamOpacity} min={0} max={2.5} step={0.05} onChange={(value) => updateOcean("beamOpacity", value)} />
                    <SliderRow label="Beam width" value={oceanConfig.beamWidth} min={0.25} max={2.5} step={0.05} onChange={(value) => updateOcean("beamWidth", value)} />
                    <SliderRow label="Beam length" value={oceanConfig.beamLength} min={0.35} max={2.25} step={0.05} onChange={(value) => updateOcean("beamLength", value)} />
                    <SliderRow label="Target X" value={oceanConfig.beamTargetX} min={-2.5} max={2.5} step={0.05} onChange={(value) => updateOcean("beamTargetX", value)} />
                    <SliderRow label="Target height" value={oceanConfig.beamTargetY} min={0} max={1.2} step={0.02} onChange={(value) => updateOcean("beamTargetY", value)} />
                    <SliderRow label="Target distance" value={oceanConfig.beamTargetZ} min={-0.5} max={4} step={0.05} onChange={(value) => updateOcean("beamTargetZ", value)} />
                    <SliderRow label="Main light X" value={oceanConfig.mainLightX} min={-3} max={3} step={0.05} onChange={(value) => updateOcean("mainLightX", value)} />
                    <SliderRow label="Main height" value={oceanConfig.mainLightY} min={0.6} max={6} step={0.05} onChange={(value) => updateOcean("mainLightY", value)} />
                    <SliderRow label="Main distance" value={oceanConfig.mainLightZ} min={0.4} max={6} step={0.05} onChange={(value) => updateOcean("mainLightZ", value)} />
                    <SliderRow label="Main reach" value={oceanConfig.mainLightReach} min={1} max={14} step={0.1} onChange={(value) => updateOcean("mainLightReach", value)} />
                    <SliderRow label="Main angle" value={oceanConfig.mainLightAngle} min={0.08} max={1.2} step={0.01} onChange={(value) => updateOcean("mainLightAngle", value)} />
                    <SliderRow label="Side light X" value={oceanConfig.sideLightX} min={-4} max={4} step={0.05} onChange={(value) => updateOcean("sideLightX", value)} />
                    <SliderRow label="Side height" value={oceanConfig.sideLightY} min={0.6} max={6} step={0.05} onChange={(value) => updateOcean("sideLightY", value)} />
                    <SliderRow label="Side distance" value={oceanConfig.sideLightZ} min={0.4} max={6} step={0.05} onChange={(value) => updateOcean("sideLightZ", value)} />
                    <SliderRow label="Side reach" value={oceanConfig.sideLightReach} min={1} max={14} step={0.1} onChange={(value) => updateOcean("sideLightReach", value)} />
                    <SliderRow label="Side angle" value={oceanConfig.sideLightAngle} min={0.08} max={1.2} step={0.01} onChange={(value) => updateOcean("sideLightAngle", value)} />
                  </ControlGroup>

                  <button
                    type="button"
                    onClick={() => setOceanConfig(DEFAULT_OCEAN_CONFIG)}
                    className="w-full rounded-full border border-white/15 bg-white/10 px-3 py-2 text-xs font-semibold text-white/80 hover:bg-white/15"
                  >
                    Reset ocean
                  </button>
                </>
              )}
              </SearchContext.Provider>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
