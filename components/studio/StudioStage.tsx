"use client";

import dynamic from "next/dynamic";
import { Component, useEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useScroll,
} from "framer-motion";
import clsx from "clsx";
import { panda } from "@/lib/data/panda";
import { go2 } from "@/lib/data/go2";
import { useApp } from "@/components/providers/AppProvider";

const StudioScene = dynamic(() => import("./StudioScene"), { ssr: false });

/** If WebGL is unavailable the panels still work; the stage just stays dark. */
class SceneBoundary extends Component<
  { children: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

const FACTORS = [
  "Friction",
  "Rotor inertia",
  "Damping",
  "Payload",
  "Link mass",
  "Torque",
  "Voltage",
  "Heat",
];
const short = (n: string) =>
  n
    .replace("MyActuator ", "")
    .replace(" (V4)", "")
    .replace(" V3.0", "")
    .replace(/ KV\d+/, "");
const ACTS = [0.2, 0.45, 0.72];
const actOf = (p: number) => ACTS.filter((a) => p >= a).length;

const lab = "font-mono text-[10px] uppercase tracking-[0.14em] text-mute";

function Bars({ margins }: { margins: readonly (number | null)[] }) {
  const MAX = 5;
  const pct = (m: number | null) =>
    m == null ? 100 : (Math.min(m, MAX) / MAX) * 100;
  return (
    <div
      className="relative flex flex-col gap-2"
      role="img"
      aria-label="Break point of each modelling error, as a multiple of its plausible range"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 border-l border-dashed border-fg/60"
        style={{ left: `calc(96px + (100% - 148px) * ${1 / MAX})` }}
      />
      {FACTORS.map((f, i) => {
        const m = margins[i];
        const br = m != null && m < 1;
        const near = m != null && m < 1.5;
        return (
          <div key={f} className="grid grid-cols-[96px_1fr_52px] items-center">
            <span className="text-[12px] text-soft">{f}</span>
            <div className="h-[5px] bg-line">
              <div
                className={clsx(
                  "h-full",
                  br ? "bg-breaks" : near ? "bg-warn" : "bg-holds",
                )}
                style={{ width: `${pct(m)}%` }}
              />
            </div>
            <span
              className={clsx(
                "text-right font-mono text-[11px] tabular-nums",
                br ? "text-breaks" : "text-mute",
              )}
            >
              {m == null ? ">5×" : `${m.toFixed(2)}×`}
            </span>
          </div>
        );
      })}
      <div className="grid grid-cols-[96px_1fr_52px] font-mono text-[10px] text-mute">
        <span />
        <span className="flex justify-between">
          <span>0×</span>
          <span>1× = top of range</span>
          <span>5×</span>
        </span>
        <span />
      </div>
    </div>
  );
}

function Seg<T extends string | number>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { v: T; a: string; b: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="grid grid-cols-2 border border-fg"
    >
      {options.map((o) => {
        const on = o.v === value;
        return (
          <button
            key={String(o.v)}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.v)}
            className={clsx(
              "flex min-h-14 flex-col justify-center gap-0.5 px-3 py-2 text-left font-mono transition-colors",
              on ? "bg-fg text-obsidian" : "text-fg hover:bg-white/[0.04]",
            )}
          >
            <span className="text-[11px] uppercase tracking-[0.12em]">
              {o.a}
            </span>
            <span className="text-[11px] tracking-[0.06em]">{o.b}</span>
          </button>
        );
      })}
    </div>
  );
}

function TopView({ run }: { run: 0 | 1 }) {
  const R = go2.runs[run];
  // trunk spans y 52..108; each leg's hip, thigh, calf discs step outward from the trunk edge
  const LEGS: Record<string, [number, number, number]> = {
    FL: [150, 52, -1],
    FR: [150, 108, 1],
    RL: [50, 52, -1],
    RR: [50, 108, 1],
  };
  const OFF: Record<string, number> = { hip: 6, thigh: 26, calf: 46 };
  return (
    <svg
      viewBox="0 0 200 160"
      className="dot-grid h-auto w-full max-w-[260px] border border-line bg-[#06070a]"
      role="img"
      aria-label={`Go2 top view, actuator picks with ${R.label}`}
    >
      <rect
        x="50"
        y="52"
        width="100"
        height="56"
        fill="none"
        stroke="#f4f6f8"
        strokeOpacity="0.55"
      />
      {R.joints.map((j) => {
        const [x, y, s] = LEGS[j.leg];
        const cy = y + s * OFF[j.part];
        const r = 3 + 7 * Math.sqrt(j.pick.mass_kg / 2.6);
        const hot = j.pick.mass_kg >= 1;
        return (
          <circle
            key={j.key}
            cx={x}
            cy={cy}
            r={r}
            fill="#06070a"
            stroke={hot ? "#ff4d00" : "#00e5ff"}
            strokeWidth="1"
          />
        );
      })}
      <text
        x="100"
        y="84"
        textAnchor="middle"
        className="fill-mute font-mono text-[7px] tracking-[0.12em]"
      >
        GO2 · FRONT →
      </text>
    </svg>
  );
}

export function StudioStage() {
  const { motionOff } = useApp();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });
  const [act, setAct] = useState(0);
  const [joint, setJoint] = useState(1);
  const [hw, setHw] = useState<"pick" | "paper">("paper");
  const [run, setRun] = useState<0 | 1>(1);
  const [ready, setReady] = useState(false);
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const on = () => setNarrow(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  useMotionValueEvent(scrollYProgress, "change", (p) => {
    const a = actOf(p);
    if (a !== act) setAct(a);
  });

  const J = panda.joints[joint];
  const [jk, jn] = J.label.split(" · ");
  const sel = hw === "pick" ? J.recommended : J.lightest;
  const R = go2.runs[run];
  const thigh = R.joints.find((j) => j.key === "FL_thigh_joint")!;

  return (
    <div ref={ref} className="relative h-[520vh]">
      <div className="sticky top-0 h-[100svh] overflow-hidden border-b border-line">
        <div
          className={clsx(
            "absolute inset-0 transition-opacity duration-700",
            ready ? "opacity-100" : "opacity-0",
          )}
        >
          <SceneBoundary>
            <StudioScene
              progress={scrollYProgress}
              joint={joint}
              hw={hw}
              run={run}
              motionOff={motionOff}
              narrow={narrow}
              onReady={() => setReady(true)}
            />
          </SceneBoundary>
        </div>

        {/* act index, top right */}
        <ol className="absolute right-6 top-24 z-10 hidden flex-col gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] sm:flex">
          {["Establishing", "Joint", "Inside", "Quadruped"].map((t, i) => (
            <li
              key={t}
              className={clsx(
                "flex items-center justify-end gap-2",
                i === act ? "text-fg" : "text-dim",
              )}
            >
              {t}{" "}
              <span
                className={clsx(
                  "inline-block h-px w-6",
                  i === act ? "bg-fg" : "bg-line",
                )}
              />
              0{i + 1}
            </li>
          ))}
        </ol>

        <div className="pointer-events-none absolute inset-0 z-10 mx-auto flex max-w-[1240px] items-end px-4 pb-6 sm:items-center sm:px-8 sm:pb-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={act}
              initial={motionOff ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={motionOff ? undefined : { opacity: 0, y: -10 }}
              transition={{ duration: 0.35, ease: [0.2, 0.7, 0.2, 1] }}
              className="pointer-events-auto max-h-[42svh] w-full max-w-[460px] overflow-y-auto border border-line bg-obsidian/88 p-5 sm:max-h-[82svh] sm:p-6"
              data-lenis-prevent
            >
              {act === 0 && (
                <div className="flex flex-col gap-4">
                  <span className={lab}>Act 01 // establishing · fig. 06</span>
                  <div className="flex flex-wrap gap-2 font-mono text-[10px] uppercase tracking-[0.12em]">
                    <span className="border border-holds/70 px-1.5 py-px text-holds">
                      beta open
                    </span>
                    <span className="border border-line px-1.5 py-px text-mute">
                      v1 · arms and quadrupeds
                    </span>
                  </div>
                  <h1 className="font-display text-[clamp(32px,4.2vw,52px)] font-semibold leading-[1.03] tracking-[-0.035em]">
                    Actuators that still fit when the model is{" "}
                    <span className="text-breaks">wrong.</span>
                  </h1>
                  <p className="text-[15px] leading-relaxed text-soft">
                    Give ActuatorFit your robot and the tasks it must do. It
                    finds the actuators that fit every joint, then measures how
                    far friction, inertia, payload, voltage and heat can drift
                    before each one stops being enough.
                  </p>
                  <ol className="grid grid-cols-3 border border-line">
                    {[
                      ["01", "Upload", "MJCF or URDF"],
                      ["02", "Define tasks", "waypoints, payloads"],
                      ["03", "Get a report", "fits + Gap Margin"],
                    ].map(([n, t, d], i) => (
                      <li
                        key={n}
                        className={clsx(
                          "flex flex-col gap-1 p-3",
                          i < 2 && "border-r border-line",
                        )}
                      >
                        <span className="font-mono text-[10px] text-holds">
                          {n}
                        </span>
                        <span className="text-[13px] font-medium">{t}</span>
                        <span className="text-[11px] text-mute">{d}</span>
                      </li>
                    ))}
                  </ol>
                  <div className="flex items-center justify-between gap-3">
                    <a
                      href="#beta"
                      className="inline-flex h-11 items-center bg-holds px-5 text-[14px] font-semibold text-obsidian hover:bg-[#5cf0ff]"
                    >
                      Join the beta
                    </a>
                    <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-mute">
                      scroll to dolly in ↓
                    </span>
                  </div>
                </div>
              )}

              {act === 1 && (
                <div className="flex flex-col gap-4">
                  <span className={lab}>
                    Act 02 // joint {jk} · franka panda · 3 tasks · 48 actuators
                  </span>
                  <div
                    role="radiogroup"
                    aria-label="Joint"
                    className="grid grid-cols-7 border border-line"
                  >
                    {panda.joints.map((r, i) => (
                      <button
                        key={r.key}
                        type="button"
                        role="radio"
                        aria-checked={i === joint}
                        aria-label={r.label}
                        onClick={() => setJoint(i)}
                        className={clsx(
                          "h-11 font-mono text-xs transition-colors",
                          i < 6 && "border-r border-line",
                          i === joint
                            ? "bg-fg text-obsidian"
                            : "text-mute hover:text-fg",
                        )}
                      >
                        J{i + 1}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="font-display text-2xl font-semibold tracking-[-0.02em]">
                      {jk} <span className="text-mute">· {jn}</span>
                    </span>
                    <span className="font-mono text-sm tabular-nums text-soft">
                      {J.demand.peak_tau.toFixed(1)} /{" "}
                      {J.demand.rms_tau.toFixed(1)} Nm
                    </span>
                  </div>
                  <dl className="grid grid-cols-2 border border-line">
                    <div className="flex flex-col-reverse gap-1 border-r border-line p-3">
                      <dt className="text-[12px] text-soft">
                        ActuatorFit pick · {short(J.recommended.name)} ·{" "}
                        {J.recommended.mass_kg} kg
                      </dt>
                      <dd className="font-mono text-2xl tabular-nums text-holds">
                        u {J.recommended.u_corner.toFixed(2)}
                      </dd>
                    </div>
                    <div className="flex flex-col-reverse gap-1 p-3">
                      <dt className="text-[12px] text-soft">
                        Lightest paper fit · {short(J.lightest.name)} ·{" "}
                        {J.lightest.mass_kg} kg
                      </dt>
                      <dd className="font-mono text-2xl tabular-nums text-breaks">
                        u {J.lightest.u_corner.toFixed(2)}
                      </dd>
                    </div>
                  </dl>
                  <p className="font-mono text-[11px] leading-relaxed text-mute">
                    u with all 8 modelling errors at the top of their range.
                    Peak / RMS torque over the 3 tasks. Pick a joint; the camera
                    follows.
                  </p>
                </div>
              )}

              {act === 2 && (
                <div className="flex flex-col gap-4">
                  <span className={lab}>
                    Act 03 // inside {jk} · illustrative geometry
                  </span>
                  <Seg
                    label="Actuator"
                    value={hw}
                    onChange={setHw}
                    options={[
                      {
                        v: "pick",
                        a: "ActuatorFit pick",
                        b: `${short(J.recommended.name)} · ${J.recommended.mass_kg} kg`,
                      },
                      {
                        v: "paper",
                        a: "Lightest paper fit",
                        b: `${short(J.lightest.name)} · ${J.lightest.mass_kg} kg`,
                      },
                    ]}
                  />
                  <div className="flex items-baseline justify-between">
                    <span
                      className={clsx(
                        "whitespace-nowrap font-mono text-[28px] tabular-nums sm:text-[34px]",
                        sel.u_corner > 1 ? "text-breaks" : "text-holds",
                      )}
                    >
                      u {sel.u_corner.toFixed(2)}
                    </span>
                    <span
                      className={clsx(
                        "font-mono text-[11px] uppercase tracking-[0.12em]",
                        sel.u_corner > 1 ? "text-breaks" : "text-holds",
                      )}
                    >
                      {sel.u_corner > 1
                        ? `breaks · first on ${sel.breaks_first}`
                        : "holds · all 8 stacked"}
                    </span>
                  </div>
                  <Bars margins={sel.margins} />
                  <p className="font-mono text-[11px] leading-relaxed text-mute">
                    Inside parts are illustrative, not manufacturer CAD. Size
                    scales with mass^(1/3). Coil colour follows u with all 8
                    errors stacked.
                  </p>
                </div>
              )}

              {act === 3 && (
                <div className="flex flex-col gap-4">
                  <span className={lab}>
                    Act 04 // unitree go2 · front-left leg · v1 legged
                  </span>
                  <h2 className="font-display text-[clamp(22px,2.4vw,28px)] font-semibold leading-[1.12] tracking-[-0.025em]">
                    One unmeasured number moves the Go2 thigh actuator from{" "}
                    {
                      go2.runs[0].joints.find(
                        (j) => j.key === "FL_thigh_joint",
                      )!.pick.mass_kg
                    }{" "}
                    kg to{" "}
                    {
                      go2.runs[1].joints.find(
                        (j) => j.key === "FL_thigh_joint",
                      )!.pick.mass_kg
                    }{" "}
                    kg.
                  </h2>
                  <Seg
                    label="Joint damping in the model"
                    value={run}
                    onChange={setRun}
                    options={[
                      {
                        v: 0,
                        a: "Unitree file",
                        b: `[damping = ${go2.runs[0].damping}] · ${go2.runs[0].total_pick_kg} kg`,
                      },
                      {
                        v: 1,
                        a: "MuJoCo Menagerie",
                        b: `[damping = ${go2.runs[1].damping}] · ${go2.runs[1].total_pick_kg} kg`,
                      },
                    ]}
                  />
                  <div className="flex items-start gap-4">
                    <TopView run={run} />
                    <dl className="flex flex-col gap-3">
                      <div className="flex flex-col-reverse">
                        <dt className={lab}>12 actuators</dt>
                        <dd className="font-mono text-xl tabular-nums">
                          {R.total_pick_kg} kg
                        </dd>
                      </div>
                      <div className="flex flex-col-reverse">
                        <dt className={lab}>thigh pick</dt>
                        <dd
                          className={clsx(
                            "font-mono text-xl tabular-nums",
                            thigh.pick.mass_kg >= 1
                              ? "text-breaks"
                              : "text-holds",
                          )}
                        >
                          {thigh.pick.mass_kg} kg
                        </dd>
                      </div>
                      <div className="flex flex-col-reverse">
                        <dt className={lab}>worst joint u</dt>
                        <dd className="font-mono text-xl tabular-nums">
                          {R.worst_u.toFixed(2)}
                        </dd>
                      </div>
                    </dl>
                  </div>
                  <div className="border-l-2 border-breaks py-1 pl-3 text-[13px] text-soft">
                    <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-breaks">
                      bench action · measure this first
                    </span>
                    <p className="mt-1">
                      Joint damping. Neither file&apos;s value is a measurement,
                      and it moves the total from {go2.runs[0].total_pick_kg} kg
                      to {go2.runs[1].total_pick_kg} kg on a 15 kg robot.
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <p className="pointer-events-none absolute bottom-3 right-6 z-10 hidden font-mono text-[10px] uppercase tracking-[0.14em] text-dim sm:block">
          sim only · public robot models · MuJoCo {panda.meta.mujoco}
        </p>
      </div>
    </div>
  );
}
