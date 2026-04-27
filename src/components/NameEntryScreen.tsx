import { useEffect, useMemo, useRef, useState } from 'react';
import { haptics } from '../game/haptics';
import { bootAudio, sfx } from '../game/audio';

interface Props {
  initialName?: string;
  mode?: 'first-launch' | 'edit';
  onSubmit: (name: string) => void;
  onCancel?: () => void;
}

const PLACEHOLDER_POOL = [
  'Magenta Comet',
  'Cyan Bolt',
  'Ghost Spiral',
  'Neon Wolf',
  'Pulse Riot',
  'Static Hex',
  'Volt Heart',
  'Glitch Star',
];

export default function NameEntryScreen({
  initialName = '',
  mode = 'first-launch',
  onSubmit,
  onCancel,
}: Props) {
  const [value, setValue] = useState(initialName);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const placeholder = useMemo(
    () => PLACEHOLDER_POOL[Math.floor(Math.random() * PLACEHOLDER_POOL.length)],
    [],
  );

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const trimmed = value.trim();
  const tooLong = trimmed.length > 20;
  const valid = trimmed.length >= 1 && !tooLong;

  function commit() {
    if (!valid) return;
    bootAudio();
    haptics.tap();
    sfx.tap();
    onSubmit(trimmed);
  }

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') commit();
    if (e.key === 'Escape' && onCancel) onCancel();
  }

  return (
    <div className="flex flex-col flex-1 w-full max-w-md mx-auto px-5 pt-7 pb-6 gap-6 justify-center">
      <div className="card-sticker px-5 py-6 -rotate-1 flex flex-col gap-4">
        <div>
          <div className="text-poster text-[10px] tracking-[0.34em] text-splat-yellow">
            {mode === 'edit' ? 'CHANGE HANDLE' : 'PICK YOUR HANDLE'}
          </div>
          <h2 className="text-poster text-2xl leading-tight mt-2 text-splat-paper text-sticker">
            {mode === 'edit' ? 'NEW NAME?' : 'WHO ARE YOU?'}
          </h2>
          <p className="text-[12px] text-splat-paper/70 mt-2 leading-snug">
            {mode === 'edit'
              ? 'Update the name that shows up on the global leaderboard.'
              : 'This is how you appear on the global leaderboard. No account, no email — just a handle.'}
          </p>
        </div>

        <label className="flex flex-col gap-1.5">
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKey}
            placeholder={placeholder}
            maxLength={28}
            spellCheck={false}
            autoComplete="off"
            autoCapitalize="words"
            className="text-poster text-lg tracking-[0.04em] px-3 py-3 rounded-xl bg-splat-black border-2 border-splat-paper text-splat-paper placeholder:text-splat-paper/35 focus:outline-none focus:border-splat-yellow focus:ring-2 focus:ring-splat-yellow/40"
          />
          <div className="flex items-center justify-between text-[10px] font-poster tracking-[0.2em] text-splat-paper/55">
            <span>{trimmed.length}/20</span>
            {tooLong && <span className="text-splat-pink">TOO LONG</span>}
          </div>
        </label>

        <div className="flex flex-col gap-2.5">
          <button
            onClick={commit}
            disabled={!valid}
            className={`btn-sticker py-3.5 text-poster text-base tracking-[0.2em] bg-splat-yellow text-splat-black ${
              !valid ? 'opacity-50 pointer-events-none' : ''
            }`}
          >
            {mode === 'edit' ? 'SAVE' : 'BEGIN'}
          </button>
          {onCancel && (
            <button
              onClick={() => {
                haptics.micro();
                onCancel();
              }}
              className="btn-sticker-sm py-2 text-poster text-[10px] tracking-[0.2em] bg-splat-paper text-splat-black"
            >
              CANCEL
            </button>
          )}
        </div>
      </div>

      {mode === 'first-launch' && (
        <p className="text-center text-[11px] text-splat-paper/45">
          You can change this any time from the Home screen.
        </p>
      )}
    </div>
  );
}
