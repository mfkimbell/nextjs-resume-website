import { NextRequest, NextResponse } from "next/server";
import type { DrawingSubmission } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  getRollingWeekStart,
  sanitizeCanvasHeight,
  sanitizeCanvasSize,
  sanitizeStrokes,
  sanitizeSubmissionName,
} from "@/lib/drawingSubmissions";

export const dynamic = "force-dynamic";

type PublicSubmission = Pick<
  DrawingSubmission,
  "id" | "name" | "strokes" | "canvasSize" | "canvasHeight" | "upvotes" | "createdAt"
>;

function toPublicSubmission(drawing: PublicSubmission) {
  return {
    id: drawing.id,
    name: drawing.name,
    strokes: drawing.strokes,
    canvasSize: drawing.canvasSize,
    canvasHeight: drawing.canvasHeight,
    upvotes: drawing.upvotes,
    createdAt: drawing.createdAt.toISOString(),
  };
}

async function getVisibleSubmissions() {
  const weekStart = getRollingWeekStart();
  const select = {
    id: true,
    name: true,
    strokes: true,
    canvasSize: true,
    canvasHeight: true,
    upvotes: true,
    createdAt: true,
  };

  const weekly = await prisma.drawingSubmission.findMany({
    where: {
      hidden: false,
      createdAt: { gte: weekStart },
    },
    orderBy: [{ upvotes: "desc" }, { createdAt: "desc" }],
    take: 3,
    select,
  });

  if (weekly.length === 3) return weekly.map(toPublicSubmission);

  const older = await prisma.drawingSubmission.findMany({
    where: {
      hidden: false,
      createdAt: { lt: weekStart },
      id: { notIn: weekly.map((drawing) => drawing.id) },
    },
    orderBy: [{ upvotes: "desc" }, { createdAt: "desc" }],
    take: 3 - weekly.length,
    select,
  });

  return [...weekly, ...older].map(toPublicSubmission);
}

export async function GET() {
  const drawings = await getVisibleSubmissions();

  return NextResponse.json(
    {
      drawings,
      limit: 3,
      weekWindowDays: 7,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const record = body as Record<string, unknown>;
  const name = sanitizeSubmissionName(record.name);
  if (!name) {
    return NextResponse.json({ error: "Name is required before saving." }, { status: 400 });
  }

  const strokesResult = sanitizeStrokes(record.strokes);
  if (!strokesResult.ok) {
    return NextResponse.json({ error: strokesResult.error }, { status: 400 });
  }

  const drawing = await prisma.drawingSubmission.create({
    data: {
      name,
      strokes: strokesResult.strokes,
      canvasSize: sanitizeCanvasSize(record.canvasSize),
      canvasHeight: sanitizeCanvasHeight(record.canvasHeight),
    },
    select: {
      id: true,
      name: true,
      strokes: true,
      canvasSize: true,
      canvasHeight: true,
      upvotes: true,
      createdAt: true,
    },
  });

  const drawings = await getVisibleSubmissions();

  return NextResponse.json(
    {
      drawing: toPublicSubmission(drawing),
      drawings,
    },
    { status: 201 }
  );
}
