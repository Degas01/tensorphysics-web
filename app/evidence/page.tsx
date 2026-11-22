import type { Metadata } from "next";
import Link from "next/link";
import { Check, Minus, X } from "lucide-react";
import { studies } from "@/lib/evidence";
import { Chip } from "@/components/ui/Chip";
import { verdictTone } from "@/components/sections/EvidenceList";
import { ScrambleText } from "@/components/hero/ScrambleText";

export const metadata: Metadata = {
  title: "Evidence",
  description: "Every TensorPhysics test, its pre-registered pass and fail lines, and the result. Failures included.",
};

export default function EvidencePage() {
  return (
    <section className="mx-auto max-w-[1000px] px-6 pb-10 pt-14 sm:px-8 lg:pt-20">
      <nav aria-label="Breadcrumb" className="mb-8 font-mono text-xs text-mute">
        <Link href="/" className="hover:text-holds">home</Link> / <span className="text-holds">evidence</span>
      </nav>
      <span className="eyebrow !text-holds">Evidence</span>
      <ScrambleText
        className="mt-4 font-display text-[clamp(40px,5.4vw,72px)] font-bold leading-none tracking-[-0.03em]"
        segments={[{ text: "We publish our " }, { text: "failures.", className: "text-breaks" }]}
      />
      <p className="mt-6 max-w-[680px] text-lg leading-relaxed text-soft">
        Each study has its pass and fail lines written down before it runs. Changes after a run are logged as amendments with the
        reason. Labels: <b className="text-holds">VERIFIED</b> (checked), <b className="text-fg">REPORTED</b> (someone else&apos;s claim),{" "}
        <b className="text-breaks">INFERENCE</b> (our model-based estimate).
      </p>

      <div className="mt-12 flex flex-col gap-6">
        {studies.map((s) => (
          <article id={s.slug} key={s.slug} className="glass scroll-mt-28 rounded-3xl p-6 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <Chip tone={verdictTone[s.verdict]}>{s.verdictLabel}</Chip>
                <span className="font-mono text-xs text-dim">
                  {s.product} · {s.date}
                </span>
              </div>
              {s.href && (
                <Link href={s.href} className="text-sm text-holds hover:underline">
                  Open →
                </Link>
              )}
            </div>
            <h2 className="mt-4 font-display text-2xl font-semibold">{s.title}</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-soft">{s.summary}</p>
            <ul className="mt-6 divide-y divide-line rounded-2xl border border-line">
              {s.lines.map((l) => (
                <li key={l.label} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                  <span className="flex items-center gap-3 text-soft">
                    {l.ok === true ? (
                      <Check className="size-4 text-holds" aria-label="passed" />
                    ) : l.ok === false ? (
                      <X className="size-4 text-breaks" aria-label="not passed" />
                    ) : (
                      <Minus className="size-4 text-mute" aria-label="open" />
                    )}
                    {l.label}
                  </span>
                  <span className="font-mono text-xs text-fg">{l.result}</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
