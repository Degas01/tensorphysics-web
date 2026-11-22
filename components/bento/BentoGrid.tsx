import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { GlowCard } from "@/components/ui/GlowCard";
import { ActuatorFitCard } from "./ActuatorFitCard";
import { TimestepCard } from "./TimestepCard";
import { TerminalCard } from "./TerminalCard";
import { BreakCard } from "./BreakCard";
import { ProveCard } from "./ProveCard";

export function BentoGrid() {
  return (
    <section id="products" aria-labelledby="products-h" className="mx-auto max-w-[1240px] px-6 py-20 sm:px-8">
      <SectionHeading
        id="products-h"
        eyebrow="Products and engine"
        title="Every card is a playground."
        lead="Touch the technology. Drag, click and break things. Each card opens a deeper page."
      />
      <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-6 lg:auto-rows-[minmax(220px,auto)]">
        <div className="md:col-span-2 lg:col-span-4 lg:row-span-2">
          <ActuatorFitCard />
        </div>
        <div className="lg:col-span-2 lg:row-span-2">
          <TimestepCard />
        </div>
        <div className="lg:col-span-3 lg:row-span-2">
          <BreakCard />
        </div>
        <div className="lg:col-span-3 lg:row-span-2">
          <TerminalCard />
        </div>
        <div className="md:col-span-2 lg:col-span-4">
          <ProveCard />
        </div>
        <div className="md:col-span-2 lg:col-span-2">
          <GlowCard className="h-full p-6">
            <Link href="/evidence" className="group flex h-full flex-col justify-between gap-6">
              <div className="flex flex-col gap-2">
                <span className="eyebrow !text-[11px]">Evidence</span>
                <span className="font-display text-2xl font-semibold tracking-tight">We publish our failures.</span>
                <span className="text-sm leading-relaxed text-soft">
                  Pass and fail lines fixed before every test. Every claim labelled VERIFIED, REPORTED or INFERENCE.
                </span>
              </div>
              <span className="flex items-center gap-2 text-sm font-medium text-holds">
                See every result <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </span>
            </Link>
          </GlowCard>
        </div>
      </div>
    </section>
  );
}
