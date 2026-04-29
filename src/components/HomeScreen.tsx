import { useLayoutEffect, useRef, useState } from 'react';
import {
  CHAPTERS,
  pointsToNextUnlock,
} from '../game/challenges';
import type { AttemptResult } from '../game/types';
import LevelMap from './LevelMap';
import HowItWorks from './HowItWorks';
import NameEntryScreen from './NameEntryScreen';
import PaintStylePicker from './PaintStylePicker';
import type { PaintStyleId } from '../game/paintStyles';
import {
  getHapticsEnabled,
  haptics,
  isHapticsSupported,
  setHapticsEnabled,
} from '../game/haptics';
import {
  bootAudio,
  getSoundEnabled,
  isSoundSupported,
  setSoundEnabled,
  sfx,
} from '../game/audio';

interface Props {
  totalPoints: number;
  bestScores: Record<string, AttemptResult>;
  streak: number;
  playerName: string;
  /** Challenge to scroll into view on first mount (the level the player just exited). */
  focusChallengeId?: string | null;
  paintStyleId: PaintStyleId;
  onPickChallenge: (challengeId: string) => void;
  onSignOut?: () => void;
  onOpenLeaderboard?: () => void;
  onEditName?: (name: string) => void;
  onSelectPaintStyle: (id: PaintStyleId) => void;
}

export default function HomeScreen({
  totalPoints,
  bestScores,
  streak,
  playerName,
  focusChallengeId,
  paintStyleId,
  onPickChallenge,
  onSignOut,
  onOpenLeaderboard,
  onEditName,
  onSelectPaintStyle,
}: Props) {
  const { next, needed } = pointsToNextUnlock(totalPoints);
  const hapticsSupported = isHapticsSupported();
  const soundSupported = isSoundSupported();
  const [hapticsOn, setHapticsOn] = useState(getHapticsEnabled());
  const [soundOn, setSoundOn] = useState(getSoundEnabled());
  const [editingName, setEditingName] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const didFocusRef = useRef(false);

  useLayoutEffect(() => {
    if (didFocusRef.current) return;
    if (!focusChallengeId) return;
    const root = scrollRef.current;
    if (!root) return;
    const target = root.querySelector<HTMLElement>(
      `[data-level-id="${CSS.escape(focusChallengeId)}"]`,
    );
    if (!target) return;
    didFocusRef.current = true;
    // Find the nearest scrollable ancestor — could be `root` or could be the
    // viewport itself (the page scrolls when the wrapper uses min-height).
    const findScroller = (el: HTMLElement | null): HTMLElement | Window => {
      for (let cur = el; cur; cur = cur.parentElement) {
        const cs = window.getComputedStyle(cur);
        if (
          (cs.overflowY === 'auto' || cs.overflowY === 'scroll') &&
          cur.scrollHeight > cur.clientHeight
        ) {
          return cur;
        }
      }
      return window;
    };
    const scroller = findScroller(target);
    const targetBox = target.getBoundingClientRect();
    if (scroller === window) {
      const viewportH = window.innerHeight;
      const top = window.scrollY + targetBox.top - viewportH / 2 + targetBox.height / 2;
      window.scrollTo({ top: Math.max(0, top), behavior: 'auto' });
    } else {
      const el = scroller as HTMLElement;
      const elBox = el.getBoundingClientRect();
      const top = el.scrollTop + targetBox.top - elBox.top - elBox.height / 2 + targetBox.height / 2;
      el.scrollTo({ top: Math.max(0, top), behavior: 'auto' });
    }
  }, [focusChallengeId]);

  function toggleHaptics() {
    const v = !hapticsOn;
    setHapticsOn(v);
    setHapticsEnabled(v);
    if (v) haptics.tap();
  }

  function toggleSound() {
    const v = !soundOn;
    bootAudio();
    setSoundEnabled(v);
    setSoundOn(v);
    if (v) sfx.tap();
  }

  function handleSaveName(name: string) {
    setEditingName(false);
    onEditName?.(name);
  }

  if (editingName) {
    return (
      <NameEntryScreen
        initialName={playerName}
        mode="edit"
        onSubmitName={handleSaveName}
        onCancel={() => setEditingName(false)}
      />
    );
  }

  return (
    <div
      ref={scrollRef}
      className="flex flex-col flex-1 w-full max-w-md mx-auto px-5 pt-8 pb-6 gap-6 overflow-y-auto"
    >
      <header className="flex items-end justify-between gap-3">
        <div>
          <div className="text-poster text-[11px] tracking-[0.3em] text-splat-yellow text-glow-gold">
            ZAP · TRACE
          </div>
          <h1 className="text-poster text-[2.7rem] leading-[0.95] mt-2 text-rainbow">
            TIME<br />TRACE.
          </h1>
        </div>
        <div className="card-sticker px-3 py-2 -rotate-3 shrink-0">
          <div className="text-[9px] uppercase tracking-[0.28em] text-splat-yellow font-bold">Streak</div>
          <div className="font-poster text-2xl text-splat-yellow text-glow-gold tabular-nums leading-none mt-0.5">
            {streak}
          </div>
        </div>
      </header>

      <div className="flex items-center gap-3">
        <button
          onClick={() => {
            haptics.tap();
            sfx.tap();
            setEditingName(true);
          }}
          className="card-sticker px-3 py-2 flex items-center gap-2 -rotate-1 active:translate-x-[2px] active:translate-y-[2px]"
          aria-label="Edit your handle"
        >
          <span className="text-poster text-[9px] tracking-[0.28em] text-splat-yellow">
            HANDLE
          </span>
          <span className="text-poster text-sm text-splat-paper text-sticker truncate max-w-[8rem]">
            {playerName || 'NO NAME'}
          </span>
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#ffe83d"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
          </svg>
        </button>
        {onOpenLeaderboard && (
          <button
            onClick={() => {
              haptics.tap();
              sfx.tap();
              onOpenLeaderboard();
            }}
            className="btn-sticker-sm px-3 py-2 text-poster text-[10px] tracking-[0.22em] bg-splat-pink text-splat-paper ml-auto"
          >
            LEADERBOARD →
          </button>
        )}
      </div>

      <div className="card-sticker-paper px-4 py-4 flex items-center justify-between gap-3 rotate-[-0.6deg]">
        <div>
          <div className="text-[10px] uppercase tracking-[0.28em] font-bold text-splat-pink">
            Total Points
          </div>
          <div className="font-poster text-[2.7rem] text-splat-black tabular-nums leading-none mt-1">
            {totalPoints}
          </div>
        </div>
        <div className="text-right">
          {next ? (
            <>
              <div className="text-[10px] uppercase tracking-[0.28em] font-bold text-splat-violet">
                Next unlock
              </div>
              <div className="font-poster text-base text-splat-black mt-0.5">
                {needed} pts
              </div>
              <div className="text-xs font-bold text-splat-pink mt-0.5">{next.title}</div>
            </>
          ) : (
            <>
              <div className="text-[10px] uppercase tracking-[0.28em] font-bold text-splat-pink">
                All Unlocked
              </div>
              <div className="text-xs font-semibold text-splat-black/70 mt-0.5">Chase Perfect</div>
            </>
          )}
        </div>
      </div>

      <PaintStylePicker
        selectedId={paintStyleId}
        onSelect={onSelectPaintStyle}
      />

      {CHAPTERS.map((chap) => (
        <LevelMap
          key={chap.id}
          chapter={chap}
          totalPoints={totalPoints}
          bestScores={bestScores}
          onPickChallenge={onPickChallenge}
        />
      ))}

      <HowItWorks />

      <p className="text-center text-[11px] text-splat-paper/55 mt-1">
        Earn points by setting best scores. Each level's best counts once.
      </p>

      <div className="flex items-center justify-center gap-3 pb-2 mt-auto flex-wrap">
        {soundSupported && (
          <button
            onClick={toggleSound}
            className="btn-sticker-sm px-3 py-1.5 text-[10px] uppercase tracking-[0.24em] bg-splat-yellow text-splat-black font-poster flex items-center gap-2"
            aria-pressed={soundOn}
          >
            <span
              className={`inline-block w-2 h-2 rounded-full border border-splat-black ${
                soundOn ? 'bg-splat-cyan' : 'bg-splat-black/30'
              }`}
            />
            Sound {soundOn ? 'On' : 'Off'}
          </button>
        )}
        {hapticsSupported ? (
          <button
            onClick={() => {
              sfx.tap();
              toggleHaptics();
            }}
            className="btn-sticker-sm px-3 py-1.5 text-[10px] uppercase tracking-[0.24em] bg-splat-yellow text-splat-black font-poster flex items-center gap-2"
            aria-pressed={hapticsOn}
          >
            <span
              className={`inline-block w-2 h-2 rounded-full border border-splat-black ${
                hapticsOn ? 'bg-splat-pink' : 'bg-splat-black/30'
              }`}
            />
            Haptics {hapticsOn ? 'On' : 'Off'}
          </button>
        ) : (
          <span className="text-[10px] uppercase tracking-[0.24em] text-splat-paper/30">
            Haptics not on this device
          </span>
        )}
        {onSignOut && (
          <button
            onClick={() => {
              sfx.tap();
              onSignOut();
            }}
            className="btn-sticker-sm px-3 py-1.5 text-[10px] uppercase tracking-[0.24em] bg-splat-yellow text-splat-black font-poster"
          >
            Sign out
          </button>
        )}
      </div>
    </div>
  );
}
