import { Hero } from "@/components/hero/Hero";
import { ProofStrip } from "@/components/sections/ProofStrip";
import { ActuatorFitShowcase } from "@/components/showcase/ActuatorFitShowcase";
import { PhysicsFuzzShowcase } from "@/components/showcase/PhysicsFuzzShowcase";
import { GapCheckShowcase } from "@/components/showcase/GapCheckShowcase";
import { GapMarginSandbox } from "@/components/sandbox/GapMarginSandbox";
import { Blueprint } from "@/components/architecture/Blueprint";
import { EvidenceList } from "@/components/sections/EvidenceList";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { CTA } from "@/components/sections/CTA";

export default function Home() {
  return (
    <>
      <Hero />
      <ProofStrip />
      <div id="products">
        <ActuatorFitShowcase />
        <PhysicsFuzzShowcase />
        <GapCheckShowcase />
      </div>
      <GapMarginSandbox />
      <Blueprint />
      <section id="evidence" aria-labelledby="evidence-h" className="scroll-mt-24 mx-auto grid max-w-[1240px] gap-10 px-6 py-20 sm:px-8 lg:grid-cols-[0.9fr_1.1fr]">
        <SectionHeading
          id="evidence-h"
          eyebrow="Evidence"
          title="We publish our failures."
          lead={
            <>
              Every test has its pass and fail lines fixed before it runs. Every claim carries a label:{" "}
              <b className="text-holds">VERIFIED</b>, <b className="text-fg">REPORTED</b> or <b className="text-breaks">INFERENCE</b>. If it failed, it
              says failed.
            </>
          }
        />
        <EvidenceList compact />
      </section>
      <CTA />
    </>
  );
}
