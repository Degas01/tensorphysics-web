import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { modules } from "@/lib/engine";
import { Chip } from "@/components/ui/Chip";
import { GlowCard } from "@/components/ui/GlowCard";
import { ScrambleText } from "@/components/hero/ScrambleText";
import { Blueprint } from "@/components/architecture/Blueprint";

export const metadata: Metadata = {
  title: "Engine",
  description: "One engine, four moves: Simulate, Break, Prove, Improve.",
};

const tone = { working: "holds", "not-passed": "breaks", planned: "mute" } as const;

export default function EnginePage() {
  return (
    <>
      <section className="mx-auto max-w-[1240px] px-6 pb-10 pt-14 sm:px-8 lg:pt-20">
        <nav aria-label="Breadcrumb" className="mb-8 font-mono text-xs text-mute">
          <Link href="/" className="hover:text-holds">home</Link> / <span className="text-holds">engine</span>
        </nav>
        <span className="eyebrow !text-holds">The engine</span>
        <ScrambleText
          className="mt-4 max-w-[900px] font-display text-[clamp(38px,5.2vw,68px)] font-bold leading-[1] tracking-[-0.03em]"
          segments={[{ text: "One engine. Every product asks it a different question." }]}
        />
        <p className="mt-6 max-w-[720px] text-lg leading-relaxed text-soft">
          Every study runs the same loop: simulate the task, attack the model, test it against reality, then improve the design
          against the worst case. Products choose which parts to expose and how to report them.
        </p>
      </section>

      <section className="mx-auto grid max-w-[1240px] gap-4 px-6 pb-6 sm:px-8 md:grid-cols-2">
        {modules.map((m) => (
          <GlowCard key={m.key} className="p-7">
            <Link href={`/engine/${m.key}`} className="group flex h-full flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-holds">{m.num}</span>
                <ArrowUpRight className="size-5 text-mute transition-transform group-hover:rotate-45 group-hover:text-holds" aria-hidden="true" />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-display text-3xl font-semibold">{m.name}</span>
                <Chip tone={tone[m.status]}>{m.statusLabel}</Chip>
              </div>
              <p className="text-[15px] leading-relaxed text-soft">{m.short}</p>
              <span className="mt-auto font-mono text-[11px] text-dim">{m.code}</span>
            </Link>
          </GlowCard>
        ))}
      </section>

      <Blueprint />
    </>
  );
}
