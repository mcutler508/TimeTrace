import { useMemo } from 'react';
import {
  CHALLENGES,
  SHAPE_ACCENT,
  challengesByChapter,
  chapterUnlocked,
  isChallengeUnlocked,
  type ChallengeMeta,
  type ChapterMeta,
} from '../game/challenges';
import type { AttemptResult } from '../game/types';
import ShapePreview from './ShapePreview';
import { haptics } from '../game/haptics';
import { sfx } from '../game/audio';

interface Props {
  chapter: ChapterMeta;
  totalPoints: number;
  bestScores: Record<string, AttemptResult>;
  onPickChallenge: (challengeId: string) => void;
}

const ROW_PX = 150;
const TOP_PAD_PX = 90;
const SNAKE_AMPLITUDE = 24;

const RAINBOW_STOPS = [
  { offset: '0%', color: '#ff3da4' },
  { offset: '16.7%', color: '#ff7a3d' },
  { offset: '33.3%', color: '#ffe83d' },
  { offset: '50%', color: '#a4ff3d' },
  { offset: '66.7%', color: '#3df0ff' },
  { offset: '83.3%', color: '#a44dff' },
  { offset: '100%', color: '#ff3da4' },
];
const RAINBOW_PALETTE = ['#ff3da4', '#ff7a3d', '#ffe83d', '#a4ff3d', '#3df0ff', '#a44dff'];
const PARTICLES_PER_SEGMENT = 8;
const SPARKS_PER_SEGMENT = 22;
const GRADIENT_CYCLE_PX = 540;
const RAINBOW_FLOW_DURATION = '6.3s';

function starsForScore(score: number): number {
  if (score >= 90) return 3;
  if (score >= 75) return 2;
  if (score >= 50) return 1;
  return 0;
}

function nodeXPercent(i: number): number {
  return 50 + SNAKE_AMPLITUDE * Math.sin((i * Math.PI) / 2);
}

function nodeY(i: number): number {
  return TOP_PAD_PX + i * ROW_PX;
}

export default function LevelMap({
  chapter,
  totalPoints,
  bestScores,
  onPickChallenge,
}: Props) {
  const open = chapterUnlocked(chapter, totalPoints);
  const levels = challengesByChapter(chapter.id);
  const startGlobalIdx = CHALLENGES.findIndex((c) => c.chapter === chapter.id);
  const accent = chapter.id === 1 ? '#3df0ff' : '#ff3da4';
  const accentSoft =
    chapter.id === 1 ? 'rgba(61,240,255,0.55)' : 'rgba(255,61,164,0.55)';

  const totalHeight = TOP_PAD_PX * 2 + Math.max(0, levels.length - 1) * ROW_PX;

  const currentIdx = useMemo(() => {
    let lastUnlocked = -1;
    for (let i = 0; i < levels.length; i++) {
      const c = levels[i];
      if (!isChallengeUnlocked(c, totalPoints)) continue;
      lastUnlocked = i;
      const score = bestScores[c.id]?.finalScore ?? 0;
      if (starsForScore(score) < 3) return i;
    }
    return lastUnlocked;
  }, [levels, totalPoints, bestScores]);

  const trailD = useMemo(() => {
    if (levels.length === 0) return '';
    let d = '';
    for (let i = 0; i < levels.length; i++) {
      const x = nodeXPercent(i);
      const y = nodeY(i);
      if (i === 0) {
        d += `M ${x} ${y}`;
      } else {
        const prevX = nodeXPercent(i - 1);
        const prevY = nodeY(i - 1);
        const cy1 = prevY + ROW_PX * 0.55;
        const cy2 = y - ROW_PX * 0.55;
        d += ` C ${prevX} ${cy1}, ${x} ${cy2}, ${x} ${y}`;
      }
    }
    return d;
  }, [levels.length]);

  const { particles, sparks } = useMemo(() => {
    type Dot = {
      x: number;
      y: number;
      size: number;
      color: string;
      delay: number;
      duration: number;
    };
    const particles: Dot[] = [];
    const sparks: Dot[] = [];
    if (levels.length < 2) return { particles, sparks };

    let pCounter = 0;
    let sCounter = 0;
    for (let i = 0; i < levels.length - 1; i++) {
      const p0x = nodeXPercent(i);
      const p0y = nodeY(i);
      const p3x = nodeXPercent(i + 1);
      const p3y = nodeY(i + 1);
      const p1x = p0x;
      const p1y = p0y + ROW_PX * 0.55;
      const p2x = p3x;
      const p2y = p3y - ROW_PX * 0.55;

      const samplePoint = (t: number) => {
        const u = 1 - t;
        return {
          x:
            u * u * u * p0x +
            3 * u * u * t * p1x +
            3 * u * t * t * p2x +
            t * t * t * p3x,
          y:
            u * u * u * p0y +
            3 * u * u * t * p1y +
            3 * u * t * t * p2y +
            t * t * t * p3y,
        };
      };

      // Chunky stardust — bigger, slower, sit close to the tube
      for (let k = 0; k < PARTICLES_PER_SEGMENT; k++) {
        const t = (k + 0.5) / PARTICLES_PER_SEGMENT;
        const { x, y } = samplePoint(t);
        const seed = i * 13 + k * 7;
        const jx = Math.sin(seed * 1.7) * 2.4;
        const jy = Math.cos(seed * 2.3) * 9;
        const sizeBase = 2.4 + (Math.sin(seed * 0.9) + 1) * 1.7;
        const colorIndex =
          (pCounter + Math.floor(t * RAINBOW_PALETTE.length)) % RAINBOW_PALETTE.length;
        particles.push({
          x: x + jx,
          y: y + jy,
          size: sizeBase,
          color: RAINBOW_PALETTE[colorIndex],
          delay: (pCounter * 0.17) % 2.6,
          duration: 2.2 + ((seed % 7) * 0.13),
        });
        pCounter += 1;
      }

      // Fine glitter — lots of tiny sub-pixel sparks around and along the tube
      for (let k = 0; k < SPARKS_PER_SEGMENT; k++) {
        const t = (k + 0.5) / SPARKS_PER_SEGMENT;
        const { x, y } = samplePoint(t);
        const seed = i * 41 + k * 5;
        // Wider scatter than chunky particles — true glitter cloud
        const jx = Math.sin(seed * 2.1) * 4.5 + Math.cos(seed * 0.7) * 1.6;
        const jy = Math.cos(seed * 1.3) * 16 + Math.sin(seed * 0.5) * 4;
        const tiny = 0.7 + (Math.sin(seed * 1.1) + 1) * 0.55; // 0.7 .. 1.8
        const colorIndex =
          (sCounter * 3 + Math.floor(t * RAINBOW_PALETTE.length)) %
          RAINBOW_PALETTE.length;
        sparks.push({
          x: x + jx,
          y: y + jy,
          size: tiny,
          color: RAINBOW_PALETTE[colorIndex],
          delay: (sCounter * 0.071) % 1.8,
          duration: 0.9 + ((seed % 11) * 0.07),
        });
        sCounter += 1;
      }
    }
    return { particles, sparks };
  }, [levels.length]);

  const gateBanner = (
    <div
      className="relative px-5 py-4 mb-4 overflow-hidden"
      style={{
        background:
          chapter.id === 1
            ? 'linear-gradient(180deg, rgba(20,18,38,0.96) 0%, rgba(10,8,22,0.96) 100%)'
            : 'linear-gradient(180deg, rgba(28,12,32,0.96) 0%, rgba(16,6,20,0.96) 100%)',
        border: `2.5px solid ${accent}`,
        borderRadius: 22,
        boxShadow: `0 0 0 3px #0a0708, 6px 6px 0 0 #0a0708, inset 0 0 32px ${accentSoft}`,
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <div
            className="text-poster text-[10px] tracking-[0.34em]"
            style={{ color: accent, textShadow: `0 0 12px ${accentSoft}` }}
          >
            {chapter.title}
          </div>
          <div className="text-poster text-xl text-splat-paper text-sticker leading-tight mt-1">
            {chapter.subtitle}
          </div>
          <div className="text-[11px] text-splat-paper/55 mt-1">{chapter.blurb}</div>
        </div>
        {!open && (
          <div
            className="px-2.5 py-1 rounded-full text-[10px] font-poster tracking-[0.18em] border-2 border-black"
            style={{ background: '#ffe83d', color: '#0a0708' }}
          >
            {chapter.unlockGate} PTS
          </div>
        )}
      </div>
    </div>
  );

  if (!open) {
    return (
      <div className="mb-7">
        {gateBanner}
        <div
          className="card-sticker px-4 py-5 text-center"
          style={{ background: 'rgba(20,18,38,0.85)' }}
        >
          <div className="text-poster text-sm text-splat-yellow tracking-[0.22em]">
            CHAPTER LOCKED
          </div>
          <p className="text-[12px] text-splat-paper/70 mt-2 leading-snug">
            Earn {chapter.unlockGate - totalPoints} more pts in earlier chapters to access {chapter.subtitle}.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-7">
      {gateBanner}

      <div className="relative w-full" style={{ height: totalHeight }}>
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox={`0 0 100 ${totalHeight}`}
          preserveAspectRatio="none"
          aria-hidden
        >
          <defs>
            <linearGradient
              id={`rainbow-trail-${chapter.id}`}
              gradientUnits="userSpaceOnUse"
              x1={50}
              y1={0}
              x2={50}
              y2={GRADIENT_CYCLE_PX}
              spreadMethod="repeat"
            >
              {RAINBOW_STOPS.map((s) => (
                <stop key={s.offset} offset={s.offset} stopColor={s.color} />
              ))}
              <animateTransform
                attributeName="gradientTransform"
                type="translate"
                from={`0 0`}
                to={`0 -${GRADIENT_CYCLE_PX}`}
                dur={RAINBOW_FLOW_DURATION}
                repeatCount="indefinite"
              />
            </linearGradient>

            <filter
              id={`trail-bloom-${chapter.id}`}
              x="-20%"
              y="-10%"
              width="140%"
              height="120%"
            >
              <feGaussianBlur stdDeviation="2.4" />
            </filter>
          </defs>

          {/* 1. Outermost atmospheric halo — broad blurred wash */}
          <path
            d={trailD}
            fill="none"
            stroke="#e8f4ff"
            strokeWidth={22}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.16}
            vectorEffect="non-scaling-stroke"
            filter={`url(#trail-bloom-${chapter.id})`}
          />

          {/* 2. Rainbow halo — wide blurred rainbow color cast */}
          <path
            d={trailD}
            fill="none"
            stroke={`url(#rainbow-trail-${chapter.id})`}
            strokeWidth={16}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.55}
            vectorEffect="non-scaling-stroke"
            filter={`url(#trail-bloom-${chapter.id})`}
          />

          {/* 3. Rainbow body — saturated tube body */}
          <path
            d={trailD}
            fill="none"
            stroke={`url(#rainbow-trail-${chapter.id})`}
            strokeWidth={9}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.95}
            vectorEffect="non-scaling-stroke"
          />

          {/* 4. Dark wireframe ribs — wide dashed near-black segmenting the tube */}
          <path
            d={trailD}
            fill="none"
            stroke="#0a0708"
            strokeWidth={11}
            strokeDasharray="0.5 7"
            strokeLinecap="butt"
            opacity={0.45}
            vectorEffect="non-scaling-stroke"
          />

          {/* 5. Bright wireframe ribs — slim white edges next to the dark ribs */}
          <path
            className="trail-rib-flow"
            d={trailD}
            fill="none"
            stroke="#fff5e0"
            strokeWidth={11.5}
            strokeDasharray="0.35 7.15"
            strokeDashoffset="0.7"
            strokeLinecap="butt"
            opacity={0.5}
            vectorEffect="non-scaling-stroke"
          />

          {/* 6. Grit speckle — fine dark micro-dashes along the tube core */}
          <path
            d={trailD}
            fill="none"
            stroke="#0a0708"
            strokeWidth={2.6}
            strokeDasharray="0.3 1.6"
            strokeLinecap="round"
            opacity={0.5}
            vectorEffect="non-scaling-stroke"
          />

          {/* 7. White inner core — the 3D-tube highlight ridge */}
          <path
            d={trailD}
            fill="none"
            stroke="#fff5e0"
            strokeWidth={2.4}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.85}
            vectorEffect="non-scaling-stroke"
          />

          {/* 8. Centerline highlight — pinpoint white spine */}
          <path
            d={trailD}
            fill="none"
            stroke="#ffffff"
            strokeWidth={1}
            strokeLinecap="round"
            opacity={0.95}
            vectorEffect="non-scaling-stroke"
          />

          {/* 9. Stitched centerline — dotted micro-pattern, slow drift backward */}
          <path
            className="trail-stitch"
            d={trailD}
            fill="none"
            stroke="#0a0708"
            strokeWidth={1}
            strokeDasharray="0.35 1.05"
            strokeLinecap="round"
            opacity={0.7}
            vectorEffect="non-scaling-stroke"
          />

          {/* 10. Animated shimmer overlay — flowing dashes for motion */}
          <path
            className="trail-shimmer"
            d={trailD}
            fill="none"
            stroke="#ffffff"
            strokeWidth={2}
            strokeLinecap="round"
            strokeDasharray="1.5 16"
            opacity={0.95}
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        {/* Stardust — chunky rainbow particles flanking the tube */}
        {particles.map((p, idx) => (
          <span
            key={`p${idx}`}
            aria-hidden
            className="trail-particle absolute rounded-full pointer-events-none"
            style={{
              left: `${p.x}%`,
              top: `${(p.y / totalHeight) * 100}%`,
              width: `${p.size}px`,
              height: `${p.size}px`,
              background: p.color,
              boxShadow: `0 0 ${p.size * 3}px ${p.color}, 0 0 ${p.size * 1.4}px ${p.color}`,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
            }}
          />
        ))}

        {/* Glitter — fine, fast-twinkling sub-pixel sparks */}
        {sparks.map((p, idx) => (
          <span
            key={`s${idx}`}
            aria-hidden
            className="trail-spark absolute rounded-full pointer-events-none"
            style={{
              left: `${p.x}%`,
              top: `${(p.y / totalHeight) * 100}%`,
              width: `${p.size}px`,
              height: `${p.size}px`,
              background: p.color,
              boxShadow: `0 0 ${p.size * 4}px ${p.color}`,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
            }}
          />
        ))}

        {levels.map((c, i) => {
          const globalIdx = startGlobalIdx + i;
          const unlocked = isChallengeUnlocked(c, totalPoints);
          const attempt = bestScores[c.id];
          const score = attempt?.finalScore ?? 0;
          const stars = starsForScore(score);
          const isCurrent = i === currentIdx;
          const shapeAccent = SHAPE_ACCENT[c.shape];
          const xPct = nodeXPercent(i);
          const yPct = (nodeY(i) / totalHeight) * 100;
          const hasPortals = !!c.portals?.length;

          const handleTap = () => {
            if (!unlocked) return;
            haptics.tap();
            sfx.tap();
            onPickChallenge(c.id);
          };

          return (
            <div
              key={c.id}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${xPct}%`, top: `${yPct}%` }}
            >
              <NodeStars count={stars} />
              {isCurrent && unlocked ? (
                <FeatureCard
                  challenge={c}
                  globalIdx={globalIdx}
                  bestScore={attempt ? score : null}
                  shapeAccent={shapeAccent}
                  hasPortals={hasPortals}
                  onTap={handleTap}
                />
              ) : (
                <SmallNode
                  challenge={c}
                  globalIdx={globalIdx}
                  unlocked={unlocked}
                  shapeAccent={shapeAccent}
                  hasPortals={hasPortals}
                  onTap={handleTap}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function NodeStars({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <div
      className="flex justify-center gap-0.5 mb-1.5"
      aria-label={`${count} of 3 stars`}
    >
      {[0, 1, 2].map((i) => (
        <svg
          key={i}
          width="13"
          height="13"
          viewBox="0 0 24 24"
          aria-hidden
          style={{
            filter:
              i < count
                ? 'drop-shadow(0 0 5px rgba(255, 232, 61, 0.95))'
                : undefined,
          }}
        >
          <path
            d="M12 2 L14.59 8.36 L21.5 9.16 L16.18 13.79 L18.07 21 L12 17.27 L5.93 21 L7.82 13.79 L2.5 9.16 L9.41 8.36 Z"
            fill={i < count ? '#ffe83d' : 'rgba(255,245,224,0.18)'}
            stroke="#0a0708"
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
        </svg>
      ))}
    </div>
  );
}

interface SmallNodeProps {
  challenge: ChallengeMeta;
  globalIdx: number;
  unlocked: boolean;
  shapeAccent: { stroke: string; soft: string };
  hasPortals: boolean;
  onTap: () => void;
}

function SmallNode({
  challenge,
  globalIdx,
  unlocked,
  shapeAccent,
  hasPortals,
  onTap,
}: SmallNodeProps) {
  const ringColor = unlocked ? shapeAccent.stroke : '#3a2a55';
  return (
    <button
      type="button"
      disabled={!unlocked}
      onClick={onTap}
      className="relative flex items-center justify-center w-[68px] h-[68px] rounded-full transition-transform active:translate-x-[1.5px] active:translate-y-[1.5px]"
      style={{
        background: 'rgba(10, 8, 22, 0.96)',
        border: `2.5px solid ${ringColor}`,
        boxShadow: unlocked
          ? `0 0 14px ${shapeAccent.soft}, 3px 3px 0 0 #0a0708`
          : '3px 3px 0 0 #0a0708',
        opacity: unlocked ? 1 : 0.62,
      }}
      aria-label={`Level ${globalIdx + 1}: ${challenge.title}${
        unlocked ? '' : ' — locked'
      }`}
    >
      <ShapePreview
        shape={challenge.shape}
        size={40}
        stroke={unlocked ? shapeAccent.stroke : '#a44dff'}
        opacity={unlocked ? 1 : 0.35}
        glow={unlocked}
      />

      <div
        className="absolute -top-2 left-1/2 -translate-x-1/2 text-poster text-[8.5px] tracking-[0.2em] px-1.5 py-0.5 rounded-full border-2 border-black whitespace-nowrap"
        style={{
          background: '#0a0708',
          color: unlocked ? shapeAccent.stroke : 'rgba(255,245,224,0.45)',
        }}
      >
        LV {globalIdx + 1}
      </div>

      {!unlocked && (
        <div className="absolute -bottom-2 -right-2 bg-splat-yellow border-2 border-black rounded-full p-0.5 leading-none">
          <svg width="11" height="11" viewBox="0 0 24 24" aria-hidden>
            <rect x="4" y="11" width="16" height="10" rx="2" fill="#0a0708" />
            <path
              d="M8 11V7a4 4 0 0 1 8 0v4"
              fill="none"
              stroke="#0a0708"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
          </svg>
        </div>
      )}

      {hasPortals && unlocked && (
        <div
          className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 text-[8px] font-poster tracking-[0.16em] px-1.5 py-0.5 rounded border-2 border-black whitespace-nowrap"
          style={{ background: '#ff3da4', color: '#0a0708' }}
        >
          PORTAL
        </div>
      )}
    </button>
  );
}

interface FeatureCardProps {
  challenge: ChallengeMeta;
  globalIdx: number;
  bestScore: number | null;
  shapeAccent: { stroke: string; soft: string };
  hasPortals: boolean;
  onTap: () => void;
}

function FeatureCard({
  challenge,
  globalIdx,
  bestScore,
  shapeAccent,
  hasPortals,
  onTap,
}: FeatureCardProps) {
  return (
    <button
      type="button"
      onClick={onTap}
      className="relative card-sticker px-4 py-3 text-left transition-transform active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
      style={{
        width: 152,
        background: `linear-gradient(180deg, ${shapeAccent.stroke}33 0%, rgba(18, 14, 36, 0.96) 70%)`,
        boxShadow: `6px 6px 0 0 #0a0708, 0 0 26px ${shapeAccent.soft}`,
      }}
      aria-label={`Play level ${globalIdx + 1}: ${challenge.title}`}
    >
      <span
        aria-hidden
        className="absolute -inset-2 rounded-[22px] pointer-events-none node-pulse"
        style={{
          boxShadow: `0 0 0 2px ${shapeAccent.stroke}, 0 0 28px ${shapeAccent.soft}`,
        }}
      />
      <div className="relative flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div
            className="text-poster text-[10px] tracking-[0.28em]"
            style={{ color: shapeAccent.stroke }}
          >
            LV {globalIdx + 1}
          </div>
          <div className="text-poster text-[13px] leading-tight mt-0.5 text-splat-paper truncate">
            {challenge.title}
          </div>
        </div>
        {hasPortals && (
          <div
            className="text-[8px] font-poster tracking-[0.16em] px-1.5 py-0.5 rounded border-2 border-black h-fit"
            style={{ background: '#ff3da4', color: '#0a0708' }}
          >
            PORTAL
          </div>
        )}
      </div>
      <div className="relative flex items-center justify-center my-1.5">
        <div
          className="absolute inset-0 rounded-full blur-2xl opacity-50"
          style={{ background: shapeAccent.soft }}
        />
        <ShapePreview
          shape={challenge.shape}
          size={60}
          stroke={shapeAccent.stroke}
          glow
        />
      </div>
      <div className="relative flex items-center justify-between text-[11px]">
        <span
          className="font-poster tabular-nums"
          style={{ color: shapeAccent.stroke }}
        >
          {challenge.targetTime.toFixed(2)}s
        </span>
        <span className="font-poster text-splat-paper/85 tabular-nums">
          BEST {bestScore ?? '—'}
        </span>
      </div>
    </button>
  );
}
