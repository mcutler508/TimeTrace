import { useEffect, useState } from 'react';
import introCardUrl from '../../assets/IntroCard.png';
import { haptics } from '../game/haptics';
import { sfx } from '../game/audio';

const SESSION_KEY = 'timetrace-intro-card-shown';

function hasBeenShownThisSession(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return window.sessionStorage.getItem(SESSION_KEY) === '1';
  } catch {
    return true;
  }
}

function markShown() {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(SESSION_KEY, '1');
  } catch {
    /* noop */
  }
}

/**
 * One-shot share-the-game card. Auto-shows once per browser session on app
 * boot, dismissed by clicking outside the card or the X button.
 */
export default function IntroCard() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!hasBeenShownThisSession()) {
      const id = window.setTimeout(() => setVisible(true), 320);
      return () => window.clearTimeout(id);
    }
  }, []);

  function dismiss() {
    haptics.tap();
    sfx.tap();
    markShown();
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-5 animate-fadeIn"
      onClick={dismiss}
      role="dialog"
      aria-modal="true"
      aria-label="Share TimeTrace with friends"
    >
      <div className="absolute inset-0 bg-bg-deep/85 backdrop-blur-sm" />
      <div
        className="relative -rotate-1"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={introCardUrl}
          alt="If you are enjoying this game, please share the link with your friends!"
          className="block max-w-[80vw] max-h-[80vh] w-auto h-auto rounded-2xl"
          style={{
            boxShadow:
              '8px 8px 0 0 #0a0708, 0 0 48px rgba(164, 77, 255, 0.55), 0 0 24px rgba(255, 61, 164, 0.45)',
            border: '3px solid #0a0708',
          }}
          draggable={false}
        />
        <button
          type="button"
          onClick={dismiss}
          aria-label="Close"
          className="absolute -top-3 -right-3 w-9 h-9 rounded-full border-[3px] border-black bg-splat-yellow flex items-center justify-center text-splat-black active:translate-x-[2px] active:translate-y-[2px]"
          style={{ boxShadow: '3px 3px 0 0 #0a0708' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden>
            <path
              d="M5 5 L19 19 M19 5 L5 19"
              stroke="#0a0708"
              strokeWidth="3.2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
