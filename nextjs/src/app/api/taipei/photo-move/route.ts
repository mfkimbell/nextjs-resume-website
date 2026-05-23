import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST { photoPath, toDayNum } — reassign a photo to a different day
export async function POST(req: NextRequest) {
  const { photoPath, toDayNum } = await req.json();
  if (!photoPath || toDayNum === undefined) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const record = await prisma.taipeiPhotoDayAssignment.upsert({
    where: { photoPath },
    update: { toDayNum },
    create: { photoPath, toDayNum },
  });
  return NextResponse.json(record);
}

// DELETE { photoPath } — remove an assignment (revert to original day)
export async function DELETE(req: NextRequest) {
  const { photoPath } = await req.json();
  await prisma.taipeiPhotoDayAssignment.deleteMany({ where: { photoPath } });
  return NextResponse.json({ ok: true });
}
