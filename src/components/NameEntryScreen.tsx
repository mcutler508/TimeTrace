import { useEffect, useMemo, useRef, useState } from 'react';
import { haptics } from '../game/haptics';
import { bootAudio, sfx } from '../game/audio';
import { containsProfanity, isValidPasscode } from '../game/auth';
import {
  isLeaderboardConfigured,
  signIn as remoteSignIn,
  signUp as remoteSignUp,
  type LeaderboardEntry,
  type SignInError,
  type SignUpError,
} from '../game/leaderboard';

export type NameMode = 'signup' | 'signin' | 'edit';

interface Props {
  initialName?: string;
  mode?: NameMode;
  initialFlow?: 'signup' | 'signin';
  playerId?: string;
  onSignedUp?: (name: string, passcode: string) => void;
  onSignedIn?: (player: LeaderboardEntry) => void;
  onSubmitName?: (name: string) => void;
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

const SIGNUP_ERROR_MSG: Record<SignUpError, string> = {
  'name-taken': 'That handle is already taken.',
  'invalid-name': 'Pick a handle (1–20 characters).',
  'inappropriate-name': 'Pick a different handle — keep it clean.',
  'invalid-passcode': 'Passcode must be 4 digits.',
  unconfigured: 'Leaderboard is offline. Try again later.',
  network: 'Could not reach the server. Try again.',
};

const SIGNIN_ERROR_MSG: Record<SignInError, string> = {
  'not-found': 'No account with that handle.',
  'wrong-passcode': 'Wrong passcode. Try again.',
  'invalid-name': 'Enter the handle you signed up with.',
  'invalid-passcode': 'Passcode must be 4 digits.',
  unconfigured: 'Leaderboard is offline. Try again later.',
  network: 'Could not reach the server. Try again.',
};

export default function NameEntryScreen({
  initialName = '',
  mode = 'signup',
  initialFlow,
  playerId,
  onSignedUp,
  onSignedIn,
  onSubmitName,
  onCancel,
}: Props) {
  const isEditMode = mode === 'edit';
  const [flow, setFlow] = useState<'signup' | 'signin'>(
    initialFlow ?? (mode === 'signin' ? 'signin' : 'signup'),
  );
  const [name, setName] = useState(initialName);
  const [passcode, setPasscode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement | null>(null);
  const placeholder = useMemo(
    () => PLACEHOLDER_POOL[Math.floor(Math.random() * PLACEHOLDER_POOL.length)],
    [],
  );

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  const trimmed = name.trim();
  const tooLong = trimmed.length > 20;
  const inappropriate = trimmed.length >= 1 && containsProfanity(trimmed);
  const handleValid = trimmed.length >= 1 && !tooLong && !inappropriate;
  const passcodeValid = isValidPasscode(passcode);

  const valid = isEditMode
    ? handleValid
    : handleValid && passcodeValid && !busy;

  function switchFlow(next: 'signup' | 'signin') {
    if (busy) return;
    sfx.tap();
    setFlow(next);
    setError(null);
  }

  async function commit() {
    if (!valid) return;
    bootAudio();
    haptics.tap();
    sfx.tap();
    setError(null);

    if (isEditMode) {
      onSubmitName?.(trimmed);
      return;
    }

    setBusy(true);
    try {
      if (flow === 'signup') {
        if (!playerId) {
          setError('Internal error: missing player id.');
          return;
        }
        const result = await remoteSignUp(playerId, trimmed, passcode);
        if (result.ok) {
          onSignedUp?.(trimmed, passcode);
        } else {
          setError(result.error ? SIGNUP_ERROR_MSG[result.error] : 'Sign up failed.');
        }
      } else {
        const result = await remoteSignIn(trimmed, passcode);
        if (result.ok && result.player) {
          onSignedIn?.(result.player);
        } else {
          setError(result.error ? SIGNIN_ERROR_MSG[result.error] : 'Sign in failed.');
        }
      }
    } finally {
      setBusy(false);
    }
  }

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') void commit();
    if (e.key === 'Escape' && onCancel) onCancel();
  }

  function handlePasscodeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 4);
    setPasscode(digits);
  }

  const headline = isEditMode
    ? 'NEW NAME?'
    : flow === 'signup'
    ? 'WHO ARE YOU?'
    : 'WELCOME BACK';

  const kicker = isEditMode
    ? 'CHANGE HANDLE'
    : flow === 'signup'
    ? 'CREATE ACCOUNT'
    : 'SIGN IN';

  const ctaLabel = isEditMode
    ? 'SAVE'
    : flow === 'signup'
    ? 'BEGIN'
    : 'SIGN IN';

  const showAuthFields = !isEditMode;
  const leaderboardOnline = isLeaderboardConfigured();

  return (
    <div className="flex flex-col flex-1 w-full max-w-md mx-auto px-5 pt-7 pb-6 gap-5 justify-center">
      <div className="card-sticker px-5 py-6 -rotate-1 flex flex-col gap-4">
        <div>
          <div className="text-poster text-[10px] tracking-[0.34em] text-splat-yellow">
            {kicker}
          </div>
          <h2 className="text-poster text-2xl leading-tight mt-2 text-splat-paper text-sticker">
            {headline}
          </h2>
          <p className="text-[12px] text-splat-paper/70 mt-2 leading-snug">
            {isEditMode
              ? 'Update the name that shows up on the global leaderboard.'
              : flow === 'signup'
              ? 'Pick a unique handle and a 4-digit passcode. The passcode lets you log back in on another device.'
              : 'Enter your handle and 4-digit passcode to restore your progress.'}
          </p>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-poster text-[9px] tracking-[0.32em] text-splat-yellow">
            HANDLE
          </span>
          <input
            ref={nameRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKey}
            placeholder={placeholder}
            maxLength={28}
            spellCheck={false}
            autoComplete="off"
            autoCapitalize="words"
            disabled={busy}
            className="text-poster text-lg tracking-[0.04em] px-3 py-3 rounded-xl bg-splat-black border-2 border-splat-paper text-splat-paper placeholder:text-splat-paper/35 focus:outline-none focus:border-splat-yellow focus:ring-2 focus:ring-splat-yellow/40 disabled:opacity-60"
          />
          <div className="flex items-center justify-between text-[10px] font-poster tracking-[0.2em] text-splat-paper/55">
            <span>{trimmed.length}/20</span>
            {tooLong && <span className="text-splat-pink">TOO LONG</span>}
            {!tooLong && inappropriate && (
              <span className="text-splat-pink">KEEP IT CLEAN</span>
            )}
          </div>
        </label>

        {showAuthFields && (
          <label className="flex flex-col gap-1.5">
            <span className="text-poster text-[9px] tracking-[0.32em] text-splat-yellow">
              4-DIGIT PASSCODE
            </span>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]*"
              value={passcode}
              onChange={handlePasscodeChange}
              onKeyDown={handleKey}
              placeholder="••••"
              maxLength={4}
              disabled={busy}
              className="text-poster text-2xl tracking-[0.6em] text-center px-3 py-3 rounded-xl bg-splat-black border-2 border-splat-paper text-splat-paper placeholder:text-splat-paper/30 focus:outline-none focus:border-splat-yellow focus:ring-2 focus:ring-splat-yellow/40 disabled:opacity-60"
            />
          </label>
        )}

        {error && (
          <div className="text-poster text-[11px] tracking-[0.18em] text-splat-pink bg-splat-pink/10 border-2 border-splat-pink/50 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        {!leaderboardOnline && !isEditMode && (
          <div className="text-poster text-[11px] tracking-[0.18em] text-splat-paper/55 bg-splat-paper/5 border border-splat-paper/15 rounded-lg px-3 py-2">
            Leaderboard offline — local play only.
          </div>
        )}

        <div className="flex flex-col gap-2.5">
          <button
            onClick={() => void commit()}
            disabled={!valid}
            className={`btn-sticker py-3.5 text-poster text-base tracking-[0.2em] bg-splat-yellow text-splat-black ${
              !valid ? 'opacity-50 pointer-events-none' : ''
            }`}
          >
            {busy ? 'WORKING…' : ctaLabel}
          </button>
          {!isEditMode && (
            <button
              type="button"
              onClick={() => switchFlow(flow === 'signup' ? 'signin' : 'signup')}
              className="btn-sticker-sm py-2 text-poster text-[10px] tracking-[0.2em] bg-splat-paper text-splat-black"
            >
              {flow === 'signup' ? 'ALREADY A USER · SIGN IN' : 'NEW HERE · SIGN UP'}
            </button>
          )}
          {onCancel && (
            <button
              onClick={() => {
                haptics.micro();
                sfx.tap();
                onCancel();
              }}
              className="btn-sticker-sm py-2 text-poster text-[10px] tracking-[0.2em] bg-splat-paper text-splat-black"
            >
              CANCEL
            </button>
          )}
        </div>
      </div>

      {!isEditMode && flow === 'signup' && (
        <p className="text-center text-[11px] text-splat-paper/45">
          Forgot your passcode? You can always sign up fresh — your old leaderboard row stays put.
        </p>
      )}
    </div>
  );
}
