import { useEffect, useMemo, useRef, useState } from 'react';
import ChallengeScreen, { type SubmitMeta } from './components/ChallengeScreen';
import HomeScreen from './components/HomeScreen';
import {
  CHALLENGES,
  TUTORIAL_CHALLENGE,
  challengeAt,
  findChallengeIndex,
  isChallengeUnlocked,
  nextUnlockedIndex,
  totalPointsFromBests,
  type ChallengeMeta,
} from './game/challenges';
import { generateShapePath } from './game/shapes';
import { scoreAttempt as runScoreAttempt } from './game/scoring';
import { loadState, saveState } from './game/storage';
import { assistStrengthForAttempt } from './game/assist';
import type { AttemptResult, Point, SavedGameState } from './game/types';

type View = 'home' | 'play';

const TUTORIAL_HINT_LIMIT = 2;

export default function App() {
  const [state, setState] = useState<SavedGameState>(() => loadState());
  const [view, setView] = useState<View>(() => {
    const initial = loadState();
    return initial.hasCompletedTutorial ? 'home' : 'play';
  });
  const [introDismissed, setIntroDismissed] = useState(false);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    saveState(state);
  }, [state]);

  const inTutorial = !state.hasCompletedTutorial;
  const tutorialAsMeta: ChallengeMeta = {
    ...TUTORIAL_CHALLENGE,
    unlockThreshold: 0,
    title: 'Tutorial',
  };
  const currentChallenge: ChallengeMeta = inTutorial
    ? tutorialAsMeta
    : challengeAt(state.currentChallengeIndex);

  const targetUnitPath = useMemo(
    () => generateShapePath(currentChallenge.shape),
    [currentChallenge.shape],
  );

  const bestScore = state.bestScoresByChallenge[currentChallenge.id]?.finalScore;
  const previousScore =
    state.previousAttemptByChallenge[currentChallenge.id]?.finalScore ?? null;
  const attemptCount = state.attemptCountByChallenge[currentChallenge.id] ?? 0;
  const assistStrength = assistStrengthForAttempt(attemptCount);

  function scoreAttempt(
    playerPath: Point[],
    elapsed: number,
    challengeId: string,
    targetPath: Point[],
  ): AttemptResult {
    return runScoreAttempt({
      playerPath,
      targetUnitPath: targetPath,
      shape: currentChallenge.shape,
      targetTime: currentChallenge.targetTime,
      elapsed,
      challengeId,
      applyTutorial: inTutorial,
    });
  }

  function handleSubmit(
    result: AttemptResult,
    _playerPath: Point[],
    _elapsed: number,
  ): SubmitMeta {
    const id = currentChallenge.id;
    const prevBests = stateRef.current.bestScoresByChallenge;
    const prevBestEntry = prevBests[id];
    const prevBestScore = prevBestEntry?.finalScore ?? 0;
    const isNewBest = result.finalScore > prevBestScore;
    const pointsEarned = isNewBest ? result.finalScore - prevBestScore : 0;

    const prevTotal = totalPointsFromBests(prevBests);
    const nextTotal = prevTotal + pointsEarned;
    const newlyUnlocked = CHALLENGES.find(
      (c) => c.unlockThreshold > prevTotal && c.unlockThreshold <= nextTotal,
    );

    setState((prev) => {
      const nextBest = isNewBest ? result : prev.bestScoresByChallenge[id];
      const tutorialAttempts = inTutorial ? prev.tutorialAttempts + 1 : prev.tutorialAttempts;
      const completedTutorial =
        prev.hasCompletedTutorial ||
        (inTutorial && (result.finalScore >= 60 || tutorialAttempts >= 3));
      const passedThreshold = result.finalScore >= 70;
      const nextStreak = passedThreshold ? prev.currentStreak + 1 : 0;
      const nextAttemptCount = (prev.attemptCountByChallenge[id] ?? 0) + 1;
      return {
        ...prev,
        hasCompletedTutorial: completedTutorial,
        tutorialAttempts,
        bestScoresByChallenge: nextBest
          ? { ...prev.bestScoresByChallenge, [id]: nextBest }
          : prev.bestScoresByChallenge,
        previousAttemptByChallenge: { ...prev.previousAttemptByChallenge, [id]: result },
        attemptCountByChallenge: {
          ...prev.attemptCountByChallenge,
          [id]: nextAttemptCount,
        },
        currentStreak: nextStreak,
      };
    });

    return {
      isNewBest,
      pointsEarned,
      unlockedTitle: newlyUnlocked ? newlyUnlocked.title : null,
    };
  }

  function handleNext() {
    if (!stateRef.current.hasCompletedTutorial) return;
    setState((prev) => {
      const total = totalPointsFromBests(prev.bestScoresByChallenge);
      return {
        ...prev,
        currentChallengeIndex: nextUnlockedIndex(prev.currentChallengeIndex, total),
      };
    });
    setView('play');
  }

  function handleHome() {
    setView('home');
  }

  function handlePickChallenge(id: string) {
    const idx = findChallengeIndex(id);
    if (idx < 0) return;
    const total = totalPointsFromBests(stateRef.current.bestScoresByChallenge);
    if (!isChallengeUnlocked(CHALLENGES[idx], total)) return;
    setState((prev) => ({ ...prev, currentChallengeIndex: idx }));
    setView('play');
  }

  const showTutorialHints = inTutorial && state.tutorialAttempts < TUTORIAL_HINT_LIMIT;
  const showTutorialIntro =
    inTutorial && state.tutorialAttempts === 0 && !introDismissed;
  const canGoHome = state.hasCompletedTutorial;
  const totalPoints = useMemo(
    () => totalPointsFromBests(state.bestScoresByChallenge),
    [state.bestScoresByChallenge],
  );

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
      <ChallengeScreen
        challenge={currentChallenge}
        targetUnitPath={targetUnitPath}
        showTutorialHints={showTutorialHints}
        showTutorialIntro={showTutorialIntro}
        onDismissIntro={() => setIntroDismissed(true)}
        bestScore={bestScore}
        previousScore={previousScore}
        streak={state.currentStreak}
        assistEnabled={true}
        assistStrength={assistStrength}
        applyTutorialBiasFlag={inTutorial}
        onSubmit={handleSubmit}
        onNext={handleNext}
        onHome={canGoHome ? handleHome : undefined}
        scoreAttempt={scoreAttempt}
      />
    </div>
  );
}
