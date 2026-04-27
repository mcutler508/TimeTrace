import type { Point } from './types';

export interface BBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

export function boundingBox(path: Point[]): BBox {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of path) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  if (!isFinite(minX)) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
  }
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}

export function pathLength(path: Point[]): number {
  let total = 0;
  for (let i = 1; i < path.length; i++) {
    // Skip distance across portal teleports — the previous point is flagged
    // as a break.
    if (path[i - 1].teleport) continue;
    total += Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y);
  }
  return total;
}

/**
 * Sample a position + unit tangent at fraction t in [0, 1] along the polyline,
 * weighting by arc length (so a long segment gets proportional t span).
 */
export function sampleAt(
  path: Point[],
  t: number,
): { point: Point; tangent: { x: number; y: number } } {
  const clampedT = Math.max(0, Math.min(1, t));
  if (path.length < 2) {
    return {
      point: path[0] ?? { x: 0, y: 0 },
      tangent: { x: 1, y: 0 },
    };
  }
  const segLengths: number[] = [];
  let total = 0;
  for (let i = 1; i < path.length; i++) {
    const len = Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y);
    segLengths.push(len);
    total += len;
  }
  if (total === 0) {
    return { point: path[0], tangent: { x: 1, y: 0 } };
  }
  const target = clampedT * total;
  let acc = 0;
  for (let i = 0; i < segLengths.length; i++) {
    const segLen = segLengths[i];
    if (acc + segLen >= target || i === segLengths.length - 1) {
      const localT = segLen === 0 ? 0 : Math.min(1, (target - acc) / segLen);
      const a = path[i];
      const b = path[i + 1];
      const x = a.x + (b.x - a.x) * localT;
      const y = a.y + (b.y - a.y) * localT;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const mag = Math.hypot(dx, dy);
      const tangent = mag > 0 ? { x: dx / mag, y: dy / mag } : { x: 1, y: 0 };
      return { point: { x, y }, tangent };
    }
    acc += segLen;
  }
  return { point: path[path.length - 1], tangent: { x: 1, y: 0 } };
}

/**
 * Segment-segment intersection test in 2D. Returns true if the two line
 * segments cross. Used for portal slash detection.
 */
export function segmentsIntersect(
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  p3: { x: number; y: number },
  p4: { x: number; y: number },
): boolean {
  const d1x = p2.x - p1.x;
  const d1y = p2.y - p1.y;
  const d2x = p4.x - p3.x;
  const d2y = p4.y - p3.y;
  const denom = d1x * d2y - d1y * d2x;
  if (Math.abs(denom) < 1e-9) return false;
  const dx = p3.x - p1.x;
  const dy = p3.y - p1.y;
  const t = (dx * d2y - dy * d2x) / denom;
  const u = (dx * d1y - dy * d1x) / denom;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1;
}

/** Split a path into contiguous sub-paths at teleport break points. */
export function splitOnTeleport(path: Point[]): Point[][] {
  const out: Point[][] = [];
  let cur: Point[] = [];
  for (const p of path) {
    cur.push(p);
    if (p.teleport) {
      if (cur.length >= 2) out.push(cur);
      cur = [];
    }
  }
  if (cur.length >= 2) out.push(cur);
  return out;
}

export function resamplePath(path: Point[], n: number): Point[] {
  if (path.length < 2) return path.slice();
  const segLengths: number[] = [];
  let total = 0;
  for (let i = 1; i < path.length; i++) {
    const len = Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y);
    segLengths.push(len);
    total += len;
  }
  if (total === 0) return Array(n).fill({ x: path[0].x, y: path[0].y });

  const step = total / (n - 1);
  const out: Point[] = [{ x: path[0].x, y: path[0].y }];
  let segIdx = 0;
  let segConsumed = 0;
  let nextDist = step;

  while (out.length < n - 1 && segIdx < segLengths.length) {
    const segLen = segLengths[segIdx];
    const remaining = segLen - segConsumed;
    if (nextDist <= remaining + 1e-9) {
      const a = path[segIdx];
      const b = path[segIdx + 1];
      const t = segLen === 0 ? 0 : (segConsumed + nextDist) / segLen;
      out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
      segConsumed += nextDist;
      nextDist = step;
    } else {
      nextDist -= remaining;
      segConsumed = 0;
      segIdx++;
    }
  }

  while (out.length < n) {
    const last = path[path.length - 1];
    out.push({ x: last.x, y: last.y });
  }
  return out;
}

export function normalizeToUnit(path: Point[]): Point[] {
  const bb = boundingBox(path);
  const scale = Math.max(bb.width, bb.height);
  if (scale === 0) return path.map(() => ({ x: 0.5, y: 0.5 }));
  return path.map((p) => ({
    x: (p.x - bb.minX) / scale + (scale === bb.width ? 0 : (1 - bb.height / scale) / 2),
    y: (p.y - bb.minY) / scale + (scale === bb.height ? 0 : (1 - bb.width / scale) / 2),
  }));
}

export function bestRotationOffset(
  player: Point[],
  target: Point[],
): { offset: number; reverse: boolean } {
  const n = player.length;
  let bestOffset = 0;
  let bestReverse = false;
  let bestScore = Infinity;
  for (const reverse of [false, true]) {
    const candidate = reverse ? player.slice().reverse() : player;
    for (let off = 0; off < n; off += Math.max(1, Math.floor(n / 32))) {
      let sum = 0;
      for (let i = 0; i < n; i++) {
        const a = candidate[(i + off) % n];
        const b = target[i];
        sum += Math.hypot(a.x - b.x, a.y - b.y);
        if (sum >= bestScore) break;
      }
      if (sum < bestScore) {
        bestScore = sum;
        bestOffset = off;
        bestReverse = reverse;
      }
    }
  }
  return { offset: bestOffset, reverse: bestReverse };
}

export function scaleNormalizedToCanvas(
  path: Point[],
  width: number,
  height: number,
  padding = 24,
): Point[] {
  const size = Math.min(width, height) - padding * 2;
  const offsetX = (width - size) / 2;
  const offsetY = (height - size) / 2;
  return path.map((p) => ({ x: offsetX + p.x * size, y: offsetY + p.y * size }));
}
