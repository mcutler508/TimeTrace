import { useEffect, useImperativeHandle, useRef, forwardRef } from 'react';
import type { AttemptResult, Point } from '../game/types';
import { normalizeToUnit, scaleNormalizedToCanvas } from '../game/pathUtils';
import { haptics } from '../game/haptics';
import {
  ASSIST_TUNING,
  applyClosure,
  guideTowardTarget,
  smoothPoint,
} from '../game/assist';

export interface DrawingCanvasHandle {
  reset(): void;
  getPath(): Point[];
}

interface Props {
  enabled: boolean;
  targetUnitPath: Point[];
  guideOpacity: number;
  closedShape?: boolean;
  assistEnabled?: boolean;
  assistStrength?: number;
  resultMode?: boolean;
  resultPath?: Point[] | null;
  resultGrade?: AttemptResult['grade'] | null;
  worstSegment?: { startIdx: number; endIdx: number } | null;
  perfectBurst?: boolean;
  onStrokeStart?: () => void;
  onStrokeEnd?: (path: Point[]) => void;
  onPointAdded?: (count: number) => void;
}

const DrawingCanvas = forwardRef<DrawingCanvasHandle, Props>(function DrawingCanvas(
  {
    enabled,
    targetUnitPath,
    guideOpacity,
    closedShape = true,
    assistEnabled = true,
    assistStrength = 1,
    resultMode = false,
    resultPath = null,
    resultGrade = null,
    worstSegment = null,
    perfectBurst = false,
    onStrokeStart,
    onStrokeEnd,
  },
  ref,
) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pathRef = useRef<Point[]>([]);
  const rawHistoryRef = useRef<Point[]>([]);
  const drawingRef = useRef(false);
  const onTrackRef = useRef(false);
  const dprRef = useRef(1);
  const sizeRef = useRef({ w: 0, h: 0 });
  const burstRafRef = useRef<number | null>(null);
  const burstStartRef = useRef<number>(0);
  const burstParticlesRef = useRef<
    { x: number; y: number; vx: number; vy: number; life: number }[]
  >([]);

  useImperativeHandle(ref, () => ({
    reset() {
      pathRef.current = [];
      rawHistoryRef.current = [];
      drawingRef.current = false;
      onTrackRef.current = false;
      cancelBurst();
      redraw();
    },
    getPath() {
      return pathRef.current.slice();
    },
  }));

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const ro = new ResizeObserver(() => fitCanvas());
    ro.observe(wrap);
    fitCanvas();
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    redraw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    targetUnitPath,
    guideOpacity,
    resultMode,
    resultPath,
    resultGrade,
    worstSegment,
  ]);

  useEffect(() => {
    if (perfectBurst) startBurst();
    else cancelBurst();
    return cancelBurst;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perfectBurst, resultPath]);

  function fitCanvas() {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const rect = wrap.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    dprRef.current = dpr;
    sizeRef.current = { w: rect.width, h: rect.height };
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    redraw();
  }

  function targetCanvasPath(): Point[] {
    const { w, h } = sizeRef.current;
    return scaleNormalizedToCanvas(targetUnitPath, w, h);
  }

  function redraw() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { w, h } = sizeRef.current;
    const dpr = dprRef.current;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const tCanvas = targetCanvasPath();

    if (resultMode && resultPath && resultPath.length > 1) {
      drawSmoothPath(
        ctx,
        tCanvas,
        `rgba(180, 220, 255, ${Math.min(0.85, guideOpacity * 1.6)})`,
        2,
        10,
        'rgba(120, 200, 255, 0.55)',
      );
      const playerNorm = normalizeToUnit(resultPath);
      const playerCanvas = scaleNormalizedToCanvas(playerNorm, w, h);
      const isStrong = resultGrade === 'Perfect' || resultGrade === 'Elite';
      const baseColor = isStrong ? '#ffd56b' : '#00f0ff';
      drawSmoothPath(ctx, playerCanvas, baseColor, 3, 14, baseColor);

      if (
        worstSegment &&
        worstSegment.endIdx > worstSegment.startIdx &&
        worstSegment.endIdx < playerCanvas.length
      ) {
        const slice = playerCanvas.slice(
          worstSegment.startIdx,
          worstSegment.endIdx + 1,
        );
        drawSmoothPath(ctx, slice, '#ff7a3d', 5, 22, 'rgba(255, 122, 61, 0.85)');
      }
    } else {
      drawSmoothPath(
        ctx,
        tCanvas,
        `rgba(180, 220, 255, ${guideOpacity})`,
        2,
        8,
        'rgba(120, 200, 255, 0.5)',
      );
      if (pathRef.current.length > 1) {
        const blur = onTrackRef.current ? 26 : 18;
        const glow = onTrackRef.current
          ? 'rgba(0, 240, 255, 1)'
          : 'rgba(0, 240, 255, 0.85)';
        drawSmoothPath(ctx, pathRef.current, '#00f0ff', 4, blur, glow);
      }
    }

    if (burstParticlesRef.current.length > 0) {
      drawBurst(ctx);
    }
  }

  function drawSmoothPath(
    ctx: CanvasRenderingContext2D,
    pts: Point[],
    stroke: string,
    width: number,
    blur: number,
    glow?: string,
  ) {
    if (pts.length < 2) return;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = width;
    ctx.strokeStyle = stroke;
    if (blur > 0 && glow) {
      ctx.shadowBlur = blur;
      ctx.shadowColor = glow;
    } else {
      ctx.shadowBlur = 0;
    }
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      ctx.quadraticCurveTo(a.x, a.y, mx, my);
    }
    const last = pts[pts.length - 1];
    ctx.lineTo(last.x, last.y);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  function localPoint(e: PointerEvent): Point {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      t: performance.now(),
    };
  }

  function transformIncoming(raw: Point): { point: Point; onTrack: boolean } {
    if (!assistEnabled || assistStrength <= 0) {
      return { point: raw, onTrack: false };
    }
    const hist = rawHistoryRef.current;
    const prev = hist[hist.length - 1] ?? null;
    const prevPrev = hist[hist.length - 2] ?? null;
    const smoothed = smoothPoint(raw, prev, prevPrev, assistStrength);
    const t = targetCanvasPath();
    const guided = guideTowardTarget(smoothed, t, assistStrength);
    return { point: guided.point, onTrack: guided.onTrack };
  }

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!enabled || resultMode) return;
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    drawingRef.current = true;
    const raw = localPoint(e.nativeEvent);
    rawHistoryRef.current = [raw];
    const { point, onTrack } = transformIncoming(raw);
    onTrackRef.current = onTrack;
    pathRef.current = [point];
    haptics.start();
    onStrokeStart?.();
    redraw();
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!enabled || !drawingRef.current || resultMode) return;
    e.preventDefault();
    const raw = localPoint(e.nativeEvent);
    const lastRaw = rawHistoryRef.current[rawHistoryRef.current.length - 1];
    if (lastRaw && Math.hypot(raw.x - lastRaw.x, raw.y - lastRaw.y) < 1.2) return;
    rawHistoryRef.current.push(raw);
    if (rawHistoryRef.current.length > 4) rawHistoryRef.current.shift();
    const { point, onTrack } = transformIncoming(raw);
    onTrackRef.current = onTrack;
    pathRef.current.push(point);
    redraw();
  }

  function onPointerEnd(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    onTrackRef.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch {
      /* noop */
    }
    let finalPath = pathRef.current.slice();
    if (assistEnabled && closedShape && assistStrength > 0) {
      finalPath = applyClosure(
        finalPath,
        ASSIST_TUNING.closureThresholdPx * assistStrength,
      );
      pathRef.current = finalPath;
    }
    haptics.stop();
    onStrokeEnd?.(finalPath);
  }

  function startBurst() {
    cancelBurst();
    if (!resultPath || resultPath.length < 2) return;
    const { w, h } = sizeRef.current;
    const playerNorm = normalizeToUnit(resultPath);
    const playerCanvas = scaleNormalizedToCanvas(playerNorm, w, h);
    const particles: { x: number; y: number; vx: number; vy: number; life: number }[] = [];
    const count = 36;
    for (let i = 0; i < count; i++) {
      const idx = Math.floor((i / count) * playerCanvas.length);
      const p = playerCanvas[Math.min(playerCanvas.length - 1, idx)];
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 90;
      particles.push({
        x: p.x,
        y: p.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
      });
    }
    burstParticlesRef.current = particles;
    burstStartRef.current = performance.now();
    const tick = () => {
      const elapsed = (performance.now() - burstStartRef.current) / 1000;
      if (elapsed > 0.7) {
        burstParticlesRef.current = [];
        burstRafRef.current = null;
        redraw();
        return;
      }
      for (const p of burstParticlesRef.current) {
        p.x += p.vx * 0.016;
        p.y += p.vy * 0.016;
        p.vx *= 0.94;
        p.vy *= 0.94;
        p.life = elapsed;
      }
      redraw();
      burstRafRef.current = requestAnimationFrame(tick);
    };
    burstRafRef.current = requestAnimationFrame(tick);
  }

  function cancelBurst() {
    if (burstRafRef.current != null) {
      cancelAnimationFrame(burstRafRef.current);
      burstRafRef.current = null;
    }
    burstParticlesRef.current = [];
  }

  function drawBurst(ctx: CanvasRenderingContext2D) {
    ctx.save();
    for (const p of burstParticlesRef.current) {
      const t = Math.min(1, p.life / 0.7);
      const alpha = 1 - t;
      ctx.fillStyle = `rgba(255, 213, 107, ${alpha})`;
      ctx.shadowBlur = 16;
      ctx.shadowColor = `rgba(255, 213, 107, ${alpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    ctx.shadowBlur = 0;
  }

  return (
    <div
      ref={wrapRef}
      className="relative w-full aspect-square no-touch select-none"
      style={{ contain: 'layout paint size' }}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full rounded-3xl no-touch"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
      />
    </div>
  );
});

export default DrawingCanvas;
