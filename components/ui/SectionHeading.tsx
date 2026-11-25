import clsx from "clsx";
import { Reveal } from "@/components/motion/Reveal";

export function SectionHeading({
  eyebrow,
  title,
  lead,
  className,
  id,
}: {
  eyebrow: string;
  title: React.ReactNode;
  lead?: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <div className={clsx("flex max-w-[760px] flex-col gap-3", className)}>
      <span className="eyebrow">{eyebrow}</span>
      <Reveal>
        <h2 id={id} className="font-display text-[clamp(30px,3.8vw,46px)] font-semibold leading-[1.05] tracking-[-0.025em]">
          {title}
        </h2>
      </Reveal>
      {lead && <p className="text-[17px] leading-relaxed text-soft">{lead}</p>}
    </div>
  );
}
