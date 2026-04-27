import type { SavedGameState } from './types';

const KEY = 'timetrace-state-v1';

const DEFAULT_STATE: SavedGameState = {
  hasCompletedTutorial: false,
  tutorialAttempts: 0,
  currentChallengeIndex: 0,
  bestScoresByChallenge: {},
  previousAttemptByChallenge: {},
  attemptCountByChallenge: {},
  currentStreak: 0,
};

export function loadState(): SavedGameState {
  if (typeof window === 'undefined') return { ...DEFAULT_STATE };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_STATE };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_STATE, ...parsed };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;

export function saveState(state: SavedGameState) {
  if (typeof window === 'undefined') return;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      // ignore quota errors
    }
  }, 80);
}

export function defaultState(): SavedGameState {
  return { ...DEFAULT_STATE };
}

export function resetState(): SavedGameState {
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(KEY);
    } catch {
      /* noop */
    }
  }
  return { ...DEFAULT_STATE };
}
