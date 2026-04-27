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
  Perfect: 'text-ink-gold text-glow-gold',
  Elite: 'text-ink-cyan text-glow-cyan',
  Great: 'text-ink-cyan',
  Close: 'text-white/85',
  Miss: 'text-ink-rose',
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

  return (
    <div className="absolute inset-0 z-10 flex flex-col justify-between p-4 pointer-events-none animate-fadeIn">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(0,0,0,0) 35%, rgba(6,6,26,0.55) 100%)',
        }}
      />

      <div className="relative flex items-start justify-between">
        <div className="flex flex-col gap-1 pointer-events-auto">
          {isNewBest && pointsEarned > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] uppercase tracking-[0.28em] bg-ink-gold/15 text-ink-gold border border-ink-gold/40">
              New best · +{pointsEarned} pts
            </span>
          )}
          {unlockedTitle && (
            <span className="px-2 py-0.5 rounded-full text-[10px] uppercase tracking-[0.28em] bg-ink-cyan/15 text-ink-cyan border border-ink-cyan/40">
              Unlocked · {unlockedTitle}
            </span>
          )}
        </div>
        <div className="text-right pointer-events-auto">
          <div
            className={`font-display font-bold text-4xl tabular-nums leading-none ${
              GRADE_COLOR[result.grade]
            } animate-scorePop`}
          >
            {result.finalScore}
          </div>
          <div
            className={`mt-0.5 text-[10px] font-semibold tracking-[0.32em] uppercase ${
              GRADE_COLOR[result.grade]
            }`}
          >
            {result.grade}
          </div>
        </div>
      </div>

      <div className="relative flex flex-col gap-3 pointer-events-auto">
        <div className="flex items-center justify-between text-[11px] font-mono tabular-nums">
          <span className="text-ink-cyan/85">Shape {result.shapeScore}</span>
          <span className={deltaTone}>
            {deltaSign}
            {deltaAbs}s
          </span>
          <span className="text-ink-gold/85">Timing {result.timingScore}</span>
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
