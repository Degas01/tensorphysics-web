import Link from "next/link";

export default function NotFound() {
  return (
    <section className="mx-auto flex min-h-[60vh] max-w-[720px] flex-col items-center justify-center gap-6 px-6 text-center">
      <span className="font-mono text-sm text-breaks">404 · u = ∞</span>
      <h1 className="font-display text-5xl font-bold tracking-tight">This page broke.</h1>
      <p className="text-soft">The link points somewhere that does not exist. Press Ctrl+K to find your way, or go home.</p>
      <Link href="/" className="inline-flex h-12 items-center rounded-[2px] bg-holds px-6 font-semibold text-obsidian">
        Back to home
      </Link>
    </section>
  );
}
