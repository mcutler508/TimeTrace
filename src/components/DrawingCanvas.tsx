import { useEffect, useImperativeHandle, useRef, forwardRef } from 'react';
import type { Point } from '../game/types';
import { scaleNormalizedToCanvas } from '../game/pathUtils';

export interface DrawingCanvasHandle {
  reset(): void;
  getPath(): Point[];
}

interface Props {
  enabled: boolean;
  targetUnitPath: Point[];
  guideOpacity: number;
  ghostUnitPath?: Point[] | null;
  bestUnitPath?: Point[] | null;
  onStrokeStart?: () => void;
  onStrokeEnd?: (path: Point[]) => void;
  onPointAdded?: (count: number) => void;
}

const DrawingCanvas = forwardRef<DrawingCanvasHandle, Props>(function DrawingCanvas(
  {
    enabled,
    targetUnitPath,
    guideOpacity,
    ghostUnitPath,
    bestUnitPath,
    onStrokeStart,
    onStrokeEnd,
    onPointAdded,
  },
  ref,
) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pathRef = useRef<Point[]>([]);
  const drawingRef = useRef(false);
  const dprRef = useRef(1);
  const sizeRef = useRef({ w: 0, h: 0 });

  useImperativeHandle(ref, () => ({
    reset() {
      pathRef.current = [];
      drawingRef.current = false;
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
  }, [targetUnitPath, guideOpacity, ghostUnitPath, bestUnitPath]);

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

  function redraw() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { w, h } = sizeRef.current;
    const dpr = dprRef.current;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    if (bestUnitPath && bestUnitPath.length > 1) {
      drawPath(
        ctx,
        scaleNormalizedToCanvas(bestUnitPath, w, h),
        'rgba(255, 213, 107, 0.22)',
        2,
        0,
      );
    }
    if (ghostUnitPath && ghostUnitPath.length > 1) {
      drawPath(
        ctx,
        scaleNormalizedToCanvas(ghostUnitPath, w, h),
        'rgba(160, 107, 255, 0.32)',
        2,
        0,
      );
    }

    const targetCanvasPath = scaleNormalizedToCanvas(targetUnitPath, w, h);
    drawPath(
      ctx,
      targetCanvasPath,
      `rgba(180, 220, 255, ${guideOpacity})`,
      2,
      8,
      'rgba(120, 200, 255, 0.5)',
    );

    if (pathRef.current.length > 1) {
      drawPath(
        ctx,
        pathRef.current,
        '#00f0ff',
        4,
        18,
        'rgba(0, 240, 255, 0.85)',
      );
    }
  }

  function drawPath(
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

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!enabled) return;
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    drawingRef.current = true;
    pathRef.current = [localPoint(e.nativeEvent)];
    onStrokeStart?.();
    redraw();
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!enabled || !drawingRef.current) return;
    e.preventDefault();
    const p = localPoint(e.nativeEvent);
    const last = pathRef.current[pathRef.current.length - 1];
    if (last && Math.hypot(p.x - last.x, p.y - last.y) < 1.2) return;
    pathRef.current.push(p);
    onPointAdded?.(pathRef.current.length);
    redraw();
  }

  function onPointerEnd(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch {
      /* noop */
    }
    onStrokeEnd?.(pathRef.current.slice());
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
