import type { AttemptResult, Challenge, PortalPair, ShapeType } from './types';

export const SHAPE_ACCENT: Record<ShapeType, { stroke: string; soft: string }> = {
  circle: { stroke: '#00f0ff', soft: 'rgba(0, 240, 255, 0.55)' },
  square: { stroke: '#5b8cff', soft: 'rgba(91, 140, 255, 0.55)' },
  triangle: { stroke: '#ff4dd2', soft: 'rgba(255, 77, 210, 0.55)' },
  star: { stroke: '#ffb347', soft: 'rgba(255, 179, 71, 0.6)' },
  spiral: { stroke: '#b06bff', soft: 'rgba(176, 107, 255, 0.55)' },
  hexagon: { stroke: '#ff7a3d', soft: 'rgba(255, 122, 61, 0.55)' },
  heart: { stroke: '#ff3da4', soft: 'rgba(255, 61, 164, 0.6)' },
  infinity: { stroke: '#a4ff3d', soft: 'rgba(164, 255, 61, 0.55)' },
  bolt: { stroke: '#ffe83d', soft: 'rgba(255, 232, 61, 0.65)' },
  // Chapter 2 — louder/more saturated accents to distinguish from Ch1
  doubleLoop: { stroke: '#9bff3d', soft: 'rgba(155, 255, 61, 0.55)' },
  sineWave: { stroke: '#3db1ff', soft: 'rgba(61, 177, 255, 0.55)' },
  crescent: { stroke: '#ffaa3d', soft: 'rgba(255, 170, 61, 0.55)' },
  cube: { stroke: '#ff3d6e', soft: 'rgba(255, 61, 110, 0.55)' },
  squareInCircle: { stroke: '#3dffd2', soft: 'rgba(61, 255, 210, 0.55)' },
  trefoil: { stroke: '#d23dff', soft: 'rgba(210, 61, 255, 0.55)' },
  mapleLeaf: { stroke: '#ff5a3d', soft: 'rgba(255, 90, 61, 0.55)' },
  spring: { stroke: '#3dffaa', soft: 'rgba(61, 255, 170, 0.55)' },
  pretzel: { stroke: '#ffd23d', soft: 'rgba(255, 210, 61, 0.55)' },
  pyramidBolt: { stroke: '#ff3d3d', soft: 'rgba(255, 61, 61, 0.65)' },
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
  /** 1, 2, 3... — used to group on Home and gate access. */
  chapter: number;
  /** Optional portal pairs (paired teleport gates). Unit coords. */
  portals?: PortalPair[];
}

export interface ChapterMeta {
  id: number;
  title: string;
  subtitle: string;
  /** Total points needed before this chapter is even visible. */
  unlockGate: number;
  /** Tagline displayed on the chapter ribbon. */
  blurb: string;
}

export const CHAPTERS: ChapterMeta[] = [
  {
    id: 1,
    title: 'CHAPTER ONE',
    subtitle: 'Foundations',
    unlockGate: 0,
    blurb: 'Trace. Stop. Repeat.',
  },
  {
    id: 2,
    title: 'CHAPTER TWO',
    subtitle: 'Portals',
    unlockGate: 660,
    blurb: 'Step through the rings.',
  },
];

export const CHALLENGES: ChallengeMeta[] = [
  {
    id: 'circle-3',
    shape: 'circle',
    targetTime: 3.0,
    guideOpacity: 0.45,
    difficulty: 'easy',
    unlockThreshold: 0,
    title: 'Round Trip',
    chapter: 1,
  },
  {
    id: 'circle-2_5',
    shape: 'circle',
    targetTime: 2.5,
    guideOpacity: 0.4,
    difficulty: 'easy',
    unlockThreshold: 25,
    title: 'Quick Loop',
    chapter: 1,
  },
  {
    id: 'square-3_5',
    shape: 'square',
    targetTime: 3.5,
    guideOpacity: 0.4,
    difficulty: 'easy',
    unlockThreshold: 65,
    title: 'Four Corners',
    chapter: 1,
  },
  {
    id: 'triangle-4',
    shape: 'triangle',
    targetTime: 4.0,
    guideOpacity: 0.35,
    difficulty: 'medium',
    unlockThreshold: 120,
    title: 'Tri Force',
    chapter: 1,
  },
  {
    id: 'star-5',
    shape: 'star',
    targetTime: 5.0,
    guideOpacity: 0.32,
    difficulty: 'medium',
    unlockThreshold: 185,
    title: 'Five-Point',
    chapter: 1,
  },
  {
    id: 'spiral-6',
    shape: 'spiral',
    targetTime: 6.0,
    guideOpacity: 0.3,
    difficulty: 'hard',
    unlockThreshold: 260,
    title: 'Inward Bound',
    chapter: 1,
  },
  {
    id: 'hexagon-5_5',
    shape: 'hexagon',
    targetTime: 5.5,
    guideOpacity: 0.32,
    difficulty: 'medium',
    unlockThreshold: 345,
    title: 'Six Sides',
    chapter: 1,
  },
  {
    id: 'heart-6',
    shape: 'heart',
    targetTime: 6.0,
    guideOpacity: 0.3,
    difficulty: 'hard',
    unlockThreshold: 440,
    title: 'Heartbeat',
    chapter: 1,
  },
  {
    id: 'infinity-6_5',
    shape: 'infinity',
    targetTime: 6.5,
    guideOpacity: 0.28,
    difficulty: 'hard',
    unlockThreshold: 545,
    title: 'Forever',
    chapter: 1,
  },
  {
    id: 'bolt-7',
    shape: 'bolt',
    targetTime: 7.0,
    guideOpacity: 0.32,
    difficulty: 'hard',
    unlockThreshold: 660,
    title: 'Strike',
    chapter: 1,
  },

  // ---------- Chapter 2 — Portals ----------
  {
    id: 'doubleloop-8',
    shape: 'doubleLoop',
    targetTime: 8.0,
    guideOpacity: 0.32,
    difficulty: 'medium',
    unlockThreshold: 660,
    title: 'Double Trouble',
    chapter: 2,
  },
  {
    id: 'sine-8',
    shape: 'sineWave',
    targetTime: 8.5,
    guideOpacity: 0.32,
    difficulty: 'medium',
    unlockThreshold: 720,
    title: 'Frequency',
    chapter: 2,
  },
  {
    id: 'crescent-9',
    shape: 'crescent',
    targetTime: 9.0,
    guideOpacity: 0.3,
    difficulty: 'medium',
    unlockThreshold: 800,
    title: 'New Moon',
    chapter: 2,
    portals: [
      { entry: { x: 0.42, y: 0.5, r: 0.07 }, exit: { x: 0.7, y: 0.5, r: 0.07 } },
    ],
  },
  {
    id: 'cube-10',
    shape: 'cube',
    targetTime: 10.0,
    guideOpacity: 0.3,
    difficulty: 'hard',
    unlockThreshold: 890,
    title: 'Hypercube',
    chapter: 2,
    portals: [
      { entry: { x: 0.5, y: 0.35, r: 0.07 }, exit: { x: 0.5, y: 0.55, r: 0.07 } },
    ],
  },
  {
    id: 'sqcircle-10',
    shape: 'squareInCircle',
    targetTime: 10.5,
    guideOpacity: 0.3,
    difficulty: 'hard',
    unlockThreshold: 990,
    title: 'Boxed In',
    chapter: 2,
    portals: [
      { entry: { x: 0.5, y: 0.12, r: 0.07 }, exit: { x: 0.5, y: 0.32, r: 0.07 } },
    ],
  },
  {
    id: 'trefoil-11',
    shape: 'trefoil',
    targetTime: 11.0,
    guideOpacity: 0.3,
    difficulty: 'hard',
    unlockThreshold: 1100,
    title: 'Knot Yet',
    chapter: 2,
    portals: [
      { entry: { x: 0.32, y: 0.5, r: 0.07 }, exit: { x: 0.68, y: 0.5, r: 0.07 } },
    ],
  },
  {
    id: 'maple-12',
    shape: 'mapleLeaf',
    targetTime: 12.0,
    guideOpacity: 0.3,
    difficulty: 'hard',
    unlockThreshold: 1220,
    title: 'Autumn',
    chapter: 2,
    portals: [
      { entry: { x: 0.3, y: 0.35, r: 0.06 }, exit: { x: 0.7, y: 0.35, r: 0.06 } },
      { entry: { x: 0.3, y: 0.7, r: 0.06 }, exit: { x: 0.7, y: 0.7, r: 0.06 } },
    ],
  },
  {
    id: 'spring-12',
    shape: 'spring',
    targetTime: 12.5,
    guideOpacity: 0.32,
    difficulty: 'hard',
    unlockThreshold: 1350,
    title: 'Bounce',
    chapter: 2,
    portals: [
      { entry: { x: 0.32, y: 0.5, r: 0.06 }, exit: { x: 0.68, y: 0.5, r: 0.06 } },
    ],
  },
  {
    id: 'pretzel-13',
    shape: 'pretzel',
    targetTime: 13.0,
    guideOpacity: 0.3,
    difficulty: 'hard',
    unlockThreshold: 1490,
    title: 'Twisted',
    chapter: 2,
    portals: [
      { entry: { x: 0.5, y: 0.3, r: 0.06 }, exit: { x: 0.5, y: 0.7, r: 0.06 } },
      { entry: { x: 0.3, y: 0.5, r: 0.06 }, exit: { x: 0.7, y: 0.5, r: 0.06 } },
    ],
  },
  {
    id: 'pyramid-14',
    shape: 'pyramidBolt',
    targetTime: 14.0,
    guideOpacity: 0.32,
    difficulty: 'hard',
    unlockThreshold: 1640,
    title: 'Ascendant',
    chapter: 2,
    portals: [
      { entry: { x: 0.5, y: 0.7, r: 0.06 }, exit: { x: 0.5, y: 0.4, r: 0.06 } },
      { entry: { x: 0.32, y: 0.6, r: 0.06 }, exit: { x: 0.68, y: 0.6, r: 0.06 } },
    ],
  },
];

export function challengesByChapter(chapterId: number): ChallengeMeta[] {
  return CHALLENGES.filter((c) => c.chapter === chapterId);
}

export function chapterUnlocked(chapter: ChapterMeta, totalPoints: number): boolean {
  return totalPoints >= chapter.unlockGate;
}

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
