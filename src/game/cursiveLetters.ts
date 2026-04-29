import type { Point } from './types';

/**
 * Hand-tuned cursive lowercase letters for the Alphabet Rush bonus level.
 * Each letter is a list of control points in unit-local space [0, 1] × [0, 1]
 * (y-down, canvas convention). Control points are smoothed through a
 * centripetal Catmull-Rom spline so the rendered glyph flows like cursive
 * handwriting rather than reading as a chain of straight segments.
 *
 * Conventions inside each letter's normalized box:
 *   y = 0.10  → ascender top (b, d, f, h, k, l, t)
 *   y = 0.34  → x-height top
 *   y = 0.55  → midline
 *   y = 0.78  → baseline
 *   y = 0.94  → descender bottom (f, g, j, p, q, y, z)
 *
 * For glyphs that traditionally lift the pen (i/j dots, t crossbar, x cross),
 * we collapse them into a single flowing stroke. The result is recognizable
 * but not strictly orthographic.
 */

const SAMPLES = 110;

// ---------------------------------------------------------------------------
// Letter control points. Designed to flow when smoothed by Catmull-Rom.
// Ascender letters include a small backward loop at the top; descender
// letters include a forward curl at the bottom — both are signature cursive
// features that read clearly even at small sizes.
// ---------------------------------------------------------------------------

const LETTERS: Record<string, Point[]> = {
  // Bowl traced counter-clockwise from upper-right, then exit tail.
  a: [
    { x: 0.86, y: 0.40 },
    { x: 0.74, y: 0.32 },
    { x: 0.52, y: 0.30 },
    { x: 0.30, y: 0.36 },
    { x: 0.18, y: 0.52 },
    { x: 0.18, y: 0.68 },
    { x: 0.30, y: 0.80 },
    { x: 0.50, y: 0.82 },
    { x: 0.68, y: 0.76 },
    { x: 0.78, y: 0.62 },
    { x: 0.78, y: 0.42 },
    { x: 0.78, y: 0.74 },
    { x: 0.86, y: 0.82 },
    { x: 0.96, y: 0.74 },
  ],
  // Ascender with a small loop at top, then the bowl.
  b: [
    { x: 0.20, y: 0.80 },
    { x: 0.18, y: 0.40 },
    { x: 0.20, y: 0.18 },
    { x: 0.30, y: 0.10 },
    { x: 0.36, y: 0.18 },
    { x: 0.28, y: 0.30 },
    { x: 0.22, y: 0.50 },
    { x: 0.30, y: 0.50 },
    { x: 0.50, y: 0.46 },
    { x: 0.70, y: 0.52 },
    { x: 0.80, y: 0.66 },
    { x: 0.74, y: 0.78 },
    { x: 0.54, y: 0.84 },
    { x: 0.32, y: 0.78 },
    { x: 0.42, y: 0.82 },
    { x: 0.92, y: 0.82 },
  ],
  // Open arc with a soft entry curl.
  c: [
    { x: 0.92, y: 0.42 },
    { x: 0.78, y: 0.34 },
    { x: 0.56, y: 0.30 },
    { x: 0.32, y: 0.34 },
    { x: 0.16, y: 0.50 },
    { x: 0.12, y: 0.66 },
    { x: 0.22, y: 0.80 },
    { x: 0.46, y: 0.86 },
    { x: 0.72, y: 0.84 },
    { x: 0.90, y: 0.74 },
  ],
  // Bowl + ascender (right side) + small finishing tail.
  d: [
    { x: 0.66, y: 0.42 },
    { x: 0.52, y: 0.32 },
    { x: 0.34, y: 0.32 },
    { x: 0.18, y: 0.46 },
    { x: 0.16, y: 0.66 },
    { x: 0.28, y: 0.80 },
    { x: 0.50, y: 0.84 },
    { x: 0.68, y: 0.74 },
    { x: 0.72, y: 0.40 },
    { x: 0.74, y: 0.20 },
    { x: 0.78, y: 0.10 },
    { x: 0.74, y: 0.32 },
    { x: 0.74, y: 0.78 },
    { x: 0.86, y: 0.84 },
    { x: 0.96, y: 0.76 },
  ],
  // Cursive 'e' = a small upward-spiral loop.
  e: [
    { x: 0.20, y: 0.60 },
    { x: 0.36, y: 0.54 },
    { x: 0.56, y: 0.52 },
    { x: 0.70, y: 0.56 },
    { x: 0.66, y: 0.42 },
    { x: 0.46, y: 0.34 },
    { x: 0.24, y: 0.42 },
    { x: 0.14, y: 0.60 },
    { x: 0.20, y: 0.78 },
    { x: 0.42, y: 0.86 },
    { x: 0.68, y: 0.82 },
    { x: 0.88, y: 0.70 },
  ],
  // Cursive 'f' — single flowing stroke. Top: small loop curling back left
  // around the ascender peak. Body: long vertical through x-height to baseline.
  // Bottom: small forward loop at the descender, exiting to the right. No
  // separate crossbar — collapsed into the form so it stays one stroke.
  f: [
    { x: 0.32, y: 0.34 },
    { x: 0.42, y: 0.20 },
    { x: 0.54, y: 0.12 },
    { x: 0.64, y: 0.20 },
    { x: 0.58, y: 0.32 },
    { x: 0.48, y: 0.42 },
    { x: 0.46, y: 0.56 },
    { x: 0.46, y: 0.70 },
    { x: 0.44, y: 0.84 },
    { x: 0.36, y: 0.94 },
    { x: 0.22, y: 0.94 },
    { x: 0.14, y: 0.86 },
    { x: 0.20, y: 0.78 },
    { x: 0.36, y: 0.76 },
    { x: 0.58, y: 0.78 },
    { x: 0.78, y: 0.78 },
    { x: 0.92, y: 0.74 },
  ],
  // Bowl + descender that loops forward.
  g: [
    { x: 0.78, y: 0.42 },
    { x: 0.62, y: 0.32 },
    { x: 0.40, y: 0.34 },
    { x: 0.22, y: 0.46 },
    { x: 0.18, y: 0.66 },
    { x: 0.30, y: 0.78 },
    { x: 0.54, y: 0.80 },
    { x: 0.72, y: 0.72 },
    { x: 0.78, y: 0.42 },
    { x: 0.80, y: 0.78 },
    { x: 0.74, y: 0.92 },
    { x: 0.52, y: 0.96 },
    { x: 0.30, y: 0.90 },
    { x: 0.22, y: 0.78 },
  ],
  // Ascender with small top loop, then descending hump.
  h: [
    { x: 0.16, y: 0.84 },
    { x: 0.18, y: 0.50 },
    { x: 0.22, y: 0.20 },
    { x: 0.32, y: 0.12 },
    { x: 0.38, y: 0.20 },
    { x: 0.30, y: 0.32 },
    { x: 0.24, y: 0.54 },
    { x: 0.32, y: 0.46 },
    { x: 0.50, y: 0.40 },
    { x: 0.66, y: 0.46 },
    { x: 0.70, y: 0.62 },
    { x: 0.70, y: 0.80 },
    { x: 0.84, y: 0.86 },
    { x: 0.94, y: 0.78 },
  ],
  // Soft entry stroke into a tall vertical (no dot in single-stroke form).
  i: [
    { x: 0.20, y: 0.62 },
    { x: 0.32, y: 0.50 },
    { x: 0.42, y: 0.40 },
    { x: 0.46, y: 0.50 },
    { x: 0.46, y: 0.74 },
    { x: 0.56, y: 0.84 },
    { x: 0.78, y: 0.82 },
    { x: 0.92, y: 0.74 },
  ],
  // Tall stroke that curls into a descender loop.
  j: [
    { x: 0.62, y: 0.32 },
    { x: 0.62, y: 0.50 },
    { x: 0.60, y: 0.74 },
    { x: 0.56, y: 0.88 },
    { x: 0.42, y: 0.94 },
    { x: 0.24, y: 0.92 },
    { x: 0.14, y: 0.82 },
    { x: 0.20, y: 0.74 },
  ],
  // Ascender + bow-and-leg (k's signature angle).
  k: [
    { x: 0.18, y: 0.84 },
    { x: 0.18, y: 0.50 },
    { x: 0.22, y: 0.22 },
    { x: 0.32, y: 0.12 },
    { x: 0.40, y: 0.20 },
    { x: 0.30, y: 0.34 },
    { x: 0.22, y: 0.60 },
    { x: 0.40, y: 0.54 },
    { x: 0.62, y: 0.40 },
    { x: 0.50, y: 0.52 },
    { x: 0.36, y: 0.66 },
    { x: 0.62, y: 0.78 },
    { x: 0.84, y: 0.84 },
  ],
  // Tall ascender with a clear loop at top.
  l: [
    { x: 0.22, y: 0.66 },
    { x: 0.26, y: 0.40 },
    { x: 0.30, y: 0.20 },
    { x: 0.40, y: 0.10 },
    { x: 0.46, y: 0.18 },
    { x: 0.38, y: 0.32 },
    { x: 0.30, y: 0.56 },
    { x: 0.32, y: 0.74 },
    { x: 0.46, y: 0.84 },
    { x: 0.70, y: 0.84 },
    { x: 0.92, y: 0.74 },
  ],
  // Three rounded humps.
  m: [
    { x: 0.06, y: 0.84 },
    { x: 0.10, y: 0.50 },
    { x: 0.16, y: 0.36 },
    { x: 0.26, y: 0.34 },
    { x: 0.32, y: 0.46 },
    { x: 0.34, y: 0.78 },
    { x: 0.36, y: 0.46 },
    { x: 0.46, y: 0.34 },
    { x: 0.56, y: 0.36 },
    { x: 0.62, y: 0.50 },
    { x: 0.62, y: 0.78 },
    { x: 0.66, y: 0.46 },
    { x: 0.78, y: 0.34 },
    { x: 0.88, y: 0.40 },
    { x: 0.92, y: 0.62 },
    { x: 0.92, y: 0.80 },
    { x: 0.98, y: 0.84 },
  ],
  // Two rounded humps.
  n: [
    { x: 0.16, y: 0.84 },
    { x: 0.18, y: 0.46 },
    { x: 0.26, y: 0.34 },
    { x: 0.40, y: 0.34 },
    { x: 0.48, y: 0.46 },
    { x: 0.50, y: 0.78 },
    { x: 0.54, y: 0.46 },
    { x: 0.66, y: 0.34 },
    { x: 0.78, y: 0.40 },
    { x: 0.84, y: 0.54 },
    { x: 0.84, y: 0.78 },
    { x: 0.94, y: 0.84 },
  ],
  // Closed bowl with a tiny finishing hairline at the top-right.
  o: [
    { x: 0.74, y: 0.36 },
    { x: 0.50, y: 0.32 },
    { x: 0.28, y: 0.40 },
    { x: 0.16, y: 0.56 },
    { x: 0.20, y: 0.74 },
    { x: 0.38, y: 0.84 },
    { x: 0.62, y: 0.84 },
    { x: 0.80, y: 0.74 },
    { x: 0.84, y: 0.56 },
    { x: 0.74, y: 0.38 },
    { x: 0.86, y: 0.34 },
  ],
  // Descender stem + bowl on right.
  p: [
    { x: 0.16, y: 0.94 },
    { x: 0.20, y: 0.66 },
    { x: 0.22, y: 0.40 },
    { x: 0.20, y: 0.32 },
    { x: 0.32, y: 0.32 },
    { x: 0.54, y: 0.32 },
    { x: 0.74, y: 0.40 },
    { x: 0.82, y: 0.54 },
    { x: 0.74, y: 0.70 },
    { x: 0.54, y: 0.78 },
    { x: 0.32, y: 0.74 },
    { x: 0.22, y: 0.64 },
  ],
  // Bowl + forward-curling descender.
  q: [
    { x: 0.78, y: 0.42 },
    { x: 0.60, y: 0.32 },
    { x: 0.36, y: 0.34 },
    { x: 0.20, y: 0.48 },
    { x: 0.18, y: 0.66 },
    { x: 0.32, y: 0.80 },
    { x: 0.56, y: 0.80 },
    { x: 0.72, y: 0.72 },
    { x: 0.74, y: 0.40 },
    { x: 0.80, y: 0.78 },
    { x: 0.86, y: 0.92 },
    { x: 0.96, y: 0.92 },
  ],
  // Small hump with a tick.
  r: [
    { x: 0.18, y: 0.84 },
    { x: 0.20, y: 0.56 },
    { x: 0.30, y: 0.38 },
    { x: 0.40, y: 0.32 },
    { x: 0.52, y: 0.40 },
    { x: 0.50, y: 0.50 },
    { x: 0.62, y: 0.44 },
    { x: 0.78, y: 0.40 },
    { x: 0.90, y: 0.46 },
  ],
  // Snake curve — tilted upper bowl, lower bowl reversed.
  s: [
    { x: 0.78, y: 0.40 },
    { x: 0.60, y: 0.32 },
    { x: 0.40, y: 0.34 },
    { x: 0.28, y: 0.46 },
    { x: 0.36, y: 0.58 },
    { x: 0.58, y: 0.62 },
    { x: 0.74, y: 0.70 },
    { x: 0.74, y: 0.80 },
    { x: 0.58, y: 0.86 },
    { x: 0.36, y: 0.84 },
    { x: 0.18, y: 0.74 },
  ],
  // Ascender + crossbar (single-stroke approximation).
  t: [
    { x: 0.40, y: 0.20 },
    { x: 0.42, y: 0.40 },
    { x: 0.42, y: 0.66 },
    { x: 0.50, y: 0.80 },
    { x: 0.66, y: 0.84 },
    { x: 0.84, y: 0.78 },
    { x: 0.42, y: 0.40 },
    { x: 0.22, y: 0.40 },
    { x: 0.66, y: 0.40 },
  ],
  // Two verticals connected at the bottom, with finishing tail.
  u: [
    { x: 0.18, y: 0.36 },
    { x: 0.18, y: 0.56 },
    { x: 0.22, y: 0.74 },
    { x: 0.34, y: 0.84 },
    { x: 0.50, y: 0.82 },
    { x: 0.62, y: 0.68 },
    { x: 0.66, y: 0.46 },
    { x: 0.66, y: 0.34 },
    { x: 0.66, y: 0.74 },
    { x: 0.74, y: 0.84 },
    { x: 0.92, y: 0.82 },
  ],
  // Sharp angle at the bottom.
  v: [
    { x: 0.16, y: 0.34 },
    { x: 0.22, y: 0.50 },
    { x: 0.36, y: 0.72 },
    { x: 0.50, y: 0.84 },
    { x: 0.64, y: 0.72 },
    { x: 0.78, y: 0.50 },
    { x: 0.84, y: 0.34 },
    { x: 0.92, y: 0.42 },
  ],
  // Two angles.
  w: [
    { x: 0.06, y: 0.36 },
    { x: 0.16, y: 0.66 },
    { x: 0.28, y: 0.84 },
    { x: 0.40, y: 0.66 },
    { x: 0.50, y: 0.46 },
    { x: 0.60, y: 0.66 },
    { x: 0.72, y: 0.84 },
    { x: 0.84, y: 0.66 },
    { x: 0.94, y: 0.36 },
    { x: 0.98, y: 0.46 },
  ],
  // Cursive 'x' — single-stroke approximation of the two crossing diagonals.
  // Trace the / from top-left to bottom-right, hook around the right edge,
  // then trace the \ from top-right back down to bottom-left. The two
  // diagonals cross in the middle just like a real x. The right-side hook is
  // the one cheat that lets it stay one stroke.
  x: [
    { x: 0.18, y: 0.34 },
    { x: 0.32, y: 0.46 },
    { x: 0.50, y: 0.60 },
    { x: 0.66, y: 0.74 },
    { x: 0.80, y: 0.86 },
    { x: 0.90, y: 0.80 },
    { x: 0.92, y: 0.66 },
    { x: 0.92, y: 0.50 },
    { x: 0.86, y: 0.38 },
    { x: 0.74, y: 0.46 },
    { x: 0.58, y: 0.58 },
    { x: 0.42, y: 0.70 },
    { x: 0.26, y: 0.82 },
    { x: 0.16, y: 0.88 },
  ],
  // U-shape that flows into a descending curl.
  y: [
    { x: 0.18, y: 0.34 },
    { x: 0.20, y: 0.52 },
    { x: 0.30, y: 0.74 },
    { x: 0.46, y: 0.82 },
    { x: 0.62, y: 0.72 },
    { x: 0.66, y: 0.46 },
    { x: 0.66, y: 0.34 },
    { x: 0.68, y: 0.66 },
    { x: 0.66, y: 0.84 },
    { x: 0.56, y: 0.94 },
    { x: 0.36, y: 0.96 },
    { x: 0.20, y: 0.88 },
  ],
  // Top horizontal + diagonal + descender curl.
  z: [
    { x: 0.18, y: 0.36 },
    { x: 0.40, y: 0.34 },
    { x: 0.62, y: 0.34 },
    { x: 0.78, y: 0.36 },
    { x: 0.62, y: 0.50 },
    { x: 0.42, y: 0.66 },
    { x: 0.24, y: 0.78 },
    { x: 0.40, y: 0.80 },
    { x: 0.62, y: 0.82 },
    { x: 0.78, y: 0.86 },
    { x: 0.74, y: 0.94 },
    { x: 0.58, y: 0.96 },
  ],
};

// ---------------------------------------------------------------------------
// Spline interpolation — centripetal Catmull-Rom through control points,
// then resampled at uniform arc length so paths render smoothly and the
// scoring metric (which assumes uniform sampling) stays well-behaved.
// ---------------------------------------------------------------------------

function catmullRomDense(points: Point[]): Point[] {
  if (points.length < 2) return points.slice();
  if (points.length === 2) {
    // Two points → straight line; sample many points along it.
    const out: Point[] = [];
    const steps = 24;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      out.push({
        x: points[0].x + (points[1].x - points[0].x) * t,
        y: points[0].y + (points[1].y - points[0].y) * t,
      });
    }
    return out;
  }
  // Pad endpoints so the spline reaches the first and last control points.
  const pts = [points[0], ...points, points[points.length - 1]];
  const out: Point[] = [];
  const STEPS = 22; // samples per segment before arc-length resampling
  for (let i = 1; i < pts.length - 2; i++) {
    const p0 = pts[i - 1];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2];
    for (let s = 0; s <= STEPS; s++) {
      // Skip duplicate join point between consecutive segments.
      if (s === 0 && i > 1) continue;
      const t = s / STEPS;
      const t2 = t * t;
      const t3 = t2 * t;
      // Standard Catmull-Rom basis (uniform parameterization, 0.5 tension).
      const x =
        0.5 *
        (2 * p1.x +
          (-p0.x + p2.x) * t +
          (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
          (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3);
      const y =
        0.5 *
        (2 * p1.y +
          (-p0.y + p2.y) * t +
          (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
          (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3);
      out.push({ x, y });
    }
  }
  return out;
}

/** Resample a dense polyline at `samples + 1` uniform arc-length steps. */
function resampleByArcLength(dense: Point[], samples: number): Point[] {
  if (dense.length < 2) return dense.slice();
  const segLengths: number[] = [];
  let total = 0;
  for (let i = 1; i < dense.length; i++) {
    const len = Math.hypot(dense[i].x - dense[i - 1].x, dense[i].y - dense[i - 1].y);
    segLengths.push(len);
    total += len;
  }
  if (total === 0) return [dense[0]];
  const out: Point[] = [];
  for (let i = 0; i <= samples; i++) {
    let target = (i / samples) * total;
    let segIdx = 0;
    while (segIdx < segLengths.length - 1 && target > segLengths[segIdx]) {
      target -= segLengths[segIdx];
      segIdx++;
    }
    const t = segLengths[segIdx] === 0 ? 0 : target / segLengths[segIdx];
    const a = dense[segIdx];
    const b = dense[segIdx + 1];
    out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
  }
  return out;
}

/**
 * Generate the unit-space path for a cursive lowercase letter. Returns a
 * smooth Catmull-Rom spline through the letter's control points, resampled
 * uniformly to ~110 points.
 */
export function cursiveLetterPath(letter: string): Point[] {
  const key = letter.toLowerCase();
  const def = LETTERS[key];
  if (!def) {
    return resampleByArcLength(
      catmullRomDense([
        { x: 0.2, y: 0.5 },
        { x: 0.8, y: 0.5 },
      ]),
      SAMPLES,
    );
  }
  return resampleByArcLength(catmullRomDense(def), SAMPLES);
}

export const ALPHABET_LOWERCASE = 'abcdefghijklmnopqrstuvwxyz'.split('');
