import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const GCS_BASE = "https://storage.googleapis.com/images-for-twilio/taipei/travel";

const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"]);

function isImage(name: string) {
  return IMAGE_EXTS.has(name.slice(name.lastIndexOf(".")).toLowerCase());
}

async function listGCSDay(day: string): Promise<string[]> {
  const prefix = `taipei/travel/${day}/`;
  const url = `https://storage.googleapis.com/storage/v1/b/images-for-twilio/o?prefix=${encodeURIComponent(prefix)}&fields=items(name)`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  const items: { name: string }[] = data.items ?? [];
  return items
    .map((i) => i.name.split("/").pop() ?? "")
    .filter(isImage)
    .sort()
    .map((filename) => `${GCS_BASE}/${day}/${filename}`);
}

export async function GET(req: NextRequest) {
  const day = req.nextUrl.searchParams.get("day");
  if (!day) return NextResponse.json([]);

  const defaultPaths = await listGCSDay(day);

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
