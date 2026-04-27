import type { Point } from './types';

export interface WorstSegment {
  startIdx: number;
  endIdx: number;
  avgError: number;
  maxError: number;
}

function pointToSegmentDistance(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(px - ax, py - ay);
  let t = ((px - ax) * dx + (py - ay) * dy) / len2;
  if (t < 0) t = 0;
  else if (t > 1) t = 1;
  const cx = ax + dx * t;
  const cy = ay + dy * t;
  return Math.hypot(px - cx, py - cy);
}

export function pointToPolylineDistance(p: Point, polyline: Point[]): number {
  if (polyline.length === 0) return Infinity;
  if (polyline.length === 1) return Math.hypot(p.x - polyline[0].x, p.y - polyline[0].y);
  let best = Infinity;
  for (let i = 0; i < polyline.length - 1; i++) {
    const d = pointToSegmentDistance(
      p.x,
      p.y,
      polyline[i].x,
      polyline[i].y,
      polyline[i + 1].x,
      polyline[i + 1].y,
    );
    if (d < best) best = d;
  }
  return best;
}

export function findWorstSegment(
  playerPath: Point[],
  targetPath: Point[],
  windowFrac = 0.18,
): WorstSegment | null {
  const n = playerPath.length;
  if (n < 6 || targetPath.length < 2) return null;

  const errs = new Array<number>(n);
  for (let i = 0; i < n; i++) {
    errs[i] = pointToPolylineDistance(playerPath[i], targetPath);
  }

  const win = Math.max(6, Math.min(16, Math.floor(n * windowFrac)));
  if (win >= n) return null;

  let bestStart = 0;
  let bestSum = -Infinity;
  let bestMax = 0;

  let sum = 0;
  for (let i = 0; i < win; i++) sum += errs[i];
  bestSum = sum;
  bestMax = Math.max(...errs.slice(0, win));

  for (let i = win; i < n; i++) {
    sum += errs[i] - errs[i - win];
    if (sum > bestSum) {
      bestSum = sum;
      bestStart = i - win + 1;
      let m = 0;
      for (let j = bestStart; j <= i; j++) if (errs[j] > m) m = errs[j];
      bestMax = m;
    }
  }

  return {
    startIdx: bestStart,
    endIdx: bestStart + win - 1,
    avgError: bestSum / win,
    maxError: bestMax,
  };
}
