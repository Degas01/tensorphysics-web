import type { Metadata } from "next";
import Link from "next/link";
import { Bug, GitBranch, Repeat, Waves } from "lucide-react";
import { Chip } from "@/components/ui/Chip";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { TerminalCard } from "@/components/bento/TerminalCard";
import { BetaForm } from "@/components/actuatorfit/BetaForm";
import { ScrambleText } from "@/components/hero/ScrambleText";

export const metadata: Metadata = {
  title: "PhysicsFuzz",
  description: "A fuzzer for game physics: drive Godot 4 + Jolt scenes into tunnelling, jitter and energy explosions automatically.",
};

const checks = [
  { icon: Waves, t: "Tunnelling", d: "Fast bodies passing through walls and floors." },
  { icon: Bug, t: "Jitter at rest", d: "Stacks and ragdolls that never settle." },
  { icon: Repeat, t: "Energy explosions", d: "Energy that grows when nothing pushes it." },
  { icon: GitBranch, t: "In your CI", d: "Every failure comes with a seed to replay it." },
];

export default function PhysicsFuzzPage() {
  return (
    <>
      <section className="mx-auto max-w-[1240px] px-6 pb-12 pt-14 sm:px-8 lg:pt-20">
        <nav aria-label="Breadcrumb" className="mb-8 font-mono text-xs text-mute">
          <Link href="/" className="hover:text-holds">home</Link> / <span className="text-holds">physicsfuzz</span>
        </nav>
        <div className="grid items-start gap-10 lg:grid-cols-[1.1fr_1fr]">
          <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center gap-2">
              <Chip tone="breaks">in testing</Chip>
              <span className="font-mono text-xs text-mute">Godot 4.6 + Jolt · free plugin, paid CI planned</span>
            </div>
            <ScrambleText
              className="font-display text-[clamp(40px,5.6vw,74px)] font-bold leading-[0.98] tracking-[-0.03em]"
              segments={[{ text: "Find the physics bugs before your " }, { text: "players do.", className: "text-breaks" }]}
            />
            <p className="max-w-[580px] text-lg leading-relaxed text-soft">
              PhysicsFuzz drives your scenes with random spawns, impulses and timesteps, watches for failures, and hands you a seed to
              replay each one. It is in testing now: we are running it on open-source Godot projects before anyone pays for it.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {checks.map(({ icon: Icon, t, d }) => (
                <div key={t} className="glass flex gap-3 rounded-[2px] p-4">
                  <Icon className="mt-0.5 size-5 shrink-0 text-holds" aria-hidden="true" />
                  <div>
                    <div className="font-medium">{t}</div>
                    <div className="text-[13px] leading-relaxed text-mute">{d}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <TerminalCard />
        </div>
      </section>

      <section className="mx-auto grid max-w-[1240px] gap-10 px-6 py-16 sm:px-8 lg:grid-cols-2">
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
