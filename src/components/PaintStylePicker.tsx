import { useEffect, useRef } from 'react';
import {
  PAINT_STYLES,
  renderPaintStroke,
  samplePreviewPath,
  type PaintStyleId,
} from '../game/paintStyles';
import { haptics } from '../game/haptics';
import { sfx } from '../game/audio';

interface Props {
  selectedId: PaintStyleId;
  onSelect: (id: PaintStyleId) => void;
  /** Hex color used to tint the preview swatches — defaults to a neutral cyan. */
  previewColor?: string;
}

const SWATCH_W = 132;
const SWATCH_H = 56;

export default function PaintStylePicker({
  selectedId,
  onSelect,
  previewColor = '#3df0ff',
}: Props) {
  return (
    <section
      aria-labelledby="paint-style-heading"
      className="card-sticker-paper px-4 py-4 rotate-[0.4deg]"
    >
      <header className="flex items-baseline justify-between mb-3">
        <h2
          id="paint-style-heading"
          className="text-poster text-[11px] tracking-[0.28em] text-splat-pink"
        >
          PAINT
        </h2>
        <span className="text-[10px] uppercase tracking-[0.22em] text-splat-black/60">
          Pick your line
        </span>
      </header>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 snap-x scroll-hide-x edge-fade-x">
        {PAINT_STYLES.map((style) => {
          const active = style.id === selectedId;
          const locked = !style.unlocked;
          return (
            <button
              key={style.id}
              type="button"
              disabled={locked}
              aria-pressed={active}
              onClick={() => {
                if (locked) return;
                if (style.id === selectedId) return;
                haptics.tap();
                sfx.tap();
                onSelect(style.id);
              }}
              className={[
                'snap-start shrink-0 flex flex-col items-stretch gap-1.5 rounded-md px-2 py-2 transition-transform',
                'border-2',
                active
                  ? 'bg-splat-black border-splat-yellow scale-[1.02]'
                  : 'bg-splat-black/85 border-splat-black/40 hover:border-splat-pink/70',
                locked ? 'opacity-40 cursor-not-allowed' : 'active:translate-y-[1px]',
              ].join(' ')}
              title={style.blurb}
            >
              <Swatch styleId={style.id} color={previewColor} />
              <div className="flex items-baseline justify-between gap-1">
                <span
                  className={`text-poster text-[10px] tracking-[0.18em] ${
                    active ? 'text-splat-yellow' : 'text-splat-paper'
                  }`}
                >
                  {style.label}
                </span>
                {locked && (
                  <span className="text-[8px] uppercase tracking-[0.2em] text-splat-paper/60">
                    Locked
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <p className="text-[10px] text-splat-black/65 mt-2">
        {PAINT_STYLES.find((s) => s.id === selectedId)?.blurb ?? ''}
      </p>
    </section>
  );
}

function Swatch({ styleId, color }: { styleId: PaintStyleId; color: string }) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = SWATCH_W * dpr;
    canvas.height = SWATCH_H * dpr;
    canvas.style.width = `${SWATCH_W}px`;
    canvas.style.height = `${SWATCH_H}px`;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, SWATCH_W, SWATCH_H);

    const pts = samplePreviewPath(SWATCH_W, SWATCH_H);
    renderPaintStroke(ctx, pts, color, 7, 1, styleId);
  }, [styleId, color]);

  return (
    <canvas
      ref={ref}
      width={SWATCH_W}
      height={SWATCH_H}
      style={{
        width: SWATCH_W,
        height: SWATCH_H,
        borderRadius: 4,
        background:
          'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0) 100%), #100c1a',
      }}
    />
  );
}
