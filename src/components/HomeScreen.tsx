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

type ActiveSheet = 'paint' | 'settings' | null;

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
        <header className="flex items-start justify-between gap-3 pt-2">
          <h1
            className="logo-timetrace text-[3.4rem] sm:text-[3.9rem]"
            aria-label="TimeTrace"
          >
            <span className="logo-timetrace__row logo-timetrace__row--time">TIME</span>
            <span className="logo-timetrace__row logo-timetrace__row--trace">TRACE</span>
          </h1>
          <div className="card-sticker px-3 py-2 -rotate-3 shrink-0 mt-2">
            <div className="text-[9px] uppercase tracking-[0.28em] text-splat-yellow font-bold">Streak</div>
            <div className="font-poster text-2xl text-splat-yellow text-glow-gold tabular-nums leading-none mt-0.5">
              {streak}
            </div>
          </div>
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
        className="fixed bottom-0 left-1/2 z-40 w-full max-w-md -translate-x-1/2 px-4 pt-2"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.75rem)' }}
        aria-label="Level select tray"
      >
        <div className="grid grid-cols-3 gap-2 rounded-2xl border-[3px] border-splat-black bg-[#100c25]/95 p-2 shadow-[0_-10px_30px_rgba(0,0,0,0.45),0_0_22px_rgba(61,240,255,0.14)_inset] backdrop-blur-md">
          <TrayButton
            label="Paint"
            active={activeSheet === 'paint'}
            accent="cyan"
            onClick={() => openSheet('paint')}
          >
            <PaintIcon />
          </TrayButton>
          <TrayButton
            label="Leaders"
            accent="pink"
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
  children,
  onClick,
}: {
  label: string;
  active?: boolean;
  accent: 'cyan' | 'pink' | 'yellow';
  children: ReactNode;
  onClick: () => void;
}) {
  const accentClass =
    accent === 'cyan'
      ? 'text-splat-cyan border-splat-cyan/70'
      : accent === 'pink'
        ? 'text-splat-pink border-splat-pink/70'
        : 'text-splat-yellow border-splat-yellow/70';

  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={[
        'min-h-[4.25rem] rounded-xl border-2 px-2 py-2 transition-transform active:translate-y-[1px]',
        'flex flex-col items-center justify-center gap-1 bg-splat-black/70',
        active ? `${accentClass} shadow-[0_0_18px_rgba(61,240,255,0.18)]` : 'border-splat-paper/15 text-splat-paper/85',
      ].join(' ')}
    >
      <span className={active ? accentClass.split(' ')[0] : 'text-splat-paper/75'}>
        {children}
      </span>
      <span className="text-poster text-[9px] tracking-[0.16em] leading-none">
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

function PaintIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 16c5.5-7.5 11.5-7.5 16 0" />
      <path d="M6 19c3.8-3.4 8.3-3.4 12 0" />
      <path d="M7 8h.01" />
      <path d="M12 6h.01" />
      <path d="M17 8h.01" />
    </svg>
  );
}

function TrophyIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M8 4h8v4a4 4 0 0 1-8 0V4Z" />
      <path d="M8 6H5a3 3 0 0 0 3 5" />
      <path d="M16 6h3a3 3 0 0 1-3 5" />
      <path d="M12 12v5" />
      <path d="M8 20h8" />
      <path d="M10 17h4" />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z" />
      <path d="M19 12a7.8 7.8 0 0 0-.1-1l2-1.5-2-3.4-2.4 1a7 7 0 0 0-1.7-1L14.5 3h-5l-.3 3.1a7 7 0 0 0-1.7 1l-2.4-1-2 3.4 2 1.5a7.8 7.8 0 0 0 0 2l-2 1.5 2 3.4 2.4-1a7 7 0 0 0 1.7 1l.3 3.1h5l.3-3.1a7 7 0 0 0 1.7-1l2.4 1 2-3.4-2-1.5c.1-.3.1-.7.1-1Z" />
    </svg>
  );
}
