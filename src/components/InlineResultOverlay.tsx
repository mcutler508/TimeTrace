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

const GRADE_COLOR: Record<AttemptResult['grade'], string> = {
  Perfect: 'text-ink-gold text-chromatic',
  Elite: 'text-ink-cyan text-glow-cyan',
  Great: 'text-ink-cyan',
  Close: 'text-white/85',
  Miss: 'text-ink-rose',
};

const GRADE_RING: Record<AttemptResult['grade'], string | null> = {
  Perfect: '#ffd56b',
  Elite: '#00f0ff',
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
  const deltaTone = Math.abs(result.timeDelta) < 0.1 ? 'text-ink-gold' : 'text-white/70';
  const ringColor = GRADE_RING[result.grade];

  return (
    <div className="absolute inset-0 z-10 flex flex-col justify-between p-4 pointer-events-none animate-fadeIn">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(0,0,0,0) 25%, rgba(6,6,26,0.7) 100%)',
        }}
      />

      <div className="relative flex items-start justify-between">
        <div className="flex flex-col gap-1.5 pointer-events-auto">
          {isNewBest && pointsEarned > 0 && (
            <span className="px-2.5 py-1 rounded-full text-[10px] uppercase tracking-[0.24em] bg-ink-gold/15 text-ink-gold border border-ink-gold/40 shadow-glow-gold">
              New best · +{pointsEarned} pts
            </span>
          )}
          {unlockedTitle && (
            <span className="px-2.5 py-1 rounded-full text-[10px] uppercase tracking-[0.24em] bg-ink-cyan/15 text-ink-cyan border border-ink-cyan/40 shadow-glow-cyan">
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
                r="55"
                fill="none"
                stroke={ringColor}
                strokeOpacity="0.45"
                strokeWidth="1.5"
                strokeDasharray="4 8"
              />
              <circle
                cx="60"
                cy="60"
                r="48"
                fill="none"
                stroke={ringColor}
                strokeOpacity="0.18"
                strokeWidth="1"
              />
            </svg>
          )}
          <div
            className={`relative font-display font-bold text-[3.5rem] tabular-nums leading-[0.95] ${
              GRADE_COLOR[result.grade]
            } animate-scorePop`}
          >
            {result.finalScore}
          </div>
          <div
            className={`relative mt-1 px-2.5 py-0.5 inline-block rounded-full text-[10px] font-semibold tracking-[0.32em] uppercase border ${
              result.grade === 'Perfect'
                ? 'border-ink-gold/60 text-ink-gold'
                : result.grade === 'Elite'
                ? 'border-ink-cyan/60 text-ink-cyan'
                : result.grade === 'Miss'
                ? 'border-ink-rose/60 text-ink-rose'
                : 'border-white/30 text-white/85'
            }`}
          >
            {result.grade}
          </div>
        </div>
      </div>

      <div className="relative flex flex-col gap-3 pointer-events-auto">
        <div className="flex items-center justify-between text-[11px] font-mono tabular-nums">
          <span className="text-ink-cyan/85">SHAPE {result.shapeScore}</span>
          <span className={deltaTone}>
            {deltaSign}
            {deltaAbs}s
          </span>
          <span className="text-ink-gold/85">TIMING {result.timingScore}</span>
        </div>
        <div className="grid grid-cols-[2fr_1fr] gap-2">
          <button
            onClick={() => {
              haptics.micro();
              onRetry();
            }}
            className="btn-3d py-3.5 text-sm uppercase tracking-[0.32em] bg-gradient-to-b from-ink-cyan/95 to-cyan-500/80 text-bg-deep shadow-glow-cyan"
          >
            Retry
          </button>
          <button
            onClick={() => {
              haptics.micro();
              onNext();
            }}
            className="btn-3d py-3.5 text-sm uppercase tracking-[0.32em] bg-white/10 text-white border border-white/15"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
