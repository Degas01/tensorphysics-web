"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import clsx from "clsx";
import { Crosshair, Wrench } from "lucide-react";
import { StackSim, type Mode } from "@/lib/stackSim";
import { Frame, Readout } from "@/components/ui/Frame";
import { InfoTip } from "@/components/ui/InfoTip";
import { spring } from "@/lib/motion";
import { ShowcaseHeader } from "./ShowcaseHeader";

const StackScene = dynamic(() => import("./StackScene"), { ssr: false });

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

export function PhysicsFuzzShowcase() {
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

  // Start the adversarial seed once so the viewport isn't empty.
  useEffect(() => {
    start("naive");
  }, [start]);

  const onTick = useCallback((s: StackSim) => {
    // After a run ends, replay the same seed quietly so the viewport is never empty.
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
    if (silent.current) {
      seen.current = s.events.length;
    } else if (s.events.length > seen.current) {
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

  const failed = stats.fails > 0;

  return (
    <section id="physicsfuzz" aria-labelledby="pf-h" className="mx-auto max-w-[1240px] scroll-mt-24 px-6 py-20 sm:px-8">
      <ShowcaseHeader
        n="02"
        id="pf-h"
        product="PhysicsFuzz"
        kicker="Adversarial game and contact physics fuzzer"
        title="Find the seed that makes your physics explode, then prove the fix holds."
        lead="Fast bodies tunnel through thin floors. Stiff contacts gain energy from nothing. PhysicsFuzz hunts for those seeds automatically and replays them in CI."
        href="/physicsfuzz"
        status="in testing"
        statusTone="warn"
      />

      <div className="mt-10 grid gap-px border border-line bg-line lg:grid-cols-[1.15fr_1fr]">
        <Frame label={`fig. 03 · contact stack · seed #${SEED}`} coord={mode === "fixed" ? "fix applied" : "naive settings"} className="relative aspect-[4/3] border-0 bg-[#06070a] lg:aspect-auto lg:min-h-[480px]">
          <StackScene simRef={simRef} onTick={onTick} />
          <div className="pointer-events-none absolute left-4 top-6">
            <motion.span
              key={failed ? "f" : mode ?? "x"}
              initial={{ scale: 1.08 }}
              animate={{ scale: 1 }}
              transition={spring}
              className={clsx("block border px-2 py-0.5 font-mono text-[11px] tracking-[0.14em]", failed ? "border-breaks text-breaks" : "border-holds/50 text-holds")}
            >
              {failed ? "FAIL" : stats.t >= 3.6 ? "STABLE" : "RUNNING"}
            </motion.span>
          </div>
        </Frame>

        <div className="flex flex-col gap-5 bg-ink p-6 sm:p-8">
          <div className="grid grid-cols-2 gap-px border border-line bg-line">
            <button
              type="button"
              onClick={() => start("naive")}
              className={clsx("flex min-h-12 items-center justify-center gap-2 px-3 font-mono text-[12px] transition-colors", mode === "naive" ? "bg-breaks text-obsidian" : "bg-ink text-breaks hover:bg-[#140b07]")}
            >
              <Crosshair className="size-4" aria-hidden="true" /> Run adversarial seed #{SEED}
            </button>
            <button
              type="button"
              onClick={() => start("fixed")}
              aria-pressed={mode === "fixed"}
              className={clsx("flex min-h-12 items-center justify-center gap-2 px-3 font-mono text-[12px] transition-colors", mode === "fixed" ? "bg-holds text-obsidian" : "bg-ink text-holds hover:bg-[#06131a]")}
            >
              <Wrench className="size-4" aria-hidden="true" /> Apply fix: substeps + CCD
            </button>
          </div>

          <div ref={box} data-lenis-prevent className="h-[220px] overflow-y-auto border border-line bg-black/50 p-4 font-mono text-[12px] leading-relaxed" aria-live="polite">
            {lines.map((l, i) => (
              <div
                key={i}
                className={clsx(
                  l.t === "cmd" && "text-holds",
                  l.t === "out" && "text-soft",
                  l.t === "dim" && "text-dim",
                  l.t === "fail" && "text-breaks",
                  l.t === "ok" && "text-holds",
                )}
              >
                {l.t === "cmd" ? `$ ${l.s}` : l.s}
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {[
              { k: "--help", run: () => setLines((l) => [...l, { t: "cmd", s: "physicsfuzz --help" }, ...HELP]) },
              { k: `run --seeds ${SEED}`, run: () => start("naive") },
              { k: "--fix substeps,ccd", run: () => start("fixed") },
            ].map((c) => (
              <button key={c.k} type="button" onClick={c.run} className="min-h-10 border border-line px-3 font-mono text-[11px] text-soft transition-colors hover:border-holds/60 hover:text-fg">
                {c.k}
              </button>
            ))}
            <InfoTip label="About this demo" align="end">
              Demo scene. PhysicsFuzz is in testing and has no customer results yet. The physics here is a small 2D penalty-contact solver written
              for this page (not Godot/Jolt), but the failures are real numerics: the same seed and stiffness tunnel and explode with one explicit
              1/30 s step, and stay stable with 12 semi-implicit substeps plus a swept collision test.
            </InfoTip>
          </div>

          <dl className="mt-auto grid grid-cols-3 gap-4 border-t border-line pt-5">
            <Readout k="sim time" v={`${stats.t.toFixed(2)} s`} />
            <Readout k="stack energy" v={stats.ke > 999 ? "> 999 J" : `${stats.ke.toFixed(1)} J`} tone={stats.ke > 60 ? "breaks" : "holds"} />
            <Readout k="failures" v={stats.fails} tone={stats.fails ? "breaks" : "holds"} />
          </dl>
        </div>
      </div>
    </section>
  );
}
