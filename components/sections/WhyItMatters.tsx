import clsx from "clsx";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Frame } from "@/components/ui/Frame";
import { Reveal } from "@/components/motion/Reveal";
import { MagneticButton } from "@/components/hero/MagneticButton";

const cards: { v: string; k: string; tone: "holds" | "breaks" | "line" }[] = [
  { v: "7 of 7", k: "Panda joints where the lightest paper fit fails once errors stack.", tone: "breaks" },
  { v: "0.36 kg → 2.6 kg", k: "Go2 thigh actuator, damping 0 vs 2. No public measured value exists.", tone: "line" },
  { v: "0.000%", k: "Torque difference between our inverse dynamics and Pinocchio RNEA on all 4 robots.", tone: "holds" },
];

export function WhyItMatters() {
  return (
    <section id="why" aria-labelledby="why-h" className="scroll-mt-24 mx-auto flex max-w-[1240px] flex-col gap-10 px-6 py-20 sm:px-8">
      <SectionHeading
        id="why-h"
        eyebrow="Why it matters"
        title="Most actuator choices are made on numbers that were never measured on the robot."
        lead="Datasheets give you the clean model. Friction, damping, armature and heat are often guessed. Our checks show how far one guess can move the answer."
      />

      <dl className="grid gap-6 md:grid-cols-3">
        {cards.map((c, i) => (
          <Reveal key={c.v} delay={i * 0.08}>
            <Frame tone={c.tone} className="flex h-full flex-col-reverse gap-3 p-6">
              <dt className="text-[14px] leading-snug text-soft">{c.k}</dt>
              <dd
                className={clsx(
                  "font-display text-[clamp(28px,3vw,38px)] font-bold tracking-tight tabular-nums",
                  c.tone === "holds" && "text-holds",
                  c.tone === "breaks" && "text-breaks",
                )}
              >
                {c.v}
              </dd>
            </Frame>
          </Reveal>
        ))}
      </dl>

      <p className="max-w-[760px] text-[15px] leading-relaxed text-mute">
        {"Independent work reports that actuator characteristics have a considerable influence on sim-to-real transfer for legged robots. "}
        <a
          href="https://arxiv.org/abs/2204.03897"
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-xs text-soft underline underline-offset-4 hover:text-fg"
        >
          arXiv 2204.03897
        </a>
      </p>

      <div className="flex flex-col gap-4 border-t border-line pt-8 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-[640px] font-display text-[20px] font-semibold leading-snug">
          {"Send us your robot file. We'll tell you which numbers to measure before you buy actuators."}
        </p>
        <MagneticButton href="/actuatorfit#beta">Test your URDF / MJCF</MagneticButton>
      </div>

      <p className="font-mono text-[11px] leading-relaxed text-dim">
        {"All results are from simulation on public robot models. They don't come from hardware tests. Bench data is next."}
      </p>
    </section>
  );
}
