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
  accentColor: string;
  accentSoft: string;
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

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const m = hex.replace('#', '').match(/.{2}/g);
  if (!m) return { r: 0, g: 240, b: 255 };
  return { r: parseInt(m[0], 16), g: parseInt(m[1], 16), b: parseInt(m[2], 16) };
}

function rgba(hex: string, a: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

function tintTowardWhite(hex: string, t: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgb(${Math.round(r + (255 - r) * t)}, ${Math.round(g + (255 - g) * t)}, ${Math.round(
    b + (255 - b) * t,
  )})`;
}

const DrawingCanvas = forwardRef<DrawingCanvasHandle, Props>(function DrawingCanvas(
  {
    enabled,
    targetUnitPath,
    guideOpacity,
    closedShape = true,
    accentColor,
    accentSoft,
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
    { x: number; y: number; vx: number; vy: number; life: number; hue: string }[]
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
    accentColor,
    accentSoft,
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
    return scaleNormalizedToCanvas(targetUnitPath, w, h, 36);
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
    const guideHex = '#bcd9ff';

    if (resultMode && resultPath && resultPath.length > 1) {
      drawNeonPath(ctx, tCanvas, guideHex, 4, Math.min(0.85, guideOpacity * 1.6) * 0.9, false);

      const playerNorm = normalizeToUnit(resultPath);
      const playerCanvas = scaleNormalizedToCanvas(playerNorm, w, h, 36);
      const isPerfect = resultGrade === 'Perfect';
      const isElite = resultGrade === 'Elite';
      if (isPerfect) {
        drawRainbowStickerPath(ctx, playerCanvas, 9);
      } else {
        const baseColor = isElite ? '#ffe83d' : accentColor;
        drawNeonPath(ctx, playerCanvas, baseColor, 8, 1, true);
      }

      if (
        worstSegment &&
        worstSegment.endIdx > worstSegment.startIdx &&
        worstSegment.endIdx < playerCanvas.length
      ) {
        const slice = playerCanvas.slice(
          worstSegment.startIdx,
          worstSegment.endIdx + 1,
        );
        drawNeonPath(ctx, slice, '#ff3da4', 12, 1, true);
      }
    } else {
      drawNeonPath(ctx, tCanvas, guideHex, 5, guideOpacity, false);

      if (pathRef.current.length > 1) {
        const intensity = onTrackRef.current ? 1.18 : 1.0;
        drawNeonPath(ctx, pathRef.current, accentColor, 9, intensity, true);
      }
    }

    if (burstParticlesRef.current.length > 0) {
      drawBurst(ctx);
    }

    void accentSoft;
  }

  function drawNeonPath(
    ctx: CanvasRenderingContext2D,
    pts: Point[],
    hex: string,
    coreWidth: number,
    intensity: number,
    sticker: boolean,
  ) {
    if (pts.length < 2) return;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const buildPath = () => {
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
    };

    // Outer halo
    ctx.shadowBlur = 38;
    ctx.shadowColor = rgba(hex, 0.85 * intensity);
    ctx.strokeStyle = rgba(hex, 0.34 * intensity);
    ctx.lineWidth = coreWidth * 4.5;
    buildPath();
    ctx.stroke();

    // Mid glow
    ctx.shadowBlur = 18;
    ctx.shadowColor = rgba(hex, 1 * intensity);
    ctx.strokeStyle = rgba(hex, 0.72 * intensity);
    ctx.lineWidth = coreWidth * 2;
    buildPath();
    ctx.stroke();

    if (sticker) {
      // Black sticker outline
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#0a0708';
      ctx.lineWidth = coreWidth + 6;
      buildPath();
      ctx.stroke();
    }

    // Saturated color core
    ctx.shadowBlur = sticker ? 4 : 6;
    ctx.shadowColor = rgba(hex, 0.85 * intensity);
    ctx.strokeStyle = hex;
    ctx.lineWidth = coreWidth;
    buildPath();
    ctx.stroke();

    if (sticker) {
      // White-tinted highlight on top for that hot-sticker shine
      ctx.shadowBlur = 0;
      ctx.strokeStyle = tintTowardWhite(hex, 0.7);
      ctx.lineWidth = Math.max(2, coreWidth * 0.3);
      buildPath();
      ctx.stroke();
    }

    ctx.shadowBlur = 0;
  }

  function drawRainbowStickerPath(
    ctx: CanvasRenderingContext2D,
    pts: Point[],
    coreWidth: number,
  ) {
    if (pts.length < 2) return;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const buildPath = () => {
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
    };

    let minX = Infinity,
      maxX = -Infinity;
    for (const p of pts) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
    }
    const grad = ctx.createLinearGradient(minX, 0, maxX, 0);
    grad.addColorStop(0, '#ff3da4');
    grad.addColorStop(0.18, '#ff7a3d');
    grad.addColorStop(0.35, '#ffe83d');
    grad.addColorStop(0.55, '#a4ff3d');
    grad.addColorStop(0.75, '#3df0ff');
    grad.addColorStop(1, '#a44dff');

    // Mid halo (multicolor blur)
    ctx.shadowBlur = 32;
    ctx.shadowColor = 'rgba(255, 232, 61, 0.8)';
    ctx.strokeStyle = grad;
    ctx.lineWidth = coreWidth * 3.5;
    ctx.globalAlpha = 0.45;
    buildPath();
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Black sticker outline
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#0a0708';
    ctx.lineWidth = coreWidth + 7;
    buildPath();
    ctx.stroke();

    // Rainbow gradient core
    ctx.shadowBlur = 6;
    ctx.shadowColor = 'rgba(255, 255, 255, 0.7)';
    ctx.strokeStyle = grad;
    ctx.lineWidth = coreWidth;
    buildPath();
    ctx.stroke();

    // White highlight stripe
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.lineWidth = Math.max(2, coreWidth * 0.28);
    buildPath();
    ctx.stroke();
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
    const playerCanvas = scaleNormalizedToCanvas(playerNorm, w, h, 36);
    const particles: typeof burstParticlesRef.current = [];
    const count = 72;
    const palette = ['#ff3da4', '#ff7a3d', '#ffe83d', '#a4ff3d', '#3df0ff', '#a44dff', '#fff5e0'];
    for (let i = 0; i < count; i++) {
      const idx = Math.floor((i / count) * playerCanvas.length);
      const p = playerCanvas[Math.min(playerCanvas.length - 1, idx)];
      const angle = Math.random() * Math.PI * 2;
      const speed = 80 + Math.random() * 110;
      particles.push({
        x: p.x,
        y: p.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        hue: palette[i % palette.length],
      });
    }
    burstParticlesRef.current = particles;
    burstStartRef.current = performance.now();
    const tick = () => {
      const elapsed = (performance.now() - burstStartRef.current) / 1000;
      if (elapsed > 0.85) {
        burstParticlesRef.current = [];
        burstRafRef.current = null;
        redraw();
        return;
      }
      for (const p of burstParticlesRef.current) {
        p.x += p.vx * 0.016;
        p.y += p.vy * 0.016;
        p.vx *= 0.93;
        p.vy *= 0.93;
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
      const t = Math.min(1, p.life / 0.85);
      const alpha = (1 - t) * 0.95;
      ctx.fillStyle = rgba(p.hue, alpha);
      ctx.shadowBlur = 22;
      ctx.shadowColor = rgba(p.hue, alpha);
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2.6 + (1 - t) * 1.6, 0, Math.PI * 2);
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
