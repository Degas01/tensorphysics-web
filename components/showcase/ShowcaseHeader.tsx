import Link from "next/link";
import clsx from "clsx";
import { Reveal } from "@/components/motion/Reveal";

/** Section header for a product showcase: index number, product name, status, one-line pitch. */
export function ShowcaseHeader({
  n,
  id,
  product,
  kicker,
  title,
  lead,
  href,
  status,
  statusTone,
}: {
  n: string;
  id: string;
  product: string;
  kicker: string;
  title: string;
  lead: React.ReactNode;
  href: string;
  status: string;
  statusTone: "holds" | "breaks" | "warn";
}) {
  return (
    <div className="grid gap-6 border-t border-line pt-6 lg:grid-cols-[220px_1fr]">
      <div className="flex items-start gap-4 font-mono text-[11px] uppercase tracking-[0.14em]">
        <span className="text-dim">{n}</span>
        <div className="flex flex-col gap-2">
          <Link href={href} className="text-fg hover:text-holds">
            {product}
          </Link>
          <span
            className={clsx(
              "w-fit border px-1.5 py-px text-[10px]",
              statusTone === "holds" && "border-holds/50 text-holds",
              statusTone === "breaks" && "border-breaks/60 text-breaks",
              statusTone === "warn" && "border-warn/60 text-warn",
            )}
          >
            {status}
          </span>
        </div>
      </div>
      <div className="flex max-w-[820px] flex-col gap-3">
        <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-dim">{kicker}</span>
        <Reveal>
          <h2 id={id} className="font-display text-[clamp(28px,3.4vw,44px)] font-semibold leading-[1.06] tracking-[-0.025em]">
            {title}
          </h2>
        </Reveal>
        <p className="text-[17px] leading-relaxed text-soft">{lead}</p>
      </div>
    </div>
  );
}
