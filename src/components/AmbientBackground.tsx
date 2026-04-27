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
}: BoltProps) {
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
      <path d={BOLT_PATH} fill={color} stroke="#0a0708" strokeWidth="4" strokeLinejoin="round" />
    </svg>
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
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden riot-base"
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

      <div className="absolute inset-0 riot-stars opacity-90" />
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
