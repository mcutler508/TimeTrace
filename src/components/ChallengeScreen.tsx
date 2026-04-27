import { useEffect, useMemo, useRef, useState } from 'react';
import DrawingCanvas, { type DrawingCanvasHandle } from './DrawingCanvas';
import TutorialHint from './TutorialHint';
import InlineResultOverlay from './InlineResultOverlay';
import type { AttemptResult, Point } from '../game/types';
import { isClosedShape, shapeDisplayName } from '../game/shapes';
import { haptics } from '../game/haptics';
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
    if (meta.isNewBest && meta.pointsEarned > 0) {
      setTimeout(() => haptics.newBest(), 280);
    }
    if (meta.unlockedTitle) {
      setTimeout(() => haptics.unlock(), meta.isNewBest ? 700 : 420);
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

  const barProgress = (() => {
    if (phase === 'running') return Math.min(1.4, elapsed / Math.max(target, 0.001));
    if (phase === 'result' && result) return Math.min(1.4, result.actualTime / Math.max(target, 0.001));
    return 0;
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
              onHome();
            }}
            className="btn-sticker-sm px-3 py-1.5 text-[10px] uppercase tracking-[0.22em] font-poster bg-splat-paper text-splat-black"
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

      <div className="relative h-12 flex flex-col justify-center">
        <TimingBar
          progress={barProgress}
          phase={phase}
          warmth={warmth}
          timeDelta={result?.timeDelta ?? null}
        />
        <div className="text-poster text-center text-[10px] tracking-[0.32em] text-splat-paper/55 mt-2 animate-fadeIn">
          {phase === 'armed' && 'TOUCH SHAPE · LIFT TO STOP'}
          {phase === 'running' && 'HOLD FOR THE PERFECT MOMENT'}
          {phase === 'result' && 'RETRY · NEXT'}
        </div>
      </div>
    </div>
  );
}

function TimingBar({
  progress,
  phase,
  warmth,
  timeDelta,
}: {
  progress: number;
  phase: Phase;
  warmth: number;
  timeDelta: number | null;
}) {
  const targetMarkPos = '50%';
  const fillPct = Math.min(100, (progress / 1.4) * 100);
  const isWarm = warmth > 0.4;
  const fillColor = isWarm
    ? 'linear-gradient(90deg, #3df0ff 0%, #a4ff3d 40%, #ffe83d 70%, #ff7a3d 100%)'
    : 'linear-gradient(90deg, #3df0ff 0%, #a44dff 100%)';

  const deltaPos =
    phase === 'result' && timeDelta != null
      ? Math.max(0, Math.min(100, 50 + (timeDelta / 0.8) * 50 * (50 / 70)))
      : null;

  return (
    <div className="relative h-2.5 w-full rounded-full bg-splat-black border-2 border-splat-paper/30 overflow-hidden">
      <div
        className="absolute inset-y-0 left-0 transition-[width] duration-75"
        style={{
          width: `${fillPct}%`,
          background: fillColor,
          boxShadow: isWarm
            ? '0 0 18px rgba(255, 232, 61, 0.85)'
            : '0 0 12px rgba(61, 240, 255, 0.55)',
        }}
      />
      <div
        className="absolute top-1/2 -translate-y-1/2 w-0.5 h-4 bg-splat-paper rounded-full"
        style={{ left: targetMarkPos, boxShadow: '0 0 8px rgba(255,245,224,0.75)' }}
      />
      {deltaPos != null && (
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-splat-yellow border-2 border-splat-black animate-fadeIn"
          style={{
            left: `${deltaPos}%`,
            boxShadow: '0 0 12px rgba(255, 232, 61, 0.85)',
          }}
        />
      )}
    </div>
  );
}
