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
  }
}

export function isClosedShape(shape: ShapeType): boolean {
  return shape !== 'spiral' && shape !== 'bolt';
}

export function shapeDisplayName(shape: ShapeType): string {
  return shape[0].toUpperCase() + shape.slice(1);
}
