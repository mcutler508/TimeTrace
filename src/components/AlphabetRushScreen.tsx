import { useEffect, useMemo, useRef, useState } from 'react';
import DrawingCanvas, { type DrawingCanvasHandle } from './DrawingCanvas';
import InlineResultOverlay from './InlineResultOverlay';
import type { AttemptResult, Point } from '../game/types';
import { haptics } from '../game/haptics';
import { sfx } from '../game/audio';
import { ALPHABET_LOWERCASE, cursiveLetterPath } from '../game/cursiveLetters';
import { scoreAlphabetRush, scoreLetterStroke } from '../game/scoring';
import { resolvePaintColor, type PaintStyleId } from '../game/paintStyles';
import { accentFor, type ChallengeMeta } from '../game/challenges';
import type { SubmitMeta } from './ChallengeScreen';

interface Props {
  challenge: ChallengeMeta;
  bestScore?: number;
  streak: number;
  onSubmit: (
    result: AttemptResult,
    playerPath: Point[],
    elapsed: number,
  ) => SubmitMeta;
  onHome?: () => void;
  onNext?: () => void;
  paintStyleId: PaintStyleId;
  paintColorId: string;
  paintVariant?: string;
}

/** Minimum per-letter accuracy required to advance to the next glyph. */
const ADVANCE_THRESHOLD = 50;

type Phase = 'armed' | 'running' | 'result';

export default function AlphabetRushScreen({
  challenge,
  bestScore,
  streak,
  onSubmit,
  onHome,
  onNext,
  paintStyleId,
  paintColorId,
  paintVariant,
}: Props) {
  const sequence = useMemo(
    () => challenge.letterSequence ?? ALPHABET_LOWERCASE,
    [challenge.letterSequence],
  );
  const canvasRef = useRef<DrawingCanvasHandle | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const accuraciesRef = useRef<number[]>([]);

  const [phase, setPhase] = useState<Phase>('armed');
  const [letterIdx, setLetterIdx] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [lastScore, setLastScore] = useState<number | null>(null);
  const [shakeFail, setShakeFail] = useState(false);
  const [popSuccess, setPopSuccess] = useState(false);
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [submitMeta, setSubmitMeta] = useState<SubmitMeta | null>(null);

  const currentLetter = sequence[letterIdx] ?? 'a';
  const targetUnitPath = useMemo(
    () => cursiveLetterPath(currentLetter),
    [currentLetter],
  );

  const accent = accentFor(challenge.shape);

  // Reset on level (re)open.
  useEffect(() => {
    canvasRef.current?.reset();
    accuraciesRef.current = [];
    setLetterIdx(0);
    setElapsed(0);
    setLastScore(null);
    setShakeFail(false);
    setPopSuccess(false);
    setResult(null);
    setSubmitMeta(null);
    setPhase('armed');
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    startTimeRef.current = null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [challenge.id]);

  useEffect(
    () => () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    },
    [],
  );

  function handleStrokeStart() {
    if (phase !== 'armed' && phase !== 'running') return;
    if (startTimeRef.current == null) {
      // First stroke of the run starts the global clock.
      startTimeRef.current = performance.now();
      const tick = () => {
        if (startTimeRef.current == null) return;
        setElapsed((performance.now() - startTimeRef.current) / 1000);
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
      setPhase('running');
    }
  }

  function handleStrokeEnd(path: Point[]) {
    if (phase !== 'running') return;
    const score = scoreLetterStroke(path, targetUnitPath);
    setLastScore(score);
    if (score >= ADVANCE_THRESHOLD) {
      // Pass — record and advance.
      accuraciesRef.current.push(score);
      haptics.tap();
      sfx.tap();
      setPopSuccess(true);
      setTimeout(() => setPopSuccess(false), 220);
      const nextIdx = letterIdx + 1;
      if (nextIdx >= sequence.length) {
        finalize();
      } else {
        setLetterIdx(nextIdx);
        // Reset the canvas so the previous stroke clears.
        setTimeout(() => canvasRef.current?.reset(), 0);
      }
    } else {
      // Fail — shake, don't advance, don't record. Player retries.
      haptics.micro();
      sfx.tap();
      setShakeFail(true);
      setTimeout(() => setShakeFail(false), 360);
      setTimeout(() => canvasRef.current?.reset(), 240);
    }
  }

  function finalize() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    const finalElapsed =
      startTimeRef.current != null
        ? (performance.now() - startTimeRef.current) / 1000
        : elapsed;
    setElapsed(finalElapsed);
    const r = scoreAlphabetRush(
      accuraciesRef.current,
      finalElapsed,
      challenge.id,
      challenge.targetTime,
    );
    setResult(r);
    const meta = onSubmit(r, [], finalElapsed);
    setSubmitMeta(meta);
    haptics.forGrade(r.grade);
    sfx.forGrade(r.grade);
    if (meta.isNewBest && meta.pointsEarned > 0) {
      setTimeout(() => {
        haptics.newBest();
        sfx.newBest();
      }, 280);
    }
    setPhase('result');
  }

  function handleRetry() {
    canvasRef.current?.reset();
    accuraciesRef.current = [];
    setLetterIdx(0);
    setElapsed(0);
    setLastScore(null);
    setResult(null);
    setSubmitMeta(null);
    setPhase('armed');
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    startTimeRef.current = null;
  }

  const accentColor = resolvePaintColor(paintColorId, accent.stroke);

  return (
    <div
      className={`relative flex flex-col flex-1 w-full max-w-md mx-auto px-5 pt-5 pb-5 gap-4 transition-colors duration-300 ${
        shakeFail ? 'miss-flicker' : ''
      } ${popSuccess ? 'perfect-freeze' : ''}`}
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
          <div className="text-poster text-[10px] tracking-[0.32em] text-splat-pink">
            BONUS · SPEED RUN
          </div>
          <h1
            className="text-poster text-2xl leading-none mt-0.5 text-sticker"
            style={{ color: accent.stroke }}
          >
            ALPHABET RUSH
          </h1>
          <div className="text-poster text-[9px] tracking-[0.22em] text-splat-paper/55 mt-1">
            A → Z · TRACE EACH LETTER
          </div>
        </div>
        <div className="card-sticker px-3 py-2 -rotate-2">
          <div className="text-[9px] uppercase tracking-[0.28em] text-splat-yellow font-bold leading-none">
            Time
          </div>
          <div className="font-poster text-lg text-splat-paper tabular-nums leading-none mt-1">
            {elapsed.toFixed(1)}s
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
        <span className="font-poster text-[11px] tracking-[0.18em] tabular-nums">
          {letterIdx + (phase === 'result' ? 0 : 1)}/{sequence.length}
        </span>
        <span className="font-poster text-[11px] tracking-[0.18em]">
          Streak:{' '}
          <span className="tabular-nums text-splat-yellow">{streak}</span>
        </span>
      </div>

      {/* Letter progress dots */}
      <div className="flex items-center justify-center gap-1 px-1">
        {sequence.map((_, i) => (
          <span
            key={i}
            className="h-1 flex-1 rounded-full transition-colors duration-150"
            style={{
              backgroundColor:
                i < letterIdx
                  ? '#a4ff3d'
                  : i === letterIdx
                  ? accentColor
                  : 'rgba(255,245,224,0.16)',
              maxWidth: 14,
            }}
          />
        ))}
      </div>

      <div
        className="canvas-frame relative overflow-hidden p-2"
        style={{
          boxShadow: `8px 8px 0 0 #0a0708, 0 0 0 1px rgba(255,255,255,0.08) inset, 0 0 38px -2px ${accent.soft}`,
        }}
      >
        <DrawingCanvas
          ref={canvasRef}
          enabled={phase === 'armed' || phase === 'running'}
          targetUnitPath={targetUnitPath}
          guideOpacity={0.5}
          closedShape={false}
          accentColor={accentColor}
          accentSoft={accent.soft}
          paintStyleId={paintStyleId}
          paintVariant={paintVariant}
          assistEnabled={false}
          assistStrength={0}
          resultMode={phase === 'result'}
          resultPath={null}
          resultGrade={result ? result.grade : null}
          worstSegment={null}
          perfectBurst={false}
          onStrokeStart={handleStrokeStart}
          onStrokeEnd={handleStrokeEnd}
        />

        {/* Big-letter watermark over the canvas to emphasize which letter is active */}
        {phase !== 'result' && (
          <div className="pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-3">
            <div
              className="font-poster text-3xl tabular-nums px-3 py-1 rounded-full bg-splat-black border-2 border-splat-paper/40 text-splat-paper"
              style={{ minWidth: 64, textAlign: 'center' }}
            >
              {currentLetter}
            </div>
          </div>
        )}

        {/* Last-score chip — shows the just-completed letter's accuracy */}
        {phase !== 'result' && lastScore != null && (
          <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 animate-fadeIn">
            <div
              className="font-poster text-[11px] tracking-[0.22em] px-3 py-1 rounded-full bg-splat-black border"
              style={{
                color:
                  lastScore >= 75
                    ? '#a4ff3d'
                    : lastScore >= ADVANCE_THRESHOLD
                    ? '#ffe83d'
                    : '#ff3da4',
                borderColor:
                  lastScore >= ADVANCE_THRESHOLD
                    ? 'rgba(164,255,61,0.45)'
                    : 'rgba(255,61,164,0.6)',
              }}
            >
              {lastScore >= ADVANCE_THRESHOLD
                ? `+${lastScore}`
                : `RETRY · ${lastScore}`}
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
            onHome={onHome}
          />
        )}
      </div>

      <div className="flex items-center justify-center mt-1 px-1 text-poster text-[10px] tracking-[0.28em] text-splat-paper/60">
        {phase === 'armed'
          ? 'TAP & TRACE EACH LETTER · GO FAST · MIN 50%'
          : phase === 'running'
          ? 'KEEP RIPPING'
          : 'RETRY · NEXT'}
      </div>
    </div>
  );
}
