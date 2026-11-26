"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import clsx from "clsx";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { InfoTip } from "@/components/ui/InfoTip";
import { useApp } from "@/components/providers/AppProvider";
import { EDGES, NODES, nodeById, pathTo, type NodeId, type Status } from "@/lib/pipeline";

const NODE_W = 152;
const NODE_H = 70;

type Box = { x: number; y: number };

/** Horizontal layout on wide screens, vertical below 860 px. Coordinates are node centres. */
function layout(width: number): { pos: Record<NodeId, Box>; height: number; vertical: boolean } {
  if (width >= 860) {
    const cols = 6;
    const gap = (width - NODE_W) / (cols - 1);
    const cx = (c: number) => NODE_W / 2 + c * gap;
    const mid = 150;
    return {
      vertical: false,
      height: 270,
      pos: {
        model: { x: cx(0), y: mid - 54 },
        task: { x: cx(0), y: mid + 54 },
        sim: { x: cx(1), y: mid },
        break: { x: cx(2), y: mid },
        prove: { x: cx(3), y: mid + 54 },
        improve: { x: cx(4), y: mid + 54 },
        report: { x: cx(5), y: mid },
      },
    };
  }
  const cx = width / 2;
  const row = 104;
  const half = Math.min(NODE_W / 2 + 8, width / 4);
  return {
    vertical: true,
    height: 60 + row * 5 + 40,
    pos: {
      model: { x: cx - half, y: 44 },
      task: { x: cx + half, y: 44 },
      sim: { x: cx, y: 44 + row },
      break: { x: cx, y: 44 + row * 2 },
      prove: { x: cx - half * 0.55, y: 44 + row * 3 },
      improve: { x: cx - half * 0.55, y: 44 + row * 4 },
      report: { x: cx + half * 0.55, y: 44 + row * 5 },
    },
  };
}

function edgeD(a: Box, b: Box, vertical: boolean, bypass: boolean) {
  if (vertical) {
    const y1 = a.y + NODE_H / 2;
    const y2 = b.y - NODE_H / 2;
    if (bypass) {
      const x = Math.max(a.x, b.x) + NODE_W / 2 + 18;
      return `M ${a.x + NODE_W / 2} ${a.y} C ${x} ${a.y}, ${x} ${b.y}, ${b.x + NODE_W / 2} ${b.y}`;
    }
    const my = (y1 + y2) / 2;
    return `M ${a.x} ${y1} C ${a.x} ${my}, ${b.x} ${my}, ${b.x} ${y2}`;
  }
  const x1 = a.x + NODE_W / 2;
  const x2 = b.x - NODE_W / 2;
  if (bypass) {
    const top = Math.min(a.y, b.y) - NODE_H / 2 - 44;
    return `M ${a.x} ${a.y - NODE_H / 2} C ${a.x} ${top}, ${b.x} ${top}, ${b.x} ${b.y - NODE_H / 2}`;
  }
  const mx = (x1 + x2) / 2;
  return `M ${x1} ${a.y} C ${mx} ${a.y}, ${mx} ${b.y}, ${x2} ${b.y}`;
}

const COLOR: Record<Status, string> = { live: "#00e5ff", partial: "#ff4d00", planned: "#6f788c" };
const LABEL: Record<Status, string> = { live: "LIVE", partial: "NOT PASSED", planned: "PLANNED" };

export function Blueprint() {
  const { motionOff } = useApp();
  const wrap = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(1000);
  const [sel, setSel] = useState<NodeId>("break");
  const [view, setView] = useState<"log" | "json">("log");

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.round(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const L = useMemo(() => layout(width), [width]);
  const active = useMemo(() => pathTo(sel), [sel]);
  const node = nodeById(sel);
  const activeNodes = useMemo(() => {
    const s = new Set<NodeId>([sel]);
    active.forEach((i) => {
      s.add(EDGES[i].from);
      s.add(EDGES[i].to);
    });
    return s;
  }, [active, sel]);

  return (
    <section id="architecture" aria-labelledby="arch-h" className="scroll-mt-24 mx-auto max-w-[1240px] px-6 py-20 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <SectionHeading
          id="arch-h"
          eyebrow="Architecture"
          title="Under the hood."
          lead="One pipeline behind every product. Select a stage to trace its data path and read its log from the Panda run."
        />
        <div className="flex items-center gap-4 font-mono text-[11px] text-mute">
          {(["live", "partial", "planned"] as Status[]).map((s) => (
            <span key={s} className="flex items-center gap-1.5">
              <span className="h-px w-5" style={{ background: COLOR[s], opacity: s === "planned" ? 0.8 : 1 }} />
              {LABEL[s].toLowerCase()}
            </span>
          ))}
        </div>
      </div>

      <div className="relative mt-10 overflow-hidden border border-line bg-ink/60">
        <div className="grid-bg relative border-b border-line px-5 py-6 sm:px-8">
          <div ref={wrap} className="relative" style={{ height: L.height }}>
            <svg className="absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
              {EDGES.map((e, i) => {
                const a = L.pos[e.from];
                const b = L.pos[e.to];
                const bypass = L.vertical && e.from === "break" && e.to === "report";
                const d = edgeD(a, b, L.vertical, bypass);
                const on = active.has(i);
                const c = COLOR[e.status];
                return (
                  <g key={i}>
                    <path
                      d={d}
                      fill="none"
                      stroke={on ? c : "rgba(255,255,255,0.12)"}
                      strokeOpacity={on ? (e.status === "planned" ? 0.7 : 0.55) : 1}
                      strokeWidth={on ? 1.5 : 1}
                      strokeDasharray={e.status === "live" ? undefined : "4 5"}
                      style={{ transition: "stroke .3s, stroke-opacity .3s" }}
                    />
                    {e.status !== "planned" && (
                      <path
                        d={d}
                        fill="none"
                        stroke={c}
                        strokeWidth={on ? 2 : 1.2}
                        strokeOpacity={on ? 1 : 0.35}
                        strokeDasharray={e.status === "live" ? "10 38" : "4 44"}
                        className="animate-dash"
                        style={{ animationDuration: e.status === "live" ? "1.6s" : "3.2s" }}
                      />
                    )}
                    {on && e.status !== "planned" && !motionOff && (
                      <circle r="2.6" fill={c}>
                        <animateMotion dur={e.status === "live" ? "1.8s" : "3.4s"} repeatCount="indefinite" path={d} />
                      </circle>
                    )}
                  </g>
                );
              })}
            </svg>

            {NODES.map((n) => {
              const p = L.pos[n.id];
              const isSel = n.id === sel;
              const onPath = activeNodes.has(n.id);
              return (
                <button
                  key={n.id}
                  type="button"
                  aria-pressed={isSel}
                  onClick={() => setSel(n.id)}
                  className={clsx(
                    "absolute flex flex-col justify-between border bg-[#0a0c10] px-3 py-2.5 text-left transition-[border-color,opacity,transform] duration-300",
                    isSel ? "border-transparent" : onPath ? "border-white/25" : "border-white/10 opacity-60 hover:opacity-100",
                    n.status === "planned" && !isSel && "border-dashed",
                  )}
                  style={{ width: NODE_W, height: NODE_H, left: p.x - NODE_W / 2, top: p.y - NODE_H / 2 }}
                >
                  {isSel && (
                    <motion.span
                      layoutId="pipe-sel"
                      className="pointer-events-none absolute -inset-px border"
                      style={{ borderColor: COLOR[n.status], boxShadow: `0 0 0 3px ${COLOR[n.status]}22` }}
                      transition={{ type: "spring", stiffness: 420, damping: 36 }}
                    />
                  )}
                  <span className="flex items-center gap-1.5 font-mono text-[9.5px] tracking-wider text-mute">
                    <span className="size-1.5 rounded-full" style={{ background: COLOR[n.status] }} />
                    {LABEL[n.status]}
                  </span>
                  <span className="font-display text-[15px] font-semibold leading-tight text-fg">{n.title}</span>
                  <span className="truncate font-mono text-[10px] text-dim">{n.sub}</span>
                </button>
              );
            })}
          </div>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={node.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="grid gap-0 lg:grid-cols-[1fr_1.35fr]"
          >
            <dl className="grid grid-cols-2 border-b border-line lg:border-b-0 lg:border-r">
              {node.metrics.map((m, i) => (
                <motion.div
                  key={m.k}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.04 * i }}
                  className={clsx("flex flex-col-reverse gap-1 p-5", i % 2 === 0 && "border-r border-line", i < 2 && "border-b border-line")}
                >
                  <dt className="font-mono text-[11px] text-dim">{m.k}</dt>
                  <dd className={clsx("font-display text-xl font-semibold tabular-nums", m.tone === "holds" && "text-holds", m.tone === "breaks" && "text-breaks")}>
                    {m.v}
                  </dd>
                </motion.div>
              ))}
            </dl>
            <div className="flex flex-col gap-3 p-5">
              <div className="flex items-center justify-between gap-3 font-mono text-[11px] text-dim">
                <div role="tablist" aria-label="Inspector view" className="flex border border-line">
                  {(["log", "json"] as const).map((v) => (
                    <button
                      key={v}
                      type="button"
                      role="tab"
                      aria-selected={view === v}
                      onClick={() => setView(v)}
                      className={clsx("h-7 px-2.5 uppercase tracking-[0.12em] transition-colors", view === v ? "bg-fg text-obsidian" : "text-mute hover:text-fg")}
                    >
                      {v === "log" ? "log" : "raw json"}
                    </button>
                  ))}
                </div>
                <span className="hidden truncate sm:inline">
                  {node.id} · {node.status === "live" ? "panda run, 10 Nov 2026" : node.status === "partial" ? "gapcheck v0" : "not built"}
                </span>
                <InfoTip label="Where these numbers come from" align="end">
                  Simulate, Break and Report lines come from the ActuatorFit v0 Panda run (results.json, MuJoCo 3.10.0, 291 simulations). Prove comes
                  from the GapCheck v0 study. Improve is not built, so it shows the backlog.
                </InfoTip>
              </div>
              {view === "log" ? (
                <ol className="flex flex-col gap-1 border border-line bg-black/40 p-4 font-mono text-[12px] leading-relaxed">
                {node.log.map((l, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 * i, duration: 0.2 }}
                    className="grid grid-cols-[52px_1fr_16px] gap-2"
                  >
                    <span className="text-dim">{l.t}</span>
                    <span className="text-soft">{l.s}</span>
                    <span className={clsx(l.ok === true && "text-holds", l.ok === false && "text-breaks", (l.ok === null || l.ok === undefined) && "text-dim")}>
                      {l.ok === true ? "✓" : l.ok === false ? "✗" : l.ok === null ? "·" : ""}
                    </span>
                  </motion.li>
                ))}
              </ol>
              ) : (
                <pre data-lenis-prevent className="max-h-[260px] overflow-auto border border-line bg-black/40 p-4 font-mono text-[11.5px] leading-relaxed text-soft">
                  {JSON.stringify({ id: node.id, stage: node.title, status: node.status, metrics: Object.fromEntries(node.metrics.map((m) => [m.k, m.v])), log: node.log.map((l) => ({ tag: l.t, msg: l.s, pass: l.ok ?? null })) }, null, 2)}
                </pre>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
