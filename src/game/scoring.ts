import type { AttemptResult, Grade, Point, ShapeType } from './types';
import {
  bestRotationOffset,
  boundingBox,
  normalizeToUnit,
  pathLength,
  resamplePath,
} from './pathUtils';
import { isClosedShape } from './shapes';

const RESAMPLE_N = 64;

export function timingScore(actualTime: number, targetTime: number): number {
  return Math.max(0, 100 - Math.abs(actualTime - targetTime) * 40);
}

export function scoreShape(
  playerPath: Point[],
  targetUnitPath: Point[],
  shape: ShapeType,
): number {
  if (playerPath.length < 4) return 0;

  const playerNorm = normalizeToUnit(playerPath);
  const playerSampled = resamplePath(playerNorm, RESAMPLE_N);
  const targetSampled = resamplePath(targetUnitPath, RESAMPLE_N);

  const closed = isClosedShape(shape);
  let avgDist = 0;

  if (closed) {
    const { offset, reverse } = bestRotationOffset(playerSampled, targetSampled);
    const seq = reverse ? playerSampled.slice().reverse() : playerSampled;
    let sum = 0;
    for (let i = 0; i < RESAMPLE_N; i++) {
      const a = seq[(i + offset) % RESAMPLE_N];
      const b = targetSampled[i];
      sum += Math.hypot(a.x - b.x, a.y - b.y);
    }
    avgDist = sum / RESAMPLE_N;
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
    avgDist = Math.min(sumFwd, sumRev) / RESAMPLE_N;
  }

  let score = Math.max(0, 100 - avgDist * 360);

  const playerLen = pathLength(playerPath);
  const playerBB = boundingBox(playerPath);
  const targetLen = pathLength(targetUnitPath);

  const playerSize = Math.max(playerBB.width, playerBB.height);
  if (playerSize < 60) {
    score *= Math.max(0.4, playerSize / 60);
  }

  const expectedRel = targetLen;
  const playerRel = playerLen / Math.max(playerSize, 1);
  const lenRatio = playerRel / Math.max(expectedRel, 0.0001);
  if (lenRatio < 0.55) {
    score *= 0.55 + lenRatio * 0.45;
  } else if (lenRatio > 2.2) {
    score *= Math.max(0.6, 2.2 / lenRatio);
  }

  if (closed) {
    const start = playerPath[0];
    const end = playerPath[playerPath.length - 1];
    const closureDist = Math.hypot(end.x - start.x, end.y - start.y);
    const closureRel = closureDist / Math.max(playerSize, 1);
    if (closureRel > 0.18) {
      score *= Math.max(0.7, 1 - (closureRel - 0.18) * 1.6);
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
  if (avgTurn > expectedTurn * 6) {
    score *= 0.85;
  }

  return Math.round(Math.max(0, Math.min(100, score)));
}

export function combineFinalScore(shape: number, timing: number): number {
  return Math.round(shape * 0.7 + timing * 0.3);
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
    Math.round(result.finalScore + Math.max(8, (100 - result.finalScore) * 0.18)),
  );
  return {
    ...result,
    finalScore: biased,
    grade: gradeFor(biased),
  };
}
