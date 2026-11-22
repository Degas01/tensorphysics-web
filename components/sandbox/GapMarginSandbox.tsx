"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import clsx from "clsx";
import { FlaskConical } from "lucide-react";
import { panda } from "@/lib/data/panda";
import { contributions, estimateU } from "@/lib/gapModel";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { InfoTip } from "@/components/ui/InfoTip";
import { Frame } from "@/components/ui/Frame";
import { spring } from "@/lib/motion";
import { TelemetryChart } from "./TelemetryChart";

const SHORT = ["Friction", "Rotor inertia", "Damping", "Payload", "Link mass", "Available torque", "Bus voltage", "Thermal rating"];
const MEASURE = [
  "Measure joint friction with a slow constant-speed sweep, both directions.",
  "Measure reflected rotor inertia from a current step with the link removed.",
  "Measure viscous damping with friction sweeps at several speeds.",
  "Pin down the real payload range, including tooling and cables.",
  "Weigh the links with actuators, brackets and cables fitted.",
  "Bench the actuator's torque at the working speed.",
  "Log bus voltage under load at the actuator connector.",
  "Run the duty cycle on the bench and log winding temperature.",
];
const GROUPS = [
  { title: "Physical reality errors", hint: "The robot is not the model", idx: [0, 1, 2, 3, 4] },
  { title: "Datasheet optimism", hint: "The actuator is not the brochure", idx: [5, 6, 7] },
];
const PRESETS: { name: string; z: number[] }[] = [
  { name: "Nominal", z: [0, 0, 0, 0, 0, 0, 0, 0] },
  { name: "Hot day / long shift", z: [0.3, 0, 0.5, 0, 0, 0.3, 0.2, 1] },
  { name: "Optimistic datasheet", z: [0, 0, 0, 0, 0, 1, 0.5, 0.5] },
  { name: "Worst-case corner", z: [1, 1, 1, 1, 1, 1, 1, 1] },
];
const strip = (n: string) => n.replace(" (V4)", "");

export function GapMarginSandbox() {
  const [ji, setJi] = useState(1);
  const [which, setWhich] = useState<"recommended" | "lightest">("lightest");
  const [z, setZ] = useState<number[]>(PRESETS[1].z);
  const joint = panda.joints[ji];
  const act = joint[which];
  const other = joint[which === "recommended" ? "lightest" : "recommended"];

  const u = useMemo(() => estimateU(act, z), [act, z]);
  const uOther = useMemo(() => estimateU(other, z), [other, z]);
  const contrib = useMemo(() => contributions(act, z), [act, z]);
  const top = useMemo(() => {
    let k = -1;
    contrib.forEach((c, i) => {
      if (c > 0.004 && (k < 0 || c > contrib[k])) k = i;
    });
    return k;
  }, [contrib]);
  const over = u > 1;
  const margin = (1 - u) * 100;

  return (
    <section id="sandbox" aria-labelledby="sandbox-h" className="mx-auto max-w-[1240px] scroll-mt-24 px-6 py-20 sm:px-8">
      <SectionHeading
        id="sandbox-h"
        eyebrow="Gap Margin sandbox · real Panda data"
        title="Dial in how wrong the model is. See what breaks, and what to measure first."
        lead="Pick a joint and an actuator, then push the modelling errors. The callout tells you which bench test buys back the most margin."
      />

      <div className="mt-10 grid gap-px border border-line bg-line lg:grid-cols-[1.15fr_1fr]">
        <div className="flex flex-col gap-6 bg-ink p-6 sm:p-8">
          <div className="grid gap-5 sm:grid-cols-[1fr_1.3fr]">
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 font-mono text-[10px] uppercase tracking-[0.12em] text-dim">Joint</legend>
              <div role="radiogroup" aria-label="Joint" className="grid grid-cols-7 gap-px border border-line bg-line">
                {panda.joints.map((j, i) => (
                  <button
                    key={j.key}
                    type="button"
                    role="radio"
                    aria-checked={ji === i}
                    aria-label={j.label}
                    onClick={() => setJi(i)}
                    className={clsx("h-10 font-mono text-xs transition-colors", ji === i ? "bg-holds text-obsidian" : "bg-ink text-mute hover:text-fg")}
                  >
                    J{i + 1}
                  </button>
                ))}
              </div>
              <span className="font-mono text-[10px] text-dim">
                {joint.label} · {joint.demand.peak_tau.toFixed(1)} Nm peak · {joint.demand.rms_tau.toFixed(1)} Nm RMS
              </span>
            </fieldset>
            <fieldset>
              <legend className="mb-2 font-mono text-[10px] uppercase tracking-[0.12em] text-dim">Actuator</legend>
              <div role="radiogroup" aria-label="Actuator" className="grid grid-cols-2 gap-px border border-line bg-line">
                {(["lightest", "recommended"] as const).map((w) => (
                  <button
                    key={w}
                    type="button"
                    role="radio"
                    aria-checked={which === w}
                    onClick={() => setWhich(w)}
                    className={clsx("relative flex min-h-14 flex-col justify-center px-3 py-2 text-left transition-colors", which === w ? "bg-[#0f141a]" : "bg-ink hover:bg-[#0d1116]")}
                  >
                    {which === w && <motion.span layoutId="sb-act" transition={spring} className="absolute inset-x-0 top-0 h-[2px] bg-holds" />}
                    <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-dim">{w === "lightest" ? "Lightest paper fit" : "ActuatorFit pick"}</span>
                    <span className="text-[13px] text-fg">
                      {strip(joint[w].name)} <span className="text-mute">· {joint[w].mass_kg} kg</span>
                    </span>
                  </button>
                ))}
              </div>
            </fieldset>
          </div>

          <fieldset>
            <legend className="mb-2 font-mono text-[10px] uppercase tracking-[0.12em] text-dim">Scenario</legend>
            <div className="flex flex-wrap gap-px border border-line bg-line">
              {PRESETS.map((p) => {
                const on = p.z.every((v, i) => Math.abs(v - z[i]) < 1e-9);
                return (
                  <button
                    key={p.name}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setZ(p.z)}
                    className={clsx("h-10 flex-1 whitespace-nowrap px-3 text-xs transition-colors", on ? "bg-fg text-obsidian" : "bg-ink text-soft hover:text-fg")}
                  >
                    {p.name}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="grid gap-6 md:grid-cols-[1.4fr_1fr]">
            {GROUPS.map((g) => (
              <fieldset key={g.title} className="flex flex-col gap-1">
                <legend className="mb-2 flex w-full items-baseline justify-between gap-2">
                  <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg">{g.title}</span>
                  <span className="text-[11px] text-dim">{g.hint}</span>
                </legend>
                {g.idx.map((i) => {
                  const f = panda.factors[i];
                  const culprit = over && i === top;
                  return (
                    <label
                      key={f.key}
                      className={clsx(
                        "relative flex flex-col gap-1 border-l-2 py-1.5 pl-3 text-[13px] transition-colors",
                        culprit ? "border-breaks bg-breaks/[0.06]" : "border-transparent",
                      )}
                    >
                      <span className="flex items-baseline justify-between gap-2">
                        <span className={culprit ? "text-breaks" : "text-soft"}>
                          {SHORT[i]}
                          {culprit && <span className="ml-2 font-mono text-[10px] uppercase tracking-wider">main cause</span>}
                        </span>
                        <span className="font-mono text-[11px] tabular-nums text-mute">
                          {Math.round(z[i] * 100)}% <span className={contrib[i] > 0.004 ? "text-fg" : "text-dim"}>+{contrib[i].toFixed(2)}</span>
                        </span>
                      </span>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={Math.round(z[i] * 100)}
                        aria-label={`${f.label}, share of plausible range (top: ${f.top})`}
                        onChange={(e) => {
                          const v = Number(e.target.value) / 100;
                          setZ((prev) => prev.map((p, idx) => (idx === i ? v : p)));
                        }}
                        className={clsx(culprit && "[accent-color:#ff4d00]")}
                      />
                      <span className="font-mono text-[10px] text-dim">100% = {f.top}</span>
                    </label>
                  );
                })}
              </fieldset>
            ))}
          </div>
        </div>

        <Frame label="readout" coord={joint.key} className="flex flex-col gap-6 border-0 bg-ink p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4 pt-2">
            <div className="flex flex-col gap-1">
              <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-dim">
                utilisation u
                <InfoTip label="How this is computed" align="start" side="bottom">
                  Interpolated from the ActuatorFit v0 Panda study. The no-error point and the all-errors corner match the study exactly; settings
                  in between are estimates built from the single-error margins (INFERENCE). The product itself re-simulates every point.
                </InfoTip>
              </span>
              <motion.span
                key={over ? "o" : "h"}
                initial={{ scale: 1.06 }}
                animate={{ scale: 1 }}
                transition={spring}
                className={clsx("origin-left font-display text-[64px] font-semibold leading-none tabular-nums tracking-tight", over ? "text-breaks" : "text-fg")}
              >
                {u.toFixed(2)}
              </motion.span>
            </div>
            <div className="flex flex-col items-end gap-2 pt-1">
              <span className={clsx("border px-2 py-0.5 font-mono text-[11px] tracking-[0.14em]", over ? "border-breaks bg-breaks/10 text-breaks" : "border-holds/50 text-holds")}>
                {over ? "BREAKS" : "HOLDS"}
              </span>
              <span className="font-mono text-[11px] tabular-nums text-mute">{over ? `${Math.abs(margin).toFixed(0)}% over limit` : `${margin.toFixed(0)}% headroom`}</span>
            </div>
          </div>

          <div className="border border-line bg-black/30 p-3">
            <div className="mb-1 flex justify-between font-mono text-[10px] uppercase tracking-[0.12em] text-dim">
              <span>u(t), last 5 s</span>
              <span>dashed = 1.00</span>
            </div>
            <TelemetryChart target={u} />
          </div>

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={top}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={spring}
              className={clsx("relative border p-4", over ? "border-breaks/60 bg-breaks/[0.05]" : "border-line")}
            >
              <span className={clsx("flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em]", over ? "text-breaks" : "text-holds")}>
                <FlaskConical className="size-3.5" aria-hidden="true" /> Bench action · run this first
              </span>
              {top >= 0 ? (
                <>
                  <p className="mt-2 text-[15px] leading-relaxed text-fg">{MEASURE[top]}</p>
                  <p className="mt-1 font-mono text-[11px] text-mute">
                    {SHORT[top]} adds +{contrib[top].toFixed(2)} to u here, more than any other error.
                  </p>
                </>
              ) : (
                <p className="mt-2 text-sm text-soft">No error is contributing. This is the nominal design point.</p>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="mt-auto flex items-center justify-between gap-3 border-t border-line pt-4 text-sm">
            <span className="text-mute">{joint.recommended.id === joint.lightest.id ? "Same actuator both ways" : `Other option: ${strip(other.name)}`}</span>
            <span className={clsx("whitespace-nowrap font-mono tabular-nums", uOther > 1 ? "text-breaks" : "text-holds")}>u {uOther.toFixed(2)}</span>
          </div>
        </Frame>
      </div>
    </section>
  );
}
