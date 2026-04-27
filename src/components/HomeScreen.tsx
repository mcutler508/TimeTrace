import { useState } from 'react';
import {
  CHALLENGES,
  accentFor,
  pointsToNextUnlock,
} from '../game/challenges';
import type { AttemptResult } from '../game/types';
import ShapePreview from './ShapePreview';
import HowItWorks from './HowItWorks';
import {
  getHapticsEnabled,
  haptics,
  isHapticsSupported,
  setHapticsEnabled,
} from '../game/haptics';

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
  const hapticsSupported = isHapticsSupported();
  const [hapticsOn, setHapticsOn] = useState(getHapticsEnabled());

  function toggleHaptics() {
    const v = !hapticsOn;
    setHapticsOn(v);
    setHapticsEnabled(v);
    if (v) haptics.tap();
  }

  return (
    <div className="flex flex-col h-full w-full max-w-md mx-auto px-5 pt-7 pb-6 gap-6 overflow-y-auto">
      <header className="flex items-end justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-[0.5em] text-ink-cyan/85 text-glow-cyan">
            TIMETRACE
          </div>
          <h1 className="font-display text-[2rem] font-bold leading-[1.05] mt-1.5">
            Trace.
            <br />
            Stop.
            <br />
            <span className="text-ink-gold text-glow-gold">Repeat.</span>
          </h1>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-[0.32em] text-white/45">Streak</div>
          <div className="font-mono text-3xl text-ink-gold text-glow-gold tabular-nums leading-none mt-1">
            {streak}
          </div>
        </div>
      </header>

      <div className="card-hero rounded-2xl px-4 py-4 flex items-center justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.32em] text-white/45">
            Total Points
          </div>
          <div className="font-mono text-[2.6rem] text-ink-cyan text-glow-cyan tabular-nums leading-[1.05] mt-0.5">
            {totalPoints}
          </div>
        </div>
        <div className="text-right">
          {next ? (
            <>
              <div className="text-[10px] uppercase tracking-[0.32em] text-white/45">
                Next unlock
              </div>
              <div className="font-mono text-sm text-white/85 leading-tight mt-0.5">
                {needed} pts
              </div>
              <div className="text-xs text-ink-gold mt-0.5">{next.title}</div>
            </>
          ) : (
            <>
              <div className="text-[10px] uppercase tracking-[0.32em] text-ink-gold">
                All Unlocked
              </div>
              <div className="text-xs text-white/70 mt-0.5">Chase Perfect grades</div>
            </>
          )}
        </div>
      </div>

      <HowItWorks />

      <div>
        <div className="text-[10px] uppercase tracking-[0.32em] text-white/45 mb-3 px-1">
          Levels
        </div>
        <div className="grid grid-cols-2 gap-3">
          {CHALLENGES.map((c, idx) => {
            const unlocked = totalPoints >= c.unlockThreshold;
            const best = bestScores[c.id]?.finalScore;
            const accent = accentFor(c.shape);
            return (
              <button
                key={c.id}
                disabled={!unlocked}
                onClick={() => {
                  if (!unlocked) return;
                  haptics.tap();
                  onPickChallenge(c.id);
                }}
                className={`relative rounded-2xl p-3 text-left transition-transform active:scale-[0.97] ${
                  unlocked
                    ? 'card-hero'
                    : 'card-flat'
                }`}
                style={
                  unlocked
                    ? {
                        boxShadow: `0 0 0 1px ${accent.soft.replace('0.55', '0.22')}, 0 18px 40px rgba(0,0,0,0.45)`,
                      }
                    : undefined
                }
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-[9px] uppercase tracking-[0.32em] text-white/45">
                      Lv {idx + 1}
                    </div>
                    <div
                      className={`font-display font-semibold text-sm leading-tight mt-0.5 ${
                        unlocked ? 'text-white' : 'text-white/40'
                      }`}
                    >
                      {c.title}
                    </div>
                  </div>
                  {!unlocked && (
                    <div className="text-ink-gold/85" aria-label="Locked">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="4" y="11" width="16" height="10" rx="2" />
                        <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                      </svg>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-center my-2 relative">
                  {unlocked && (
                    <div
                      className="absolute inset-0 rounded-full blur-2xl opacity-30"
                      style={{ background: accent.soft }}
                    />
                  )}
                  <ShapePreview
                    shape={c.shape}
                    size={64}
                    stroke={unlocked ? accent.stroke : '#a06bff'}
                    opacity={unlocked ? 1 : 0.25}
                    glow={unlocked}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px]">
                  <span
                    className="font-mono tabular-nums"
                    style={{ color: unlocked ? accent.stroke : 'rgba(255,255,255,0.35)' }}
                  >
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

      <p className="text-center text-[11px] text-white/40 mt-1">
        Earn points by setting best scores. Each level's best counts once.
      </p>

      <div className="flex items-center justify-center pb-2 mt-auto">
        {hapticsSupported ? (
          <button
            onClick={toggleHaptics}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] uppercase tracking-[0.24em] bg-white/5 text-white/65 border border-white/10 active:scale-95"
            aria-pressed={hapticsOn}
          >
            <span
              className={`inline-block w-1.5 h-1.5 rounded-full ${
                hapticsOn ? 'bg-ink-cyan shadow-glow-cyan' : 'bg-white/30'
              }`}
            />
            Haptics {hapticsOn ? 'On' : 'Off'}
          </button>
        ) : (
          <span className="text-[10px] uppercase tracking-[0.24em] text-white/30">
            Haptics not available on this device
          </span>
        )}
      </div>
    </div>
  );
}
