import type { Point, ShapeSegment, ShapeType } from './types';

const SAMPLES = 96;

function circlePath(): Point[] {
  const out: Point[] = [];
  for (let i = 0; i <= SAMPLES; i++) {
    const a = (i / SAMPLES) * Math.PI * 2 - Math.PI / 2;
    out.push({ x: 0.5 + 0.45 * Math.cos(a), y: 0.5 + 0.45 * Math.sin(a) });
  }
  return out;
}

function squarePath(): Point[] {
  const corners: Point[] = [
    { x: 0.08, y: 0.08 },
    { x: 0.92, y: 0.08 },
    { x: 0.92, y: 0.92 },
    { x: 0.08, y: 0.92 },
    { x: 0.08, y: 0.08 },
  ];
  return interpolatePolyline(corners, SAMPLES);
}

function trianglePath(): Point[] {
  const corners: Point[] = [
    { x: 0.5, y: 0.08 },
    { x: 0.94, y: 0.88 },
    { x: 0.06, y: 0.88 },
    { x: 0.5, y: 0.08 },
  ];
  return interpolatePolyline(corners, SAMPLES);
}

function starPath(): Point[] {
  const cx = 0.5;
  const cy = 0.5;
  const outer = 0.46;
  const inner = 0.2;
  const points: Point[] = [];
  for (let i = 0; i <= 10; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    points.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
  }
  return interpolatePolyline(points, SAMPLES);
}

function spiralPath(): Point[] {
  const out: Point[] = [];
  const turns = 2.5;
  const cx = 0.5;
  const cy = 0.5;
  for (let i = 0; i <= SAMPLES; i++) {
    const t = i / SAMPLES;
    const a = t * turns * Math.PI * 2;
    const r = 0.06 + t * 0.4;
    out.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
  }
  return out;
}

function hexagonPath(): Point[] {
  const cx = 0.5;
  const cy = 0.5;
  const r = 0.45;
  const corners: Point[] = [];
  for (let i = 0; i <= 6; i++) {
    const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
    corners.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
  }
  return interpolatePolyline(corners, SAMPLES);
}

function heartPath(): Point[] {
  // Parametric heart, normalized into [0,1] with a small inset so glow doesn't clip.
  const raw: Point[] = [];
  for (let i = 0; i <= SAMPLES; i++) {
    const t = (i / SAMPLES) * Math.PI * 2;
    const x = 16 * Math.pow(Math.sin(t), 3);
    const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
    raw.push({ x, y });
  }
  return normalizePathToBox(raw, 0.06);
}

function infinityPath(): Point[] {
  // Lemniscate of Bernoulli, traced fully so it returns to the start point.
  const raw: Point[] = [];
  for (let i = 0; i <= SAMPLES; i++) {
    const t = (i / SAMPLES) * Math.PI * 2;
    const denom = 1 + Math.sin(t) * Math.sin(t);
    const x = Math.cos(t) / denom;
    const y = (Math.sin(t) * Math.cos(t)) / denom;
    raw.push({ x, y });
  }
  return normalizePathToBox(raw, 0.06);
}

function boltPath(): Point[] {
  // Sharp 4-vertex zigzag from top-right to bottom-left. Open shape.
  const corners: Point[] = [
    { x: 0.66, y: 0.06 },
    { x: 0.32, y: 0.42 },
    { x: 0.54, y: 0.5 },
    { x: 0.22, y: 0.94 },
  ];
  return interpolatePolyline(corners, SAMPLES);
}

// ---------- Chapter 2 ----------

function doubleLoopPath(): Point[] {
  // Treble-clef-ish: two stacked loops connected by a vertical curve.
  const out: Point[] = [];
  for (let i = 0; i <= SAMPLES; i++) {
    const t = i / SAMPLES;
    // Start at top, big upper loop, descend, smaller lower loop, end at bottom-tail.
    const upper = Math.max(0, 1 - 2 * t); // dominant in first half
    const lower = Math.max(0, 2 * t - 1); // dominant in second half
    const angU = upper * Math.PI * 2 - Math.PI / 2;
    const angL = lower * Math.PI * 2 - Math.PI / 2;
    const x = 0.5 + 0.28 * Math.cos(angU) * upper - 0.18 * Math.cos(angL) * lower;
    const y =
      0.32 +
      0.22 * Math.sin(angU) * upper +
      0.42 +
      0.18 * Math.sin(angL) * lower -
      0.42;
    out.push({ x, y });
  }
  return normalizePathToBox(out, 0.06);
}

function sineWavePath(): Point[] {
  const out: Point[] = [];
  const cycles = 3;
  for (let i = 0; i <= SAMPLES; i++) {
    const t = i / SAMPLES;
    const x = t;
    const y = 0.5 + 0.3 * Math.sin(t * cycles * Math.PI * 2);
    out.push({ x, y });
  }
  return normalizePathToBox(out, 0.05);
}

function crescentPath(): Point[] {
  const out: Point[] = [];
  // Outer arc (left half of larger circle)
  for (let i = 0; i <= SAMPLES / 2; i++) {
    const t = i / (SAMPLES / 2);
    const a = -Math.PI / 2 + t * Math.PI; // -90 → +90
    out.push({ x: 0.5 + 0.4 * Math.cos(a + Math.PI), y: 0.5 + 0.4 * Math.sin(a + Math.PI) });
  }
  // Inner arc (right half of smaller circle, offset)
  for (let i = 0; i <= SAMPLES / 2; i++) {
    const t = i / (SAMPLES / 2);
    const a = Math.PI / 2 - t * Math.PI; // +90 → -90 (going back)
    out.push({ x: 0.6 + 0.28 * Math.cos(a + Math.PI), y: 0.5 + 0.28 * Math.sin(a + Math.PI) });
  }
  return normalizePathToBox(out, 0.06);
}

function cubePath(): Point[] {
  // Isometric cube outline (3 visible faces meeting at a corner). Single stroke.
  const corners: Point[] = [
    { x: 0.2, y: 0.5 }, // front-left bottom
    { x: 0.5, y: 0.65 }, // front-mid bottom
    { x: 0.8, y: 0.5 }, // front-right bottom
    { x: 0.8, y: 0.2 }, // back-right top
    { x: 0.5, y: 0.05 }, // top apex
    { x: 0.2, y: 0.2 }, // back-left top
    { x: 0.2, y: 0.5 }, // back to front-left bottom (close)
    // Inner edges (3 going from center to each rear corner)
    { x: 0.5, y: 0.35 }, // center-back
    { x: 0.5, y: 0.65 }, // back to bottom
    { x: 0.5, y: 0.35 }, // up to center
    { x: 0.8, y: 0.2 }, // out to right-top
    { x: 0.5, y: 0.35 }, // back to center
    { x: 0.2, y: 0.2 }, // out to left-top
  ];
  return interpolatePolyline(corners, SAMPLES);
}

function squareInCirclePath(): Point[] {
  // Outer circle then inner square in a single stroke.
  const out: Point[] = [];
  // Circle (3/4 of the path)
  const half = Math.floor(SAMPLES * 0.6);
  for (let i = 0; i <= half; i++) {
    const a = (i / half) * Math.PI * 2 - Math.PI / 2;
    out.push({ x: 0.5 + 0.42 * Math.cos(a), y: 0.5 + 0.42 * Math.sin(a) });
  }
  // Square inside
  const corners: Point[] = [
    { x: 0.5, y: 0.08 }, // (last circle point would be near here too)
    { x: 0.5, y: 0.22 }, // dive in
    { x: 0.78, y: 0.22 },
    { x: 0.78, y: 0.78 },
    { x: 0.22, y: 0.78 },
    { x: 0.22, y: 0.22 },
    { x: 0.5, y: 0.22 },
  ];
  const sq = interpolatePolyline(corners, SAMPLES - half);
  for (const p of sq) out.push(p);
  return normalizePathToBox(out, 0.05);
}

function trefoilPath(): Point[] {
  // Trefoil knot projection (three-lobed curve).
  const out: Point[] = [];
  for (let i = 0; i <= SAMPLES; i++) {
    const t = (i / SAMPLES) * Math.PI * 2;
    const x = Math.sin(t) + 2 * Math.sin(2 * t);
    const y = Math.cos(t) - 2 * Math.cos(2 * t);
    out.push({ x, y });
  }
  return normalizePathToBox(out, 0.06);
}

function mapleLeafPath(): Point[] {
  // Stylized 5-point maple leaf.
  const tips = 5;
  const out: Point[] = [];
  for (let i = 0; i <= SAMPLES; i++) {
    const t = (i / SAMPLES) * Math.PI * 2;
    // Modulate radius with sharp tips
    const r = 0.36 + 0.16 * Math.cos(tips * t) + 0.05 * Math.sin(2 * t);
    out.push({ x: 0.5 + r * Math.cos(t - Math.PI / 2), y: 0.5 + r * Math.sin(t - Math.PI / 2) });
  }
  return normalizePathToBox(out, 0.06);
}

function springPath(): Point[] {
  // Coil spring traversed left to right with depth oscillation.
  const out: Point[] = [];
  const turns = 4;
  for (let i = 0; i <= SAMPLES; i++) {
    const t = i / SAMPLES;
    const x = 0.1 + t * 0.8;
    const angle = t * turns * Math.PI * 2;
    const y = 0.5 + 0.18 * Math.sin(angle);
    out.push({ x, y });
  }
  return normalizePathToBox(out, 0.04);
}

function pretzelPath(): Point[] {
  // Symmetric pretzel knot.
  const out: Point[] = [];
  for (let i = 0; i <= SAMPLES; i++) {
    const t = (i / SAMPLES) * Math.PI * 2;
    const x = 0.5 + 0.34 * Math.sin(2 * t) * Math.cos(t);
    const y = 0.5 + 0.34 * Math.sin(2 * t) * Math.sin(t);
    out.push({ x, y });
  }
  return normalizePathToBox(out, 0.06);
}

function pyramidBoltPath(): Point[] {
  // Triangular pyramid (3D wireframe) with a lightning bolt accent across.
  const corners: Point[] = [
    { x: 0.2, y: 0.85 }, // base front-left
    { x: 0.85, y: 0.85 }, // base front-right
    { x: 0.55, y: 0.7 }, // base back-mid
    { x: 0.2, y: 0.85 }, // close base
    { x: 0.5, y: 0.15 }, // apex
    { x: 0.85, y: 0.85 }, // edge to right
    { x: 0.5, y: 0.15 }, // back to apex
    { x: 0.55, y: 0.7 }, // edge to back
    { x: 0.5, y: 0.15 }, // back to apex (zigzag finish)
    { x: 0.42, y: 0.42 }, // bolt zig
    { x: 0.55, y: 0.5 }, // bolt zag
    { x: 0.38, y: 0.78 }, // bolt tail
  ];
  return interpolatePolyline(corners, SAMPLES);
}

function normalizePathToBox(path: Point[], padding = 0.05): Point[] {
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
  const width = maxX - minX;
  const height = maxY - minY;
  const scale = (1 - padding * 2) / Math.max(width, height);
  const offsetX = padding + (1 - padding * 2 - width * scale) / 2;
  const offsetY = padding + (1 - padding * 2 - height * scale) / 2;
  return path.map((p) => ({
    x: offsetX + (p.x - minX) * scale,
    y: offsetY + (p.y - minY) * scale,
  }));
}

function interpolatePolyline(corners: Point[], samples: number): Point[] {
  const segs: number[] = [];
  let total = 0;
  for (let i = 0; i < corners.length - 1; i++) {
    const dx = corners[i + 1].x - corners[i].x;
    const dy = corners[i + 1].y - corners[i].y;
    const len = Math.hypot(dx, dy);
    segs.push(len);
    total += len;
  }
  const out: Point[] = [];
  for (let i = 0; i <= samples; i++) {
    let target = (i / samples) * total;
    let segIdx = 0;
    while (segIdx < segs.length - 1 && target > segs[segIdx]) {
      target -= segs[segIdx];
      segIdx++;
    }
    const t = segs[segIdx] === 0 ? 0 : target / segs[segIdx];
    const a = corners[segIdx];
    const b = corners[segIdx + 1];
    out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
  }
  return out;
}

export function generateShapePath(shape: ShapeType): Point[] {
  switch (shape) {
    case 'circle':
      return circlePath();
    case 'square':
      return squarePath();
    case 'triangle':
      return trianglePath();
    case 'star':
      return starPath();
    case 'spiral':
      return spiralPath();
    case 'hexagon':
      return hexagonPath();
    case 'heart':
      return heartPath();
    case 'infinity':
      return infinityPath();
    case 'bolt':
      return boltPath();
    case 'doubleLoop':
      return doubleLoopPath();
    case 'sineWave':
      return sineWavePath();
    case 'crescent':
      return crescentPath();
    case 'cube':
      return cubePath();
    case 'squareInCircle':
      return squareInCirclePath();
    case 'trefoil':
      return trefoilPath();
    case 'mapleLeaf':
      return mapleLeafPath();
    case 'spring':
      return springPath();
    case 'pretzel':
      return pretzelPath();
    case 'pyramidBolt':
      return pyramidBoltPath();
  }
}

const OPEN_SHAPES = new Set<ShapeType>(['spiral', 'bolt', 'sineWave', 'spring', 'cube', 'pyramidBolt']);

export function isClosedShape(shape: ShapeType): boolean {
  return !OPEN_SHAPES.has(shape);
}

export function shapeDisplayName(shape: ShapeType): string {
  return shape[0].toUpperCase() + shape.slice(1);
}

function transformSegmentPath(seg: ShapeSegment, rotation: number): Point[] {
  const base = generateShapePath(seg.shape);
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  return base.map((p) => {
    let dx = p.x - 0.5;
    let dy = p.y - 0.5;
    if (rotation) {
      const nx = dx * cos - dy * sin;
      const ny = dx * sin + dy * cos;
      dx = nx;
      dy = ny;
    }
    dx *= seg.scale;
    dy *= seg.scale;
    return { x: seg.center.x + dx, y: seg.center.y + dy, t: p.t };
  });
}

/** Shapes whose default starting orientation looks fine when freely rotated. */
const RADIALLY_SYMMETRIC = new Set([
  'circle',
  'square',
  'triangle',
  'star',
  'hexagon',
  'spiral',
  'doubleLoop',
  'trefoil',
]);

/**
 * For radially symmetric closed shapes, rotate so the closure point (where the
 * path's start/end sits, default at angle -PI/2 = top) faces the partner
 * shape direction. For interior segments we point the closure toward the NEXT
 * neighbour so the IN slash sits on the exit side; the first segment also
 * points toward next, the last toward prev.
 */
function autoRotation(
  seg: ShapeSegment,
  prev: ShapeSegment | undefined,
  next: ShapeSegment | undefined,
): number {
  if (seg.rotation !== undefined) return seg.rotation;
  if (!RADIALLY_SYMMETRIC.has(seg.shape)) return 0;
  const partner = next ?? prev;
  if (!partner) return 0;
  const dx = partner.center.x - seg.center.x;
  const dy = partner.center.y - seg.center.y;
  const angleToPartner = Math.atan2(dy, dx);
  // Default closure of these shapes is at angle -PI/2. Rotate by
  // (target - default) = angleToPartner - (-PI/2) = angleToPartner + PI/2.
  return angleToPartner + Math.PI / 2;
}

/**
 * Fraction of an interior closed-shape segment's path that gets cut out so the
 * OUT (start) and IN (end) slashes sit at clearly separate points on the curve
 * — slash glows have ~26px shadowBlur, so the gap needs to be substantial or
 * the two slashes visually merge. Cut is split half-from-start, half-from-end
 * so the seam straddles the natural closure (e.g. on a star this removes
 * roughly one full spike at the closure tip rather than clipping mid-spike).
 */
const PORTAL_SEAM_TRIM = 0.24;

/**
 * Shapes whose generated path *starts and ends at the same canvas point* —
 * these are the only ones safe to apply the seam trim to. Other shapes flagged
 * "closed" by gameplay (doubleLoop, squareInCircle, crescent, etc.) actually
 * have paths that start in one place and end somewhere else; trimming them
 * pulls portal slashes to nearby-but-still-overlapping positions or off the
 * curve entirely. When in doubt, leave a shape OFF this list — the cost of
 * not trimming a truly-closed shape is just a stacked OUT/IN, which we'd
 * notice immediately. The cost of trimming a shape that isn't truly closed is
 * portal slashes drifting to wrong locations.
 */
const TRULY_CLOSED_SHAPES = new Set<ShapeType>([
  'circle',
  'square',
  'triangle',
  'star',
  'hexagon',
  'heart',
  'infinity',
  'trefoil',
]);

/**
 * Minimum allowed distance (unit-canvas, 0..1) between an interior segment's
 * OUT (path[0]) and IN (path[-1]) slashes. Slashes have ~26px shadowBlur on a
 * 360px playable canvas (~7% of canvas), plus visual length 7-13% of canvas
 * each side, so endpoints closer than ~0.18 will visually overlap. Tuned from
 * portal level QA — bump higher if slashes still feel cramped on small shapes.
 */
const PORTAL_MIN_SEPARATION = 0.2;

/**
 * Walk both ends of a path inward greedily until the first and last points are
 * at least `minSep` apart in unit-canvas space. At each step advances whichever
 * end produces the larger separation gain. Bails out if the path would shrink
 * below 8 points (the path is already as separated as it can get without
 * destroying the shape).
 */
function enforcePortalSeparation(path: Point[], minSep: number): Point[] {
  if (path.length < 10) return path;
  const dist = (i: number, j: number) =>
    Math.hypot(path[i].x - path[j].x, path[i].y - path[j].y);
  let lo = 0;
  let hi = path.length - 1;
  while (hi - lo > 8 && dist(lo, hi) < minSep) {
    const gainAdvLo = dist(lo + 1, hi) - dist(lo, hi);
    const gainAdvHi = dist(lo, hi - 1) - dist(lo, hi);
    if (gainAdvLo <= 0 && gainAdvHi <= 0) {
      // Neither move increases separation — advance both inward and try again.
      lo++;
      hi--;
    } else if (gainAdvLo >= gainAdvHi) {
      lo++;
    } else {
      hi--;
    }
  }
  return path.slice(lo, hi + 1);
}

/**
 * Generate a continuous unit-space target path from an ordered list of shape
 * segments. Between segments the last point of segment N is flagged
 * `teleport: true` so the rendered line lifts at the portal jump and the
 * scorer treats each segment as its own sub-path. For radially symmetric
 * closed shapes, each segment is auto-rotated so its closure (the IN/OUT
 * portal point) faces the partner segment.
 *
 * Interior closed-shape segments (those with portals on both ends) get their
 * tail trimmed by `PORTAL_SEAM_TRIM` so OUT and IN sit at visibly different
 * points on the curve. First/last segments and open shapes are left alone.
 */
export function generateMultiShapePath(segments: ShapeSegment[]): Point[] {
  const result: Point[] = [];
  for (let s = 0; s < segments.length; s++) {
    const prev = s > 0 ? segments[s - 1] : undefined;
    const next = s < segments.length - 1 ? segments[s + 1] : undefined;
    const rotation = autoRotation(segments[s], prev, next);
    let transformed = transformSegmentPath(segments[s], rotation);
    const isInterior = s > 0 && s < segments.length - 1;
    if (isInterior && transformed.length > 8) {
      if (TRULY_CLOSED_SHAPES.has(segments[s].shape)) {
        // Symmetric trim for shapes whose start and end land on the same
        // point — gives a clean, visible gap straddling the closure.
        const totalCut = Math.floor(transformed.length * PORTAL_SEAM_TRIM);
        const cutStart = Math.floor(totalCut / 2);
        const cutEnd = totalCut - cutStart;
        transformed = transformed.slice(cutStart, transformed.length - cutEnd);
      }
      // Hard guarantee: OUT (path[0]) and IN (path[-1]) MUST be at least
      // PORTAL_MIN_SEPARATION apart in unit-canvas space, no matter the shape.
      // For shapes already separated this is a no-op; for shapes whose
      // endpoints land near each other (doubleLoop, mapleLeaf, pretzel etc.)
      // it walks both ends inward greedily until the distance threshold is met.
      transformed = enforcePortalSeparation(transformed, PORTAL_MIN_SEPARATION);
    }
    if (s > 0 && result.length > 0) {
      const last = result[result.length - 1];
      result[result.length - 1] = { ...last, teleport: true };
    }
    result.push(...transformed);
  }
  return result;
}

