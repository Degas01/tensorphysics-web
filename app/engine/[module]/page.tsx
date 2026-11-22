import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { moduleByKey, modules } from "@/lib/engine";
import { Chip } from "@/components/ui/Chip";
import { ScrambleText } from "@/components/hero/ScrambleText";
import { TimestepCard } from "@/components/bento/TimestepCard";
import { BreakCard } from "@/components/bento/BreakCard";
import { ProveCard } from "@/components/bento/ProveCard";
import { CTA } from "@/components/sections/CTA";

export function generateStaticParams() {
  return modules.map((m) => ({ module: m.key }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ module: string }> }): Promise<Metadata> {
  const { module } = await params;
  const m = moduleByKey(module);
  return m ? { title: `${m.name} · Engine`, description: m.short } : {};
}

const tone = { working: "holds", "not-passed": "breaks", planned: "mute" } as const;

export default async function ModulePage({ params }: { params: Promise<{ module: string }> }) {
  const { module } = await params;
  const m = moduleByKey(module);
  if (!m) notFound();
  const i = modules.indexOf(m);
  const prev = modules[(i + modules.length - 1) % modules.length];
  const next = modules[(i + 1) % modules.length];

  const Demo = m.key === "simulate" ? TimestepCard : m.key === "break" ? BreakCard : m.key === "prove" ? ProveCard : null;

  return (
    <>
      <section className="mx-auto max-w-[1240px] px-6 pb-10 pt-14 sm:px-8 lg:pt-20">
        <nav aria-label="Breadcrumb" className="mb-8 font-mono text-xs text-mute">
          <Link href="/" className="hover:text-holds">home</Link> / <Link href="/engine" className="hover:text-holds">engine</Link> /{" "}
          <span className="text-holds">{m.key}</span>
        </nav>

        <div role="tablist" aria-label="Engine modules" className="mb-12 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {modules.map((x) => (
            <Link
              key={x.key}
              href={`/engine/${x.key}`}
              role="tab"
              aria-selected={x.key === m.key}
              className={
                x.key === m.key
                  ? "flex min-h-16 flex-col justify-center rounded-xl border border-holds bg-holds px-4 py-3 text-obsidian"
                  : "glass flex min-h-16 flex-col justify-center rounded-xl px-4 py-3 text-fg transition-colors hover:border-holds/60"
              }
            >
              <span className="font-mono text-[11px] opacity-80">{x.num}</span>
              <span className="font-display text-lg font-semibold">{x.name}</span>
            </Link>
          ))}
        </div>

        <div className="grid gap-12 lg:grid-cols-[1.1fr_1fr]">
          <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center gap-3">
              <Chip tone={tone[m.status]}>{m.statusLabel}</Chip>
              <span className="font-mono text-xs text-dim">{m.code}</span>
            </div>
            <ScrambleText className="font-display text-[clamp(44px,6vw,80px)] font-bold leading-none tracking-[-0.03em]" segments={[{ text: m.name }]} />
            <p className="text-lg leading-relaxed text-soft">{m.long}</p>
            <div className="rounded-2xl border border-line bg-black/30 p-5">
              <span className="eyebrow !text-[11px]">Where it really stands</span>
              <p className="mt-2 text-[15px] leading-relaxed text-soft">{m.honest}</p>
            </div>
            <div className="flex flex-col gap-2">
              <span className="eyebrow !text-[11px]">Next</span>
              <ul className="flex flex-wrap gap-2">
                {m.next.map((n) => (
                  <li key={n} className="rounded-lg border border-line px-3 py-1.5 text-sm text-soft">
                    {n}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <span className="eyebrow !text-[11px]">In → out</span>
            {m.io.map((r) => (
              <div key={r.in} className="grid grid-cols-[1fr_36px_1fr] items-center gap-2">
                <div className="glass rounded-xl p-4 text-sm">{r.in}</div>
                <svg viewBox="0 0 36 8" className="w-full" aria-hidden="true">
                  <path d="M0 4 H36" stroke="#5cf2c1" strokeWidth="2" strokeDasharray="4 6" className="animate-dash" />
                </svg>
                <div className="rounded-xl border border-holds/30 bg-holds/[0.05] p-4 text-sm">{r.out}</div>
              </div>
            ))}
            {Demo && (
              <div className="mt-4">
                <Demo />
              </div>
            )}
          </div>
        </div>

        <div className="mt-16 flex flex-wrap justify-between gap-4 border-t border-line pt-6">
          <Link href={`/engine/${prev.key}`} className="flex min-h-11 items-center gap-2 text-sm text-mute hover:text-holds">
            <ArrowLeft className="size-4" aria-hidden="true" /> {prev.name}
          </Link>
          <Link href={`/engine/${next.key}`} className="flex min-h-11 items-center gap-2 text-sm text-mute hover:text-holds">
            {next.name} <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </section>
      <CTA />
    </>
  );
}
