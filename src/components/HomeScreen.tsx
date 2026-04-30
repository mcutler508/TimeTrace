import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
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
  paintColorByStyle: Record<string, string>;
  paintVariantByStyle: Record<string, string>;
  onPickChallenge: (challengeId: string) => void;
  onSignOut?: () => void;
  onOpenLeaderboard?: () => void;
  onEditName?: (name: string) => void;
  onSelectPaintStyle: (id: PaintStyleId) => void;
  onSelectPaintColor: (id: PaintStyleId, colorId: string) => void;
  onSelectPaintVariant: (id: PaintStyleId, variantId: string) => void;
}

type ActiveSheet = 'paint' | 'stats' | 'settings' | null;

export default function HomeScreen({
  totalPoints,
  bestScores,
  streak,
  playerName,
  focusChallengeId,
  paintStyleId,
  paintColorByStyle,
  paintVariantByStyle,
  onPickChallenge,
  onSignOut,
  onOpenLeaderboard,
  onEditName,
  onSelectPaintStyle,
  onSelectPaintColor,
  onSelectPaintVariant,
}: Props) {
  const { next, needed } = pointsToNextUnlock(totalPoints);
  const hapticsSupported = isHapticsSupported();
  const soundSupported = isSoundSupported();
  const [hapticsOn, setHapticsOn] = useState(getHapticsEnabled());
  const [soundOn, setSoundOn] = useState(getSoundEnabled());
  const [editingName, setEditingName] = useState(false);
  const [activeSheet, setActiveSheet] = useState<ActiveSheet>(null);
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
    // Find the nearest scrollable ancestor. It can be the root or the page.
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

  function openSheet(sheet: Exclude<ActiveSheet, null>) {
    haptics.tap();
    sfx.tap();
    setActiveSheet((current) => (current === sheet ? null : sheet));
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
    <>
      <div
        ref={scrollRef}
        className="flex flex-col flex-1 w-full max-w-md mx-auto px-5 pt-8 pb-36 gap-6 overflow-y-auto"
      >
        <header className="flex items-start justify-center gap-3 pt-2">
          <h1
            className="logo-timetrace text-[3.6rem] sm:text-[4.2rem]"
            aria-label="TimeTrace"
          >
            <span className="logo-timetrace__row logo-timetrace__row--time">TIME</span>
            <span className="logo-timetrace__row logo-timetrace__row--trace">TRACE</span>
          </h1>
        </header>

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

        {CHAPTERS.map((chap) => (
          <LevelMap
            key={chap.id}
            chapter={chap}
            totalPoints={totalPoints}
            bestScores={bestScores}
            onPickChallenge={onPickChallenge}
          />
        ))}

        <p className="text-center text-[11px] text-splat-paper/55 mt-1">
          Earn points by setting best scores. Each level's best counts once.
        </p>
      </div>

      {activeSheet && (
        <button
          type="button"
          aria-label="Close tray panel"
          className="fixed inset-0 z-30 bg-splat-black/45 backdrop-blur-[2px]"
          onClick={() => setActiveSheet(null)}
        />
      )}

      {activeSheet === 'paint' && (
        <TraySheet title="Paint" onClose={() => setActiveSheet(null)}>
          <PaintStylePicker
            selectedId={paintStyleId}
            paintColorByStyle={paintColorByStyle}
            paintVariantByStyle={paintVariantByStyle}
            onSelect={onSelectPaintStyle}
            onSelectColor={onSelectPaintColor}
            onSelectVariant={onSelectPaintVariant}
            forceOpen
            className="rotate-0"
          />
        </TraySheet>
      )}

      {activeSheet === 'stats' && (
        <TraySheet title="Stats" onClose={() => setActiveSheet(null)}>
          <div className="flex flex-col gap-3">
            <StatTile
              label="Current Streak"
              value={streak}
              accent="yellow"
              hint={
                streak > 0
                  ? 'Levels passed in a row at 70+ pts.'
                  : 'Score 70+ on a level to start a streak.'
              }
            />
            <p className="text-[10px] uppercase tracking-[0.22em] text-splat-paper/55 text-center">
              More stats coming soon
            </p>
          </div>
        </TraySheet>
      )}

      {activeSheet === 'settings' && (
        <TraySheet title="Settings" onClose={() => setActiveSheet(null)}>
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => {
                haptics.tap();
                sfx.tap();
                setActiveSheet(null);
                setEditingName(true);
              }}
              className="rounded-xl border-2 border-splat-black bg-splat-paper/95 px-3 py-2 text-left active:translate-y-[1px]"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[9px] uppercase tracking-[0.24em] text-splat-pink font-bold">
                    Handle
                  </div>
                  <div className="text-poster text-base text-splat-black truncate max-w-[13rem]">
                    {playerName || 'NO NAME'}
                  </div>
                </div>
                <span className="text-poster text-[10px] tracking-[0.18em] text-splat-violet">
                  Edit
                </span>
              </div>
            </button>

            <HowItWorks variant="inline" />

            <div className="grid grid-cols-2 gap-2">
              {soundSupported && (
                <ToggleButton
                  label="Sound"
                  active={soundOn}
                  activeClassName="bg-splat-cyan"
                  onClick={toggleSound}
                />
              )}
              {hapticsSupported ? (
                <ToggleButton
                  label="Haptics"
                  active={hapticsOn}
                  activeClassName="bg-splat-pink"
                  onClick={() => {
                    sfx.tap();
                    toggleHaptics();
                  }}
                />
              ) : (
                <div className="rounded-xl border-2 border-splat-black bg-splat-black/35 px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-splat-paper/55">
                  Haptics unavailable
                </div>
              )}
            </div>

            {onSignOut && (
              <button
                type="button"
                onClick={() => {
                  sfx.tap();
                  setActiveSheet(null);
                  onSignOut();
                }}
                className="btn-sticker-sm bg-splat-yellow text-splat-black px-3 py-2 text-poster text-[10px] uppercase tracking-[0.22em]"
              >
                Sign out
              </button>
            )}
          </div>
        </TraySheet>
      )}

      <nav
        className="fixed bottom-0 left-1/2 z-40 w-full max-w-md -translate-x-1/2 px-4 pt-3"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.85rem)' }}
        aria-label="Level select tray"
      >
        <div className="grid grid-cols-4 gap-3 px-1.5 pt-3 pb-1">
          <TrayButton
            label="Paint"
            active={activeSheet === 'paint'}
            accent="cyan"
            tilt={-2.5}
            onClick={() => openSheet('paint')}
          >
            <PaintIcon />
          </TrayButton>
          <TrayButton
            label="Stats"
            active={activeSheet === 'stats'}
            accent="lime"
            tilt={1.5}
            onClick={() => openSheet('stats')}
          >
            <StatsIcon />
          </TrayButton>
          <TrayButton
            label="Leaders"
            accent="pink"
            tilt={-1.5}
            onClick={() => {
              haptics.tap();
              sfx.tap();
              onOpenLeaderboard?.();
            }}
          >
            <TrophyIcon />
          </TrayButton>
          <TrayButton
            label="Settings"
            active={activeSheet === 'settings'}
            accent="yellow"
            tilt={2.2}
            onClick={() => openSheet('settings')}
          >
            <GearIcon />
          </TrayButton>
        </div>
      </nav>
    </>
  );
}

function TraySheet({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <section
      role="dialog"
      aria-modal="true"
      aria-labelledby="tray-sheet-title"
      className="fixed left-1/2 z-50 w-full max-w-md -translate-x-1/2 px-4"
      style={{
        bottom: 'calc(env(safe-area-inset-bottom) + 5.6rem)',
        maxHeight: 'calc(100dvh - env(safe-area-inset-bottom) - 7rem)',
      }}
    >
      <div className="card-sticker-lg max-h-[inherit] overflow-y-auto bg-[#17102d]/96 p-4">
        <div className="flex items-center gap-3 mb-3">
          <h2
            id="tray-sheet-title"
            className="text-poster text-base tracking-[0.18em] text-splat-yellow text-glow-gold"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="ml-auto grid h-9 w-9 place-items-center rounded-xl border-2 border-splat-black bg-splat-paper text-splat-black font-bold active:translate-y-[1px]"
            aria-label="Close"
          >
            X
          </button>
        </div>
        {children}
      </div>
    </section>
  );
}

function TrayButton({
  label,
  active = false,
  accent,
  tilt = 0,
  children,
  onClick,
}: {
  label: string;
  active?: boolean;
  accent: 'cyan' | 'pink' | 'yellow' | 'lime';
  /** Resting tilt in degrees. Active state straightens to 0. */
  tilt?: number;
  children: ReactNode;
  onClick: () => void;
}) {
  const palette = {
    cyan: { text: 'text-splat-cyan', bg: 'bg-splat-cyan', glow: 'rgba(61, 240, 255, 0.55)' },
    pink: { text: 'text-splat-pink', bg: 'bg-splat-pink', glow: 'rgba(255, 61, 164, 0.55)' },
    yellow: { text: 'text-splat-yellow', bg: 'bg-splat-yellow', glow: 'rgba(255, 232, 61, 0.55)' },
    lime: { text: 'text-splat-lime', bg: 'bg-splat-lime', glow: 'rgba(164, 255, 61, 0.55)' },
  } as const;
  const p = palette[accent];

  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={[
        'relative min-h-[5rem] px-2 py-2.5 rounded-xl border-[3px] border-splat-black',
        'flex flex-col items-center justify-center gap-1.5 transition-all duration-150',
        'active:translate-x-[1px] active:translate-y-[1px]',
        active
          ? `${p.bg} text-splat-black scale-[1.08]`
          : 'bg-splat-paper text-splat-black hover:-translate-y-[1px]',
      ].join(' ')}
      style={{
        transform: active ? 'rotate(0deg)' : `rotate(${tilt}deg)`,
        boxShadow: active
          ? `4px 4px 0 0 #0a0708, 0 0 22px ${p.glow}, 0 0 42px ${p.glow}`
          : '4px 4px 0 0 #0a0708',
      }}
    >
      <span className={active ? 'text-splat-black' : p.text}>{children}</span>
      <span
        className={`text-poster text-[11px] tracking-[0.16em] leading-none ${
          active ? 'text-splat-black' : 'text-splat-black/85'
        }`}
      >
        {label}
      </span>
    </button>
  );
}

function ToggleButton({
  label,
  active,
  activeClassName,
  onClick,
}: {
  label: string;
  active: boolean;
  activeClassName: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="btn-sticker-sm bg-splat-yellow text-splat-black px-3 py-2 text-poster text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-2"
    >
      <span
        className={`inline-block w-2.5 h-2.5 rounded-full border border-splat-black ${
          active ? activeClassName : 'bg-splat-black/30'
        }`}
      />
      {label} {active ? 'On' : 'Off'}
    </button>
  );
}

/** Icons are sticker silhouettes: solid currentColor fills with optional white
 *  highlight cells. They read on cream (inactive) and on accent (active) bgs. */

function PaintIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden>
      {/* curving stroke ribbon — calls out the game itself */}
      <path
        d="M3 18 C 8 6, 16 6, 25 13"
        fill="none"
        stroke="currentColor"
        strokeWidth="3.6"
        strokeLinecap="round"
      />
      {/* sparkle stars */}
      <path
        d="M22 6 l1.2 2.4 2.4 1.2 -2.4 1.2 -1.2 2.4 -1.2 -2.4 -2.4 -1.2 2.4 -1.2 z"
        fill="currentColor"
      />
      <circle cx="6" cy="22" r="1.6" fill="currentColor" />
    </svg>
  );
}

function TrophyIcon() {
  // Crown — feels more arcade-leaderboard than a trophy cup
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden>
      <path
        d="M4 9 L8 15 L14 6 L20 15 L24 9 L23 21 L5 21 Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="4" cy="9" r="1.8" fill="currentColor" />
      <circle cx="14" cy="6" r="1.8" fill="currentColor" />
      <circle cx="24" cy="9" r="1.8" fill="currentColor" />
      <rect x="6.5" y="22.5" width="15" height="2.5" rx="0.8" fill="currentColor" />
    </svg>
  );
}

function StatsIcon() {
  // Chunky filled bars with a star spark on top of the tallest
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden>
      <rect x="3" y="16" width="6" height="9" rx="1.2" fill="currentColor" />
      <rect x="11" y="9" width="6" height="16" rx="1.2" fill="currentColor" />
      <rect x="19" y="13" width="6" height="12" rx="1.2" fill="currentColor" />
      {/* spark on the tallest bar */}
      <path
        d="M14 3 l1.2 2.4 2.4 1.2 -2.4 1.2 -1.2 2.4 -1.2 -2.4 -2.4 -1.2 2.4 -1.2 z"
        fill="currentColor"
      />
    </svg>
  );
}

function StatTile({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: number | string;
  hint?: string;
  accent: 'yellow' | 'cyan' | 'pink' | 'lime' | 'violet';
}) {
  const valueClass =
    accent === 'yellow'
      ? 'text-splat-yellow text-glow-gold'
      : accent === 'cyan'
        ? 'text-splat-cyan text-glow-cyan'
        : accent === 'pink'
          ? 'text-splat-pink text-glow-pink'
          : accent === 'lime'
            ? 'text-splat-lime'
            : 'text-splat-violet';
  return (
    <div className="rounded-xl border-2 border-splat-black bg-splat-black/55 px-4 py-3 flex items-center justify-between gap-4">
      <div>
        <div className="text-[9px] uppercase tracking-[0.26em] font-bold text-splat-paper/65">
          {label}
        </div>
        {hint && (
          <div className="text-[10px] text-splat-paper/55 mt-0.5 leading-snug max-w-[14rem]">
            {hint}
          </div>
        )}
      </div>
      <div className={`font-poster text-4xl tabular-nums leading-none ${valueClass}`}>
        {value}
      </div>
    </div>
  );
}

function GearIcon() {
  // Sparkles — two 4-point stars, big + small. Same star shape used in the
  // Comet and Constellation paint styles, so the language stays consistent.
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden>
      {/* big star */}
      <path
        d="M11 3 L13.5 9.5 L20 12 L13.5 14.5 L11 21 L8.5 14.5 L2 12 L8.5 9.5 Z"
        fill="currentColor"
      />
      {/* small star */}
      <path
        d="M21 16 L22.4 19.6 L26 21 L22.4 22.4 L21 26 L19.6 22.4 L16 21 L19.6 19.6 Z"
        fill="currentColor"
      />
    </svg>
  );
}
