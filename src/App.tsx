import { useEffect, useMemo, useRef, useState } from 'react';
import ChallengeScreen, { type SubmitMeta } from './components/ChallengeScreen';
import HomeScreen from './components/HomeScreen';
import IntroCard from './components/IntroCard';
import LeaderboardScreen from './components/LeaderboardScreen';
import NameEntryScreen from './components/NameEntryScreen';
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
import { generateMultiShapePath, generateShapePath } from './game/shapes';
import { scoreAttempt as runScoreAttempt } from './game/scoring';
import { loadState, resetState, saveState } from './game/storage';
import { assistStrengthForAttempt } from './game/assist';
import {
  submitScore,
  updateName,
  type LeaderboardEntry,
} from './game/leaderboard';
import { gradeFor } from './game/scoring';
import type { AttemptResult, Point, SavedGameState } from './game/types';
import {
  DEFAULT_PAINT_STYLE,
  isPaintStyleId,
  type PaintStyleId,
} from './game/paintStyles';

type View = 'name' | 'home' | 'play' | 'leaderboard';

const TUTORIAL_HINT_LIMIT = 2;

function buildLevelScoresMap(
  bests: Record<string, AttemptResult>,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const c of CHALLENGES) {
    const b = bests[c.id];
    if (b) out[c.id] = b.finalScore;
  }
  return out;
}

export default function App() {
  const [state, setState] = useState<SavedGameState>(() => loadState());
  const [view, setView] = useState<View>(() => {
    const initial = loadState();
    if (!initial.playerName) return 'name';
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
    chapter: 1,
  };
  const currentChallenge: ChallengeMeta = inTutorial
    ? tutorialAsMeta
    : challengeAt(state.currentChallengeIndex);

  const targetUnitPath = useMemo(
    () =>
      currentChallenge.segments && currentChallenge.segments.length > 0
        ? generateMultiShapePath(currentChallenge.segments)
        : generateShapePath(currentChallenge.shape),
    [currentChallenge.shape, currentChallenge.segments],
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
      segments: currentChallenge.segments,
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

    if (isNewBest && pointsEarned > 0) {
      const s = stateRef.current;
      const nextBests = isNewBest
        ? { ...s.bestScoresByChallenge, [id]: result }
        : s.bestScoresByChallenge;
      const levelScores = buildLevelScoresMap(nextBests);
      const passedThreshold = result.finalScore >= 70;
      const projectedStreak = passedThreshold ? s.currentStreak + 1 : 0;
      const projectedBestStreak = Math.max(s.currentStreak, projectedStreak);
      void submitScore({
        id: s.playerId,
        name: s.playerName,
        totalPoints: nextTotal,
        bestStreak: projectedBestStreak,
        levelScores,
      });
    }

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

  function handleOpenLeaderboard() {
    setView('leaderboard');
  }

  function handleSignedUp(name: string, _passcode: string) {
    setState((prev) => ({ ...prev, playerName: name }));
    if (stateRef.current.hasCompletedTutorial) {
      setView('home');
    } else {
      setView('play');
    }
  }

  function bestsFromLevelScores(
    scores: Record<string, number>,
  ): Record<string, AttemptResult> {
    const out: Record<string, AttemptResult> = {};
    for (const [challengeId, finalScore] of Object.entries(scores)) {
      out[challengeId] = {
        challengeId,
        shapeScore: 0,
        timingScore: 0,
        finalScore,
        targetTime: 0,
        actualTime: 0,
        timeDelta: 0,
        playerPath: [],
        targetPath: [],
        grade: gradeFor(finalScore),
      };
    }
    return out;
  }

  function handleSignedIn(player: LeaderboardEntry) {
    setState((prev) => ({
      ...prev,
      playerId: player.id,
      playerName: player.name,
      hasCompletedTutorial: true,
      tutorialAttempts: 999,
      currentChallengeIndex: 0,
      bestScoresByChallenge: bestsFromLevelScores(player.level_scores ?? {}),
      previousAttemptByChallenge: {},
      attemptCountByChallenge: {},
      currentStreak: 0,
      paintStyleId: prev.paintStyleId,
    }));
    setIntroDismissed(true);
    setView('home');
  }

  function handleEditName(name: string) {
    setState((prev) => ({ ...prev, playerName: name }));
    void updateName(stateRef.current.playerId, name);
  }

  function handleSignOut() {
    if (
      typeof window !== 'undefined' &&
      !window.confirm('Sign out? Your progress stays on the leaderboard. Sign back in any time with your handle and passcode.')
    ) {
      return;
    }
    const fresh = resetState();
    setState(fresh);
    setIntroDismissed(false);
    setView('name');
  }

  function handleSelectPaintStyle(id: PaintStyleId) {
    setState((prev) => ({ ...prev, paintStyleId: id }));
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
  const activePaintStyle: PaintStyleId = isPaintStyleId(state.paintStyleId)
    ? state.paintStyleId
    : DEFAULT_PAINT_STYLE;

  const wrapperClass = 'w-full max-w-md mx-auto min-h-screen flex flex-col';
  const wrapperStyle = { minHeight: '100dvh' } as const;

  let viewBody: JSX.Element;
  if (view === 'name') {
    viewBody = (
      <NameEntryScreen
        initialName={state.playerName}
        mode="signup"
        playerId={state.playerId}
        onSignedUp={handleSignedUp}
        onSignedIn={handleSignedIn}
      />
    );
  } else if (view === 'leaderboard') {
    viewBody = (
      <LeaderboardScreen
        playerId={state.playerId}
        playerName={state.playerName}
        onHome={handleHome}
      />
    );
  } else if (view === 'home' && canGoHome) {
    viewBody = (
      <HomeScreen
        totalPoints={totalPoints}
        bestScores={state.bestScoresByChallenge}
        streak={state.currentStreak}
        playerName={state.playerName}
        focusChallengeId={currentChallenge.id}
        paintStyleId={activePaintStyle}
        onPickChallenge={handlePickChallenge}
        onSignOut={handleSignOut}
        onOpenLeaderboard={handleOpenLeaderboard}
        onEditName={handleEditName}
        onSelectPaintStyle={handleSelectPaintStyle}
      />
    );
  } else {
    viewBody = (
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
        paintStyleId={activePaintStyle}
      />
    );
  }

  return (
    <>
      <div className={wrapperClass} style={wrapperStyle}>
        {viewBody}
      </div>
      <IntroCard />
    </>
  );
}
