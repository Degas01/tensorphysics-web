"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import clsx from "clsx";
import { panda } from "@/lib/data/panda";
import { contributions, estimateU } from "@/lib/gapModel";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { InfoTip } from "@/components/ui/InfoTip";
import { TelemetryChart } from "./TelemetryChart";

const SHORT = ["Friction", "Rotor inertia", "Damping", "Payload", "Link mass", "Torque", "Voltage", "Heat"];
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

const PRESETS: { name: string; z: number[] }[] = [
  { name: "Nominal", z: [0, 0, 0, 0, 0, 0, 0, 0] },
  { name: "Optimistic datasheet", z: [0, 0, 0, 0, 0, 1, 0.5, 0.5] },
  { name: "Hot day, long shift", z: [0.3, 0, 0.5, 0, 0, 0.3, 0.2, 1] },
  { name: "Heavier than spec", z: [0.2, 0.3, 0, 1, 1, 0, 0, 0] },
  { name: "Everything at once", z: [1, 1, 1, 1, 1, 1, 1, 1] },
];

const strip = (n: string) => n.replace(" (V4)", "");

export function GapMarginSandbox() {
  const [ji, setJi] = useState(1);
  const [which, setWhich] = useState<"recommended" | "lightest">("lightest");
  const [z, setZ] = useState<number[]>(PRESETS[2].z);
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
        eyebrow="Try the technology"
        title={
          <>
            Gap Margin sandbox. <span className="text-mute">Real Panda data.</span>
          </>
        }
        lead="Pick a joint and an actuator, then dial in how wrong the model and the datasheet are. Watch where it breaks and what you should measure first."
      />

      <div className="mt-10 grid overflow-hidden rounded-2xl border border-line bg-white/[0.015] lg:grid-cols-[1.12fr_1fr]">
        {/* Controls */}
        <div className="flex flex-col gap-7 border-b border-line p-6 sm:p-8 lg:border-b-0 lg:border-r">
          <fieldset className="flex flex-col gap-2">
            <legend className="eyebrow mb-2 !text-[11px]">Joint</legend>
            <div role="radiogroup" aria-label="Joint" className="grid grid-cols-7 gap-1">
              {panda.joints.map((j, i) => (
                <button
                  key={j.key}
                  type="button"
                  role="radio"
                  aria-checked={ji === i}
                  aria-label={j.label}
                  onClick={() => setJi(i)}
                  className={clsx(
                    "h-10 rounded-md border font-mono text-xs transition-colors",
                    ji === i ? "border-holds/70 bg-holds/10 text-holds" : "border-line text-mute hover:border-white/20 hover:text-fg",
                  )}
                >
                  J{i + 1}
                </button>
              ))}
            </div>
            <span className="font-mono text-[11px] text-dim">
              {joint.label} · {joint.demand.peak_tau.toFixed(1)} Nm peak · {joint.demand.rms_tau.toFixed(1)} Nm RMS · {joint.demand.peak_w.toFixed(2)} rad/s
            </span>
          </fieldset>

          <fieldset>
            <legend className="eyebrow mb-2 !text-[11px]">Actuator</legend>
            <div role="radiogroup" aria-label="Actuator" className="grid grid-cols-1 gap-1 sm:grid-cols-2">
              {(["lightest", "recommended"] as const).map((w) => (
                <button
                  key={w}
                  type="button"
                  role="radio"
                  aria-checked={which === w}
                  onClick={() => setWhich(w)}
                  className={clsx(
                    "flex min-h-14 flex-col items-start justify-center rounded-md border px-3 py-2 text-left transition-colors",
                    which === w ? "border-holds/70 bg-holds/[0.07]" : "border-line hover:border-white/20",
                  )}
                >
                  <span className="font-mono text-[10px] uppercase tracking-wider text-dim">{w === "lightest" ? "Lightest paper fit" : "ActuatorFit pick"}</span>
                  <span className="text-sm text-fg">
                    {strip(joint[w].name)} <span className="text-mute">· {joint[w].mass_kg} kg</span>
                  </span>
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="eyebrow mb-2 !text-[11px]">Scenario</legend>
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((p) => {
                const on = p.z.every((v, i) => Math.abs(v - z[i]) < 1e-9);
                return (
                  <button
                    key={p.name}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setZ(p.z)}
                    className={clsx(
                      "h-9 rounded-md border px-3 text-xs transition-colors",
                      on ? "border-white/30 text-fg" : "border-line text-soft hover:border-white/20 hover:text-fg",
                    )}
                  >
                    {p.name}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <fieldset className="grid gap-2 sm:grid-cols-2">
            <legend className="eyebrow mb-2 flex items-center gap-2 !text-[11px]">
              Modelling errors
              <InfoTip label="What the sliders mean" align="start">
                Each slider is a share of that error&apos;s plausible range, fixed before the study ran. 100% = the top of the range (shown under the
                slider). The number on the right is how much that error adds to u right now.
              </InfoTip>
            </legend>
            {panda.factors.map((f, i) => {
              const culprit = over && i === top;
              return (
                <label
                  key={f.key}
                  className={clsx(
                    "relative flex flex-col gap-1.5 rounded-lg border px-3 py-2.5 text-[13px] transition-[border-color,box-shadow,background-color] duration-300",
                    culprit
                      ? "border-breaks/80 bg-breaks/[0.06] shadow-[0_0_0_3px_rgba(255,138,61,0.14),0_0_24px_rgba(255,138,61,0.22)]"
                      : "border-transparent",
                  )}
                >
                  <span className="flex items-baseline justify-between gap-2">
                    <span className={clsx(culprit ? "text-breaks" : "text-soft")}>
                      {SHORT[i]}
                      {culprit && <span className="ml-2 font-mono text-[10px] uppercase tracking-wider">main cause</span>}
                    </span>
                    <span className="font-mono text-[11px] tabular-nums text-mute">
                      {Math.round(z[i] * 100)}% <span className={clsx(contrib[i] > 0.004 ? "text-fg" : "text-dim")}>+{contrib[i].toFixed(2)}</span>
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
                    className={clsx(culprit && "[accent-color:#ff8a3d]")}
                  />
                  <span className="font-mono text-[10px] text-dim">100% = {f.top}</span>
                </label>
              );
            })}
          </fieldset>
        </div>

        {/* Readout */}
        <div className="flex flex-col gap-6 p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <span className="flex items-center gap-2 font-mono text-[11px] text-dim">
                utilisation u · {joint.key}
                <InfoTip label="How this is computed" align="start" side="bottom">
                  Interpolated from the ActuatorFit v0 Panda study. The no-error point and the all-errors corner match the study exactly;
                  settings in between are estimates built from the single-error margins. The product itself re-simulates every point.
                </InfoTip>
              </span>
              <motion.span
                key={over ? "o" : "h"}
                initial={{ opacity: 0.4 }}
                animate={{ opacity: 1 }}
                className={clsx("font-display text-[64px] font-semibold leading-none tabular-nums tracking-tight", over ? "text-breaks" : "text-fg")}
              >
                {u.toFixed(2)}
              </motion.span>
            </div>
            <div className="flex flex-col items-end gap-2 pt-1">
              <span
                className={clsx(
                  "rounded border px-2 py-0.5 font-mono text-[11px] tracking-[0.14em]",
                  over ? "border-breaks bg-breaks/10 text-breaks" : "border-holds/50 text-holds",
                )}
              >
                {over ? "BREAKS" : "HOLDS"}
              </span>
              <span className="font-mono text-[11px] tabular-nums text-mute">
                {over ? `${Math.abs(margin).toFixed(0)}% over limit` : `${margin.toFixed(0)}% headroom`}
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-line bg-black/30 p-3">
            <div className="mb-1 flex justify-between font-mono text-[10px] text-dim">
              <span>u, last 5 s</span>
              <span>dashed = 1.00 limit</span>
            </div>
            <TelemetryChart target={u} />
          </div>

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={top}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
              className="flex flex-col gap-1.5 border-l-2 pl-4"
              style={{ borderColor: over ? "#ff8a3d" : "rgba(255,255,255,0.14)" }}
            >
              <span className="font-mono text-[11px] uppercase tracking-wider text-dim">{over ? "Main cause of failure" : "Biggest contributor"}</span>
              {top >= 0 ? (
                <>
                  <span className="text-base text-fg">
                    {SHORT[top]} <span className="font-mono text-sm text-mute">+{contrib[top].toFixed(2)} on u</span>
                  </span>
                  <span className="text-sm leading-relaxed text-soft">Measure first: {MEASURE[top]}</span>
                </>
              ) : (
                <span className="text-sm text-soft">No error is contributing. This is the nominal design point.</span>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="mt-auto flex items-center justify-between gap-3 border-t border-line pt-4 text-sm">
            <span className="text-mute">
              {joint.recommended.id === joint.lightest.id ? "Same actuator both ways" : `Other option: ${strip(other.name)}`}
            </span>
            <span className={clsx("whitespace-nowrap font-mono tabular-nums", uOther > 1 ? "text-breaks" : "text-holds")}>u {uOther.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
