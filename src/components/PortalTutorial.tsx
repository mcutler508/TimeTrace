import { useEffect, useState } from 'react';
import { haptics } from '../game/haptics';
import { bootAudio, sfx } from '../game/audio';

const PREF_KEY = 'timetrace-portal-tutorial-v1';

export function getPortalTutorialSeen(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return window.localStorage.getItem(PREF_KEY) === '1';
  } catch {
    return true;
  }
}

export function setPortalTutorialSeen() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(PREF_KEY, '1');
  } catch {
    /* noop */
  }
}

interface Props {
  show: boolean;
  onDismiss: () => void;
}

export default function PortalTutorial({ show, onDismiss }: Props) {
  const [visible, setVisible] = useState(show);

  useEffect(() => {
    setVisible(show);
  }, [show]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-5 animate-fadeIn"
      onClick={() => {
        bootAudio();
        setPortalTutorialSeen();
        haptics.tap();
        sfx.tap();
        setVisible(false);
        onDismiss();
      }}
    >
      <div className="absolute inset-0 bg-bg-deep/90 backdrop-blur-sm" />
      <div
        className="relative card-sticker px-5 py-5 max-w-[20rem] flex flex-col gap-4 -rotate-1"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <div className="text-poster text-[10px] tracking-[0.4em] text-splat-pink">
            CHAPTER 2 · NEW MECHANIC
          </div>
          <h2 className="text-poster text-2xl leading-tight mt-2 text-splat-paper text-sticker">
            PORTALS
          </h2>
          <p className="text-[12px] text-splat-paper/75 mt-2 leading-snug">
            When your stroke crosses a <span className="text-splat-cyan">cyan ring</span>, your
            line teleports out of the matching{' '}
            <span className="text-splat-pink">magenta ring</span>. Keep dragging your finger and
            the line continues from the exit.
          </p>
        </div>

        {/* Mini diagram */}
        <div className="card-sticker px-3 py-3 -rotate-[0.6deg]" style={{ background: 'rgba(8,6,20,0.85)' }}>
          <svg viewBox="0 0 220 70" width="100%" height="70">
            {/* Entry portal */}
            <circle cx="55" cy="35" r="14" fill="none" stroke="#3df0ff" strokeWidth="3" />
            <circle cx="55" cy="35" r="2.5" fill="#3df0ff" />
            {/* Exit portal */}
            <circle cx="165" cy="35" r="14" fill="none" stroke="#ff3da4" strokeWidth="3" />
            <circle cx="165" cy="35" r="2.5" fill="#ff3da4" />
            {/* Approach line */}
            <path
              d="M 10 35 Q 30 45 45 38"
              stroke="#a4ff3d"
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
            />
            {/* Continue line on the other side */}
            <path
              d="M 175 33 Q 195 28 210 35"
              stroke="#a4ff3d"
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
            />
            {/* Dashed connection */}
            <path
              d="M 55 35 L 165 35"
              stroke="rgba(255,245,224,0.3)"
              strokeWidth="1.5"
              strokeDasharray="4 6"
              fill="none"
            />
          </svg>
        </div>

        <ul className="text-[11px] text-splat-paper/70 leading-snug space-y-1">
          <li>· One stroke, no lift mid-trace</li>
          <li>· Portals only fire on first crossing</li>
          <li>· Lift to stop and submit your time</li>
        </ul>

        <button
          onClick={() => {
            bootAudio();
            setPortalTutorialSeen();
            haptics.tap();
            sfx.tap();
            setVisible(false);
            onDismiss();
          }}
          className="btn-sticker py-3 text-poster text-sm tracking-[0.18em] bg-splat-pink text-splat-paper"
        >
          GOT IT
        </button>
      </div>
    </div>
  );
}
