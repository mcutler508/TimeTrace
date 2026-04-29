import type { Point } from './types';

export type PaintStyleId =
  | 'neon'
  | 'pencil'
  | 'ink'
  | 'chalk'
  | 'pixel'
  | 'ribbon'
  | 'rainbow'
  | 'comet'
  | 'nebula'
  | 'constellation'
  | 'laser';

export interface PaintStyleMeta {
  id: PaintStyleId;
  label: string;
  blurb: string;
  unlocked: boolean;
  unlockHint?: string;
}

export const PAINT_STYLES: PaintStyleMeta[] = [
  { id: 'neon', label: 'Neon', blurb: 'Wide glow, sticker core. The classic.', unlocked: true },
  { id: 'laser', label: 'Laser', blurb: 'Bright sci-fi beam with sparking core.', unlocked: true },
  { id: 'comet', label: 'Comet', blurb: 'Glowing head, twinkling stardust tail.', unlocked: true },
  { id: 'nebula', label: 'Nebula', blurb: 'Soft cloud puffs in tri-color drift.', unlocked: true },
  { id: 'constellation', label: 'Constellation', blurb: 'Connect-the-stars with cross-shaped sparks.', unlocked: true },
  { id: 'rainbow', label: 'Prism', blurb: 'Iridescent gradient with sprinkled sparkles.', unlocked: true },
  { id: 'ribbon', label: 'Candy Stripe', blurb: 'Diagonal barber-pole stripes inside one bold line.', unlocked: true },
  { id: 'pixel', label: 'Arcade Pixel', blurb: 'Chunky CRT stamps with shadow & shine.', unlocked: true },
  { id: 'chalk', label: 'Chalk', blurb: 'Streaked pastel with heavy dust scatter.', unlocked: true },
  { id: 'ink', label: 'Calligraphy Ink', blurb: 'Tapered brush with wet endpoint blots.', unlocked: true },
  { id: 'pencil', label: 'Graphite', blurb: 'Layered hairs over rough paper grain.', unlocked: true },
];

export const DEFAULT_PAINT_STYLE: PaintStyleId = 'neon';

export function isPaintStyleId(s: unknown): s is PaintStyleId {
  return typeof s === 'string' && PAINT_STYLES.some((p) => p.id === s);
}

export function paintStyleMeta(id: PaintStyleId): PaintStyleMeta {
  return PAINT_STYLES.find((p) => p.id === id) ?? PAINT_STYLES[0];
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const m = hex.replace('#', '').match(/.{2}/g);
  if (!m) return { r: 0, g: 240, b: 255 };
  return { r: parseInt(m[0], 16), g: parseInt(m[1], 16), b: parseInt(m[2], 16) };
}

export function rgba(hex: string, a: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

function toHex(r: number, g: number, b: number): string {
  const c = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

export function tintTowardWhite(hex: string, t: number): string {
  const { r, g, b } = hexToRgb(hex);
  return toHex(r + (255 - r) * t, g + (255 - g) * t, b + (255 - b) * t);
}

function tintTowardBlack(hex: string, t: number): string {
  const { r, g, b } = hexToRgb(hex);
  return toHex(r * (1 - t), g * (1 - t), b * (1 - t));
}

type Segments = Point[][];

function splitOnTeleport(pts: Point[]): Segments {
  const segments: Segments = [];
  let cur: Point[] = [];
  for (let i = 0; i < pts.length; i++) {
    cur.push(pts[i]);
    if (pts[i].teleport) {
      if (cur.length >= 2) segments.push(cur);
      cur = [];
    }
  }
  if (cur.length >= 2) segments.push(cur);
  return segments;
}

function tracePath(ctx: CanvasRenderingContext2D, segments: Segments) {
  ctx.beginPath();
  for (const seg of segments) {
    ctx.moveTo(seg[0].x, seg[0].y);
    for (let i = 1; i < seg.length - 1; i++) {
      const a = seg[i];
      const b = seg[i + 1];
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      ctx.quadraticCurveTo(a.x, a.y, mx, my);
    }
    const last = seg[seg.length - 1];
    ctx.lineTo(last.x, last.y);
  }
}

/**
 * Neon — wide halo + glow + sticker outline + saturated core + white highlight.
 * Used for both the guide (sticker=false) and the default player stroke (sticker=true).
 */
export function renderNeon(
  ctx: CanvasRenderingContext2D,
  pts: Point[],
  hex: string,
  coreWidth: number,
  intensity: number,
  sticker: boolean,
) {
  if (pts.length < 2) return;
  if (!sticker && intensity <= 0.005) return;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const segments = splitOnTeleport(pts);
  if (segments.length === 0) return;
  const stroke = () => tracePath(ctx, segments);

  ctx.shadowBlur = 38;
  ctx.shadowColor = rgba(hex, 0.85 * intensity);
  ctx.strokeStyle = rgba(hex, 0.34 * intensity);
  ctx.lineWidth = coreWidth * 4.5;
  stroke();
  ctx.stroke();

  ctx.shadowBlur = 18;
  ctx.shadowColor = rgba(hex, 1 * intensity);
  ctx.strokeStyle = rgba(hex, 0.72 * intensity);
  ctx.lineWidth = coreWidth * 2;
  stroke();
  ctx.stroke();

  if (sticker) {
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#0a0708';
    ctx.lineWidth = coreWidth + 6;
    stroke();
    ctx.stroke();
  }

  ctx.shadowBlur = sticker ? 4 : 6;
  ctx.shadowColor = rgba(hex, 0.85 * intensity);
  ctx.strokeStyle = hex;
  ctx.lineWidth = coreWidth;
  stroke();
  ctx.stroke();

  if (sticker) {
    ctx.shadowBlur = 0;
    ctx.strokeStyle = tintTowardWhite(hex, 0.7);
    ctx.lineWidth = Math.max(2, coreWidth * 0.3);
    stroke();
    ctx.stroke();
  }

  ctx.shadowBlur = 0;
}

// Hash-based deterministic pseudo-random in [0,1) — same seed → same value, every frame.
function hash01(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

// Walk a smoothed quadratic-curve sampling of the path at uniform arc-length
// intervals. The callback is invoked at each sample with position + tangent.
// `step` is the desired distance between samples (in canvas pixels).
function walkPath(
  segments: Segments,
  step: number,
  cb: (x: number, y: number, tx: number, ty: number, totalIdx: number) => void,
) {
  if (step <= 0) return;
  let idx = 0;
  for (const seg of segments) {
    if (seg.length < 2) continue;
    let acc = 0;
    let prev = seg[0];
    cb(prev.x, prev.y, 0, 0, idx++);
    for (let i = 1; i < seg.length; i++) {
      const cur = seg[i];
      const dx = cur.x - prev.x;
      const dy = cur.y - prev.y;
      const len = Math.hypot(dx, dy);
      if (len <= 0) {
        prev = cur;
        continue;
      }
      acc += len;
      while (acc >= step) {
        const back = acc - step;
        const t = 1 - back / len;
        const x = prev.x + dx * t;
        const y = prev.y + dy * t;
        cb(x, y, dx / len, dy / len, idx++);
        acc -= step;
      }
      prev = cur;
    }
  }
}

function drawFourPointStar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  inner = 0.32,
) {
  const ri = r * inner;
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.lineTo(x + ri, y - ri);
  ctx.lineTo(x + r, y);
  ctx.lineTo(x + ri, y + ri);
  ctx.lineTo(x, y + r);
  ctx.lineTo(x - ri, y + ri);
  ctx.lineTo(x - r, y);
  ctx.lineTo(x - ri, y - ri);
  ctx.closePath();
  ctx.fill();
}

/**
 * Graphite — three jittered "hairs" along the stroke + paper grain dots.
 * Stacks low-alpha layers so doubled-back lines darken naturally.
 */
function renderPencil(
  ctx: CanvasRenderingContext2D,
  pts: Point[],
  hex: string,
  coreWidth: number,
  intensity: number,
) {
  if (pts.length < 2) return;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const segments = splitOnTeleport(pts);
  if (segments.length === 0) return;

  const dark = tintTowardBlack(hex, 0.7);
  const mid = tintTowardBlack(hex, 0.45);
  const soft = tintTowardWhite(hex, 0.4);

  // Soft underlay wash — gives the line some body and bleed
  ctx.shadowBlur = 0;
  ctx.strokeStyle = rgba(soft, 0.22 * intensity);
  ctx.lineWidth = coreWidth * 1.1;
  tracePath(ctx, segments);
  ctx.stroke();

  // Three offset graphite "hairs" at slightly different perpendicular offsets
  const hairs: Array<{ off: number; alpha: number; width: number; tone: string }> = [
    { off: -0.18, alpha: 0.55, width: 0.5, tone: dark },
    { off: 0.0, alpha: 0.85, width: 0.6, tone: dark },
    { off: 0.22, alpha: 0.5, width: 0.45, tone: mid },
  ];

  for (const hair of hairs) {
    for (const seg of segments) {
      ctx.strokeStyle = rgba(hair.tone, hair.alpha * intensity);
      ctx.lineWidth = coreWidth * hair.width;
      ctx.beginPath();
      for (let i = 0; i < seg.length; i++) {
        const p = seg[i];
        const prev = seg[Math.max(0, i - 1)];
        const next = seg[Math.min(seg.length - 1, i + 1)];
        const dx = next.x - prev.x;
        const dy = next.y - prev.y;
        const len = Math.hypot(dx, dy) || 1;
        const nx = -dy / len;
        const ny = dx / len;
        // Tiny per-point jitter so the hair feels hand-held, not perfectly parallel
        const jitter = (hash01(i * 7.31 + hair.off * 91) - 0.5) * coreWidth * 0.18;
        const off = (hair.off * coreWidth) + jitter;
        const x = p.x + nx * off;
        const y = p.y + ny * off;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }

  // Paper grain — small dark dots sprinkled around the stroke
  ctx.fillStyle = rgba(dark, 0.42 * intensity);
  for (const seg of segments) {
    for (let i = 0; i < seg.length; i += 1) {
      const p = seg[i];
      const prev = seg[Math.max(0, i - 1)];
      const next = seg[Math.min(seg.length - 1, i + 1)];
      const dx = next.x - prev.x;
      const dy = next.y - prev.y;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len;
      const ny = dx / len;
      for (let k = 0; k < 2; k++) {
        const seed = i * 13 + k * 91;
        const offN = (hash01(seed) - 0.5) * coreWidth * 1.4;
        const offT = (hash01(seed + 7) - 0.5) * coreWidth * 0.6;
        const x = p.x + nx * offN + (dx / len) * offT;
        const y = p.y + ny * offN + (dy / len) * offT;
        ctx.fillRect(x, y, 0.9, 0.9);
      }
    }
  }
}

/**
 * Calligraphy ink — variable-width tapered stroke + wet endpoint blots.
 * Width tapers in/out at the ends like a real brush, with a darker bleed band
 * just inside the core line.
 */
function renderInk(
  ctx: CanvasRenderingContext2D,
  pts: Point[],
  hex: string,
  coreWidth: number,
  intensity: number,
) {
  if (pts.length < 2) return;
  const segments = splitOnTeleport(pts);
  if (segments.length === 0) return;

  const dark = tintTowardBlack(hex, 0.55);
  const deep = tintTowardBlack(hex, 0.8);
  const shine = tintTowardWhite(hex, 0.7);

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.shadowBlur = 0;

  // Bleed shadow underneath the body
  ctx.strokeStyle = rgba(deep, 0.4 * intensity);
  ctx.lineWidth = coreWidth * 1.55;
  tracePath(ctx, segments);
  ctx.stroke();

  // Variable-width body — taper near the endpoints of each segment
  for (const seg of segments) {
    const n = seg.length;
    for (let i = 1; i < n; i++) {
      const a = seg[i - 1];
      const b = seg[i];
      const t = i / Math.max(1, n - 1);
      // Quadratic ease that bulges in the middle, tapers at both ends
      const taper = Math.sin(t * Math.PI);
      const w = coreWidth * (0.45 + 0.85 * taper);
      ctx.strokeStyle = rgba(dark, intensity);
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
  }

  // Inner highlight stripe — gives the brush life
  ctx.strokeStyle = rgba(shine, 0.55 * intensity);
  ctx.lineWidth = Math.max(1, coreWidth * 0.18);
  tracePath(ctx, segments);
  ctx.stroke();

  // Wet ink blots at start & end of each segment
  for (const seg of segments) {
    for (const e of [seg[0], seg[seg.length - 1]]) {
      const r = coreWidth * 0.95;
      const grad = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, r);
      grad.addColorStop(0, rgba(deep, 0.95 * intensity));
      grad.addColorStop(0.6, rgba(dark, 0.7 * intensity));
      grad.addColorStop(1, rgba(dark, 0));
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(e.x, e.y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Splatter — tiny ink specks anchored near the endpoints
  ctx.fillStyle = rgba(deep, 0.7 * intensity);
  for (const seg of segments) {
    for (const anchor of [seg[0], seg[seg.length - 1]]) {
      for (let k = 0; k < 4; k++) {
        const a = hash01(anchor.x * 0.31 + anchor.y * 0.17 + k * 11) * Math.PI * 2;
        const d = hash01(anchor.x * 0.07 + anchor.y * 0.41 + k * 37) * coreWidth * 1.8 + coreWidth * 0.6;
        const r = 0.6 + hash01(k * 53 + anchor.x) * 1.4;
        ctx.beginPath();
        ctx.arc(anchor.x + Math.cos(a) * d, anchor.y + Math.sin(a) * d, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

/**
 * Chalk — multiple offset streak lines (chalk is fibrous lengthwise) plus a
 * heavy halo of dust particles drifting off the stroke.
 */
function renderChalk(
  ctx: CanvasRenderingContext2D,
  pts: Point[],
  hex: string,
  coreWidth: number,
  intensity: number,
) {
  if (pts.length < 2) return;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const segments = splitOnTeleport(pts);
  if (segments.length === 0) return;

  const pastel = tintTowardWhite(hex, 0.55);
  const bright = tintTowardWhite(hex, 0.75);
  const deep = hex;

  // Soft outer dust halo
  ctx.shadowBlur = 12;
  ctx.shadowColor = rgba(pastel, 0.4 * intensity);
  ctx.strokeStyle = rgba(pastel, 0.3 * intensity);
  ctx.lineWidth = coreWidth * 1.4;
  tracePath(ctx, segments);
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Streaks: 5 thin offset lines with broken alpha — gives the fibrous look
  const streaks: Array<{ off: number; alpha: number; tone: string }> = [
    { off: -0.36, alpha: 0.45, tone: pastel },
    { off: -0.16, alpha: 0.7, tone: bright },
    { off: 0.0, alpha: 0.95, tone: bright },
    { off: 0.18, alpha: 0.6, tone: deep },
    { off: 0.34, alpha: 0.4, tone: pastel },
  ];

  for (const streak of streaks) {
    for (const seg of segments) {
      ctx.strokeStyle = rgba(streak.tone, streak.alpha * intensity);
      ctx.lineWidth = Math.max(0.7, coreWidth * 0.18);
      ctx.beginPath();
      for (let i = 0; i < seg.length; i++) {
        const p = seg[i];
        const prev = seg[Math.max(0, i - 1)];
        const next = seg[Math.min(seg.length - 1, i + 1)];
        const dx = next.x - prev.x;
        const dy = next.y - prev.y;
        const len = Math.hypot(dx, dy) || 1;
        const nx = -dy / len;
        const ny = dx / len;
        // Break the streak with periodic alpha gaps via hash — simulates dry chalk skips
        const skip = hash01(i * 5.7 + streak.off * 23) < 0.08;
        if (skip && i > 0) {
          ctx.stroke();
          ctx.beginPath();
          continue;
        }
        const x = p.x + nx * streak.off * coreWidth;
        const y = p.y + ny * streak.off * coreWidth;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }

  // Heavy dust scatter — small specks drifting outward from the path
  for (const seg of segments) {
    for (let i = 0; i < seg.length; i += 1) {
      const p = seg[i];
      const prev = seg[Math.max(0, i - 1)];
      const next = seg[Math.min(seg.length - 1, i + 1)];
      const dx = next.x - prev.x;
      const dy = next.y - prev.y;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len;
      const ny = dx / len;
      for (let k = 0; k < 5; k++) {
        const seed = i * 17 + k * 91;
        const offN = (hash01(seed) - 0.5) * coreWidth * 3.0;
        const offT = (hash01(seed + 11) - 0.5) * coreWidth * 0.7;
        const tone = k % 2 === 0 ? bright : pastel;
        const a = 0.18 + hash01(seed + 23) * 0.3;
        const r = 0.7 + hash01(seed + 41) * 1.1;
        ctx.fillStyle = rgba(tone, a * intensity);
        ctx.beginPath();
        ctx.arc(
          p.x + nx * offN + (dx / len) * offT,
          p.y + ny * offN + (dy / len) * offT,
          r,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
    }
  }
}

/**
 * Arcade Pixel — chunky stamps with shadow + highlight cells, plus a chunky
 * pixel halo behind for that CRT bloom feel.
 */
function renderPixel(
  ctx: CanvasRenderingContext2D,
  pts: Point[],
  hex: string,
  coreWidth: number,
  intensity: number,
) {
  if (pts.length < 2) return;
  const segments = splitOnTeleport(pts);
  if (segments.length === 0) return;

  const stamp = Math.max(6, Math.round(coreWidth * 1.05));
  const step = stamp * 0.92;
  const hi = tintTowardWhite(hex, 0.75);
  const sh = tintTowardBlack(hex, 0.55);

  // CRT bloom halo — soft glow behind the whole line via shadow blur
  ctx.shadowBlur = 18;
  ctx.shadowColor = rgba(hex, 0.7 * intensity);
  ctx.fillStyle = rgba(hex, 0);
  // Stamp invisible squares purely so the shadow blur paints — single line below.
  walkPath(segments, step, (x, y) => {
    ctx.fillStyle = rgba(hex, 0.0);
    ctx.fillRect(Math.round(x - stamp / 2), Math.round(y - stamp / 2), stamp, stamp);
  });

  // Render real pixel stamps on top
  ctx.shadowBlur = 0;
  walkPath(segments, step, (x, y) => {
    const sx = Math.round(x - stamp / 2);
    const sy = Math.round(y - stamp / 2);
    // Outer dark cell (1px outline)
    ctx.fillStyle = '#0a0708';
    ctx.fillRect(sx - 1, sy - 1, stamp + 2, stamp + 2);
    // Bright body
    ctx.fillStyle = rgba(hex, intensity);
    ctx.fillRect(sx, sy, stamp, stamp);
    // Bottom-right shadow band
    ctx.fillStyle = rgba(sh, 0.85 * intensity);
    ctx.fillRect(sx + Math.floor(stamp * 0.55), sy + Math.floor(stamp * 0.55), Math.ceil(stamp * 0.45), Math.ceil(stamp * 0.45));
    // Top-left highlight cell
    ctx.fillStyle = rgba(hi, 0.95 * intensity);
    const hsz = Math.max(2, Math.floor(stamp * 0.32));
    ctx.fillRect(sx, sy, hsz, hsz);
    // Single bright corner pixel
    ctx.fillStyle = '#fff5e0';
    ctx.fillRect(sx + 1, sy + 1, Math.max(1, Math.floor(stamp * 0.18)), Math.max(1, Math.floor(stamp * 0.18)));
  });
}

/**
 * Candy Stripe — wide stroke filled with a rotated tile pattern of two-color
 * diagonal bands. True barber-pole feel along the path.
 */
let candyPatternCache: { hexA: string; hexB: string; canvas: HTMLCanvasElement } | null = null;
function buildCandyPattern(hexA: string, hexB: string): HTMLCanvasElement {
  if (
    candyPatternCache &&
    candyPatternCache.hexA === hexA &&
    candyPatternCache.hexB === hexB
  ) {
    return candyPatternCache.canvas;
  }
  const size = 16;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const cctx = c.getContext('2d')!;
  cctx.fillStyle = hexA;
  cctx.fillRect(0, 0, size, size);
  cctx.fillStyle = hexB;
  // Two diagonal stripes at 45deg
  cctx.save();
  cctx.translate(size / 2, size / 2);
  cctx.rotate(Math.PI / 4);
  cctx.fillRect(-size, -size / 4, size * 2, size / 2);
  cctx.restore();
  candyPatternCache = { hexA, hexB, canvas: c };
  return c;
}

function renderRibbon(
  ctx: CanvasRenderingContext2D,
  pts: Point[],
  hex: string,
  coreWidth: number,
  intensity: number,
) {
  if (pts.length < 2) return;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const segments = splitOnTeleport(pts);
  if (segments.length === 0) return;

  const stripeA = hex;
  const stripeB = tintTowardWhite(hex, 0.85);

  // Black sticker outline
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#0a0708';
  ctx.lineWidth = coreWidth + 6;
  tracePath(ctx, segments);
  ctx.stroke();

  // Soft halo
  ctx.shadowBlur = 14;
  ctx.shadowColor = rgba(hex, 0.7 * intensity);

  // Patterned stripe body
  const pattern = buildCandyPattern(stripeA, stripeB);
  const stripePattern = ctx.createPattern(pattern, 'repeat');
  if (stripePattern) {
    ctx.strokeStyle = stripePattern;
    ctx.globalAlpha = intensity;
    ctx.lineWidth = coreWidth * 1.05;
    tracePath(ctx, segments);
    ctx.stroke();
    ctx.globalAlpha = 1;
  } else {
    // Pattern unsupported — fallback to a flat color
    ctx.strokeStyle = rgba(stripeA, intensity);
    ctx.lineWidth = coreWidth * 1.05;
    tracePath(ctx, segments);
    ctx.stroke();
  }

  // Glossy top-edge highlight — thin offset stripe of bright tone
  ctx.shadowBlur = 0;
  for (const seg of segments) {
    ctx.strokeStyle = rgba('#ffffff', 0.55 * intensity);
    ctx.lineWidth = Math.max(1.2, coreWidth * 0.22);
    ctx.beginPath();
    for (let i = 0; i < seg.length; i++) {
      const p = seg[i];
      const prev = seg[Math.max(0, i - 1)];
      const next = seg[Math.min(seg.length - 1, i + 1)];
      const dx = next.x - prev.x;
      const dy = next.y - prev.y;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len;
      const ny = dx / len;
      const off = -coreWidth * 0.32;
      const x = p.x + nx * off;
      const y = p.y + ny * off;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}

/**
 * Prism — multi-layer iridescent gradient with sparkle stars sprinkled along
 * the path. Each layer is the same gradient at a different scale so the
 * colors stack into something lush and shimmery rather than flat rainbow.
 */
function renderRainbow(
  ctx: CanvasRenderingContext2D,
  pts: Point[],
  _hex: string,
  coreWidth: number,
  intensity: number,
) {
  if (pts.length < 2) return;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const segments = splitOnTeleport(pts);
  if (segments.length === 0) return;

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of pts) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  if (maxX - minX < 1) maxX = minX + 1;
  if (maxY - minY < 1) maxY = minY + 1;

  const makeGrad = (offset: number) => {
    const g = ctx.createLinearGradient(minX, minY, maxX, maxY);
    const stops = [
      '#ff3da4',
      '#ff7a3d',
      '#ffe83d',
      '#a4ff3d',
      '#3df0ff',
      '#a44dff',
      '#ff3da4',
    ];
    for (let i = 0; i < stops.length; i++) {
      const t = (i / (stops.length - 1) + offset) % 1;
      g.addColorStop(i / (stops.length - 1), stops[Math.floor(t * (stops.length - 1)) % stops.length]);
    }
    return g;
  };

  // Outer halo
  ctx.shadowBlur = 32;
  ctx.shadowColor = 'rgba(255, 232, 61, 0.7)';
  ctx.globalAlpha = 0.4 * intensity;
  ctx.strokeStyle = makeGrad(0);
  ctx.lineWidth = coreWidth * 3.4;
  tracePath(ctx, segments);
  ctx.stroke();

  // Sticker outline
  ctx.shadowBlur = 0;
  ctx.globalAlpha = intensity;
  ctx.strokeStyle = '#0a0708';
  ctx.lineWidth = coreWidth + 5;
  tracePath(ctx, segments);
  ctx.stroke();

  // Two offset gradient layers — creates iridescent shift
  ctx.strokeStyle = makeGrad(0);
  ctx.lineWidth = coreWidth * 1.05;
  tracePath(ctx, segments);
  ctx.stroke();

  ctx.globalCompositeOperation = 'screen';
  ctx.strokeStyle = makeGrad(0.33);
  ctx.lineWidth = coreWidth * 0.7;
  ctx.globalAlpha = 0.6 * intensity;
  tracePath(ctx, segments);
  ctx.stroke();
  ctx.globalCompositeOperation = 'source-over';

  // White core shine
  ctx.globalAlpha = intensity;
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = Math.max(1.5, coreWidth * 0.22);
  tracePath(ctx, segments);
  ctx.stroke();

  // Sparkle stars at sampled points
  const sparkles = ['#ffe83d', '#3df0ff', '#ff3da4', '#a44dff', '#a4ff3d'];
  let sparkleIdx = 0;
  walkPath(segments, coreWidth * 4.5, (x, y, _tx, _ty, idx) => {
    if (idx % 2 !== 0) return;
    const r = coreWidth * (0.45 + hash01(idx * 7.7) * 0.35);
    const off = (hash01(idx * 13.3) - 0.5) * coreWidth * 1.2;
    const a = (idx * 91) % sparkles.length;
    ctx.shadowBlur = 8;
    ctx.shadowColor = sparkles[a];
    ctx.fillStyle = sparkles[a];
    drawFourPointStar(ctx, x + off, y + off, r);
    sparkleIdx++;
    void sparkleIdx;
  });

  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
}

/**
 * Comet — twinkling stardust tail with a hot 4-pointed-star head.
 * Tail brightness rises toward the head and tiny stars pepper the trail.
 */
function renderComet(
  ctx: CanvasRenderingContext2D,
  pts: Point[],
  hex: string,
  coreWidth: number,
  intensity: number,
) {
  if (pts.length < 2) return;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const segments = splitOnTeleport(pts);
  if (segments.length === 0) return;

  const total = pts.length;
  const head = pts[pts.length - 1];

  // Tail halo — bigger, soft, alpha rises toward head
  ctx.shadowBlur = 18;
  ctx.shadowColor = rgba(hex, 0.7 * intensity);
  let runningIdx = 0;
  for (const seg of segments) {
    for (let i = 1; i < seg.length; i++) {
      runningIdx++;
      const a = seg[i - 1];
      const b = seg[i];
      const t = runningIdx / Math.max(1, total - 1);
      const alpha = Math.pow(t, 1.3) * intensity;
      ctx.strokeStyle = rgba(hex, 0.5 * alpha);
      ctx.lineWidth = coreWidth * (0.7 + 1.6 * t);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
  }

  // Bright core
  ctx.shadowBlur = 8;
  runningIdx = 0;
  for (const seg of segments) {
    for (let i = 1; i < seg.length; i++) {
      runningIdx++;
      const a = seg[i - 1];
      const b = seg[i];
      const t = runningIdx / Math.max(1, total - 1);
      const alpha = (0.2 + 0.8 * t) * intensity;
      ctx.strokeStyle = rgba(tintTowardWhite(hex, 0.5 * t), alpha);
      ctx.lineWidth = coreWidth * (0.5 + 0.55 * t);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
  }

  // Twinkling stardust along the tail
  ctx.shadowBlur = 0;
  walkPath(segments, coreWidth * 2.5, (x, y, _tx, _ty, idx) => {
    const t = idx / Math.max(1, total / 6);
    const tt = Math.min(1, t);
    if (hash01(idx * 5.3) > tt * 0.7 + 0.2) return;
    const off = (hash01(idx * 11.1) - 0.5) * coreWidth * 1.6;
    const offT = (hash01(idx * 19.7) - 0.5) * coreWidth * 0.8;
    const r = 0.6 + hash01(idx * 31) * 1.2;
    ctx.fillStyle = rgba(tintTowardWhite(hex, 0.7), 0.85 * intensity);
    ctx.beginPath();
    ctx.arc(x + off, y + offT, r, 0, Math.PI * 2);
    ctx.fill();
  });

  // Hot head — radial halo
  const headR = coreWidth * 2.4;
  const headGrad = ctx.createRadialGradient(head.x, head.y, 0, head.x, head.y, headR);
  headGrad.addColorStop(0, rgba(tintTowardWhite(hex, 0.95), intensity));
  headGrad.addColorStop(0.45, rgba(hex, 0.85 * intensity));
  headGrad.addColorStop(1, rgba(hex, 0));
  ctx.fillStyle = headGrad;
  ctx.beginPath();
  ctx.arc(head.x, head.y, headR, 0, Math.PI * 2);
  ctx.fill();

  // 4-point star sparkle at the head
  ctx.shadowBlur = 14;
  ctx.shadowColor = rgba(tintTowardWhite(hex, 0.9), intensity);
  ctx.fillStyle = rgba(tintTowardWhite(hex, 0.95), intensity);
  drawFourPointStar(ctx, head.x, head.y, coreWidth * 1.4, 0.22);
  ctx.shadowBlur = 0;
}

/**
 * Nebula — overlapping cloud puffs in three colors drifting around a soft
 * core line. Each puff is a low-alpha radial gradient so they layer into a
 * dreamy gas trail.
 */
function renderNebula(
  ctx: CanvasRenderingContext2D,
  pts: Point[],
  hex: string,
  coreWidth: number,
  intensity: number,
) {
  if (pts.length < 2) return;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const segments = splitOnTeleport(pts);
  if (segments.length === 0) return;

  const palette = [hex, tintTowardWhite('#a44dff', 0.15), tintTowardWhite('#ff3da4', 0.2)];

  // Cloud puffs along path
  walkPath(segments, coreWidth * 0.9, (x, y, tx, ty, idx) => {
    const tone = palette[idx % palette.length];
    const r = coreWidth * (1.4 + hash01(idx * 3.3) * 1.2);
    const nx = -ty;
    const ny = tx;
    const off = (hash01(idx * 7.7) - 0.5) * coreWidth * 1.8;
    const cx = x + nx * off;
    const cy = y + ny * off;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    grad.addColorStop(0, rgba(tone, 0.5 * intensity));
    grad.addColorStop(0.55, rgba(tone, 0.15 * intensity));
    grad.addColorStop(1, rgba(tone, 0));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  });

  // Soft white core line for definition
  ctx.shadowBlur = 8;
  ctx.shadowColor = rgba(tintTowardWhite(hex, 0.9), 0.7 * intensity);
  ctx.strokeStyle = rgba(tintTowardWhite(hex, 0.9), 0.85 * intensity);
  ctx.lineWidth = Math.max(1.5, coreWidth * 0.32);
  tracePath(ctx, segments);
  ctx.stroke();

  // Tiny pinprick stars sprinkled around the cloud
  ctx.shadowBlur = 0;
  walkPath(segments, coreWidth * 2.2, (x, y, tx, ty, idx) => {
    if (hash01(idx * 11) < 0.5) return;
    const nx = -ty;
    const ny = tx;
    const off = (hash01(idx * 17) - 0.5) * coreWidth * 3.5;
    ctx.fillStyle = rgba('#ffffff', 0.85 * intensity);
    ctx.beginPath();
    ctx.arc(x + nx * off, y + ny * off, 0.9 + hash01(idx * 23) * 0.7, 0, Math.PI * 2);
    ctx.fill();
  });
}

/**
 * Constellation — connect-the-stars. Thin dotted line connects 4-pointed
 * star nodes along the path, each with a glowing halo.
 */
function renderConstellation(
  ctx: CanvasRenderingContext2D,
  pts: Point[],
  hex: string,
  coreWidth: number,
  intensity: number,
) {
  if (pts.length < 2) return;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const segments = splitOnTeleport(pts);
  if (segments.length === 0) return;

  const star = tintTowardWhite(hex, 0.85);

  // Dotted connector line
  ctx.setLineDash([2, 4]);
  ctx.strokeStyle = rgba(tintTowardWhite(hex, 0.5), 0.55 * intensity);
  ctx.lineWidth = Math.max(1, coreWidth * 0.22);
  tracePath(ctx, segments);
  ctx.stroke();
  ctx.setLineDash([]);

  // Star nodes at sampled intervals
  const stepDist = Math.max(coreWidth * 2.2, 14);
  walkPath(segments, stepDist, (x, y, _tx, _ty, idx) => {
    const r = coreWidth * (0.7 + hash01(idx * 13.7) * 0.45);

    // Halo
    const halo = ctx.createRadialGradient(x, y, 0, x, y, r * 2.8);
    halo.addColorStop(0, rgba(star, 0.55 * intensity));
    halo.addColorStop(0.5, rgba(hex, 0.25 * intensity));
    halo.addColorStop(1, rgba(hex, 0));
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(x, y, r * 2.8, 0, Math.PI * 2);
    ctx.fill();

    // Star shape
    ctx.shadowBlur = 8;
    ctx.shadowColor = rgba(star, intensity);
    ctx.fillStyle = rgba(star, intensity);
    drawFourPointStar(ctx, x, y, r, 0.2);
    ctx.shadowBlur = 0;

    // Bright core dot
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x, y, r * 0.32, 0, Math.PI * 2);
    ctx.fill();
  });
}

/**
 * Laser — sci-fi beam. Wide soft halo, bright tinted band, blistering white
 * core, with a few electrical sparks scattered along the path.
 */
function renderLaser(
  ctx: CanvasRenderingContext2D,
  pts: Point[],
  hex: string,
  coreWidth: number,
  intensity: number,
) {
  if (pts.length < 2) return;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const segments = splitOnTeleport(pts);
  if (segments.length === 0) return;

  const tinted = tintTowardWhite(hex, 0.4);
  const hot = tintTowardWhite(hex, 0.85);

  // Wide diffuse outer glow
  ctx.shadowBlur = 36;
  ctx.shadowColor = rgba(hex, intensity);
  ctx.strokeStyle = rgba(hex, 0.18 * intensity);
  ctx.lineWidth = coreWidth * 4.2;
  tracePath(ctx, segments);
  ctx.stroke();

  // Mid halo
  ctx.shadowBlur = 18;
  ctx.shadowColor = rgba(hex, intensity);
  ctx.strokeStyle = rgba(hex, 0.6 * intensity);
  ctx.lineWidth = coreWidth * 2.0;
  tracePath(ctx, segments);
  ctx.stroke();

  // Saturated tinted band
  ctx.shadowBlur = 8;
  ctx.shadowColor = rgba(tinted, intensity);
  ctx.strokeStyle = rgba(tinted, 0.95 * intensity);
  ctx.lineWidth = coreWidth * 0.95;
  tracePath(ctx, segments);
  ctx.stroke();

  // Searing white core
  ctx.shadowBlur = 6;
  ctx.shadowColor = rgba(hot, intensity);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(1.2, coreWidth * 0.28);
  tracePath(ctx, segments);
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Electrical sparks — short perpendicular jolts at random anchor points
  ctx.strokeStyle = rgba(hot, intensity);
  ctx.lineWidth = 1.2;
  walkPath(segments, coreWidth * 3.5, (x, y, tx, ty, idx) => {
    if (hash01(idx * 7.31) > 0.5) return;
    const nx = -ty;
    const ny = tx;
    const len = coreWidth * (0.7 + hash01(idx * 13) * 0.9);
    const dir = hash01(idx * 23) > 0.5 ? 1 : -1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + nx * len * dir, y + ny * len * dir);
    ctx.stroke();

    // Tiny spark dot at the tip
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x + nx * len * dir, y + ny * len * dir, 1.1, 0, Math.PI * 2);
    ctx.fill();
  });
}

/**
 * Render a player stroke in the selected paint style. Sticker-mode neon is
 * the default; other styles produce alternative looks but always tint with
 * the supplied accent color (except `rainbow`, which ignores it).
 */
export function renderPaintStroke(
  ctx: CanvasRenderingContext2D,
  pts: Point[],
  color: string,
  coreWidth: number,
  intensity: number,
  styleId: PaintStyleId,
) {
  ctx.save();
  switch (styleId) {
    case 'pencil':
      renderPencil(ctx, pts, color, coreWidth, intensity);
      break;
    case 'ink':
      renderInk(ctx, pts, color, coreWidth, intensity);
      break;
    case 'chalk':
      renderChalk(ctx, pts, color, coreWidth, intensity);
      break;
    case 'pixel':
      renderPixel(ctx, pts, color, coreWidth, intensity);
      break;
    case 'ribbon':
      renderRibbon(ctx, pts, color, coreWidth, intensity);
      break;
    case 'rainbow':
      renderRainbow(ctx, pts, color, coreWidth, intensity);
      break;
    case 'comet':
      renderComet(ctx, pts, color, coreWidth, intensity);
      break;
    case 'nebula':
      renderNebula(ctx, pts, color, coreWidth, intensity);
      break;
    case 'constellation':
      renderConstellation(ctx, pts, color, coreWidth, intensity);
      break;
    case 'laser':
      renderLaser(ctx, pts, color, coreWidth, intensity);
      break;
    case 'neon':
    default:
      renderNeon(ctx, pts, color, coreWidth, intensity, true);
      break;
  }
  ctx.restore();
}

/** Generate a smooth sample arc for picker preview swatches. */
export function samplePreviewPath(width: number, height: number): Point[] {
  const pts: Point[] = [];
  const padX = width * 0.12;
  const padY = height * 0.5;
  const steps = 28;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = padX + (width - padX * 2) * t;
    const y = padY + Math.sin(t * Math.PI * 1.6) * (height * 0.28);
    pts.push({ x, y });
  }
  return pts;
}
