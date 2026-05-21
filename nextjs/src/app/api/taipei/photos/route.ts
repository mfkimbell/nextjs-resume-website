import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"]);

export async function GET(req: NextRequest) {
  const day = req.nextUrl.searchParams.get("day");
  if (!day) return NextResponse.json([]);

  const dir = path.join(process.cwd(), "public", "taipei", "travel");

  if (!fs.existsSync(dir)) return NextResponse.json([]);

  const prefix = day;
  const files = fs.readdirSync(dir).filter((f) => {
    const lower = f.toLowerCase();
    return lower.startsWith(prefix) && IMAGE_EXTS.has(path.extname(lower));
  });

  // Sort deterministically
  files.sort();

  return NextResponse.json(files.map((f) => `/taipei/travel/${f}`));
}
