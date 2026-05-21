import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";




export async function GET(req: NextRequest) {
  const photoPath = req.nextUrl.searchParams.get("path");
  if (!photoPath) return NextResponse.json([]);
  const comments = await prisma.taipeiPhotoComment.findMany({
    where: { photoPath },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(comments);
}

export async function POST(req: NextRequest) {
  const { photoPath, body } = await req.json();
  if (!photoPath || !body) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }
  const comment = await prisma.taipeiPhotoComment.create({
    data: { photoPath, body },
  });
  return NextResponse.json(comment);
}
