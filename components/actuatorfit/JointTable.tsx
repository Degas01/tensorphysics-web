"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import clsx from "clsx";
import { panda } from "@/lib/data/panda";
import { Chip } from "@/components/ui/Chip";

const SHORT = ["Friction", "Rotor inertia", "Damping", "Payload", "Link mass", "Torque", "Voltage", "Heat"];
const MEASURE: Record<string, string> = {
  thermal: "Run the duty cycle on the bench and log winding temperature.",
  damping: "Measure viscous damping with friction sweeps at several speeds.",
  torque_short: "Bench the actuator's torque at the working speed.",
  friction: "Measure joint friction with a slow constant-speed sweep.",
};

function Bars({ margins }: { margins: readonly (number | null)[] }) {
  return (
    <div className="flex flex-col gap-1.5">
      {margins.map((m, i) => {
        const shown = m === null ? 3 : Math.min(m, 3);
        const tone = m === null || m >= 1 ? "bg-holds" : m >= 0.5 ? "bg-warn" : "bg-breaks";
        return (
          <div key={i} className="grid grid-cols-[96px_1fr_40px] items-center gap-2 text-xs">
            <span className="text-soft">{SHORT[i]}</span>
            <span className="relative h-2 rounded-full bg-white/[0.06]">
              <motion.span
                className={clsx("absolute inset-y-0 left-0 rounded-full", tone)}
                initial={{ width: 0 }}
                animate={{ width: `${(shown / 3) * 100}%` }}
                transition={{ duration: 0.5, delay: i * 0.03 }}
              />
              <span className="absolute -inset-y-1 left-1/3 w-px bg-white/50" aria-hidden="true" />
            </span>
            <span className="text-right font-mono text-fg">{m === null ? ">5" : m.toFixed(2)}</span>
          </div>
        );
      })}
    </div>
  );
}

export function JointTable() {
  const [open, setOpen] = useState<string | null>("joint2");
  return (
    <div className="glass overflow-hidden rounded-3xl">
      <div className="hidden grid-cols-[1fr_2fr_1.1fr_1.3fr_32px] gap-4 border-b border-line px-6 py-3 font-mono text-[11px] uppercase tracking-wider text-mute md:grid">
        <span>Joint</span>
        <span>ActuatorFit pick (lightest with margin)</span>
        <span>u nominal → all errors</span>
        <span>Breaks first</span>
        <span />
      </div>
      {panda.joints.map((j) => {
        const r = j.recommended;
        const l = j.lightest;
        const isOpen = open === j.key;
        const bfIdx = panda.factors.findIndex((f) => f.key === r.breaks_first);
        return (
          <div key={j.key} className="border-b border-line last:border-b-0">
            <button
              type="button"
              aria-expanded={isOpen}
              onClick={() => setOpen(isOpen ? null : j.key)}
              className="grid w-full grid-cols-[1fr_auto] gap-x-4 gap-y-1 px-6 py-4 text-left transition-colors hover:bg-white/[0.03] md:grid-cols-[1fr_2fr_1.1fr_1.3fr_32px] md:items-center"
            >
              <span className="font-medium">{j.label}</span>
              <ChevronDown className={clsx("size-4 text-mute transition-transform md:order-last", isOpen && "rotate-180")} aria-hidden="true" />
              <span className="col-span-2 flex flex-col md:col-span-1">
                <span>{r.name.replace(" (V4)", "")}</span>
                <span className="text-xs text-mute">{r.mass_kg} kg · fits with margin</span>
              </span>
              <span className="font-mono text-sm tabular-nums">
                {r.u.toFixed(2)} → {r.u_corner.toFixed(2)}
              </span>
              <span className="text-sm text-soft">
                {bfIdx >= 0 ? `${SHORT[bfIdx]} (margin ${(r.margins[bfIdx] as number).toFixed(2)})` : "nothing within 5×"}
              </span>
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  <div className="grid gap-8 px-6 pb-6 pt-1 md:grid-cols-2">
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[11px] uppercase tracking-wider text-mute">Gap Margin · {r.name.replace(" (V4)", "")}</span>
                        <Chip tone="holds">u corner {r.u_corner.toFixed(2)}</Chip>
                      </div>
                      <Bars margins={r.margins} />
                      <span className="text-[11px] text-dim">Line = survives the whole plausible range of that error (1.00). Capped at 3.</span>
                    </div>
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[11px] uppercase tracking-wider text-mute">Lightest paper fit · {l.name.replace(" (V4)", "")}</span>
                        <Chip tone="breaks">u corner {l.u_corner.toFixed(2)}</Chip>
                      </div>
                      <Bars margins={l.margins} />
                      <p className="text-sm leading-relaxed text-soft">
                        {l.mass_kg} kg and u {l.u.toFixed(2)} on paper, but over its limit once every error sits at the top of its range.
                      </p>
                      <p className="rounded-xl border border-line bg-black/30 p-3 text-sm text-soft">
                        <span className="text-mute">Measure first: </span>
                        {MEASURE[r.breaks_first ?? ""] ?? "Nothing breaks within 5× the plausible range."}
                      </p>
                      <p className="font-mono text-[11px] text-dim">
                        Demand: {j.demand.peak_tau.toFixed(1)} Nm peak · {j.demand.rms_tau.toFixed(1)} Nm RMS · {j.demand.peak_w.toFixed(2)} rad/s
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
