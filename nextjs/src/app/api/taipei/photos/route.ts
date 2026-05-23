import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";

const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"]);

export async function GET(req: NextRequest) {
  const day = req.nextUrl.searchParams.get("day");
  if (!day) return NextResponse.json([]);

  const dir = path.join(process.cwd(), "public", "taipei", "travel", day);

  if (!fs.existsSync(dir)) return NextResponse.json([]);

  const files = fs.readdirSync(dir).filter((f) => {
    const lower = f.toLowerCase();
    return IMAGE_EXTS.has(path.extname(lower));
  });

  files.sort();

  const defaultPaths = files.map((f) => `/taipei/travel/${day}/${f}`);

  // Apply saved order if it exists
  const saved = await prisma.taipeiPhotoOrder.findUnique({ where: { dayNum: parseInt(day) } });
  if (saved) {
    const order: string[] = saved.order as string[];
    const pathSet = new Set(defaultPaths);
    const ordered = order.filter((p) => pathSet.has(p));
    const remaining = defaultPaths.filter((p) => !new Set(ordered).has(p));
    return NextResponse.json([...ordered, ...remaining]);
  }

  return NextResponse.json(defaultPaths);
}

export async function POST(req: NextRequest) {
  const { dayNum, order } = await req.json();
  const record = await prisma.taipeiPhotoOrder.upsert({
    where: { dayNum },
    update: { order },
    create: { dayNum, order },
  });
  return NextResponse.json(record);
}
