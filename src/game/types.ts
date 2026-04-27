export type ShapeType =
  | 'circle'
  | 'square'
  | 'triangle'
  | 'star'
  | 'spiral'
  | 'hexagon'
  | 'heart'
  | 'infinity'
  | 'bolt'
  // Chapter 2
  | 'doubleLoop'
  | 'sineWave'
  | 'crescent'
  | 'cube'
  | 'squareInCircle'
  | 'trefoil'
  | 'mapleLeaf'
  | 'spring'
  | 'pretzel'
  | 'pyramidBolt';

export type Difficulty = 'tutorial' | 'easy' | 'medium' | 'hard';

export type Grade = 'Perfect' | 'Elite' | 'Great' | 'Close' | 'Miss';

export interface Challenge {
  id: string;
  shape: ShapeType;
  targetTime: number;
  guideOpacity: number;
  difficulty: Difficulty;
}

export interface Point {
  x: number;
  y: number;
  t?: number;
  // True when this point is the LAST point before a portal teleport. The next
  // point in the array is the FIRST point after teleport. Used so renderers
  // and scoring can lift the pen at the gap.
  teleport?: boolean;
}

export interface Portal {
  /**
   * Parametric position along the target path as a fraction in [0, 1].
   * 0 = start of path, 1 = end. Portal sits on the curve at this point and
   * is rendered as a glowing slash perpendicular to the path tangent there.
   */
  pathT: number;
  /** Slash length in unit space. Defaults to ~0.09. */
  length?: number;
}

export interface PortalPair {
  entry: Portal;
  exit: Portal;
}

export interface AttemptResult {
  challengeId: string;
  shapeScore: number;
  timingScore: number;
  finalScore: number;
  targetTime: number;
  actualTime: number;
  timeDelta: number;
  playerPath: Point[];
  targetPath: Point[];
  grade: Grade;
}

export interface SavedGameState {
  playerId: string;
  playerName: string;
  hasCompletedTutorial: boolean;
  tutorialAttempts: number;
  currentChallengeIndex: number;
  bestScoresByChallenge: Record<string, AttemptResult>;
  previousAttemptByChallenge: Record<string, AttemptResult>;
  attemptCountByChallenge: Record<string, number>;
  currentStreak: number;
}
