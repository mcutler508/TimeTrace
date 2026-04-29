import { useEffect, useImperativeHandle, useMemo, useRef, forwardRef } from 'react';
import type { AttemptResult, Point } from '../game/types';
import { scaleNormalizedToCanvas, segmentsIntersect } from '../game/pathUtils';
import { haptics } from '../game/haptics';
import { sfx } from '../game/audio';
import {
  ASSIST_TUNING,
  applyClosure,
  guideTowardTarget,
  smoothPoint,
} from '../game/assist';
import {
  DEFAULT_PAINT_STYLE,
  renderNeon,
  renderPaintStroke,
  rgba,
  type PaintStyleId,
} from '../game/paintStyles';

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
  paintStyleId?: PaintStyleId;
  paintVariant?: string;
  onStrokeStart?: () => void;
  onStrokeEnd?: (path: Point[]) => void;
  onPointAdded?: (count: number) => void;
  /** Called when the live stroke crosses an IN slash. Host should freeze the timer. */
  onPortalPause?: () => void;
  /** Called when the player successfully places inside the OUT landing ring. Host should resume the timer. */
  onPortalResume?: () => void;
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
    paintStyleId = DEFAULT_PAINT_STYLE,
    paintVariant,
    onStrokeStart,
    onStrokeEnd,
    onPortalPause,
    onPortalResume,
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
  /** Indices into the active portals list whose IN→OUT cycle has fully landed. Visual "scar" state. */
  const usedPortalsRef = useRef<Set<number>>(new Set());
  /** Portal animation start, for the live ring pulse. */
  const portalAnimStartRef = useRef<number>(0);
  const portalAnimRafRef = useRef<number | null>(null);
  /**
   * Lift-and-place state.
   * - `tracing`: normal drawing (or idle).
   * - `pending`: stroke crossed pair `pairIndex`'s IN slash. Line is frozen at IN.
   *   `liftedAt` is null while the original finger is still down, set to a timestamp
   *   the moment it lifts. While in `pending`, the next pointerdown inside the OUT
   *   landing ring resumes the stroke from the OUT anchor point.
   */
  const portalStateRef = useRef<
    | { mode: 'tracing' }
    | { mode: 'pending'; pairIndex: number; capturedAt: number; liftedAt: number | null }
  >({ mode: 'tracing' });
  /**
   * Live "approach" state for the IN slash nearest the stroke head. Drives the
   * arm-on-approach visual (slash dim → bright) and the subtle canvas zoom-in
   * that helps players fine-tune their aim. `proximity` is 0 (outside the
   * approach zone) → 1 (right at the slash midpoint).
   */
  const portalApproachRef = useRef<{ pairIndex: number; proximity: number } | null>(null);
  /** Particles for the OUT-landing burst (separate from the perfect-attempt burst). */
  const landingBurstRef = useRef<
    { x: number; y: number; vx: number; vy: number; startedAt: number; hue: string }[]
  >([]);

  useImperativeHandle(ref, () => ({
    reset() {
      pathRef.current = [];
      rawHistoryRef.current = [];
      drawingRef.current = false;
      onTrackRef.current = false;
      usedPortalsRef.current = new Set();
      portalStateRef.current = { mode: 'tracing' };
      portalApproachRef.current = null;
      landingBurstRef.current = [];
      const c = canvasRef.current;
      if (c) {
        c.style.transform = 'scale(1)';
        c.style.transformOrigin = '50% 50%';
      }
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

  /**
   * True if the current target path has at least one teleport marker — i.e.
   * this challenge has portals. Derived once per target path.
   */
  const hasPortals = useMemo(
    () => targetUnitPath.some((p) => p.teleport),
    [targetUnitPath],
  );

  // Portal pulse animation. Runs when portals exist and not in result mode.
  useEffect(() => {
    const animate = hasPortals && !resultMode;
    if (!animate) {
      if (portalAnimRafRef.current != null) {
        cancelAnimationFrame(portalAnimRafRef.current);
        portalAnimRafRef.current = null;
      }
      return;
    }
    portalAnimStartRef.current = performance.now();
    const tick = () => {
      redraw();
      portalAnimRafRef.current = requestAnimationFrame(tick);
    };
    portalAnimRafRef.current = requestAnimationFrame(tick);
    return () => {
      if (portalAnimRafRef.current != null) {
        cancelAnimationFrame(portalAnimRafRef.current);
        portalAnimRafRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasPortals, resultMode]);

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

  /**
   * For each portal pair, compute the canvas-space slash endpoints AND the
   * tangent-derived perpendicular axis. Slashes sit on the target shape line
   * and are perpendicular to the curve tangent at that parametric position.
   */
  interface PortalSlash {
    /** Slash midpoint on the path (in canvas pixels). */
    p: { x: number; y: number };
    /** Tangent unit vector along the path at that point. */
    tangent: { x: number; y: number };
    /** Perpendicular unit vector (the slash's long axis). */
    perp: { x: number; y: number };
    /** Slash length (canvas px). */
    halfLen: number;
    /** Endpoint A of the slash. */
    a: { x: number; y: number };
    /** Endpoint B of the slash. */
    b: { x: number; y: number };
  }

  function normalize(v: { x: number; y: number }): { x: number; y: number } {
    const len = Math.hypot(v.x, v.y) || 1;
    return { x: v.x / len, y: v.y / len };
  }

  /** Build a slash centered at a canvas point, perpendicular to a tangent. */
  function makeSlashAt(
    point: { x: number; y: number },
    tangent: { x: number; y: number },
    lengthUnit: number,
  ): PortalSlash {
    const t = normalize(tangent);
    const perp = { x: -t.y, y: t.x };
    const { w, h } = sizeRef.current;
    const padding = 36;
    const size = Math.min(w, h) - padding * 2;
    const halfLen = (lengthUnit * size) / 2;
    const a = { x: point.x + perp.x * halfLen, y: point.y + perp.y * halfLen };
    const b = { x: point.x - perp.x * halfLen, y: point.y - perp.y * halfLen };
    return { p: { x: point.x, y: point.y }, tangent: t, perp, halfLen, a, b };
  }

  /**
   * Derive portal slash pairs by walking the canvas-space target path looking
   * for teleport boundaries. The IN slash sits at the last point of one
   * segment, oriented along the incoming tangent; the OUT slash sits at the
   * first point of the next segment, oriented along the outgoing tangent.
   */
  function portalSlashes(): { entry: PortalSlash; exit: PortalSlash }[] {
    const tCanvas = targetCanvasPath();
    const result: { entry: PortalSlash; exit: PortalSlash }[] = [];
    for (let i = 0; i < tCanvas.length - 1; i++) {
      if (!tCanvas[i].teleport) continue;
      const entryPoint = tCanvas[i];
      const exitPoint = tCanvas[i + 1];
      const ePrev = i > 0 ? tCanvas[i - 1] : entryPoint;
      const xNext = i + 2 < tCanvas.length ? tCanvas[i + 2] : exitPoint;
      const eTangent = { x: entryPoint.x - ePrev.x, y: entryPoint.y - ePrev.y };
      const xTangent = { x: xNext.x - exitPoint.x, y: xNext.y - exitPoint.y };
      result.push({
        // IN slash is small + dim-until-approached so players have to aim
        // through it deliberately. arm-on-approach feedback (see
        // computeApproachState + drawPortalSlash) makes the engagement
        // obvious. OUT is left larger because it's a placement target after
        // the warp, not a hazard to avoid.
        entry: makeSlashAt(entryPoint, eTangent, 0.07),
        exit: makeSlashAt(exitPoint, xTangent, 0.12),
      });
    }
    return result;
  }

  function drawPortalSlash(
    ctx: CanvasRenderingContext2D,
    slash: PortalSlash,
    color: string,
    used: boolean,
    pulse: number,
    label: string,
    /** 0 = dim/dormant, 1 = fully engaged. Use 1 for slashes that don't arm. */
    proximity: number = 1,
  ) {
    // Below ~40% proximity the slash sits quiet (no breathing pulse). Above,
    // it picks up the standard pulse, scaled toward full intensity.
    const armed = proximity > 0.4;
    const breath =
      used || !armed ? 0 : 0.12 * Math.sin(pulse * Math.PI * 2) * proximity;
    const liveLen = slash.halfLen * (1 + breath);
    const a = {
      x: slash.p.x + slash.perp.x * liveLen,
      y: slash.p.y + slash.perp.y * liveLen,
    };
    const b = {
      x: slash.p.x - slash.perp.x * liveLen,
      y: slash.p.y - slash.perp.y * liveLen,
    };

    // Stroke endpoints offset slightly along tangent for the parallel double line.
    const off = 3.5;
    const t = slash.tangent;
    const a1 = { x: a.x + t.x * off, y: a.y + t.y * off };
    const b1 = { x: b.x + t.x * off, y: b.y + t.y * off };
    const a2 = { x: a.x - t.x * off, y: a.y - t.y * off };
    const b2 = { x: b.x - t.x * off, y: b.y - t.y * off };

    ctx.save();
    ctx.lineCap = 'round';

    if (used) {
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      ctx.restore();
      return;
    }

    // Lerp every layer's opacity by proximity so the slash visually "wakes up"
    // as the stroke approaches. 0.35 floor keeps the dormant slash legible.
    ctx.globalAlpha = 0.35 + 0.65 * proximity;

    // Outer halo
    ctx.shadowBlur = 26;
    ctx.shadowColor = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();

    // Sticker outlines
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#0a0708';
    ctx.lineWidth = 5;
    [
      [a1, b1],
      [a2, b2],
    ].forEach(([s, e]) => {
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(e.x, e.y);
      ctx.stroke();
    });

    // Bright parallel cores
    ctx.lineWidth = 3;
    ctx.strokeStyle = color;
    ctx.shadowBlur = 8;
    ctx.shadowColor = color;
    [
      [a1, b1],
      [a2, b2],
    ].forEach(([s, e]) => {
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(e.x, e.y);
      ctx.stroke();
    });

    // Hot white center stripe
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(255,255,255,0.95)';
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();

    // Tiny tangent ticks at each end (subtle "energy" detail)
    const tickLen = 4;
    [a, b].forEach((endpt) => {
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(endpt.x - t.x * tickLen, endpt.y - t.y * tickLen);
      ctx.lineTo(endpt.x + t.x * tickLen, endpt.y + t.y * tickLen);
      ctx.stroke();
    });

    // Letter label (E / X) on the slash, near the path
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = 'bold 9px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const labelOffset = 14;
    ctx.fillText(
      label,
      slash.p.x + slash.perp.x * (slash.halfLen + labelOffset),
      slash.p.y + slash.perp.y * (slash.halfLen + labelOffset),
    );
    ctx.restore();
  }

  function drawPortalPair(
    ctx: CanvasRenderingContext2D,
    entry: PortalSlash,
    exit: PortalSlash,
    used: boolean,
    isPending: boolean,
    pendingMsSinceCapture: number,
    pulse: number,
    now: number,
    inProximity: number,
  ) {
    // Connection arc — brighter and pink while pending, faint dashed when idle.
    if (!used) {
      ctx.save();
      ctx.setLineDash(isPending ? [3, 6] : [5, 7]);
      ctx.lineWidth = isPending ? 1.8 : 1.25;
      ctx.strokeStyle = isPending
        ? 'rgba(255, 61, 164, 0.55)'
        : 'rgba(255, 245, 224, 0.18)';
      ctx.beginPath();
      const cx = (entry.p.x + exit.p.x) / 2;
      const cy = (entry.p.y + exit.p.y) / 2 - 18;
      ctx.moveTo(entry.p.x, entry.p.y);
      ctx.quadraticCurveTo(cx, cy, exit.p.x, exit.p.y);
      ctx.stroke();
      ctx.restore();

      if (isPending) {
        drawPortalComet(ctx, entry, exit, pendingMsSinceCapture);
      }
    }

    // IN slash
    if (used) {
      drawPortalScar(ctx, entry, '#3df0ff');
    } else if (isPending) {
      drawCapturedSlash(ctx, entry, '#3df0ff', pendingMsSinceCapture);
    } else {
      drawPortalSlash(ctx, entry, '#3df0ff', false, pulse, 'IN', inProximity);
    }

    // OUT slash
    if (used) {
      drawPortalScar(ctx, exit, '#ff3da4');
    } else if (isPending) {
      drawArmedExit(ctx, exit, pulse, now);
    } else {
      drawPortalSlash(ctx, exit, '#ff3da4', false, pulse + 0.5, 'OUT');
    }
  }

  /**
   * IN-slash collapse animation. Plays for ~180ms after capture, then settles
   * into a faint pulse so the player keeps a sense of where the line went in.
   */
  function drawCapturedSlash(
    ctx: CanvasRenderingContext2D,
    slash: PortalSlash,
    color: string,
    msSinceCapture: number,
  ) {
    const collapseT = Math.min(1, msSinceCapture / 180);
    const lenScale = 1 - collapseT * 0.7; // collapses to ~30% length
    const liveLen = slash.halfLen * Math.max(0.18, lenScale);
    const a = {
      x: slash.p.x + slash.perp.x * liveLen,
      y: slash.p.y + slash.perp.y * liveLen,
    };
    const b = {
      x: slash.p.x - slash.perp.x * liveLen,
      y: slash.p.y - slash.perp.y * liveLen,
    };

    ctx.save();
    ctx.lineCap = 'round';

    // Glowing core fading and shrinking
    ctx.shadowBlur = 26 * (1 - collapseT * 0.5);
    ctx.shadowColor = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = 9 * (1 - collapseT * 0.4);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();

    // Bright center stripe also shrinks
    ctx.shadowBlur = 0;
    ctx.lineWidth = 1.5 * (1 - collapseT * 0.3);
    ctx.strokeStyle = `rgba(255,255,255,${0.95 * (1 - collapseT * 0.5)})`;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();

    // Sparkle implosion ring around the midpoint as the slash collapses
    if (collapseT < 1) {
      const ringR = slash.halfLen * (0.4 + collapseT * 0.7);
      const ringAlpha = (1 - collapseT) * 0.55;
      ctx.shadowBlur = 14;
      ctx.shadowColor = color;
      ctx.strokeStyle = rgba(color, ringAlpha);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(slash.p.x, slash.p.y, ringR, 0, Math.PI * 2);
      ctx.stroke();
    }

    // After collapse, a soft "scar" pulse so it stays legible as the source.
    if (collapseT >= 1) {
      const idle = ((msSinceCapture - 180) / 1200) % 1;
      const breathe = 0.18 + 0.12 * Math.sin(idle * Math.PI * 2);
      ctx.shadowBlur = 10;
      ctx.shadowColor = color;
      ctx.fillStyle = rgba(color, breathe);
      ctx.beginPath();
      ctx.arc(slash.p.x, slash.p.y, 6, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  /**
   * Armed OUT slash: amplified glow + concentric expanding landing rings +
   * subtle radial fill telegraphing the place zone. Includes a tiny "PLACE"
   * label above the ring.
   */
  function drawArmedExit(
    ctx: CanvasRenderingContext2D,
    slash: PortalSlash,
    pulse: number,
    now: number,
  ) {
    const r = landingRadius();

    ctx.save();

    // Inner soft radial fill
    const grad = ctx.createRadialGradient(slash.p.x, slash.p.y, 0, slash.p.x, slash.p.y, r);
    grad.addColorStop(0, 'rgba(255, 61, 164, 0.18)');
    grad.addColorStop(0.6, 'rgba(255, 61, 164, 0.06)');
    grad.addColorStop(1, 'rgba(61, 240, 255, 0.0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(slash.p.x, slash.p.y, r, 0, Math.PI * 2);
    ctx.fill();

    // Three concentric rings expanding & fading on a 900ms loop. They start
    // OUTSIDE the boundary (r → 2.25r) and fade out — purely ambient telegraph,
    // never readable as the landing zone itself.
    ctx.lineCap = 'round';
    const ringPhase = (now / 900) % 1;
    for (let i = 0; i < 3; i++) {
      const phase = (ringPhase + i / 3) % 1;
      const radius = r * (1.0 + phase * 1.25);
      const alpha = (1 - phase) * 0.32;
      ctx.shadowBlur = 14;
      ctx.shadowColor = '#ff3da4';
      ctx.strokeStyle = rgba('#ff3da4', alpha);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(slash.p.x, slash.p.y, radius, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Solid boundary ring at exactly the landing radius — what you see is what
    // you can hit. Slight breath so it doesn't feel static.
    const boundaryBreath = 0.04 * Math.sin(pulse * Math.PI * 2);
    ctx.shadowBlur = 18;
    ctx.shadowColor = '#ff3da4';
    ctx.strokeStyle = '#ff3da4';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(slash.p.x, slash.p.y, r * (1 + boundaryBreath), 0, Math.PI * 2);
    ctx.stroke();

    // Bright inner stripe on the boundary, hugging the same circle.
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    ctx.arc(slash.p.x, slash.p.y, r * (1 + boundaryBreath), 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();

    // The slash itself with extra glow
    const breath = 0.18 * Math.sin(pulse * Math.PI * 2);
    const liveLen = slash.halfLen * (1 + breath);
    const a = {
      x: slash.p.x + slash.perp.x * liveLen,
      y: slash.p.y + slash.perp.y * liveLen,
    };
    const b = {
      x: slash.p.x - slash.perp.x * liveLen,
      y: slash.p.y - slash.perp.y * liveLen,
    };

    ctx.save();
    ctx.lineCap = 'round';

    ctx.shadowBlur = 36;
    ctx.shadowColor = '#ff3da4';
    ctx.strokeStyle = '#ff3da4';
    ctx.lineWidth = 11;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#0a0708';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();

    ctx.lineWidth = 3;
    ctx.strokeStyle = '#ff3da4';
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#ff3da4';
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(255,255,255,0.95)';
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();

    // "PLACE" hint above the ring
    ctx.fillStyle = 'rgba(255, 245, 224, 0.95)';
    ctx.font = 'bold 9px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowBlur = 6;
    ctx.shadowColor = 'rgba(255, 61, 164, 0.6)';
    ctx.fillText('PLACE', slash.p.x, slash.p.y - r - 12);

    ctx.restore();
  }

  /**
   * Bright comet that glides from IN midpoint to OUT midpoint along the
   * connection arc once during the first ~280ms after capture. Telegraphs
   * the destination so the player knows where to land.
   */
  function drawPortalComet(
    ctx: CanvasRenderingContext2D,
    entry: PortalSlash,
    exit: PortalSlash,
    msSinceCapture: number,
  ) {
    const t = Math.min(1, msSinceCapture / 280);
    if (t <= 0) return;
    const cx = (entry.p.x + exit.p.x) / 2;
    const cy = (entry.p.y + exit.p.y) / 2 - 18;

    const bezier = (tt: number) => {
      const u = 1 - tt;
      return {
        x: u * u * entry.p.x + 2 * u * tt * cx + tt * tt * exit.p.x,
        y: u * u * entry.p.y + 2 * u * tt * cy + tt * tt * exit.p.y,
      };
    };

    ctx.save();
    // Trail (rendered first so the head sits on top)
    const trailCount = 8;
    for (let k = trailCount; k >= 1; k--) {
      const tk = Math.max(0, t - k * 0.04);
      const pos = bezier(tk);
      const a = (1 - k / trailCount) * 0.7 * (1 - t * 0.6);
      ctx.fillStyle = rgba('#ff3da4', a);
      ctx.shadowBlur = 12;
      ctx.shadowColor = '#ff3da4';
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, Math.max(1.2, 3 - k * 0.25), 0, Math.PI * 2);
      ctx.fill();
    }
    // Head
    const head = bezier(t);
    ctx.shadowBlur = 22;
    ctx.shadowColor = '#fff5e0';
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.beginPath();
    ctx.arc(head.x, head.y, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /** Faint cyan/magenta scar shown on a portal pair after a successful landing. */
  function drawPortalScar(
    ctx: CanvasRenderingContext2D,
    slash: PortalSlash,
    color: string,
  ) {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = rgba(color, 0.22);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(slash.a.x, slash.a.y);
    ctx.lineTo(slash.b.x, slash.b.y);
    ctx.stroke();
    ctx.restore();
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
      renderNeon(ctx, tCanvas, guideHex, 4, Math.min(0.85, guideOpacity * 1.6) * 0.9, false);

      // Use the player's actual canvas coordinates so the line shows up exactly
      // where it was drawn — overlay tells the truth about position vs target.
      const playerCanvas = resultPath;
      const isPerfect = resultGrade === 'Perfect';
      const isElite = resultGrade === 'Elite';
      if (isPerfect) {
        // Perfect-grade celebration always uses the rainbow sticker, regardless
        // of the player's selected paint style — it's a reward state.
        drawRainbowStickerPath(ctx, playerCanvas, 9);
      } else {
        const baseColor = isElite ? '#ffe83d' : accentColor;
        renderPaintStroke(ctx, playerCanvas, baseColor, 8, 1, paintStyleId, paintVariant);
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
        // Worst-segment annotation stays neon pink — it's a UI overlay, not paint.
        renderNeon(ctx, slice, '#ff3da4', 12, 1, true);
      }
    } else {
      renderNeon(ctx, tCanvas, guideHex, 5, guideOpacity, false);

      if (pathRef.current.length > 1) {
        const intensity = onTrackRef.current ? 1.18 : 1.0;
        renderPaintStroke(ctx, pathRef.current, accentColor, 9, intensity, paintStyleId, paintVariant);
      }
    }

    // Portals (drawn over everything except the burst)
    if (hasPortals) {
      const now = performance.now();
      const pulse = ((now - portalAnimStartRef.current) / 1400) % 1;
      const slashes = portalSlashes();
      const ps = portalStateRef.current;
      const approach = computeApproachState();
      portalApproachRef.current = approach;
      slashes.forEach((pair, idx) => {
        const used = usedPortalsRef.current.has(idx);
        const isPending = ps.mode === 'pending' && ps.pairIndex === idx;
        const msSinceCapture = isPending && ps.mode === 'pending' ? now - ps.capturedAt : 0;
        const inProximity = approach && approach.pairIndex === idx ? approach.proximity : 0;
        drawPortalPair(
          ctx,
          pair.entry,
          pair.exit,
          used,
          isPending,
          msSinceCapture,
          pulse,
          now,
          inProximity,
        );
      });
      applyApproachTransform(approach, slashes);
    } else {
      applyApproachTransform(null, []);
    }

    if (landingBurstRef.current.length > 0) {
      drawLandingBurst(ctx);
    }

    if (burstParticlesRef.current.length > 0) {
      drawBurst(ctx);
    }

    void accentSoft;
  }

  function drawRainbowStickerPath(
    ctx: CanvasRenderingContext2D,
    pts: Point[],
    coreWidth: number,
  ) {
    if (pts.length < 2) return;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const segments: Point[][] = [];
    let cur: Point[] = [];
    for (let i = 0; i < pts.length; i++) {
      cur.push(pts[i]);
      if (pts[i].teleport) {
        if (cur.length >= 2) segments.push(cur);
        cur = [];
      }
    }
    if (cur.length >= 2) segments.push(cur);
    if (segments.length === 0) return;

    const buildPath = () => {
      ctx.beginPath();
      for (const seg of segments) {
        ctx.moveTo(seg[0].x, seg[0].y);
        for (let i = 1; i < seg.length - 1; i++) {
          const a = seg[i];
          const b = seg[i + 1];
          const mx = (a.x + b.x) / 2;
          const my = (a.y + b.y) / 2;
          ctx.quadraticCurveTo(a.x, a.y, mx, my);
        }
        const last = seg[seg.length - 1];
        ctx.lineTo(last.x, last.y);
      }
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
    const { w, h } = sizeRef.current;
    // getBoundingClientRect reflects CSS transforms (e.g. the portal-approach
    // zoom), so divide by rect dimensions and scale up to canvas coords. When
    // no transform is active rect.width === w, this collapses to the original.
    const sx = rect.width > 0 ? w / rect.width : 1;
    const sy = rect.height > 0 ? h / rect.height : 1;
    return {
      x: (e.clientX - rect.left) * sx,
      y: (e.clientY - rect.top) * sy,
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

  /**
   * Landing-ring radius around an OUT slash midpoint. Tuned so the visual
   * boundary ring (drawn at exactly this radius in drawArmedExit) matches the
   * tappable area — what you see is what you can hit. Pixel floor keeps it
   * usable on small canvases.
   */
  function landingRadius(): number {
    const { w, h } = sizeRef.current;
    const padding = 36;
    const size = Math.min(w, h) - padding * 2;
    return Math.max(36, 0.13 * size);
  }

  /**
   * Approach radius around an IN slash midpoint. Once the stroke head enters
   * this zone, the slash arms (visual brightens, canvas leans in slightly).
   * Generous compared to the slash itself so players get clear lead time.
   */
  function approachRadiusFor(halfLen: number): number {
    return Math.max(70, halfLen * 4);
  }

  /**
   * Find the nearest unused IN slash to the current stroke head and report
   * proximity in [0, 1]. Returns null when no slash is in range, when the
   * player is not currently tracing, or when there are no portals on this
   * level. Drives both the slash arming visual and the canvas zoom transform.
   */
  function computeApproachState(): { pairIndex: number; proximity: number } | null {
    if (!hasPortals) return null;
    if (portalStateRef.current.mode !== 'tracing') return null;
    if (pathRef.current.length === 0) return null;
    const head = pathRef.current[pathRef.current.length - 1];
    const slashes = portalSlashes();
    let best: { pairIndex: number; proximity: number } | null = null;
    for (let i = 0; i < slashes.length; i++) {
      if (usedPortalsRef.current.has(i)) continue;
      const { entry } = slashes[i];
      const dist = Math.hypot(head.x - entry.p.x, head.y - entry.p.y);
      const radius = approachRadiusFor(entry.halfLen);
      if (dist >= radius) continue;
      const proximity = 1 - dist / radius;
      if (!best || proximity > best.proximity) {
        best = { pairIndex: i, proximity };
      }
    }
    return best;
  }

  /**
   * Apply (or release) the subtle canvas zoom-in that helps players fine-tune
   * their aim near a portal. Scaling tops out at 1.12× at full proximity and
   * is centered on the IN slash midpoint so the slash stays put on screen
   * while the rest of the canvas leans in. Pointer math (see localPoint) is
   * scale-aware, so drawing coordinates remain accurate while transformed.
   */
  function applyApproachTransform(
    approach: { pairIndex: number; proximity: number } | null,
    slashes: { entry: PortalSlash; exit: PortalSlash }[],
  ) {
    const c = canvasRef.current;
    if (!c) return;
    if (!c.style.transition) {
      c.style.transition = 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1)';
    }
    if (approach && slashes[approach.pairIndex]) {
      const mid = slashes[approach.pairIndex].entry.p;
      const { w, h } = sizeRef.current;
      if (w > 0 && h > 0) {
        const ox = (mid.x / w) * 100;
        const oy = (mid.y / h) * 100;
        const scale = 1 + 0.12 * approach.proximity;
        c.style.transformOrigin = `${ox}% ${oy}%`;
        c.style.transform = `scale(${scale.toFixed(4)})`;
        return;
      }
    }
    c.style.transform = 'scale(1)';
  }

  /**
   * If the live stroke segment crosses an unused IN slash, transition into the
   * `pending` portal state: mark a teleport break on the last point, freeze
   * subsequent drawing, fire the timer pause, and queue capture + comet
   * animations. Returns true if the portal was triggered.
   */
  function maybeEnterPortal(point: Point): boolean {
    if (portalStateRef.current.mode !== 'tracing') return false;
    if (!hasPortals) return false;
    if (pathRef.current.length === 0) return false;
    const prev = pathRef.current[pathRef.current.length - 1];
    const slashes = portalSlashes();
    for (let i = 0; i < slashes.length; i++) {
      if (usedPortalsRef.current.has(i)) continue;
      const { entry } = slashes[i];
      // Slash only triggers if the stroke head is inside the approach zone —
      // kills accidental long-segment crossings that leap over the slash from
      // far away.
      const distToMid = Math.hypot(point.x - entry.p.x, point.y - entry.p.y);
      if (distToMid >= approachRadiusFor(entry.halfLen)) continue;
      if (segmentsIntersect(prev, point, entry.a, entry.b)) {
        // Auto-extend the player's stroke to the canonical IN point (which is
        // the segment's last target point — the closure of a closed shape, or
        // the endpoint of an open shape). This makes the visual shape fully
        // close instead of leaving a gap where the stroke happened to cross
        // the slash a few pixels short of the curve's actual end.
        pathRef.current.push({
          x: entry.p.x,
          y: entry.p.y,
          t: point.t,
          teleport: true,
        });
        portalStateRef.current = {
          mode: 'pending',
          pairIndex: i,
          capturedAt: performance.now(),
          liftedAt: null,
        };
        sfx.unlock();
        haptics.tap();
        onPortalPause?.();
        return true;
      }
    }
    return false;
  }

  function triggerLandingBurst(
    touchPoint: { x: number; y: number },
    exitMid: { x: number; y: number },
  ) {
    const palette = ['#ff3da4', '#3df0ff', '#ffe83d', '#fff5e0', '#a4ff3d'];
    const now = performance.now();
    const dx = exitMid.x - touchPoint.x;
    const dy = exitMid.y - touchPoint.y;
    const baseAngle = Math.atan2(dy, dx);
    for (let i = 0; i < 24; i++) {
      const angle = baseAngle + (Math.random() - 0.5) * 1.8;
      const speed = 100 + Math.random() * 90;
      landingBurstRef.current.push({
        x: touchPoint.x,
        y: touchPoint.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        startedAt: now,
        hue: palette[i % palette.length],
      });
    }
  }

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!enabled || resultMode) return;

    // If a portal is pending and the player has lifted, this tap is a "place" attempt.
    const ps = portalStateRef.current;
    if (ps.mode === 'pending' && ps.liftedAt != null) {
      const slashes = portalSlashes();
      const pair = slashes[ps.pairIndex];
      if (!pair) {
        // Defensive — shouldn't happen, but recover.
        portalStateRef.current = { mode: 'tracing' };
        return;
      }
      const raw = localPoint(e.nativeEvent);
      const exitMid = pair.exit.p;
      const dist = Math.hypot(raw.x - exitMid.x, raw.y - exitMid.y);
      if (dist <= landingRadius()) {
        // Successful landing.
        e.preventDefault();
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
        drawingRef.current = true;
        usedPortalsRef.current.add(ps.pairIndex);
        portalStateRef.current = { mode: 'tracing' };
        // Anchor the resumed stroke at the canonical OUT midpoint so the line
        // and the target path stay aligned, regardless of where in the ring
        // the player tapped.
        const anchor: Point = { x: exitMid.x, y: exitMid.y, t: performance.now() };
        pathRef.current.push(anchor);
        rawHistoryRef.current = [anchor];
        onTrackRef.current = false;
        triggerLandingBurst(raw, exitMid);
        sfx.unlock();
        haptics.tap();
        onPortalResume?.();
        haptics.start();
        sfx.start();
        redraw();
        return;
      }
      // Outside the ring — soft reject, stay pending.
      sfx.tap();
      return;
    }

    // Fresh stroke start.
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    drawingRef.current = true;
    usedPortalsRef.current = new Set();
    portalStateRef.current = { mode: 'tracing' };
    landingBurstRef.current = [];
    const raw = localPoint(e.nativeEvent);
    rawHistoryRef.current = [raw];
    const { point, onTrack } = transformIncoming(raw);
    onTrackRef.current = onTrack;
    pathRef.current = [point];
    haptics.start();
    sfx.start();
    onStrokeStart?.();
    redraw();
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!enabled || !drawingRef.current || resultMode) return;
    // While a portal is pending, the line is frozen at IN — drop pointermoves.
    if (portalStateRef.current.mode === 'pending') return;
    e.preventDefault();
    const raw = localPoint(e.nativeEvent);
    const lastRaw = rawHistoryRef.current[rawHistoryRef.current.length - 1];
    if (lastRaw && Math.hypot(raw.x - lastRaw.x, raw.y - lastRaw.y) < 1.2) return;
    rawHistoryRef.current.push(raw);
    if (rawHistoryRef.current.length > 4) rawHistoryRef.current.shift();
    const { point, onTrack } = transformIncoming(raw);
    onTrackRef.current = onTrack;
    // If this segment crosses an unused IN slash, latch into pending state
    // and don't append the candidate point — the line stops at the prior point
    // (which is now teleport-marked).
    if (maybeEnterPortal(point)) {
      redraw();
      return;
    }
    pathRef.current.push(point);
    redraw();
  }

  function onPointerEnd(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;

    // Mid-portal lift: the stroke is paused, not finished. Stay in pending,
    // record the lift timestamp, and wait for the next pointerdown.
    const ps = portalStateRef.current;
    if (ps.mode === 'pending') {
      portalStateRef.current = { ...ps, liftedAt: performance.now() };
      drawingRef.current = false;
      onTrackRef.current = false;
      try {
        (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
      } catch {
        /* noop */
      }
      haptics.stop();
      sfx.stop();
      redraw();
      return;
    }

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
    sfx.stop();
    onStrokeEnd?.(finalPath);
  }

  function startBurst() {
    cancelBurst();
    if (!resultPath || resultPath.length < 2) return;
    const playerCanvas = resultPath;
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

  /**
   * Animate the OUT-landing burst: integrates particle positions in-place each
   * frame (driven by the portal RAF) and culls expired ones.
   */
  function drawLandingBurst(ctx: CanvasRenderingContext2D) {
    const now = performance.now();
    const remaining: typeof landingBurstRef.current = [];
    ctx.save();
    for (const p of landingBurstRef.current) {
      const t = (now - p.startedAt) / 480;
      if (t >= 1) continue;
      const u = 1 - t;
      p.x += p.vx * 0.016 * u;
      p.y += p.vy * 0.016 * u;
      p.vx *= 0.92;
      p.vy *= 0.92;
      const alpha = u * 0.95;
      ctx.fillStyle = rgba(p.hue, alpha);
      ctx.shadowBlur = 18;
      ctx.shadowColor = rgba(p.hue, alpha);
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2.2 + u * 1.6, 0, Math.PI * 2);
      ctx.fill();
      remaining.push(p);
    }
    landingBurstRef.current = remaining;
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
