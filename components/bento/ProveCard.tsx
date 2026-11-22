"use client";

import { useRef } from "react";
import { GlowCard } from "@/components/ui/GlowCard";
import { Chip } from "@/components/ui/Chip";
import { CardHeader } from "./CardHeader";
import { InfoTip } from "@/components/ui/InfoTip";

const CELLS = [
  { k: "C1", v: "0 / 100", note: "false alarms", ok: true },
  { k: "C1b", v: "100 / 100", note: "PASS", ok: true },
  { k: "C2", v: "5 of 6", note: "families caught", ok: false },
  { k: "C3", v: "178 / 1,200", note: "false assurance · friction", ok: false },
  { k: "C4–C7", v: "PASS", note: "", ok: true },
];

/** Spotlight card: a torch follows the cursor and lights up the real GapCheck v0 results beneath. */
export function ProveCard() {
  const lens = useRef<HTMLDivElement>(null);
  const onMove = (e: React.PointerEvent) => {
    const el = lens.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--lx", `${e.clientX - r.left}px`);
    el.style.setProperty("--ly", `${e.clientY - r.top}px`);
  };
  return (
    <GlowCard className="h-full p-6" glow="rgba(169,139,255,0.14)">
      <div className="flex h-full flex-col gap-4">
        <CardHeader
          eyebrow="Engine · Prove"
          title="GapCheck: sim vs real"
          chip={<Chip tone="breaks">v0 not passed</Chip>}
          href="/engine/prove"
          hrefLabel="Open Prove"
        />
        <div
          ref={lens}
          onPointerMove={onMove}
          className="relative grid flex-1 grid-cols-2 gap-2 sm:grid-cols-5"
          style={{
            WebkitMaskImage: "radial-gradient(180px circle at var(--lx, 30%) var(--ly, 50%), #000 35%, rgba(0,0,0,0.25) 100%)",
            maskImage: "radial-gradient(180px circle at var(--lx, 30%) var(--ly, 50%), #000 35%, rgba(0,0,0,0.25) 100%)",
          }}
        >
          {CELLS.map((c) => (
            <div key={c.k} className="flex flex-col justify-between gap-2 rounded-[2px] border border-line bg-black/30 p-3">
              <span className="font-mono text-[11px] text-mute">{c.k}</span>
              <span className={`font-display text-xl font-semibold ${c.ok ? "text-holds" : "text-breaks"}`}>{c.v}</span>
              <span className="text-[11px] leading-tight text-mute">{c.note}</span>
            </div>
          ))}
        </div>
        <p className="flex items-center gap-2 text-[13px] text-mute">
          It missed friction, so we say so.
          <InfoTip label="About GapCheck v0" align="start">
            Bootstrap sim-vs-real test (B = 500) on the excess gap G = sqrt(max(simMSE − noiseMSE, 0)). Answers PASS, FAIL or
            INCONCLUSIVE. Checks C1–C7 were fixed before the run. C3 failed: 178 of 1,200 runs gave false assurance, all on friction.
          </InfoTip>
        </p>
      </div>
    </GlowCard>
  );
}
