/** Fixed backdrop: a faint engineering grid that fades out toward the edges. Nothing animated. */
export function Background() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="grid-bg absolute inset-0 [mask-image:radial-gradient(ellipse_80%_60%_at_50%_0%,black_20%,transparent_70%)]" />
      <div className="absolute inset-x-0 top-0 h-px bg-white/[0.06]" />
    </div>
  );
}
