import type { Metadata } from "next";
import Link from "next/link";
import { panda } from "@/lib/data/panda";
import { Chip } from "@/components/ui/Chip";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { JointTable } from "@/components/actuatorfit/JointTable";
import { BetaForm } from "@/components/actuatorfit/BetaForm";
import { ScrambleText } from "@/components/hero/ScrambleText";

export const metadata: Metadata = {
  title: "ActuatorFit",
  description: "Task-driven actuator sizing for robots, with a Gap Margin: how wrong the model and the datasheet can be before each actuator stops being enough.",
};

const steps = [
  { n: "01", t: "Upload", d: "MJCF or URDF, or start from a reference robot." },
  { n: "02", t: "Define tasks", d: "Waypoints, payloads, hold times. The robot tracks them in MuJoCo." },
  { n: "03", t: "Get a report", d: "Fits per joint, Gap Margin, and what to bench-test first." },
];

const how = [
  "Runs each task in MuJoCo and logs torque, speed and power on every joint.",
  `Checks every actuator in a table of ${panda.meta.actuators} built from public datasheets, each row linked to its source.`,
  "Lists the fits per joint, lightest first, and flags joints where nothing fits.",
  "Sweeps 8 modelling errors one at a time, then all together, and runs an adversarial search for anything worse.",
  "Recommends the lightest actuator that still fits with every error at the top of its plausible range.",
];

const limits = [
  "Actuator self-weight is not fed back into the links yet.",
  "Torque-speed is a straight line plus the rated point; no thermal time model (RMS only).",
  "No gearbox backlash or compliance.",
  "Datasheet values are vendor claims; plausible error ranges are assumptions until GapCheck measures them.",
  "Arms today. Quadrupeds and humanoids are next.",
];

export default function ActuatorFitPage() {
  return (
    <>
      <section className="mx-auto max-w-[1240px] px-6 pb-12 pt-14 sm:px-8 lg:pt-20">
        <nav aria-label="Breadcrumb" className="mb-8 font-mono text-xs text-mute">
          <Link href="/" className="hover:text-holds">home</Link> / <span className="text-holds">actuatorfit</span>
        </nav>
        <div className="grid items-end gap-10 lg:grid-cols-[1.2fr_1fr]">
          <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center gap-2">
              <Chip tone="solid">beta open</Chip>
              <span className="font-mono text-xs text-mute">v0.1 · arms today, legged robots next</span>
            </div>
            <ScrambleText
              className="font-display text-[clamp(40px,5.8vw,76px)] font-bold leading-[0.98] tracking-[-0.03em]"
              segments={[{ text: "Actuators that still fit when the model is " }, { text: "wrong.", className: "text-breaks" }]}
            />
            <p className="max-w-[600px] text-lg leading-relaxed text-soft">
              Give ActuatorFit your robot and the tasks it must do. It finds the actuators that fit every joint, then measures how far
              friction, inertia, payload, voltage and heat can drift before each one stops being enough.
            </p>
            <div className="flex flex-wrap gap-3">
              <a href="#beta" className="inline-flex h-12 items-center rounded-[2px] bg-holds px-6 font-semibold text-obsidian hover:bg-[#5cf0ff]">
                Join the beta
              </a>
              <Link href="/#sandbox" className="glass inline-flex h-12 items-center rounded-[2px] px-6 font-medium hover:border-white/25">
                Try the sandbox
              </Link>
            </div>
          </div>
          <ol className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            {steps.map((s) => (
              <li key={s.n} className="glass flex flex-col gap-2 rounded-[2px] p-5">
                <span className="font-mono text-xs text-holds">{s.n}</span>
                <span className="font-semibold">{s.t}</span>
                <span className="text-[13px] leading-relaxed text-mute">{s.d}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-[1240px] px-6 py-12 sm:px-8">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <SectionHeading
            eyebrow={`Real study · Franka Panda · 3 tasks · ${panda.meta.actuators} actuators`}
            title="The lightest fit failed on all 7 joints."
            lead="On every joint, the lightest actuator that fits on paper went over its limit once all eight modelling errors sat at the top of their plausible range together. Open a joint to see why."
          />
          <Chip>datasheets REPORTED · results INFERENCE</Chip>
        </div>
        <JointTable />
        <p className="mt-4 text-sm leading-relaxed text-mute">
          Adversarial check on the recommended set: worst u {panda.combined.worstU.toFixed(2)} over {panda.combined.evals} evaluations of all 8 errors
          together. {panda.combined.passed ? "PASS." : "FAIL."} Torque checks within 5%: PASS. Full study: {panda.meta.elapsed_s} s, {panda.meta.sims}{" "}
          simulations on a 2-vCPU machine. Tasks: {panda.tasks.map((t) => t.title).join(" · ")}.
        </p>
      </section>

      <section className="mx-auto grid max-w-[1240px] gap-6 px-6 py-12 sm:px-8 lg:grid-cols-2">
        <div className="glass rounded-[2px] p-7">
          <span className="eyebrow">How it works</span>
          <ol className="mt-5 flex flex-col gap-4">
            {how.map((h, i) => (
              <li key={i} className="flex gap-4 text-[15px] leading-relaxed text-soft">
                <span className="font-mono text-xs text-holds">{String(i + 1).padStart(2, "0")}</span>
                {h}
              </li>
            ))}
          </ol>
        </div>
        <div className="glass rounded-[2px] p-7">
          <span className="eyebrow">Known limits in v0</span>
          <ul className="mt-5 flex flex-col gap-4">
            {limits.map((h) => (
              <li key={h} className="flex gap-3 text-[15px] leading-relaxed text-soft">
                <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-breaks" aria-hidden="true" />
                {h}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="beta" className="mx-auto grid max-w-[1240px] scroll-mt-24 gap-10 px-6 py-16 sm:px-8 lg:grid-cols-2">
        <div className="flex flex-col gap-5">
          <SectionHeading
            eyebrow="Join the beta"
            title="Run your own robot through it."
            lead="We are looking for engineers sizing joints on humanoids, legged robots and arms. You get a full study on your model; we get your honest feedback."
          />
          <ul className="flex flex-col gap-2.5 text-[15px] text-soft">
            <li>— Your model stays private to your account</li>
            <li>— Every report ships its assumptions and raw results</li>
            <li>— Free during the beta</li>
          </ul>
        </div>
        <BetaForm />
      </section>
    </>
  );
}
