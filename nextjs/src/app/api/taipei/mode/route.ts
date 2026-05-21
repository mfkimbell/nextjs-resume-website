import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from 'next/server';



const ID = 'singleton';

export async function GET() {
  const settings = await prisma.taipeiSettings.upsert({
    where: { id: ID },
    create: { id: ID, mode: 'real' },
    update: {},
  });
  return NextResponse.json({ mode: settings.mode });
}

export async function POST(req: NextRequest) {
  const { mode } = await req.json();
  if (mode !== 'real' && mode !== 'fake') {
    return NextResponse.json({ error: 'mode must be real or fake' }, { status: 400 });
  }
  const settings = await prisma.taipeiSettings.upsert({
    where: { id: ID },
    create: { id: ID, mode },
    update: { mode },
  });
  return NextResponse.json({ mode: settings.mode });
}
