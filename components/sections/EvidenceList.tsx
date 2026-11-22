import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { studies, type Verdict } from "@/lib/evidence";
import { Chip, type Tone } from "@/components/ui/Chip";

export const verdictTone: Record<Verdict, Tone> = {
  passed: "holds",
  "in-progress": "warn",
  "not-passed": "breaks",
  "no-result": "mute",
};

export function EvidenceList({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex flex-col gap-3">
      {studies.map((s) => (
        <Link
          key={s.slug}
          href={compact ? `/evidence#${s.slug}` : s.href ?? "/evidence"}
          className="glass group grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1.5 rounded-2xl px-5 py-4 transition-colors hover:border-white/25"
        >
          <span className="font-medium">{s.title}</span>
          <Chip tone={verdictTone[s.verdict]}>{s.verdictLabel}</Chip>
          <span className="text-[13px] leading-relaxed text-mute">{s.summary}</span>
          <ArrowRight className="size-4 text-mute transition-transform group-hover:translate-x-1 group-hover:text-holds" aria-hidden="true" />
        </Link>
      ))}
    </div>
  );
}
