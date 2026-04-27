import { useEffect, useRef, useState } from 'react';
import DrawingCanvas, { type DrawingCanvasHandle } from './DrawingCanvas';
import TutorialHint from './TutorialHint';
import type { Challenge, Point } from '../game/types';
import { shapeDisplayName } from '../game/shapes';

interface Props {
  challenge: Challenge;
  targetUnitPath: Point[];
  ghostUnitPath?: Point[] | null;
  bestUnitPath?: Point[] | null;
  showTutorialHints: boolean;
  bestScore?: number;
  streak: number;
  onSubmit: (path: Point[], elapsed: number) => void;
}

type Phase = 'ready' | 'armed' | 'running';

export default function ChallengeScreen({
  challenge,
  targetUnitPath,
  ghostUnitPath,
  bestUnitPath,
  showTutorialHints,
  bestScore,
  streak,
  onSubmit,
}: Props) {
  const canvasRef = useRef<DrawingCanvasHandle | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const phaseRef = useRef<Phase>('ready');
  const [phase, setPhase] = useState<Phase>('ready');
  const [elapsed, setElapsed] = useState(0);

  function changePhase(next: Phase) {
    phaseRef.current = next;
    setPhase(next);
  }

  useEffect(() => {
    canvasRef.current?.reset();
    changePhase('ready');
    setElapsed(0);
    startTimeRef.current = null;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  }, [challenge.id]);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  function handleArm() {
    canvasRef.current?.reset();
    setElapsed(0);
    changePhase('armed');
  }

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
    changePhase('ready');
    setElapsed(finalElapsed);
    onSubmit(path, finalElapsed);
  }

  function handleCancel() {
    canvasRef.current?.reset();
    changePhase('ready');
    setElapsed(0);
  }

  const target = challenge.targetTime;
  const delta = elapsed - target;
  const timerColor =
    phase === 'running'
      ? Math.abs(delta) < 0.15
        ? 'text-ink-gold text-glow-gold'
        : 'text-ink-cyan text-glow-cyan'
      : 'text-white/80';

  const canvasEnabled = phase === 'armed' || phase === 'running';

  return (
    <div className="flex flex-col h-full w-full max-w-md mx-auto px-5 pt-5 pb-6 gap-4">
      <header className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.32em] text-white/45">
            {challenge.difficulty}
          </div>
          <h1 className="font-display text-2xl font-bold leading-tight">
            {shapeDisplayName(challenge.shape)}
          </h1>
        </div>
        <div className="text-right">
          <div className="text-xs uppercase tracking-[0.32em] text-white/45">Target</div>
          <div className="font-mono text-2xl text-ink-cyan text-glow-cyan tabular-nums">
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
          enabled={canvasEnabled}
          targetUnitPath={targetUnitPath}
          guideOpacity={challenge.guideOpacity}
          ghostUnitPath={ghostUnitPath}
          bestUnitPath={bestUnitPath}
          onStrokeStart={handleStrokeStart}
          onStrokeEnd={handleStrokeEnd}
        />
        <TutorialHint show={showTutorialHints && phase === 'ready'} targetTime={target} />
        <div className="absolute top-3 right-3">
          <div
            className={`font-mono text-xl tabular-nums px-3 py-1 rounded-full bg-black/40 border border-white/10 ${timerColor}`}
          >
            {elapsed.toFixed(2)}s
          </div>
        </div>

        {phase === 'armed' && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/35 animate-fadeIn">
            <div className="text-[10px] uppercase tracking-[0.4em] text-ink-cyan/90 text-glow-cyan">
              Ready
            </div>
            <div className="font-display text-xl font-semibold text-white">
              Touch to start
            </div>
            <div className="text-xs text-white/65 max-w-[16rem] text-center">
              Timer starts the instant your finger lands. Lift to stop.
            </div>
          </div>
        )}
      </div>

      <div className="mt-auto">
        {phase === 'ready' && (
          <button
            onClick={handleArm}
            className="btn-3d w-full py-5 text-lg uppercase tracking-[0.28em] bg-gradient-to-b from-ink-cyan/95 to-cyan-500/80 text-bg-deep"
          >
            Start
          </button>
        )}
        {phase === 'armed' && (
          <button
            onClick={handleCancel}
            className="btn-3d w-full py-5 text-base uppercase tracking-[0.28em] bg-white/10 text-white/80 border border-white/15"
          >
            Cancel
          </button>
        )}
        {phase === 'running' && (
          <div className="w-full py-5 text-center text-sm uppercase tracking-[0.32em] text-ink-cyan/80">
            Lift finger to stop
          </div>
        )}
      </div>
    </div>
  );
}
