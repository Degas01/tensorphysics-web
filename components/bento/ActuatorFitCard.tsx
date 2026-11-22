"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import { panda } from "@/lib/data/panda";
import { estimateU, type MarginSource } from "@/lib/gapModel";
import { GlowCard } from "@/components/ui/GlowCard";
import { Chip } from "@/components/ui/Chip";
import { CardHeader } from "./CardHeader";
import { InfoTip } from "@/components/ui/InfoTip";

const shoulder = panda.joints.find((j) => j.key === "joint2")!;

/** Mini playground: drag one slider (all 8 errors together) and watch the lighter actuator fail first. */
export function ActuatorFitCard() {
  const [z, setZ] = useState(0.6);
  const zs = useMemo(() => Array(8).fill(z), [z]);
  const rows = [
    { who: "Lightest paper fit", e: shoulder.lightest },
    { who: "ActuatorFit pick", e: shoulder.recommended },
  ].map((r) => {
    const u = estimateU(r.e, zs);
    return { ...r, u, over: u > 1 };
  });

  // Where does each option first cross u = 1 as all errors grow together?
  const breakAt = (e: MarginSource) => {
    for (let p = 0; p <= 100; p++) if (estimateU(e, Array(8).fill(p / 100)) > 1) return p;
    return null;
  };
  const lightBreak = breakAt(shoulder.lightest);
  const recBreak = breakAt(shoulder.recommended);

  return (
    <GlowCard className="h-full p-6 sm:p-7">
      <div className="flex h-full flex-col gap-6">
        <CardHeader
          eyebrow="Product"
          title="ActuatorFit"
          chip={<Chip tone="solid">beta open</Chip>}
          href="/actuatorfit"
          hrefLabel="Open ActuatorFit"
        />
        <p className="max-w-[560px] text-[15px] leading-relaxed text-soft">
          Actuators that still fit when the model is wrong. Real result from our Franka Panda study, shoulder joint
          ({shoulder.demand.peak_tau.toFixed(0)} Nm peak, {shoulder.demand.rms_tau.toFixed(0)} Nm RMS):
        </p>

        <div className="flex flex-col gap-4">
          {rows.map((r) => (
            <div key={r.who} className="flex flex-col gap-2">
              <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                <span>
                  <span className="text-mute">{r.who}: </span>
                  <span className="font-medium">{r.e.name.replace(" (V4)", "")}</span>
                  <span className="text-mute"> · {r.e.mass_kg} kg</span>
                </span>
                <span className={clsx("font-mono tabular-nums", r.over ? "text-breaks" : "text-holds")}>
                  u {r.u.toFixed(2)} · {r.over ? "BREAKS" : "HOLDS"}
                </span>
              </div>
              <div className="relative h-2.5 rounded-full bg-white/[0.06]">
                <div
                  className={clsx("absolute inset-y-0 left-0 rounded-full transition-[width,background-color] duration-300", r.over ? "bg-breaks" : "bg-holds")}
                  style={{ width: `${Math.min(r.u / 1.4, 1) * 100}%` }}
                />
                <span className="absolute -inset-y-1 left-[71.4%] w-px bg-white/60" aria-hidden="true" />
              </div>
            </div>
          ))}
        </div>

        <dl className="grid grid-cols-3 gap-2">
          {[
            { k: "lightest breaks at", v: lightBreak === null ? "never" : `${lightBreak}%`, c: "text-breaks" },
            { k: "pick still holds at", v: recBreak === null ? "100%" : `${recBreak}%`, c: "text-holds" },
            { k: "mass cost of margin", v: `+${(shoulder.recommended.mass_kg - shoulder.lightest.mass_kg).toFixed(1)} kg`, c: "text-fg" },
          ].map((d) => (
            <div key={d.k} className="flex flex-col-reverse gap-1 rounded-xl border border-line bg-black/25 p-3">
              <dt className="text-[11px] leading-tight text-mute">{d.k}</dt>
              <dd className={`font-display text-xl font-semibold ${d.c}`}>{d.v}</dd>
            </div>
          ))}
        </dl>

        <label className="mt-auto flex flex-col gap-2 text-sm text-soft">
          <span className="flex justify-between">
            <span className="flex items-center gap-2">
              All 8 modelling errors, together
              <InfoTip label="How this is computed" align="start">
                0% and 100% match the Panda study exactly (no error, and every error at the top of its plausible range). Values in
                between are interpolated from the single-error margins.
              </InfoTip>
            </span>
            <span className="whitespace-nowrap font-mono text-fg">
              {Math.round(z * 100)}%<span className="hidden sm:inline"> of plausible range</span>
            </span>
          </span>
          <input type="range" min={0} max={100} value={Math.round(z * 100)} onChange={(e) => setZ(Number(e.target.value) / 100)} />
        </label>
      </div>
    </GlowCard>
  );
}
