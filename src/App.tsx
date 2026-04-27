import { useEffect, useMemo, useRef, useState } from 'react';
import ChallengeScreen from './components/ChallengeScreen';
import ResultScreen from './components/ResultScreen';
import HomeScreen from './components/HomeScreen';
import {
  CHALLENGES,
  TUTORIAL_CHALLENGE,
  challengeAt,
  findChallengeIndex,
  isChallengeUnlocked,
  nextUnlockedIndex,
  totalPointsFromBests,
} from './game/challenges';
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

type View = 'home' | 'play' | 'result';

const TUTORIAL_HINT_LIMIT = 2;

interface ResultCtx {
  pointsEarned: number;
  unlockedTitle: string | null;
}

export default function App() {
  const [state, setState] = useState<SavedGameState>(() => loadState());
  const [view, setView] = useState<View>(() => {
    const initial = loadState();
    return initial.hasCompletedTutorial ? 'home' : 'play';
  });
  const [lastResult, setLastResult] = useState<AttemptResult | null>(null);
  const [resultCtx, setResultCtx] = useState<ResultCtx>({
    pointsEarned: 0,
    unlockedTitle: null,
  });
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
  const totalPoints = useMemo(
    () => totalPointsFromBests(state.bestScoresByChallenge),
    [state.bestScoresByChallenge],
  );

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

    const prevBests = stateRef.current.bestScoresByChallenge;
    const prevBestEntry = prevBests[currentChallenge.id];
    const prevBestScore = prevBestEntry?.finalScore ?? 0;
    const isNewBest = result.finalScore > prevBestScore;
    const pointsEarned = isNewBest ? result.finalScore - prevBestScore : 0;

    const prevTotal = totalPointsFromBests(prevBests);
    const nextTotal = prevTotal + pointsEarned;
    const newlyUnlocked = CHALLENGES.find(
      (c) =>
        c.unlockThreshold > prevTotal &&
        c.unlockThreshold <= nextTotal,
    );

    setState((prev) => {
      const id = currentChallenge.id;
      const nextBest = isNewBest ? result : prev.bestScoresByChallenge[id];
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
        bestScoresByChallenge: nextBest
          ? { ...prev.bestScoresByChallenge, [id]: nextBest }
          : prev.bestScoresByChallenge,
        previousAttemptByChallenge: { ...prev.previousAttemptByChallenge, [id]: result },
        currentStreak: nextStreak,
      };
    });
    setLastResult(result);
    setResultCtx({
      pointsEarned,
      unlockedTitle: newlyUnlocked ? newlyUnlocked.title : null,
    });
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
    setState((prev) => {
      const total = totalPointsFromBests(prev.bestScoresByChallenge);
      return {
        ...prev,
        currentChallengeIndex: nextUnlockedIndex(prev.currentChallengeIndex, total),
      };
    });
    setLastResult(null);
    setView('play');
  }

  function handleHome() {
    setLastResult(null);
    setView('home');
  }

  function handlePickChallenge(id: string) {
    const idx = findChallengeIndex(id);
    if (idx < 0) return;
    const total = totalPointsFromBests(stateRef.current.bestScoresByChallenge);
    if (!isChallengeUnlocked(CHALLENGES[idx], total)) return;
    setState((prev) => ({ ...prev, currentChallengeIndex: idx }));
    setLastResult(null);
    setView('play');
  }

  const showTutorialHints = inTutorial && state.tutorialAttempts < TUTORIAL_HINT_LIMIT;
  const canGoHome = state.hasCompletedTutorial;

  if (view === 'home' && canGoHome) {
    return (
      <div className="w-full max-w-md mx-auto h-[100dvh] flex flex-col">
        <HomeScreen
          totalPoints={totalPoints}
          bestScores={state.bestScoresByChallenge}
          streak={state.currentStreak}
          onPickChallenge={handlePickChallenge}
        />
      </div>
    );
  }

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
          onHome={canGoHome ? handleHome : undefined}
        />
      ) : (
        <ResultScreen
          result={lastResult}
          bestScore={bestScore}
          streak={state.currentStreak}
          onRetry={handleRetry}
          onNext={handleNext}
          onHome={canGoHome ? handleHome : undefined}
          pointsEarned={resultCtx.pointsEarned}
          unlockedTitle={resultCtx.unlockedTitle}
        />
      )}
    </div>
  );
}
