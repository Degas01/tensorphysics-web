"use client";

import dynamic from "next/dynamic";
import { Component, useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "framer-motion";
import { Crosshair, Wrench } from "lucide-react";
import clsx from "clsx";
import { StackSim, type Mode } from "@/lib/stackSim";
import { useApp } from "@/components/providers/AppProvider";
import { InfoTip } from "@/components/ui/InfoTip";
import { OpticalHudOverlay, newTelemetry, type Telemetry } from "./OpticalHudOverlay";

const FuzzStudioScene = dynamic(() => import("./FuzzStudioScene"), { ssr: false });

class SceneBoundary extends Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

const SEED = 64;
type Line = { t: "cmd" | "out" | "fail" | "ok" | "dim"; s: string };
const HELP: Line[] = [
  { t: "out", s: "PhysicsFuzz: drive physics scenes into failures, hand back a seed to replay." },
  { t: "out", s: "  run <scene> --seeds N      fuzz with random spawns, impulses, timesteps" },
  { t: "out", s: "  run ... --fix substeps,ccd  re-run the same seed with a candidate fix" },
  { t: "dim", s: "checks: tunnelling · energy explosions · jitter at rest · stuck contacts" },
];
const CMD_RUN = `physicsfuzz run demo/stack.tscn --seeds ${SEED}`;
const CMD_FIX = `physicsfuzz run demo/stack.tscn --seeds ${SEED} --fix substeps=12,ccd`;
const lab = "font-mono text-[10px] uppercase tracking-[0.14em] text-mute";

const CHECKS = [
  ["Tunnelling", "Fast bodies passing through walls and floors."],
  ["Jitter at rest", "Stacks and ragdolls that never settle."],
  ["Energy explosions", "Energy that grows when nothing pushes it."],
  ["In your CI", "Every failure comes with a seed to replay it."],
];

export function FuzzStage() {
  const { motionOff } = useApp();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const [act, setAct] = useState(0);
  const [ready, setReady] = useState(false);
  const [narrow, setNarrow] = useState(false);
  const telemetry = useRef<Telemetry>(newTelemetry());

  const simRef = useRef<StackSim | null>(null);
  const [mode, setMode] = useState<Mode | null>(null);
  const [lines, setLines] = useState<Line[]>([{ t: "dim", s: "# demo scene · click a command or the buttons" }]);
  const [stats, setStats] = useState({ t: 0, ke: 0, fails: 0 });
  const seen = useRef(0);
  const reported = useRef<StackSim | null>(null);
  const silent = useRef(false);
  const doneAt = useRef(0);
  const lastStat = useRef(0);
  const box = useRef<HTMLDivElement>(null);

  useMotionValueEvent(scrollYProgress, "change", (p) => {
    const a = p < 0.45 ? 0 : 1;
    if (a !== act) setAct(a);
  });
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const on = () => setNarrow(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  useEffect(() => {
    box.current?.scrollTo({ top: box.current.scrollHeight });
  }, [lines]);

  const start = useCallback((m: Mode) => {
    simRef.current = new StackSim(SEED, m);
    seen.current = 0;
    silent.current = false;
    doneAt.current = 0;
    setMode(m);
    setLines((l) => [
      ...l.slice(-24),
      { t: "cmd", s: m === "naive" ? CMD_RUN : CMD_FIX },
      { t: "dim", s: m === "naive" ? "step 1/30 s · explicit Euler · discrete collision" : "12 substeps · semi-implicit Euler · swept test (CCD)" },
    ]);
  }, []);
  // idle: the fixed solver holds the stack, silently on loop; the naive failure only plays on request
  useEffect(() => {
    const idle = new StackSim(SEED, "fixed");
    simRef.current = idle;
    silent.current = true;
    reported.current = idle;
    setMode("fixed");
  }, []);

  const onTick = useCallback((s: StackSim) => {
    if (s.done) {
      if (!doneAt.current) doneAt.current = performance.now();
      else if (performance.now() - doneAt.current > 1400) {
        doneAt.current = 0;
        const again = new StackSim(SEED, s.mode);
        simRef.current = again;
        seen.current = 0;
        silent.current = true;
        reported.current = again;
        return;
      }
    }
    if (silent.current) seen.current = s.events.length;
    else if (s.events.length > seen.current) {
      const fresh = s.events.slice(seen.current);
      seen.current = s.events.length;
      setLines((l) => [
        ...l,
        ...fresh.map<Line>((e) =>
          e.kind === "settled"
            ? { t: "ok", s: `seed ${String(SEED).padStart(3, "0")} … ok   ${e.detail}` }
            : { t: "fail", s: `seed ${String(SEED).padStart(3, "0")} … FAIL ${e.kind} at t=${e.t.toFixed(2)} s: ${e.detail}` },
        ),
      ]);
    }
    if (s.done && reported.current !== s) {
      reported.current = s;
      const n = s.events.filter((e) => e.kind !== "settled").length;
      setLines((l) => [...l, { t: n ? "fail" : "ok", s: n ? `1 seed · ${n} failures · replay with: physicsfuzz replay ${SEED}` : "1 seed · 0 failures" }]);
    }
    const now = performance.now();
    if (now - lastStat.current > 120) {
      lastStat.current = now;
      let ke = 0;
      for (const b of s.bodies) if (!b.proj) ke += 0.5 * b.m * (b.vx * b.vx + b.vy * b.vy);
      setStats({ t: s.t, ke, fails: s.events.filter((e) => e.kind !== "settled").length });
    }
  }, []);

  const cli = [
    { k: "--help", run: () => setLines((l) => [...l, { t: "cmd", s: "physicsfuzz --help" }, ...HELP]) },
    { k: `run --seeds ${SEED}`, run: () => start("naive") },
    { k: `run --seeds ${SEED} --fix substeps,ccd`, run: () => start("fixed") },
  ];

  return (
    <div ref={ref} className="relative h-[280vh]">
      <div className="sticky top-0 h-[100svh] overflow-hidden border-b border-line">
        <div className={clsx("absolute inset-0 transition-opacity duration-700", ready ? "opacity-100" : "opacity-0")}>
          <SceneBoundary>
            <FuzzStudioScene
              progress={scrollYProgress}
              motionOff={motionOff}
              narrow={narrow}
              telemetry={telemetry}
              simRef={simRef}
              onTick={onTick}
              onReady={() => setReady(true)}
            />
          </SceneBoundary>
        </div>
        <OpticalHudOverlay telemetry={telemetry} rig="CONTACT-RIG 02" />

        <div className="pointer-events-none absolute inset-0 z-10 mx-auto flex max-w-[1240px] items-end px-4 pb-6 sm:items-center sm:px-8 sm:pb-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={act}
              initial={motionOff ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={motionOff ? undefined : { opacity: 0, y: -10 }}
              transition={{ duration: 0.35, ease: [0.2, 0.7, 0.2, 1] }}
              className="pointer-events-auto max-h-[46svh] w-full max-w-[500px] overflow-y-auto border border-line bg-obsidian/88 p-5 sm:max-h-[84svh] sm:p-6"
              data-lenis-prevent
            >
              {act === 0 ? (
                <div className="flex flex-col gap-5">
                  <span className={lab}>Act 01 // wide collision stage · fig. 08</span>
                  <div className="flex flex-wrap gap-2 font-mono text-[10px] uppercase tracking-[0.12em]">
                    <span className="border border-warn/70 px-1.5 py-px text-warn">in testing</span>
                    <span className="border border-line px-1.5 py-px text-mute">Godot 4.6 + Jolt · free plugin, paid CI planned</span>
                  </div>
                  <h1 className="font-display text-[clamp(30px,3.8vw,46px)] font-semibold leading-[1.04] tracking-[-0.035em]">
                    Find the seed that makes your physics <span className="text-breaks">explode</span>, then prove the fix holds.
                  </h1>
                  <p className="text-[15px] leading-relaxed text-soft">
                    PhysicsFuzz drives your scenes with random spawns, impulses and timesteps, watches for failures, and hands you a seed to replay each
                    one. It is in testing now: we are running it on open-source Godot projects before anyone pays for it.
                  </p>
                  <ul className="grid grid-cols-2 border border-line">
                    {CHECKS.map(([t, d], i) => (
                      <li key={t} className={clsx("flex flex-col gap-1 p-3", i % 2 === 0 && "border-r border-line", i < 2 && "border-b border-line")}>
                        <span className="text-[13px] font-medium">{t}</span>
                        <span className="text-[11px] leading-snug text-mute">{d}</span>
                      </li>
                    ))}
                  </ul>
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-mute">scroll into the contact ↓</span>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <span className={lab}>Act 02 // macro contact · seed #{SEED}</span>
                  <div className="grid grid-cols-2 border border-line">
                    <button
                      type="button"
                      onClick={() => start("naive")}
                      aria-pressed={mode === "naive"}
                      className={clsx(
                        "flex min-h-12 items-center justify-center gap-2 border-r border-line px-2 font-mono text-[11px] transition-colors",
                        mode === "naive" ? "bg-breaks text-obsidian" : "text-breaks hover:bg-white/[0.03]",
                      )}
                    >
                      <Crosshair className="size-4" aria-hidden="true" /> Run seed #{SEED} (naive)
                    </button>
                    <button
                      type="button"
                      onClick={() => start("fixed")}
                      aria-pressed={mode === "fixed"}
                      className={clsx("flex min-h-12 items-center justify-center gap-2 px-2 font-mono text-[11px] transition-colors", mode === "fixed" ? "bg-fg text-obsidian" : "text-fg hover:bg-white/[0.03]")}
                    >
                      <Wrench className="size-4" aria-hidden="true" /> Apply fix: substeps + CCD
                    </button>
                  </div>
                  <div ref={box} data-lenis-prevent className="h-[150px] overflow-y-auto border border-line bg-black/60 p-3 font-mono text-[11px] leading-relaxed sm:h-[190px]" aria-live="polite">
                    {lines.map((l, i) => (
                      <div key={i} className={clsx(l.t === "cmd" && "text-fg", l.t === "out" && "text-soft", l.t === "dim" && "text-dim", l.t === "fail" && "text-breaks", l.t === "ok" && "text-holds")}>
                        {l.t === "cmd" ? `$ ${l.s}` : l.s}
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {cli.map((c) => (
                      <button key={c.k} type="button" onClick={c.run} className="min-h-10 border border-line px-3 font-mono text-[11px] text-soft transition-colors hover:border-fg/50 hover:text-fg">
                        {c.k}
                      </button>
                    ))}
                  </div>
                  <dl className="grid grid-cols-3 border border-line">
                    {[
                      ["sim time", `${stats.t.toFixed(2)} s`, ""],
                      ["stack energy", stats.ke > 999 ? "> 999 J" : `${stats.ke.toFixed(1)} J`, stats.ke > 60 ? "text-breaks" : "text-fg"],
                      ["failures", String(stats.fails), stats.fails ? "text-breaks" : "text-holds"],
                    ].map(([k, val, tone], i) => (
                      <div key={k} className={clsx("flex flex-col-reverse gap-1 p-3", i < 2 && "border-r border-line")}>
                        <dt className={lab}>{k}</dt>
                        <dd className={clsx("font-mono text-base tabular-nums", tone)}>{val}</dd>
                      </div>
                    ))}
                  </dl>
                  <span className="flex items-center gap-2 font-mono text-[10px] text-dim">
                    demo scene · contact vectors: length = force
                    <InfoTip label="About this demo" align="end">
                      Demo scene. PhysicsFuzz is in testing and has no customer results yet. The physics here is a small 2D penalty-contact solver written for this
                      page (not Godot/Jolt), but the failures are real numerics: the same seed and stiffness tunnel and explode with one explicit 1/30 s step, and stay
                      stable with 12 semi-implicit substeps plus a swept collision test.
                    </InfoTip>
                  </span>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
