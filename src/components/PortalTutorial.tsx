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
            When your stroke crosses the <span className="text-splat-cyan">cyan slash (IN)</span>{' '}
            on the path, the line warps and resumes from the matching{' '}
            <span className="text-splat-pink">magenta slash (OUT)</span> further along. Keep your
            finger moving — the line continues automatically.
          </p>
        </div>

        {/* Mini diagram */}
        <div className="card-sticker px-3 py-3 -rotate-[0.6deg]" style={{ background: 'rgba(8,6,20,0.85)' }}>
          <svg viewBox="0 0 220 80" width="100%" height="80">
            {/* Target shape line — a curve under the slashes */}
            <path
              d="M 10 40 Q 70 60 110 40 T 210 40"
              stroke="rgba(180,220,255,0.55)"
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
            />
            {/* Entry slash (cyan) on the path, perpendicular */}
            <g transform="translate(70 49) rotate(28)">
              <line x1="-15" y1="0" x2="15" y2="0" stroke="#3df0ff" strokeWidth="6" strokeLinecap="round" />
              <line x1="-15" y1="-3" x2="15" y2="-3" stroke="#0a0708" strokeWidth="2" strokeLinecap="round" />
              <line x1="-15" y1="3" x2="15" y2="3" stroke="#0a0708" strokeWidth="2" strokeLinecap="round" />
              <line x1="-15" y1="0" x2="15" y2="0" stroke="rgba(255,255,255,0.95)" strokeWidth="1.2" />
              <text x="0" y="-22" textAnchor="middle" fontSize="9" fill="#3df0ff" fontWeight="700">
                IN
              </text>
            </g>
            {/* Exit slash (pink) further along */}
            <g transform="translate(150 49) rotate(-28)">
              <line x1="-15" y1="0" x2="15" y2="0" stroke="#ff3da4" strokeWidth="6" strokeLinecap="round" />
              <line x1="-15" y1="-3" x2="15" y2="-3" stroke="#0a0708" strokeWidth="2" strokeLinecap="round" />
              <line x1="-15" y1="3" x2="15" y2="3" stroke="#0a0708" strokeWidth="2" strokeLinecap="round" />
              <line x1="-15" y1="0" x2="15" y2="0" stroke="rgba(255,255,255,0.95)" strokeWidth="1.2" />
              <text x="0" y="-22" textAnchor="middle" fontSize="9" fill="#ff3da4" fontWeight="700">
                OUT
              </text>
            </g>
            {/* Player stroke approaching IN */}
            <path
              d="M 10 40 Q 40 50 65 50"
              stroke="#a4ff3d"
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
            />
            {/* Player stroke continuing from OUT */}
            <path
              d="M 158 38 Q 180 32 210 40"
              stroke="#a4ff3d"
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
            />
            {/* Dashed link */}
            <path
              d="M 70 49 Q 110 32 150 49"
              stroke="rgba(255,245,224,0.25)"
              strokeWidth="1.2"
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
