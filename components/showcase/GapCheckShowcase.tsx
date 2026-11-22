"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import clsx from "clsx";
import { Pause, Play } from "lucide-react";
import { build, N, PERIOD, TOL_MM, type Faults } from "@/lib/gapTraj";
import { Frame, Readout } from "@/components/ui/Frame";
import { InfoTip } from "@/components/ui/InfoTip";
import { useApp } from "@/components/providers/AppProvider";
import { spring } from "@/lib/motion";
import { ShowcaseHeader } from "./ShowcaseHeader";

const GhostScene = dynamic(() => import("./GhostScene"), { ssr: false });

const FAULTS: { k: keyof Faults; label: string; note: string }[] = [
  { k: "friction", label: "Friction", note: "Coulomb stick: peaks flatten and lag" },
  { k: "latency", label: "Latency", note: "12 ms actuation delay" },
  { k: "mass", label: "Mass mismatch", note: "heavier links: the arm sags" },
];

/* divergence strip */
const W = 520;
const H = 96;
const EMAX = 60;
const xOf = (i: number) => (i / (N - 1)) * W;
const yOf = (e: number) => 6 + (1 - Math.min(e, EMAX) / EMAX) * (H - 12);

export function GapCheckShowcase() {
  const { motionOff } = useApp();
  const [faults, setFaults] = useState<Faults>({ friction: true, latency: false, mass: false });
  const [playing, setPlaying] = useState(true);
  const [i, setI] = useState(0);
  const idx = useRef(0);
  const traj = useMemo(() => build(faults), [faults]);

  // Autoplay: advance the shared index; update React state at ~15 Hz only.
  useEffect(() => {
    if (!playing || motionOff) return;
    let raf = 0;
    let last = performance.now();
    let lastUi = 0;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const step = (Math.max(now - last, 0) / 1000) * (N / PERIOD);
      idx.current = (((idx.current + step) % N) + N) % N;
      last = now;
      if (now - lastUi > 66) {
        lastUi = now;
        setI(Math.floor(idx.current));
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, motionOff]);

  const e = traj.errMm[Math.max(0, Math.min(N - 1, i))] ?? 0;
  const over = e > TOL_MM;
  const anyFault = faults.friction || faults.latency || faults.mass;
  const frictionOnly = faults.friction && !faults.latency && !faults.mass;
  const breachPct = Math.round((traj.errMm.filter((x) => x > TOL_MM).length / N) * 100);

  const path = useMemo(() => traj.errMm.map((v, k) => `${k ? "L" : "M"}${xOf(k).toFixed(1)} ${yOf(v).toFixed(1)}`).join(""), [traj]);

  return (
    <section id="gapcheck" aria-labelledby="gc-h" className="mx-auto max-w-[1240px] scroll-mt-24 px-6 py-20 sm:px-8">
      <ShowcaseHeader
        n="03"
        id="gc-h"
        product="GapCheck"
        kicker="Sim-to-real calibration and verification"
        title="Overlay the simulation on the bench run. See exactly where reality leaves the model."
        lead={
          <>
            Cyan wireframe is what the model predicts; the solid arm is the measured run. Inject a fault, scrub the timeline, and watch the gap
            open. Our v0 test missed some friction gaps, so we say so here.
          </>
        }
        href="/engine/prove"
        status="v0 not passed"
        statusTone="breaks"
      />

      <div className="mt-10 grid gap-px border border-line bg-line lg:grid-cols-[1.15fr_1fr]">
        <Frame label="fig. 04 · ghost overlay" coord="synthetic bench · v0" className="relative aspect-[4/3] border-0 bg-[#06070a] lg:aspect-auto lg:min-h-[500px]">
          <GhostScene traj={traj} idx={idx} />
          <div className="pointer-events-none absolute bottom-4 left-4 flex flex-col gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em]">
            <span className="flex items-center gap-2 text-holds">
              <span className="h-px w-5 border-t border-dashed border-holds" /> simulated path
            </span>
            <span className="flex items-center gap-2 text-fg">
              <span className="h-px w-5 bg-fg" /> bench path (synthetic)
            </span>
            <span className="flex items-center gap-2 text-breaks">
              <span className="h-px w-5 bg-breaks" /> gap &gt; {TOL_MM} mm
            </span>
          </div>
        </Frame>

        <div className="flex flex-col gap-5 bg-ink p-6 sm:p-8">
          <fieldset>
            <legend className="mb-2 font-mono text-[10px] uppercase tracking-[0.12em] text-dim">Inject faults into the bench run</legend>
            <div className="grid gap-px border border-line bg-line sm:grid-cols-3">
              {FAULTS.map((f) => {
                const on = faults[f.k];
                return (
                  <button
                    key={f.k}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setFaults((s) => ({ ...s, [f.k]: !s[f.k] }))}
                    className={clsx("relative flex flex-col gap-0.5 px-3 py-2.5 text-left transition-colors", on ? "bg-[#140b07]" : "bg-ink hover:bg-[#0d1116]")}
                  >
                    {on && <motion.span layoutId={`gc-${f.k}`} transition={spring} className="absolute inset-x-0 top-0 h-[2px] bg-breaks" />}
                    <span className={clsx("text-sm", on ? "text-breaks" : "text-fg")}>{f.label}</span>
                    <span className="text-[11px] leading-snug text-dim">{f.note}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="border border-line bg-[#07090c] p-3">
            <div className="mb-1 flex justify-between font-mono text-[10px] uppercase tracking-[0.12em] text-dim">
              <span>end-effector gap, mm</span>
              <span>dashed = {TOL_MM} mm tolerance</span>
            </div>
            <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Gap between simulated and bench end-effector over one cycle">
              <defs>
                <clipPath id="gc-over">
                  <rect x="0" y="0" width={W} height={yOf(TOL_MM)} />
                </clipPath>
              </defs>
              <path d={path} fill="none" stroke="#f4f6f8" strokeOpacity="0.7" strokeWidth="1.4" />
              <path d={path} fill="none" stroke="#ff4d00" strokeWidth="1.8" clipPath="url(#gc-over)" />
              <line x1="0" x2={W} y1={yOf(TOL_MM)} y2={yOf(TOL_MM)} stroke="#f4f6f8" strokeOpacity="0.45" strokeDasharray="3 4" />
              <line x1={xOf(i)} x2={xOf(i)} y1="0" y2={H} stroke="#00e5ff" strokeOpacity="0.8" />
            </svg>
            <div className="mt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setPlaying((p) => !p)}
                aria-label={playing ? "Pause" : "Play"}
                className="inline-flex size-9 shrink-0 items-center justify-center border border-line text-soft hover:text-fg"
              >
                {playing ? <Pause className="size-4" aria-hidden="true" /> : <Play className="size-4" aria-hidden="true" />}
              </button>
              <input
                type="range"
                min={0}
                max={N - 1}
                value={i}
                aria-label="Timeline"
                onChange={(ev) => {
                  setPlaying(false);
                  idx.current = Number(ev.target.value);
                  setI(Number(ev.target.value));
                }}
                className="flex-1"
              />
              <span className="w-14 text-right font-mono text-[11px] tabular-nums text-mute">{((i / N) * PERIOD).toFixed(2)} s</span>
            </div>
          </div>

          <dl className="grid grid-cols-3 gap-4">
            <Readout k="gap now" v={`${e.toFixed(1)} mm`} tone={over ? "breaks" : "holds"} />
            <Readout k="worst gap" v={`${traj.maxErr.toFixed(1)} mm`} tone={traj.maxErr > TOL_MM ? "breaks" : "holds"} />
            <Readout k="time over" v={`${breachPct}%`} tone={breachPct ? "breaks" : "holds"} />
          </dl>

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={frictionOnly ? "f" : anyFault ? "a" : "n"}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={spring}
              className={clsx("border-l-2 py-1 pl-4 text-sm leading-relaxed", frictionOnly ? "border-breaks text-soft" : "border-line text-soft")}
            >
              {frictionOnly ? (
                <>
                  <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-breaks">Known v0 limitation</span>
                  <br />
                  Friction gaps are where GapCheck v0 failed: <b className="text-fg">178 of 1,200</b> runs gave false assurance, and every one of them was
                  a friction case. v1 adds a per-parameter detectability table.
                </>
              ) : anyFault ? (
                <>The gap is visible on the strip above: the bench leaves the model where the injected fault bites hardest.</>
              ) : (
                <>No fault injected: the two paths sit on top of each other, within sensor noise (about 1 mm).</>
              )}
            </motion.div>
          </AnimatePresence>

          <span className="flex items-center gap-2 font-mono text-[11px] text-dim">
            How this demo is built
            <InfoTip label="About this demo" align="start">
              There is no real bench data yet. The bench run is synthetic: the same 2-link motion with friction (stick band), 12 ms latency or
              mass mismatch injected, plus about 1 mm of sensor noise. GapCheck v0 was also evaluated on a synthetic arm: bootstrap test (B = 500)
              on the excess gap; it caught 5 of 6 parameter families and is marked not passed.
            </InfoTip>
          </span>
        </div>
      </div>
    </section>
  );
}
