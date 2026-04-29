import type { SavedGameState } from './types';
import { DEFAULT_PAINT_STYLE, isPaintStyleId } from './paintStyles';

const KEY = 'timetrace-state-v1';

function generateUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // RFC 4122 v4 fallback
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function makeDefaultState(): SavedGameState {
  return {
    playerId: generateUuid(),
    playerName: '',
    hasCompletedTutorial: false,
    tutorialAttempts: 0,
    currentChallengeIndex: 0,
    bestScoresByChallenge: {},
    previousAttemptByChallenge: {},
    attemptCountByChallenge: {},
    currentStreak: 0,
    paintStyleId: DEFAULT_PAINT_STYLE,
  };
}

export function loadState(): SavedGameState {
  if (typeof window === 'undefined') return makeDefaultState();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return makeDefaultState();
    const parsed = JSON.parse(raw);
    const merged: SavedGameState = { ...makeDefaultState(), ...parsed };
    // Ensure playerId is always present even if older save lacks it.
    if (!merged.playerId) merged.playerId = generateUuid();
    if (typeof merged.playerName !== 'string') merged.playerName = '';
    if (!isPaintStyleId(merged.paintStyleId)) merged.paintStyleId = DEFAULT_PAINT_STYLE;
    return merged;
  } catch {
    return makeDefaultState();
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
  return makeDefaultState();
}

export function resetState(): SavedGameState {
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(KEY);
    } catch {
      /* noop */
    }
  }
  return makeDefaultState();
}
