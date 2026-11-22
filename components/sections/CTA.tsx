import { MagneticButton } from "@/components/hero/MagneticButton";
import { site } from "@/lib/site";

export function CTA({
  title = "Size your next robot against the errors you haven't measured yet.",
  lead = "ActuatorFit beta: bring your own MJCF or URDF, or start from a reference robot.",
}: {
  title?: string;
  lead?: string;
}) {
  return (
    <section className="mx-auto max-w-[1240px] px-6 py-16 sm:px-8">
      <div className="grid gap-8 rounded-2xl border border-line bg-white/[0.02] p-8 sm:p-12 lg:grid-cols-[1.4fr_1fr] lg:items-end">
        <div className="flex flex-col gap-4">
          <span className="eyebrow">Beta</span>
          <h2 className="max-w-[640px] font-display text-[clamp(28px,3.6vw,44px)] font-semibold leading-[1.08] tracking-[-0.02em]">{title}</h2>
          <p className="max-w-[520px] text-[16px] leading-relaxed text-soft">{lead}</p>
        </div>
        <div className="flex flex-col items-start gap-4 lg:items-end">
          <MagneticButton href="/actuatorfit#beta">Join the beta</MagneticButton>
          <a href={`mailto:${site.contactEmail}`} className="font-mono text-xs text-mute hover:text-fg">
            or email {site.contactEmail}
          </a>
        </div>
      </div>
    </section>
  );
}
