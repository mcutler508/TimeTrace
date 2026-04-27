import type { Challenge } from './types';

export const TUTORIAL_CHALLENGE: Challenge = {
  id: 'tutorial-circle-3',
  shape: 'circle',
  targetTime: 3.0,
  guideOpacity: 0.55,
  difficulty: 'tutorial',
};

export const CHALLENGES: Challenge[] = [
  {
    id: 'circle-3',
    shape: 'circle',
    targetTime: 3.0,
    guideOpacity: 0.45,
    difficulty: 'easy',
  },
  {
    id: 'circle-2_5',
    shape: 'circle',
    targetTime: 2.5,
    guideOpacity: 0.4,
    difficulty: 'easy',
  },
  {
    id: 'square-3_5',
    shape: 'square',
    targetTime: 3.5,
    guideOpacity: 0.4,
    difficulty: 'easy',
  },
  {
    id: 'triangle-4',
    shape: 'triangle',
    targetTime: 4.0,
    guideOpacity: 0.35,
    difficulty: 'medium',
  },
  {
    id: 'star-5',
    shape: 'star',
    targetTime: 5.0,
    guideOpacity: 0.32,
    difficulty: 'medium',
  },
  {
    id: 'spiral-6',
    shape: 'spiral',
    targetTime: 6.0,
    guideOpacity: 0.3,
    difficulty: 'hard',
  },
];

export function challengeAt(index: number): Challenge {
  if (CHALLENGES.length === 0) throw new Error('no challenges');
  return CHALLENGES[index % CHALLENGES.length];
}
