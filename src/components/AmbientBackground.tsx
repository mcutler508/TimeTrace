export default function AmbientBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      <div className="absolute inset-0 ambient-grid opacity-[0.07]" />
      <div className="absolute inset-0 ambient-grain opacity-[0.06]" />
      <div className="ambient-blob ambient-blob-cyan" />
      <div className="ambient-blob ambient-blob-violet" />
      <div className="ambient-blob ambient-blob-rose" />
      <div className="absolute inset-0 ambient-vignette" />
    </div>
  );
}
