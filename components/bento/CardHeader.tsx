import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export function CardHeader({
  eyebrow,
  title,
  href,
  hrefLabel,
  chip,
}: {
  eyebrow: string;
  title: string;
  href: string;
  hrefLabel: string;
  chip?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="eyebrow !text-[11px]">{eyebrow}</span>
          {chip}
        </div>
        <h3 className="font-display text-2xl font-semibold tracking-tight">{title}</h3>
      </div>
      <Link
        href={href}
        aria-label={hrefLabel}
        className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-line text-mute transition-all hover:rotate-45 hover:border-holds hover:text-holds"
      >
        <ArrowUpRight className="size-4" aria-hidden="true" />
      </Link>
    </div>
  );
}
