import type { AttemptResult } from '../game/types';
import { haptics } from '../game/haptics';

interface Props {
  result: AttemptResult;
  isNewBest: boolean;
  pointsEarned: number;
  unlockedTitle: string | null;
  onRetry: () => void;
  onNext: () => void;
}

const GRADE_TEXT: Record<AttemptResult['grade'], string> = {
  Perfect: 'text-rainbow',
  Elite: 'text-splat-yellow text-glow-gold',
  Great: 'text-splat-cyan text-glow-cyan',
  Close: 'text-splat-paper',
  Miss: 'text-splat-pink text-glow-pink',
};

const GRADE_BG: Record<AttemptResult['grade'], string> = {
  Perfect: 'bg-splat-yellow text-splat-black',
  Elite: 'bg-splat-cyan text-splat-black',
  Great: 'bg-splat-lime text-splat-black',
  Close: 'bg-splat-paper text-splat-black',
  Miss: 'bg-splat-pink text-splat-paper',
};

const GRADE_RING: Record<AttemptResult['grade'], string | null> = {
  Perfect: '#ffe83d',
  Elite: '#3df0ff',
  Great: null,
  Close: null,
  Miss: null,
};

export default function InlineResultOverlay({
  result,
  isNewBest,
  pointsEarned,
  unlockedTitle,
  onRetry,
  onNext,
}: Props) {
  const deltaSign = result.timeDelta >= 0 ? '+' : '−';
  const deltaAbs = Math.abs(result.timeDelta).toFixed(2);
  const deltaTone = Math.abs(result.timeDelta) < 0.1 ? 'text-splat-yellow' : 'text-splat-paper/75';
  const ringColor = GRADE_RING[result.grade];

  return (
    <div className="absolute inset-0 z-10 flex flex-col justify-between p-4 pointer-events-none animate-fadeIn">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(0,0,0,0) 22%, rgba(6,6,26,0.8) 100%)',
        }}
      />

      <div className="relative flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1.5 pointer-events-auto">
          {isNewBest && pointsEarned > 0 && (
            <span className="px-3 py-1 rounded-full text-[10px] uppercase tracking-[0.22em] font-poster bg-splat-yellow text-splat-black border-2 border-black -rotate-2 shadow-[3px_3px_0_0_#0a0708]">
              New best · +{pointsEarned}
            </span>
          )}
          {unlockedTitle && (
            <span className="px-3 py-1 rounded-full text-[10px] uppercase tracking-[0.22em] font-poster bg-splat-cyan text-splat-black border-2 border-black rotate-2 shadow-[3px_3px_0_0_#0a0708]">
              Unlocked · {unlockedTitle}
            </span>
          )}
        </div>
        <div className="text-right pointer-events-auto relative">
          {ringColor && (
            <svg
              className="trophy-ring"
              viewBox="0 0 120 120"
              width="120%"
              height="120%"
            >
              <circle
                cx="60"
                cy="60"
                r="56"
                fill="none"
                stroke={ringColor}
                strokeOpacity="0.6"
                strokeWidth="3"
                strokeDasharray="6 8"
              />
              <circle
                cx="60"
                cy="60"
                r="48"
                fill="none"
                stroke={ringColor}
                strokeOpacity="0.25"
                strokeWidth="1.5"
              />
            </svg>
          )}
          <div
            className={`relative font-poster text-[4rem] tabular-nums leading-[0.9] text-sticker-lg ${
              GRADE_TEXT[result.grade]
            } animate-scorePop`}
          >
            {result.finalScore}
          </div>
          <div
            className={`relative mt-2 px-3 py-1 inline-block rounded-full text-[11px] tracking-[0.28em] font-poster border-2 border-black -rotate-3 shadow-[3px_3px_0_0_#0a0708] ${
              GRADE_BG[result.grade]
            }`}
          >
            {result.grade.toUpperCase()}
          </div>
        </div>
      </div>

      <div className="relative flex flex-col gap-3 pointer-events-auto">
        <div className="flex items-center justify-between text-[11px] font-poster tabular-nums">
          <span className="text-splat-cyan text-glow-cyan">SHAPE {result.shapeScore}</span>
          <span className={deltaTone}>
            {deltaSign}
            {deltaAbs}s
          </span>
          <span className="text-splat-yellow text-glow-gold">TIMING {result.timingScore}</span>
        </div>
        <div className="grid grid-cols-[2fr_1fr] gap-3">
          <button
            onClick={() => {
              haptics.micro();
              onRetry();
            }}
            className="btn-sticker py-3.5 text-poster text-base tracking-[0.18em] bg-splat-yellow text-splat-black"
          >
            RETRY
          </button>
          <button
            onClick={() => {
              haptics.micro();
              onNext();
            }}
            className="btn-sticker py-3.5 text-poster text-base tracking-[0.18em] bg-splat-cyan text-splat-black"
          >
            NEXT
          </button>
        </div>
      </div>
    </div>
  );
}
