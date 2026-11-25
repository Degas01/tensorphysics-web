"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import clsx from "clsx";
import { go2 } from "@/lib/data/go2";
import { Frame, Readout } from "@/components/ui/Frame";
import { InfoTip } from "@/components/ui/InfoTip";
import { Reveal } from "@/components/motion/Reveal";
import { spring } from "@/lib/motion";

/**
 * ActuatorFit v1 on a Unitree Go2: the same study run twice, once per published value of joint damping
 * (0 in Unitree's own URDF, 2 N m s/rad in MuJoCo Menagerie). Top view of the robot; each joint is a disc
 * whose area is the mass of the lightest actuator that still holds with every modelling error at the top
 * of its range. Real study output (lib/data/go2.ts), no invented numbers.
 */

type Run = (typeof go2.runs)[number];
type J = Run["joints"][number];

// top view, nose to the right; hip at the trunk corner, thigh and calf reaching outward
const LEGS: Record<string, { x: number; y: number; sy: number }> = {
  FL: { x: 318, y: 104, sy: -1 },
  FR: { x: 318, y: 216, sy: 1 },
  RL: { x: 162, y: 104, sy: -1 },
  RR: { x: 162, y: 216, sy: 1 },
};
const PART_OFF: Record<string, [number, number]> = { hip: [0, 0], thigh: [0, 40], calf: [0, 84] };
const short = (n: string) => n.replace("MyActuator ", "").replace(" (V4)", "").replace(" V3.0", "").replace(/ KV\d+/, "");
const r = (kg: number) => 6 + 14 * Math.sqrt(kg / 2.6);

function TopView({ run }: { run: Run }) {
  return (
    <svg viewBox="0 0 480 330" className="h-auto w-full" role="img" aria-label={`Go2 top view, actuator picks with ${run.label}`}>
      {/* trunk */}
      <rect x="140" y="104" width="200" height="112" rx="10" fill="#0b0e12" stroke="rgba(255,255,255,0.18)" />
      <text x="240" y="164" textAnchor="middle" className="fill-dim font-mono text-[10px] tracking-[0.12em]" dy="0">
        GO2 · TOP VIEW
      </text>
      <path d="M346 160 l14 -8 v16 z" fill="rgba(255,255,255,0.35)" />
      {Object.entries(LEGS).map(([leg, p]) => {
        const js = run.joints.filter((j: J) => j.leg === leg);
        const pts = js.map((j: J) => {
          const [dx, dy] = PART_OFF[j.part];
          return { j, x: p.x + dx, y: p.y + p.sy * dy };
        });
        return (
          <g key={leg}>
            <polyline points={pts.map((q) => `${q.x},${q.y}`).join(" ")} fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="2" />
            {pts.map(({ j, x, y }) => (
              <g key={j.key}>
                <motion.circle
                  cx={x}
                  cy={y}
                  initial={false}
                  animate={{ r: r(j.pick.mass_kg) }}
                  transition={spring}
                  fill={j.pick.mass_kg >= 1 ? "rgba(255,77,0,0.18)" : "rgba(0,229,255,0.14)"}
                  stroke={j.pick.mass_kg >= 1 ? "#ff4d00" : "#00e5ff"}
                  strokeWidth="1.5"
                />
                <text x={x} y={y + 3} textAnchor="middle" className="fill-fg font-mono text-[9px]">
                  {j.pick.mass_kg}
                </text>
              </g>
            ))}
            <text x={p.x + 34} y={p.y + p.sy * 4 + 3} className="fill-dim font-mono text-[10px]">
              {leg}
            </text>
          </g>
        );
      })}
      <text x="240" y="326" textAnchor="middle" className="fill-dim font-mono text-[9px]">
        disc area = actuator mass (kg) · orange ≥ 1 kg
      </text>
    </svg>
  );
}

export function LeggedShowcase() {
  const [i, setI] = useState(0);
  const run = go2.runs[i];
  const other = go2.runs[1 - i];
  const thigh = run.joints.find((j: J) => j.key === "FL_thigh_joint")!;
  const lightThigh = go2.runs[0].joints.find((j: J) => j.key === "FL_thigh_joint")!;
  const heavyThigh = go2.runs[1].joints.find((j: J) => j.key === "FL_thigh_joint")!;
  const breaksFirst = run.joints.filter((j: J) => j.lightest.u_corner > 1).map((j: J) => j.lightest.breaks_first);
  const top = Object.entries(breaksFirst.reduce<Record<string, number>>((a, k) => ((a[k ?? "-"] = (a[k ?? "-"] ?? 0) + 1), a), {})).sort(
    (a, b) => b[1] - a[1],
  )[0];
  const replayFail = Object.entries(run.checks.replay_tasks).filter(([, v]) => !v.passed);

  return (
    <div id="legged" className="mt-16 scroll-mt-24">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-[760px]">
          <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.14em] text-holds">ActuatorFit v1 · legged · real study</p>
          <Reveal>
            <h3 className="font-display text-[clamp(24px,2.6vw,34px)] font-semibold leading-[1.1] tracking-[-0.02em]">
              One unmeasured number moves the Go2 thigh actuator from {lightThigh.pick.mass_kg} kg to {heavyThigh.pick.mass_kg} kg.
            </h3>
          </Reveal>
          <p className="mt-3 text-soft">
            Unitree Go2, three planned tasks, 12 joints, every modelling error stacked. The only difference between the two runs is joint damping: Unitree&apos;s
            own robot file has none, the MuJoCo Menagerie model has 2 N·m·s/rad. Neither is a measurement.
          </p>
        </div>
      </div>

      <div className="grid gap-px border border-line bg-line lg:grid-cols-[1.1fr_1fr]">
        <Frame label="fig. 02b · go2 actuator picks" coord={`damping ${run.damping}`} className="relative border-0 bg-[#06070a] p-4 sm:p-6">
          <TopView run={run} />
        </Frame>

        <div className="flex flex-col gap-6 bg-ink p-6 sm:p-8">
          <div role="radiogroup" aria-label="Joint damping in the model" className="grid grid-cols-2 gap-px border border-line bg-line">
            {go2.runs.map((r0, k) => {
              const on = k === i;
              return (
                <button
                  key={r0.label}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setI(k)}
                  className={clsx("relative flex flex-col gap-1 px-4 py-3 text-left transition-colors", on ? "bg-[#0f141a]" : "bg-ink hover:bg-[#0d1116]")}
                >
                  {on && <motion.span layoutId="go2-sel" transition={spring} className={clsx("absolute inset-x-0 top-0 h-[2px]", k ? "bg-breaks" : "bg-holds")} />}
                  <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-dim">{r0.label}</span>
                  <span className="text-sm text-fg">damping {r0.damping} N·m·s/rad</span>
                </button>
              );
            })}
          </div>

          <dl className="grid grid-cols-3 gap-4">
            <Readout k="12 actuators" v={`${run.total_pick_kg} kg`} tone={run.total_pick_kg > other.total_pick_kg ? "breaks" : "holds"} />
            <Readout k="thigh pick" v={`${thigh.pick.mass_kg} kg`} tone={thigh.pick.mass_kg >= 1 ? "breaks" : "holds"} />
            <Readout k="worst joint u" v={run.worst_u.toFixed(2)} tone={run.worst_u <= 1 ? "holds" : "breaks"} />
          </dl>

          <p className="text-sm text-soft">
            Thigh: <span className="text-fg">{short(thigh.pick.name)}</span>. The lightest paper fit there, {short(thigh.lightest.name)} ({thigh.lightest.mass_kg} kg),
            reaches u = {thigh.lightest.u_corner.toFixed(2)} with every error stacked; it fails first on{" "}
            <span className="text-breaks">{thigh.lightest.breaks_first}</span>. Across the robot, {top ? <b className="text-fg">{top[0]}</b> : "—"} is what breaks the
            lightest fits most often in this run.
          </p>

          <div className="border-l-2 border-breaks bg-[#0b0d11] py-2 pl-4 text-sm text-soft">
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-breaks">bench action · measure this first</span>
            <p className="mt-1">
              Joint damping. It moves the total actuator mass from {go2.runs[0].total_pick_kg} kg to {go2.runs[1].total_pick_kg} kg on a 15 kg robot.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line pt-4 font-mono text-[11px] text-dim">
            <span className={run.checks.static ? "text-holds" : "text-breaks"}>static check {run.checks.static ? "pass" : "fail"}</span>
            <span className={run.checks.replay ? "text-holds" : "text-breaks"}>
              replay check {run.checks.replay ? "pass" : `fail (${replayFail.map(([k, v]) => `${k} ${v.joint_rad} rad`).join(", ")}; limit 0.05)`}
            </span>
            <span>{run.solves} solves · {Math.round(run.elapsed_s / 60)} min</span>
            <InfoTip label="How this is computed" align="end">
              Torques come from whole-body inverse dynamics on planned motions (stand-up, 0.5 m/s trot, 5 kg loaded stand) on a hard floor: what the motion
              needs, not what a controller would do. The 8 modelling errors, the 48-actuator table and the fit rule are the same as the Panda study. Datasheet
              values are vendor claims. The real Go2 uses Unitree&apos;s own motors, which are not in the table. Method and checks are pre-registered, with
              every amendment and failure on record.
            </InfoTip>
          </div>
        </div>
      </div>
    </div>
  );
}
