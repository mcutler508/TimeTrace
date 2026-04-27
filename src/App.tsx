import { useEffect, useMemo, useRef, useState } from 'react';
import ChallengeScreen from './components/ChallengeScreen';
import ResultScreen from './components/ResultScreen';
import { CHALLENGES, TUTORIAL_CHALLENGE, challengeAt } from './game/challenges';
import { generateShapePath } from './game/shapes';
import {
  applyTutorialBias,
  combineFinalScore,
  gradeFor,
  scoreShape,
  timingScore,
} from './game/scoring';
import { loadState, saveState } from './game/storage';
import { normalizeToUnit } from './game/pathUtils';
import type { AttemptResult, Challenge, Point, SavedGameState } from './game/types';

type View = 'play' | 'result';

const TUTORIAL_HINT_LIMIT = 2;

export default function App() {
  const [state, setState] = useState<SavedGameState>(() => loadState());
  const [view, setView] = useState<View>('play');
  const [lastResult, setLastResult] = useState<AttemptResult | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    saveState(state);
  }, [state]);

  const inTutorial = !state.hasCompletedTutorial;
  const currentChallenge: Challenge = inTutorial
    ? TUTORIAL_CHALLENGE
    : challengeAt(state.currentChallengeIndex);

  const targetUnitPath = useMemo(
    () => generateShapePath(currentChallenge.shape),
    [currentChallenge.shape],
  );

  const ghostUnitPath = useMemo(() => {
    const prev = state.previousAttemptByChallenge[currentChallenge.id];
    if (!prev || prev.playerPath.length < 2) return null;
    return normalizeToUnit(prev.playerPath);
  }, [currentChallenge.id, state.previousAttemptByChallenge]);

  const bestUnitPath = useMemo(() => {
    const best = state.bestScoresByChallenge[currentChallenge.id];
    if (!best || best.playerPath.length < 2) return null;
    return normalizeToUnit(best.playerPath);
  }, [currentChallenge.id, state.bestScoresByChallenge]);

  const bestScore = state.bestScoresByChallenge[currentChallenge.id]?.finalScore;

  function handleSubmit(playerPath: Point[], elapsed: number) {
    const tShape = scoreShape(playerPath, targetUnitPath, currentChallenge.shape);
    const tTime = Math.round(timingScore(elapsed, currentChallenge.targetTime));
    const final = combineFinalScore(tShape, tTime);
    let result: AttemptResult = {
      challengeId: currentChallenge.id,
      shapeScore: tShape,
      timingScore: tTime,
      finalScore: final,
      targetTime: currentChallenge.targetTime,
      actualTime: elapsed,
      timeDelta: elapsed - currentChallenge.targetTime,
      playerPath,
      targetPath: targetUnitPath,
      grade: gradeFor(final),
    };
    if (inTutorial) result = applyTutorialBias(result);

    setState((prev) => {
      const id = currentChallenge.id;
      const prevBest = prev.bestScoresByChallenge[id];
      const nextBest =
        !prevBest || result.finalScore > prevBest.finalScore ? result : prevBest;
      const tutorialAttempts = inTutorial ? prev.tutorialAttempts + 1 : prev.tutorialAttempts;
      const completedTutorial =
        prev.hasCompletedTutorial ||
        (inTutorial && (result.finalScore >= 60 || tutorialAttempts >= 3));
      const passedThreshold = result.finalScore >= 70;
      const nextStreak = passedThreshold ? prev.currentStreak + 1 : 0;

      return {
        ...prev,
        hasCompletedTutorial: completedTutorial,
        tutorialAttempts,
        bestScoresByChallenge: { ...prev.bestScoresByChallenge, [id]: nextBest },
        previousAttemptByChallenge: { ...prev.previousAttemptByChallenge, [id]: result },
        currentStreak: nextStreak,
      };
    });
    setLastResult(result);
    setView('result');
  }

  function handleRetry() {
    setLastResult(null);
    setView('play');
  }

  function handleNext() {
    if (!stateRef.current.hasCompletedTutorial) {
      setLastResult(null);
      setView('play');
      return;
    }
    setState((prev) => ({
      ...prev,
      currentChallengeIndex: (prev.currentChallengeIndex + 1) % CHALLENGES.length,
    }));
    setLastResult(null);
    setView('play');
  }

  const showTutorialHints = inTutorial && state.tutorialAttempts < TUTORIAL_HINT_LIMIT;

  return (
    <div className="w-full max-w-md mx-auto h-[100dvh] flex flex-col">
      {view === 'play' || !lastResult ? (
        <ChallengeScreen
          challenge={currentChallenge}
          targetUnitPath={targetUnitPath}
          ghostUnitPath={ghostUnitPath}
          bestUnitPath={bestUnitPath}
          showTutorialHints={showTutorialHints}
          bestScore={bestScore}
          streak={state.currentStreak}
          onSubmit={handleSubmit}
        />
      ) : (
        <ResultScreen
          result={lastResult}
          bestScore={bestScore}
          streak={state.currentStreak}
          onRetry={handleRetry}
          onNext={handleNext}
        />
      )}
    </div>
  );
}
