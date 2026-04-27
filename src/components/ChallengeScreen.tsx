import { useEffect, useMemo, useRef, useState } from 'react';
import DrawingCanvas, { type DrawingCanvasHandle } from './DrawingCanvas';
import TutorialHint from './TutorialHint';
import InlineResultOverlay from './InlineResultOverlay';
import PortalTutorial, { getPortalTutorialSeen } from './PortalTutorial';
import type { AttemptResult, Point } from '../game/types';
import { isClosedShape, shapeDisplayName } from '../game/shapes';
import { haptics } from '../game/haptics';
import { sfx } from '../game/audio';
import { findWorstSegment, type WorstSegment } from '../game/analyze';
import { scaleNormalizedToCanvas } from '../game/pathUtils';
import { accentFor, type ChallengeMeta } from '../game/challenges';

export interface SubmitMeta {
  isNewBest: boolean;
  pointsEarned: number;
  unlockedTitle: string | null;
}

interface Props {
  challenge: ChallengeMeta;
  targetUnitPath: Point[];
  showTutorialHints: boolean;
  showTutorialIntro?: boolean;
  bestScore?: number;
  previousScore?: number | null;
  streak: number;
  assistEnabled: boolean;
  assistStrength: number;
  applyTutorialBiasFlag: boolean;
  onSubmit: (
    result: AttemptResult,
    playerPath: Point[],
    elapsed: number,
  ) => SubmitMeta;
  onHome?: () => void;
  onNext?: () => void;
  onDismissIntro?: () => void;
  scoreAttempt: (
    playerPath: Point[],
    elapsed: number,
    challengeId: string,
    targetUnitPath: Point[],
  ) => AttemptResult;
}

type Phase = 'armed' | 'running' | 'result';

const TIMER_WARM_WINDOW = 0.8;

export default function ChallengeScreen({
  challenge,
  targetUnitPath,
  showTutorialHints,
  bestScore,
  previousScore,
  streak,
  assistEnabled,
  assistStrength,
  applyTutorialBiasFlag: _applyTutorialBiasFlag,
  onSubmit,
  onHome,
  onNext,
  showTutorialIntro = false,
  onDismissIntro,
  scoreAttempt,
}: Props) {
  const canvasRef = useRef<DrawingCanvasHandle | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const phaseRef = useRef<Phase>('armed');
  const [phase, setPhase] = useState<Phase>('armed');
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [worstSegment, setWorstSegment] = useState<WorstSegment | null>(null);
  const [submitMeta, setSubmitMeta] = useState<SubmitMeta | null>(null);
  const [perfectFreeze, setPerfectFreeze] = useState(false);
  const [missFlicker, setMissFlicker] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const challengePortals = (challenge as { portals?: import('../game/types').PortalPair[] })
    .portals;
  const [showPortalTutorial, setShowPortalTutorial] = useState(false);
  useEffect(() => {
    if (challengePortals && challengePortals.length > 0 && !getPortalTutorialSeen()) {
      setShowPortalTutorial(true);
    } else {
      setShowPortalTutorial(false);
    }
  }, [challenge.id, challengePortals]);

  const accent = accentFor(challenge.shape);

  function changePhase(next: Phase) {
    phaseRef.current = next;
    setPhase(next);
  }

  useEffect(() => {
    canvasRef.current?.reset();
    changePhase('armed');
    setElapsed(0);
    setResult(null);
    setWorstSegment(null);
    setSubmitMeta(null);
    setPerfectFreeze(false);
    setMissFlicker(false);
    startTimeRef.current = null;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  }, [challenge.id]);

  useEffect(() => () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  }, []);

  function handleStrokeStart() {
    if (phaseRef.current !== 'armed') return;
    startTimeRef.current = performance.now();
    setElapsed(0);
    changePhase('running');
    const tick = () => {
      if (startTimeRef.current == null) return;
      setElapsed((performance.now() - startTimeRef.current) / 1000);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }

  function handleStrokeEnd(path: Point[]) {
    if (phaseRef.current !== 'running' || startTimeRef.current == null) return;
    const finalElapsed = (performance.now() - startTimeRef.current) / 1000;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    setElapsed(finalElapsed);

    const r = scoreAttempt(path, finalElapsed, challenge.id, targetUnitPath);
    setResult(r);

    const meta = onSubmit(r, path, finalElapsed);
    setSubmitMeta(meta);

    const wrapEl = wrapRef.current;
    if (wrapEl && r.playerPath.length >= 6) {
      const rect = wrapEl.getBoundingClientRect();
      const targetCanvas = scaleNormalizedToCanvas(targetUnitPath, rect.width, rect.height, 36);
      setWorstSegment(findWorstSegment(r.playerPath, targetCanvas));
    } else {
      setWorstSegment(null);
    }

    haptics.forGrade(r.grade);
    sfx.forGrade(r.grade);
    if (meta.isNewBest && meta.pointsEarned > 0) {
      setTimeout(() => {
        haptics.newBest();
        sfx.newBest();
      }, 280);
    }
    if (meta.unlockedTitle) {
      const unlockDelay = meta.isNewBest ? 700 : 420;
      setTimeout(() => {
        haptics.unlock();
        sfx.unlock();
      }, unlockDelay);
    }

    if (r.grade === 'Perfect') {
      setPerfectFreeze(true);
      setTimeout(() => setPerfectFreeze(false), 240);
    } else if (r.grade === 'Miss') {
      setMissFlicker(true);
      setTimeout(() => setMissFlicker(false), 380);
    }

    changePhase('result');
  }

  function handleRetry() {
    canvasRef.current?.reset();
    setResult(null);
    setWorstSegment(null);
    setSubmitMeta(null);
    setElapsed(0);
    setPerfectFreeze(false);
    setMissFlicker(false);
    changePhase('armed');
  }

  const target = challenge.targetTime;
  const warmth = useMemo(() => {
    if (phase !== 'running') return 0;
    return Math.max(0, Math.min(1, 1 - Math.abs(target - elapsed) / TIMER_WARM_WINDOW));
  }, [phase, target, elapsed]);

  const timerColorStyle = (() => {
    if (phase !== 'running') return undefined;
    if (warmth < 0.05) return undefined;
    const r = Math.round(0 + (255 - 0) * warmth);
    const g = Math.round(240 + (213 - 240) * warmth);
    const b = Math.round(255 + (107 - 255) * warmth);
    const glow = warmth > 0.4 ? `0 0 ${10 + warmth * 18}px rgba(255, 213, 107, ${warmth})` : undefined;
    return { color: `rgb(${r}, ${g}, ${b})`, textShadow: glow };
  })();

  const inPerfectLock = phase === 'armed' && (previousScore ?? 0) >= 85;
  const closedShape = isClosedShape(challenge.shape);

  const cursorDelta = (() => {
    if (phase === 'running') return elapsed - target;
    if (phase === 'result' && result) return result.timeDelta;
    return null;
  })();

  return (
    <div
      className={`relative flex flex-col flex-1 w-full max-w-md mx-auto px-5 pt-5 pb-5 gap-4 transition-colors duration-300 ${
        inPerfectLock ? 'perfect-lock' : ''
      } ${perfectFreeze ? 'perfect-freeze' : ''} ${missFlicker ? 'miss-flicker' : ''}`}
    >
      <header className="flex items-center justify-between gap-3">
        {onHome && phase === 'armed' ? (
          <button
            onClick={() => {
              haptics.micro();
              sfx.tap();
              onHome();
            }}
            className="btn-sticker-sm px-3 py-1.5 text-[10px] uppercase tracking-[0.22em] font-poster bg-splat-yellow text-splat-black"
            aria-label="Back to home"
          >
            ← HOME
          </button>
        ) : (
          <div className="w-[78px]" />
        )}
        <div className="flex-1 text-center">
          <div className="text-poster text-[10px] tracking-[0.32em] text-splat-yellow">
            {challenge.difficulty.toUpperCase()}
          </div>
          <h1
            className="text-poster text-2xl leading-none mt-0.5 text-sticker"
            style={{ color: accent.stroke }}
          >
            {shapeDisplayName(challenge.shape).toUpperCase()}
          </h1>
        </div>
        <div className="card-sticker px-3 py-2 -rotate-2">
          <div className="text-[9px] uppercase tracking-[0.28em] text-splat-yellow font-bold leading-none">Target</div>
          <div className="font-poster text-lg text-splat-paper tabular-nums leading-none mt-1">
            {target.toFixed(2)}s
          </div>
        </div>
      </header>

      <div className="flex items-center justify-between text-xs text-splat-paper/65 px-1">
        <span className="font-poster text-[11px] tracking-[0.18em]">
          Best:{' '}
          <span className="text-splat-paper tabular-nums">
            {bestScore != null ? bestScore : '—'}
          </span>
        </span>
        {inPerfectLock && (
          <span className="text-poster text-[10px] tracking-[0.4em] text-splat-yellow text-glow-gold animate-fadeIn">
            YOU'RE CLOSE
          </span>
        )}
        <span className="font-poster text-[11px] tracking-[0.18em]">
          Streak:{' '}
          <span
            className={`tabular-nums ${
              inPerfectLock ? 'text-splat-yellow text-glow-gold text-base' : 'text-splat-yellow'
            }`}
          >
            {streak}
          </span>
        </span>
      </div>

      <div
        ref={wrapRef}
        className={`canvas-frame relative overflow-hidden p-2 transition-all duration-200 ${
          phase === 'armed' ? '' : ''
        }`}
        style={
          phase === 'armed'
            ? ({
                boxShadow: `8px 8px 0 0 #0a0708, 0 0 0 1px rgba(255,255,255,0.08) inset, 0 0 38px -2px ${
                  inPerfectLock ? 'rgba(255,232,61,0.55)' : accent.soft
                }`,
              } as React.CSSProperties)
            : undefined
        }
      >
        <DrawingCanvas
          ref={canvasRef}
          enabled={phase !== 'result'}
          targetUnitPath={targetUnitPath}
          guideOpacity={Math.min(0.85, challenge.guideOpacity * (inPerfectLock ? 1.6 : 1))}
          closedShape={closedShape}
          accentColor={accent.stroke}
          accentSoft={accent.soft}
          assistEnabled={assistEnabled}
          assistStrength={assistStrength}
          portals={(challenge as { portals?: import('../game/types').PortalPair[] }).portals}
          resultMode={phase === 'result'}
          resultPath={result ? result.playerPath : null}
          resultGrade={result ? result.grade : null}
          worstSegment={
            worstSegment
              ? { startIdx: worstSegment.startIdx, endIdx: worstSegment.endIdx }
              : null
          }
          perfectBurst={phase === 'result' && result?.grade === 'Perfect'}
          onStrokeStart={handleStrokeStart}
          onStrokeEnd={handleStrokeEnd}
        />

        <TutorialHint
          show={
            showTutorialHints &&
            phase === 'armed' &&
            !showTutorialIntro
          }
          targetTime={target}
          variant="pill"
        />
        <TutorialHint
          show={showTutorialIntro && phase === 'armed'}
          targetTime={target}
          variant="intro"
          onDismiss={onDismissIntro}
        />
        <PortalTutorial
          show={showPortalTutorial}
          onDismiss={() => setShowPortalTutorial(false)}
        />

        {phase !== 'result' && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2">
            <div
              className={`font-poster text-xl tabular-nums px-4 py-1 rounded-full bg-splat-black border-2 border-splat-paper/40 ${
                warmth > 0.4 ? 'timer-pulse' : ''
              }`}
              style={timerColorStyle}
            >
              {elapsed.toFixed(2)}s
            </div>
          </div>
        )}

        {phase === 'result' && result && submitMeta && (
          <InlineResultOverlay
            result={result}
            isNewBest={submitMeta.isNewBest}
            pointsEarned={submitMeta.pointsEarned}
            unlockedTitle={submitMeta.unlockedTitle}
            onRetry={handleRetry}
            onNext={() => onNext?.()}
          />
        )}
      </div>

      <TimingScope
        phase={phase}
        target={target}
        elapsed={elapsed}
        cursorDelta={cursorDelta}
        hintText={
          phase === 'armed'
            ? 'TOUCH SHAPE · LIFT TO STOP'
            : phase === 'running'
            ? 'STOP IN THE PERFECT BAND'
            : 'RETRY · NEXT'
        }
      />
    </div>
  );
}

const SCOPE_RANGE = 1.5;
const PRE_PCT = 22;
const SCORING_PCT = 56;
const POST_PCT = 100 - PRE_PCT - SCORING_PCT;

function deltaInScoreToPct(delta: number): number {
  return PRE_PCT + ((delta + SCOPE_RANGE) / (SCOPE_RANGE * 2)) * SCORING_PCT;
}

function elapsedToPct(elapsed: number, target: number): number {
  if (elapsed <= 0) return 0;
  const preEnd = target - SCOPE_RANGE;
  const scoreEnd = target + SCOPE_RANGE;
  if (elapsed < preEnd) {
    if (preEnd <= 0.001) return PRE_PCT;
    return (elapsed / preEnd) * PRE_PCT;
  }
  if (elapsed <= scoreEnd) {
    return PRE_PCT + ((elapsed - preEnd) / (SCOPE_RANGE * 2)) * SCORING_PCT;
  }
  const postRange = Math.max(target, 1);
  return Math.min(
    100,
    PRE_PCT + SCORING_PCT + ((elapsed - scoreEnd) / postRange) * POST_PCT,
  );
}

interface ScopeZone {
  from: number;
  to: number;
  fill: string;
}

const SCOPE_ZONES: ScopeZone[] = [
  { from: 0, to: PRE_PCT, fill: 'rgba(61, 240, 255, 0.05)' },
  { from: deltaInScoreToPct(-SCOPE_RANGE), to: deltaInScoreToPct(-1.05), fill: 'rgba(255, 61, 164, 0.18)' },
  { from: deltaInScoreToPct(-1.05), to: deltaInScoreToPct(-0.55), fill: 'rgba(255, 245, 224, 0.08)' },
  { from: deltaInScoreToPct(-0.55), to: deltaInScoreToPct(-0.25), fill: 'rgba(61, 240, 255, 0.2)' },
  { from: deltaInScoreToPct(-0.25), to: deltaInScoreToPct(-0.05), fill: 'rgba(164, 255, 61, 0.26)' },
  { from: deltaInScoreToPct(-0.05), to: deltaInScoreToPct(0.05), fill: 'rgba(255, 232, 61, 0.6)' },
  { from: deltaInScoreToPct(0.05), to: deltaInScoreToPct(0.25), fill: 'rgba(164, 255, 61, 0.26)' },
  { from: deltaInScoreToPct(0.25), to: deltaInScoreToPct(0.55), fill: 'rgba(61, 240, 255, 0.2)' },
  { from: deltaInScoreToPct(0.55), to: deltaInScoreToPct(1.05), fill: 'rgba(255, 245, 224, 0.08)' },
  { from: deltaInScoreToPct(1.05), to: deltaInScoreToPct(SCOPE_RANGE), fill: 'rgba(255, 61, 164, 0.18)' },
  { from: PRE_PCT + SCORING_PCT, to: 100, fill: 'rgba(255, 61, 164, 0.06)' },
];

function gradeFromDelta(delta: number): { label: string; color: string } {
  const abs = Math.abs(delta);
  if (abs < 0.05) return { label: 'PERFECT', color: '#ffe83d' };
  if (abs < 0.25) return { label: 'ELITE', color: '#a4ff3d' };
  if (abs < 0.55) return { label: 'GREAT', color: '#3df0ff' };
  if (abs < 1.05) return { label: 'CLOSE', color: '#fff5e0' };
  return { label: 'MISS', color: '#ff3da4' };
}

function TimingScope({
  phase,
  target,
  elapsed,
  cursorDelta,
  hintText,
}: {
  phase: Phase;
  target: number;
  elapsed: number;
  cursorDelta: number | null;
  hintText: string;
}) {
  const inPerfect = cursorDelta != null && Math.abs(cursorDelta) < 0.05;
  const inElite = cursorDelta != null && Math.abs(cursorDelta) < 0.25;
  const liveGrade = cursorDelta != null ? gradeFromDelta(cursorDelta) : null;

  const showCursor = phase !== 'armed' && cursorDelta != null;
  const cursorPct =
    phase === 'running'
      ? elapsedToPct(elapsed, target)
      : phase === 'result' && cursorDelta != null
      ? elapsedToPct(target + cursorDelta, target)
      : 0;
  const cursorIsLate = (cursorDelta ?? 0) > 0;
  const cursorInScoringZone = cursorPct >= PRE_PCT && cursorPct <= PRE_PCT + SCORING_PCT;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between px-1">
        <div className="text-poster text-[10px] tracking-[0.28em] text-splat-paper/55">
          TIMING SCOPE
        </div>
        {liveGrade && phase !== 'armed' ? (
          <div
            className={`text-poster text-[11px] tracking-[0.18em] ${
              inPerfect ? 'animate-pulse' : ''
            }`}
            style={{ color: liveGrade.color }}
          >
            {liveGrade.label}
          </div>
        ) : (
          <div className="text-poster text-[10px] tracking-[0.28em] text-splat-yellow">
            ★ AIM CENTER
          </div>
        )}
      </div>

      <div
        className={`relative h-14 bg-splat-black border-2 border-splat-paper/35 rounded-xl overflow-hidden transition-shadow duration-150 ${
          inPerfect ? 'shadow-glow-gold' : inElite ? 'shadow-glow-lime' : ''
        }`}
        style={
          inPerfect
            ? { boxShadow: 'inset 0 0 24px rgba(255, 232, 61, 0.45)' }
            : undefined
        }
      >
        {SCOPE_ZONES.map((z, i) => (
          <div
            key={i}
            className="absolute top-0 bottom-0"
            style={{
              left: `${z.from}%`,
              width: `${z.to - z.from}%`,
              background: z.fill,
            }}
          />
        ))}

        <div
          className="absolute top-0 bottom-0 w-[3px] bg-splat-paper rounded-full"
          style={{
            left: `${PRE_PCT + SCORING_PCT / 2}%`,
            transform: 'translateX(-50%)',
            boxShadow: '0 0 14px rgba(255,232,61,0.95)',
          }}
        />

        <div
          className="absolute top-0 bottom-0 border-l border-r border-splat-paper/15"
          style={{
            left: `${PRE_PCT}%`,
            width: `${SCORING_PCT}%`,
          }}
        />

        <div className="absolute inset-0 pointer-events-none">
          <span
            className="text-poster absolute top-1/2 -translate-y-1/2 text-[9px] tracking-[0.18em] text-splat-cyan/55"
            style={{ left: '4%' }}
          >
            INCOMING
          </span>
          <span
            className="text-poster absolute top-1/2 -translate-y-1/2 text-[9px] tracking-[0.18em] text-splat-pink/65"
            style={{ left: `${PRE_PCT + 2}%` }}
          >
            EARLY
          </span>
          <span
            className={`text-poster absolute top-1/2 -translate-y-1/2 text-[9px] tracking-[0.22em] ${
              inPerfect ? 'text-splat-yellow' : 'text-splat-yellow/65'
            }`}
            style={{
              left: `${PRE_PCT + SCORING_PCT / 2}%`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            PERFECT
          </span>
          <span
            className="text-poster absolute top-1/2 -translate-y-1/2 text-[9px] tracking-[0.18em] text-splat-pink/65"
            style={{ right: `${POST_PCT + 2}%` }}
          >
            LATE
          </span>
          <span
            className="text-poster absolute top-1/2 -translate-y-1/2 text-[9px] tracking-[0.18em] text-splat-pink/55"
            style={{ right: '4%' }}
          >
            OVER
          </span>
        </div>

        {showCursor && (
          <div
            className="absolute top-0 bottom-0 transition-[left] duration-100 ease-linear"
            style={{ left: `${cursorPct}%`, transform: 'translateX(-50%)' }}
          >
            <div
              className={`absolute top-1/2 -translate-y-1/2 w-1.5 h-12 rounded-full ${
                inPerfect
                  ? 'bg-splat-yellow'
                  : inElite
                  ? 'bg-splat-lime'
                  : !cursorInScoringZone && !cursorIsLate
                  ? 'bg-splat-cyan'
                  : cursorIsLate
                  ? 'bg-splat-pink'
                  : 'bg-splat-cyan'
              }`}
              style={{
                boxShadow: inPerfect
                  ? '0 0 22px rgba(255,232,61,1), 0 0 6px rgba(255,232,61,1)'
                  : inElite
                  ? '0 0 16px rgba(164,255,61,0.9)'
                  : cursorIsLate
                  ? '0 0 14px rgba(255,61,164,0.85)'
                  : '0 0 14px rgba(61,240,255,0.85)',
              }}
            />
            <div
              className="absolute -top-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[7px] border-l-transparent border-r-[7px] border-r-transparent border-t-[8px]"
              style={{
                borderTopColor: inPerfect
                  ? '#ffe83d'
                  : inElite
                  ? '#a4ff3d'
                  : cursorIsLate
                  ? '#ff3da4'
                  : '#3df0ff',
              }}
            />
          </div>
        )}
      </div>

      <div className="flex items-center justify-between px-1">
        <span className="text-poster text-[9px] tracking-[0.22em] text-splat-paper/45">
          {phase === 'result' && cursorDelta != null
            ? `${cursorDelta >= 0 ? '+' : '−'}${Math.abs(cursorDelta).toFixed(2)}s`
            : '−1.5s'}
        </span>
        <span className="text-poster text-[9px] tracking-[0.22em] text-splat-yellow">
          TARGET {target.toFixed(2)}s
        </span>
        <span className="text-poster text-[9px] tracking-[0.22em] text-splat-paper/45">
          +1.5s
        </span>
      </div>

      <div className="text-poster text-center text-[10px] tracking-[0.32em] text-splat-paper/55 mt-0.5 animate-fadeIn">
        {hintText}
      </div>
    </div>
  );
}
