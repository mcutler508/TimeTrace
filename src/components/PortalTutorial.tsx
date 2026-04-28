import { useEffect, useState } from 'react';
import { haptics } from '../game/haptics';
import { bootAudio, sfx } from '../game/audio';

const PREF_KEY = 'timetrace-portal-tutorial-v3';

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
            CHAPTER 3 · NEW MECHANIC
          </div>
          <h2 className="text-poster text-2xl leading-tight mt-2 text-splat-paper text-sticker">
            CONSTELLATIONS
          </h2>
          <p className="text-[12px] text-splat-paper/75 mt-2 leading-snug">
            One stroke. Many shapes. Trace the first shape until you reach the{' '}
            <span className="text-splat-cyan">cyan slash (IN)</span> — the line warps and the
            clock pauses. <span className="text-splat-paper">Lift your finger</span>, then place
            it inside the <span className="text-splat-pink">magenta ring (OUT)</span> at the next
            shape to keep drawing.
          </p>
        </div>

        {/* Mini diagram — line ends at IN, OUT becomes a glowing landing ring */}
        <div className="card-sticker px-3 py-3 -rotate-[0.6deg]" style={{ background: 'rgba(8,6,20,0.85)' }}>
          <svg viewBox="0 0 220 90" width="100%" height="90">
            {/* Target shape line under everything */}
            <path
              d="M 10 45 Q 70 65 110 45 T 210 45"
              stroke="rgba(180,220,255,0.55)"
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
            />
            {/* Dashed link from IN to OUT */}
            <path
              d="M 70 54 Q 110 24 150 54"
              stroke="rgba(255, 61, 164, 0.55)"
              strokeWidth="1.4"
              strokeDasharray="3 6"
              fill="none"
            />
            {/* Captured IN slash — collapsed, faint */}
            <g transform="translate(70 54) rotate(28)">
              <line x1="-7" y1="0" x2="7" y2="0" stroke="#3df0ff" strokeWidth="4" strokeLinecap="round" opacity="0.6" />
              <circle cx="0" cy="0" r="5" fill="none" stroke="#3df0ff" strokeWidth="1" opacity="0.6" />
              <text x="0" y="-18" textAnchor="middle" fontSize="9" fill="#3df0ff" fontWeight="700">
                IN
              </text>
            </g>
            {/* Armed OUT — landing ring + slash */}
            <g transform="translate(150 54)">
              <circle cx="0" cy="0" r="22" fill="rgba(255, 61, 164, 0.10)" stroke="rgba(255, 61, 164, 0.55)" strokeWidth="1.4" />
              <circle cx="0" cy="0" r="16" fill="none" stroke="rgba(255, 61, 164, 0.7)" strokeWidth="1.2" />
              <g transform="rotate(-28)">
                <line x1="-15" y1="0" x2="15" y2="0" stroke="#ff3da4" strokeWidth="6" strokeLinecap="round" />
                <line x1="-15" y1="0" x2="15" y2="0" stroke="rgba(255,255,255,0.95)" strokeWidth="1.2" />
              </g>
              {/* Fingerprint dot indicating "place here" */}
              <circle cx="0" cy="0" r="3" fill="#fff5e0" />
              <text x="0" y="-30" textAnchor="middle" fontSize="9" fill="#ff3da4" fontWeight="700">
                PLACE
              </text>
            </g>
            {/* Player stroke ending at IN */}
            <path
              d="M 10 45 Q 40 55 65 53"
              stroke="#a4ff3d"
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
            />
            {/* Player stroke continuing from OUT */}
            <path
              d="M 155 53 Q 180 36 210 45"
              stroke="#a4ff3d"
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
              opacity="0.7"
              strokeDasharray="2 3"
            />
          </svg>
        </div>

        <ul className="text-[11px] text-splat-paper/70 leading-snug space-y-1">
          <li>· One continuous stroke across every shape</li>
          <li>· Lift at IN, place inside the OUT ring at the next shape</li>
          <li>· Timer pauses during the warp — only your active drawing counts</li>
          <li>· Each shape is scored individually, then averaged</li>
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
