import type { Grade } from './types';

const PREF_KEY = 'timetrace-haptics-v1';

export function isHapticsSupported(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
}

export function getHapticsEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const raw = window.localStorage.getItem(PREF_KEY);
    if (raw == null) return true;
    return raw === '1';
  } catch {
    return true;
  }
}

export function setHapticsEnabled(enabled: boolean) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(PREF_KEY, enabled ? '1' : '0');
  } catch {
    /* noop */
  }
}

function buzz(pattern: number | number[]) {
  if (!isHapticsSupported() || !getHapticsEnabled()) return;
  try {
    navigator.vibrate(pattern);
  } catch {
    /* noop */
  }
}

export const haptics = {
  micro: () => buzz(6),
  tap: () => buzz(12),
  arm: () => buzz(18),
  start: () => buzz(20),
  stop: () => buzz(24),
  unlock: () => buzz([35, 60, 35, 60, 80]),
  newBest: () => buzz([20, 40, 60]),
  cancel: () => {
    if (isHapticsSupported()) {
      try {
        navigator.vibrate(0);
      } catch {
        /* noop */
      }
    }
  },
  forGrade: (grade: Grade) => {
    switch (grade) {
      case 'Perfect':
        return buzz([35, 40, 35, 40, 70]);
      case 'Elite':
        return buzz([25, 35, 45]);
      case 'Great':
        return buzz([22, 30, 22]);
      case 'Close':
        return buzz(16);
      case 'Miss':
        return buzz([40, 50, 40]);
    }
  },
};
