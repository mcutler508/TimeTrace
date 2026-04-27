import type { Point } from './types';

export const ASSIST_TUNING = {
  smoothingAlphaBase: 0.55,
  guidanceThresholdPx: 18,
  guidanceStrengthBase: 0.22,
  closureThresholdPx: 28,
  closureMinPathPx: 88,
  taperFloor: 0.6,
  taperPerAttempt: 0.07,
};

export function assistStrengthForAttempt(attemptCount: number): number {
  const raw = 1 - ASSIST_TUNING.taperPerAttempt * Math.max(0, attemptCount);
  return Math.max(ASSIST_TUNING.taperFloor, Math.min(1, raw));
}

export function smoothPoint(
  curr: Point,
  prev: Point | null,
  prevPrev: Point | null,
  strength: number,
): Point {
  if (!prev) return curr;
  const alpha = ASSIST_TUNING.smoothingAlphaBase * strength;
  let sx = curr.x * (1 - alpha) + prev.x * alpha;
  let sy = curr.y * (1 - alpha) + prev.y * alpha;
  if (prevPrev) {
    const sub = alpha * 0.4;
    sx = sx * (1 - sub) + prevPrev.x * sub;
    sy = sy * (1 - sub) + prevPrev.y * sub;
  }
  return { x: sx, y: sy, t: curr.t };
}

function nearestOnPolyline(
  p: Point,
  polyline: Point[],
): { dist: number; px: number; py: number } {
  let bestDist = Infinity;
  let bx = p.x;
  let by = p.y;
  for (let i = 0; i < polyline.length - 1; i++) {
    const a = polyline[i];
    const b = polyline[i + 1];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len2 = dx * dx + dy * dy;
    if (len2 === 0) continue;
    let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
    if (t < 0) t = 0;
    else if (t > 1) t = 1;
    const cx = a.x + dx * t;
    const cy = a.y + dy * t;
    const d = Math.hypot(p.x - cx, p.y - cy);
    if (d < bestDist) {
      bestDist = d;
      bx = cx;
      by = cy;
    }
  }
  return { dist: bestDist, px: bx, py: by };
}

export function guideTowardTarget(
  point: Point,
  targetCanvasPath: Point[],
  strength: number,
): { point: Point; onTrack: boolean; dist: number } {
  if (targetCanvasPath.length < 2) {
    return { point, onTrack: false, dist: Infinity };
  }
  const { dist, px, py } = nearestOnPolyline(point, targetCanvasPath);
  const threshold = ASSIST_TUNING.guidanceThresholdPx;
  if (dist >= threshold) {
    return { point, onTrack: false, dist };
  }
  const falloff = 1 - dist / threshold;
  const pull = ASSIST_TUNING.guidanceStrengthBase * strength * falloff;
  return {
    point: {
      x: point.x + (px - point.x) * pull,
      y: point.y + (py - point.y) * pull,
      t: point.t,
    },
    onTrack: true,
    dist,
  };
}

export function applyClosure(path: Point[], thresholdPx: number): Point[] {
  if (path.length < 6) return path;
  let total = 0;
  for (let i = 1; i < path.length; i++) {
    total += Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y);
  }
  if (total < ASSIST_TUNING.closureMinPathPx) return path;
  const a = path[0];
  const b = path[path.length - 1];
  const gap = Math.hypot(a.x - b.x, a.y - b.y);
  if (gap > thresholdPx) return path;
  const out = path.slice();
  out[out.length - 1] = { x: a.x, y: a.y, t: b.t };
  return out;
}
