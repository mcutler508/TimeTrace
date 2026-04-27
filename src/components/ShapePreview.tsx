import { useMemo } from 'react';
import { generateShapePath } from '../game/shapes';
import type { ShapeType } from '../game/types';

interface Props {
  shape: ShapeType;
  size?: number;
  className?: string;
  stroke?: string;
  glow?: boolean;
  opacity?: number;
}

export default function ShapePreview({
  shape,
  size = 64,
  className = '',
  stroke = '#00f0ff',
  glow = true,
  opacity = 1,
}: Props) {
  const d = useMemo(() => {
    const pts = generateShapePath(shape);
    if (pts.length === 0) return '';
    let path = `M ${(pts[0].x * size).toFixed(2)} ${(pts[0].y * size).toFixed(2)}`;
    for (let i = 1; i < pts.length; i++) {
      path += ` L ${(pts[i].x * size).toFixed(2)} ${(pts[i].y * size).toFixed(2)}`;
    }
    return path;
  }, [shape, size]);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={className}
      style={{ opacity }}
      aria-hidden
    >
      {glow && (
        <defs>
          <filter id={`glow-${shape}-${size}`} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="1.6" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      )}
      <path
        d={d}
        fill="none"
        stroke={stroke}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        filter={glow ? `url(#glow-${shape}-${size})` : undefined}
      />
    </svg>
  );
}
