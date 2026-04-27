interface Props {
  variant?: 'card' | 'inline';
}

export default function HowItWorks({ variant = 'card' }: Props) {
  const wrap =
    variant === 'card'
      ? 'card-sticker px-4 py-3 -rotate-[0.5deg]'
      : 'rounded-2xl px-4 py-3 bg-black/45 border-2 border-black';
  return (
    <div className={wrap}>
      <div className="text-poster text-[10px] tracking-[0.3em] text-splat-yellow">
        HOW SCORING WORKS
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-xl bg-splat-cyan/15 border-2 border-black px-3 py-2">
          <div className="text-poster text-splat-cyan text-glow-cyan text-sm leading-none">
            Shape · 50%
          </div>
          <div className="text-splat-paper/85 leading-snug mt-1">
            How close your line matches the target.
          </div>
        </div>
        <div className="rounded-xl bg-splat-yellow/20 border-2 border-black px-3 py-2">
          <div className="text-poster text-splat-yellow text-glow-gold text-sm leading-none">
            Timing · 50%
          </div>
          <div className="text-splat-paper/85 leading-snug mt-1">
            How close your stop is to the target time.
          </div>
        </div>
      </div>
      <p className="text-[11px] text-splat-paper/65 mt-2 leading-snug">
        Both matter equally. Sloppy shape, perfect time = same score as clean shape, late stop.
      </p>
    </div>
  );
}
