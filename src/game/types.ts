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
  /**
   * When set, the level runs in Pulse / Pacer Rhythm mode (Chapter 5). A
   * comet travels along the target path at the configured speed; the player
   * must keep their stroke head inside the comet's leniency halo. Scoring
   * shifts from "finish near targetTime" to "% of run spent in sync".
   */
  pacer?: PacerConfig;
  /**
   * When set, the level cycles through this list of glyphs (cursive letters)
   * one at a time. Each glyph must be traced to a minimum accuracy before
   * the next appears. Score is total elapsed time × mean accuracy.
   * (Bonus level — Alphabet Rush.)
   */
  letterSequence?: string[];
}

export interface PacerConfig {
  /** Pacer travel speed in canvas pixels per second. */
  speed: number;
  /** Halo radius in canvas pixels. Stroke head within this distance counts as in-sync. */
  leniency: number;
  /**
   * Speed modulation across the run.
   * - 'flat': constant speed (default)
   * - 'accelerate': starts at 70% speed, ends at 130% speed
   * - 'decelerate': starts at 130% speed, ends at 70% speed
   * - 'pulse': sin-modulated ±25% on a 1.5-second period
   */
  speedCurve?: 'flat' | 'accelerate' | 'decelerate' | 'pulse';
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
  /** For Chapter 5 pacer mode: fraction of the run spent in-sync with the pacer (0..1). */
  syncRatio?: number;
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
