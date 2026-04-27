import { useEffect, useRef } from 'react';
import type { AttemptResult } from '../game/types';
import ScoreBadge from './ScoreBadge';
import { scaleNormalizedToCanvas, normalizeToUnit } from '../game/pathUtils';
import { haptics } from '../game/haptics';

interface Props {
  result: AttemptResult;
  bestScore?: number;
  streak: number;
  onRetry: () => void;
  onNext: () => void;
  onHome?: () => void;
  pointsEarned?: number;
  unlockedTitle?: string | null;
}

export default function ResultScreen({
  result,
  bestScore,
  streak,
  onRetry,
  onNext,
  onHome,
  pointsEarned,
  unlockedTitle,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const isBestLocal = bestScore != null && result.finalScore >= bestScore;
    haptics.forGrade(result.grade);
    if (isBestLocal && (pointsEarned ?? 0) > 0) {
      const t = setTimeout(() => haptics.newBest(), 280);
      const u = unlockedTitle
        ? setTimeout(() => haptics.unlock(), 700)
        : null;
      return () => {
        clearTimeout(t);
        if (u) clearTimeout(u);
      };
    }
    if (unlockedTitle) {
      const u = setTimeout(() => haptics.unlock(), 420);
      return () => clearTimeout(u);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result.challengeId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const draw = () => {
      const rect = wrap.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, rect.width, rect.height);

      const targetCanvas = scaleNormalizedToCanvas(result.targetPath, rect.width, rect.height, 16);
      drawSmooth(ctx, targetCanvas, 'rgba(180, 220, 255, 0.55)', 2, 6, 'rgba(120,200,255,0.45)');

      if (result.playerPath.length > 1) {
        const playerNorm = normalizeToUnit(result.playerPath);
        const playerCanvas = scaleNormalizedToCanvas(playerNorm, rect.width, rect.height, 16);
        const color =
          result.grade === 'Perfect' || result.grade === 'Elite' ? '#ffd56b' : '#00f0ff';
        drawSmooth(ctx, playerCanvas, color, 3, 14, color);
      }
    };
    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [result]);

  function drawSmooth(
    ctx: CanvasRenderingContext2D,
    pts: { x: number; y: number }[],
    stroke: string,
    width: number,
    blur: number,
    glow: string,
  ) {
    if (pts.length < 2) return;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = width;
    ctx.strokeStyle = stroke;
    ctx.shadowBlur = blur;
    ctx.shadowColor = glow;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      ctx.quadraticCurveTo(a.x, a.y, (a.x + b.x) / 2, (a.y + b.y) / 2);
    }
    const last = pts[pts.length - 1];
    ctx.lineTo(last.x, last.y);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  const deltaSign = result.timeDelta >= 0 ? '+' : '−';
  const deltaAbs = Math.abs(result.timeDelta).toFixed(2);
  const isBest = bestScore != null && result.finalScore >= bestScore;

  const animClass =
    result.grade === 'Perfect' || result.grade === 'Elite'
      ? 'animate-screenPulse'
      : result.grade === 'Miss'
      ? 'animate-miss'
      : '';

  return (
    <div className={`flex flex-col h-full w-full max-w-md mx-auto px-5 pt-6 pb-6 gap-4 ${animClass}`}>
      <div className="flex items-center justify-between gap-3">
        {onHome ? (
          <button
            onClick={() => {
              haptics.micro();
              onHome();
            }}
            className="rounded-full px-3 py-1.5 text-[10px] uppercase tracking-[0.32em] bg-white/10 text-white/75 border border-white/15 active:scale-95"
          >
            ← Home
          </button>
        ) : (
          <span className="text-xs uppercase tracking-[0.32em] text-white/45">Result</span>
        )}
        <div className="flex items-center gap-2">
          {pointsEarned != null && pointsEarned > 0 && (
            <span className="text-[10px] font-mono uppercase tracking-[0.24em] text-ink-cyan/85">
              +{pointsEarned} pts
            </span>
          )}
          {isBest && (
            <span className="text-xs uppercase tracking-[0.28em] text-ink-gold text-glow-gold">
              New Best
            </span>
          )}
        </div>
      </div>

      {unlockedTitle && (
        <div className="card rounded-2xl px-4 py-3 border-ink-gold/40 bg-ink-gold/10 animate-fadeIn">
          <div className="text-[10px] uppercase tracking-[0.32em] text-ink-gold">
            Unlocked
          </div>
          <div className="font-display font-semibold text-base text-white mt-0.5">
            {unlockedTitle}
          </div>
        </div>
      )}

      <div className="card rounded-3xl py-6 flex flex-col items-center">
        <ScoreBadge score={result.finalScore} grade={result.grade} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Stat
          label="Shape · 50%"
          value={`${result.shapeScore}`}
          accent="cyan"
        />
        <Stat
          label="Timing · 50%"
          value={`${result.timingScore}`}
          accent="gold"
        />
        <Stat
          label="Time"
          value={`${result.actualTime.toFixed(2)}s`}
          sub={`${deltaSign}${deltaAbs}s`}
          subTone={Math.abs(result.timeDelta) < 0.1 ? 'good' : 'neutral'}
        />
        <Stat label="Streak" value={streak.toString()} />
      </div>

      <div ref={wrapRef} className="card rounded-3xl aspect-square relative overflow-hidden">
        <canvas ref={canvasRef} className="absolute inset-0" />
      </div>

      <div className="grid grid-cols-[2fr_1fr] gap-3">
        <button
          onClick={() => {
            haptics.micro();
            onRetry();
          }}
          className="btn-3d py-5 text-base uppercase tracking-[0.32em] bg-gradient-to-b from-ink-cyan/95 to-cyan-500/80 text-bg-deep"
        >
          Retry
        </button>
        <button
          onClick={() => {
            haptics.micro();
            onNext();
          }}
          className="btn-3d py-5 text-base uppercase tracking-[0.32em] bg-white/10 text-white border border-white/15"
        >
          Next
        </button>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  subTone,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  subTone?: 'good' | 'neutral';
  accent?: 'cyan' | 'gold';
}) {
  const labelTone =
    accent === 'cyan'
      ? 'text-ink-cyan/85'
      : accent === 'gold'
      ? 'text-ink-gold/85'
      : 'text-white/45';
  const valueTone =
    accent === 'cyan'
      ? 'text-ink-cyan text-glow-cyan'
      : accent === 'gold'
      ? 'text-ink-gold text-glow-gold'
      : 'text-white';
  return (
    <div className="card rounded-2xl px-4 py-3">
      <div className={`text-[10px] uppercase tracking-[0.28em] ${labelTone}`}>{label}</div>
      <div className={`font-mono text-xl tabular-nums ${valueTone}`}>{value}</div>
      {sub && (
        <div
          className={`font-mono text-xs tabular-nums ${
            subTone === 'good' ? 'text-ink-gold' : 'text-white/55'
          }`}
        >
          {sub}
        </div>
      )}
    </div>
  );
}
