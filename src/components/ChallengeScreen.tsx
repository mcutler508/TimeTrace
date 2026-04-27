import { useEffect, useMemo, useRef, useState } from 'react';
import DrawingCanvas, { type DrawingCanvasHandle } from './DrawingCanvas';
import TutorialHint from './TutorialHint';
import InlineResultOverlay from './InlineResultOverlay';
import type { AttemptResult, Point } from '../game/types';
import { isClosedShape, shapeDisplayName } from '../game/shapes';
import { haptics } from '../game/haptics';
import { findWorstSegment, type WorstSegment } from '../game/analyze';
import { scaleNormalizedToCanvas } from '../game/pathUtils';
import type { ChallengeMeta } from '../game/challenges';

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
  const wrapRef = useRef<HTMLDivElement | null>(null);

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
      const targetCanvas = scaleNormalizedToCanvas(targetUnitPath, rect.width, rect.height);
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
      setTimeout(() => setPerfectFreeze(false), 220);
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

  const inPerfectLock =
    phase === 'armed' && (previousScore ?? 0) >= 85;

  const closedShape = isClosedShape(challenge.shape);

  return (
    <div
      className={`flex flex-col h-full w-full max-w-md mx-auto px-5 pt-5 pb-6 gap-4 transition-colors duration-300 ${
        inPerfectLock ? 'perfect-lock' : ''
      } ${perfectFreeze ? 'perfect-freeze' : ''}`}
    >
      <header className="flex items-center justify-between gap-3">
        {onHome && phase === 'armed' ? (
          <button
            onClick={() => {
              haptics.micro();
              onHome();
            }}
            className="rounded-full px-3 py-1.5 text-[10px] uppercase tracking-[0.32em] bg-white/10 text-white/75 border border-white/15 active:scale-95"
            aria-label="Back to home"
          >
            ← Home
          </button>
        ) : (
          <div className="w-[72px]" />
        )}
        <div className="flex-1 text-center">
          <div className="text-xs uppercase tracking-[0.32em] text-white/45">
            {challenge.difficulty}
          </div>
          <h1 className="font-display text-xl font-bold leading-tight">
            {shapeDisplayName(challenge.shape)}
          </h1>
        </div>
        <div className="text-right">
          <div className="text-xs uppercase tracking-[0.32em] text-white/45">Target</div>
          <div className="font-mono text-xl text-ink-cyan text-glow-cyan tabular-nums">
            {target.toFixed(2)}s
          </div>
        </div>
      </header>

      <div className="flex items-center justify-between text-xs text-white/55">
        <span>
          Best:{' '}
          <span className="text-white/85 font-semibold tabular-nums">
            {bestScore != null ? bestScore : '—'}
          </span>
        </span>
        {inPerfectLock && (
          <span className="text-[10px] uppercase tracking-[0.4em] text-ink-gold text-glow-gold animate-fadeIn">
            You're close
          </span>
        )}
        <span>
          Streak:{' '}
          <span className="text-ink-gold font-semibold tabular-nums">{streak}</span>
        </span>
      </div>

      <div
        ref={wrapRef}
        className={`card relative rounded-3xl overflow-hidden transition-shadow duration-200 ${
          phase === 'armed' ? 'ring-2 ring-ink-cyan/60 shadow-glow-cyan' : ''
        } ${inPerfectLock ? 'ring-ink-gold/45 shadow-glow-gold' : ''}`}
      >
        <DrawingCanvas
          ref={canvasRef}
          enabled={phase !== 'result'}
          targetUnitPath={targetUnitPath}
          guideOpacity={Math.min(0.85, challenge.guideOpacity * (inPerfectLock ? 1.6 : 1))}
          closedShape={closedShape}
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
          <div className="absolute top-3 right-3">
            <div
              className={`font-mono text-xl tabular-nums px-3 py-1 rounded-full bg-black/40 border border-white/10 ${
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

      <div className="mt-auto min-h-[3.25rem] flex items-center justify-center">
        {phase === 'armed' && (
          <div className="text-center text-[11px] uppercase tracking-[0.4em] text-ink-cyan/70 animate-fadeIn">
            Touch the shape to start · Lift to stop
          </div>
        )}
        {phase === 'running' && (
          <div className="text-center text-sm uppercase tracking-[0.32em] text-ink-cyan/85 animate-fadeIn">
            Lift finger to stop
          </div>
        )}
        {phase === 'result' && (
          <div className="text-center text-[11px] uppercase tracking-[0.4em] text-white/45 animate-fadeIn">
            Retry · Next · {onHome ? '← Home anytime' : ''}
          </div>
        )}
      </div>
    </div>
  );
}
