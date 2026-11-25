"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import clsx from "clsx";
import { panda } from "@/lib/data/panda";
import { estimateU, type MarginSource } from "@/lib/gapModel";
import { Frame, Readout } from "@/components/ui/Frame";
import { InfoTip } from "@/components/ui/InfoTip";
import { useApp } from "@/components/providers/AppProvider";
import { spring } from "@/lib/motion";
import { ShowcaseHeader } from "./ShowcaseHeader";
import { LeggedShowcase } from "./LeggedShowcase";

const ActuatorScene = dynamic(() => import("./ActuatorScene"), { ssr: false });

const J2 = panda.joints.find((j) => j.key === "joint2")!;
const OPTIONS = [
  { key: "lightest" as const, title: "Lightest paper fit", src: J2.lightest },
  { key: "recommended" as const, title: "ActuatorFit pick", src: J2.recommended },
];
const short = (n: string) => n.replace("MyActuator ", "").replace(" (V4)", "").replace("-P20", "");

const uAt = (src: MarginSource, p: number) => estimateU(src, Array(8).fill(p));
const breakAt = (src: MarginSource) => {
  for (let i = 0; i <= 100; i++) if (uAt(src, i / 100) > 1) return i;
  return null;
};

/* ---------- envelope plot ---------- */
const PW = 520;
const PH = 260;
const L = 40;
const R = 12;
const T = 14;
const B = 30;
const UMAX = 1.4;
const xOf = (p: number) => L + p * (PW - L - R);
const yOf = (u: number) => T + (1 - Math.min(u, UMAX) / UMAX) * (PH - T - B);

function Envelope({ p, sel }: { p: number; sel: "lightest" | "recommended" }) {
  const curves = useMemo(
    () =>
      OPTIONS.map((o) => {
        let d = "";
        for (let i = 0; i <= 100; i++) d += `${i ? "L" : "M"}${xOf(i / 100).toFixed(1)} ${yOf(uAt(o.src, i / 100)).toFixed(1)}`;
        return { ...o, d, b: breakAt(o.src) };
      }),
    [],
  );
  const y1 = yOf(1);
  return (
    <svg viewBox={`0 0 ${PW} ${PH}`} className="h-auto w-full" role="img" aria-label="Utilisation against error stack for both actuators">
      <defs>
        <clipPath id="af-over">
          <rect x={L} y={T} width={PW - L - R} height={y1 - T} />
        </clipPath>
        <clipPath id="af-under">
          <rect x={L} y={y1} width={PW - L - R} height={PH - B - y1} />
        </clipPath>
      </defs>
      {[0, 0.25, 0.5, 0.75, 1].map((g) => (
        <g key={g}>
          <line x1={xOf(g)} x2={xOf(g)} y1={T} y2={PH - B} stroke="rgba(255,255,255,0.06)" />
          <text x={xOf(g)} y={PH - 10} textAnchor="middle" className="fill-dim font-mono text-[10px]">
            {Math.round(g * 100)}%
          </text>
        </g>
      ))}
      {[0, 0.5, 1].map((g) => (
        <text key={g} x={L - 8} y={yOf(g) + 3} textAnchor="end" className="fill-dim font-mono text-[10px]">
          {g.toFixed(1)}
        </text>
      ))}
      <rect x={L} y={T} width={PW - L - R} height={y1 - T} fill="rgba(255,77,0,0.05)" />
      <line x1={L} x2={PW - R} y1={y1} y2={y1} stroke="#f4f6f8" strokeOpacity="0.55" strokeDasharray="3 4" />
      <text x={PW - R} y={y1 - 6} textAnchor="end" className="fill-soft font-mono text-[10px]">
        u = 1.00 limit
      </text>
      {curves.map((c) => {
        const on = c.key === sel;
        return (
          <g key={c.key} opacity={on ? 1 : 0.35}>
            <path d={c.d} fill="none" stroke="#00e5ff" strokeWidth={on ? 2 : 1.4} clipPath="url(#af-under)" />
            <path d={c.d} fill="none" stroke="#ff4d00" strokeWidth={on ? 2.2 : 1.4} clipPath="url(#af-over)" />
            {c.b !== null && (
              <g>
                <circle cx={xOf(c.b / 100)} cy={y1} r="4" fill="#ff4d00" />
                <text x={xOf(c.b / 100)} y={y1 + 16} textAnchor="middle" className="fill-breaks font-mono text-[10px]">
                  breaks {c.b}%
                </text>
              </g>
            )}
          </g>
        );
      })}
      <line x1={xOf(p)} x2={xOf(p)} y1={T} y2={PH - B} stroke="#f4f6f8" strokeOpacity="0.35" />
      <circle cx={xOf(p)} cy={yOf(uAt(sel === "lightest" ? J2.lightest : J2.recommended, p))} r="5" fill="#040507" stroke="#f4f6f8" strokeWidth="1.5" />
    </svg>
  );
}

export function ActuatorFitShowcase() {
  const { motionOff } = useApp();
  const [sel, setSel] = useState<"lightest" | "recommended">("lightest");
  const [p, setP] = useState(0.6);
  const src = J2[sel];
  const u = uAt(src, p);
  const over = u > 1;
  const b = breakAt(src);

  return (
    <section id="actuatorfit" aria-labelledby="af-h" className="mx-auto max-w-[1240px] scroll-mt-24 px-6 py-20 sm:px-8">
      <ShowcaseHeader
        n="01"
        id="af-h"
        product="ActuatorFit"
        kicker="Hardware and thermal margin engine"
        title="The lightest actuator that fits on paper melts once the model is wrong."
        lead="Real result from our Franka Panda study, shoulder joint J2. Stack every modelling error toward the top of its plausible range and watch which actuator still holds."
        href="/actuatorfit"
        status="beta open"
        statusTone="holds"
      />

      <div className="mt-10 grid gap-px border border-line bg-line lg:grid-cols-[1.05fr_1fr]">
        <Frame label="fig. 02 · actuator cutaway" coord={short(src.name)} className="relative aspect-square border-0 bg-[#06070a] sm:aspect-[4/3] lg:aspect-auto lg:min-h-[520px]">
          <ActuatorScene u={u} animate={!motionOff} />
          <div className="pointer-events-none absolute left-4 top-6 flex flex-col gap-1">
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-dim">stator utilisation</span>
            <motion.span
              key={over ? "o" : "h"}
              initial={{ scale: 1.08 }}
              animate={{ scale: 1 }}
              transition={spring}
              className={clsx("origin-left font-display text-5xl font-semibold tabular-nums", over ? "text-breaks" : "text-holds")}
            >
              {u.toFixed(2)}
            </motion.span>
            <span className={clsx("w-fit border px-2 py-0.5 font-mono text-[11px] tracking-[0.14em]", over ? "border-breaks text-breaks" : "border-holds/50 text-holds")}>
              {over ? "BREAKS" : "HOLDS"}
            </span>
          </div>
        </Frame>

        <div className="flex flex-col gap-6 bg-ink p-6 sm:p-8">
          <div role="radiogroup" aria-label="Actuator" className="grid grid-cols-1 gap-px border border-line bg-line sm:grid-cols-2">
            {OPTIONS.map((o) => {
              const on = sel === o.key;
              const ob = breakAt(o.src);
              return (
                <button
                  key={o.key}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setSel(o.key)}
                  className={clsx("relative flex flex-col gap-1 px-4 py-3 text-left transition-colors", on ? "bg-[#0f141a]" : "bg-ink hover:bg-[#0d1116]")}
                >
                  {on && <motion.span layoutId="af-sel" transition={spring} className={clsx("absolute inset-x-0 top-0 h-[2px]", o.key === "lightest" ? "bg-breaks" : "bg-holds")} />}
                  <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-dim">{o.title}</span>
                  <span className="text-sm text-fg">
                    {short(o.src.name)} · {o.src.mass_kg} kg
                  </span>
                  <span className={clsx("font-mono text-[11px]", ob === null ? "text-holds" : "text-breaks")}>
                    {ob === null ? "Holds at 100% error stack" : `Fails at ${ob}% error stack`}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="border border-line bg-[#07090c] p-3">
            <div className="mb-1 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.12em] text-dim">
              <span>utilisation envelope · torque + thermal · J2</span>
              <InfoTip label="How this is computed" align="end">
                u is the worst of peak-torque, RMS (thermal) and speed ratios against the datasheet, from the v0 Panda study. 0% and 100% are
                simulated exactly; points between are interpolated from single-error margins (INFERENCE). Stator colour shows u; it is not a thermal
                simulation.
              </InfoTip>
            </div>
            <Envelope p={p} sel={sel} />
          </div>

          <label className="flex flex-col gap-2 text-sm text-soft">
            <span className="flex justify-between">
              <span>All 8 modelling errors, stacked</span>
              <span className="font-mono text-fg tabular-nums">{Math.round(p * 100)}%</span>
            </span>
            <input type="range" min={0} max={100} value={Math.round(p * 100)} onChange={(e) => setP(Number(e.target.value) / 100)} />
          </label>

          <dl className="grid grid-cols-3 gap-4 border-t border-line pt-5">
            <Readout k="mass" v={`${src.mass_kg} kg`} />
            <Readout k="margin" v={over ? `${((u - 1) * 100).toFixed(0)}% over` : `${((1 - u) * 100).toFixed(0)}% left`} tone={over ? "breaks" : "holds"} />
            <Readout k="fails at" v={b === null ? "never" : `${b}%`} tone={b === null ? "holds" : "breaks"} />
          </dl>
          <Link href="/actuatorfit" className="font-mono text-xs text-holds hover:underline">
            Open the full 7-joint study →
          </Link>
        </div>
      </div>
      <LeggedShowcase />
    </section>
  );
}
