import { useEffect, useMemo, useRef, useState } from 'react';
import {
  PAINT_PALETTE,
  PAINT_STYLES,
  defaultVariantFor,
  renderPaintStroke,
  resolvePaintColor,
  samplePreviewPath,
  type PaintStyleId,
} from '../game/paintStyles';
import { haptics } from '../game/haptics';
import { sfx } from '../game/audio';

interface Props {
  selectedId: PaintStyleId;
  paintColorByStyle: Record<string, string>;
  paintVariantByStyle: Record<string, string>;
  onSelect: (id: PaintStyleId) => void;
  onSelectColor: (id: PaintStyleId, colorId: string) => void;
  onSelectVariant: (id: PaintStyleId, variantId: string) => void;
  forceOpen?: boolean;
  className?: string;
}

const SWATCH_W = 132;
const SWATCH_H = 56;
const TRAY_PREVIEW_W = 132;
const TRAY_PREVIEW_H = 36;

/** Neutral fallback used when the user has selected the 'Chapter' (accent) swatch
 *  in the picker — mimics what the line will look like in Chapter 1. */
const PREVIEW_ACCENT = '#3df0ff';

export default function PaintStylePicker({
  selectedId,
  paintColorByStyle,
  paintVariantByStyle,
  onSelect,
  onSelectColor,
  onSelectVariant,
  forceOpen = false,
  className,
}: Props) {
  const selectedMeta = useMemo(
    () => PAINT_STYLES.find((s) => s.id === selectedId) ?? PAINT_STYLES[0],
    [selectedId],
  );
  const selectedColorId = paintColorByStyle[selectedId] ?? 'accent';
  const selectedVariantId =
    paintVariantByStyle[selectedId] ?? defaultVariantFor(selectedId);

  const allowColorChange = !selectedMeta.noColorCustomization;
  const showVariants = (selectedMeta.variants?.length ?? 0) > 1;
  const [open, setOpen] = useState(false);
  const isOpen = forceOpen || open;

  const previewColor = resolvePaintColor(selectedColorId, PREVIEW_ACCENT);

  return (
    <section
      aria-labelledby="paint-style-heading"
      className={[
        'card-sticker-paper px-4 py-3 rotate-[0.4deg] flex flex-col gap-3',
        className ?? '',
      ].join(' ')}
    >
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls="paint-panel-body"
        onClick={() => {
          if (forceOpen) return;
          haptics.tap();
          sfx.tap();
          setOpen((v) => !v);
        }}
        className="flex items-center gap-3 -mx-1 px-1 py-1 active:translate-y-[1px] transition-transform"
      >
        <h2
          id="paint-style-heading"
          className="text-poster text-[11px] tracking-[0.28em] text-splat-pink"
        >
          PAINT
        </h2>
        <span className="ml-auto text-[10px] uppercase tracking-[0.22em] text-splat-black/55">
          {selectedMeta.label}
        </span>
        <span
          className={`text-splat-pink text-[12px] font-bold transition-transform ${
            forceOpen ? 'hidden' : ''
          } ${
            isOpen ? 'rotate-180' : ''
          }`}
          aria-hidden
        >
          ▾
        </span>
      </button>

      {isOpen && (
        <div id="paint-panel-body" className="flex flex-col gap-3 animate-fadeIn">
          <div className="flex items-baseline justify-between">
            <span className="text-[10px] uppercase tracking-[0.22em] text-splat-violet font-bold">
              Pick · Tint · Pattern
            </span>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 snap-x scroll-hide-x edge-fade-x">
            {PAINT_STYLES.map((style) => {
              const active = style.id === selectedId;
              const locked = !style.unlocked;
              const colorId = paintColorByStyle[style.id] ?? 'accent';
          const variantId = paintVariantByStyle[style.id] ?? defaultVariantFor(style.id);
          const previewColor = resolvePaintColor(colorId, PREVIEW_ACCENT);
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
              <Swatch
                styleId={style.id}
                color={previewColor}
                variant={variantId}
                width={SWATCH_W}
                height={SWATCH_H}
              />
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

          <p className="text-[10px] text-splat-black/65">{selectedMeta.blurb}</p>

          {allowColorChange && (
            <ColorRow
              selectedColorId={selectedColorId}
              onSelect={(colorId) => {
                haptics.tap();
                sfx.tap();
                onSelectColor(selectedId, colorId);
              }}
              previewStyleId={selectedId}
              previewVariant={selectedVariantId}
            />
          )}
          {showVariants && (
            <VariantRow
              selectedStyleId={selectedId}
              selectedVariantId={selectedVariantId}
              previewColor={previewColor}
              onSelect={(variantId) => {
                haptics.tap();
                sfx.tap();
                onSelectVariant(selectedId, variantId);
              }}
            />
          )}
        </div>
      )}
    </section>
  );
}

function ColorRow({
  selectedColorId,
  onSelect,
  previewStyleId,
  previewVariant,
}: {
  selectedColorId: string;
  onSelect: (colorId: string) => void;
  previewStyleId: PaintStyleId;
  previewVariant: string | undefined;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="text-[9px] uppercase tracking-[0.24em] text-splat-pink font-bold">
        Color
      </div>
      <div className="flex gap-1.5 flex-wrap">
        {PAINT_PALETTE.map((swatch) => {
          const active = swatch.id === selectedColorId;
          const dotColor = swatch.hex ?? 'conic-gradient(from 180deg, #3df0ff, #ff3da4, #ffe83d, #a4ff3d, #a44dff, #3df0ff)';
          return (
            <button
              key={swatch.id}
              type="button"
              aria-pressed={active}
              onClick={() => onSelect(swatch.id)}
              title={swatch.label}
              className={[
                'w-7 h-7 rounded-full border-2 transition-transform shrink-0',
                active
                  ? 'border-splat-black scale-110 shadow-sticker-pink'
                  : 'border-splat-black/30 hover:border-splat-black/70',
              ].join(' ')}
              style={{
                background: swatch.hex ?? dotColor,
              }}
            />
          );
        })}
      </div>
      <div className="hidden">
        {/* Preview hook so the strip rerenders when style/variant changes — keeps
            color row in sync visually. The actual preview lives in the chip
            strip above; this is intentionally invisible. */}
        <Swatch
          styleId={previewStyleId}
          color={resolvePaintColor(selectedColorId, PREVIEW_ACCENT)}
          variant={previewVariant}
          width={TRAY_PREVIEW_W}
          height={TRAY_PREVIEW_H}
        />
      </div>
    </div>
  );
}

function VariantRow({
  selectedStyleId,
  selectedVariantId,
  previewColor,
  onSelect,
}: {
  selectedStyleId: PaintStyleId;
  selectedVariantId: string | undefined;
  previewColor: string;
  onSelect: (variantId: string) => void;
}) {
  const meta = PAINT_STYLES.find((s) => s.id === selectedStyleId);
  const variants = meta?.variants ?? [];
  return (
    <div className="flex flex-col gap-1.5">
      <div className="text-[9px] uppercase tracking-[0.24em] text-splat-pink font-bold">
        Pattern
      </div>
      <div className="flex gap-1.5 flex-wrap">
        {variants.map((v) => {
          const active = v.id === selectedVariantId;
          return (
            <button
              key={v.id}
              type="button"
              aria-pressed={active}
              onClick={() => onSelect(v.id)}
              className={[
                'flex flex-col items-stretch gap-1 rounded-md px-1.5 py-1.5 border-2 transition-transform shrink-0',
                active
                  ? 'bg-splat-black border-splat-yellow scale-[1.02]'
                  : 'bg-splat-black/85 border-splat-black/30 hover:border-splat-pink/70',
              ].join(' ')}
            >
              <Swatch
                styleId={selectedStyleId}
                color={previewColor}
                variant={v.id}
                width={84}
                height={32}
              />
              <span
                className={`text-poster text-[9px] tracking-[0.18em] text-center ${
                  active ? 'text-splat-yellow' : 'text-splat-paper'
                }`}
              >
                {v.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Swatch({
  styleId,
  color,
  variant,
  width,
  height,
}: {
  styleId: PaintStyleId;
  color: string;
  variant: string | undefined;
  width: number;
  height: number;
}) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const pts = samplePreviewPath(width, height);
    const coreWidth = Math.max(4, Math.min(8, height * 0.16));
    renderPaintStroke(ctx, pts, color, coreWidth, 1, styleId, variant);
  }, [styleId, color, variant, width, height]);

  return (
    <canvas
      ref={ref}
      width={width}
      height={height}
      style={{
        width,
        height,
        borderRadius: 4,
        background:
          'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0) 100%), #100c1a',
      }}
    />
  );
}
