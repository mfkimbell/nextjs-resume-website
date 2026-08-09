import "server-only";
import { prisma } from "@/lib/prisma";
import { getRollingWeekStart } from "@/lib/drawingSubmissions";

export type InitialDrawing = {
  id: string;
  name: string;
  strokes: unknown;
  canvasSize: number;
  canvasHeight: number | null;
  upvotes: number;
  createdAt: string;
};

export type InitialGalleryResponse = {
  drawings: InitialDrawing[];
  limit: number;
  weekWindowDays: number;
};

const SELECT = {
  id: true,
  name: true,
  strokes: true,
  canvasSize: true,
  canvasHeight: true,
  upvotes: true,
  createdAt: true,
} as const;

export async function getInitialGallery(): Promise<InitialGalleryResponse> {
  const weekStart = getRollingWeekStart();

  const weekly = await prisma.drawingSubmission.findMany({
    where: { hidden: false, createdAt: { gte: weekStart } },
    orderBy: [{ upvotes: "desc" }, { createdAt: "desc" }],
    take: 3,
    select: SELECT,
  });

  let rows = weekly;
  if (weekly.length < 3) {
    const older = await prisma.drawingSubmission.findMany({
      where: {
        hidden: false,
        createdAt: { lt: weekStart },
        id: { notIn: weekly.map((d) => d.id) },
      },
      orderBy: [{ upvotes: "desc" }, { createdAt: "desc" }],
      take: 3 - weekly.length,
      select: SELECT,
    });
    rows = [...weekly, ...older];
  }

  return {
    drawings: rows.map((d) => ({
      id: d.id,
      name: d.name,
      strokes: d.strokes,
      canvasSize: d.canvasSize,
      canvasHeight: d.canvasHeight,
      upvotes: d.upvotes,
      createdAt: d.createdAt.toISOString(),
    })),
    limit: 3,
    weekWindowDays: 7,
  };
}
