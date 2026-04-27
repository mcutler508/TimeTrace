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
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-5 animate-fadeIn overflow-y-auto"
        onClick={onDismiss}
      >
        <div className="fixed inset-0 bg-bg-deep/90 backdrop-blur-sm" />
        <div
          className="relative card-sticker px-5 py-5 w-full max-w-[20rem] max-h-[90vh] overflow-y-auto flex flex-col gap-4 -rotate-1 my-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div>
            <div className="text-poster text-[10px] tracking-[0.32em] text-splat-yellow">
              TUTORIAL
            </div>
            <h2 className="text-poster text-xl leading-tight mt-1 text-splat-paper text-sticker">
              Trace a circle.<br />Stop at {targetTime.toFixed(2)}s.
            </h2>
          </div>
          <HowItWorks variant="inline" />
          <button
            onClick={onDismiss}
            className="btn-sticker py-3 text-poster text-sm tracking-[0.18em] bg-splat-yellow text-splat-black"
          >
            GOT IT
          </button>
          <button
            onClick={onDismiss}
            className="text-[10px] uppercase tracking-[0.32em] text-splat-paper/45 mt-1"
          >
            tap outside to dismiss
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pointer-events-none absolute inset-x-0 top-3 flex flex-col items-center gap-1.5 animate-fadeIn">
      <div className="px-3 py-1 rounded-full text-[10px] font-poster tracking-[0.18em] bg-splat-cyan text-splat-black border-2 border-black -rotate-2 shadow-[3px_3px_0_0_#0a0708]">
        TRACE THE SHAPE
      </div>
      <div className="px-3 py-1 rounded-full text-[10px] font-poster tracking-[0.18em] bg-splat-yellow text-splat-black border-2 border-black rotate-2 shadow-[3px_3px_0_0_#0a0708]">
        STOP AT {targetTime.toFixed(2)}s
      </div>
      <div className="px-3 py-1 rounded-full text-[10px] font-poster tracking-[0.18em] bg-splat-pink text-splat-paper border-2 border-black -rotate-1 shadow-[3px_3px_0_0_#0a0708]">
        SHAPE & TIMING · EQUAL WEIGHT
      </div>
    </div>
  );
}
