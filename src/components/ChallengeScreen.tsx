import { useEffect, useRef, useState } from 'react';
import DrawingCanvas, { type DrawingCanvasHandle } from './DrawingCanvas';
import TutorialHint from './TutorialHint';
import type { Challenge, Point } from '../game/types';
import { shapeDisplayName } from '../game/shapes';
import { haptics } from '../game/haptics';

interface Props {
  challenge: Challenge;
  targetUnitPath: Point[];
  ghostUnitPath?: Point[] | null;
  bestUnitPath?: Point[] | null;
  showTutorialHints: boolean;
  showTutorialIntro?: boolean;
  bestScore?: number;
  streak: number;
  onSubmit: (path: Point[], elapsed: number) => void;
  onHome?: () => void;
  onDismissIntro?: () => void;
}

type Phase = 'armed' | 'running';

export default function ChallengeScreen({
  challenge,
  targetUnitPath,
  ghostUnitPath,
  bestUnitPath,
  showTutorialHints,
  bestScore,
  streak,
  onSubmit,
  onHome,
  showTutorialIntro = false,
  onDismissIntro,
}: Props) {
  const canvasRef = useRef<DrawingCanvasHandle | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const phaseRef = useRef<Phase>('armed');
  const [phase, setPhase] = useState<Phase>('armed');
  const [elapsed, setElapsed] = useState(0);

  function changePhase(next: Phase) {
    phaseRef.current = next;
    setPhase(next);
  }

  useEffect(() => {
    canvasRef.current?.reset();
    changePhase('armed');
    setElapsed(0);
    startTimeRef.current = null;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  }, [challenge.id]);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
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
    onSubmit(path, finalElapsed);
  }

  const target = challenge.targetTime;
  const delta = elapsed - target;
  const timerColor =
    phase === 'running'
      ? Math.abs(delta) < 0.15
        ? 'text-ink-gold text-glow-gold'
        : 'text-ink-cyan text-glow-cyan'
      : 'text-white/80';

  return (
    <div className="flex flex-col h-full w-full max-w-md mx-auto px-5 pt-5 pb-6 gap-4">
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
        <span>
          Streak:{' '}
          <span className="text-ink-gold font-semibold tabular-nums">{streak}</span>
        </span>
      </div>

      <div
        className={`card relative rounded-3xl overflow-hidden transition-shadow duration-200 ${
          phase === 'armed' ? 'ring-2 ring-ink-cyan/60 shadow-glow-cyan' : ''
        }`}
      >
        <DrawingCanvas
          ref={canvasRef}
          enabled
          targetUnitPath={targetUnitPath}
          guideOpacity={challenge.guideOpacity}
          ghostUnitPath={ghostUnitPath}
          bestUnitPath={bestUnitPath}
          onStrokeStart={handleStrokeStart}
          onStrokeEnd={handleStrokeEnd}
        />
        <TutorialHint
          show={showTutorialHints && phase === 'armed' && !showTutorialIntro}
          targetTime={target}
          variant="pill"
        />
        <TutorialHint
          show={showTutorialIntro && phase === 'armed'}
          targetTime={target}
          variant="intro"
          onDismiss={onDismissIntro}
        />
        <div className="absolute top-3 right-3">
          <div
            className={`font-mono text-xl tabular-nums px-3 py-1 rounded-full bg-black/40 border border-white/10 ${timerColor}`}
          >
            {elapsed.toFixed(2)}s
          </div>
        </div>
      </div>

      <div className="mt-auto min-h-[3.25rem] flex items-center justify-center">
        {phase === 'armed' ? (
          <div className="text-center text-[11px] uppercase tracking-[0.4em] text-ink-cyan/70 animate-fadeIn">
            Touch the shape to start · Lift to stop
          </div>
        ) : (
          <div className="text-center text-sm uppercase tracking-[0.32em] text-ink-cyan/85 animate-fadeIn">
            Lift finger to stop
          </div>
        )}
      </div>
    </div>
  );
}
