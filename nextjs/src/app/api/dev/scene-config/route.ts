// Dev-only endpoint: writes the tuned campfire scene into
// src/config/campfireScene.json, which sceneConfig.ts layers over its built-in
// defaults. That file is committed, so whatever is saved here is what ships -
// unlike localStorage, which never leaves the browser it was tuned in.
// Refuses in production.
import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const CONFIG_PATH = path.join(process.cwd(), "src", "config", "campfireScene.json");

/** Per-object placement: every field is a plain number. */
const OVERRIDE_FIELDS = ["dx", "dy", "dz", "rotX", "rotY", "rotZ", "scale", "hide"] as const;
/** One location's camera, in that location's own frame. */
const VIEW_FIELDS = ["cx", "cy", "cz", "tx", "ty", "tz"] as const;

const num = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

/**
 * Only well-formed numbers make it to disk.
 *
 * This is writing a source file from an HTTP body, so nothing is taken on trust: any
 * key that is not a finite number, a numeric override record, or a numeric view is
 * dropped rather than written. A NaN that reached the file would break the scene for
 * everyone on the next deploy, not just the browser that produced it.
 */
function sanitize(raw: Record<string, unknown>) {
  const out: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(raw)) {
    if (num(value)) {
      out[key] = value;
      continue;
    }

    if (key === "objectOverrides" && value && typeof value === "object" && !Array.isArray(value)) {
      const overrides: Record<string, Record<string, number>> = {};
      for (const [name, entry] of Object.entries(value as Record<string, unknown>)) {
        if (!entry || typeof entry !== "object") continue;
        const src = entry as Record<string, unknown>;
        const dst: Record<string, number> = {};
        for (const field of OVERRIDE_FIELDS) {
          const v = src[field];
          dst[field] = num(v) ? v : field === "scale" ? 1 : 0;
        }
        overrides[name] = dst;
      }
      out[key] = overrides;
      continue;
    }

    if (key === "locationViews" && Array.isArray(value)) {
      const views = value
        .filter((entry) => entry && typeof entry === "object")
        .map((entry) => {
          const src = entry as Record<string, unknown>;
          const dst: Record<string, number> = {};
          for (const field of VIEW_FIELDS) {
            const v = src[field];
            dst[field] = num(v) ? v : 0;
          }
          return dst;
        });
      out[key] = views;
      continue;
    }
    // anything else is silently dropped
  }

  return out;
}

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "disabled" }, { status: 403 });
  }

  let body: { campfire?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }

  const campfire = body.campfire;
  if (!campfire || typeof campfire !== "object" || Array.isArray(campfire)) {
    return NextResponse.json({ error: "campfire object required" }, { status: 400 });
  }

  const clean = sanitize(campfire as Record<string, unknown>);
  const keys = Object.keys(clean).length;
  if (!keys) {
    return NextResponse.json({ error: "nothing usable in that config" }, { status: 400 });
  }

  await fs.mkdir(path.dirname(CONFIG_PATH), { recursive: true });
  await fs.writeFile(CONFIG_PATH, `${JSON.stringify(clean, null, 2)}\n`, "utf8");

  return NextResponse.json({
    ok: true,
    keys,
    objects: Object.keys((clean.objectOverrides as object) ?? {}).length,
  });
}
