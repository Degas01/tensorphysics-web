"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Crosshair, RotateCcw } from "lucide-react";
import { GlowCard } from "@/components/ui/GlowCard";
import { CardHeader } from "./CardHeader";
import { InfoTip } from "@/components/ui/InfoTip";

/**
 * A two-error toy landscape u(friction, heat) with a hidden worst case off the corner.
 * Press "run adversary": antithetic random-direction search (the ARS family used by
 * PhysCheck) climbs to the worst point it can find. The landscape is made up for the demo;
 * the search algorithm is real.
 */
const N = 48;
function uAt(x: number, y: number) {
  return 0.45 + 0.35 * x + 0.3 * y + 0.38 * Math.exp(-((x - 0.72) ** 2 + (y - 0.62) ** 2) / 0.02) - 0.15 * x * y;
}

export function BreakCard() {
  const cv = useRef<HTMLCanvasElement>(null);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{ u: number; evals: number } | null>(null);
  const trail = useRef<[number, number][]>([]);
  const raf = useRef(0);

  const draw = useCallback(() => {
    const c = cv.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = c.clientWidth;
    const H = c.clientHeight;
    c.width = W * dpr;
    c.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const cw = W / N;
    const ch = H / N;
    for (let i = 0; i < N; i++)
      for (let j = 0; j < N; j++) {
        const u = uAt(i / (N - 1), 1 - j / (N - 1));
        const over = u > 1;
        const a = Math.min(Math.max((u - 0.4) / 0.9, 0), 1);
        ctx.fillStyle = over ? `rgba(255,77,0,${0.25 + a * 0.5})` : `rgba(0,229,255,${0.05 + a * 0.22})`;
        ctx.fillRect(i * cw, j * ch, cw + 0.5, ch + 0.5);
      }
    const pts = trail.current;
    ctx.strokeStyle = "rgba(255,255,255,0.8)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    pts.forEach(([x, y], k) => {
      const px = x * W;
      const py = (1 - y) * H;
      if (k === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.stroke();
    pts.forEach(([x, y], k) => {
      ctx.fillStyle = k === pts.length - 1 ? "#ffffff" : "rgba(255,255,255,0.55)";
      ctx.beginPath();
      ctx.arc(x * W, (1 - y) * H, k === pts.length - 1 ? 4.5 : 2, 0, Math.PI * 2);
      ctx.fill();
    });
  }, []);

  useEffect(() => {
    draw();
    const onR = () => draw();
    window.addEventListener("resize", onR);
    return () => {
      window.removeEventListener("resize", onR);
      cancelAnimationFrame(raf.current);
    };
  }, [draw]);

  const run = () => {
    if (running) return;
    setRunning(true);
    setResult(null);
    let z: [number, number] = [0.2 + Math.random() * 0.2, 0.15 + Math.random() * 0.2];
    let best = { z, u: uAt(...z) };
    trail.current = [z];
    let evals = 1;
    let it = 0;
    let lastT = 0;
    const clamp = (v: number) => Math.min(Math.max(v, 0), 1);
    const step = (t: number) => {
      if (t - lastT > 110) {
        lastT = t;
        // ARS: 4 antithetic directions, keep top 2, step along their difference
        const dirs = Array.from({ length: 4 }, () => [Math.random() * 2 - 1, Math.random() * 2 - 1]);
        const scored = dirs.map((d) => {
          const up = uAt(clamp(z[0] + 0.08 * d[0]), clamp(z[1] + 0.08 * d[1]));
          const dn = uAt(clamp(z[0] - 0.08 * d[0]), clamp(z[1] - 0.08 * d[1]));
          evals += 2;
          return { d, up, dn };
        });
        scored.sort((a, b) => Math.max(b.up, b.dn) - Math.max(a.up, a.dn));
        const top = scored.slice(0, 2);
        const gx = top.reduce((s, o) => s + (o.up - o.dn) * o.d[0], 0);
        const gy = top.reduce((s, o) => s + (o.up - o.dn) * o.d[1], 0);
        const n = Math.hypot(gx, gy) || 1;
        z = [clamp(z[0] + (0.07 * gx) / n), clamp(z[1] + (0.07 * gy) / n)];
        const u = uAt(...z);
        if (u > best.u) best = { z, u };
        trail.current.push(z);
        draw();
        it++;
      }
      if (it < 22) raf.current = requestAnimationFrame(step);
      else {
        setResult({ u: best.u, evals });
        setRunning(false);
      }
    };
    raf.current = requestAnimationFrame(step);
  };

  const resetAll = () => {
    trail.current = [];
    setResult(null);
    draw();
  };

  return (
    <GlowCard className="h-full p-6">
      <div className="flex h-full flex-col gap-4">
        <CardHeader eyebrow="Engine · Break" title="Unleash the adversary" href="/engine/break" hrefLabel="Open Break" />
        <p className="text-sm leading-relaxed text-soft">
          Two modelling errors, one design. Orange is where it breaks. Let the search find the worst case.
        </p>
        <div className="relative">
          <canvas ref={cv} className="h-[190px] w-full rounded-[2px] border border-line" role="img" aria-label="Error landscape with search path" />
          <span className="absolute bottom-2 right-3 font-mono text-[10px] text-mute">friction →</span>
          <span className="absolute left-3 top-2 font-mono text-[10px] text-mute">↑ heat</span>
        </div>
        <div className="mt-auto flex items-center justify-between gap-3">
          <span className="font-mono text-xs text-mute" aria-live="polite">
            {result ? (
              <>
                worst u <span className={result.u > 1 ? "text-breaks" : "text-holds"}>{result.u.toFixed(2)}</span> · {result.evals} evals
              </>
            ) : running ? (
              "searching…"
            ) : (
              <span className="inline-flex items-center gap-2">
                ready
                <InfoTip label="About this demo" align="start">
                  The landscape is made up for the demo, with a hidden worst case away from the corner. The search is the real method:
                  antithetic random directions, keep the best two, step along their difference (the ARS family used by PhysCheck).
                </InfoTip>
              </span>
            )}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={resetAll}
              aria-label="Reset search"
              className="inline-flex size-10 items-center justify-center rounded-[2px] border border-line text-mute hover:text-fg"
            >
              <RotateCcw className="size-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={run}
              disabled={running}
              className="inline-flex min-h-10 items-center gap-2 rounded-[2px] bg-breaks/90 px-3.5 text-sm font-semibold text-obsidian transition-colors hover:bg-breaks disabled:opacity-60"
            >
              <Crosshair className="size-4" aria-hidden="true" /> Run adversary
            </button>
          </div>
        </div>
      </div>
    </GlowCard>
  );
}
