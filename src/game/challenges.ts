import type { AttemptResult, Challenge, ShapeType } from './types';

export const SHAPE_ACCENT: Record<ShapeType, { stroke: string; soft: string }> = {
  circle: { stroke: '#00f0ff', soft: 'rgba(0, 240, 255, 0.55)' },
  square: { stroke: '#5b8cff', soft: 'rgba(91, 140, 255, 0.55)' },
  triangle: { stroke: '#ff4dd2', soft: 'rgba(255, 77, 210, 0.55)' },
  star: { stroke: '#ffb347', soft: 'rgba(255, 179, 71, 0.6)' },
  spiral: { stroke: '#b06bff', soft: 'rgba(176, 107, 255, 0.55)' },
};

export function accentFor(shape: ShapeType) {
  return SHAPE_ACCENT[shape];
}

export const TUTORIAL_CHALLENGE: Challenge = {
  id: 'tutorial-circle-3',
  shape: 'circle',
  targetTime: 3.0,
  guideOpacity: 0.55,
  difficulty: 'tutorial',
};

export interface ChallengeMeta extends Challenge {
  unlockThreshold: number;
  title: string;
}

export const CHALLENGES: ChallengeMeta[] = [
  {
    id: 'circle-3',
    shape: 'circle',
    targetTime: 3.0,
    guideOpacity: 0.45,
    difficulty: 'easy',
    unlockThreshold: 0,
    title: 'Round Trip',
  },
  {
    id: 'circle-2_5',
    shape: 'circle',
    targetTime: 2.5,
    guideOpacity: 0.4,
    difficulty: 'easy',
    unlockThreshold: 60,
    title: 'Quick Loop',
  },
  {
    id: 'square-3_5',
    shape: 'square',
    targetTime: 3.5,
    guideOpacity: 0.4,
    difficulty: 'easy',
    unlockThreshold: 150,
    title: 'Four Corners',
  },
  {
    id: 'triangle-4',
    shape: 'triangle',
    targetTime: 4.0,
    guideOpacity: 0.35,
    difficulty: 'medium',
    unlockThreshold: 280,
    title: 'Tri Force',
  },
  {
    id: 'star-5',
    shape: 'star',
    targetTime: 5.0,
    guideOpacity: 0.32,
    difficulty: 'medium',
    unlockThreshold: 450,
    title: 'Five-Point',
  },
  {
    id: 'spiral-6',
    shape: 'spiral',
    targetTime: 6.0,
    guideOpacity: 0.3,
    difficulty: 'hard',
    unlockThreshold: 660,
    title: 'Inward Bound',
  },
];

export function challengeAt(index: number): ChallengeMeta {
  if (CHALLENGES.length === 0) throw new Error('no challenges');
  return CHALLENGES[Math.max(0, Math.min(CHALLENGES.length - 1, index))];
}

export function findChallengeIndex(id: string): number {
  return CHALLENGES.findIndex((c) => c.id === id);
}

export function totalPointsFromBests(
  bests: Record<string, AttemptResult>,
): number {
  let total = 0;
  for (const c of CHALLENGES) {
    const b = bests[c.id];
    if (b) total += b.finalScore;
  }
  return total;
}

export function isChallengeUnlocked(
  challenge: ChallengeMeta,
  totalPoints: number,
): boolean {
  return totalPoints >= challenge.unlockThreshold;
}

export function pointsToNextUnlock(totalPoints: number): {
  next: ChallengeMeta | null;
  needed: number;
} {
  for (const c of CHALLENGES) {
    if (totalPoints < c.unlockThreshold) {
      return { next: c, needed: c.unlockThreshold - totalPoints };
    }
  }
  return { next: null, needed: 0 };
}

export function nextUnlockedIndex(
  fromIndex: number,
  totalPoints: number,
): number {
  for (let i = 1; i <= CHALLENGES.length; i++) {
    const idx = (fromIndex + i) % CHALLENGES.length;
    if (isChallengeUnlocked(CHALLENGES[idx], totalPoints)) return idx;
  }
  return fromIndex;
}
