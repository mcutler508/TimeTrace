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
  }
}

export function isClosedShape(shape: ShapeType): boolean {
  return shape !== 'spiral';
}

export function shapeDisplayName(shape: ShapeType): string {
  return shape[0].toUpperCase() + shape.slice(1);
}
