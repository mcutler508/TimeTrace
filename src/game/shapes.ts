import type { Point, ShapeType } from './types';

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
