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

  // Both paths must live in the same coordinate space for the distance metric
  // to be meaningful. The target was generated with a visual padding (~6%) so
  // it could be drawn inside a padded canvas; strip that here so a flawless
  // trace can actually hit 0 distance instead of being capped by the padding
  // offset.
  const playerNorm = normalizeToUnit(flatPath);
  const targetNorm = normalizeToUnit(targetUnitPath);
  const playerSampled = resamplePath(playerNorm, RESAMPLE_N);
  const targetSampled = resamplePath(targetNorm, RESAMPLE_N);

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
    // Closed shapes require parametric order: the rotation-aligned distance is
    // the source of truth. Hausdorff is allowed to win only when it's clearly
    // close to rotationDist (within 10%) — this keeps the original
    // self-intersecting / figure-8 edge case forgiving while shutting the door
    // on nonsense scribbles whose rotationDist is much worse than their
    // unordered point-set distance. Reverse-direction tracing is already
    // handled inside `bestRotationOffset` (it tries reversed sequences too),
    // so we don't lose that case here.
    // No Hausdorff slack on closed shapes anymore — rotation-aligned distance
    // is the only thing that counts. Going off the outline now hurts in
    // proportion to how far you wander, not "averaged out across nearby
    // target points."
    avgDist = rotationDist;
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

  // Bumped from 220 → 300: every unit of off-outline distance costs ~36% more
  // shape score. A 0.10-normalized average miss now drops the base score from
  // 78 → 70; a 0.20 miss from 56 → 40.
  let score = Math.max(0, 100 - avgDist * 300);

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
  } else if (lenRatio > 1.6) {
    // Tightened from 2.4 → 1.6 with a steeper falloff. A scribble with 2x the
    // expected path length now costs ~30% (was ~0%); 3x costs ~55% (was ~25%).
    score *= Math.max(0.4, 1.6 / lenRatio);
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
  // Trigger lowered from 8× → 3×, scaling multiplier instead of a flat 0.92.
  // A path that turns 4× more than expected now costs ~10%; 6× costs ~30%;
  // 10× (genuine scribble) costs ~70%.
  if (avgTurn > expectedTurn * 3) {
    const overshoot = avgTurn / expectedTurn - 3;
    score *= Math.max(0.3, 1 - overshoot * 0.1);
  }

  return Math.round(Math.max(0, Math.min(100, score)));
}

export interface ScorePacerInput {
  playerPath: Point[];
  targetUnitPath: Point[];
  shape: ShapeType;
  syncRatio: number; // 0..1 — fraction of run spent within pacer halo
  pacerFinished: boolean;
  challengeId: string;
  targetTime: number;
  elapsed: number;
}

/**
 * Score a Chapter 5 (Pulse) attempt. Primary metric is the rolling sync ratio
 * between player stroke head and the pacer comet. Shape accuracy is folded in
 * as a multiplier so paths that drift wildly off the guide while still
 * matching the pacer's speed don't score full marks.
 */
export function scorePacerAttempt({
  playerPath,
  targetUnitPath,
  shape,
  syncRatio,
  pacerFinished,
  challengeId,
  targetTime,
  elapsed,
}: ScorePacerInput): AttemptResult {
  const tShape = scoreShape(playerPath, targetUnitPath, shape);
  const syncScore = Math.round(Math.max(0, Math.min(1, syncRatio)) * 100);
  // Shape acts as a 60/40 multiplier on the sync score: at shape=100, no
  // penalty; at shape=0, sync is halved. Stops players from getting a perfect
  // score by pacing without actually drawing the shape.
  const shapeMultiplier = 0.6 + 0.4 * (tShape / 100);
  let final = Math.round(syncScore * shapeMultiplier);
  // Soft penalty for not letting the pacer finish (player ended stroke early).
  if (!pacerFinished) final = Math.round(final * 0.9);
  return {
    challengeId,
    shapeScore: tShape,
    timingScore: syncScore, // re-using the timingScore slot to carry sync %
    finalScore: final,
    targetTime,
    actualTime: elapsed,
    timeDelta: elapsed - targetTime,
    playerPath,
    targetPath: targetUnitPath,
    grade: gradeFor(final),
    syncRatio,
  };
}

/**
 * Score a single cursive-letter trace. Uses Hausdorff distance on
 * bbox-normalized resampled paths, plus a length-ratio sanity check so a
 * one-pixel tap can't pass. Returns 0..100. Intentionally more forgiving
 * than scoreShape — letters have weird parametric properties (open paths,
 * sharp corners, descenders) and the gameplay needs a low floor for advance.
 */
export function scoreLetterStroke(
  playerPath: Point[],
  letterUnitPath: Point[],
): number {
  if (playerPath.length < 4) return 0;
  const playerNorm = normalizeToUnit(playerPath);
  const targetNorm = normalizeToUnit(letterUnitPath);
  const playerSampled = resamplePath(playerNorm, RESAMPLE_N);
  const targetSampled = resamplePath(targetNorm, RESAMPLE_N);
  // Try both directions — players might trace the letter "backwards" and
  // it should still register.
  const fwd = modifiedHausdorff(playerSampled, targetSampled);
  const rev = modifiedHausdorff(playerSampled.slice().reverse(), targetSampled);
  const dist = Math.min(fwd, rev);
  let score = Math.max(0, 100 - dist * 240);
  // Length sanity: if the player drew nothing close to letter-sized, cap low.
  const playerLen = pathLength(playerPath);
  const targetLen = pathLength(letterUnitPath);
  const playerBB = boundingBox(playerPath);
  const playerSize = Math.max(playerBB.width, playerBB.height);
  const playerRel = playerLen / Math.max(playerSize, 1);
  if (playerRel < targetLen * 0.4) {
    score *= Math.max(0.2, playerRel / Math.max(targetLen * 0.4, 0.0001));
  }
  return Math.round(Math.max(0, Math.min(100, score)));
}

/**
 * Score an Alphabet Rush attempt: total elapsed time → a speed score on a
 * piecewise curve, multiplied by mean per-letter accuracy. Assumes the
 * player completed all letters (the level only ends on completion).
 */
export function scoreAlphabetRush(
  perLetterAccuracy: number[],
  elapsedSeconds: number,
  challengeId: string,
  targetTime: number,
): AttemptResult {
  const meanAccuracy =
    perLetterAccuracy.length > 0
      ? perLetterAccuracy.reduce((a, b) => a + b, 0) / perLetterAccuracy.length
      : 0;
  // Speed curve — generous early, harsh late. Tuned so a clean ~45s run lands
  // around 90 and a pokey 90s run lands around 50.
  let speedScore: number;
  if (elapsedSeconds <= 30) speedScore = 100;
  else if (elapsedSeconds <= 60) speedScore = 100 - ((elapsedSeconds - 30) / 30) * 30; // 100→70
  else if (elapsedSeconds <= 90) speedScore = 70 - ((elapsedSeconds - 60) / 30) * 30; // 70→40
  else if (elapsedSeconds <= 120) speedScore = 40 - ((elapsedSeconds - 90) / 30) * 25; // 40→15
  else speedScore = Math.max(5, 15 - (elapsedSeconds - 120) * 0.2);
  const final = Math.round(speedScore * (meanAccuracy / 100));
  return {
    challengeId,
    shapeScore: Math.round(meanAccuracy),
    timingScore: Math.round(speedScore),
    finalScore: final,
    targetTime,
    actualTime: elapsedSeconds,
    timeDelta: elapsedSeconds - targetTime,
    playerPath: [],
    targetPath: [],
    grade: gradeFor(final),
  };
}

export function combineFinalScore(shape: number, timing: number): number {
  // 70/30 (shape/timing) so a perfect-time scribble can no longer floor at 50.
  // Clean traces stay near the top of the band; nonsense traces lose their
  // free 50-point timing cushion.
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
    Math.round(result.finalScore + Math.max(14, (100 - result.finalScore) * 0.32)),
  );
  return {
    ...result,
    finalScore: biased,
    grade: gradeFor(biased),
  };
}
