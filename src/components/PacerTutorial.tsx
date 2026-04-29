import { useEffect, useState } from 'react';
import { haptics } from '../game/haptics';
import { bootAudio, sfx } from '../game/audio';

const PREF_KEY = 'timetrace-pacer-tutorial-v1';

export function getPacerTutorialSeen(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return window.localStorage.getItem(PREF_KEY) === '1';
  } catch {
    return true;
  }
}

export function setPacerTutorialSeen() {
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

export default function PacerTutorial({ show, onDismiss }: Props) {
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
        setPacerTutorialSeen();
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
          <div className="text-poster text-[10px] tracking-[0.4em] text-splat-cyan">
            CHAPTER 5 · NEW MECHANIC
          </div>
          <h2 className="text-poster text-2xl leading-tight mt-2 text-splat-paper text-sticker">
            PULSE
          </h2>
          <p className="text-[12px] text-splat-paper/75 mt-2 leading-snug">
            A glowing <span className="text-splat-cyan">comet</span> surfs along the path at a
            fixed pace. Stay <span className="text-splat-paper">on it</span> the whole way. Score
            is your <span className="text-splat-yellow">SYNC %</span> — how long you kept up.
            Don't rush ahead.
          </p>
        </div>

        {/* Mini diagram — path with a comet midway, halo around it, finger trailing */}
        <div className="card-sticker px-3 py-3 -rotate-[0.6deg]" style={{ background: 'rgba(8,6,20,0.85)' }}>
          <svg viewBox="0 0 220 90" width="100%" height="90">
            {/* Faint path */}
            <path
              d="M 14 60 Q 60 18 110 50 T 206 38"
              stroke="rgba(180,220,255,0.45)"
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
            />
            {/* Player paint trail behind comet */}
            <path
              d="M 14 60 Q 50 26 95 50"
              stroke="#a4ff3d"
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
            />
            {/* Halo around comet */}
            <circle cx="110" cy="50" r="22" fill="rgba(61, 240, 255, 0.14)" />
            <circle
              cx="110"
              cy="50"
              r="22"
              fill="none"
              stroke="rgba(61, 240, 255, 0.55)"
              strokeWidth="1.4"
            />
            {/* Comet trail */}
            <circle cx="100" cy="50" r="2" fill="rgba(61, 240, 255, 0.5)" />
            <circle cx="93" cy="51" r="1.6" fill="rgba(61, 240, 255, 0.32)" />
            <circle cx="86" cy="52" r="1.2" fill="rgba(61, 240, 255, 0.18)" />
            {/* Comet head */}
            <circle cx="110" cy="50" r="6.5" fill="#3df0ff" />
            <circle cx="110" cy="50" r="2.8" fill="#fff5e0" />
            {/* Finger dot inside halo (in-sync) */}
            <circle cx="103" cy="55" r="3.5" fill="#a4ff3d" stroke="#0a0708" strokeWidth="1" />
            <text x="110" y="32" textAnchor="middle" fontSize="9" fill="#3df0ff" fontWeight="700">
              COMET
            </text>
            <text x="103" y="76" textAnchor="middle" fontSize="8" fill="#a4ff3d" fontWeight="700">
              YOU
            </text>
            {/* Sync meter at bottom */}
            <rect x="14" y="82" width="192" height="4" fill="rgba(255,245,224,0.1)" rx="2" />
            <rect x="14" y="82" width="160" height="4" fill="#a4ff3d" rx="2" />
          </svg>
        </div>

        <ul className="text-[11px] text-splat-paper/70 leading-snug space-y-1">
          <li>· Comet starts moving the moment you touch the canvas</li>
          <li>· Stay inside its halo to rack up sync</li>
          <li>· Score = sync % × shape accuracy</li>
          <li>· Some levels speed up, slow down, or pulse</li>
        </ul>

        <button
          onClick={() => {
            bootAudio();
            setPacerTutorialSeen();
            haptics.tap();
            sfx.tap();
            setVisible(false);
            onDismiss();
          }}
          className="btn-sticker py-3 text-poster text-sm tracking-[0.18em] bg-splat-cyan text-splat-black"
        >
          LOCK IN
        </button>
      </div>
    </div>
  );
}
