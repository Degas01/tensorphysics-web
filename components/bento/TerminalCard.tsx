"use client";

import { useEffect, useRef, useState } from "react";
import { GlowCard } from "@/components/ui/GlowCard";
import { Chip } from "@/components/ui/Chip";
import { CardHeader } from "./CardHeader";
import { InfoTip } from "@/components/ui/InfoTip";

interface Cmd {
  cmd: string;
  out: string[];
}

// Clearly a demo: PhysicsFuzz is in testing, so this shows what it checks, not results.
const COMMANDS: Cmd[] = [
  {
    cmd: "physicsfuzz --help",
    out: [
      "PhysicsFuzz: drive Godot 4 + Jolt scenes into physics failures.",
      "  run <scene>    fuzz a scene with random spawns, impulses and timesteps",
      "  report         list failures with a seed to replay each one",
      "checks: tunnelling · jitter at rest · energy explosions · stuck contacts",
    ],
  },
  {
    cmd: "physicsfuzz run demo/stack.tscn --seeds 64",
    out: [
      "# demo output: product in testing, numbers below are placeholders",
      "seed 001 ……… ok",
      "seed 002 ……… ok",
      "seed 017 ……… FAIL tunnelling: body passed through floor",
      "seed 033 ……… FAIL energy grew while resting",
      "64 seeds · 2 failures · replay with: physicsfuzz replay 017",
    ],
  },
  {
    cmd: "physicsfuzz report --format md",
    out: [
      "# demo output",
      "| seed | failure       | first frame |",
      "| 017  | tunnelling    | [frame]     |",
      "| 033  | energy growth | [frame]     |",
      "attach report to CI run → done",
    ],
  },
];

export function TerminalCard() {
  const [lines, setLines] = useState<{ t: "cmd" | "out"; s: string }[]>([
    { t: "out", s: "Click a command to run it." },
  ]);
  const [busy, setBusy] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    box.current?.scrollTo({ top: box.current.scrollHeight, behavior: "smooth" });
  }, [lines]);
  useEffect(() => () => timers.current.forEach((t) => clearTimeout(t)), []);

  const run = (c: Cmd) => {
    if (busy) return;
    setBusy(true);
    setLines((l) => [...l.slice(-30), { t: "cmd", s: c.cmd }]);
    c.out.forEach((s, i) => {
      timers.current.push(
        window.setTimeout(() => {
          setLines((l) => [...l, { t: "out", s }]);
          if (i === c.out.length - 1) setBusy(false);
        }, 160 * (i + 1)),
      );
    });
  };

  return (
    <GlowCard className="h-full p-6" glow="rgba(255,77,0,0.12)">
      <div className="flex h-full flex-col gap-4">
        <CardHeader
          eyebrow="Product"
          title="PhysicsFuzz"
          chip={<Chip tone="breaks">in testing</Chip>}
          href="/physicsfuzz"
          hrefLabel="Open PhysicsFuzz"
        />
        <p className="text-sm leading-relaxed text-soft">A fuzzer for game physics. Find the tunnelling and explosions before players do.</p>
        <div
          ref={box}
          className="h-[200px] overflow-y-auto rounded-[2px] border border-line bg-black/50 p-4 font-mono text-[12px] leading-relaxed"
          aria-live="polite"
        >
          {lines.map((l, i) => (
            <div key={i} className={l.t === "cmd" ? "text-holds" : l.s.includes("FAIL") ? "text-breaks" : l.s.startsWith("#") ? "text-dim" : "text-soft"}>
              {l.t === "cmd" ? `$ ${l.s}` : l.s}
            </div>
          ))}
          {busy && <span className="inline-block h-3.5 w-2 animate-pulse bg-holds align-middle" aria-hidden="true" />}
        </div>
        <div className="mt-auto flex flex-wrap items-center gap-2">
          <InfoTip label="About this terminal" align="start">
            Demo transcript. PhysicsFuzz is in testing, so these outputs show what it checks and how it reports, not real results.
          </InfoTip>
          {COMMANDS.map((c) => (
            <button
              key={c.cmd}
              type="button"
              onClick={() => run(c)}
              disabled={busy}
              className="min-h-10 rounded-[2px] border border-line px-3 font-mono text-[11px] text-soft transition-colors hover:border-holds/60 hover:text-fg disabled:opacity-50"
            >
              {c.cmd.replace("physicsfuzz ", "")}
            </button>
          ))}
        </div>
      </div>
    </GlowCard>
  );
}
