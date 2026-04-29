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
  /**
   * When set, the target shape is shown at full opacity for this many ms
   * before the player can draw; afterwards the guide vanishes and the player
   * traces from memory ("Flash & Trace" mechanic — Chapter 4 BLITZ).
   */
  flashGuideMs?: number;
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

/**
 * One shape inside a multi-shape ("Constellations") challenge. Each segment is
 * generated at unit scale, then transformed into its placement on the canvas.
 * Between segments the target path carries a `teleport` boundary so the line
 * lifts at the portal jump.
 */
export interface ShapeSegment {
  shape: ShapeType;
  /** Center on the canvas in unit coordinates [0,1]. */
  center: { x: number; y: number };
  /** Scale factor — 1.0 fills the canvas; ~0.4 fits two side by side. */
  scale: number;
  /** Optional rotation in radians. */
  rotation?: number;
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
  /** For multi-shape challenges: the per-segment shape score [0..1]. */
  segmentScores?: number[];
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
  paintStyleId: string;
  /** Map of styleId → color swatch id ('accent', 'cyan', etc). Missing entries default to 'accent'. */
  paintColorByStyle: Record<string, string>;
  /** Map of styleId → variant id (e.g. 'diagonal'). Missing entries use the style's default variant. */
  paintVariantByStyle: Record<string, string>;
}
