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

  const dayNum = parseInt(day);
  const defaultPaths = await listGCSDay(day);

  // Photos assigned away from this day, and photos assigned into this day
  const [assignedAway, assignedIn] = await Promise.all([
    prisma.taipeiPhotoDayAssignment.findMany({ where: { NOT: { toDayNum: dayNum } } }),
    prisma.taipeiPhotoDayAssignment.findMany({ where: { toDayNum: dayNum } }),
  ]);

  const assignedAwaySet = new Set(assignedAway.map((a) => a.photoPath));
  const assignedInPaths = assignedIn.map((a) => a.photoPath);

  // Base list: native day photos minus those moved away, plus those moved in
  const basePaths = [
    ...defaultPaths.filter((p) => !assignedAwaySet.has(p)),
    ...assignedInPaths.filter((p) => !defaultPaths.includes(p)),
  ];

  const saved = await prisma.taipeiPhotoOrder.findUnique({ where: { dayNum } });
  if (saved) {
    const order: string[] = saved.order as string[];
    const pathSet = new Set(basePaths);
    const ordered = order.filter((p) => pathSet.has(p));
    const remaining = basePaths.filter((p) => !new Set(ordered).has(p));
    return NextResponse.json([...ordered, ...remaining]);
  }

  return NextResponse.json(basePaths);
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
