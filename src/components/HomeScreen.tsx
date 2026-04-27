import { CHALLENGES, pointsToNextUnlock } from '../game/challenges';
import type { AttemptResult } from '../game/types';
import ShapePreview from './ShapePreview';
import HowItWorks from './HowItWorks';

interface Props {
  totalPoints: number;
  bestScores: Record<string, AttemptResult>;
  streak: number;
  onPickChallenge: (challengeId: string) => void;
}

export default function HomeScreen({
  totalPoints,
  bestScores,
  streak,
  onPickChallenge,
}: Props) {
  const { next, needed } = pointsToNextUnlock(totalPoints);

  return (
    <div className="flex flex-col h-full w-full max-w-md mx-auto px-5 pt-6 pb-6 gap-5 overflow-y-auto">
      <header className="flex items-end justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.4em] text-ink-cyan/80 text-glow-cyan">
            TimeTrace
          </div>
          <h1 className="font-display text-3xl font-bold leading-tight mt-1">
            Trace. Stop. Repeat.
          </h1>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-[0.32em] text-white/45">Streak</div>
          <div className="font-mono text-xl text-ink-gold tabular-nums">{streak}</div>
        </div>
      </header>

      <div className="card rounded-2xl px-4 py-3 flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-[0.32em] text-white/45">
            Total Points
          </div>
          <div className="font-mono text-3xl text-ink-cyan text-glow-cyan tabular-nums leading-none mt-1">
            {totalPoints}
          </div>
        </div>
        <div className="text-right">
          {next ? (
            <>
              <div className="text-[10px] uppercase tracking-[0.32em] text-white/45">
                Next unlock
              </div>
              <div className="font-mono text-sm text-white/85">
                {needed} pts → <span className="text-ink-gold">{next.title}</span>
              </div>
            </>
          ) : (
            <>
              <div className="text-[10px] uppercase tracking-[0.32em] text-ink-gold">
                All Unlocked
              </div>
              <div className="font-mono text-sm text-white/70">Chase Perfect grades</div>
            </>
          )}
        </div>
      </div>

      <HowItWorks />

      <div>
        <div className="text-[10px] uppercase tracking-[0.32em] text-white/45 mb-2 px-1">
          Levels
        </div>
        <div className="grid grid-cols-2 gap-3">
          {CHALLENGES.map((c, idx) => {
            const unlocked = totalPoints >= c.unlockThreshold;
            const best = bestScores[c.id]?.finalScore;
            return (
              <button
                key={c.id}
                disabled={!unlocked}
                onClick={() => unlocked && onPickChallenge(c.id)}
                className={`card relative rounded-2xl p-3 text-left transition-transform active:scale-[0.97] ${
                  unlocked
                    ? 'hover:border-ink-cyan/40'
                    : 'opacity-65 cursor-not-allowed'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.28em] text-white/45">
                      Lv {idx + 1} · {c.difficulty}
                    </div>
                    <div className="font-display font-semibold text-sm leading-tight mt-0.5">
                      {c.title}
                    </div>
                  </div>
                  {!unlocked && (
                    <div className="text-ink-gold/80" aria-label="Locked">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="4" y="11" width="16" height="10" rx="2" />
                        <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                      </svg>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-center my-2">
                  <ShapePreview
                    shape={c.shape}
                    size={64}
                    stroke={unlocked ? '#00f0ff' : '#a06bff'}
                    opacity={unlocked ? 1 : 0.45}
                    glow={unlocked}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-mono text-ink-cyan/85 tabular-nums">
                    {c.targetTime.toFixed(2)}s
                  </span>
                  {unlocked ? (
                    <span className="font-mono text-white/70 tabular-nums">
                      Best {best ?? '—'}
                    </span>
                  ) : (
                    <span className="font-mono text-ink-gold/85 tabular-nums">
                      {c.unlockThreshold} pts
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <p className="text-center text-[11px] text-white/40 mt-2">
        Earn points by setting best scores. Each level's best counts once.
      </p>
    </div>
  );
}
