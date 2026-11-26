import type { Metadata } from "next";
import Link from "next/link";
import { panda } from "@/lib/data/panda";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { BetaForm } from "@/components/actuatorfit/BetaForm";
import { StudioStage } from "@/components/studio/StudioStage";

export const metadata: Metadata = {
  title: "ActuatorFit",
  description: "Task-driven actuator sizing for robots, with a Gap Margin: how wrong the model and the datasheet can be before each actuator stops being enough.",
};

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
  "Arms and quadrupeds today; quadruped torques come from planned motions on a hard floor. Humanoids are next.",
];

const ledger = "border-t border-line px-6 py-7 sm:px-8";

export default function ActuatorFitPage() {
  return (
    <>
      <nav aria-label="Breadcrumb" className="mx-auto max-w-[1240px] px-6 pt-6 font-mono text-xs text-mute sm:px-8">
        <Link href="/" className="hover:text-holds">
          home
        </Link>{" "}
        / <span className="text-holds">actuatorfit</span>
      </nav>

      <StudioStage />

      <section aria-labelledby="ledger-h" className="mx-auto max-w-[1240px] px-6 pt-20 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4 pb-8">
          <h2 id="ledger-h" className="font-display text-[clamp(28px,3.4vw,40px)] font-semibold leading-[1.05] tracking-[-0.03em]">
            Engineering ledger
          </h2>
          <span className="border border-line px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-mute">datasheets REPORTED · results INFERENCE</span>
        </div>
        <div className="grid border-x border-b border-line lg:grid-cols-2">
          <div className={`${ledger} lg:border-r`}>
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-mute">Spec // 01 · how it works</span>
            <ol className="mt-5 flex flex-col gap-4">
              {how.map((h, i) => (
                <li key={i} className="grid grid-cols-[28px_1fr] text-[15px] leading-relaxed text-soft">
                  <span className="font-mono text-xs leading-7 text-holds">{String(i + 1).padStart(2, "0")}</span>
                  {h}
                </li>
              ))}
            </ol>
          </div>
          <div className={ledger}>
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-mute">Spec // 02 · known limits</span>
            <ul className="mt-5 flex flex-col gap-4">
              {limits.map((h) => (
                <li key={h} className="grid grid-cols-[28px_1fr] text-[15px] leading-relaxed text-soft">
                  <span className="mt-2.5 size-1.5 bg-breaks" aria-hidden="true" />
                  {h}
                </li>
              ))}
            </ul>
          </div>
          <div className={`${ledger} lg:col-span-2`}>
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-mute">Spec // 03 · checks on record</span>
            <p className="mt-4 max-w-[900px] text-[15px] leading-relaxed text-soft">
              Panda: adversarial check on the recommended set, worst u {panda.combined.worstU.toFixed(2)} over {panda.combined.evals} evaluations of all 8 errors
              together: {panda.combined.passed ? "PASS" : "FAIL"}. Full study {panda.meta.elapsed_s} s, {panda.meta.sims} simulations, tasks:{" "}
              {panda.tasks.map((t) => t.title).join(" · ")}. Legged robots: torques come from whole-body inverse dynamics on planned motions (stand-up,
              0.5 m/s trot, loaded stand) on a hard floor, checked twice: in MuJoCo with no controller, and independently with Pinocchio. Both checks are
              also run with 70% torques, which must fail. Every amendment and failure is on the{" "}
              <Link href="/evidence" className="text-fg underline underline-offset-4 hover:text-holds">
                evidence page
              </Link>
              .
            </p>
          </div>
        </div>
      </section>

      <section id="beta" className="mx-auto grid max-w-[1240px] scroll-mt-24 gap-10 px-6 py-20 sm:px-8 lg:grid-cols-2">
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
