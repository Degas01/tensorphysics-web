"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { Component, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "framer-motion";
import { ArrowRight, Zap } from "lucide-react";
import clsx from "clsx";
import { panda } from "@/lib/data/panda";
import { useApp } from "@/components/providers/AppProvider";
import { MagneticButton } from "@/components/hero/MagneticButton";
import { ScrambleText } from "@/components/hero/ScrambleText";
import { InfoTip } from "@/components/ui/InfoTip";
import type { ArmApi, HudRefs } from "@/components/hero/ArmScene";
import { OpticalHudOverlay, newTelemetry, type Telemetry } from "./OpticalHudOverlay";

const HomeStudioScene = dynamic(() => import("./HomeStudioScene"), { ssr: false });

class SceneBoundary extends Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

const lab = "font-mono text-[10px] uppercase tracking-[0.14em] text-mute";

const METRICS = [
  { v: String(panda.meta.actuators), k: "actuators checked from public datasheets, every row sourced" },
  { v: "8", k: "modelling errors searched per joint, alone and together" },
  { v: "< 4 min", k: "for a full 7-joint arm study on a desktop CPU: 291 MuJoCo simulations" },
  { v: "7 / 7", k: "Panda joints where the lightest paper fit fails once errors stack" },
];

const SUITE = [
  { n: "01", name: "ActuatorFit", what: "Hardware and thermal margin engine", status: "beta open", tone: "holds", href: "/actuatorfit" },
  { n: "02", name: "PhysicsFuzz", what: "Adversarial contact physics fuzzer", status: "in testing", tone: "warn", href: "/physicsfuzz" },
  { n: "03", name: "GapCheck", what: "Sim-to-real calibration check", status: "v0 not passed", tone: "breaks", href: "/engine/prove" },
] as const;

export function HomeStage() {
  const { motionOff, stressPulse } = useApp();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const [act, setAct] = useState(0);
  const [ready, setReady] = useState(false);
  const [narrow, setNarrow] = useState(false);
  const telemetry = useRef<Telemetry>(newTelemetry());
  const hud = useRef<HudRefs>({ rows: [], umax: null, verdict: null, tag: null, tagText: null });
  const api = useRef<ArmApi>(null);
  const firstPulse = useRef(stressPulse);

  useMotionValueEvent(scrollYProgress, "change", (p) => {
    const a = p < 0.5 ? 0 : 1;
    if (a !== act) setAct(a);
  });
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const on = () => setNarrow(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  // the command palette's "stress" pulse shocks the arm
  useEffect(() => {
    if (stressPulse === firstPulse.current) return;
    const t = window.setTimeout(() => {
      api.current?.shock(0, 1.6);
      api.current?.shock(6, 1.6);
    }, 350);
    return () => window.clearTimeout(t);
  }, [stressPulse]);

  const shock = () => api.current?.shock(6, 1.6);

  return (
    <div ref={ref} id="top" className="relative h-[300vh]">
      <div className="sticky top-0 h-[100svh] overflow-hidden border-b border-line">
        <div className={clsx("absolute inset-0 transition-opacity duration-700", ready ? "opacity-100" : "opacity-0")}>
          <SceneBoundary>
            <HomeStudioScene
              progress={scrollYProgress}
              motionOff={motionOff}
              narrow={narrow}
              telemetry={telemetry}
              hud={hud}
              apiRef={api}
              onReady={() => setReady(true)}
            />
          </SceneBoundary>
        </div>

        <OpticalHudOverlay telemetry={telemetry} rig="STUDIO 01" />

        {/* floating tag on the worst joint, positioned by the scene */}
        <div
          ref={(el) => {
            hud.current.tag = el;
          }}
          data-state="holds"
          className="group/tag pointer-events-none absolute left-0 top-0 z-[6] will-change-transform"
        >
          <div className="flex -translate-y-[calc(100%+14px)] translate-x-3 items-center gap-2 whitespace-nowrap border border-white/20 bg-black px-2 py-1 font-mono text-[11px] text-fg group-data-[state=breaks]/tag:border-breaks group-data-[state=breaks]/tag:text-breaks group-data-[state=warn]/tag:border-warn group-data-[state=warn]/tag:text-warn">
            <span className="size-1.5 bg-current" aria-hidden="true" />
            <span
              ref={(el) => {
                hud.current.tagText = el;
              }}
            >
              J2 · u = 0.00
            </span>
          </div>
        </div>

        {/* live joint telemetry, right edge (desktop) */}
        <div className="absolute right-16 top-1/2 z-10 hidden w-[200px] -translate-y-1/2 flex-col gap-3 border border-line bg-obsidian/85 p-4 lg:flex">
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-0.5">
              <span className={lab}>max utilisation</span>
              <span className="font-display text-[30px] font-semibold leading-none tabular-nums">
                <span
                  ref={(el) => {
                    hud.current.umax = el;
                  }}
                >
                  0.00
                </span>
              </span>
            </div>
            <span
              ref={(el) => {
                hud.current.verdict = el;
              }}
              data-state="holds"
              className="border px-2 py-0.5 font-mono text-[11px] tracking-[0.14em] data-[state=breaks]:border-breaks data-[state=breaks]:text-breaks data-[state=holds]:border-fg/40 data-[state=holds]:text-fg"
            >
              HOLDS
            </span>
          </div>
          <ol className="flex flex-col gap-1.5" aria-label="Joint utilisation">
            {Array.from({ length: 7 }, (_, i) => (
              <li
                key={i}
                ref={(el) => {
                  hud.current.rows[i] = { ...hud.current.rows[i], row: el };
                }}
                data-state=""
                className="grid grid-cols-[22px_1fr_34px] items-center gap-2 font-mono text-[10px] text-dim data-[state=breaks]:text-breaks data-[state=warn]:text-warn data-[state=worst]:text-fg"
              >
                <span>J{i + 1}</span>
                <span className="relative h-[3px] overflow-hidden bg-white/[0.07]">
                  <span
                    ref={(el) => {
                      hud.current.rows[i] = { ...hud.current.rows[i], bar: el };
                    }}
                    className="absolute inset-0 origin-left bg-holds"
                    style={{ transform: "scaleX(0)" }}
                  />
                  <span className="absolute inset-y-0 left-[76.9%] w-px bg-white/40" aria-hidden="true" />
                </span>
                <span
                  className="text-right tabular-nums"
                  ref={(el) => {
                    hud.current.rows[i] = { ...hud.current.rows[i], val: el };
                  }}
                >
                  0.00
                </span>
              </li>
            ))}
          </ol>
          <button
            type="button"
            onClick={shock}
            className="inline-flex h-10 items-center justify-center gap-1.5 border border-breaks/70 font-mono text-[11px] text-breaks transition-colors hover:bg-breaks hover:text-obsidian"
          >
            <Zap className="size-3.5" aria-hidden="true" /> Inject adversarial shock
          </button>
          <span className="flex items-center justify-between font-mono text-[10px] text-dim">
            drag to inspect · u ≤ 1.00
            <InfoTip label="About this view" align="end">
              Illustrative load model, not a live simulation. u per joint = lever arm of everything after it + joint speed + shock. A shock travels joint by
              joint along the chain, about 75 ms per joint, and fades. Real numbers live in the studies below.
            </InfoTip>
          </span>
        </div>

        <div className="pointer-events-none absolute inset-0 z-10 mx-auto flex max-w-[1240px] items-end px-4 pb-6 sm:items-center sm:px-8 sm:pb-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={act}
              initial={motionOff ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={motionOff ? undefined : { opacity: 0, y: -10 }}
              transition={{ duration: 0.35, ease: [0.2, 0.7, 0.2, 1] }}
              className={clsx(
                "pointer-events-auto max-h-[46svh] w-full overflow-y-auto sm:max-h-[84svh]",
                act === 0 ? "max-w-[560px] max-sm:border max-sm:border-line max-sm:bg-obsidian/88 max-sm:p-5" : "max-w-[620px] border border-line bg-obsidian/88 p-5 sm:p-6",
              )}
              data-lenis-prevent
            >
              {act === 0 ? (
                <div className="flex flex-col gap-6">
                  <span className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.16em] text-holds">
                    <span className="h-px w-8 bg-holds" aria-hidden="true" />
                    Act 01 // simulation reliability engine
                  </span>
                  <ScrambleText
                    as="h1"
                    className="font-display text-[clamp(44px,6.4vw,92px)] font-semibold leading-[0.95] tracking-[-0.04em]"
                    segments={[{ text: "Make reality predictable." }]}
                  />
                  <p className="max-w-[520px] text-[16px] leading-relaxed text-soft sm:text-[17px]">
                    TensorPhysics stress-tests your robot against the modelling errors you haven&apos;t measured yet, shows which actuators still hold, and
                    tells your team what to bench-test first, before a prototype burns out.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <MagneticButton href="/actuatorfit#beta">
                      Test your URDF / MJCF
                      <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                    </MagneticButton>
                    <MagneticButton href="#sandbox" variant="ghost">
                      Explore sandbox
                    </MagneticButton>
                    <button
                      type="button"
                      onClick={shock}
                      className="inline-flex h-11 items-center gap-1.5 border border-breaks/70 px-4 font-mono text-[12px] text-breaks lg:hidden"
                    >
                      <Zap className="size-3.5" aria-hidden="true" /> Shock
                    </button>
                  </div>
                  <dl className="grid max-w-[520px] grid-cols-3 border-t border-line pt-5">
                    {[
                      ["engine", "MuJoCo 3.10"],
                      ["errors searched", "8 per joint"],
                      ["tests", "pre-registered"],
                    ].map(([k, val]) => (
                      <div key={k} className="flex flex-col-reverse gap-1">
                        <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-dim">{k}</dt>
                        <dd className="text-sm text-fg">{val}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ) : (
                <div className="flex flex-col gap-5">
                  <span className={lab}>Act 02 // the suite · what is on record</span>
                  <dl className="grid grid-cols-2 border border-line">
                    {METRICS.map((m, i) => (
                      <div key={m.k} className={clsx("flex flex-col-reverse gap-1 p-4", i % 2 === 0 && "border-r border-line", i < 2 && "border-b border-line")}>
                        <dt className="text-[12px] leading-snug text-mute">{m.k}</dt>
                        <dd className={clsx("font-mono text-[26px] tabular-nums", i === 3 && "text-breaks")}>{m.v}</dd>
                      </div>
                    ))}
                  </dl>
                  <ul className="grid border border-line sm:grid-cols-3">
                    {SUITE.map((s, i) => (
                      <li key={s.name} className={clsx(i < 2 && "border-b border-line sm:border-b-0 sm:border-r")}>
                        <Link href={s.href} className="group flex h-full min-h-[120px] flex-col justify-between gap-3 p-4 transition-colors hover:bg-white/[0.03]">
                          <span className="font-mono text-[10px] text-dim">{s.n}</span>
                          <span className="flex flex-col gap-1">
                            <span className="font-display text-lg font-semibold tracking-[-0.02em] group-hover:text-holds">{s.name}</span>
                            <span className="text-[12px] leading-snug text-mute">{s.what}</span>
                          </span>
                          <span
                            className={clsx(
                              "w-fit border px-1.5 py-px font-mono text-[10px] uppercase tracking-[0.1em]",
                              s.tone === "holds" && "border-holds/60 text-holds",
                              s.tone === "warn" && "border-warn/60 text-warn",
                              s.tone === "breaks" && "border-breaks/60 text-breaks",
                            )}
                          >
                            {s.status}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
