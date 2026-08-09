export type PaintPoint = { x: number; y: number; pressure?: number };

export type PaintStroke = {
  pts: PaintPoint[];
  color: string;
  width: number;
  erase?: boolean;
};

export const PAPER_COLOR = "#fffdf4";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function hashStroke(stroke: PaintStroke) {
  let h = 2166136261;
  const mix = (n: number) => {
    h ^= Math.round(n * 1000);
    h = Math.imul(h, 16777619);
  };

  for (let i = 0; i < stroke.color.length; i++) mix(stroke.color.charCodeAt(i));
  mix(stroke.width);
  mix(stroke.pts.length);

  // Sample points instead of hashing every point so large drawings stay fast.
  const step = Math.max(1, Math.floor(stroke.pts.length / 24));
  for (let i = 0; i < stroke.pts.length; i += step) {
    const p = stroke.pts[i];
    mix(p.x);
    mix(p.y);
    mix(p.pressure ?? 0.62);
  }

  return h >>> 0;
}

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function averagePressure(points: PaintPoint[]) {
  if (!points.length) return 0.62;
  let sum = 0;
  for (const point of points) sum += clamp(point.pressure ?? 0.62, 0.18, 1);
  return sum / points.length;
}

function normalAt(points: PaintPoint[], index: number) {
  const prev = points[Math.max(0, index - 1)] ?? points[index];
  const next = points[Math.min(points.length - 1, index + 1)] ?? points[index];
  const dx = next.x - prev.x;
  const dy = next.y - prev.y;
  const len = Math.hypot(dx, dy) || 1;
  return { x: -dy / len, y: dx / len };
}

function smoothPath(ctx: CanvasRenderingContext2D, points: PaintPoint[]) {
  if (!points.length) return;
  if (points.length === 1) {
    const p = points[0];
    ctx.beginPath();
    ctx.arc(p.x, p.y, Math.max(0.5, ctx.lineWidth / 2), 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);

  for (let i = 1; i < points.length - 1; i++) {
    const p = points[i];
    const next = points[i + 1];
    ctx.quadraticCurveTo(p.x, p.y, (p.x + next.x) / 2, (p.y + next.y) / 2);
  }

  const last = points[points.length - 1];
  ctx.lineTo(last.x, last.y);
  ctx.stroke();
}

function jitteredPoints(
  points: PaintPoint[],
  rand: () => number,
  normalOffset: number,
  jitter: number
): PaintPoint[] {
  return points.map((point, index) => {
    const n = normalAt(points, index);
    const pressure = clamp(point.pressure ?? 0.62, 0.18, 1);
    const dryBrush = 1.12 - pressure * 0.42;
    return {
      x: point.x + n.x * normalOffset + (rand() - 0.5) * jitter * dryBrush,
      y: point.y + n.y * normalOffset + (rand() - 0.5) * jitter * dryBrush,
      pressure,
    };
  });
}

function paintSpeckles(
  ctx: CanvasRenderingContext2D,
  points: PaintPoint[],
  rand: () => number,
  color: string,
  width: number
) {
  if (points.length < 2 || width < 4) return;

  ctx.save();
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.10;

  const step = Math.max(3, Math.floor(points.length / 36));
  for (let i = 0; i < points.length; i += step) {
    if (rand() < 0.35) continue;
    const p = points[i];
    const n = normalAt(points, i);
    const offset = (rand() - 0.5) * width * 1.25;
    const radius = Math.max(0.45, width * (0.035 + rand() * 0.055));
    ctx.beginPath();
    ctx.arc(
      p.x + n.x * offset + (rand() - 0.5) * width * 0.25,
      p.y + n.y * offset + (rand() - 0.5) * width * 0.25,
      radius,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }

  ctx.restore();
}

export function drawPaintStroke(
  ctx: CanvasRenderingContext2D,
  stroke: PaintStroke,
  options: { eraseColor?: string; opacity?: number } = {}
) {
  const points = stroke.pts?.filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y)) ?? [];
  if (!points.length) return;

  const pressure = averagePressure(points);
  const width = Math.max(0.75, stroke.width * (0.72 + pressure * 0.42));

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (stroke.erase) {
    ctx.globalCompositeOperation = options.eraseColor ? "source-over" : "destination-out";
    ctx.strokeStyle = options.eraseColor ?? "rgba(0,0,0,1)";
    ctx.fillStyle = options.eraseColor ?? "rgba(0,0,0,1)";
    ctx.globalAlpha = 1;
    ctx.lineWidth = width * 1.8;
    smoothPath(ctx, points);
    ctx.restore();
    return;
  }

  const rand = rng(hashStroke(stroke));
  const opacity = options.opacity ?? 1;
  const color = stroke.color || "#222222";
  const bristles = Math.max(5, Math.min(11, Math.round(width / 3) + 4));

  ctx.globalCompositeOperation = "source-over";
  ctx.strokeStyle = color;
  ctx.fillStyle = color;

  // Soft translucent body of the stroke.
  ctx.globalAlpha = 0.20 * opacity;
  ctx.lineWidth = width * 1.45;
  smoothPath(ctx, points);

  // Wetter center line.
  ctx.globalAlpha = 0.50 * opacity;
  ctx.lineWidth = width * 0.86;
  smoothPath(ctx, points);

  // Individual bristles/dry-brush streaks.
  for (let i = 0; i < bristles; i++) {
    const offset = (rand() - 0.5) * width * 0.95;
    const bristleWidth = Math.max(0.65, width * (0.06 + rand() * 0.14));
    const jitter = width * (0.10 + rand() * 0.20);
    const alpha = (0.13 + rand() * 0.25) * opacity;
    const bristlePoints = jitteredPoints(points, rand, offset, jitter);

    ctx.globalAlpha = alpha;
    ctx.lineWidth = bristleWidth;
    smoothPath(ctx, bristlePoints);
  }

  paintSpeckles(ctx, points, rand, color, width);
  ctx.restore();
}

export function fillPaperTexture(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  seed = 11,
  baseColor = PAPER_COLOR
) {
  const rand = rng(seed);
  ctx.save();
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, width, height);

  // Subtle warm paper grain.
  for (let i = 0; i < 900; i++) {
    const alpha = 0.018 + rand() * 0.032;
    const shade = rand() > 0.5 ? 255 : 120;
    ctx.fillStyle = `rgba(${shade}, ${shade === 255 ? 248 : 92}, ${shade === 255 ? 226 : 42}, ${alpha})`;
    ctx.fillRect(rand() * width, rand() * height, 0.7 + rand() * 1.4, 0.7 + rand() * 1.6);
  }

  // Slight edge warmth so the sheet feels physical.
  const edge = ctx.createLinearGradient(0, 0, 0, height);
  edge.addColorStop(0, "rgba(125,83,30,0.055)");
  edge.addColorStop(0.12, "rgba(125,83,30,0)");
  edge.addColorStop(0.86, "rgba(125,83,30,0)");
  edge.addColorStop(1, "rgba(125,83,30,0.065)");
  ctx.fillStyle = edge;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}
