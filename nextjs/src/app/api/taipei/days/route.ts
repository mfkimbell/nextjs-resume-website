import { prisma } from "@/lib/prisma";
import { NextResponse } from 'next/server';




export async function GET(req: Request) {
  const mode = new URL(req.url).searchParams.get('mode') ?? 'fake';
  const days = await prisma.taipeiDay.findMany({
    orderBy: { order: 'asc' },
    include: {
      events: {
        where: mode === 'real'
          ? { fakeOnly: false }
          : { realOnly: false },
        orderBy: { order: 'asc' },
        include: { checklist: { orderBy: { order: 'asc' } } },
      },
    },
  });
  return NextResponse.json(days);
}
