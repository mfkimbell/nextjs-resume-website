import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";




export async function GET(req: NextRequest) {
  const dayNum = Number(req.nextUrl.searchParams.get("day"));
  if (!dayNum) return NextResponse.json([]);
  const headings = await prisma.taipeiPhotoHeading.findMany({
    where: { dayNum },
    orderBy: { afterIndex: "asc" },
  });
  return NextResponse.json(headings);
}

export async function POST(req: NextRequest) {
  const { dayNum, afterIndex, label } = await req.json();
  const heading = await prisma.taipeiPhotoHeading.create({
    data: { dayNum, afterIndex, label },
  });
  return NextResponse.json(heading);
}

export async function PATCH(req: NextRequest) {
  const { id, label } = await req.json();
  const heading = await prisma.taipeiPhotoHeading.update({
    where: { id },
    data: { label },
  });
  return NextResponse.json(heading);
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  await prisma.taipeiPhotoHeading.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
