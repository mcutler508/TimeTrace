export type ShapeType =
  | 'circle'
  | 'square'
  | 'triangle'
  | 'star'
  | 'spiral'
  | 'hexagon'
  | 'heart'
  | 'infinity'
  | 'bolt';

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
