interface Props {
  show: boolean;
  targetTime: number;
}

export default function TutorialHint({ show, targetTime }: Props) {
  if (!show) return null;
  return (
    <div className="pointer-events-none absolute inset-x-0 top-2 flex flex-col items-center gap-1 animate-fadeIn">
      <div className="px-3 py-1 rounded-full text-xs font-medium tracking-wide text-ink-cyan bg-black/40 border border-ink-cyan/30">
        Trace the shape
      </div>
      <div className="px-3 py-1 rounded-full text-xs font-medium tracking-wide text-ink-gold bg-black/40 border border-ink-gold/30">
        Stop at {targetTime.toFixed(2)}s
      </div>
    </div>
  );
}
