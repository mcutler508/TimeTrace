import HowItWorks from './HowItWorks';

interface Props {
  show: boolean;
  targetTime: number;
  variant?: 'pill' | 'intro';
  onDismiss?: () => void;
}

export default function TutorialHint({ show, targetTime, variant = 'pill', onDismiss }: Props) {
  if (!show) return null;

  if (variant === 'intro') {
    return (
      <div className="absolute inset-0 z-10 flex items-center justify-center p-5 animate-fadeIn">
        <div className="absolute inset-0 bg-bg-deep/80 backdrop-blur-sm" />
        <div className="relative card rounded-2xl px-5 py-5 max-w-[18rem] flex flex-col gap-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.4em] text-ink-cyan/85 text-glow-cyan">
              Tutorial
            </div>
            <h2 className="font-display text-xl font-bold leading-tight mt-1">
              Trace a circle. Stop at {targetTime.toFixed(2)}s.
            </h2>
          </div>
          <HowItWorks variant="inline" />
          <button
            onClick={onDismiss}
            className="btn-3d py-3 text-sm uppercase tracking-[0.3em] bg-gradient-to-b from-ink-cyan/95 to-cyan-500/80 text-bg-deep"
          >
            Got it
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pointer-events-none absolute inset-x-0 top-2 flex flex-col items-center gap-1 animate-fadeIn">
      <div className="px-3 py-1 rounded-full text-xs font-medium tracking-wide text-ink-cyan bg-black/40 border border-ink-cyan/30">
        Trace the shape
      </div>
      <div className="px-3 py-1 rounded-full text-xs font-medium tracking-wide text-ink-gold bg-black/40 border border-ink-gold/30">
        Stop at {targetTime.toFixed(2)}s
      </div>
      <div className="px-3 py-1 rounded-full text-[10px] font-medium tracking-wide text-white/75 bg-black/40 border border-white/15">
        Shape & timing weighted equally
      </div>
    </div>
  );
}
