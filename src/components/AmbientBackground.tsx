import { useId } from 'react';

const BOLT_PATH =
  'M50 0 L20 55 L42 60 L18 120 L72 50 L50 45 L78 0 Z';

interface BoltProps {
  className: string;
  color: string;
  rotate: number;
  scale: number;
  top?: string;
  bottom?: string;
  left?: string;
  right?: string;
  opacity: number;
  faceRotate?: number;
}

function LightningBolt({
  className,
  color,
  rotate,
  scale,
  top,
  bottom,
  left,
  right,
  opacity,
  faceRotate = 0,
}: BoltProps) {
  const reactId = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const clipId = `bolt-clip-${reactId}`;
  return (
    <svg
      aria-hidden
      viewBox="0 0 100 120"
      className={className}
      style={{
        position: 'absolute',
        top,
        bottom,
        left,
        right,
        width: `${scale * 100}px`,
        height: `${scale * 120}px`,
        transform: `rotate(${rotate}deg)`,
        opacity,
        pointerEvents: 'none',
        filter: `drop-shadow(2px 4px 0 #0a0708)`,
      }}
    >
      <defs>
        {/* Clip path matching the bolt outline — guarantees the face never bleeds out */}
        <clipPath id={clipId}>
          <path d={BOLT_PATH} />
        </clipPath>
      </defs>

      <path d={BOLT_PATH} fill={color} stroke="#0a0708" strokeWidth="4" strokeLinejoin="round" />

      {/* Smiley — clipped to bolt shape, counter-rotated so face stays roughly upright */}
      <g clipPath={`url(#${clipId})`}>
        <g transform={`translate(46 26) rotate(${-rotate + faceRotate})`}>
          {/* Eyes — round black with bright white sparkle glint */}
          <ellipse cx="-5.4" cy="-1.6" rx="2.6" ry="3.1" fill="#0a0708" />
          <ellipse cx="5.4" cy="-1.6" rx="2.6" ry="3.1" fill="#0a0708" />
          <circle cx="-6.2" cy="-2.8" r="0.85" fill="#ffffff" />
          <circle cx="4.6" cy="-2.8" r="0.85" fill="#ffffff" />
          {/* Open smiling mouth — filled black D-shape with cheeky tongue */}
          <path
            d="M -5.4 4.6 Q 0 10.6 5.4 4.6 Q 3 6.6 0 6.6 Q -3 6.6 -5.4 4.6 Z"
            fill="#0a0708"
          />
          <path
            d="M -1.2 6.2 Q 0 8 1.2 6.2 Q 0.5 6.5 0 6.5 Q -0.5 6.5 -1.2 6.2 Z"
            fill="#ff7a9a"
          />
        </g>
      </g>
    </svg>
  );
}

interface BrightStarProps {
  top?: string;
  bottom?: string;
  left?: string;
  right?: string;
  size: number;
  color?: string;
  delay?: string;
}

function BrightStar({
  top,
  bottom,
  left,
  right,
  size,
  color = '#fff5e0',
  delay = '0s',
}: BrightStarProps) {
  return (
    <span
      aria-hidden
      className="absolute pointer-events-none"
      style={{
        top,
        bottom,
        left,
        right,
        width: size,
        height: size,
        animation: `brightStarPulse 3.96s ease-in-out infinite`,
        animationDelay: delay,
        transform: 'translate(-50%, -50%)',
      }}
    >
      <svg viewBox="0 0 32 32" width={size} height={size}>
        <defs>
          <radialGradient id={`bs-core-${size}-${left ?? right}-${top ?? bottom}`}>
            <stop offset="0%" stopColor={color} stopOpacity={1} />
            <stop offset="40%" stopColor={color} stopOpacity={0.7} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </radialGradient>
        </defs>
        {/* Cross glints */}
        <path
          d="M16 0 V32 M0 16 H32"
          stroke={color}
          strokeWidth="0.7"
          strokeLinecap="round"
          opacity="0.85"
        />
        <path
          d="M16 4 V28 M4 16 H28"
          stroke={color}
          strokeWidth="1.4"
          strokeLinecap="round"
          opacity="0.95"
        />
        {/* Core */}
        <circle cx="16" cy="16" r="6" fill={`url(#bs-core-${size}-${left ?? right}-${top ?? bottom})`} />
        <circle cx="16" cy="16" r="1.6" fill={color} />
      </svg>
    </span>
  );
}

interface SplatProps {
  className: string;
  size: number;
  top?: string;
  bottom?: string;
  left?: string;
  right?: string;
}

const GALAXY_PALETTE = ['#ff3da4', '#ff7a3d', '#ffe83d', '#a4ff3d', '#3df0ff', '#a44dff', '#fff5e0'];

interface SpiralGalaxyProps {
  size: number;
  top?: string;
  bottom?: string;
  left?: string;
  right?: string;
  rotate?: number;
  opacity?: number;
}

function SpiralGalaxy({
  size,
  top,
  bottom,
  left,
  right,
  rotate = 0,
  opacity = 0.85,
}: SpiralGalaxyProps) {
  const center = 100;
  const arms = 2;
  const dotsPerArm = 90;
  const dots: Array<{ x: number; y: number; r: number; color: string; delay: number }> = [];

  for (let arm = 0; arm < arms; arm++) {
    const armOffset = (arm * Math.PI * 2) / arms;
    for (let i = 0; i < dotsPerArm; i++) {
      const t = i / dotsPerArm;
      const radius = 8 + t * 88;
      const theta = armOffset + t * Math.PI * 3.6;
      const wobble = Math.sin(i * 1.7) * 4;
      const x = center + (radius + wobble) * Math.cos(theta);
      const y = center + (radius + wobble) * Math.sin(theta);
      const r = 0.9 + (Math.sin(i * 0.9) + 1) * 1.4;
      const colorIdx = (i + arm * 3) % GALAXY_PALETTE.length;
      dots.push({
        x,
        y,
        r,
        color: GALAXY_PALETTE[colorIdx],
        delay: (i * 0.07) % 4,
      });
    }
  }

  // Bright glowing core
  return (
    <svg
      aria-hidden
      viewBox="0 0 200 200"
      style={{
        position: 'absolute',
        top,
        bottom,
        left,
        right,
        width: size,
        height: size,
        transform: `rotate(${rotate}deg)`,
        opacity,
        pointerEvents: 'none',
        filter: 'drop-shadow(0 0 12px rgba(164, 77, 255, 0.55))',
      }}
    >
      <defs>
        <radialGradient id="galaxy-core">
          <stop offset="0%" stopColor="#fff5e0" stopOpacity="1" />
          <stop offset="35%" stopColor="#ffe83d" stopOpacity="0.85" />
          <stop offset="70%" stopColor="#ff3da4" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#a44dff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="galaxy-haze">
          <stop offset="0%" stopColor="#a44dff" stopOpacity="0.45" />
          <stop offset="60%" stopColor="#3df0ff" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#3df0ff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx={center} cy={center} r={94} fill="url(#galaxy-haze)" />
      <circle cx={center} cy={center} r={26} fill="url(#galaxy-core)" />
      {dots.map((d, idx) => (
        <circle
          key={idx}
          cx={d.x}
          cy={d.y}
          r={d.r}
          fill={d.color}
          style={{
            animation: `galaxyTwinkle ${2 + (idx % 6) * 0.4}s ease-in-out ${d.delay}s infinite`,
          }}
        />
      ))}
    </svg>
  );
}

function Splat({ className, size, top, bottom, left, right }: SplatProps) {
  return (
    <div
      className={`splat ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        top,
        bottom,
        left,
        right,
      }}
    />
  );
}

export default function AmbientBackground() {
  return (
    <div
      aria-hidden
      className="ambient-bg-fill pointer-events-none z-0 overflow-hidden riot-base"
    >
      <Splat className="splat-pink" size={420} top="-8%" left="-10%" />
      <Splat className="splat-cyan" size={520} bottom="-15%" right="-12%" />
      <Splat className="splat-violet" size={300} top="38%" right="-8%" />
      <Splat className="splat-yellow" size={260} top="62%" left="-6%" />
      <Splat className="splat-lime" size={200} top="20%" left="35%" />
      <Splat className="splat-orange" size={180} bottom="35%" left="55%" />

      <LightningBolt
        className=""
        color="#ffe83d"
        rotate={-22}
        scale={1.15}
        top="-3%"
        right="6%"
        opacity={0.85}
      />
      <LightningBolt
        className=""
        color="#3df0ff"
        rotate={18}
        scale={0.85}
        bottom="3%"
        left="-2%"
        opacity={0.8}
      />
      <LightningBolt
        className=""
        color="#ff3da4"
        rotate={-46}
        scale={0.7}
        top="42%"
        left="-3%"
        opacity={0.75}
      />
      <LightningBolt
        className=""
        color="#a4ff3d"
        rotate={64}
        scale={0.9}
        bottom="32%"
        right="-2%"
        opacity={0.78}
      />

      <div className="absolute inset-0 riot-stars-far opacity-85" />
      <div className="absolute inset-0 riot-stars-mid riot-stars-mid-twinkle opacity-90" />
      <div className="absolute inset-0 riot-stars riot-stars-twinkle opacity-95" />

      {/* Slow-rotating spiral galaxy — upper-left of screen, distant feature */}
      <div className="galaxy-spin" style={{ position: 'absolute', top: '6%', left: '-6%', width: 320, height: 320 }}>
        <SpiralGalaxy size={320} top="0" left="0" rotate={0} opacity={0.85} />
      </div>

      {/* Smaller companion galaxy — lower-right, balances composition */}
      <div className="galaxy-spin-rev" style={{ position: 'absolute', bottom: '12%', right: '-4%', width: 200, height: 200 }}>
        <SpiralGalaxy size={200} top="0" left="0" rotate={140} opacity={0.65} />
      </div>

      <BrightStar top="6%" left="34%" size={22} color="#cfe0ff" delay="2.8s" />
      <BrightStar top="11%" left="18%" size={30} color="#fff5e0" delay="0s" />
      <BrightStar top="18%" left="64%" size={16} color="#fff5e0" delay="3.4s" />
      <BrightStar top="26%" left="82%" size={24} color="#cfe0ff" delay="1.4s" />
      <BrightStar top="34%" left="14%" size={14} color="#cfe0ff" delay="2s" />
      <BrightStar top="40%" left="48%" size={16} color="#cfe0ff" delay="3.2s" />
      <BrightStar top="46%" left="88%" size={22} color="#fff5e0" delay="0.4s" />
      <BrightStar top="58%" left="9%" size={20} color="#fff5e0" delay="2.6s" />
      <BrightStar top="64%" left="56%" size={14} color="#fff5e0" delay="1.2s" />
      <BrightStar top="72%" left="72%" size={28} color="#fff5e0" delay="0.8s" />
      <BrightStar top="80%" left="22%" size={16} color="#cfe0ff" delay="2.4s" />
      <BrightStar top="88%" left="32%" size={22} color="#fff5e0" delay="2s" />
      <BrightStar top="94%" left="62%" size={18} color="#cfe0ff" delay="0.6s" />
      <BrightStar top="50%" left="32%" size={12} color="#fff5e0" delay="3.6s" />

      <div className="absolute inset-0 riot-grain opacity-[0.08]" />
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 35%, rgba(0, 0, 0, 0.65) 100%)',
        }}
      />
    </div>
  );
}
