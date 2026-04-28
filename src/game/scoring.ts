import type { AttemptResult, Grade, Point, ShapeSegment, ShapeType } from './types';
import {
  bestRotationOffset,
  boundingBox,
  normalizeToUnit,
  pathLength,
  resamplePath,
  splitOnTeleport,
} from './pathUtils';
// (normalizeToUnit also used by scoreMultiShape to put each segment target
//  back into 0..1 space before per-segment Hausdorff scoring.)
import { isClosedShape } from './shapes';

export interface ScoreAttemptInput {
  playerPath: Point[];
  targetUnitPath: Point[];
  shape: ShapeType;
  /** When set, per-segment shape scores are averaged (Constellations chapter). */
  segments?: ShapeSegment[];
  targetTime: number;
  elapsed: number;
  challengeId: string;
  applyTutorial?: boolean;
}

export function scoreAttempt({
  playerPath,
  targetUnitPath,
  shape,
  segments,
  targetTime,
  elapsed,
  challengeId,
  applyTutorial,
}: ScoreAttemptInput): AttemptResult {
  const isMulti = !!segments && segments.length > 1;
  let tShape: number;
  let segmentScores: number[] | undefined;
  if (isMulti) {
    const out = scoreMultiShape(playerPath, targetUnitPath, segments!);
    tShape = out.average;
    segmentScores = out.perSegment;
  } else {
    tShape = scoreShape(playerPath, targetUnitPath, shape);
  }
  const tTime = Math.round(timingScore(elapsed, targetTime));
  const final = combineFinalScore(tShape, tTime);
  let result: AttemptResult = {
    challengeId,
    shapeScore: tShape,
    timingScore: tTime,
    finalScore: final,
    targetTime,
    actualTime: elapsed,
    timeDelta: elapsed - targetTime,
    playerPath,
    targetPath: targetUnitPath,
    grade: gradeFor(final),
    segmentScores,
  };
  if (applyTutorial) result = applyTutorialBias(result);
  return result;
}

/**
 * Score a multi-shape attempt by splitting both player and target paths on
 * teleport markers, scoring each segment against its own shape, and averaging
 * the per-segment shape scores. A missing/too-short player segment counts as 0.
 */
function scoreMultiShape(
  playerPath: Point[],
  targetUnitPath: Point[],
  segments: ShapeSegment[],
): { average: number; perSegment: number[] } {
  const playerSegs = splitOnTeleport(playerPath);
  const targetSegs = splitOnTeleport(targetUnitPath);
  const perSegment: number[] = [];
  for (let i = 0; i < segments.length; i++) {
    const target = targetSegs[i];
    const player = playerSegs[i];
    if (!target || target.length < 4 || !player || player.length < 4) {
      perSegment.push(0);
      continue;
    }
    // Re-normalize this segment's target to its own bbox so it fills 0..1.
    // Without this we'd compare a segment target cramped inside a small
    // sub-region of unit space against a player path that scoreShape will
    // bbox-normalize to fill 0..1 — Hausdorff would explode.
    const targetNormalized = normalizeToUnit(target);
    perSegment.push(scoreShape(player, targetNormalized, segments[i].shape));
  }
  const sum = perSegment.reduce((a, b) => a + b, 0);
  const average = Math.round(sum / Math.max(1, segments.length));
  return { average, perSegment };
}

const RESAMPLE_N = 64;

function modifiedHausdorff(a: Point[], b: Point[]): number {
  let aToB = 0;
  for (const p of a) {
    let min = Infinity;
    for (const q of b) {
      const d = (p.x - q.x) * (p.x - q.x) + (p.y - q.y) * (p.y - q.y);
      if (d < min) min = d;
    }
    aToB += Math.sqrt(min);
  }
  let bToA = 0;
  for (const p of b) {
    let min = Infinity;
    for (const q of a) {
      const d = (p.x - q.x) * (p.x - q.x) + (p.y - q.y) * (p.y - q.y);
      if (d < min) min = d;
    }
    bToA += Math.sqrt(min);
  }
  // Symmetric average — penalises both player-drawn segments far from target
  // AND target segments not covered by the player.
  return (aToB / a.length + bToA / b.length) / 2;
}

export function timingScore(actualTime: number, targetTime: number): number {
  return Math.max(0, 100 - Math.abs(actualTime - targetTime) * 32);
}

export function scoreShape(
  playerPath: Point[],
  targetUnitPath: Point[],
  shape: ShapeType,
): number {
  if (playerPath.length < 4) return 0;

  // Strip teleport markers AND collapse sub-paths into one continuous polyline
  // for resampling purposes (the gap between entry and exit is omitted).
  const subPaths = splitOnTeleport(playerPath);
  const flatPath: Point[] =
    subPaths.length > 1
      ? subPaths.reduce<Point[]>((acc, seg) => {
          for (const p of seg) acc.push({ x: p.x, y: p.y, t: p.t });
          return acc;
        }, [])
      : playerPath.map((p) => ({ x: p.x, y: p.y, t: p.t }));

  const playerNorm = normalizeToUnit(flatPath);
  const playerSampled = resamplePath(playerNorm, RESAMPLE_N);
  const targetSampled = resamplePath(targetUnitPath, RESAMPLE_N);

  const closed = isClosedShape(shape);
  let avgDist = 0;

  // Order-independent shape similarity: for each player sample, find the
  // closest target sample (and vice versa), average the two means. This is
  // the modified Hausdorff distance — works for any shape including
  // self-intersecting ones (infinity, figure-8) where parametric ordering
  // differs between target generator and how a human draws it.
  const hausdorff = modifiedHausdorff(playerSampled, targetSampled);

  if (closed) {
    const { offset, reverse } = bestRotationOffset(playerSampled, targetSampled);
    const seq = reverse ? playerSampled.slice().reverse() : playerSampled;
    let sum = 0;
    for (let i = 0; i < RESAMPLE_N; i++) {
      const a = seq[(i + offset) % RESAMPLE_N];
      const b = targetSampled[i];
      sum += Math.hypot(a.x - b.x, a.y - b.y);
    }
    const rotationDist = sum / RESAMPLE_N;
    // Take whichever metric is more forgiving — Hausdorff for shapes the
    // player drew in a different parametric direction; rotation-aligned
    // for sharp polygons where order matters.
    avgDist = Math.min(rotationDist, hausdorff);
  } else {
    let sumFwd = 0;
    let sumRev = 0;
    const reversed = playerSampled.slice().reverse();
    for (let i = 0; i < RESAMPLE_N; i++) {
      sumFwd += Math.hypot(
        playerSampled[i].x - targetSampled[i].x,
        playerSampled[i].y - targetSampled[i].y,
      );
      sumRev += Math.hypot(
        reversed[i].x - targetSampled[i].x,
        reversed[i].y - targetSampled[i].y,
      );
    }
    const directional = Math.min(sumFwd, sumRev) / RESAMPLE_N;
    avgDist = Math.min(directional, hausdorff);
  }

  let score = Math.max(0, 100 - avgDist * 220);

  const playerLen = pathLength(playerPath);
  const playerBB = boundingBox(playerPath);
  const targetLen = pathLength(targetUnitPath);

  const playerSize = Math.max(playerBB.width, playerBB.height);
  if (playerSize < 60) {
    score *= Math.max(0.55, playerSize / 60);
  }

  const expectedRel = targetLen;
  const playerRel = playerLen / Math.max(playerSize, 1);
  const lenRatio = playerRel / Math.max(expectedRel, 0.0001);
  if (lenRatio < 0.5) {
    score *= 0.7 + lenRatio * 0.6;
  } else if (lenRatio > 2.4) {
    score *= Math.max(0.75, 2.4 / lenRatio);
  }

  if (closed) {
    const start = playerPath[0];
    const end = playerPath[playerPath.length - 1];
    const closureDist = Math.hypot(end.x - start.x, end.y - start.y);
    const closureRel = closureDist / Math.max(playerSize, 1);
    if (closureRel > 0.22) {
      score *= Math.max(0.85, 1 - (closureRel - 0.22) * 1.0);
    }
  }

  let jagSum = 0;
  let jagN = 0;
  for (let i = 2; i < playerPath.length; i++) {
    const a = playerPath[i - 2];
    const b = playerPath[i - 1];
    const c = playerPath[i];
    const v1x = b.x - a.x;
    const v1y = b.y - a.y;
    const v2x = c.x - b.x;
    const v2y = c.y - b.y;
    const m1 = Math.hypot(v1x, v1y);
    const m2 = Math.hypot(v2x, v2y);
    if (m1 > 0 && m2 > 0) {
      const cos = (v1x * v2x + v1y * v2y) / (m1 * m2);
      const angle = Math.acos(Math.max(-1, Math.min(1, cos)));
      jagSum += angle;
      jagN++;
    }
  }
  const avgTurn = jagN > 0 ? jagSum / jagN : 0;
  const expectedTurn = closed ? (Math.PI * 2) / RESAMPLE_N : Math.PI / RESAMPLE_N;
  if (avgTurn > expectedTurn * 8) {
    score *= 0.92;
  }

  return Math.round(Math.max(0, Math.min(100, score)));
}

export function combineFinalScore(shape: number, timing: number): number {
  return Math.round(shape * 0.5 + timing * 0.5);
}

export function gradeFor(finalScore: number): Grade {
  if (finalScore >= 98) return 'Perfect';
  if (finalScore >= 90) return 'Elite';
  if (finalScore >= 75) return 'Great';
  if (finalScore >= 50) return 'Close';
  return 'Miss';
}

export function applyTutorialBias(result: AttemptResult): AttemptResult {
  const biased = Math.min(
    100,
    Math.round(result.finalScore + Math.max(14, (100 - result.finalScore) * 0.32)),
  );
  return {
    ...result,
    finalScore: biased,
    grade: gradeFor(biased),
  };
}
