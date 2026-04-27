interface Props {
  variant?: 'card' | 'inline';
}

export default function HowItWorks({ variant = 'card' }: Props) {
  const wrap =
    variant === 'card'
      ? 'card rounded-2xl px-4 py-3'
      : 'rounded-2xl px-4 py-3 bg-black/30 border border-white/10';
  return (
    <div className={wrap}>
      <div className="text-[10px] uppercase tracking-[0.32em] text-white/45">
        How scoring works
      </div>
      <div className="mt-1.5 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-xl bg-ink-cyan/10 border border-ink-cyan/30 px-3 py-2">
          <div className="font-display font-semibold text-ink-cyan text-glow-cyan text-sm">
            Shape · 50%
          </div>
          <div className="text-white/70 leading-snug mt-0.5">
            How closely your line matches the target.
          </div>
        </div>
        <div className="rounded-xl bg-ink-gold/10 border border-ink-gold/30 px-3 py-2">
          <div className="font-display font-semibold text-ink-gold text-glow-gold text-sm">
            Timing · 50%
          </div>
          <div className="text-white/70 leading-snug mt-0.5">
            How close your stop is to the target time.
          </div>
        </div>
      </div>
      <p className="text-[11px] text-white/55 mt-2 leading-snug">
        Both matter equally. A perfect shape with bad timing scores the same as
        perfect timing on a sloppy shape.
      </p>
    </div>
  );
}
