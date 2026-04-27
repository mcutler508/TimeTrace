import type { Grade } from '../game/types';

interface Props {
  score: number;
  grade: Grade;
}

const GRADE_STYLES: Record<Grade, string> = {
  Perfect: 'text-ink-gold text-glow-gold',
  Elite: 'text-ink-cyan text-glow-cyan',
  Great: 'text-ink-cyan',
  Close: 'text-white/85',
  Miss: 'text-ink-rose',
};

export default function ScoreBadge({ score, grade }: Props) {
  return (
    <div className="flex flex-col items-center animate-scorePop">
      <div
        className={`font-display font-bold text-7xl tabular-nums leading-none ${GRADE_STYLES[grade]}`}
      >
        {score}
      </div>
      <div
        className={`mt-1 text-sm font-semibold tracking-[0.3em] uppercase ${GRADE_STYLES[grade]}`}
      >
        {grade}
      </div>
    </div>
  );
}
