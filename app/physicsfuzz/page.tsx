import type { Metadata } from "next";
import Link from "next/link";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { BetaForm } from "@/components/actuatorfit/BetaForm";
import { FuzzStage } from "@/components/studio/FuzzStage";

export const metadata: Metadata = {
  title: "PhysicsFuzz",
  description: "A fuzzer for game physics: drive Godot 4 + Jolt scenes into tunnelling, jitter and energy explosions automatically.",
};

const how = [
  "Drives your scenes with random spawns, impulses and timesteps.",
  "Watches every run for tunnelling, energy that grows from nothing, jitter at rest and stuck contacts.",
  "Hands back a seed for each failure, so the exact run can be replayed.",
  "Re-runs the same seed with a candidate fix (more substeps, continuous collision) to show whether it holds.",
  "Runs in your CI, so a physics regression fails the build with a seed attached.",
];

const limits = [
  "In testing: we are running it on open-source Godot projects before anyone pays for it.",
  "No customer results yet.",
  "Godot 4.6 with Jolt only for now.",
  "The demo on this page is a small 2D penalty-contact solver written for the page, not Godot or Jolt.",
];

const ledger = "border-t border-line px-6 py-7 sm:px-8";

export default function PhysicsFuzzPage() {
  return (
    <>
      <nav aria-label="Breadcrumb" className="mx-auto max-w-[1240px] px-6 pt-6 font-mono text-xs text-mute sm:px-8">
        <Link href="/" className="hover:text-holds">
          home
        </Link>{" "}
        / <span className="text-holds">physicsfuzz</span>
      </nav>

      <FuzzStage />

      <section aria-labelledby="pf-ledger-h" className="mx-auto max-w-[1240px] px-6 pt-20 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4 pb-8">
          <h2 id="pf-ledger-h" className="font-display text-[clamp(28px,3.4vw,40px)] font-semibold leading-[1.05] tracking-[-0.03em]">
            Engineering ledger
          </h2>
          <span className="border border-line px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-mute">in testing · no customer results yet</span>
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
              Nothing to report for PhysicsFuzz yet: it has no customer runs. What is on record for our adversarial testing so far, including what did not
              work, is on the{" "}
              <Link href="/evidence" className="text-fg underline underline-offset-4 hover:text-holds">
                evidence page
              </Link>
              .
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-[1240px] gap-10 px-6 py-20 sm:px-8 lg:grid-cols-2">
        <SectionHeading
          eyebrow="Get notified"
          title="Want it on your project?"
          lead="Leave your email and we will tell you when the plugin is ready. Studios willing to try it on their own game, tell us in the form."
        />
        <BetaForm product="physicsfuzz" />
      </section>
    </>
  );
}
